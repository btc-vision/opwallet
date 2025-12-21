/// Updated KeyringService for wallet-sdk 2.0 with MLDSA/quantum support
import * as bip39 from 'bip39';
import { EventEmitter } from 'events';
import log from 'loglevel';

import { KEYRING_TYPE } from '@/shared/constant';
import { isLegacyAddressType, legacyToAddressTypes, storageToAddressTypes } from '@/shared/types';
import { AddressTypes } from '@btc-vision/transaction';
import { Network, networks, Psbt } from '@btc-vision/bitcoin';
import * as encryptor from '@btc-vision/passworder';
import { MLDSASecurityLevel, QuantumBIP32Interface } from '@btc-vision/transaction';
import { HdKeyring, SimpleKeyring } from '@btc-vision/wallet-sdk';
import { ObservableStore } from '@metamask/obs-store';

import i18n from '../i18n';
import preference from '../preference';
import DisplayKeyring, { setKeyringGetter } from './display';

// Type for serialized keyring options
export interface HdKeyringSerializedOptions {
    mnemonic?: string;
    passphrase?: string;
    network?: Network;
    securityLevel?: MLDSASecurityLevel;
    activeIndexes?: number[];
    addressType?: AddressTypes;
}

export interface SimpleKeyringSerializedOptions {
    privateKey: string;
    quantumPrivateKey?: string;
    network?: Network;
    securityLevel?: MLDSASecurityLevel;
}

export type KeyringOptions = HdKeyringSerializedOptions | SimpleKeyringSerializedOptions;

export interface SavedVault {
    type: string;
    data: KeyringOptions;
    addressType: AddressTypes | number; // Support both for migration
}

// Keyring type union - only HD and Simple now
export type Keyring = HdKeyring | SimpleKeyring;

export const KEYRING_SDK_TYPES = {
    SimpleKeyring,
    HdKeyring
};

interface MemStoreState {
    isUnlocked: boolean;
    keyringTypes: string[];
    keyrings: DisplayedKeyring[];
    preMnemonics: string;
}

export interface DisplayedKeyring {
    type: string;
    accounts: {
        pubkey: string;
        brandName: string;
        type?: string;
        keyring?: DisplayKeyring;
        alianName?: string;
        quantumPublicKey?: string;
    }[];
    keyring: DisplayKeyring;
    addressType: AddressTypes;
    index: number;
}

export interface ToSignInput {
    index: number;
    publicKey: string;
    sighashTypes?: number[];
    disableTweakSigner?: boolean;
}

export interface StoredData {
    booted: string;
    vault: string;
}

// Empty keyring for edge cases
export class EmptyKeyring {
    static type = KEYRING_TYPE.Empty;
    type = KEYRING_TYPE.Empty;
    network: Network = networks.bitcoin;

    addAccounts(_n: number): string[] {
        return [];
    }

    getAccounts(): string[] {
        return [];
    }

    signTransaction(_psbt: Psbt, _inputs: ToSignInput[]): Psbt {
        throw new Error('Method not implemented.');
    }

    signMessage(_publicKey: string, _message: string | Buffer): string {
        throw new Error('Method not implemented.');
    }

    verifyMessage(_address: string, _message: string, _sig: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    signData(_publicKey: string, _data: string, _type: 'ecdsa' | 'schnorr' = 'ecdsa'): string {
        throw new Error('Method not implemented.');
    }

    exportAccount(_publicKey: string): string {
        throw new Error('Method not implemented.');
    }

    removeAccount(_publicKey: string): void {
        throw new Error('Method not implemented.');
    }

    serialize(): { network: Network } {
        return { network: this.network };
    }

    deserialize(_opts: unknown) {
        return;
    }
}

class KeyringService extends EventEmitter {
    store!: ObservableStore<StoredData>;
    memStore: ObservableStore<MemStoreState>;
    keyrings: (Keyring | EmptyKeyring)[];
    addressTypes: AddressTypes[];
    encryptor: typeof encryptor = encryptor;
    password: string | null = null;

    constructor() {
        super();
        this.memStore = new ObservableStore({
            isUnlocked: false,
            keyringTypes: [KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring],
            keyrings: [],
            preMnemonics: ''
        });

        this.keyrings = [];
        this.addressTypes = [];
    }

    loadStore = (initState: StoredData) => {
        this.store = new ObservableStore(initState);
    };

    boot = async (password: string) => {
        this.password = password;

        const encryptBooted = await this.encryptor.encrypt(password, 'true');

        this.store.updateState({ booted: encryptBooted });
        this.memStore.updateState({ isUnlocked: true });
    };

    isBooted = () => {
        return !!this.store.getState().booted;
    };

    hasVault = () => {
        return !!this.store.getState().vault;
    };

    fullUpdate = (): MemStoreState => {
        this.emit('update', this.memStore.getState());
        return this.memStore.getState();
    };

