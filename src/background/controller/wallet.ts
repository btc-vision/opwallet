import { BroadcastedTransaction, UTXOs } from 'opnet';

import {
    contactBookService,
    keyringService,
    notificationService,
    openapiService,
    permissionService,
    preferenceService,
    sessionService
} from '@/background/service';
import { DisplayedKeyring, Keyring, SavedVault } from '@/background/service/keyring';
import { WalletSaveList } from '@/background/service/preference';
import { BroadcastTransactionOptions } from '@/content-script/pageProvider/Web3Provider.js';
import {
    ADDRESS_TYPES,
    AddressFlagType,
    AUTO_LOCKTIMES,
    BRAND_ALIAN_TYPE_TEXT,
    ChainId,
    CHAINS_ENUM,
    CHAINS_MAP,
    ChainType,
    COIN_NAME,
    COIN_SYMBOL,
    CustomNetwork,
    DEFAULT_LOCKTIME_ID,
    EVENTS,
    KEYRING_TYPE,
    KEYRING_TYPES,
    NETWORK_TYPES
} from '@/shared/constant';
import eventBus from '@/shared/eventBus';
import { SessionEvent } from '@/shared/interfaces/SessionEvent';
import {
    Account,
    AddressRecentHistory,
    AddressSummary,
    AddressType,
    AddressUserToSignInput,
    AppSummary,
    BitcoinBalance,
    DecodedPsbt,
    FeeSummary,
    GroupAsset,
    NetworkType,
    PublicKeyUserToSignInput,
    SignPsbtOptions,
    ToSignInput,
    TxHistoryItem,
    UTXO,
    VersionDetail,
    WalletConfig,
    WalletKeyring
} from '@/shared/types';
import { getChainInfo } from '@/shared/utils';
import Web3API, { bigIntToDecimal, getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import {
    Address,
    DeploymentResult,
    IDeploymentParameters,
    IDeploymentParametersWithoutSigner,
    IInteractionParameters,
    InteractionParametersWithoutSigner,
    InteractionResponse,
    RawChallenge,
    Wallet
} from '@btc-vision/transaction';
import {
    AbstractWallet,
    ECPair,
    genPsbtOfBIP322Simple,
    getSignatureFromPsbtOfBIP322Simple,
    KeystoneKeyring,
    publicKeyToAddress,
    scriptPkToAddress,
    signMessageOfBIP322Simple,
    toPsbtNetwork
} from '@btc-vision/wallet-sdk';

import { customNetworksManager } from '@/shared/utils/CustomNetworksManager';
import { address as bitcoinAddress, payments, Psbt, toXOnly, Transaction } from '@btc-vision/bitcoin';
import { Buffer } from 'buffer';
import { ContactBookItem, ContactBookStore } from '../service/contactBook';
import { OpenApiService } from '../service/openapi';
import { ConnectedSite } from '../service/permission';

export interface AccountAsset {
    name: string;
    symbol: string;
    amount: string;
    value: string;
}

export interface BalanceCacheEntry {
    balance: BitcoinBalance;
    timestamp: number;
    fetchPromise?: Promise<BitcoinBalance>;
}

/**
 * Custom error class for our WalletController.
 */
export class WalletControllerError extends Error {
    data?: unknown;

    constructor(message: string, data?: unknown) {
        super(message);
        this.name = 'WalletControllerError';
        this.data = data;
    }
}

const stashKeyrings: Record<string, Keyring> = {};

export class WalletController {
    public openapi: OpenApiService = openapiService;
    public timer: string | number | null = null;
    public getApproval = notificationService.getApproval;
    public getApprovalInteractionParametersToUse = notificationService.getApprovalInteractionParametersToUse;
    public clearApprovalInteractionParametersToUse = notificationService.clearApprovalInteractionParametersToUse;
    public resolveApproval = notificationService.resolveApproval;
    public rejectApproval = notificationService.rejectApproval;
    public getConnectedSite = permissionService.getConnectedSite;
    public getSite = permissionService.getSite;
    public getConnectedSites = permissionService.getConnectedSites;
    // Cache properties
    private balanceCache: Map<string, BalanceCacheEntry> = new Map();
    private readonly CACHE_DURATION = 10000; // 10 seconds in milliseconds
    private cacheCleanupTimer: NodeJS.Timeout | null = null;

    /**
     * Unlock the keyring vault with a password.
     * @throws WalletControllerError if unlocking fails
     */
    public boot = async (password: string): Promise<void> => {
        try {
            await keyringService.boot(password);
        } catch (err) {
            throw new WalletControllerError(`Failed to boot keyringService: ${String(err)}`, {
                passwordProvided: !!password
            });
        }
    };

    /**
     * Check whether the keyring vault is booted.
     */
    public isBooted = (): boolean => {
        return keyringService.isBooted();
    };

    /**
     * Check whether a vault exists.
     */
    public hasVault = (): boolean => {
        return keyringService.hasVault();
    };

    /**
     * Verify a given password against the vault.
     */
    public verifyPassword = (password: string): Promise<boolean> => {
        return keyringService.verifyPassword(password);
    };

    /**
     * Change vault password.
     */
    public changePassword = (password: string, newPassword: string): Promise<void> => {
        return keyringService.changePassword(password, newPassword);
    };

    /**
     * Initialize alias names for newly created or imported accounts.
     * @throws WalletControllerError
     */
    public initAlianNames = async (): Promise<void> => {
        try {
            preferenceService.changeInitAlianNameStatus();
            const contacts = this.listContact();
            const keyrings = await keyringService.getAllDisplayedKeyrings();

            keyrings.forEach((v) => {
                v.accounts.forEach((w, index) => {
                    this.updateAlianName(w.pubkey, `${BRAND_ALIAN_TYPE_TEXT[v.type]} ${index + 1}`);
                });
            });

            if (contacts.length !== 0 && keyrings.length !== 0) {
                const allAccounts = keyrings.map((item) => item.accounts).flat();
                const sameAddressList = contacts.filter((item) =>
                    allAccounts.find((contact) => contact.pubkey === item.address)
                );
                if (sameAddressList.length > 0) {
                    sameAddressList.forEach((item) => this.updateAlianName(item.address, item.name));
                }
            }
        } catch (err) {
            throw new WalletControllerError(`Failed to initialize alias names: ${String(err)}`);
        }
    };

    /**
     * Whether the contact service is ready.
     */
    public isReady = (): boolean => {
        return !!contactBookService.store;
    };

    /**
     * Unlock the wallet with a password.
     * @throws WalletControllerError
     */
    public unlock = async (password: string): Promise<void> => {
        try {
            const alianNameInited = preferenceService.getInitAlianNameStatus();
            const alianNames = contactBookService.listAlias();
            await keyringService.submitPassword(password);
            sessionService.broadcastEvent(SessionEvent.unlock);

            if (!alianNameInited && alianNames.length === 0) {
                await this.initAlianNames();
            }
            this._resetTimeout();

            // Start cache cleanup timer
            this._startCacheCleanup();
        } catch (err) {
            throw new WalletControllerError(`Unlock failed: ${String(err)}`, { passwordProvided: !!password });
        }
    };

    /**
     * Check whether the wallet is unlocked in memory.
     */
    public isUnlocked = (): boolean => {
        return keyringService.memStore.getState().isUnlocked;
    };

    /**
     * Lock the wallet. This clears sensitive info from memory.
     * @throws WalletControllerError
     */
    public lockWallet = async (): Promise<void> => {
        try {
            await keyringService.setLocked();
            sessionService.broadcastEvent(SessionEvent.accountsChanged, []);
            sessionService.broadcastEvent(SessionEvent.lock);
            eventBus.emit(EVENTS.broadcastToUI, {
                method: 'lock',
                params: {}
            });

            // Clear cache and stop cleanup timer
            this._clearBalanceCache();
        } catch (err) {
            throw new WalletControllerError(`Lock wallet failed: ${String(err)}`);
        }
    };

    /**
     * Set or unset the extension popup state.
     */
    public setPopupOpen = (isOpen: boolean): void => {
        preferenceService.setPopupOpen(isOpen);
    };

    /**
     * Fetch an address's balance with caching
     * @throws WalletControllerError
     */
    public getAddressBalance = async (address: string, pubKey?: string): Promise<BitcoinBalance> => {
        const cacheKey = this._generateCacheKey(address, pubKey);
        const now = Date.now();
        const cached = this.balanceCache.get(cacheKey);

        // Check if we have a valid cached entry
        if (cached && now - cached.timestamp < this.CACHE_DURATION) {
            // If there's an ongoing fetch, wait for it
            if (cached.fetchPromise) {
                try {
                    return await cached.fetchPromise;
                } catch (err) {
                    // If the ongoing fetch fails, continue to fetch again
                    console.warn('Ongoing fetch failed, refetching:', err);
                }
            } else {
                // Return cached balance
                return cached.balance;
            }
        }

        // Create a new fetch promise to prevent duplicate requests
        const fetchPromise = this.getOpNetBalance(address, pubKey).catch((err: unknown) => {
            // Remove failed fetch from cache
            this.balanceCache.delete(cacheKey);
            throw new WalletControllerError(`Failed to get address balance: ${String(err)}`, { address });
        });

        // Store the promise in cache immediately to prevent race conditions
        this.balanceCache.set(cacheKey, {
            balance: cached?.balance || ({} as BitcoinBalance), // Keep old balance while fetching
            timestamp: cached?.timestamp || now,
            fetchPromise
        });

        const balance = await fetchPromise;

        // Update cache with successful result
        this.balanceCache.set(cacheKey, {
            balance,
            timestamp: now,
            fetchPromise: undefined
        });

        return balance;
    };

    /**
     * Fetch multiple addresses' balances.
     * @throws WalletControllerError
     */
    public getMultiAddressAssets = async (addresses: string): Promise<AddressSummary[]> => {
        try {
            const network = this.getChainType();
            await Web3API.setNetwork(network);

            const addressList = addresses.split(',');
            const summaries: AddressSummary[] = [];
            for (const address of addressList) {
                const addressBalance = await this.getAddressBalance(address);
                const summary: AddressSummary = {
                    address: address,
                    totalSatoshis: Number(addressBalance.btc_total_amount) * 1e8,
                    loading: false
                };
                summaries.push(summary);
            }
            return summaries;
        } catch (err) {
            throw new WalletControllerError(`Failed to get multi-address assets: ${String(err)}`, { addresses });
        }
    };

    /**
     * Retrieve group assets (pass-through to openapiService).
     */
    public findGroupAssets = (
        groups: { type: number; address_arr: string[]; pubkey_arr: string[] }[]
    ): Promise<GroupAsset[]> => {
        // Potentially wrap in try/catch if there's network logic
        return openapiService.findGroupAssets(groups);
    };

    /**
     * Fetch address history (recent transactions).
     * @throws WalletControllerError
     */
    public getAddressHistory = async (params: {
        address: string;
        start: number;
        limit: number;
    }): Promise<AddressRecentHistory> => {
        try {
            return await openapiService.getAddressRecentHistory(params);
        } catch (err) {
            throw new WalletControllerError(`Failed to get address history: ${String(err)}`, params);
        }
    };

    /**
     * Get locally cached address history.
     */
    public getAddressCacheHistory = (address: string | undefined): TxHistoryItem[] => {
        if (!address) return [];
        return preferenceService.getAddressHistory(address);
    };

    public getExternalLinkAck = (): boolean => {
        return preferenceService.getExternalLinkAck();
    };

    public setExternalLinkAck = (ack: boolean): void => {
        preferenceService.setExternalLinkAck(ack);
    };

    public getLocale = (): string => {
        return preferenceService.getLocale();
    };

    public setLocale = async (locale: string): Promise<void> => {
        await preferenceService.setLocale(locale);
    };

    public getCurrency = (): string => {
        return preferenceService.getCurrency();
    };

    public setCurrency = (currency: string): void => {
        preferenceService.setCurrency(currency);
    };

    public clearKeyrings = (): void => {
        keyringService.clearKeyrings();
    };

    /**
     * Export a private key in both hex and WIF format.
     */
    public getPrivateKey = async (
        password: string,
        { pubkey, type }: { pubkey: string; type: string }
    ): Promise<{ hex: string; wif: string } | null> => {
        const isValid = await this.verifyPassword(password);
        if (!isValid) {
            throw new WalletControllerError('Invalid password');
        }

        const keyring = keyringService.getKeyringForAccount(pubkey, type);
        if (!keyring) return null;

        const privateKey = keyring.exportAccount(pubkey);
        if (!privateKey) {
            throw new WalletControllerError('No private key found for the given pubkey');
        }

        const networkType = this.getNetworkType();
        const network = toPsbtNetwork(networkType);

        const wif = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network }).toWIF();
        return {
            hex: privateKey,
            wif
        };
    };

    /**
     * Export a private key for internal use. Similar to getPrivateKey, but no password verification.
     * @returns null if the keyring is not found
     */
    public getInternalPrivateKey = ({
        pubkey,
        type
    }: {
        pubkey: string;
        type: string;
    }): { hex: string; wif: string } | null => {
        if (!pubkey) {
            throw new WalletControllerError('No pubkey found in parameters');
        }
        const keyring = keyringService.getKeyringForAccount(pubkey, type);
        if (!keyring) return null;

        const privateKey = keyring.exportAccount(pubkey);
        if (!privateKey) {
            throw new WalletControllerError('No private key found for the given pubkey');
        }

        const networkType = this.getNetworkType();
        const network = toPsbtNetwork(networkType);

        const wif = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network }).toWIF();
        return {
            hex: privateKey,
            wif
        };
    };

    /**
     * Export a BIP39 mnemonic from a given keyring.
     * @throws WalletControllerError if the keyring lacks a mnemonic
     */
    public getMnemonics = async (
        password: string,
        keyring: WalletKeyring
    ): Promise<{ mnemonic: string | undefined; hdPath: string | undefined; passphrase: string | undefined }> => {
        const isValid = await this.verifyPassword(password);

        if (!isValid) {
            throw new WalletControllerError('Invalid password');
        }

        const originKeyring = keyringService.keyrings[keyring.index];
        const serialized = originKeyring.serialize();

        if (!('mnemonic' in serialized) || serialized.mnemonic === undefined || serialized.mnemonic === null) {
            throw new WalletControllerError('No mnemonic found in keyring');
        }
        if (!('hdPath' in serialized) || serialized.hdPath === undefined || serialized.hdPath === null) {
            throw new WalletControllerError('No hdPath found in keyring');
        }

        const passphrase =
            serialized.passphrase !== undefined && serialized.passphrase !== null ? serialized.passphrase : undefined;

        return {
            mnemonic: serialized.mnemonic,
            hdPath: serialized.hdPath,
            passphrase
        };
    };

    /**
     * Create a new keyring from a single private key (hex or WIF).
     * @throws WalletControllerError if import fails
     */
    public createKeyringWithPrivateKey = async (
        data: string,
        addressType: AddressType,
        alianName?: string
    ): Promise<void> => {
        let originKeyring: Keyring;
        try {
            originKeyring = await keyringService.importPrivateKey(data, addressType);
        } catch (e) {
            console.warn('Something went wrong while attempting to load keyring', e);
            throw new WalletControllerError(`Could not import private key: ${String(e)}`, {
                data,
                addressType
            });
        }

        const pubkeys = originKeyring.getAccounts();
        if (alianName) this.updateAlianName(pubkeys[0], alianName);

        const displayedKeyring = keyringService.displayForKeyring(
            originKeyring,
            addressType,
            keyringService.keyrings.length - 1
        );

        const walletKeyring = await this.displayedKeyringToWalletKeyring(
            displayedKeyring,
            keyringService.keyrings.length - 1
        );

        this.changeKeyring(walletKeyring);
    };

    public getPreMnemonics = (): Promise<SavedVault[] | null> => {
        return keyringService.getPreMnemonics();
    };

    public generatePreMnemonic = (): Promise<string> => {
        return keyringService.generatePreMnemonic();
    };

    public removePreMnemonics = (): void => {
        keyringService.removePreMnemonics();
    };

    /**
     * Create a new HD keyring from a mnemonic (BIP39).
     * @throws WalletControllerError
     */
    public createKeyringWithMnemonics = async (
        mnemonic: string,
        hdPath: string,
        passphrase: string,
        addressType: AddressType,
        accountCount: number
    ): Promise<void> => {
        try {
            const originKeyring = await keyringService.createKeyringWithMnemonics(
                mnemonic,
                hdPath,
                passphrase,
                addressType,
                accountCount
            );
            keyringService.removePreMnemonics();

            const displayedKeyring = keyringService.displayForKeyring(
                originKeyring,
                addressType,
                keyringService.keyrings.length - 1
            );

            const walletKeyring = await this.displayedKeyringToWalletKeyring(
                displayedKeyring,
                keyringService.keyrings.length - 1
            );

            this.changeKeyring(walletKeyring);

            await preferenceService.setShowSafeNotice(true);
        } catch (err) {
            throw new WalletControllerError(`Could not create keyring from mnemonics: ${String(err)}`);
        }
    };

    /**
     * Create a temporary HD Keyring in memory with given mnemonic info.
     */
    public createTmpKeyringWithMnemonics = async (
        mnemonic: string,
        hdPath: string,
        passphrase: string,
        addressType: AddressType,
        accountCount = 1
    ): Promise<WalletKeyring> => {
        const activeIndexes: number[] = [];
        for (let i = 0; i < accountCount; i++) {
            activeIndexes.push(i);
        }

        const network = this.getNetworkType();
        const originKeyring = keyringService.createTmpKeyring('HD Key Tree', {
            mnemonic,
            activeIndexes,
            hdPath,
            passphrase,
            network: getBitcoinLibJSNetwork(network)
        });

        const displayedKeyring = keyringService.displayForKeyring(originKeyring, addressType, -1);
        return await this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
    };

    /**
     * Create a temporary keyring in memory with a single private key.
     */
    public createTmpKeyringWithPrivateKey = async (
        privateKey: string,
        addressType: AddressType
    ): Promise<WalletKeyring> => {
        const network = this.getNetworkType();
        const originKeyring = keyringService.createTmpKeyring(KEYRING_TYPE.SimpleKeyring, {
            privateKeys: [privateKey],
            network: getBitcoinLibJSNetwork(network)
        });

        const displayedKeyring = keyringService.displayForKeyring(originKeyring, addressType, -1);

        await preferenceService.setShowSafeNotice(true);
        return await this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
    };

    /**
     * Create a temporary Keystone keyring from UR data.
     */
    public createTmpKeyringWithKeystone = async (
        urType: string,
        urCbor: string,
        addressType: AddressType,
        hdPath: string,
        accountCount: number
    ): Promise<WalletKeyring> => {
        const tmpKeyring = new KeystoneKeyring();
        await tmpKeyring.initFromUR(urType, urCbor);
        if (hdPath.length >= 13) {
            tmpKeyring.changeChangeAddressHdPath(hdPath);
            tmpKeyring.addAccounts(accountCount);
        } else {
            tmpKeyring.changeHdPath(ADDRESS_TYPES[addressType].hdPath);
            if (accountCount) {
                tmpKeyring.addAccounts(accountCount);
            }
        }

        const opts = tmpKeyring.serialize();
        const originKeyring = keyringService.createTmpKeyring(KEYRING_TYPE.KeystoneKeyring, opts);
        const displayedKeyring = keyringService.displayForKeyring(originKeyring, addressType, -1);
        preferenceService.setShowSafeNotice(false);
        return this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
    };

    /**
     * Create a persistent Keystone keyring from UR data, with optional pubkey filtering.
     * @throws WalletControllerError
     */
    public createKeyringWithKeystone = async (
        urType: string,
        urCbor: string,
        addressType: AddressType,
        hdPath: string,
        accountCount = 1,
        filterPubkey: string[] = []
    ): Promise<void> => {
        try {
            const originKeyring = await keyringService.createKeyringWithKeystone(
                urType,
                urCbor,
                addressType,
                hdPath,
                accountCount
            );

            if (filterPubkey?.length > 0) {
                const accounts = originKeyring.getAccounts();
                accounts.forEach((account) => {
                    if (!filterPubkey.includes(account)) {
                        originKeyring.removeAccount(account);
                    }
                });
            }

            const displayedKeyring = keyringService.displayForKeyring(
                originKeyring,
                addressType,
                keyringService.keyrings.length - 1
            );

            const walletKeyring = await this.displayedKeyringToWalletKeyring(
                displayedKeyring,
                keyringService.keyrings.length - 1
            );

            this.changeKeyring(walletKeyring);
            await preferenceService.setShowSafeNotice(false);
        } catch (err) {
            throw new WalletControllerError(`Could not create keyring with Keystone data: ${String(err)}`, {
                urType,
                urCbor,
                addressType,
                hdPath,
                accountCount
            });
        }
    };

    /**
     * Remove an entire keyring by index, then switch to another if it exists.
     * @throws WalletControllerError
     */
    public removeKeyring = async (keyring: WalletKeyring): Promise<WalletKeyring | undefined> => {
        try {
            await keyringService.removeKeyring(keyring.index);
            const keyrings = await this.getKeyrings();
            const nextKeyring = keyrings[keyrings.length - 1];
            if (nextKeyring?.accounts[0]) {
                this.changeKeyring(nextKeyring);
                return nextKeyring;
            }
            return undefined;
        } catch (err) {
            throw new WalletControllerError(`Could not remove keyring: ${String(err)}`, { keyring });
        }
    };

    public getKeyringByType = (type: string): Keyring | undefined => {
        return keyringService.getKeyringByType(type);
    };

    /**
     * Derive a new account from an HD mnemonic-based keyring.
     * @throws WalletControllerError
     */
    public deriveNewAccountFromMnemonic = async (keyring: WalletKeyring, alianName?: string): Promise<void> => {
        try {
            const _keyring = keyringService.keyrings[keyring.index];
            const result = await keyringService.addNewAccount(_keyring);
            if (alianName) this.updateAlianName(result[0], alianName);

            const currentKeyring = await this.getCurrentKeyring();
            if (!currentKeyring) {
                throw new WalletControllerError('No current keyring after deriving new account');
            }
            this.changeKeyring(currentKeyring, currentKeyring.accounts.length - 1);
        } catch (err) {
            throw new WalletControllerError(`Could not derive new account from mnemonic: ${String(err)}`, {
                keyring,
                alianName
            });
        }
    };

    /**
     * Return total number of known accounts across all keyrings.
     */
    public getAccountsCount = (): number => {
        const accounts = keyringService.getAccounts();
        return accounts.filter((x) => x).length;
    };

    /**
     * Switch to a different keyring and optionally select which account in that keyring is active.
     */
    public changeKeyring = (keyring: WalletKeyring, accountIndex = 0): void => {
        preferenceService.setCurrentKeyringIndex(keyring.index);
        preferenceService.setCurrentAccount(keyring.accounts[accountIndex]);
        const flag = preferenceService.getAddressFlag(keyring.accounts[accountIndex].address);
        openapiService.setClientAddress(keyring.accounts[accountIndex].address, flag);
    };

    /**
     * Return a list of all addresses for a specific keyring account index, in multiple address formats.
     */
    public getAllAddresses = (keyring: WalletKeyring, index: number): string[] => {
        const networkType = this.getNetworkType();
        const addresses: string[] = [];
        const _keyring = keyringService.keyrings[keyring.index] as KeystoneKeyring;
        if (keyring.type === KEYRING_TYPE.HdKeyring || keyring.type === KEYRING_TYPE.KeystoneKeyring) {
            const pathPubkey: Record<string, string> = {};
            ADDRESS_TYPES.filter((v) => v.displayIndex >= 0).forEach((v) => {
                let pubkey = pathPubkey[v.hdPath];
                if (!pubkey && _keyring.getAccountByHdPath) {
                    pubkey = _keyring.getAccountByHdPath(v.hdPath, index);
                }
                const address = publicKeyToAddress(pubkey, v.value, networkType);
                addresses.push(address);
            });
        } else {
            ADDRESS_TYPES.filter((v) => v.displayIndex >= 0 && v.isUnisatLegacy === false).forEach((v) => {
                const pubkey = keyring.accounts[index].pubkey;
                const address = publicKeyToAddress(pubkey, v.value, networkType);
                addresses.push(address);
            });
        }
        return addresses;
    };

    /**
     * Change the active addressType for a keyring. This can refresh the derived addresses, etc.
     * @throws WalletControllerError
     */
    public changeAddressType = async (addressType: AddressType): Promise<void> => {
        try {
            const currentAccount = await this.getCurrentAccount();
            const currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
            await keyringService.changeAddressType(currentKeyringIndex, addressType);

            const keyring = await this.getCurrentKeyring();
            if (!keyring) throw new WalletControllerError('No current keyring');
            this.changeKeyring(keyring, currentAccount?.index || 0);
        } catch (err) {
            throw new WalletControllerError(`Failed to change address type: ${String(err)}`, {
                addressType
            });
        }
    };

    /**
     * Low-level convenience method for signing a transaction's PSBT.
     */
    public signTransaction = (type: string, from: string, psbt: Psbt, inputs: ToSignInput[]): Psbt => {
        const keyring = keyringService.getKeyringForAccount(from, type);
        return keyringService.signTransaction(keyring, psbt, inputs);
    };

    /**
     * Given a psbt and optional sign input array, produce a fully typed array of inputs to sign.
     * @throws WalletControllerError
     */
    public formatOptionsToSignInputs = async (
        _psbt: string | Psbt,
        options?: SignPsbtOptions
    ): Promise<ToSignInput[]> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account: formatOptionsToSignInputs');
        }

        let toSignInputs: ToSignInput[] = [];
        if (options?.toSignInputs) {
            // Validate user-provided inputs
            toSignInputs = options.toSignInputs.map((input) => {
                const index = Number(input.index as unknown as string);
                if (isNaN(index)) throw new Error('invalid index in toSignInput');

                const addrInput = input as AddressUserToSignInput;
                const pubInput = input as PublicKeyUserToSignInput;

                if (!addrInput.address && !pubInput.publicKey) {
                    throw new WalletControllerError('No address or public key in toSignInput');
                }
                if (addrInput.address && addrInput.address !== account.address) {
                    throw new WalletControllerError('Invalid address in toSignInput');
                }
                if (pubInput.publicKey && pubInput.publicKey !== account.pubkey) {
                    throw new WalletControllerError('Invalid public key in toSignInput');
                }

                const sighashTypes = input.sighashTypes?.map(Number);
                if (sighashTypes?.some(isNaN)) {
                    throw new WalletControllerError('Invalid sighash type in toSignInput');
                }

                return {
                    index,
                    publicKey: account.pubkey,
                    sighashTypes,
                    disableTweakSigner: input.disableTweakSigner
                };
            });
        } else {
            // No custom toSignInputs => auto-detect
            const networkType = this.getNetworkType();
            const psbtNetwork = toPsbtNetwork(networkType);

            const psbt = typeof _psbt === 'string' ? Psbt.fromHex(_psbt, { network: psbtNetwork }) : _psbt;

            psbt.data.inputs.forEach((v, idx) => {
                let script: Buffer | null = null;
                if (v.witnessUtxo) {
                    script = v.witnessUtxo.script;
                } else if (v.nonWitnessUtxo) {
                    const tx = Transaction.fromBuffer(v.nonWitnessUtxo);
                    const output = tx.outs[psbt.txInputs[idx].index];
                    script = output.script;
                }
                const isSigned = v.finalScriptSig ?? v.finalScriptWitness;
                if (script && !isSigned) {
                    const address = scriptPkToAddress(script, networkType);
                    if (account.address === address) {
                        toSignInputs.push({
                            index: idx,
                            publicKey: account.pubkey,
                            sighashTypes: v.sighashType ? [v.sighashType] : undefined
                        });
                    }
                }
            });
        }
        return toSignInputs;
    };

    /**
     * Sign a psbt with a keyring and optionally finalize the inputs.
     * @throws WalletControllerError
     */
    public signPsbt = async (psbt: Psbt, toSignInputs: ToSignInput[], autoFinalized: boolean): Promise<Psbt> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account: signPsbt');

        const keyring = await this.getCurrentKeyring();
        if (!keyring) throw new WalletControllerError('No current keyring');
        const __keyring = keyringService.keyrings[keyring.index];

        const networkType = this.getNetworkType();
        const psbtNetwork = toPsbtNetwork(networkType);

        if (!toSignInputs) {
            // For backward compatibility
            toSignInputs = await this.formatOptionsToSignInputs(psbt);
        }

        // Attempt to fix missing tapInternalKey for P2TR inputs
        psbt.data.inputs.forEach((v) => {
            const isNotSigned = !(v.finalScriptSig ?? v.finalScriptWitness);
            const isP2TR = keyring.addressType === AddressType.P2TR || keyring.addressType === AddressType.M44_P2TR;
            const lostInternalPubkey = !v.tapInternalKey;

            if (isNotSigned && isP2TR && lostInternalPubkey) {
                const tapInternalKey = toXOnly(Buffer.from(account.pubkey, 'hex'));
                const { output } = payments.p2tr({
                    internalPubkey: tapInternalKey,
                    network: psbtNetwork
                });
                if (v.witnessUtxo?.script.toString('hex') === output?.toString('hex')) {
                    v.tapInternalKey = tapInternalKey;
                }
            }
        });

        // Keystone special handling
        if (keyring.type === KEYRING_TYPE.KeystoneKeyring) {
            const _keyring = __keyring as KeystoneKeyring;
            if (!_keyring.mfp) {
                throw new WalletControllerError('No master fingerprint found in Keystone keyring');
            }

            toSignInputs.forEach((input) => {
                const isP2TR = keyring.addressType === AddressType.P2TR || keyring.addressType === AddressType.M44_P2TR;
                const bip32Derivation = {
                    masterFingerprint: Buffer.from(_keyring.mfp, 'hex'),
                    path: `${keyring.hdPath}/${account.index}`,
                    pubkey: Buffer.from(account.pubkey, 'hex')
                };

                if (isP2TR) {
                    psbt.data.inputs[input.index].tapBip32Derivation = [
                        {
                            ...bip32Derivation,
                            pubkey: bip32Derivation.pubkey.subarray(1),
                            leafHashes: []
                        }
                    ];
                } else {
                    psbt.data.inputs[input.index].bip32Derivation = [bip32Derivation];
                }
            });
            return psbt;
        }

        // Normal keyring
        const signedPsbt = keyringService.signTransaction(__keyring, psbt, toSignInputs);
        if (autoFinalized) {
            toSignInputs.forEach((input) => {
                signedPsbt.finalizeInput(input.index);
            });
        }
        return signedPsbt;
    };

    /**
     * Sign a psbt from hex, optionally finalizing the inputs, and return hex.
     * @throws WalletControllerError
     */
    public signPsbtWithHex = async (
        psbtHex: string,
        toSignInputs: ToSignInput[],
        autoFinalized: boolean
    ): Promise<string> => {
        const psbt = Psbt.fromHex(psbtHex);
        await this.signPsbt(psbt, toSignInputs, autoFinalized);
        return psbt.toHex();
    };

    /**
     * ECDSA or Schnorr message signing for the current account.
     * @throws WalletControllerError
     */
    public signMessage = async (message: string | Buffer): Promise<string> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        return keyringService.signMessage(account.pubkey, account.type, message);
    };

    /**
     * Sign and broadcast an Interaction (two transactions) on OPNet.
     * @returns Tuple of [fundingTx, interactionTx, nextUTXOs, preimage]
     * @throws WalletControllerError
     */
    public signAndBroadcastInteraction = async (
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<
        [BroadcastedTransaction, BroadcastedTransaction, import('@btc-vision/transaction').UTXO[], RawChallenge]
    > => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const wifWallet = this.getInternalPrivateKey({
            pubkey: account.pubkey,
            type: account.type
        } as Account);
        if (!wifWallet) throw new WalletControllerError('Could not retrieve internal private key');

        let requiredMinimum = 0;
        let tries = 0;
        let signed: { response: InteractionResponse; utxos: UTXOs } | undefined;

        do {
            if (tries === 2) {
                throw new WalletControllerError(
                    'Failed to sign interaction: not enough funds in UTXOs. Please consolidate your UTXOs.'
                );
            }
            tries++;

            try {
                signed = await this.signInteractionInternal(account, wifWallet, interactionParameters, requiredMinimum);
            } catch (err: unknown) {
                const msg = err as Error;

                if (!msg.message.includes('setFeeOutput: Insufficient funds')) {
                    throw new WalletControllerError(`Failed to sign interaction: ${msg.message}`, {
                        interactionParameters
                    });
                }

                const m = /Fee:\s*(\d+)[^\d]+(?:Value|Total input):\s*(\d+)/i.exec(msg.message);
                if (!m) {
                    throw new WalletControllerError(`Failed to parse insufficient-funds error: ${msg.message}`, {
                        interactionParameters
                    });
                }

                const fee = BigInt(m[1]);
                const available = BigInt(m[2]);
                const missing = fee > available ? fee - available : 0n;

                requiredMinimum = Number(missing + (missing * 20n) / 100n);
            }
        } while (!signed);

        try {
            const { response, utxos } = signed;

            if (!response?.fundingTransaction) {
                throw new WalletControllerError('No funding transaction found');
            }

            const fundingTx = await Web3API.provider.sendRawTransaction(response.fundingTransaction, false);
            if (!fundingTx) throw new WalletControllerError('No result from funding transaction broadcast');
            if (fundingTx.error) throw new WalletControllerError(fundingTx.error);

            const interTx = await Web3API.provider.sendRawTransaction(response.interactionTransaction, false);
            if (!interTx) throw new WalletControllerError('No result from interaction transaction broadcast');
            if (interTx.error) throw new WalletControllerError(interTx.error);

            Web3API.provider.utxoManager.spentUTXO(account.address, utxos, response.nextUTXOs);

            return [fundingTx, interTx, response.nextUTXOs, response.challenge];
        } catch (err) {
            throw new WalletControllerError(`signAndBroadcastInteraction failed: ${String(err)}`, {
                interactionParameters
            });
        }
    };

    /**
     * Deploy a smart contract (OPNet).
     * @throws WalletControllerError
     */
    public deployContract = async (params: IDeploymentParametersWithoutSigner): Promise<DeploymentResult> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const wifWallet = this.getInternalPrivateKey({
            pubkey: account.pubkey,
            type: account.type
        } as Account);

        if (!wifWallet) throw new WalletControllerError('Could not retrieve internal private key');

        try {
            const utxos = params.utxos.map((u) => {
                let nonWitnessUtxo: Buffer | undefined;

                if (Buffer.isBuffer(u.nonWitnessUtxo)) {
                    nonWitnessUtxo = u.nonWitnessUtxo;
                } else if (typeof u.nonWitnessUtxo === 'string') {
                    try {
                        nonWitnessUtxo = Buffer.from(u.nonWitnessUtxo, 'base64');
                    } catch {
                        nonWitnessUtxo = undefined;
                    }
                } else if (u.nonWitnessUtxo && typeof u.nonWitnessUtxo === 'object') {
                    try {
                        const raw = u.nonWitnessUtxo as Record<string, number>;
                        const len = Math.max(...Object.keys(raw).map((k) => +k)) + 1;
                        const buf = Buffer.alloc(len);
                        for (const [k, v] of Object.entries(raw)) buf[+k] = v;
                        nonWitnessUtxo = buf;
                    } catch {
                        nonWitnessUtxo = undefined;
                    }
                }

                return {
                    ...u,
                    value: typeof u.value === 'bigint' ? u.value : BigInt(u.value as unknown as string),
                    nonWitnessUtxo
                };
            });

            const optionalInputs =
                params.optionalInputs?.map((u) => {
                    let nonWitnessUtxo: Buffer | undefined;

                    if (Buffer.isBuffer(u.nonWitnessUtxo)) {
                        nonWitnessUtxo = u.nonWitnessUtxo;
                    } else if (typeof u.nonWitnessUtxo === 'string') {
                        try {
                            nonWitnessUtxo = Buffer.from(u.nonWitnessUtxo, 'base64');
                        } catch {
                            nonWitnessUtxo = undefined;
                        }
                    } else if (u.nonWitnessUtxo && typeof u.nonWitnessUtxo === 'object') {
                        try {
                            const raw = u.nonWitnessUtxo as Record<string, number>;
                            const len = Math.max(...Object.keys(raw).map((k) => +k)) + 1;
                            const buf = Buffer.alloc(len);
                            for (const [k, v] of Object.entries(raw)) buf[+k] = v;
                            nonWitnessUtxo = buf;
                        } catch {
                            nonWitnessUtxo = undefined;
                        }
                    }

                    return {
                        ...u,
                        value: typeof u.value === 'bigint' ? u.value : BigInt(u.value as unknown as string),
                        nonWitnessUtxo
                    };
                }) || [];

            const challenge = await Web3API.provider.getChallenge();
            const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);
            const deployContractParameters: IDeploymentParameters = {
                ...params,
                utxos,
                challenge,
                signer: walletGet.keypair,
                network: Web3API.network,
                feeRate: Number(params.feeRate.toString()),
                gasSatFee:
                    BigInt((params.gasSatFee as unknown as string) || 0n) < 330n
                        ? 330n
                        : BigInt((params.gasSatFee as unknown as string) || 0n),
                priorityFee: BigInt((params.priorityFee as unknown as string) || 0n),
                bytecode:
                    typeof params.bytecode === 'string'
                        ? Buffer.from(params.bytecode, 'hex')
                        : Buffer.from(params.bytecode),
                calldata: params.calldata
                    ? typeof params.calldata === 'string'
                        ? Buffer.from(params.calldata, 'hex')
                        : Buffer.from(params.calldata)
                    : undefined,
                optionalOutputs: params.optionalOutputs || [],
                optionalInputs: optionalInputs,
                note: params.note
            };

            return await Web3API.transactionFactory.signDeployment(deployContractParameters);
        } catch (err) {
            throw new WalletControllerError(`Failed to deploy contract: ${String(err)}`, { params });
        }
    };

    /**
     * Sign an interaction (no broadcast).
     * @throws WalletControllerError
     */
    public signInteraction = async (
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<InteractionResponse> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const wifWallet = this.getInternalPrivateKey({
            pubkey: account.pubkey,
            type: account.type
        } as Account);
        if (!wifWallet) throw new WalletControllerError('Could not retrieve internal private key');

        let interactionResponse: InteractionResponse | undefined;
        let requiredMinimum = 0;
        let tries = 0;

        do {
            if (tries === 2) {
                throw new WalletControllerError(
                    'Failed to sign interaction: not enough funds in UTXOs. Please consolidate your UTXOs.'
                );
            }
            tries++;

            try {
                const { response } = await this.signInteractionInternal(
                    account,
                    wifWallet,
                    interactionParameters,
                    requiredMinimum
                );
                interactionResponse = response;
            } catch (err: unknown) {
                const msg = err as Error;

                if (!msg.message.includes('setFeeOutput: Insufficient funds')) {
                    throw new WalletControllerError(`Failed to sign interaction: ${msg.message}`, {
                        interactionParameters
                    });
                }

                const matches = /Fee:\s*(\d+)[^\d]+(?:Value|Total input):\s*(\d+)/i.exec(msg.message);
                if (!matches) {
                    throw new WalletControllerError(`Failed to parse insufficient-funds error: ${msg.message}`, {
                        interactionParameters
                    });
                }

                const fee = BigInt(matches[1]);
                const available = BigInt(matches[2]);
                const missing = fee > available ? fee - available : 0n;

                requiredMinimum = Number(missing + (missing * 20n) / 100n);
            }
        } while (!interactionResponse);

        return interactionResponse;
    };

    /**
     * Broadcast multiple transactions to the Bitcoin or OPNet network.
     * @throws WalletControllerError
     */
    public broadcast = async (transactions: BroadcastTransactionOptions[]): Promise<BroadcastedTransaction[]> => {
        const broadcastedTransactions: BroadcastedTransaction[] = [];
        for (const transaction of transactions) {
            try {
                const broadcastedTransaction = await Web3API.provider.sendRawTransaction(
                    transaction.raw,
                    transaction.psbt
                );

                if (!broadcastedTransaction) {
                    throw new WalletControllerError('Error in broadcast: no response');
                }

                if (broadcastedTransaction.error) {
                    throw new WalletControllerError(broadcastedTransaction.error);
                }

                broadcastedTransactions.push(broadcastedTransaction);
            } catch (err) {
                throw new WalletControllerError(`Broadcast failed: ${String(err)}`, transaction);
            }
        }
        return broadcastedTransactions;
    };

    /**
     * Sign a BIP322 message in "simple" mode (via a BIP322 PSBT).
     * @throws WalletControllerError
     */
    public signBIP322Simple = async (message: string | Buffer): Promise<string> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');
        const networkType = this.getNetworkType();
        try {
            return await signMessageOfBIP322Simple({
                message,
                address: account.address,
                networkType,
                wallet: this as unknown as AbstractWallet
            });
        } catch (err) {
            throw new WalletControllerError(`Failed to sign BIP322 message: ${String(err)}`, {
                message,
                networkType
            });
        }
    };

    /**
     * Sign arbitrary data using ecdsa or schnorr.
     */
    public signData = async (data: string, type: 'ecdsa' | 'schnorr' = 'ecdsa'): Promise<string> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        return keyringService.signData(account.pubkey, data, type);
    };

    public addContact = (data: ContactBookItem): void => {
        contactBookService.addContact(data);
    };

    public updateContact = (data: ContactBookItem): void => {
        contactBookService.updateContact(data);
    };

    public removeContact = (address: string): void => {
        contactBookService.removeContact(address);
    };

    public listContact = (includeAlias = true): ContactBookItem[] => {
        const list = contactBookService.listContacts();
        if (includeAlias) {
            return list;
        } else {
            return list.filter((item) => !item.isAlias);
        }
    };

    public getContactsByMap = (): ContactBookStore => {
        return contactBookService.getContactsByMap();
    };

    public getContactByAddress = (address: string): ContactBookItem | undefined => {
        return contactBookService.getContactByAddress(address);
    };

    public getNextAlianName = (keyring: WalletKeyring): string => {
        return this._generateAlianName(keyring.type, keyring.accounts.length + 1);
    };

    public getHighlightWalletList = (): WalletSaveList => {
        return preferenceService.getWalletSavedList();
    };

    public updateHighlightWalletList = (list: WalletSaveList): void => {
        preferenceService.updateWalletSavedList(list);
    };

    public getAlianName = (pubkey: string): string | undefined => {
        return contactBookService.getContactByAddress(pubkey)?.name;
    };

    public updateAlianName = (pubkey: string, name: string): void => {
        contactBookService.updateAlias({
            name,
            address: pubkey
        });
    };

    public getAllAlianName = (): ContactBookItem[] => {
        return contactBookService.listAlias();
    };

    public getInitAlianNameStatus = (): boolean => {
        return preferenceService.getInitAlianNameStatus();
    };

    public updateInitAlianNameStatus = (): Promise<void> => {
        return preferenceService.changeInitAlianNameStatus();
    };

    public getIsFirstOpen = (): Promise<boolean> => {
        return preferenceService.getIsFirstOpen();
    };

    public updateIsFirstOpen = (): Promise<void> => {
        return preferenceService.updateIsFirstOpen();
    };

    /**
     * Fetch chain assets for a given address.
     * @throws WalletControllerError
     */
    public listChainAssets = async (pubkeyAddress: string): Promise<AccountAsset[]> => {
        try {
            const balance = await openapiService.getAddressBalance(pubkeyAddress);
            return [
                { name: COIN_NAME, symbol: COIN_SYMBOL, amount: balance.btc_total_amount, value: balance.usd_value }
            ];
        } catch (err) {
            throw new WalletControllerError(`Failed to list chain assets: ${String(err)}`, {
                pubkeyAddress
            });
        }
    };

    /**
     * Log an error or send it to a remote server.
     */
    public reportErrors = (error: string): void => {
        console.error('report not implemented:', error);
    };

    public getNetworkType = (): NetworkType => {
        const chainType = this.getChainType();
        const chain = CHAINS_MAP[chainType];
        if (!chain) {
            throw new WalletControllerError(`Chain ${chainType} not found in CHAINS_MAP`);
        }
        return chain.networkType;
    };

    public setNetworkType = async (networkType: NetworkType): Promise<void> => {
        // Get current chain to determine the base chain type (Bitcoin, Litecoin, etc.)
        const currentChainType = this.getChainType();
        let baseChain = 'BITCOIN'; // default

        if (currentChainType.includes('BITCOIN')) baseChain = 'BITCOIN';
        else if (currentChainType.includes('FRACTAL')) baseChain = 'FRACTAL_BITCOIN';
        else if (currentChainType.includes('DOGECOIN')) baseChain = 'DOGECOIN';
        else if (currentChainType.includes('LITECOIN')) baseChain = 'LITECOIN';
        else if (currentChainType.includes('BITCOINCASH')) baseChain = 'BITCOINCASH';
        else if (currentChainType.includes('DASH')) baseChain = 'DASH';

        let newChainType: ChainType;

        switch (networkType) {
            case NetworkType.MAINNET:
                newChainType = `${baseChain}_MAINNET` as ChainType;
                break;
            case NetworkType.TESTNET:
                // Special cases for testnet
                if (baseChain === 'BITCOIN' && currentChainType === ChainType.BITCOIN_TESTNET4) {
                    newChainType = ChainType.BITCOIN_TESTNET4;
                } else if (baseChain === 'BITCOIN' && currentChainType === ChainType.BITCOIN_SIGNET) {
                    newChainType = ChainType.BITCOIN_SIGNET;
                } else {
                    newChainType = `${baseChain}_TESTNET` as ChainType;
                }
                break;
            case NetworkType.REGTEST:
                newChainType = `${baseChain}_REGTEST` as ChainType;
                break;
            default:
                throw new WalletControllerError(`Invalid network type: ${networkType}`);
        }

        // Check if the chain exists and is not disabled
        const targetChain = CHAINS_MAP[newChainType];
        if (!targetChain) {
            throw new WalletControllerError(`Chain ${newChainType} not found`);
        }

        if (targetChain.disable) {
            throw new WalletControllerError(`Chain ${newChainType} is disabled. Please add a custom RPC endpoint.`);
        }

        await this.setChainType(newChainType);
    };

    public getNetworkName = (): string => {
        const networkType = this.getNetworkType();
        return NETWORK_TYPES[networkType].name;
    };

    public getLegacyNetworkName = (): string => {
        const chainType = this.getChainType();
        const chain = CHAINS_MAP[chainType];
        if (!chain) {
            throw new WalletControllerError(`Chain ${chainType} not found in CHAINS_MAP`);
        }
        return NETWORK_TYPES[chain.networkType].name;
    };

    /**
     * Set the chain type and update all relevant states (endpoints, current keyring account, etc.).
     * @throws WalletControllerError
     */
    public setChainType = async (chainType: ChainType): Promise<void> => {
        try {
            // Clear balance cache when switching chains
            this._clearBalanceCache();

            // Ensure custom networks are loaded
            await customNetworksManager.reload();

            // This will use the updated CHAINS_MAP
            await Web3API.setNetwork(chainType);

            await preferenceService.setChainType(chainType);

            const chain = CHAINS_MAP[chainType];
            if (!chain) {
                throw new WalletControllerError(`Chain ${chainType} not found in CHAINS_MAP`);
            }

            await this.openapi.setEndpoints(chain.endpoints);

            const currentAccount = await this.getCurrentAccount();
            const keyring = await this.getCurrentKeyring();
            if (!keyring) {
                throw new WalletControllerError('No current keyring in setChainType');
            }
            this.changeKeyring(keyring, currentAccount?.index || 0);

            const chainInfo = getChainInfo(chainType);
            sessionService.broadcastEvent<SessionEvent.chainChanged>(SessionEvent.chainChanged, chainInfo);
            eventBus.emit(EVENTS.broadcastToUI, {
                method: 'chainChanged',
                params: chainInfo
            });

            const network = this.getLegacyNetworkName();
            sessionService.broadcastEvent<SessionEvent.networkChanged>(SessionEvent.networkChanged, {
                network,
                chainType
            });

            // Start cache cleanup timer
            this._startCacheCleanup();
        } catch (err) {
            throw new WalletControllerError(`Failed to set chain type: ${String(err)}`, { chainType });
        }
    };

    public addCustomNetwork = async (params: {
        name: string;
        networkType: NetworkType;
        chainId: ChainId;
        unit: string;
        opnetUrl: string;
        mempoolSpaceUrl: string;
        faucetUrl?: string;
        showPrice?: boolean;
    }): Promise<CustomNetwork> => {
        try {
            // The network will be added and validated by customNetworksManager
            const network = await customNetworksManager.addCustomNetwork(params);

            // Force reload of chains to ensure background service is aware
            await customNetworksManager.reload();

            return network;
        } catch (err) {
            throw new WalletControllerError(`Failed to add custom network: ${String(err)}`, params);
        }
    };

    public deleteCustomNetwork = async (id: string): Promise<boolean> => {
        try {
            const success = await customNetworksManager.deleteCustomNetwork(id);
            if (success) {
                // Force reload of chains
                await customNetworksManager.reload();
            }
            return success;
        } catch (err) {
            throw new WalletControllerError(`Failed to delete custom network: ${String(err)}`, { id });
        }
    };

    public getAllCustomNetworks = async (): Promise<CustomNetwork[]> => {
        return customNetworksManager.getAllCustomNetworks();
    };

    public testRpcConnection = async (url: string): Promise<boolean> => {
        return customNetworksManager.testRpcConnection(url);
    };

    public getChainType = (): ChainType => {
        return preferenceService.getChainType();
    };

    /**
     * Broadcast a raw transaction hex.
     * @throws WalletControllerError
     */
    public pushTx = async (rawtx: string): Promise<string> => {
        try {
            return await this.openapi.pushTx(rawtx);
        } catch (err) {
            throw new WalletControllerError(`Failed to push transaction: ${String(err)}`, { rawtx });
        }
    };

    /**
     * Return all accounts across all keyrings.
     */
    public getAccounts = async (): Promise<Account[]> => {
        const keyrings = await this.getKeyrings();
        return keyrings.reduce<Account[]>((pre, cur) => pre.concat(cur.accounts), []);
    };

    /**
     * Convert a displayedKeyring to a typed WalletKeyring.
     */
    public displayedKeyringToWalletKeyring = async (
        displayedKeyring: DisplayedKeyring,
        index: number,
        initName = true
    ): Promise<WalletKeyring> => {
        const networkType = this.getNetworkType();
        const addressType = displayedKeyring.addressType;
        const key = `keyring_${index}`;
        const type = displayedKeyring.type;
        const accounts: Account[] = [];

        for (let j = 0; j < displayedKeyring.accounts.length; j++) {
            const { pubkey } = displayedKeyring.accounts[j];
            const address = publicKeyToAddress(pubkey, addressType, networkType);
            const accountKey = `${key}#${j}`;
            const defaultName = this.getAlianName(pubkey) ?? this._generateAlianName(type, j + 1);
            const alianName = await preferenceService.getAccountAlianName(accountKey, defaultName);
            const flag = preferenceService.getAddressFlag(address);
            accounts.push({
                type,
                pubkey,
                address,
                alianName,
                index: j,
                key: accountKey,
                flag
            });
        }
        const hdPath =
            type === KEYRING_TYPE.HdKeyring || type === KEYRING_TYPE.KeystoneKeyring
                ? displayedKeyring.keyring.hdPath
                : '';
        const alianName = await preferenceService.getKeyringAlianName(
            key,
            initName ? `${KEYRING_TYPES[type].alianName} #${index + 1}` : ''
        );

        return {
            index,
            key,
            type,
            addressType,
            accounts,
            alianName,
            hdPath
        };
    };

    /**
     * Return all keyrings (non-empty) in a typed array of WalletKeyring.
     */
    public getKeyrings = async (): Promise<WalletKeyring[]> => {
        const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
        const keyrings: WalletKeyring[] = [];

        for (const displayedKeyring of displayedKeyrings) {
            if (displayedKeyring.type === KEYRING_TYPE.Empty) {
                continue;
            }

            const walletKeyring = await this.displayedKeyringToWalletKeyring(displayedKeyring, displayedKeyring.index);
            keyrings.push(walletKeyring);
        }
        return keyrings;
    };

    /**
     * Return the currently active keyring, derived from preferences.
     */
    public getCurrentKeyring = async (): Promise<WalletKeyring | null> => {
        let currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
        const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
        if (currentKeyringIndex === undefined) {
            const currentAccount = await this.getCurrentAccount();
            for (let i = 0; i < displayedKeyrings.length; i++) {
                if (displayedKeyrings[i].type !== currentAccount?.type) continue;
                const found = displayedKeyrings[i].accounts.find((v) => v.pubkey === currentAccount?.pubkey);
                if (found) {
                    currentKeyringIndex = i;
                    break;
                }
            }
            if (currentKeyringIndex === undefined) {
                currentKeyringIndex = 0;
            }
        }

        if (
            !displayedKeyrings[currentKeyringIndex] ||
            displayedKeyrings[currentKeyringIndex].type === KEYRING_TYPE.Empty ||
            !displayedKeyrings[currentKeyringIndex].accounts[0]
        ) {
            for (let i = 0; i < displayedKeyrings.length; i++) {
                if (displayedKeyrings[i].type !== KEYRING_TYPE.Empty) {
                    currentKeyringIndex = i;
                    preferenceService.setCurrentKeyringIndex(currentKeyringIndex);
                    break;
                }
            }
        }

        const displayedKeyring = displayedKeyrings[currentKeyringIndex];
        if (!displayedKeyring) return null;
        return this.displayedKeyringToWalletKeyring(displayedKeyring, currentKeyringIndex);
    };

    /**
     * Return the current account across all keyrings, in typed form.
     */
    public getCurrentAccount = async (): Promise<Account | null> => {
        const currentKeyring = await this.getCurrentKeyring();
        if (!currentKeyring) return null;
        const account = preferenceService.getCurrentAccount();
        let currentAccount: Account | undefined;

        currentKeyring.accounts.forEach((v) => {
            if (v.pubkey === account?.pubkey) {
                currentAccount = v;
            }
        });
        if (!currentAccount) {
            currentAccount = currentKeyring.accounts[0];
        }

        if (currentAccount) {
            currentAccount.flag = preferenceService.getAddressFlag(currentAccount.address);
            openapiService.setClientAddress(currentAccount.address, currentAccount.flag);
        }
        return currentAccount ?? null;
    };

    /**
     * Get or set the keyring currently in "edit" mode.
     */
    public getEditingKeyring = async (): Promise<WalletKeyring> => {
        const editingKeyringIndex = preferenceService.getEditingKeyringIndex();
        const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
        const displayedKeyring = displayedKeyrings[editingKeyringIndex];
        return this.displayedKeyringToWalletKeyring(displayedKeyring, editingKeyringIndex);
    };

    public setEditingKeyring = async (index: number): Promise<void> => {
        await preferenceService.setEditingKeyringIndex(index);
    };

    public getEditingAccount = (): Account | undefined | null => {
        return preferenceService.getEditingAccount();
    };

    public setEditingAccount = async (account: Account): Promise<void> => {
        await preferenceService.setEditingAccount(account);
    };

    /**
     * Get the app summary (list of recommended apps, etc.) from openapi, with read/unread flags.
     */
    public getAppSummary = async (): Promise<AppSummary> => {
        /*const appTab = preferenceService.getAppTab();
        try {
            const data = await openapiService.getAppSummary();
            const readTabTime = appTab.readTabTime;
            data.apps.forEach((w: { id: number; time?: number; new?: boolean }) => {
                const readAppTime = appTab.readAppTime[w.id];
                if (w.time) {
                    if (Date.now() > w.time + 1000 * 60 * 60 * 24 * 7) {
                        w.new = false;
                    } else {
                        w.new = !(readAppTime && readAppTime > w.time);
                    }
                } else {
                    w.new = false;
                }
            });
            data.readTabTime = readTabTime;
            await preferenceService.setAppSummary(data);
            return data;
        } catch (e) {
            console.log('getAppSummary error:', e);
            return appTab.summary;
        }*/

        const appTab = preferenceService.getAppTab();
        const readTabTime = appTab.readTabTime;

        const opWalletAppSummaryResponse: AppSummary = {
            apps: [
                {
                    desc: 'Easily and smoothly create your inscriptions.',
                    id: 1,
                    logo: 'https://static.unisat.io/res/images/app-fractal-inscribe.png',
                    new: false,
                    tag: 'Inscription Service',
                    tagColor: 'rgba(34,249,128,0.6)',
                    title: 'Fractal Inscribe',
                    url: 'https://fractal-testnet.unisat.io/inscribe',
                    time: 0, // Adding required field
                    readtime: undefined
                },
                {
                    desc: 'Trade your Ordinals and Runes on the Fractal Marketplace, including brc-20 and runes assets.',
                    id: 3,
                    logo: 'https://static.unisat.io/res/images/app-fractal-market.png',
                    new: false,
                    tag: 'Marketplace',
                    tagColor: 'rgba(249,192,34,0.8)',
                    title: 'Fractal Marketplace',
                    url: 'https://fractal-testnet.unisat.io/market',
                    time: 0, // Adding required field
                    readtime: undefined
                },
                {
                    desc: 'Seamless asset swapping and management across chains on Fractal',
                    id: 4,
                    logo: 'https://static.unisat.io/res/images/app-fractal-swap.png',
                    new: false,
                    tag: 'Marketplace',
                    tagColor: 'rgba(249,192,34,0.8)',
                    title: 'Bridge & PizzaSwap',
                    url: 'https://fractal-testnet.unisat.io/apps',
                    time: 0, // Adding required field
                    readtime: undefined
                }
            ],
            readTabTime: 1
        };

        opWalletAppSummaryResponse.readTabTime = readTabTime;

        await preferenceService.setAppSummary(opWalletAppSummaryResponse);

        return opWalletAppSummaryResponse;
    };

    public readTab = async (): Promise<void> => {
        return await preferenceService.setReadTabTime(Date.now());
    };

    public readApp = async (appid: number): Promise<void> => {
        return await preferenceService.setReadAppTime(appid, Date.now());
    };

    /**
     * Fetch UTXOs for a given address.
     */
    public getAddressUtxo = async (address: string): Promise<UTXO[]> => {
        return await openapiService.getBTCUtxos(address);
    };

    public setRecentConnectedSites = (sites: ConnectedSite[]): void => {
        permissionService.setRecentConnectedSites(sites);
    };

    public getRecentConnectedSites = (): ConnectedSite[] => {
        return permissionService.getRecentConnectedSites();
    };

    /**
     * Get the connected site for a specific tab ID, or return a stub if not recognized.
     */
    public getCurrentSite = (tabId: number): ConnectedSite | null => {
        const { origin = '', name = '', icon = '' } = sessionService.getSession(tabId) || {};
        if (!origin) {
            return null;
        }
        const site = permissionService.getSite(origin);
        if (site) {
            return site;
        }
        return {
            origin,
            name,
            icon,
            chain: CHAINS_ENUM.BTC,
            isConnected: false,
            isSigned: false,
            isTop: false
        };
    };

    public getCurrentConnectedSite = (tabId: number): ConnectedSite | undefined => {
        const { origin } = sessionService.getSession(tabId) || {};
        if (!origin) {
            return undefined;
        }
        return permissionService.getWithoutUpdate(origin);
    };

    /**
     * Connect or update a site in the permissionService, and broadcast network info if newly connected.
     */
    public setSite = (data: ConnectedSite): void => {
        permissionService.setSite(data);
        if (data.isConnected) {
            const network = this.getLegacyNetworkName();
            const chainType = this.getChainType();
            sessionService.broadcastEvent(SessionEvent.networkChanged, { network, chainType }, data.origin);
        }
    };

    public updateConnectSite = (origin: string, data: ConnectedSite): void => {
        permissionService.updateConnectSite(origin, data);
        const network = this.getLegacyNetworkName();
        const chainType = this.getChainType();
        sessionService.broadcastEvent(SessionEvent.networkChanged, { network, chainType }, data.origin);
    };

    public removeAllRecentConnectedSites = (): void => {
        const sites = permissionService.getRecentConnectedSites().filter((item) => !item.isTop);
        sites.forEach((item) => {
            this.removeConnectedSite(item.origin);
        });
    };

    public removeConnectedSite = (origin: string): void => {
        sessionService.broadcastEvent(SessionEvent.accountsChanged, [], origin);
        permissionService.removeConnectedSite(origin);
    };

    /**
     * Set a custom name for a keyring.
     */
    public setKeyringAlianName = (keyring: WalletKeyring, name: string): WalletKeyring => {
        preferenceService.setKeyringAlianName(keyring.key, name);
        keyring.alianName = name;
        return keyring;
    };

    /**
     * Set a custom alias name for a single account.
     */
    public setAccountAlianName = (account: Account, name: string): Account => {
        preferenceService.setAccountAlianName(account.key, name);
        account.alianName = name;
        return account;
    };

    /**
     * Add a flag to an account's address.
     */
    public addAddressFlag = async (account: Account, flag: AddressFlagType): Promise<Account> => {
        account.flag = await preferenceService.addAddressFlag(account.address, flag);
        openapiService.setClientAddress(account.address, account.flag);
        return account;
    };

    /**
     * Remove a flag from an account's address.
     */
    public removeAddressFlag = async (account: Account, flag: AddressFlagType): Promise<Account> => {
        account.flag = await preferenceService.removeAddressFlag(account.address, flag);
        openapiService.setClientAddress(account.address, account.flag);
        return account;
    };

    public getFeeSummary = async (): Promise<FeeSummary> => {
        return openapiService.getFeeSummary();
    };

    public getBtcPrice = async (): Promise<number> => {
        return openapiService.getBtcPrice();
    };

    /**
     * Decode a PSBT from hex, returning an object describing inputs, outputs, fee, etc.
     */
    public decodePsbt(psbtHex: string): DecodedPsbt {
        const networkType = this.getNetworkType();
        const network = getBitcoinLibJSNetwork(networkType);

        const psbt = Psbt.fromHex(psbtHex, { network });

        const inputs = psbt.txInputs.map((input, index) => {
            const inputData = psbt.data.inputs[index];
            let address = 'unknown';

            if (inputData.witnessUtxo?.script) {
                try {
                    address = bitcoinAddress.fromOutputScript(inputData.witnessUtxo.script, network);
                } catch {
                    address = 'unknown';
                }
            }

            return {
                txid: Buffer.from(input.hash).reverse().toString('hex'),
                vout: input.index,
                address,
                value: inputData.witnessUtxo?.value || 0,
                sighashType: inputData.sighashType
            };
        });

        const outputs = psbt.txOutputs.map((output) => ({
            address: output.address || 'unknown',
            value: output.value
        }));

        const totalInputValue = inputs.reduce((sum, inp) => sum + inp.value, 0);
        const totalOutputValue = outputs.reduce((sum, out) => sum + out.value, 0);

        const fee = totalInputValue - totalOutputValue;
        const transactionSize = psbt.toBuffer().length;
        const feeRate = transactionSize > 0 ? fee / transactionSize : 0;

        const rbfEnabled = psbt.txInputs.some((inp) => inp.sequence && inp.sequence < 0xfffffffe);

        // Arbitrary recommended fee rate for demonstration
        const recommendedFeeRate = 1;
        const shouldWarnFeeRate = feeRate < recommendedFeeRate;

        return {
            risks: [],
            inputs,
            outputs,
            fee,
            feeRate,
            transactionSize,
            rbfEnabled,
            recommendedFeeRate,
            shouldWarnFeeRate
        };
    }

    /**
     * Create a payment URL from the openapi service.
     */
    public createPaymentUrl = (address: string, channel: string): Promise<string> => {
        return openapiService.createPaymentUrl(address, channel);
    };

    public getWalletConfig = (): Promise<WalletConfig> => {
        return openapiService.getWalletConfig();
    };

    public getSkippedVersion = (): string | null => {
        return preferenceService.getSkippedVersion();
    };

    public setSkippedVersion = (version: string): void => {
        preferenceService.setSkippedVersion(version);
    };

    public checkWebsite = (website: string): Promise<{ isScammer: boolean; warning: string }> => {
        return openapiService.checkWebsite(website);
    };

    /**
     * Return summary info for an address (balance, inscriptions, etc).
     * @throws WalletControllerError
     */
    public getAddressSummary = async (address: string): Promise<AddressSummary> => {
        try {
            return await openapiService.getAddressSummary(address);
        } catch (err) {
            throw new WalletControllerError(`Failed to get address summary: ${String(err)}`, { address });
        }
    };

    public getShowSafeNotice = (): boolean => {
        return preferenceService.getShowSafeNotice();
    };

    public setShowSafeNotice = (show: boolean): void => {
        preferenceService.setShowSafeNotice(show);
    };

    public getVersionDetail = (version: string): Promise<VersionDetail> => {
        return openapiService.getVersionDetail(version);
    };

    /**
     * Check whether a method exists on the current keyring (Keystone).
     * @throws WalletControllerError
     */
    public checkKeyringMethod = async (method: string): Promise<{ account: Account; keyring: Keyring }> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const keyring = keyringService.getKeyringForAccount(account.pubkey);
        if (!keyring) {
            throw new WalletControllerError('Keyring does not exist for current account', { account });
        }

        // @ts-expect-error
        if (!keyring[method]) {
            throw new WalletControllerError(`Keyring does not have "${method}" method`, { method });
        }

        return { account, keyring };
    };

    /**
     * Create a UR from a psbt that can be signed by e.g. Keystone device.
     * @throws WalletControllerError
     */
    public genSignPsbtUr = async (psbtHex: string): Promise<{ type: string; cbor: string }> => {
        const { keyring } = await this.checkKeyringMethod('genSignPsbtUr');
        try {
            return await (keyring as KeystoneKeyring).genSignPsbtUr(psbtHex);
        } catch (err) {
            throw new WalletControllerError(`Failed to generate sign PSBT UR: ${String(err)}`, { psbtHex });
        }
    };

    /**
     * Parse a signPsbt UR and optionally finalize the PSBT.
     * @throws WalletControllerError
     */
    public parseSignPsbtUr = async (
        type: string,
        cbor: string,
        isFinalize = true
    ): Promise<{ psbtHex: string; rawtx?: string }> => {
        const { keyring } = await this.checkKeyringMethod('parseSignPsbtUr');
        try {
            const psbtHex = await (keyring as KeystoneKeyring).parseSignPsbtUr(type, cbor);
            const psbt = Psbt.fromHex(psbtHex);
            if (isFinalize) {
                psbt.finalizeAllInputs();
            }
            return {
                psbtHex: psbt.toHex(),
                rawtx: isFinalize ? psbt.extractTransaction().toHex() : undefined
            };
        } catch (err) {
            throw new WalletControllerError(`Failed to parse sign PSBT UR: ${String(err)}`, {
                type,
                cbor,
                isFinalize
            });
        }
    };

    /**
     * Create a UR for message signing, possibly with BIP322-simple logic.
     * @throws WalletControllerError
     */
    public genSignMsgUr = async (text: string, msgType?: string): Promise<string | { type: string; cbor: string }> => {
        if (msgType === 'bip322-simple') {
            const account = await this.getCurrentAccount();
            if (!account) throw new WalletControllerError('No current account');
            try {
                const psbt = genPsbtOfBIP322Simple({
                    message: text,
                    address: account.address,
                    networkType: this.getNetworkType()
                });
                const toSignInputs = await this.formatOptionsToSignInputs(psbt);
                await this.signPsbt(psbt, toSignInputs, false);
                return await this.genSignPsbtUr(psbt.toHex());
            } catch (err) {
                throw new WalletControllerError(`Failed bip322-simple UR generation: ${String(err)}`, {
                    text,
                    msgType
                });
            }
        }
        const { account, keyring } = await this.checkKeyringMethod('genSignMsgUr');
        try {
            return await (keyring as KeystoneKeyring).genSignMsgUr(account.pubkey, text);
        } catch (err) {
            throw new WalletControllerError(`Failed to generate sign message UR: ${String(err)}`, {
                text,
                msgType
            });
        }
    };

    /**
     * Parse a signMsg UR. If bip322-simple, finalize PSBT and extract signature.
     * @throws WalletControllerError
     */
    public parseSignMsgUr = async (type: string, cbor: string, msgType: string): Promise<{ signature: string }> => {
        if (msgType === 'bip322-simple') {
            try {
                const res = await this.parseSignPsbtUr(type, cbor, false);
                const psbt = Psbt.fromHex(res.psbtHex);
                psbt.finalizeAllInputs();
                return {
                    signature: getSignatureFromPsbtOfBIP322Simple(psbt)
                };
            } catch (err) {
                throw new WalletControllerError(`Failed bip322-simple UR parsing: ${String(err)}`, {
                    type,
                    cbor
                });
            }
        }

        const { keyring } = await this.checkKeyringMethod('parseSignMsgUr');
        try {
            const sig = await (keyring as KeystoneKeyring).parseSignMsgUr(type, cbor);
            sig.signature = Buffer.from(sig.signature, 'hex').toString('base64');
            return sig;
        } catch (err) {
            throw new WalletControllerError(`Failed to parse sign message UR: ${String(err)}`, {
                type,
                cbor,
                msgType
            });
        }
    };

    public getAutoLockTimeId = (): number => {
        return preferenceService.getAutoLockTimeId();
    };

    public setAutoLockTimeId = (timeId: number): void => {
        preferenceService.setAutoLockTimeId(timeId);
        this._resetTimeout();
    };

    public setLastActiveTime = (): void => {
        this._resetTimeout();
    };

    /**
     * Reset the lock timer. Will re-lock the wallet after the configured period of inactivity.
     */
    public _resetTimeout = (): void => {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        const timeId = preferenceService.getAutoLockTimeId();
        const timeConfig = AUTO_LOCKTIMES[timeId] || AUTO_LOCKTIMES[DEFAULT_LOCKTIME_ID];
        this.timer = setTimeout(async () => {
            try {
                await this.lockWallet();
            } catch (err) {
                console.error('Failed to auto-lock wallet:', err);
            }
        }, timeConfig.time) as unknown as number;
    };

    /**
     * @throws WalletControllerError
     */
    private getOpNetBalance = async (address: string, pubKey?: string): Promise<BitcoinBalance> => {
        let csv75Address = '';
        let csv1Address = '';

        if (pubKey) {
            const addressInst = Address.fromString(pubKey);

            csv75Address = addressInst.toCSV(75, Web3API.network).address;
            csv1Address = addressInst.toCSV(1, Web3API.network).address;
        }

        try {
            if (!csv75Address || !csv1Address) {
                const [allUTXOs, unspentUTXOs] = await Promise.all([
                    Web3API.getAllUTXOsForAddresses([address]),
                    Web3API.getUnspentUTXOsForAddresses([address])
                ]);

                const totalAll = allUTXOs.reduce((sum, u) => sum + u.value, 0n);
                const totalUnspent = unspentUTXOs.reduce((sum, u) => sum + u.value, 0n);

                const totalAmount = bigIntToDecimal(totalAll, 8);
                const confirmAmount = bigIntToDecimal(totalUnspent, 8);
                const pendingAmount = bigIntToDecimal(totalAll - totalUnspent, 8);

                return {
                    btc_total_amount: totalAmount,
                    btc_confirm_amount: confirmAmount,
                    btc_pending_amount: pendingAmount,

                    usd_value: '0.00'
                };
            } else {
                const [allUTXOs, unspentUTXOs, csv75Data, csv1Data] = await Promise.all([
                    Web3API.getAllUTXOsForAddresses([address]),
                    Web3API.getUnspentUTXOsForAddresses([address]),
                    Web3API.getTotalLockedAndUnlockedUTXOs(csv75Address, 'csv75'),
                    Web3API.getTotalLockedAndUnlockedUTXOs(csv1Address, 'csv1')
                ]);

                const totalAll = allUTXOs.reduce((sum, u) => sum + u.value, 0n);
                const totalUnspent = unspentUTXOs.reduce((sum, u) => sum + u.value, 0n);

                const totalAmount = bigIntToDecimal(totalAll, 8);
                const confirmAmount = bigIntToDecimal(totalUnspent, 8);
                const pendingAmount = bigIntToDecimal(totalAll - totalUnspent, 8);

                const totalCSV75 = csv75Data.utxos.reduce((sum, u) => sum + u.value, 0n);
                const csv75Total = bigIntToDecimal(totalCSV75, 8);

                const totalCSV1 = csv1Data.utxos.reduce((sum, u) => sum + u.value, 0n);
                const csv1Total = bigIntToDecimal(totalCSV1, 8);

                const csv75Unlocked = bigIntToDecimal(
                    csv75Data.unlockedUTXOs.reduce((sum, u) => sum + u.value, 0n),
                    8
                );
                const csv75Locked = Number(csv75Total) - Number(csv75Unlocked);

                const csv1Unlocked = bigIntToDecimal(
                    csv1Data.unlockedUTXOs.reduce((sum, u) => sum + u.value, 0n),
                    8
                );
                const csv1Locked = Number(csv1Total) - Number(csv1Unlocked);

                return {
                    btc_total_amount: totalAmount,
                    btc_confirm_amount: confirmAmount,
                    btc_pending_amount: pendingAmount,

                    csv75_total_amount: csv75Total,
                    csv75_unlocked_amount: csv75Unlocked,
                    csv75_locked_amount: csv75Locked.toString(),

                    csv1_total_amount: csv1Total,
                    csv1_unlocked_amount: csv1Unlocked,
                    csv1_locked_amount: csv1Locked.toString(),

                    usd_value: '0.00'
                };
            }
        } catch (err) {
            throw new WalletControllerError(`Failed to get OPNET balance: ${String(err)}`, { address });
        }
    };

    private signInteractionInternal = async (
        account: Account,
        wifWallet: { hex: string; wif: string },
        interactionParameters: InteractionParametersWithoutSigner,
        requiredMinimum = 0
    ): Promise<{ response: InteractionResponse; utxos: UTXOs }> => {
        const wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);
        const challenge = await Web3API.provider.getChallenge();

        const utxos: UTXOs = interactionParameters.utxos.map((u) => {
            let nonWitnessUtxo: Buffer | undefined;

            if (Buffer.isBuffer(u.nonWitnessUtxo)) {
                nonWitnessUtxo = u.nonWitnessUtxo;
            } else if (typeof u.nonWitnessUtxo === 'string') {
                try {
                    nonWitnessUtxo = Buffer.from(u.nonWitnessUtxo, 'base64');
                } catch {
                    nonWitnessUtxo = undefined;
                }
            } else if (u.nonWitnessUtxo && typeof u.nonWitnessUtxo === 'object') {
                try {
                    const raw = u.nonWitnessUtxo as Record<string, number>;
                    const len = Math.max(...Object.keys(raw).map((k) => +k)) + 1;
                    const buf = Buffer.alloc(len);
                    for (const [k, v] of Object.entries(raw)) buf[+k] = v;
                    nonWitnessUtxo = buf;
                } catch {
                    nonWitnessUtxo = undefined;
                }
            }

            return {
                ...u,
                value: typeof u.value === 'bigint' ? u.value : BigInt(u.value as unknown as string),
                nonWitnessUtxo
            };
        });

        if (requiredMinimum !== 0) {
            const currentTotal = utxos.reduce<bigint>((s, u) => s + u.value, 0n);

            if (currentTotal < BigInt(requiredMinimum)) {
                const stillNeeded = BigInt(requiredMinimum) - currentTotal;

                const fetched: UTXOs = await Web3API.getUnspentUTXOsForAddresses([account.address], stillNeeded);
                const alreadyUsed = new Set<string>(utxos.map((u) => `${u.transactionId}:${u.outputIndex}`));

                fetched
                    .sort((a, b) => Number(b.value - a.value))
                    .forEach((f) => {
                        if (alreadyUsed.has(`${f.transactionId}:${f.outputIndex}`)) return;

                        utxos.push(f);

                        if (utxos.reduce<bigint>((s: bigint, u) => s + u.value, 0n) >= BigInt(requiredMinimum)) return;
                    });
            }
        }

        const optionalInputs =
            interactionParameters.optionalInputs?.map((u) => {
                let nonWitnessUtxo: Buffer | undefined;

                if (Buffer.isBuffer(u.nonWitnessUtxo)) {
                    nonWitnessUtxo = u.nonWitnessUtxo;
                } else if (typeof u.nonWitnessUtxo === 'string') {
                    try {
                        nonWitnessUtxo = Buffer.from(u.nonWitnessUtxo, 'base64');
                    } catch {
                        nonWitnessUtxo = undefined;
                    }
                } else if (u.nonWitnessUtxo && typeof u.nonWitnessUtxo === 'object') {
                    try {
                        const raw = u.nonWitnessUtxo as Record<string, number>;
                        const len = Math.max(...Object.keys(raw).map((k) => +k)) + 1;
                        const buf = Buffer.alloc(len);
                        for (const [k, v] of Object.entries(raw)) buf[+k] = v;
                        nonWitnessUtxo = buf;
                    } catch {
                        nonWitnessUtxo = undefined;
                    }
                }

                return {
                    ...u,
                    value: typeof u.value === 'bigint' ? u.value : BigInt(u.value as unknown as string),
                    nonWitnessUtxo
                };
            }) || [];

        const submit: IInteractionParameters = {
            from: interactionParameters.from,
            to: interactionParameters.to,
            challenge,
            utxos,
            signer: wallet.keypair,
            network: Web3API.network,
            feeRate: interactionParameters.feeRate,
            priorityFee: BigInt((interactionParameters.priorityFee as unknown as string) || 0n),
            gasSatFee: BigInt((interactionParameters.gasSatFee as unknown as string) || 330n),
            calldata: Buffer.from(interactionParameters.calldata as unknown as string, 'hex'),
            optionalInputs,
            optionalOutputs: interactionParameters.optionalOutputs || [],
            contract: interactionParameters.contract,
            note: interactionParameters.note
        };

        const response = await Web3API.transactionFactory.signInteraction(submit);
        return { response, utxos };
    };

    /**
     * Retrieve a keyring by type if it exists; else throw.
     * @throws WalletControllerError if no matching keyring found
     */
    private _getKeyringByType = (type: string): Keyring => {
        const found = keyringService.getKeyringsByType(type)[0];
        if (found) return found;
        throw new WalletControllerError(`No ${type} keyring found`);
    };

    /**
     * Internal utility to produce a default alias for an account.
     */
    private _generateAlianName = (type: string, index: number): string => {
        return `${BRAND_ALIAN_TYPE_TEXT[type]} ${index}`;
    };

    /**
     * Private method to generate cache key
     */
    private _generateCacheKey = (address: string, pubKey?: string): string => {
        const chainType = this.getChainType();
        return `${chainType}:${address}:${pubKey || 'no-pubkey'}`;
    };

    /**
     * Private method to clear balance cache and stop cleanup timer
     */
    private _clearBalanceCache = (): void => {
        this.balanceCache.clear();

        if (this.cacheCleanupTimer) {
            clearInterval(this.cacheCleanupTimer);
            this.cacheCleanupTimer = null;
        }
    };

    /**
     * Start periodic cache cleanup to remove expired entries
     */
    private _startCacheCleanup = (): void => {
        // Clear any existing timer
        if (this.cacheCleanupTimer) {
            clearInterval(this.cacheCleanupTimer);
        }

        // Run cleanup every 30 seconds
        this.cacheCleanupTimer = setInterval(() => {
            this._cleanupExpiredCache();
        }, 30000);
    };

    /**
     * Remove expired entries from cache
     */
    private _cleanupExpiredCache = (): void => {
        const now = Date.now();
        const expiredKeys: string[] = [];

        this.balanceCache.forEach((entry, key) => {
            // Remove entries older than twice the cache duration
            if (now - entry.timestamp > this.CACHE_DURATION * 2) {
                expiredKeys.push(key);
            }
        });

        expiredKeys.forEach((key) => {
            this.balanceCache.delete(key);
        });

        if (expiredKeys.length > 0) {
            console.log(`Cleaned up ${expiredKeys.length} expired balance cache entries`);
        }
    };
}

// Export a single instance.
export default new WalletController();
