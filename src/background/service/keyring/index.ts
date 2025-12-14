/// Updated KeyringService for wallet-sdk 2.0 with MLDSA/quantum support
import * as bip39 from 'bip39';
import * as oldEncryptor from 'browser-passworder';
import { EventEmitter } from 'events';
import log from 'loglevel';

import { KEYRING_TYPE } from '@/shared/constant';
import { AddressTypes, isLegacyAddressType, legacyToAddressTypes, storageToAddressTypes } from '@/shared/types';
import { Network, networks, Psbt } from '@btc-vision/bitcoin';
import * as encryptor from '@btc-vision/passworder';
import { MLDSASecurityLevel, QuantumBIP32Interface } from '@btc-vision/transaction';
import { HdKeyring, SimpleKeyring } from '@btc-vision/wallet-sdk';
import { ObservableStore } from '@metamask/obs-store';

import i18n from '../i18n';
import preference from '../preference';
import DisplayKeyring from './display';

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

        // Create temporary keyring to check for duplicates before adding
        const tmpKeyring = this.createTmpKeyring(
            KEYRING_TYPE.SimpleKeyring, {
                privateKey,
                quantumPrivateKey,
                network,
                securityLevel: MLDSASecurityLevel.LEVEL2
            } as SimpleKeyringSerializedOptions
        );

        const newAccounts = tmpKeyring.getAccounts();
        this.checkForDuplicate(KEYRING_TYPE.SimpleKeyring, newAccounts);

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

        // Create temporary keyring to check for duplicates before adding
        const tmpKeyring = this.createTmpKeyring(
            KEYRING_TYPE.HdKeyring, {
                mnemonic: seed,
                activeIndexes,
                passphrase,
                network,
                securityLevel: MLDSASecurityLevel.LEVEL2,
                addressType
            } as HdKeyringSerializedOptions);

        const newAccounts = tmpKeyring.getAccounts();
        this.checkForDuplicate(KEYRING_TYPE.HdKeyring, newAccounts);

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
        const oldMethod = await this.verifyPassword(password);
        this.password = password;

        try {
            this.keyrings = await this.unlockKeyrings(password, oldMethod);
        } catch (e) {
            if (oldMethod) {
                try {
                    await this.boot(password);
                    this.keyrings = await this.unlockKeyrings(password, false);
                } catch (e) {
                    console.log('unlock failed (new)', e);
                }
            } else {
                console.log('unlock failed', e);
            }
        } finally {
            this.setUnlocked();
        }

        return this.fullUpdate();
    };

    changePassword = async (oldPassword: string, newPassword: string) => {
        const oldMethod = await this.verifyPassword(oldPassword);
        this.password = oldPassword;

        try {
            this.keyrings = await this.unlockKeyrings(oldPassword, oldMethod);
        } catch (e) {
            if (oldMethod) {
                try {
                    await this.boot(oldPassword);
                    this.keyrings = await this.unlockKeyrings(oldPassword, false);
                } catch (e) {
                    console.log('unlock failed (new)', e);
                    throw e;
                }
            } else {
                console.log('unlock failed', e);
                throw e;
            }
        }

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

    verifyPassword = async (password: string): Promise<boolean> => {
        const encryptedBooted = this.store.getState().booted;
        if (!encryptedBooted) {
            throw new Error(i18n.t('Cannot unlock without a previous vault'));
        }

        if (encryptedBooted.includes('keyMetadata')) {
            const resp = (await this.encryptor.decrypt(password, encryptedBooted)) as string;
            return resp == 'true';
        }

        const isValid = await oldEncryptor.decrypt(password, encryptedBooted);
        return isValid == 'true';
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

    unlockKeyrings = async (password: string, oldMethod: boolean): Promise<(Keyring | EmptyKeyring)[]> => {
        const encryptedVault = this.store.getState().vault;
        if (!encryptedVault) {
            throw new Error(i18n.t('Cannot unlock without a previous vault'));
        }

        this.clearKeyrings();

        const vault = oldMethod
            ? ((await oldEncryptor.decrypt(password, encryptedVault)) as SavedVault[])
            : ((await this.encryptor.decrypt(password, encryptedVault)) as SavedVault[]);

        for (const key of vault) {
            try {
                const { keyring, addressType } = this._restoreKeyring(key);
                this.keyrings.push(keyring);
                this.addressTypes.push(addressType);
            } catch (e) {
                console.error('Failed to restore keyring:', e);
            }
        }

        this._updateMemStoreKeyrings();

        if (oldMethod) {
            await this.persistAllKeyrings();
        }

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

            // Use network override if provided, otherwise use stored network
            const network = networkOverride || hdData.network || legacyData.network;

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

            // Use network override if provided, otherwise use stored network
            const network = networkOverride || simpleData.network || legacyData.network;

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

        // Clear current keyrings
        this.clearKeyrings();

        // Restore keyrings with the new network
        for (const serialized of serializedKeyrings) {
            try {
                const { keyring, addressType } = this._restoreKeyring(serialized, network);
                this.keyrings.push(keyring);
                this.addressTypes.push(addressType);
            } catch (e) {
                console.error('Failed to restore keyring with new network:', e);
            }
        }

        // Persist updated keyrings with new network
        await this.persistAllKeyrings();
        this._updateMemStoreKeyrings();
        this.fullUpdate();
    };

    private generateMnemonic = (): string => {
        return bip39.generateMnemonic(128);
    };
}

export default new KeyringService();