    /**
     * Import Keychain using Private key with optional quantum key
     */
    importPrivateKey = async (
        privateKey: string,
        addressType: AddressTypes,
        network: Network = networks.bitcoin,
        quantumPrivateKey?: string
    ) => {
        privateKey = privateKey.replace('0x', '');

        // If quantum private key is provided, check for duplicates before importing
        if (quantumPrivateKey) {
            // Create temporary keyring to get the MLDSA hash
            const tempKeyring = new SimpleKeyring({
                privateKey,
                quantumPrivateKey,
                network,
                securityLevel: MLDSASecurityLevel.LEVEL2
            });

            // Check for duplicate MLDSA keys
            if (tempKeyring.hasQuantumKey()) {
                const existingMldsaHashes = this.getAllQuantumKeyHashes();
                const newHash = tempKeyring.getQuantumPublicKeyHash();

                if (newHash && existingMldsaHashes.includes(newHash.toLowerCase()))
                    throw new Error(
                        'This MLDSA key is already associated with another wallet. Each wallet must have a unique MLDSA key.'
                    );
            }
        }

        await this.persistAllKeyrings();

        const keyring = await this.addNewKeyring(
            KEYRING_TYPE.SimpleKeyring,
            {
                privateKey,
                quantumPrivateKey,
                network,
                securityLevel: MLDSASecurityLevel.LEVEL2
            } as SimpleKeyringSerializedOptions,
            addressType
        );

        await this.persistAllKeyrings();
        this.setUnlocked();
        this.fullUpdate();
        return keyring;
    };

    generatePreMnemonic = async (): Promise<string> => {
        if (!this.password) {
            throw new Error(i18n.t('you need to unlock wallet first'));
        }
        const mnemonic = this.generateMnemonic();
        const preMnemonics = await this.encryptor.encrypt(this.password, mnemonic);
        this.memStore.updateState({ preMnemonics });

        return mnemonic;
    };

    getKeyringByType = (type: string) => {
        return this.keyrings.find((keyring) => keyring.type === type);
    };

    removePreMnemonics = () => {
        this.memStore.updateState({ preMnemonics: '' });
    };

    getPreMnemonics = async (): Promise<SavedVault[] | null> => {
        if (!this.memStore.getState().preMnemonics) {
            return null;
        }

        if (!this.password) {
            throw new Error(i18n.t('you need to unlock wallet first'));
        }

        return (await this.encryptor.decrypt(this.password, this.memStore.getState().preMnemonics)) as SavedVault[];
    };

    /**
     * Create HD keyring from mnemonic with quantum support
     */
    createKeyringWithMnemonics = async (
        seed: string,
        _hdPath: string,
        passphrase: string,
        addressType: AddressTypes,
        accountCount: number,
        network: Network = networks.bitcoin
    ) => {
        if (accountCount < 1) {
            throw new Error(i18n.t('account count must be greater than 0'));
        }

        if (!bip39.validateMnemonic(seed)) {
            return Promise.reject(new Error(i18n.t('mnemonic phrase is invalid')));
        }

        const activeIndexes: number[] = [];
        for (let i = 0; i < accountCount; i++) {
            activeIndexes.push(i);
        }

        // Create a temporary keyring to check for duplicates before adding
        const tempKeyring = new HdKeyring({
            mnemonic: seed,
            passphrase,
            network,
            securityLevel: MLDSASecurityLevel.LEVEL2,
            activeIndexes,
            addressType
        });

        const tempAccounts = tempKeyring.getAccounts();
        if (!tempAccounts[0]) throw new Error('KeyringController - Failed to derive accounts from mnemonic.');

        // Check for duplicate addresses
        const existingAccounts = this.getAllPubkeys();
        for (const pubkey of tempAccounts) {
            const duplicate = existingAccounts.find((acc) => acc.pubkey === pubkey);
            if (duplicate)
                throw new Error(
                    'This wallet has already been imported. The mnemonic derives the same addresses as an existing wallet.'
                );
        }

        // Check for duplicate MLDSA keys
        const existingMldsaHashes = this.getAllQuantumKeyHashes();
        for (const pubkey of tempAccounts) {
            try {
                const wallet = tempKeyring.getWallet(pubkey);
                if (wallet?.mldsaKeypair) {
                    const mldsaHash = wallet.address.toHex().replace('0x', '').toLowerCase();
                    if (existingMldsaHashes.includes(mldsaHash)) {
                        throw new Error(
                            'This wallet has already been imported. The mnemonic derives MLDSA keys that are already in use.'
                        );
                    }
                }
            } catch (e) {
                // If error is about duplicate, rethrow it
                if (e instanceof Error && e.message.includes('already been imported')) {
                    throw e;
                }
                // Otherwise ignore - MLDSA key might not be available yet
            }
        }

        await this.persistAllKeyrings();

        const keyring = await this.addNewKeyring(
            KEYRING_TYPE.HdKeyring,
            {
                mnemonic: seed,
                activeIndexes,
                passphrase,
                network,
                securityLevel: MLDSASecurityLevel.LEVEL2,
                addressType
            } as HdKeyringSerializedOptions,
            addressType
        );

        const accounts = keyring.getAccounts();
        if (!accounts[0]) {
            throw new Error('KeyringController - First Account not found.');
        }

        await this.persistAllKeyrings();
        this.setUnlocked();
        this.fullUpdate();
        return keyring;
    };

    addKeyring = async (keyring: Keyring | EmptyKeyring, addressType: AddressTypes) => {
        this.keyrings.push(keyring);
        this.addressTypes.push(addressType);
        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
        return keyring;
    };

    changeAddressType = async (keyringIndex: number, addressType: AddressTypes) => {
        this.addressTypes[keyringIndex] = addressType;
        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
        return this.keyrings[keyringIndex];
    };

    setLocked = (): MemStoreState => {
        this.password = null;
        this.memStore.updateState({ isUnlocked: false });
        this.keyrings = [];
        this.addressTypes = [];
        this._updateMemStoreKeyrings();
        this.emit('lock');
        return this.fullUpdate();
    };

    submitPassword = async (password: string): Promise<MemStoreState> => {
        await this.verifyPassword(password);
        this.password = password;

        try {
            this.keyrings = await this.unlockKeyrings(password);
        } catch (e) {
            console.log('unlock failed', e);
        } finally {
            this.setUnlocked();
        }

        return this.fullUpdate();
    };

    changePassword = async (oldPassword: string, newPassword: string) => {
        await this.verifyPassword(oldPassword);
        this.password = oldPassword;

        this.keyrings = await this.unlockKeyrings(oldPassword);

        this.password = newPassword;

        const encryptBooted = await this.encryptor.encrypt(newPassword, 'true');
        this.store.updateState({ booted: encryptBooted });

        if (this.memStore.getState().preMnemonics) {
            const mnemonic = await this.encryptor.decrypt(oldPassword, this.memStore.getState().preMnemonics);
            const preMnemonics = await this.encryptor.encrypt(newPassword, mnemonic);
            this.memStore.updateState({ preMnemonics });
        }

        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();

        this.fullUpdate();
    };

    verifyPassword = async (password: string): Promise<void> => {
        const encryptedBooted = this.store.getState().booted;
        if (!encryptedBooted) {
            throw new Error(i18n.t('Cannot unlock without a previous vault'));
        }

        const resp = (await this.encryptor.decrypt(password, encryptedBooted)) as string;
        if (resp !== 'true') {
            throw new Error(i18n.t('Incorrect password'));
        }
    };

    /**
     * Add a new keyring
     */
    addNewKeyring = async (
        type: string,
        opts: KeyringOptions,
        addressType: AddressTypes
    ): Promise<Keyring | EmptyKeyring> => {
        let keyring: Keyring | EmptyKeyring;

        if (type === KEYRING_TYPE.HdKeyring) {
            const hdOpts = opts as HdKeyringSerializedOptions;
            keyring = new HdKeyring({
                mnemonic: hdOpts.mnemonic,
                passphrase: hdOpts.passphrase,
                network: hdOpts.network,
                securityLevel: hdOpts.securityLevel || MLDSASecurityLevel.LEVEL2,
                activeIndexes: hdOpts.activeIndexes,
                addressType: hdOpts.addressType || addressType
            });
        } else if (type === KEYRING_TYPE.SimpleKeyring) {
            const simpleOpts = opts as SimpleKeyringSerializedOptions;
            keyring = new SimpleKeyring({
                privateKey: simpleOpts.privateKey,
                quantumPrivateKey: simpleOpts.quantumPrivateKey,
                network: simpleOpts.network,
                securityLevel: simpleOpts.securityLevel || MLDSASecurityLevel.LEVEL2
            });
        } else if (type === KEYRING_TYPE.Empty) {
            keyring = new EmptyKeyring();
        } else {
            throw new Error(`Keyring type not found: ${type}`);
        }

        return await this.addKeyring(keyring, addressType);
    };

    createTmpKeyring = (type: string, opts: KeyringOptions | undefined): Keyring | EmptyKeyring => {
        if (type === KEYRING_TYPE.HdKeyring && opts) {
            const hdOpts = opts as HdKeyringSerializedOptions;
            return new HdKeyring({
                mnemonic: hdOpts.mnemonic,
                passphrase: hdOpts.passphrase,
                network: hdOpts.network,
                securityLevel: hdOpts.securityLevel || MLDSASecurityLevel.LEVEL2,
                activeIndexes: hdOpts.activeIndexes,
                addressType: hdOpts.addressType
            });
        } else if (type === KEYRING_TYPE.SimpleKeyring && opts) {
            const simpleOpts = opts as SimpleKeyringSerializedOptions;
            return new SimpleKeyring({
                privateKey: simpleOpts.privateKey,
                quantumPrivateKey: simpleOpts.quantumPrivateKey,
                network: simpleOpts.network,
                securityLevel: simpleOpts.securityLevel || MLDSASecurityLevel.LEVEL2
            });
        }

        return new EmptyKeyring();
    };

    checkForDuplicate = (type: string, newAccountArray: string[]): string[] => {
        const keyrings = this.getKeyringsByType(type);
        const _accounts = keyrings.map((keyring) => keyring.getAccounts());
        const accounts: string[] = _accounts.reduce<string[]>((m, n) => m.concat(n), []);

        const isIncluded = newAccountArray.some((account) => {
            return accounts.find((key) => key === account);
        });

        if (isIncluded) {
            throw new Error(i18n.t('Wallet already imported.'));
        }

        return newAccountArray;
    };

    addNewAccount = async (selectedKeyring: Keyring | EmptyKeyring): Promise<string[]> => {
        if (selectedKeyring instanceof HdKeyring) {
            const accounts = selectedKeyring.addAccounts(1);
            accounts.forEach((hexAccount: string) => {
                this.emit('newAccount', hexAccount);
            });
            await this.persistAllKeyrings();
            this._updateMemStoreKeyrings();
            this.fullUpdate();
            return accounts;
        }
        // SimpleKeyring doesn't support adding accounts
        throw new Error('Cannot add accounts to Simple Key Pair wallet');
    };

    exportAccount = (publicKey: string): string => {
        const keyring = this.getKeyringForAccount(publicKey);
        if (keyring instanceof HdKeyring) {
            return keyring.exportAccount(publicKey);
        } else if (keyring instanceof SimpleKeyring) {
            return keyring.exportPrivateKey();
        }
        throw new Error('Cannot export account from this keyring type');
    };

    /**
     * Export quantum private key for an account
     */
    exportQuantumAccount = (publicKey: string): string | undefined => {
        try {
            const keyring = this.getKeyringForAccount(publicKey);
            if (keyring instanceof SimpleKeyring) {
                // SimpleKeyring has single key - no publicKey param needed
                return keyring.exportQuantumPrivateKey();
            } else if (keyring instanceof HdKeyring) {
                // HD keyrings derive quantum keys from mnemonic, so we can export them
                const wallet = keyring.getWallet(publicKey);
                if (wallet) {
                    // Include chaincode at the end to match SimpleKeyring format
                    const privateKeyHex = wallet.quantumPrivateKeyHex;
                    const chainCodeHex = Buffer.from(wallet.chainCode).toString('hex');
                    return privateKeyHex + chainCodeHex;
                }
            }
        } catch {}
        return undefined;
    };

    removeAccount = async (publicKey: string, type: string, _brand?: string): Promise<void> => {
        const keyring = this.getKeyringForAccount(publicKey, type);

        if (keyring instanceof HdKeyring) {
            keyring.removeAccount(publicKey);
        } else {
            throw new Error(`Keyring ${keyring.type} doesn't support account removal operations`);
        }
        this.emit('removedAccount', publicKey);
        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
    };

    removeKeyring = async (keyringIndex: number): Promise<void> => {
        this.keyrings.splice(keyringIndex, 1);
        this.addressTypes.splice(keyringIndex, 1);

        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
    };

    signTransaction = (keyring: Keyring | EmptyKeyring, psbt: Psbt, inputs: ToSignInput[]) => {
        if (keyring instanceof HdKeyring || keyring instanceof SimpleKeyring) {
            return keyring.signTransaction(psbt, inputs);
        }
        throw new Error('Keyring does not support signing');
    };

    /**
     * Sign arbitrary data with ecdsa or schnorr
     */
    signData = (publicKey: string, data: string, type: 'ecdsa' | 'schnorr' = 'ecdsa'): string => {
        const keyring = this.getKeyringForAccount(publicKey);
        if (keyring instanceof HdKeyring) {
            return keyring.signData(publicKey, data, type);
        } else if (keyring instanceof SimpleKeyring) {
            return keyring.signData(data, type);
        }
        throw new Error('Keyring does not support signing');
    };

    /**
     * Sign with MLDSA (quantum) signature
     */
    signMLDSA = (publicKey: string, data: string | Buffer): Uint8Array => {
        const keyring = this.getKeyringForAccount(publicKey);
        const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'hex') : data;

        if (keyring instanceof HdKeyring) {
            const wallet = keyring.getWallet(publicKey);
            const signature = wallet.mldsaKeypair.sign(dataBuffer);
            return signature instanceof Buffer ? signature : Buffer.from(signature);
        } else if (keyring instanceof SimpleKeyring) {
            const quantumKeypair = keyring.getQuantumKeypair();
            const signature = quantumKeypair.sign(dataBuffer);
            return signature instanceof Buffer ? signature : Buffer.from(signature);
        }
        throw new Error('Keyring does not support MLDSA signing');
    };

    /**
     * Get quantum public key for an account
     */
    getQuantumPublicKey = (publicKey: string): string | undefined => {
        const keyring = this.getKeyringForAccount(publicKey);
        if (keyring instanceof HdKeyring) {
            return keyring.getQuantumPublicKey(publicKey);
        } else if (keyring instanceof SimpleKeyring) {
            return keyring.getQuantumPublicKey();
        }
        return undefined;
    };

    /**
     * Get quantum keypair for an account
     */
    getQuantumKeypair = (publicKey: string): QuantumBIP32Interface | undefined => {
        const keyring = this.getKeyringForAccount(publicKey);
        if (keyring instanceof HdKeyring) {
            const wallet = keyring.getWallet(publicKey);
            return wallet.mldsaKeypair;
        } else if (keyring instanceof SimpleKeyring) {
            return keyring.getQuantumKeypair();
        }
        return undefined;
    };

    persistAllKeyrings = async (): Promise<boolean> => {
        if (!this.password || typeof this.password !== 'string') {
            return Promise.reject(new Error('KeyringController - password is not a string'));
        }

        const serializedKeyrings = this.keyrings.map((keyring, index) => {
            const serializedData = keyring.serialize();
            return {
                type: keyring.type,
                data: serializedData,
                addressType: this.addressTypes[index]
            };
        });

        const encryptedString = await this.encryptor.encrypt(this.password, serializedKeyrings as unknown as Buffer);
        this.store.updateState({ vault: encryptedString });
        return true;
    };

    unlockKeyrings = async (password: string): Promise<(Keyring | EmptyKeyring)[]> => {
        const encryptedVault = this.store.getState().vault;
        if (!encryptedVault) {
            throw new Error(i18n.t('Cannot unlock without a previous vault'));
        }

        this.clearKeyrings();

        const vault = (await this.encryptor.decrypt(password, encryptedVault)) as SavedVault[];

        const failedKeyrings: { index: number; error: unknown; data: SavedVault }[] = [];

        for (let i = 0; i < vault.length; i++) {
            const key = vault[i];
            try {
                const { keyring, addressType } = this._restoreKeyring(key);
                this.keyrings.push(keyring);
                this.addressTypes.push(addressType);
            } catch (e) {
                console.error(`Failed to restore keyring at index ${i}:`, e, 'Data:', JSON.stringify(key));
                failedKeyrings.push({ index: i, error: e, data: key });
            }
        }

        // Log warning if any keyrings failed to restore
        if (failedKeyrings.length > 0) {
            console.error(
                `WARNING: ${failedKeyrings.length} keyring(s) failed to restore. ` +
                    `This may indicate data corruption or format incompatibility. ` +
                    `Failed keyrings:`,
                failedKeyrings
            );
        }

        this._updateMemStoreKeyrings();

        return this.keyrings;
    };

    restoreKeyring = (serialized: SavedVault): Keyring | EmptyKeyring => {
        const { keyring } = this._restoreKeyring(serialized);
        this._updateMemStoreKeyrings();
        return keyring;
    };

    /**
     * Restore keyring with migration support for legacy storage
     * @param serialized - The serialized keyring data from vault
     * @param networkOverride - Optional network to use instead of stored network (for network switching)
     */
    _restoreKeyring = (
        serialized: SavedVault,
        networkOverride?: Network
    ): {
        keyring: Keyring | EmptyKeyring;
        addressType: AddressTypes;
    } => {
        const { type, data } = serialized;

        // Handle address type migration from legacy numeric to string
        let addressType: AddressTypes;
        if (isLegacyAddressType(serialized.addressType)) {
            addressType = legacyToAddressTypes(serialized.addressType);
        } else if (typeof serialized.addressType === 'string') {
            addressType = storageToAddressTypes(serialized.addressType);
        } else {
            addressType = preference.getAddressType();
        }

        if (type === KEYRING_TYPE.Empty) {
            return { keyring: new EmptyKeyring(), addressType };
        }

        if (type === KEYRING_TYPE.HdKeyring) {
            const hdData = data as HdKeyringSerializedOptions;

            // Handle legacy format migration
            const legacyData = data as {
                mnemonic?: string;
                hdPath?: string;
                passphrase?: string;
                activeIndexes?: number[];
                network?: Network;
            };

            // Use network override if provided, otherwise use stored network, fallback to regtest
            const network = networkOverride || hdData.network || legacyData.network || networks.regtest;

            const keyring = new HdKeyring({
                mnemonic: hdData.mnemonic || legacyData.mnemonic,
                passphrase: hdData.passphrase || legacyData.passphrase,
                network,
                securityLevel: hdData.securityLevel || MLDSASecurityLevel.LEVEL2,
                activeIndexes: hdData.activeIndexes || legacyData.activeIndexes,
                addressType: hdData.addressType || addressType
            });

            const accounts = keyring.getAccounts();
            if (!accounts.length) {
                throw new Error('KeyringController - Keyring failed to deserialize');
            }

            return { keyring, addressType };
        }

        if (type === KEYRING_TYPE.SimpleKeyring) {
            const simpleData = data as SimpleKeyringSerializedOptions;

            // Handle legacy format migration
            const legacyData = data as {
                privateKeys?: string[];
                network?: Network;
            };

            const privateKey = simpleData.privateKey || legacyData.privateKeys?.[0];
            if (!privateKey) {
                throw new Error('No private key found in serialized data');
            }

            // Use network override if provided, otherwise use stored network, fallback to regtest
            const network = networkOverride || simpleData.network || legacyData.network || networks.regtest;

            const keyring = new SimpleKeyring({
                privateKey,
                quantumPrivateKey: simpleData.quantumPrivateKey,
                network,
                securityLevel: simpleData.securityLevel || MLDSASecurityLevel.LEVEL2
            });

            const accounts = keyring.getAccounts();
            if (!accounts.length) {
                throw new Error('KeyringController - Keyring failed to deserialize');
            }

            return { keyring, addressType };
        }

        // Handle Keystone keyring migration - convert to empty since it's no longer supported
        if (type === KEYRING_TYPE.KeystoneKeyring) {
            console.warn('Keystone keyring is no longer supported, skipping');
            return { keyring: new EmptyKeyring(), addressType };
        }

        throw new Error(`Unknown keyring type: ${type}`);
    };

    getKeyringsByType = (type: string): (Keyring | EmptyKeyring)[] => {
        return this.keyrings.filter((keyring) => keyring.type === type);
    };

    getAccounts = (): string[] => {
        const keyrings = this.keyrings || [];
        let addrs: string[] = [];
        for (const keyring of keyrings) {
            const accounts = keyring.getAccounts();
            addrs = addrs.concat(accounts);
        }
        return addrs;
    };

    getKeyringForAccount = (
        pubkey: string,
        type?: string,
        _start?: number,
        _end?: number,
        _includeWatchKeyring = true
    ): Keyring | EmptyKeyring => {
        log.debug(`KeyringController - getKeyringForAccount: ${pubkey}`);
        const keyrings = type ? this.keyrings.filter((keyring) => keyring.type === type) : this.keyrings;
        for (const keyring of keyrings) {
            const accounts = keyring.getAccounts();
            if (accounts.includes(pubkey)) {
                return keyring;
            }
        }

        return new EmptyKeyring();
    };

    displayForKeyring = (
        keyring: Keyring | EmptyKeyring,
        addressType: AddressTypes,
        index: number
    ): DisplayedKeyring => {
        const accounts = keyring.getAccounts();
        const all_accounts: {
            pubkey: string;
            brandName: string;
            quantumPublicKey?: string;
        }[] = [];

        for (const pubkey of accounts) {
            let quantumPublicKey: string | undefined;

            // Get quantum public key if available
            try {
                if (keyring instanceof HdKeyring) {
                    quantumPublicKey = keyring.getQuantumPublicKey(pubkey);
                } else if (keyring instanceof SimpleKeyring) {
                    quantumPublicKey = keyring.getQuantumPublicKeyOrUndefined();
                }
            } catch {
                // Quantum key not available - expected for wallets that need migration
            }

            all_accounts.push({
                pubkey,
                brandName: keyring.type,
                quantumPublicKey
            });
        }

        return {
            type: keyring.type,
            accounts: all_accounts,
            keyring: new DisplayKeyring(keyring),
            addressType,
            index
        };
    };

    getAllDisplayedKeyrings = (): DisplayedKeyring[] => {
        return this.keyrings.map((keyring, index) => this.displayForKeyring(keyring, this.addressTypes[index], index));
    };

    getAllVisibleAccountsArray = () => {
        const typedAccounts = this.getAllDisplayedKeyrings();
        const result: {
            pubkey: string;
            type: string;
            brandName: string;
            quantumPublicKey?: string;
        }[] = [];
        typedAccounts.forEach((accountGroup) => {
            result.push(
                ...accountGroup.accounts.map((account) => ({
                    pubkey: account.pubkey,
                    brandName: account.brandName,
                    type: accountGroup.type,
                    quantumPublicKey: account.quantumPublicKey
                }))
            );
        });

        return result;
    };

    getAllPubkeys = () => {
        const keyrings = this.getAllDisplayedKeyrings();
        const result: {
            pubkey: string;
            type: string;
            brandName: string;
            quantumPublicKey?: string;
        }[] = [];
        keyrings.forEach((accountGroup) => {
            result.push(
                ...accountGroup.accounts.map((account) => ({
                    pubkey: account.pubkey,
                    brandName: account.brandName,
                    type: accountGroup.type,
                    quantumPublicKey: account.quantumPublicKey
                }))
            );
        });

        return result;
    };

    hasPubkey = (pubkey: string) => {
        const addresses = this.getAllPubkeys();
        return !!addresses.find((item) => item.pubkey === pubkey);
    };

    clearKeyrings = (): void => {
        this.keyrings = [];
        this.addressTypes = [];
        this.memStore.updateState({
            keyrings: []
        });
    };

    _updateMemStoreKeyrings = (): void => {
        const keyrings = this.keyrings.map((keyring, index) =>
            this.displayForKeyring(keyring, this.addressTypes[index], index)
        );
        this.memStore.updateState({ keyrings });
    };

    setUnlocked = () => {
        this.memStore.updateState({ isUnlocked: true });
        this.emit('unlock');
    };

    /**
     * Get all quantum public key hashes in use by all accounts (excluding specified one)
     */
    getAllQuantumKeyHashes = (excludePublicKey?: string): string[] => {
        const hashes: string[] = [];

        for (const keyring of this.keyrings) {
            if (keyring instanceof SimpleKeyring) {
                const accounts = keyring.getAccounts();
                for (const account of accounts) {
                    if (excludePublicKey && account === excludePublicKey) continue;

                    // Use hasQuantumKey() to check if quantum key exists before trying to get hash
                    if (keyring.hasQuantumKey()) {
                        try {
                            const hash = keyring.getQuantumPublicKeyHash();
                            if (hash) {
                                hashes.push(hash.toLowerCase());
                            }
                        } catch {
                            // Quantum key not available - skip
                        }
                    }
                }
            }
            // For HD keyrings, check each account's derived quantum key
            if (keyring instanceof HdKeyring) {
                const accounts = keyring.getAccounts();
                for (const account of accounts) {
                    if (excludePublicKey && account === excludePublicKey) continue;

                    const wallet = keyring.getWallet(account);
                    if (wallet?.mldsaKeypair) {
                        const hash = wallet.address.toHex().replace('0x', '');
                        hashes.push(hash.toLowerCase());
                    }
                }
            }
        }

        return hashes;
    };

    /**
     * Set quantum key for a simple keyring account (for migration)
     */
    setQuantumKey = async (publicKey: string, quantumPrivateKey: string): Promise<void> => {
        const keyring = this.getKeyringForAccount(publicKey);
        if (keyring instanceof SimpleKeyring) {
            // Get existing key hashes before import
            const existingHashes = this.getAllQuantumKeyHashes(publicKey);

            // Import the key
            keyring.importQuantumKey(quantumPrivateKey);

            // Check if the imported key's hash matches any existing key
            const newHash = keyring.getQuantumPublicKeyHash();
            if (newHash && existingHashes.includes(newHash.toLowerCase())) {
                // Revert the import by clearing the quantum key
                (keyring as SimpleKeyring & { clearQuantumKey: () => void }).clearQuantumKey();
                throw new Error(
                    'This quantum key is already associated with another account. Each account must have a unique quantum key.'
                );
            }

            await this.persistAllKeyrings();
            this._updateMemStoreKeyrings();
            this.fullUpdate();
        } else {
            throw new Error('Can only set quantum key for Simple Key Pair wallets');
        }
    };

    /**
     * Generate a new quantum key for a simple keyring account
     */
    generateQuantumKey = async (publicKey: string): Promise<void> => {
        const keyring = this.getKeyringForAccount(publicKey);
        if (keyring instanceof SimpleKeyring) {
            keyring.generateFreshQuantumKey();
            await this.persistAllKeyrings();
            this._updateMemStoreKeyrings();
            this.fullUpdate();
        } else {
            throw new Error('Can only generate quantum key for Simple Key Pair wallets');
        }
    };

    /**
     * Clear MLDSA key from a wallet (for SimpleKeyring only)
     * Used for MLDSA duplicate resolution - removes MLDSA but keeps the wallet
     */
    clearQuantumKeyByIndex = async (keyringIndex: number): Promise<void> => {
        const keyring = this.keyrings[keyringIndex];

        if (!(keyring instanceof SimpleKeyring)) {
            throw new Error('MLDSA key clearing only supported for Simple Key Pair wallets');
        }

        const serialized = keyring.serialize() as SimpleKeyringSerializedOptions;

        // Recreate keyring without quantum key
        const newKeyring = new SimpleKeyring({
            privateKey: serialized.privateKey,
            quantumPrivateKey: undefined,
            network: serialized.network,
            securityLevel: serialized.securityLevel || MLDSASecurityLevel.LEVEL2
        });
        this.keyrings[keyringIndex] = newKeyring;

        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
    };

    /**
     * Move MLDSA key from one wallet to another (for SimpleKeyring only)
     * Used when correct MLDSA is on wrong wallet instance during duplication resolution
     */
    moveQuantumKey = async (fromKeyringIndex: number, toKeyringIndex: number): Promise<void> => {
        const fromKeyring = this.keyrings[fromKeyringIndex];
        const toKeyring = this.keyrings[toKeyringIndex];

        if (!(fromKeyring instanceof SimpleKeyring) || !(toKeyring instanceof SimpleKeyring)) {
            throw new Error('MLDSA key movement only supported between Simple Key Pair wallets');
        }

        // Export quantum key from source
        const serialized = fromKeyring.serialize() as SimpleKeyringSerializedOptions;
        const quantumPrivateKey = serialized.quantumPrivateKey;

        if (!quantumPrivateKey) {
            throw new Error('Source wallet has no quantum key to move');
        }

        // Clear from source by recreating without quantum key
        const newFromKeyring = new SimpleKeyring({
            privateKey: serialized.privateKey,
            quantumPrivateKey: undefined,
            network: serialized.network,
            securityLevel: serialized.securityLevel || MLDSASecurityLevel.LEVEL2
        });
        this.keyrings[fromKeyringIndex] = newFromKeyring;

        // Import to destination
        toKeyring.importQuantumKey(quantumPrivateKey);

        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
    };

    /**
     * Replace MLDSA key on a wallet with a new one
     * Used when local MLDSA doesn't match on-chain during duplication resolution
     */
    replaceQuantumKey = async (keyringIndex: number, newQuantumPrivateKey: string): Promise<void> => {
        const keyring = this.keyrings[keyringIndex];

        if (!(keyring instanceof SimpleKeyring)) {
            throw new Error('MLDSA key replacement only supported for Simple Key Pair wallets');
        }

        // Get existing key hashes to check for duplicates (excluding this keyring)
        const accounts = keyring.getAccounts();
        const excludePubkey = accounts[0];
        const existingHashes = this.getAllQuantumKeyHashes(excludePubkey);

        // Create a temp keyring to get the hash of the new key
        const serialized = keyring.serialize() as SimpleKeyringSerializedOptions;
        const tempKeyring = new SimpleKeyring({
            privateKey: serialized.privateKey,
            quantumPrivateKey: newQuantumPrivateKey,
            network: serialized.network,
            securityLevel: serialized.securityLevel || MLDSASecurityLevel.LEVEL2
        });

        const newHash = tempKeyring.getQuantumPublicKeyHash();
        if (newHash && existingHashes.includes(newHash.toLowerCase())) {
            throw new Error(
                'This quantum key is already associated with another account. Each account must have a unique quantum key.'
            );
        }

        // Replace the keyring with the new one
        this.keyrings[keyringIndex] = tempKeyring;

        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
    };

    /**
     * Remove a keyring by index
     * Used during duplication resolution to remove duplicate wallets
     */
    removeKeyringByIndex = async (keyringIndex: number): Promise<void> => {
        if (keyringIndex < 0 || keyringIndex >= this.keyrings.length) {
            throw new Error('Invalid keyring index');
        }

        this.keyrings.splice(keyringIndex, 1);
        this.addressTypes.splice(keyringIndex, 1);

        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
    };

    /**
     * [DEV/TEST ONLY] Force add a keyring bypassing duplicate checks
     * WARNING: This method is disabled in production builds
     */
    forceAddKeyringForTest = async (
        type: string,
        opts: SimpleKeyringSerializedOptions | HdKeyringSerializedOptions,
        addressType: AddressTypes
    ): Promise<Keyring> => {
        // SECURITY: Block this method in production
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Test methods are not available in production builds');
        }

        let keyring: Keyring;

        if (type === KEYRING_TYPE.SimpleKeyring) {
            keyring = new SimpleKeyring(opts as SimpleKeyringSerializedOptions);
        } else if (type === KEYRING_TYPE.HdKeyring) {
            keyring = new HdKeyring(opts as HdKeyringSerializedOptions);
        } else {
            throw new Error(`Unknown keyring type: ${type}`);
        }

        this.keyrings.push(keyring);
        this.addressTypes.push(addressType);

        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();

        return keyring;
    };

    /**
     * Check if an account needs quantum migration
     * Note: In wallet-sdk 2.0, SimpleKeyring always generates a quantum key on creation
     * This method checks if for some reason the quantum key is missing
     */
    needsQuantumMigration = (publicKey: string): boolean => {
        const keyring = this.getKeyringForAccount(publicKey);
        if (keyring instanceof SimpleKeyring) {
            return !keyring.hasKeys();
        }
        // HD keyrings auto-derive quantum keys, no migration needed
        return false;
    };

    /**
     * Get keyring type for account
     */
    getKeyringType = (publicKey: string): string => {
        const keyring = this.getKeyringForAccount(publicKey);
        return keyring.type;
    };

    /**
     * Update all keyrings to use a new network.
     * This recreates all keyrings with the new network parameter while preserving their data.
     * Must be called when the user switches networks to ensure keypairs are derived correctly.
     * @param network - The new bitcoin network to use
     */
    updateKeyringsNetwork = async (network: Network): Promise<void> => {
        if (!this.password) {
            // Not unlocked - keyrings will be created with correct network on unlock
            return;
        }

        // Serialize current keyrings to get their data
        // Note: serialize() returns SDK types which are compatible but have readonly arrays
        const serializedKeyrings = this.keyrings.map((keyring, index) => {
            const serializedData = keyring.serialize();
            return {
                type: keyring.type,
                data: serializedData as KeyringOptions,
                addressType: this.addressTypes[index]
            } as SavedVault;
        });

        // SAFETY: First try to restore ALL keyrings to a temporary array
        // Only replace the original keyrings if ALL restorations succeed
        const newKeyrings: (Keyring | EmptyKeyring)[] = [];
        const newAddressTypes: AddressTypes[] = [];
        const failedRestorations: { index: number; error: unknown }[] = [];

        for (let i = 0; i < serializedKeyrings.length; i++) {
            const serialized = serializedKeyrings[i];
            try {
                const { keyring, addressType } = this._restoreKeyring(serialized, network);
                newKeyrings.push(keyring);
                newAddressTypes.push(addressType);
            } catch (e) {
                console.error(`Failed to restore keyring ${i} with new network:`, e);
                failedRestorations.push({ index: i, error: e });
            }
        }

        // If any restorations failed, keep the original keyrings and log error
        if (failedRestorations.length > 0) {
            console.error(
                `CRITICAL: ${failedRestorations.length} keyring(s) failed to restore during network switch. ` +
                    `Keeping original keyrings to prevent data loss. Failed indices:`,
                failedRestorations.map((f) => f.index)
            );
            // Don't clear or replace - keep original keyrings safe
            return;
        }

        // All restorations succeeded - safe to replace
        this.clearKeyrings();
        this.keyrings = newKeyrings;
        this.addressTypes = newAddressTypes;

        // Persist updated keyrings with new network
        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
    };

    private generateMnemonic = (): string => {
        return bip39.generateMnemonic(128);
    };
}

const keyringService = new KeyringService();

// Initialize the display keyring getter to break circular dependency
setKeyringGetter((account: string, type: string) => keyringService.getKeyringForAccount(account, type));

export default keyringService;
