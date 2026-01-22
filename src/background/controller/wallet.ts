import { BitcoinUtils, BroadcastedTransaction, getContract, UTXOs } from 'opnet';

import { BTC_NAME_RESOLVER_ABI } from '@/shared/web3/abi/BTC_NAME_RESOLVER_ABI';
import { IBtcNameResolverContract } from '@/shared/web3/interfaces/IBtcNameResolverContract';

import addressRotationService from '@/background/service/addressRotation';
import contactBookService from '@/background/service/contactBook';
import duplicationBackupService from '@/background/service/duplicationBackup';
import duplicationDetectionService from '@/background/service/duplicationDetection';
import keyringService, {
    DisplayedKeyring,
    EmptyKeyring,
    HdKeyringSerializedOptions,
    Keyring,
    SavedVault,
    SimpleKeyringSerializedOptions
} from '@/background/service/keyring';
import notificationService, {
    ParsedTransaction,
    ParsedTxOutput,
    PreSignedTransactionData,
    SerializedPreSignedInteractionData,
    serializePreSignedInteractionData
} from '@/background/service/notification';
import opnetApi from '@/background/service/opnetApi';
import opnetProtocolService from '@/background/service/opnetProtocol';
import permissionService from '@/background/service/permission';
import preferenceService, { ExperienceMode, WalletSaveList } from '@/background/service/preference';
import sessionService from '@/background/service/session';
import transactionHistoryService from '@/background/service/transactionHistory';
import transactionStatusPoller from '@/background/service/transactionStatusPoller';
import { BroadcastTransactionOptions } from '@/content-script/pageProvider/Web3Provider.js';
import { UTXO_CONFIG } from '@/shared/config';
import {
    AddressFlagType,
    AUTO_LOCKTIMES,
    BRAND_ALIAN_TYPE_TEXT,
    ChainId,
    CHAINS_ENUM,
    CHAINS_MAP,
    ChainType,
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
    AddressUserToSignInput,
    AppSummary,
    BitcoinBalance,
    DecodedPsbt,
    NetworkType,
    networkTypeToOPNet,
    PublicKeyUserToSignInput,
    QuantumKeyStatus,
    SignPsbtOptions,
    ToSignInput,
    TxHistoryItem,
    UTXO,
    VersionDetail,
    WalletConfig,
    WalletKeyring
} from '@/shared/types';
import {
    ConflictResolutionChoice,
    DuplicationDetectionResult,
    DuplicationResolution,
    DuplicationState,
    OnChainLinkageInfo
} from '@/shared/types/Duplication';
import {
    AddressRotationState,
    ConsolidationParams,
    ConsolidationResult,
    RotatedAddress,
    RotationModeSummary,
    RotationModeUpdateSettings
} from '@/shared/types/AddressRotation';
import { getChainInfo } from '@/shared/utils';
import Web3API, { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import {
    Address,
    AddressTypes,
    CancelledTransaction,
    createAddressRotation,
    DeploymentResult,
    EcKeyPair,
    ICancelTransactionParameters,
    ICancelTransactionParametersWithoutSigner,
    IDeploymentParameters,
    IDeploymentParametersWithoutSigner,
    IFundingTransactionParameters,
    IInteractionParameters,
    InteractionParametersWithoutSigner,
    InteractionResponse,
    MessageSigner,
    MLDSASecurityLevel,
    QuantumBIP32Factory,
    RawChallenge,
    UTXO as TransactionUTXO,
    Wallet
} from '@btc-vision/transaction';
import {
    HdKeyring,
    publicKeyToAddressWithNetworkType,
    scriptPubKeyToAddress,
    signBip322MessageWithNetworkType,
    SimpleKeyring,
    toNetwork
} from '@btc-vision/wallet-sdk';

import {
    GatewayConfig,
    GatewayHealth,
    OpnetBrowserSettings,
    OpnetCacheSettings,
    OpnetCacheStats
} from '@/shared/types/OpnetProtocol';
import { RecordTransactionInput, TransactionOrigin, TransactionType } from '@/shared/types/TransactionHistory';
import { customNetworksManager } from '@/shared/utils/CustomNetworksManager';
import {
    address as bitcoinAddress,
    payments,
    Psbt,
    PsbtOutputExtended,
    PsbtOutputExtendedAddress,
    PsbtOutputExtendedScript,
    tapTweakHash,
    toXOnly,
    Transaction
} from '@btc-vision/bitcoin';
import { Buffer } from 'buffer';
import { ECPairInterface } from 'ecpair';
import { ContactBookItem, ContactBookStore } from '../service/contactBook';
import { ConnectedSite } from '../service/permission';

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

/**
 * Parse a raw transaction hex into structured data for UI display.
 * Calculates real mining fee from inputs - outputs.
 */
function parseTransactionForPreview(
    txHex: string,
    inputUtxos: { txid: string; vout: number; value: bigint }[],
    network: ReturnType<typeof getBitcoinLibJSNetwork>
): ParsedTransaction {
    const tx = Transaction.fromHex(txHex);
    const txid = tx.getId();
    const size = tx.byteLength();
    const vsize = tx.virtualSize();

    // Create a map for faster UTXO lookup (normalized lowercase for case-insensitive matching)
    const utxoMap = new Map<string, bigint>();
    for (const utxo of inputUtxos) {
        const key = `${utxo.txid.toLowerCase()}:${utxo.vout}`;
        utxoMap.set(key, utxo.value);
    }

    // Map inputs to their values from UTXOs
    const inputs = tx.ins.map((input) => {
        const inputTxid = Buffer.from(input.hash).reverse().toString('hex').toLowerCase();
        const vout = input.index;
        const key = `${inputTxid}:${vout}`;
        const value = utxoMap.get(key) ?? 0n;

        return {
            txid: inputTxid,
            vout,
            value
        };
    });

    // Parse outputs
    const outputs: ParsedTxOutput[] = tx.outs.map((output) => {
        const script = output.script.toString('hex');
        const isOpReturn = output.script[0] === 0x6a; // OP_RETURN

        let address: string | null = null;
        if (!isOpReturn) {
            try {
                address = bitcoinAddress.fromOutputScript(output.script, network);
            } catch {
                // Script-only output (e.g., taproot)
                address = null;
            }
        }

        return {
            address,
            value: BigInt(output.value),
            script,
            isOpReturn
        };
    });

    const totalInputValue = inputs.reduce((sum, i) => sum + i.value, 0n);
    const totalOutputValue = outputs.reduce((sum, o) => sum + o.value, 0n);
    const minerFee = totalInputValue - totalOutputValue;

    return {
        txid,
        hex: txHex,
        size,
        vsize,
        inputs,
        outputs,
        totalInputValue,
        totalOutputValue,
        minerFee
    };
}

export class WalletController {
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
    private readonly CACHE_DURATION = 8000;
    private cacheCleanupTimer: NodeJS.Timeout | null = null;

    // Keyring cache - invalidated when keyrings are mutated
    private walletKeyringsCache: WalletKeyring[] | null = null;
    private keyringsCacheNetworkType: NetworkType | null = null;

    /**
     * Invalidate the keyring cache. Call this after any keyring mutation.
     */
    public invalidateKeyringCache = (): void => {
        this.walletKeyringsCache = null;
        this.keyringsCacheNetworkType = null;
    };

    /**
     * Update a keyring's alias name in the cache without full invalidation.
     */
    private updateKeyringNameInCache = (keyringKey: string, newName: string): void => {
        if (!this.walletKeyringsCache) return;
        const keyring = this.walletKeyringsCache.find((k) => k.key === keyringKey);
        if (keyring) {
            keyring.alianName = newName;
        }
    };

    /**
     * Update an account's alias name in the cache without full invalidation.
     */
    private updateAccountNameInCache = (accountKey: string, newName: string): void => {
        if (!this.walletKeyringsCache) return;
        for (const keyring of this.walletKeyringsCache) {
            const account = keyring.accounts.find((a) => a.key === accountKey);
            if (account) {
                account.alianName = newName;
                break;
            }
        }
    };

    /**
     * Update an account's flag in the cache without full invalidation.
     */
    private updateAccountFlagInCache = (address: string, flag: number): void => {
        if (!this.walletKeyringsCache) return;
        for (const keyring of this.walletKeyringsCache) {
            const account = keyring.accounts.find((a) => a.address === address);
            if (account) {
                account.flag = flag;
                break;
            }
        }
    };

    /**
     * Unlock the keyring vault with a password.
     * @throws WalletControllerError if unlocking fails
     */
    public boot = async (password: string): Promise<void> => {
        try {
            await keyringService.boot(password);

            // Invalidate cache since keyrings are loaded fresh from vault
            this.invalidateKeyringCache();
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
     * Returns true if password is correct, false otherwise.
     */
    public verifyPassword = async (password: string): Promise<boolean> => {
        try {
            await keyringService.verifyPassword(password);
            return true;
        } catch {
            return false;
        }
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
    public initAlianNames = (): void => {
        try {
            preferenceService.changeInitAlianNameStatus();
            const contacts = this.listContact();
            const keyrings = keyringService.getAllDisplayedKeyrings();

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

            // Invalidate cache since keyrings are loaded fresh
            this.invalidateKeyringCache();

            sessionService.broadcastEvent(SessionEvent.unlock);

            if (!alianNameInited && alianNames.length === 0) {
                this.initAlianNames();
            }
            this._resetTimeout();

            // Start cache cleanup timer
            this._startCacheCleanup();

            // Start transaction status polling
            transactionStatusPoller.start();
        } catch (err) {
            throw new WalletControllerError(`Unlock failed: ${String(err)}`, {
                passwordProvided: !!password
            });
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
    public lockWallet = (): void => {
        try {
            keyringService.setLocked();
            sessionService.broadcastEvent(SessionEvent.accountsChanged, []);
            sessionService.broadcastEvent(SessionEvent.lock);
            eventBus.emit(EVENTS.broadcastToUI, {
                method: 'lock',
                params: {}
            });

            // Clear caches and stop cleanup timer
            this._clearBalanceCache();
            this.invalidateKeyringCache();

            // Stop transaction status polling
            transactionStatusPoller.stop();
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
    public getAddressBalance = async (address: string, pubKey: string): Promise<BitcoinBalance> => {
        const cacheKey = this._generateCacheKey(address, pubKey);
        const now = Date.now();
        const cached = this.balanceCache.get(cacheKey);

        // Return valid cached data
        if (cached && now - cached.timestamp < this.CACHE_DURATION && !cached.fetchPromise) {
            return cached.balance;
        }

        // Wait for ongoing fetch if exists
        if (cached?.fetchPromise) {
            try {
                return await cached.fetchPromise;
            } catch (err) {
                console.warn('Ongoing fetch failed, creating new fetch:', err);
            }
        }

        // Create new fetch with error handling
        const fetchPromise = this.fetchBalanceWithRetry(address, pubKey);

        // Store promise immediately
        this.balanceCache.set(cacheKey, {
            balance: cached?.balance || this.getEmptyBalance(),
            timestamp: now,
            fetchPromise
        });

        try {
            const balance = await fetchPromise;

            // Update cache with successful result
            this.balanceCache.set(cacheKey, {
                balance,
                timestamp: now,
                fetchPromise: undefined
            });

            return balance;
        } catch (err) {
            // Keep stale data on error if available
            if (cached?.balance && cached.balance.btc_total_amount !== '0') {
                this.balanceCache.set(cacheKey, {
                    balance: cached.balance,
                    timestamp: now - (this.CACHE_DURATION - 5000), // Mark as almost expired
                    fetchPromise: undefined
                });
                return cached.balance;
            }

            // No stale data available
            this.balanceCache.delete(cacheKey);
            throw err;
        }
    };

    /*public getAddressBalance = async (address: string, pubKey?: string): Promise<BitcoinBalance> => {

        // Create a new fetch promise to prevent duplicate requests
        const fetchPromise = this.getOpNetBalance(address, pubKey).catch((err: unknown) => {
            // Remove failed fetch from cache
            //this.balanceCache.delete(cacheKey);
            throw new WalletControllerError(`Failed to get address balance: ${String(err)}`, { address });
        });


        const balance = await fetchPromise;


        return balance;
    };*/

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
                const addressBalance = await this.getAddressBalance(address, '');
                // Convert formatted string back to satoshis using expandToDecimals
                const totalSatoshis = BitcoinUtils.expandToDecimals(addressBalance.btc_total_amount, 8);

                const summary: AddressSummary = {
                    address: address,
                    totalSatoshis: Number(totalSatoshis),
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
     * Fetch address history (recent transactions).
     * @throws WalletControllerError
     */
    public getAddressHistory = (_params: {
        address: string;
        start: number;
        limit: number;
    }): AddressRecentHistory => {
        // TODO: Implement address history via OPNet indexer when available
        return {
            start: 0,
            total: 0,
            detail: []
        };
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

        // Invalidate cache since all keyrings are cleared
        this.invalidateKeyringCache();
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

        const privateKey = keyringService.exportAccount(pubkey);
        if (!privateKey) {
            throw new WalletControllerError('No private key found for the given pubkey');
        }

        const networkType = this.getNetworkType();
        const network = toNetwork(networkTypeToOPNet(networkType));

        const wif = EcKeyPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), network).toWIF();
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

        const privateKey = keyringService.exportAccount(pubkey);
        if (!privateKey) {
            throw new WalletControllerError('No private key found for the given pubkey');
        }

        const networkType = this.getNetworkType();
        const network = toNetwork(networkTypeToOPNet(networkType));

        const wif = EcKeyPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), network).toWIF();
        return {
            hex: privateKey,
            wif
        };
    };

    /**
     * Get the OPNet Wallet instance with quantum keys for the current account.
     * This is needed for OPNet transaction signing which requires both classical and quantum keys.
     * @throws WalletControllerError if keys cannot be retrieved
     */
    public getOPNetWallet = async (): Promise<[string, string, string]> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }

        const wifData = this.getInternalPrivateKey({
            pubkey: account.pubkey,
            type: account.type
        });

        if (!wifData) {
            throw new WalletControllerError('Could not retrieve private key');
        }

        // Get quantum private key from keyring
        const quantumPrivateKey = keyringService.exportQuantumAccount(account.pubkey);
        if (!quantumPrivateKey) {
            throw new WalletControllerError(
                'Could not retrieve quantum private key. Quantum migration may be required.'
            );
        }

        const privateKey = quantumPrivateKey.slice(0, quantumPrivateKey.length - 64);
        const chainCode = quantumPrivateKey.slice(quantumPrivateKey.length - 64);

        return [wifData.wif, privateKey, chainCode];

        /*return Wallet.fromWif(
            wifData.wif,
            privateKey,
            Web3API.network,
            MLDSASecurityLevel.LEVEL2,
            Buffer.from(chainCode, 'hex')
        );*/
    };

    /**
     * Get wallet address information without exposing private keys.
     * This is a safe method to call from the UI to get address information.
     * @returns Array of [mldsaHashPubKey, legacyPublicKey]
     * @throws WalletControllerError if keys cannot be retrieved
     */
    public getWalletAddress = async (): Promise<[string, string]> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }

        // Get quantum public key from keyring to calculate hash
        const quantumPublicKey = keyringService.getQuantumPublicKey(account.pubkey);
        if (!quantumPublicKey) {
            throw new WalletControllerError(
                'Could not retrieve quantum public key. Quantum migration may be required.'
            );
        }

        // Calculate SHA256 hash of the MLDSA public key
        const mldsaHashPubKey = Buffer.from(MessageSigner.sha256(Buffer.from(quantumPublicKey, 'hex'))).toString('hex');

        // Return [mldsaHashPubKey, legacyPublicKey]
        return [mldsaHashPubKey, account.pubkey];
    };

    /**
     * Get the MLDSA (quantum) public key for the current account.
     * @returns The MLDSA public key as a hex string
     * @throws WalletControllerError if keys cannot be retrieved
     */
    public getMLDSAPublicKey = async (): Promise<string> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const quantumPublicKey = keyringService.getQuantumPublicKey(account.pubkey);
        if (!quantumPublicKey)
            throw new WalletControllerError(
                'Could not retrieve quantum public key. Quantum migration may be required.'
            );

        return quantumPublicKey;
    };

    /**
     * Export a BIP39 mnemonic from a given keyring.
     * @throws WalletControllerError if the keyring lacks a mnemonic
     */
    public getMnemonics = async (
        password: string,
        keyring: WalletKeyring
    ): Promise<{
        mnemonic: string;
        addressType: AddressTypes;
        passphrase: string | undefined;
    }> => {
        const isValid = await this.verifyPassword(password);

        if (!isValid) {
            throw new WalletControllerError('Invalid password');
        }

        const originKeyring = keyringService.keyrings[keyring.index];
        const serialized = originKeyring.serialize();

        if (!('mnemonic' in serialized) || serialized.mnemonic === undefined || serialized.mnemonic === null) {
            throw new WalletControllerError('No mnemonic found in keyring');
        }

        const passphrase =
            serialized.passphrase !== undefined && serialized.passphrase !== null ? serialized.passphrase : undefined;

        // Get addressType from serialized data (for HD keyrings)
        const addressType =
            'addressType' in serialized && serialized.addressType !== undefined
                ? serialized.addressType
                : AddressTypes.P2WPKH;

        return {
            mnemonic: serialized.mnemonic,
            addressType,
            passphrase
        };
    };

    /**
     * Create a new keyring from a single private key (hex or WIF).
     * @throws WalletControllerError if import fails
     */
    public createKeyringWithPrivateKey = async (
        data: string,
        addressType: AddressTypes,
        quantumPrivateKey: string,
        alianName?: string
    ): Promise<void> => {
        if (!quantumPrivateKey) throw new Error('You must provide a quantum private key to import a private key.');

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());

        // Check if this private key is already imported by deriving the public key first
        let keypair: ReturnType<typeof EcKeyPair.fromWIF>;
        try {
            const cleanData = data.replace('0x', '');
            // Try to parse as WIF first, then as hex private key
            if (cleanData.length === 51 || cleanData.length === 52) {
                keypair = EcKeyPair.fromWIF(data, network);
            } else {
                keypair = EcKeyPair.fromPrivateKey(Buffer.from(cleanData, 'hex'), network);
            }
        } catch (e) {
            throw new WalletControllerError(`Invalid private key format: ${String(e)}`, { data, addressType });
        }

        const pubkey = keypair.publicKey.toString('hex');
        const derivedAddress = publicKeyToAddressWithNetworkType(
            pubkey,
            addressType,
            networkTypeToOPNet(this.getNetworkType())
        );

        // Check if this address already exists in any keyring
        const existingAccounts = await this.getAccounts();
        const duplicate = existingAccounts.find((account) => account.address === derivedAddress);
        if (duplicate) {
            throw new WalletControllerError(
                `This wallet has already been imported. Address: ${derivedAddress.slice(0, 10)}...${derivedAddress.slice(-6)}`,
                { address: derivedAddress }
            );
        }

        let originKeyring: Keyring | EmptyKeyring;
        try {
            originKeyring = await keyringService.importPrivateKey(data, addressType, network, quantumPrivateKey);
        } catch (e) {
            console.warn('Something went wrong while attempting to load keyring', e);
            throw new WalletControllerError(`Could not import private key: ${String(e)}`, {
                data,
                addressType
            });
        }

        // Invalidate cache since new keyring was added
        this.invalidateKeyringCache();

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
     * @param rotationModeEnabled - If true, enables address rotation (privacy) mode for this keyring (permanent choice)
     * @throws WalletControllerError
     */
    public createKeyringWithMnemonics = async (
        mnemonic: string,
        hdPath: string,
        passphrase: string,
        addressType: AddressTypes,
        accountCount: number,
        rotationModeEnabled = false
    ): Promise<void> => {
        try {
            const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
            const originKeyring = await keyringService.createKeyringWithMnemonics(
                mnemonic,
                hdPath,
                passphrase,
                addressType,
                accountCount,
                network,
                rotationModeEnabled
            );
            keyringService.removePreMnemonics();

            // Invalidate cache since new keyring was added
            this.invalidateKeyringCache();

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

            // If rotation mode is enabled, initialize the address rotation service
            if (rotationModeEnabled) {
                const keyringIndex = keyringService.keyrings.length - 1;
                const currentAccount = walletKeyring.accounts[0];
                if (currentAccount) {
                    await addressRotationService.enableRotationMode(
                        keyringIndex,
                        currentAccount.pubkey,
                        network
                    );
                }
            }

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
        addressType: AddressTypes,
        accountCount = 1
    ): Promise<WalletKeyring> => {
        const activeIndexes: number[] = [];
        for (let i = 0; i < accountCount; i++) {
            activeIndexes.push(i);
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        const originKeyring = keyringService.createTmpKeyring('HD Key Tree', {
            mnemonic,
            activeIndexes,
            passphrase,
            addressType,
            network
        });

        const displayedKeyring = keyringService.displayForKeyring(originKeyring, addressType, -1);
        return await this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
    };

    /**
     * Create a temporary keyring in memory with a single private key.
     */
    public createTmpKeyringWithPrivateKey = async (
        privateKey: string,
        addressType: AddressTypes,
        quantumPrivateKey?: string
    ): Promise<WalletKeyring> => {
        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        const originKeyring = keyringService.createTmpKeyring(KEYRING_TYPE.SimpleKeyring, {
            privateKey,
            quantumPrivateKey,
            network
        });

        const displayedKeyring = keyringService.displayForKeyring(originKeyring, addressType, -1);

        await preferenceService.setShowSafeNotice(true);
        return await this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
    };

    /**
     * Remove an entire keyring by index, then switch to another if it exists.
     * @throws WalletControllerError
     */
    public removeKeyring = async (keyring: WalletKeyring): Promise<WalletKeyring | undefined> => {
        try {
            await keyringService.removeKeyring(keyring.index);

            // Invalidate cache before fetching updated keyrings
            this.invalidateKeyringCache();

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

    // Note: Keystone hardware wallet support has been deprecated in wallet-sdk 2.0
    // createTmpKeyringWithKeystone and createKeyringWithKeystone methods removed

    public getKeyringByType = (type: string): Keyring | EmptyKeyring | undefined => {
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

            // Invalidate cache since new account was added
            this.invalidateKeyringCache();

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
        opnetApi.setClientAddress(keyring.accounts[accountIndex].address, flag);
    };

    /**
     * Change the active addressType for a keyring. This can refresh the derived addresses, etc.
     * @throws WalletControllerError
     */
    public changeAddressType = async (addressType: AddressTypes): Promise<void> => {
        try {
            const currentAccount = await this.getCurrentAccount();
            const currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
            await keyringService.changeAddressType(currentKeyringIndex, addressType);

            // Invalidate cache since address type changed
            this.invalidateKeyringCache();

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
     * Check if the current keyring has rotation mode (privacy mode) enabled.
     * This is a permanent setting chosen during wallet creation.
     */
    public isKeyringRotationMode = (): boolean => {
        const currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
        return keyringService.getRotationMode(currentKeyringIndex);
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
            const psbtNetwork = toNetwork(networkTypeToOPNet(networkType));

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
                    const address = scriptPubKeyToAddress(script, psbtNetwork);
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
        const psbtNetwork = toNetwork(networkTypeToOPNet(networkType));

        if (!toSignInputs) {
            // For backward compatibility
            toSignInputs = await this.formatOptionsToSignInputs(psbt);
        }

        // Attempt to fix missing tapInternalKey for P2TR inputs
        psbt.data.inputs.forEach((v) => {
            const isNotSigned = !(v.finalScriptSig ?? v.finalScriptWitness);
            const isP2TR = keyring.addressType === AddressTypes.P2TR;
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
     * ECDSA message signing for the current account.
     * The message is SHA256 hashed before signing.
     * @throws WalletControllerError
     */
    public signMessage = async (message: string | Buffer): Promise<string> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        // Convert message to Buffer and hash it
        const messageBuffer = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
        const messageHash = MessageSigner.sha256(messageBuffer);

        return keyringService.signData(account.pubkey, messageHash.toString('hex'), 'ecdsa');
    };

    /**
     * MLDSA (quantum) message signing using MessageSigner from @btc-vision/transaction.
     * @param message The message to sign (string or Buffer)
     * @returns Object containing signature, message, publicKey (all as hex strings), and securityLevel
     * @throws WalletControllerError
     */
    public signMLDSAMessage = async (
        message: string | Buffer
    ): Promise<{
        signature: string;
        message: string;
        publicKey: string;
        securityLevel: MLDSASecurityLevel;
    }> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const mldsaKeypair = keyringService.getQuantumKeypair(account.pubkey);
        if (!mldsaKeypair)
            throw new WalletControllerError('Could not retrieve quantum keypair. Quantum migration may be required.');

        const signedMessage = MessageSigner.signMLDSAMessage(mldsaKeypair, message);

        return {
            signature: Buffer.from(signedMessage.signature).toString('hex'),
            message: Buffer.from(signedMessage.message).toString('hex'),
            publicKey: Buffer.from(signedMessage.publicKey).toString('hex'),
            securityLevel: signedMessage.securityLevel
        };
    };

    /**
     * Verify an MLDSA (quantum) signature using MessageSigner from @btc-vision/transaction.
     * @param message The original message that was signed
     * @param signature The signature to verify (hex string)
     * @param publicKey The MLDSA public key (hex string)
     * @param securityLevel The MLDSA security level used for signing
     * @returns true if signature is valid, false otherwise
     */
    public verifyMLDSASignature = (
        message: string | Buffer,
        signature: string,
        publicKey: string,
        securityLevel: MLDSASecurityLevel
    ): boolean => {
        const networkType = this.getNetworkType();
        const network = toNetwork(networkTypeToOPNet(networkType));

        // Create a dummy chain code (32 bytes of zeros) for verification purposes
        // The chain code is not used for signature verification
        const chainCode = Buffer.alloc(32);
        const publicKeyBuffer = Buffer.from(publicKey, 'hex');
        const signatureBuffer = Buffer.from(signature, 'hex');

        const mldsaKeypair = QuantumBIP32Factory.fromPublicKey(publicKeyBuffer, chainCode, network, securityLevel);

        return MessageSigner.verifyMLDSASignature(mldsaKeypair, message, signatureBuffer);
    };

    /**
     * Sign and broadcast an Interaction (two transactions) on OPNet.
     * @returns Tuple of [fundingTx, interactionTx, nextUTXOs, preimage]
     * @throws WalletControllerError
     */
    public signAndBroadcastInteraction = async (
        interactionParameters: InteractionParametersWithoutSigner,
        origin: TransactionOrigin = { type: 'internal' }
    ): Promise<
        [BroadcastedTransaction, BroadcastedTransaction, import('@btc-vision/transaction').UTXO[], RawChallenge]
    > => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const wallet = await this.getWalletSigner();

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
                signed = await this.signInteractionInternal(account, wallet, interactionParameters, requiredMinimum);
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

            // Record transaction in history
            const calldata = interactionParameters.calldata
                ? Buffer.isBuffer(interactionParameters.calldata)
                    ? interactionParameters.calldata.toString('hex')
                    : typeof interactionParameters.calldata === 'string'
                      ? interactionParameters.calldata
                      : Buffer.from(interactionParameters.calldata as Uint8Array).toString('hex')
                : undefined;

            void this.recordTransaction(
                {
                    txid: interTx.result || '',
                    fundingTxid: fundingTx.result,
                    type: TransactionType.OPNET_INTERACTION,
                    from: account.address,
                    to: interactionParameters.to,
                    contractAddress: interactionParameters.to,
                    fee: Number(response.estimatedFees),
                    feeRate: interactionParameters.feeRate,
                    calldata
                },
                origin
            );

            return [fundingTx, interTx, response.nextUTXOs, response.challenge];
        } catch (err) {
            throw new WalletControllerError(`signAndBroadcastInteraction failed: ${String(err)}`, {
                interactionParameters
            });
        }
    };

    public cancelTransaction = async (
        params: ICancelTransactionParametersWithoutSigner
    ): Promise<CancelledTransaction> => {
        const wallet = await this.getWalletSigner();

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
            const cancelParameters: ICancelTransactionParameters = {
                ...params,
                utxos,
                signer: wallet.keypair,
                mldsaSigner: wallet.mldsaKeypair,
                network: Web3API.network,
                feeRate: Number(params.feeRate.toString()),
                compiledTargetScript: params.compiledTargetScript,
                optionalOutputs: params.optionalOutputs || [],
                optionalInputs: optionalInputs,
                note: params.note,
                linkMLDSAPublicKeyToAddress: true
            };

            return await Web3API.transactionFactory.createCancellableTransaction(cancelParameters);
        } catch (err) {
            throw new WalletControllerError(`Failed to cancel transaction: ${String(err)}`, { params });
        }
    };

    /**
     * Deploy a smart contract (OPNet).
     * @throws WalletControllerError
     */
    public deployContract = async (params: IDeploymentParametersWithoutSigner): Promise<DeploymentResult> => {
        const wallet = await this.getWalletSigner();

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
            const deployContractParameters: IDeploymentParameters = {
                ...params,
                utxos,
                challenge,
                signer: wallet.keypair,
                mldsaSigner: wallet.mldsaKeypair,
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
                note: params.note,
                linkMLDSAPublicKeyToAddress: true
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
        interactionParameters: InteractionParametersWithoutSigner,
        origin: TransactionOrigin = { type: 'internal' }
    ): Promise<InteractionResponse> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const wallet = await this.getWalletSigner();

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
                    wallet,
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

        // Record transaction in history
        const calldata = interactionParameters.calldata
            ? Buffer.isBuffer(interactionParameters.calldata)
                ? interactionParameters.calldata.toString('hex')
                : typeof interactionParameters.calldata === 'string'
                  ? interactionParameters.calldata
                  : Buffer.from(interactionParameters.calldata as Uint8Array).toString('hex')
            : undefined;

        // Extract txids from raw transactions
        const interactionTx = Transaction.fromHex(interactionResponse.interactionTransaction);
        const interactionTxid = interactionTx.getId();
        const fundingTxid = interactionResponse.fundingTransaction
            ? Transaction.fromHex(interactionResponse.fundingTransaction).getId()
            : undefined;

        void this.recordTransaction(
            {
                txid: interactionTxid,
                fundingTxid,
                type: TransactionType.OPNET_INTERACTION,
                from: account.address,
                to: interactionParameters.to,
                contractAddress: interactionParameters.to,
                fee: Number(interactionResponse.estimatedFees),
                feeRate: interactionParameters.feeRate,
                calldata
            },
            origin
        );

        return interactionResponse;
    };

    /**
     * Pre-sign an interaction for preview purposes.
     * This method signs the transaction but does NOT broadcast or record it.
     * The result is stored in notification service for the approval UI to display.
     * Security: The signed data is NEVER returned to dApps - only used for UI preview.
     */
    public preSignInteractionForPreview = async (
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<void> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const wallet = await this.getWalletSigner();

        let signedData: { response: InteractionResponse; utxos: UTXOs } | undefined;
        let requiredMinimum = 0;
        let tries = 0;

        do {
            if (tries === 2) {
                // If we can't pre-sign, just return - the approval will work without preview
                console.warn('PreSign: Could not pre-sign interaction for preview');
                return;
            }
            tries++;

            try {
                signedData = await this.signInteractionInternal(
                    account,
                    wallet,
                    interactionParameters,
                    requiredMinimum
                );
            } catch (err: unknown) {
                const msg = err as Error;

                if (!msg.message.includes('setFeeOutput: Insufficient funds')) {
                    // Non-retryable error - just return, approval will work without preview
                    console.warn('PreSign: Error during pre-sign:', msg.message);
                    return;
                }

                const matches = /Fee:\s*(\d+)[^\d]+(?:Value|Total input):\s*(\d+)/i.exec(msg.message);
                if (!matches) {
                    return;
                }

                const fee = BigInt(matches[1]);
                const available = BigInt(matches[2]);
                const missing = fee > available ? fee - available : 0n;

                requiredMinimum = Number(missing + (missing * 20n) / 100n);
            }
        } while (!signedData);

        // Parse transactions for accurate UI display
        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());

        // Use fundingInputUtxos directly from response - these contain actual UTXO values
        // DO NOT try to reverse-lookup values from raw tx hex - that approach is broken
        const fundingInputUtxos = signedData.response.fundingInputUtxos.map((u) => ({
            txid: u.transactionId,
            vout: u.outputIndex,
            value: u.value
        }));

        // Parse the interaction transaction using fundingUTXOs (outputs from funding tx)
        const interactionTx = parseTransactionForPreview(
            signedData.response.interactionTransaction,
            signedData.response.fundingUTXOs.map((u) => ({
                txid: u.transactionId,
                vout: u.outputIndex,
                value: u.value
            })),
            network
        );

        // Parse funding transaction if present - use fundingInputUtxos for actual input values
        let fundingTx: ParsedTransaction | null = null;
        if (signedData.response.fundingTransaction) {
            fundingTx = parseTransactionForPreview(signedData.response.fundingTransaction, fundingInputUtxos, network);
        }

        // First output of interaction TX is ALWAYS the OPNet Epoch Miner (gas fee)
        const opnetEpochMinerOutput = interactionTx.outputs.length > 0 ? interactionTx.outputs[0] : null;

        // Store the pre-signed data in notification service for preview
        // Security: This data is ONLY used for UI display, never exposed to dApps
        notificationService.setPreSignedData({
            response: signedData.response,
            utxos: signedData.utxos,
            fundingTxHex: signedData.response.fundingTransaction,
            interactionTxHex: signedData.response.interactionTransaction,
            estimatedFees: signedData.response.estimatedFees,
            fundingTx,
            interactionTx,
            opnetEpochMinerOutput
        });
    };

    /**
     * Get pre-signed data for preview (called from UI)
     * Returns serialized data (BigInt as strings) for Chrome message passing
     */
    public getPreSignedDataForPreview = (): SerializedPreSignedInteractionData | null => {
        const data = notificationService.getPreSignedData();
        if (!data) return null;
        return serializePreSignedInteractionData(data);
    };

    /**
     * Trigger pre-signing for the current approval request (called from SignInteraction UI)
     * Gets the interaction parameters from the current approval and triggers pre-signing.
     * This is called when the SignInteraction approval component mounts.
     *
     * SAFETY: Prevents concurrent pre-signing requests to avoid race conditions and
     * potential security issues with multiple transactions being built simultaneously.
     */
    public triggerPreSignInteraction = (): void => {
        // SAFETY CHECK: Prevent concurrent pre-signing
        if (notificationService.isPreSigningInProgress()) {
            console.warn('triggerPreSignInteraction: Pre-signing already in progress, ignoring duplicate request');
            return;
        }

        const approvalData = notificationService.getApproval();

        // Check if it's a standard approval (not a lock approval)
        if (!approvalData || 'lock' in approvalData) {
            console.warn('triggerPreSignInteraction: No standard approval data available');
            return;
        }

        // Now TypeScript knows approvalData is StandardApprovalData
        const params = approvalData.params as { data: { interactionParameters: InteractionParametersWithoutSigner } };
        if (!params?.data?.interactionParameters) {
            console.warn('triggerPreSignInteraction: No interaction parameters in approval');
            return;
        }

        const interactionParameters = params.data.interactionParameters;

        // Set flag to prevent concurrent requests
        notificationService.setPreSigningInProgress(true);

        // Trigger pre-signing in the background (don't await - let it run async)
        this.preSignInteractionForPreview(interactionParameters)
            .catch((err: unknown) => {
                console.error('triggerPreSignInteraction: Pre-signing failed:', err);
            })
            .finally(() => {
                // Always clear the flag when done (success or failure)
                notificationService.setPreSigningInProgress(false);
            });
    };

    /**
     * Generic pre-signed transaction data methods (for internal wallet transactions)
     */
    public getPreSignedTxData = (): PreSignedTransactionData | null => {
        return notificationService.getPreSignedTxData();
    };

    public setPreSignedTxData = (data: PreSignedTransactionData): void => {
        notificationService.setPreSignedTxData(data);
    };

    public clearPreSignedTxData = (): void => {
        notificationService.clearPreSignedTxData();
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
            const result = await signBip322MessageWithNetworkType(
                message,
                account.address,
                networkTypeToOPNet(networkType),
                async (psbt: Psbt) => {
                    const toSignInputs = await this.formatOptionsToSignInputs(psbt);
                    await this.signPsbt(psbt, toSignInputs, false);
                    return psbt;
                }
            );
            return result.signature;
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

            // Update keyrings with the new network to ensure correct key derivation
            const bitcoinNetwork = getBitcoinLibJSNetwork(chain.networkType, chainType);
            await keyringService.updateKeyringsNetwork(bitcoinNetwork);

            // Invalidate cache since network changed (addresses may be different)
            this.invalidateKeyringCache();

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
            const result = await Web3API.provider.sendRawTransaction(rawtx, false);
            if (!result) {
                throw new Error('No response from broadcast');
            }
            if (result.error) {
                throw new Error(result.error);
            }
            return result.result ?? '';
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
        const type = displayedKeyring.type;
        const accounts: Account[] = [];

        // Use first account pubkey + type as stable key (doesn't change when indices shift)
        // This handles edge case of same pubkey with different keyring types
        // Fall back to index-based key for empty keyrings (shouldn't happen)
        const firstPubkey = displayedKeyring.accounts[0]?.pubkey;
        const typePrefix = type === KEYRING_TYPE.HdKeyring ? 'hd' : 'sk';
        const key = firstPubkey ? `keyring_${typePrefix}_${firstPubkey.slice(0, 16)}` : `keyring_${index}`;

        // Migration: check if there's a name stored under the old index-based key
        const legacyKey = `keyring_${index}`;
        if (firstPubkey && legacyKey !== key) {
            const legacyName = await preferenceService.getKeyringAlianName(legacyKey, '');
            if (legacyName) {
                // Migrate the name to the new stable key
                const existingName = await preferenceService.getKeyringAlianName(key, '');
                if (!existingName) {
                    await preferenceService.setKeyringAlianName(key, legacyName);
                }
            }
        }

        for (let j = 0; j < displayedKeyring.accounts.length; j++) {
            const { pubkey, quantumPublicKey } = displayedKeyring.accounts[j];
            const address = publicKeyToAddressWithNetworkType(pubkey, addressType, networkTypeToOPNet(networkType));
            const accountKey = `${key}#${j}`;
            const defaultName = this.getAlianName(pubkey) ?? this._generateAlianName(type, j + 1);
            const alianName = await preferenceService.getAccountAlianName(accountKey, defaultName);
            const flag = preferenceService.getAddressFlag(address);

            // Calculate quantum public key hash and determine status
            let quantumPublicKeyHash: string | undefined;
            let quantumKeyStatus: QuantumKeyStatus;

            if (quantumPublicKey) {
                // Calculate SHA256 hash of quantum public key
                quantumPublicKeyHash = Buffer.from(MessageSigner.sha256(Buffer.from(quantumPublicKey, 'hex'))).toString(
                    'hex'
                );
                quantumKeyStatus = QuantumKeyStatus.MIGRATED;
            } else if (type === KEYRING_TYPE.HdKeyring) {
                // HD keyrings auto-derive quantum keys
                quantumKeyStatus = QuantumKeyStatus.NOT_REQUIRED;
            } else {
                // Simple keyring without quantum key
                quantumKeyStatus = QuantumKeyStatus.NOT_MIGRATED;
            }

            accounts.push({
                type,
                pubkey,
                address,
                alianName,
                index: j,
                key: accountKey,
                flag,
                quantumPublicKeyHash,
                quantumKeyStatus
            });
        }
        const hdPath = type === KEYRING_TYPE.HdKeyring ? displayedKeyring.keyring.getHdPath() : '';
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
     * Uses cache if available and network hasn't changed.
     */
    public getKeyrings = async (): Promise<WalletKeyring[]> => {
        const currentNetworkType = this.getNetworkType();

        // Return cached keyrings if valid
        if (
            this.walletKeyringsCache !== null &&
            this.keyringsCacheNetworkType === currentNetworkType
        ) {
            return this.walletKeyringsCache;
        }

        // Rebuild cache
        const displayedKeyrings = keyringService.getAllDisplayedKeyrings();
        const keyrings: WalletKeyring[] = [];

        for (let i = 0; i < displayedKeyrings.length; i++) {
            const displayedKeyring = displayedKeyrings[i];

            if (displayedKeyring.type === KEYRING_TYPE.Empty) {
                continue;
            }

            const walletKeyring = await this.displayedKeyringToWalletKeyring(displayedKeyring, displayedKeyring.index);
            keyrings.push(walletKeyring);
        }

        // Store in cache - but ONLY if we have keyrings (don't cache empty results)
        if (keyrings.length > 0) {
            this.walletKeyringsCache = keyrings;
            this.keyringsCacheNetworkType = currentNetworkType;
        }

        return keyrings;
    };

    /**
     * Return the currently active keyring, derived from preferences.
     * Uses cached keyrings when available to avoid expensive re-computation.
     */
    public getCurrentKeyring = async (): Promise<WalletKeyring | null> => {
        // Get all keyrings (uses cache if available)
        const keyrings = await this.getKeyrings();
        if (keyrings.length === 0) {
            return null;
        }

        const storedKeyringIndex = preferenceService.getCurrentKeyringIndex();

        // Find keyring by its stored index (not array position!)
        // The keyring.index property contains the original index from keyringService
        let currentKeyring: WalletKeyring | undefined;

        if (storedKeyringIndex !== undefined) {
            currentKeyring = keyrings.find((k) => k.index === storedKeyringIndex);
        }

        // If no keyring found by stored index, try to find by current account pubkey
        if (!currentKeyring) {
            const currentAccountRaw = preferenceService.getCurrentAccount();
            if (currentAccountRaw) {
                for (const keyring of keyrings) {
                    const found = keyring.accounts.find((v) => v.pubkey === currentAccountRaw.pubkey);
                    if (found) {
                        currentKeyring = keyring;
                        preferenceService.setCurrentKeyringIndex(keyring.index);
                        break;
                    }
                }
            }
        }

        // If still no keyring, use the first valid one
        if (!currentKeyring || !currentKeyring.accounts[0]) {
            for (const keyring of keyrings) {
                if (keyring.type !== KEYRING_TYPE.Empty && keyring.accounts[0]) {
                    currentKeyring = keyring;
                    preferenceService.setCurrentKeyringIndex(keyring.index);
                    break;
                }
            }
        }

        return currentKeyring || null;
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
            opnetApi.setClientAddress(currentAccount.address, currentAccount.flag);
        }
        return currentAccount ?? null;
    };

    /**
     * Get or set the keyring currently in "edit" mode.
     */
    public getEditingKeyring = async (): Promise<WalletKeyring> => {
        const editingKeyringIndex = preferenceService.getEditingKeyringIndex();
        const displayedKeyrings = keyringService.getAllDisplayedKeyrings();
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
     * Get the app summary (list of recommended apps).
     */
    public getAppSummary = async (): Promise<AppSummary> => {
        const appTab = preferenceService.getAppTab();

        // Return empty apps list - no third-party app recommendations
        const appSummary: AppSummary = {
            apps: [],
            readTabTime: appTab.readTabTime
        };

        await preferenceService.setAppSummary(appSummary);
        return appSummary;
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
        const utxos = await Web3API.getAllUTXOsForAddresses([address]);
        return utxos.map((utxo) => ({
            txid: utxo.transactionId,
            vout: utxo.outputIndex,
            satoshis: Number(utxo.value),
            scriptPk: utxo.scriptPubKey.hex,
            addressType: AddressTypes.P2TR
        }));
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

        // Update cache without full invalidation
        this.updateKeyringNameInCache(keyring.key, name);

        return keyring;
    };

    /**
     * Set a custom alias name for a single account.
     */
    public setAccountAlianName = (account: Account, name: string): Account => {
        preferenceService.setAccountAlianName(account.key, name);
        account.alianName = name;

        // Update cache without full invalidation
        this.updateAccountNameInCache(account.key, name);

        return account;
    };

    /**
     * Add a flag to an account's address.
     */
    public addAddressFlag = async (account: Account, flag: AddressFlagType): Promise<Account> => {
        account.flag = await preferenceService.addAddressFlag(account.address, flag);
        opnetApi.setClientAddress(account.address, account.flag);

        // Update cache without full invalidation
        this.updateAccountFlagInCache(account.address, account.flag);

        return account;
    };

    /**
     * Remove a flag from an account's address.
     */
    public removeAddressFlag = async (account: Account, flag: AddressFlagType): Promise<Account> => {
        account.flag = await preferenceService.removeAddressFlag(account.address, flag);
        opnetApi.setClientAddress(account.address, account.flag);

        // Update cache without full invalidation
        this.updateAccountFlagInCache(account.address, account.flag);

        return account;
    };

    public getBtcPrice = async (): Promise<number> => {
        return await opnetApi.getBtcPrice();
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
     * Create a payment URL for buying BTC.
     * TODO: Implement when payment provider is available
     */
    public createPaymentUrl = (_address: string, _channel: string): string => {
        return '';
    };

    public getWalletConfig = (): Promise<WalletConfig> => {
        return opnetApi.getWalletConfig();
    };

    public getSkippedVersion = (): string | null => {
        return preferenceService.getSkippedVersion();
    };

    public setSkippedVersion = (version: string): void => {
        preferenceService.setSkippedVersion(version);
    };

    /**
     * Check if a website is a known scammer.
     * TODO: Implement proper scam detection service
     */
    public checkWebsite = (_website: string): { isScammer: boolean; warning: string } => {
        // Not implemented - always return safe
        return { isScammer: false, warning: '' };
    };

    /**
     * Return summary info for an address (balance).
     */
    public getAddressSummary = async (address: string): Promise<AddressSummary> => {
        // Get balance from Web3API
        const utxos = await Web3API.getAllUTXOsForAddresses([address]);
        const totalSatoshis = utxos.reduce((sum, utxo) => sum + Number(utxo.value), 0);

        return {
            address,
            totalSatoshis,
            loading: false
        };
    };

    public getShowSafeNotice = (): boolean => {
        return preferenceService.getShowSafeNotice();
    };

    public setShowSafeNotice = (show: boolean): void => {
        preferenceService.setShowSafeNotice(show);
    };

    public getMldsaBackupDismissed = (pubkey: string): boolean => {
        return preferenceService.getMldsaBackupDismissed(pubkey);
    };

    public setMldsaBackupDismissed = async (pubkey: string, dismissed: boolean): Promise<void> => {
        await preferenceService.setMldsaBackupDismissed(pubkey, dismissed);
    };

    public getVersionDetail = (_version: string): VersionDetail => {
        // TODO: Implement version checking when endpoint is available
        return {
            version: '',
            title: '',
            changelogs: []
        };
    };

    /**
     * Sign data with MLDSA (post-quantum) signature.
     * @throws WalletControllerError
     */
    public signMLDSA = async (data: string | Buffer): Promise<string> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        try {
            const signature = keyringService.signMLDSA(account.pubkey, data);
            return Buffer.from(signature).toString('hex');
        } catch (err) {
            throw new WalletControllerError(`Failed to sign with MLDSA: ${String(err)}`);
        }
    };

    // Note: Keystone hardware wallet methods (checkKeyringMethod, genSignPsbtUr, parseSignPsbtUr,
    // genSignMsgUr, parseSignMsgUr) have been removed in wallet-sdk 2.0

    /**
     * Get the quantum public key for the current account.
     * Returns the hex-encoded quantum public key or undefined if not available.
     */
    public getQuantumPublicKey = async (): Promise<string | undefined> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        const qpk = keyringService.getQuantumPublicKey(account.pubkey);
        return qpk ? Buffer.from(qpk).toString('hex') : undefined;
    };

    /**
     * Get the quantum public key hash (SHA256) for the current account.
     * This is the value that gets linked on-chain.
     */
    public getQuantumPublicKeyHash = async (): Promise<string | undefined> => {
        const qpk = await this.getQuantumPublicKey();
        if (!qpk) return undefined;
        return Buffer.from(MessageSigner.sha256(Buffer.from(qpk, 'hex'))).toString('hex');
    };

    /**
     * Check if the current account needs quantum key migration.
     * Only applies to WIF-imported (SimpleKeyring) wallets.
     */
    public needsQuantumMigration = async (): Promise<boolean> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        return keyringService.needsQuantumMigration(account.pubkey);
    };

    /**
     * Set/migrate quantum key for a WIF-imported wallet.
     * @throws WalletControllerError
     */
    public setQuantumKey = async (quantumPrivateKey: string): Promise<void> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        try {
            await keyringService.setQuantumKey(account.pubkey, quantumPrivateKey);

            // Invalidate cache since quantum key changed (affects quantumPublicKeyHash and quantumKeyStatus)
            this.invalidateKeyringCache();
        } catch (err) {
            throw new WalletControllerError(`Failed to set quantum key: ${String(err)}`);
        }
    };

    /**
     * Generate a new quantum key for a WIF-imported wallet.
     * @throws WalletControllerError
     */
    public generateQuantumKey = async (): Promise<void> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        try {
            await keyringService.generateQuantumKey(account.pubkey);

            // Invalidate cache since quantum key changed (affects quantumPublicKeyHash and quantumKeyStatus)
            this.invalidateKeyringCache();
        } catch (err) {
            throw new WalletControllerError(`Failed to generate quantum key: ${String(err)}`);
        }
    };

    // ==================== DUPLICATION DETECTION AND RESOLUTION ====================

    /**
     * Check for duplicate wallets and MLDSA keys
     * Should be called after every unlock
     */
    public checkForDuplicates = async (): Promise<DuplicationDetectionResult> => {
        return duplicationDetectionService.detectDuplicates();
    };

    /**
     * Get current duplication resolution state
     */
    public getDuplicationState = (): DuplicationState => {
        return preferenceService.getDuplicationState();
    };

    /**
     * Check if duplicate check should be skipped (already done recently)
     */
    public shouldSkipDuplicateCheck = (thresholdMs?: number): boolean => {
        return preferenceService.shouldSkipDuplicateCheck(thresholdMs);
    };

    /**
     * Mark duplicate check as done for this session
     */
    public setDuplicateCheckDone = async (): Promise<void> => {
        return preferenceService.setDuplicateCheckDone();
    };

    /**
     * Verify password and create backup before resolution
     * REQUIRED first step before any resolution actions
     */
    public createDuplicationBackup = async (password: string): Promise<boolean> => {
        const isValid = await this.verifyPassword(password);
        if (!isValid) {
            throw new WalletControllerError('Invalid password');
        }

        const detection = await this.checkForDuplicates();
        await duplicationBackupService.createBackup(password, [
            ...detection.walletDuplicates,
            ...detection.mldsaDuplicates
        ]);

        await preferenceService.setDuplicationBackupCreated(true);
        return true;
    };

    /**
     * Export backup as downloadable file
     * Returns file content and filename
     */
    public exportDuplicationBackup = async (
        password: string
    ): Promise<{ content: string; filename: string }> => {
        const isValid = await this.verifyPassword(password);
        if (!isValid) {
            throw new WalletControllerError('Invalid password');
        }

        const result = await duplicationBackupService.exportBackupToFile(password);
        await preferenceService.setDuplicationBackupDownloaded(true);
        return result;
    };

    /**
     * Check if duplication backup exists
     */
    public hasDuplicationBackup = async (): Promise<boolean> => {
        return duplicationBackupService.hasBackup();
    };

    /**
     * Verify on-chain MLDSA linkage for all wallets
     */
    public verifyAllOnChainLinkage = async (): Promise<Map<string, OnChainLinkageInfo>> => {
        return duplicationDetectionService.verifyOnChainLinkage();
    };

    /**
     * Resolve a duplication conflict
     */
    public resolveDuplicationConflict = async (choice: ConflictResolutionChoice): Promise<void> => {
        const { conflictId, resolution, correctWalletIndex, walletsToDelete, walletsToClearMldsa, targetWalletIndex, newQuantumPrivateKey } = choice;

        try {
            switch (resolution) {
                case DuplicationResolution.KEEP_SELECTED:
                    // Delete all wallets except the selected one (for WALLET_DUPLICATE)
                    if (walletsToDelete && walletsToDelete.length > 0) {
                        // Sort in descending order to avoid index shifting issues
                        const sortedIndices = [...walletsToDelete].sort((a, b) => b - a);
                        for (const index of sortedIndices) {
                            await keyringService.removeKeyring(index);
                        }
                        console.log(`[DuplicationResolution] Removed ${sortedIndices.length} duplicate wallets, kept keyring ${correctWalletIndex}`);
                    }
                    break;

                case DuplicationResolution.KEEP_MLDSA_ON_SELECTED:
                    // Clear MLDSA from other wallets but keep the wallets (for MLDSA_DUPLICATE)
                    if (walletsToClearMldsa && walletsToClearMldsa.length > 0) {
                        for (const index of walletsToClearMldsa) {
                            try {
                                await keyringService.clearQuantumKeyByIndex(index);
                                console.log(`[DuplicationResolution] Cleared MLDSA from keyring ${index}`);
                            } catch (e) {
                                console.warn(`[DuplicationResolution] Failed to clear MLDSA from keyring ${index}:`, e);
                            }
                        }
                        console.log(`[DuplicationResolution] Cleared MLDSA from ${walletsToClearMldsa.length} wallets, kept MLDSA on keyring ${correctWalletIndex}`);
                    }
                    break;

                case DuplicationResolution.MOVE_MLDSA:
                    if (targetWalletIndex === undefined) {
                        throw new WalletControllerError('Target wallet index required for MOVE_MLDSA');
                    }
                    await keyringService.moveQuantumKey(targetWalletIndex, correctWalletIndex);
                    console.log(`[DuplicationResolution] Moved MLDSA from keyring ${targetWalletIndex} to ${correctWalletIndex}`);
                    break;

                case DuplicationResolution.REPLACE_MLDSA:
                    if (!newQuantumPrivateKey) {
                        throw new WalletControllerError('New quantum private key required for REPLACE_MLDSA');
                    }
                    await keyringService.replaceQuantumKey(correctWalletIndex, newQuantumPrivateKey);
                    break;
            }

            // Invalidate cache since keyrings may have been removed or modified
            this.invalidateKeyringCache();

            await preferenceService.markConflictResolved(conflictId);
        } catch (err) {
            throw new WalletControllerError(`Failed to resolve conflict: ${String(err)}`);
        }
    };

    /**
     * Remove a duplicate wallet by keyring index
     * Used during duplication resolution
     */
    public removeDuplicateWallet = async (keyringIndex: number): Promise<void> => {
        try {
            await keyringService.removeKeyringByIndex(keyringIndex);

            // Invalidate cache since keyring was removed
            this.invalidateKeyringCache();
        } catch (err) {
            throw new WalletControllerError(`Failed to remove wallet: ${String(err)}`);
        }
    };

    /**
     * Mark all duplication conflicts as resolved
     */
    public setDuplicationResolved = async (): Promise<void> => {
        await preferenceService.setDuplicationResolved(true);
    };

    /**
     * Reset duplication resolution state (for testing or re-checking)
     */
    public resetDuplicationState = async (): Promise<void> => {
        await preferenceService.resetDuplicationState();
    };

    /**
     * Import backup from file content
     */
    public importDuplicationBackup = async (
        fileContent: string,
        password: string
    ): Promise<{ version: string; walletCount: number; createdAt: number }> => {
        const isValid = await this.verifyPassword(password);
        if (!isValid) {
            throw new WalletControllerError('Invalid password');
        }

        const backup = await duplicationBackupService.importBackupFromFile(fileContent, password);
        return {
            version: backup.version,
            walletCount: backup.keyrings.length,
            createdAt: backup.createdAt
        };
    };

    /**
     * Restore wallets from backup
     * WARNING: This will clear existing keyrings!
     */
    public restoreFromDuplicationBackup = async (
        password: string
    ): Promise<{ restored: number; errors: string[] }> => {
        const isValid = await this.verifyPassword(password);
        if (!isValid) {
            throw new WalletControllerError('Invalid password');
        }

        const result = await duplicationBackupService.restoreFromBackup(password);

        // Invalidate cache since keyrings were restored
        this.invalidateKeyringCache();

        return result;
    };

    /**
     * [DEV/TEST ONLY] Create test conflict scenarios
     * This creates duplicate wallets to test the resolution flow
     * Uses forceAddKeyringForTest to bypass duplicate checks
     * WARNING: Disabled in production builds
     */
    public createTestConflicts = async (): Promise<{
        created: string[];
        message: string;
    }> => {
        // SECURITY: Block this method in production
        if (process.env.NODE_ENV === 'production') {
            throw new WalletControllerError('Test methods are not available in production builds');
        }

        const created: string[] = [];

        try {
            // Reset any existing duplication state
            await preferenceService.resetDuplicationState();

            const currentNetwork = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
            const keyrings = keyringService.keyrings;

            // Collect existing wallets info
            const existingSimpleKeyrings: { keyring: SimpleKeyring; serialized: SimpleKeyringSerializedOptions }[] = [];
            const existingHdKeyrings: { keyring: HdKeyring; serialized: HdKeyringSerializedOptions }[] = [];

            for (const keyring of keyrings) {
                if (keyring.type === KEYRING_TYPE.SimpleKeyring) {
                    const sk = keyring as SimpleKeyring;
                    existingSimpleKeyrings.push({
                        keyring: sk,
                        serialized: sk.serialize() as SimpleKeyringSerializedOptions
                    });
                } else if (keyring.type === KEYRING_TYPE.HdKeyring) {
                    const hk = keyring as HdKeyring;
                    existingHdKeyrings.push({
                        keyring: hk,
                        serialized: hk.serialize() as HdKeyringSerializedOptions
                    });
                }
            }

            // Generate random valid test Bitcoin private keys (WIF format)
            // Generate enough for all scenarios (need ~15+ keys)
            const testPrivateKeys: string[] = [];
            for (let i = 0; i < 20; i++) {
                const randomBytes = new Uint8Array(32);
                crypto.getRandomValues(randomBytes);
                const randomKeyPair = EcKeyPair.fromPrivateKey(Buffer.from(randomBytes), currentNetwork);
                testPrivateKeys.push(randomKeyPair.toWIF());
            }

            // Helper to generate a real MLDSA key by creating a temp keyring
            const generateRealMldsaKey = (): string => {
                // Create a temporary SimpleKeyring with a random WIF
                const tempBytes = new Uint8Array(32);
                crypto.getRandomValues(tempBytes);
                const tempKeyPair = EcKeyPair.fromPrivateKey(Buffer.from(tempBytes), currentNetwork);
                const tempWif = tempKeyPair.toWIF();

                const tempKeyring = new SimpleKeyring({
                    privateKey: tempWif,
                    network: currentNetwork
                });

                // Generate a fresh quantum key
                tempKeyring.generateFreshQuantumKey();

                // Serialize to get the quantumPrivateKey
                const serialized = tempKeyring.serialize() as SimpleKeyringSerializedOptions;
                if (!serialized.quantumPrivateKey) {
                    throw new Error('Failed to generate quantum private key');
                }
                return serialized.quantumPrivateKey;
            };

            // Generate 3 real MLDSA keys for test scenarios
            const testMldsaKeys: string[] = [];
            for (let i = 0; i < 3; i++) {
                testMldsaKeys.push(generateRealMldsaKey());
            }

            // ============================================================
            // SCENARIO 1: IDENTICAL WALLET COPIES (same WIF, no MLDSA)
            // User imported same WIF multiple times without migration
            // ============================================================
            if (existingSimpleKeyrings.length > 0) {
                const base = existingSimpleKeyrings[0];
                const network = base.serialized.network || currentNetwork;

                // Create 2 copies with NO MLDSA (needs migration)
                for (let i = 0; i < 2; i++) {
                    await keyringService.forceAddKeyringForTest(
                        KEYRING_TYPE.SimpleKeyring,
                        { privateKey: base.serialized.privateKey, network },
                        AddressTypes.P2TR
                    );
                    created.push(`Identical Copy #${i + 1}: same WIF as wallet 0, no MLDSA`);
                }
            }

            // ============================================================
            // SCENARIO 2: WALLET DUPLICATES WITH DIFFERENT MLDSA
            // Same WIF but different MLDSA keys (simulates multiple migrations)
            // ============================================================
            if (existingSimpleKeyrings.length > 0) {
                const base = existingSimpleKeyrings[0];
                const network = base.serialized.network || currentNetwork;

                // Create copies of the same WIF with DIFFERENT generated MLDSA keys
                for (let i = 0; i < 2; i++) {
                    await keyringService.forceAddKeyringForTest(
                        KEYRING_TYPE.SimpleKeyring,
                        {
                            privateKey: base.serialized.privateKey,
                            network,
                            quantumPrivateKey: testMldsaKeys[i]
                        },
                        AddressTypes.P2TR
                    );
                    created.push(`WIF Dupe w/ MLDSA #${i + 1}: same WIF as wallet 0, unique MLDSA`);
                }
            }

            // ============================================================
            // SCENARIO 3: MLDSA DUPLICATES (different WIFs, same MLDSA)
            // Same MLDSA key incorrectly assigned to different Bitcoin wallets
            // ============================================================
            const sharedMldsaKey = testMldsaKeys[2]; // Use third generated MLDSA
            for (let i = 0; i < 3; i++) {
                await keyringService.forceAddKeyringForTest(
                    KEYRING_TYPE.SimpleKeyring,
                    {
                        privateKey: testPrivateKeys[i],
                        network: currentNetwork,
                        quantumPrivateKey: sharedMldsaKey
                    },
                    AddressTypes.P2TR
                );
                created.push(`MLDSA Dupe #${i + 1}: unique WIF, SHARED MLDSA key`);
            }

            // ============================================================
            // SCENARIO 4: Use EACH existing wallet's MLDSA on NEW WIFs
            // This ensures we catch on-chain linked wallets
            // ============================================================
            const walletsWithMldsa = existingSimpleKeyrings.filter(k => k.serialized.quantumPrivateKey);
            let testKeyIdx = 3;
            for (let i = 0; i < walletsWithMldsa.length && testKeyIdx < testPrivateKeys.length; i++) {
                const mldsaSource = walletsWithMldsa[i];
                const walletName = mldsaSource.keyring.getAccounts()[0]?.slice(0, 8) || `wallet${i}`;

                await keyringService.forceAddKeyringForTest(
                    KEYRING_TYPE.SimpleKeyring,
                    {
                        privateKey: testPrivateKeys[testKeyIdx],
                        network: currentNetwork,
                        quantumPrivateKey: mldsaSource.serialized.quantumPrivateKey
                    },
                    AddressTypes.P2TR
                );
                created.push(`Stolen MLDSA from ${walletName}: new WIF with existing wallet #${i}'s MLDSA`);
                testKeyIdx++;
            }

            // ============================================================
            // SCENARIO 5: HD WALLET DUPLICATES (same mnemonic imported multiple times)
            // ============================================================
            if (existingHdKeyrings.length > 0) {
                const baseHd = existingHdKeyrings[0];

                for (let i = 0; i < 2; i++) {
                    await keyringService.forceAddKeyringForTest(
                        KEYRING_TYPE.HdKeyring,
                        {
                            mnemonic: baseHd.serialized.mnemonic,
                            passphrase: baseHd.serialized.passphrase || '',
                            activeIndexes: [0],
                            network: currentNetwork
                        },
                        AddressTypes.P2TR
                    );
                    created.push(`HD Wallet Dupe #${i + 1}: same mnemonic`);
                }
            }

            // ============================================================
            // SCENARIO 6: Orphan wallets with NO MLDSA (need migration)
            // Use keys from the end of the array to avoid conflicts
            // ============================================================
            for (let i = 0; i < 2; i++) {
                const keyIdx = testPrivateKeys.length - 1 - i;
                await keyringService.forceAddKeyringForTest(
                    KEYRING_TYPE.SimpleKeyring,
                    { privateKey: testPrivateKeys[keyIdx], network: currentNetwork },
                    AddressTypes.P2TR
                );
                created.push(`Orphan WIF #${i + 1}: unique WIF, no MLDSA (needs migration)`);
            }

            keyringService.fullUpdate();

            return {
                created,
                message: `Created ${created.length} test scenarios. Lock and unlock to trigger detection.`
            };
        } catch (e) {
            throw new WalletControllerError(
                `Failed to create test conflicts: ${e instanceof Error ? e.message : String(e)}`
            );
        }
    };

    /**
     * [DEV/TEST ONLY] Clear test data and reset state
     * WARNING: Disabled in production builds
     */
    public clearTestConflicts = async (): Promise<void> => {
        // SECURITY: Block this method in production
        if (process.env.NODE_ENV === 'production') {
            throw new WalletControllerError('Test methods are not available in production builds');
        }

        // Reset duplication state
        await preferenceService.resetDuplicationState();

        // Clear backup
        await duplicationBackupService.clearBackup();
    };

    // ==================== END DUPLICATION DETECTION ====================

    /**
     * Export both classical and quantum private keys for the current account.
     * Only works for SimpleKeyring (WIF-imported) wallets.
     * @throws WalletControllerError
     */
    public exportPrivateKeyWithQuantum = async (): Promise<{
        classicalPrivateKey: string;
        quantumPrivateKey?: string;
        chainCode?: string;
    }> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        try {
            const classicalPrivateKey = keyringService.exportAccount(account.pubkey);
            const quantumPrivateKey = keyringService.exportQuantumAccount(account.pubkey);

            let privateKey: string | undefined;
            let chainCode: string | undefined;
            if (quantumPrivateKey) {
                privateKey = quantumPrivateKey.slice(0, quantumPrivateKey.length - 64);
                chainCode = quantumPrivateKey.slice(quantumPrivateKey.length - 64);
            }

            return { classicalPrivateKey, quantumPrivateKey: privateKey, chainCode };
        } catch (err) {
            throw new WalletControllerError(`Failed to export private keys: ${String(err)}`);
        }
    };

    public getAutoLockTimeId = (): number => {
        return preferenceService.getAutoLockTimeId();
    };

    public setAutoLockTimeId = (timeId: number): void => {
        preferenceService.setAutoLockTimeId(timeId);
        this._resetTimeout();
    };

    public getNotificationWindowMode = (): 'auto' | 'popup' | 'fullscreen' => {
        return preferenceService.getNotificationWindowMode();
    };

    public setNotificationWindowMode = async (mode: 'auto' | 'popup' | 'fullscreen'): Promise<void> => {
        await preferenceService.setNotificationWindowMode(mode);
    };

    public getUseSidePanel = (): boolean => {
        return preferenceService.getUseSidePanel();
    };

    public setUseSidePanel = async (useSidePanel: boolean): Promise<void> => {
        await preferenceService.setUseSidePanel(useSidePanel);

        // Update Chrome side panel behavior
        if (chrome.sidePanel) {
            chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidePanel }).catch(console.error);
        }
    };

    public getExperienceMode = (): ExperienceMode => {
        return preferenceService.getExperienceMode();
    };

    public setExperienceMode = async (mode: ExperienceMode): Promise<void> => {
        await preferenceService.setExperienceMode(mode);
    };

    public isExperienceModeSet = (): boolean => {
        return preferenceService.isExperienceModeSet();
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
        this.timer = setTimeout(() => {
            try {
                this.lockWallet();
            } catch (err) {
                console.error('Failed to auto-lock wallet:', err);
            }
        }, timeConfig.time) as unknown as number;
    };

    private async getWalletSigner(): Promise<Wallet> {
        const data = await this.getOPNetWallet();
        return Wallet.fromWif(
            data[0],
            data[1],
            Web3API.network,
            MLDSASecurityLevel.LEVEL2,
            Buffer.from(data[2], 'hex')
        );
    }

    private getEmptyBalance(): BitcoinBalance {
        return {
            btc_total_amount: '0',
            btc_confirm_amount: '0',
            btc_pending_amount: '0',
            csv75_total_amount: '0',
            csv75_unlocked_amount: '0',
            csv75_locked_amount: '0',
            csv2_total_amount: '0',
            csv2_unlocked_amount: '0',
            csv2_locked_amount: '0',
            csv1_total_amount: '0',
            csv1_unlocked_amount: '0',
            csv1_locked_amount: '0',
            p2wda_total_amount: '0',
            p2wda_pending_amount: '0',
            consolidation_amount: '0',
            consolidation_unspent_amount: '0',
            consolidation_unspent_count: 0,
            consolidation_csv75_unlocked_amount: '0',
            consolidation_csv75_unlocked_count: 0,
            consolidation_csv2_unlocked_amount: '0',
            consolidation_csv2_unlocked_count: 0,
            consolidation_csv1_unlocked_amount: '0',
            consolidation_csv1_unlocked_count: 0,
            consolidation_p2wda_unspent_amount: '0',
            consolidation_p2wda_unspent_count: 0,
            usd_value: '0.00',

            all_utxos_count: 0,
            unspent_utxos_count: 0,
            csv75_locked_utxos_count: 0,
            csv75_unlocked_utxos_count: 0,
            csv2_locked_utxos_count: 0,
            csv2_unlocked_utxos_count: 0,
            csv1_locked_utxos_count: 0,
            csv1_unlocked_utxos_count: 0,
            p2wda_utxos_count: 0,
            unspent_p2wda_utxos_count: 0
        };
    }

    private async fetchBalanceWithRetry(address: string, pubKey: string, maxRetries = 3): Promise<BitcoinBalance> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.getOpNetBalance(address, pubKey);
            } catch (err) {
                lastError = err as Error;

                if (attempt < maxRetries - 1) {
                    // Exponential backoff with jitter
                    const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 5000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError || new Error('Failed to fetch balance after retries');
    }

    /**
     * @throws WalletControllerError
     */
    private getOpNetBalance = async (address: string, pubKey: string): Promise<BitcoinBalance> => {
        let csv75Address = '';
        let csv2Address = '';
        let csv1Address = '';
        let p2wdaAddress = '';

        if (pubKey) {
            const addressInst = Address.fromString(
                '0x0000000000000000000000000000000000000000000000000000000000000000',
                pubKey
            );

            csv75Address = addressInst.toCSV(75, Web3API.network).address;
            csv2Address = addressInst.toCSV(2, Web3API.network).address;
            csv1Address = addressInst.toCSV(1, Web3API.network).address;
            p2wdaAddress = addressInst.p2wda(Web3API.network).address;
        }

        try {
            if (!csv75Address || !csv2Address || !csv1Address || !p2wdaAddress) {
                // Simple balance fetch for non-CSV addresses
                const [allUTXOs, unspentUTXOs] = await Promise.all([
                    Web3API.getAllUTXOsForAddresses([address]),
                    Web3API.getUnspentUTXOsForAddresses([address])
                ]);

                const totalAll = allUTXOs.reduce((sum, u) => sum + u.value, 0n);
                const totalUnspent = unspentUTXOs.reduce((sum, u) => sum + u.value, 0n);
                const pendingAmount = totalAll - totalUnspent;

                // Calculate consolidation amount (first N unspent UTXOs only)
                const consolidationLimit = UTXO_CONFIG.CONSOLIDATION_LIMIT;
                const consolidatableUnspentUTXOs = unspentUTXOs.slice(0, consolidationLimit);
                const consolidationUnspentAmount = consolidatableUnspentUTXOs.reduce((sum, u) => sum + u.value, 0n);

                // Calculate USD value
                let usdValue = '0.00';
                try {
                    const btcPrice = await opnetApi.getBtcPrice();
                    if (btcPrice > 0) {
                        const btcAmount = Number(totalAll) / 100000000;
                        usdValue = (btcAmount * btcPrice).toFixed(2);
                    }
                } catch {
                    // Silently fail - USD value will remain 0.00
                }

                const result = {
                    btc_total_amount: BitcoinUtils.formatUnits(totalAll, 8),
                    btc_confirm_amount: BitcoinUtils.formatUnits(totalUnspent, 8),
                    btc_pending_amount: BitcoinUtils.formatUnits(pendingAmount, 8),

                    csv75_total_amount: '0',
                    csv75_unlocked_amount: '0',
                    csv75_locked_amount: '0',

                    csv2_total_amount: '0',
                    csv2_unlocked_amount: '0',
                    csv2_locked_amount: '0',

                    csv1_total_amount: '0',
                    csv1_unlocked_amount: '0',
                    csv1_locked_amount: '0',

                    p2wda_pending_amount: '0',
                    p2wda_total_amount: '0',

                    consolidation_amount: BitcoinUtils.formatUnits(consolidationUnspentAmount, 8),
                    consolidation_unspent_amount: BitcoinUtils.formatUnits(consolidationUnspentAmount, 8),
                    consolidation_unspent_count: consolidatableUnspentUTXOs.length,
                    consolidation_csv75_unlocked_amount: '0',
                    consolidation_csv75_unlocked_count: 0,
                    consolidation_csv2_unlocked_amount: '0',
                    consolidation_csv2_unlocked_count: 0,
                    consolidation_csv1_unlocked_amount: '0',
                    consolidation_csv1_unlocked_count: 0,
                    consolidation_p2wda_unspent_amount: '0',
                    consolidation_p2wda_unspent_count: 0,

                    usd_value: usdValue,

                    all_utxos_count: allUTXOs.length,
                    unspent_utxos_count: unspentUTXOs.length,
                    csv75_locked_utxos_count: 0,
                    csv75_unlocked_utxos_count: 0,
                    csv2_locked_utxos_count: 0,
                    csv2_unlocked_utxos_count: 0,
                    csv1_locked_utxos_count: 0,
                    csv1_unlocked_utxos_count: 0,
                    p2wda_utxos_count: 0,
                    unspent_p2wda_utxos_count: 0
                };
                return result;
            }

            // Full balance fetch with CSV addresses - using Promise.allSettled for better error handling
            const results = await Promise.allSettled([
                Web3API.getAllUTXOsForAddresses([address]),
                Web3API.getUnspentUTXOsForAddresses([address]),
                Web3API.getTotalLockedAndUnlockedUTXOs(csv75Address, 'csv75'),
                Web3API.getTotalLockedAndUnlockedUTXOs(csv2Address, 'csv2'),
                Web3API.getTotalLockedAndUnlockedUTXOs(csv1Address, 'csv1'),
                Web3API.getAllUTXOsForAddresses([p2wdaAddress]),
                Web3API.getUnspentUTXOsForAddresses([p2wdaAddress])
            ]);

            // Extract results with fallbacks
            const allUTXOs = results[0].status === 'fulfilled' ? results[0].value : [];
            const unspentUTXOs = results[1].status === 'fulfilled' ? results[1].value : [];
            const csv75Data =
                results[2].status === 'fulfilled'
                    ? results[2].value
                    : { utxos: [], unlockedUTXOs: [], lockedUTXOs: [] };
            const csv2Data =
                results[3].status === 'fulfilled'
                    ? results[3].value
                    : { utxos: [], unlockedUTXOs: [], lockedUTXOs: [] };
            const csv1Data =
                results[4].status === 'fulfilled'
                    ? results[4].value
                    : { utxos: [], unlockedUTXOs: [], lockedUTXOs: [] };
            const p2wdaUTXOs = results[5].status === 'fulfilled' ? results[5].value : [];
            const unspentP2WDAUTXOs = results[6].status === 'fulfilled' ? results[6].value : [];

            // Calculate all balances using BigInt
            const totalAll = allUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const totalUnspent = unspentUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const pendingAmount = totalAll - totalUnspent;

            const csv75Total = csv75Data.utxos.reduce((sum, u) => sum + u.value, 0n);
            const csv75Unlocked = csv75Data.unlockedUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const csv75Locked = csv75Total - csv75Unlocked;

            const csv2Total = csv2Data.utxos.reduce((sum, u) => sum + u.value, 0n);
            const csv2Unlocked = csv2Data.unlockedUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const csv2Locked = csv2Total - csv2Unlocked;

            const csv1Total = csv1Data.utxos.reduce((sum, u) => sum + u.value, 0n);
            const csv1Unlocked = csv1Data.unlockedUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const csv1Locked = csv1Total - csv1Unlocked;

            const totalP2WDA = p2wdaUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const totalUnspentP2WDA = unspentP2WDAUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const pendingP2WDA = totalP2WDA - totalUnspentP2WDA;

            const allUTXOsCount = allUTXOs.length;
            const unspentUTXOsCount = unspentUTXOs.length;
            const csv75LockedUTXOsCount = csv75Data.lockedUTXOs.length;
            const csv75UnlockedUTXOsCount = csv75Data.unlockedUTXOs.length;
            const csv2LockedUTXOsCount = csv2Data.lockedUTXOs.length;
            const csv2UnlockedUTXOsCount = csv2Data.unlockedUTXOs.length;
            const csv1LockedUTXOsCount = csv1Data.lockedUTXOs.length;
            const csv1UnlockedUTXOsCount = csv1Data.unlockedUTXOs.length;
            const p2wdaUTXOsCount = p2wdaUTXOs.length;
            const unspentP2wdaUTXOsCount = unspentP2WDAUTXOs.length;

            // Calculate consolidation amounts by type (first N UTXOs of each type)
            const consolidationLimit = UTXO_CONFIG.CONSOLIDATION_LIMIT;

            // Unspent UTXOs (primary account)
            const consolidatableUnspentUTXOs = unspentUTXOs.slice(0, consolidationLimit);
            const consolidationUnspentAmount = consolidatableUnspentUTXOs.reduce((sum, u) => sum + u.value, 0n);

            // CSV75 unlocked UTXOs
            const consolidatableCsv75UnlockedUTXOs = csv75Data.unlockedUTXOs.slice(0, consolidationLimit);
            const consolidationCsv75UnlockedAmount = consolidatableCsv75UnlockedUTXOs.reduce(
                (sum, u) => sum + u.value,
                0n
            );

            // CSV2 unlocked UTXOs
            const consolidatableCsv2UnlockedUTXOs = csv2Data.unlockedUTXOs.slice(0, consolidationLimit);
            const consolidationCsv2UnlockedAmount = consolidatableCsv2UnlockedUTXOs.reduce(
                (sum, u) => sum + u.value,
                0n
            );

            // CSV1 unlocked UTXOs
            const consolidatableCsv1UnlockedUTXOs = csv1Data.unlockedUTXOs.slice(0, consolidationLimit);
            const consolidationCsv1UnlockedAmount = consolidatableCsv1UnlockedUTXOs.reduce(
                (sum, u) => sum + u.value,
                0n
            );

            // P2WDA unspent UTXOs
            const consolidatableP2wdaUnspentUTXOs = unspentP2WDAUTXOs.slice(0, consolidationLimit);
            const consolidationP2wdaUnspentAmount = consolidatableP2wdaUnspentUTXOs.reduce(
                (sum, u) => sum + u.value,
                0n
            );

            // Total consolidation amount (sum of all types)
            const consolidationAmount =
                consolidationUnspentAmount +
                consolidationCsv75UnlockedAmount +
                consolidationCsv2UnlockedAmount +
                consolidationCsv1UnlockedAmount +
                consolidationP2wdaUnspentAmount;

            // Calculate USD value
            let usdValue = '0.00';
            try {
                const btcPrice = await opnetApi.getBtcPrice();
                if (btcPrice > 0) {
                    // Convert satoshis to BTC and multiply by price
                    const btcAmount = Number(totalAll) / 100000000;
                    usdValue = (btcAmount * btcPrice).toFixed(2);
                }
            } catch {
                // Silently fail - USD value will remain 0.00
            }

            // Convert all BigInt values to formatted strings using BitcoinUtils
            const result = {
                btc_total_amount: BitcoinUtils.formatUnits(totalAll, 8),
                btc_confirm_amount: BitcoinUtils.formatUnits(totalUnspent, 8),
                btc_pending_amount: BitcoinUtils.formatUnits(pendingAmount, 8),

                csv75_total_amount: BitcoinUtils.formatUnits(csv75Total, 8),
                csv75_unlocked_amount: BitcoinUtils.formatUnits(csv75Unlocked, 8),
                csv75_locked_amount: BitcoinUtils.formatUnits(csv75Locked, 8),

                csv2_total_amount: BitcoinUtils.formatUnits(csv2Total, 8),
                csv2_unlocked_amount: BitcoinUtils.formatUnits(csv2Unlocked, 8),
                csv2_locked_amount: BitcoinUtils.formatUnits(csv2Locked, 8),

                csv1_total_amount: BitcoinUtils.formatUnits(csv1Total, 8),
                csv1_unlocked_amount: BitcoinUtils.formatUnits(csv1Unlocked, 8),
                csv1_locked_amount: BitcoinUtils.formatUnits(csv1Locked, 8),

                p2wda_pending_amount: BitcoinUtils.formatUnits(pendingP2WDA, 8),
                p2wda_total_amount: BitcoinUtils.formatUnits(totalP2WDA, 8),

                consolidation_amount: BitcoinUtils.formatUnits(consolidationAmount, 8),
                consolidation_unspent_amount: BitcoinUtils.formatUnits(consolidationUnspentAmount, 8),
                consolidation_unspent_count: consolidatableUnspentUTXOs.length,
                consolidation_csv75_unlocked_amount: BitcoinUtils.formatUnits(consolidationCsv75UnlockedAmount, 8),
                consolidation_csv75_unlocked_count: consolidatableCsv75UnlockedUTXOs.length,
                consolidation_csv2_unlocked_amount: BitcoinUtils.formatUnits(consolidationCsv2UnlockedAmount, 8),
                consolidation_csv2_unlocked_count: consolidatableCsv2UnlockedUTXOs.length,
                consolidation_csv1_unlocked_amount: BitcoinUtils.formatUnits(consolidationCsv1UnlockedAmount, 8),
                consolidation_csv1_unlocked_count: consolidatableCsv1UnlockedUTXOs.length,
                consolidation_p2wda_unspent_amount: BitcoinUtils.formatUnits(consolidationP2wdaUnspentAmount, 8),
                consolidation_p2wda_unspent_count: consolidatableP2wdaUnspentUTXOs.length,

                usd_value: usdValue,

                all_utxos_count: allUTXOsCount,
                unspent_utxos_count: unspentUTXOsCount,
                csv75_locked_utxos_count: csv75LockedUTXOsCount,
                csv75_unlocked_utxos_count: csv75UnlockedUTXOsCount,
                csv2_locked_utxos_count: csv2LockedUTXOsCount,
                csv2_unlocked_utxos_count: csv2UnlockedUTXOsCount,
                csv1_locked_utxos_count: csv1LockedUTXOsCount,
                csv1_unlocked_utxos_count: csv1UnlockedUTXOsCount,
                p2wda_utxos_count: p2wdaUTXOsCount,
                unspent_p2wda_utxos_count: unspentP2wdaUTXOsCount
            };
            return result;
        } catch (err) {
            throw new WalletControllerError(`Failed to get OPNET balance: ${String(err)}`, { address });
        }
    };

    private detectEncoding = (str: string): 'hex' | 'base64' => {
        // Hex pattern: only 0-9, a-f, A-F characters, and even length
        const hexPattern = /^[0-9a-fA-F]*$/;

        // Base64 pattern: A-Z, a-z, 0-9, +, /, and optional = padding at the end
        const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;

        // Check if it's valid hex (even length is important for hex)
        if (hexPattern.test(str) && str.length % 2 === 0) {
            return 'hex';
        }

        // Check if it's valid base64
        if (base64Pattern.test(str) && str.length % 4 === 0) {
            return 'base64';
        }

        // Default to hex if unclear (Bitcoin context usually uses hex)
        return 'hex';
    };

    private convertToBuffer = (input: string | Buffer | Record<string, number> | undefined): Buffer | undefined => {
        if (!input) return undefined;

        // Already a Buffer
        if (Buffer.isBuffer(input)) {
            return input;
        }

        // String (assume hex)
        if (typeof input === 'string') {
            const encoding = this.detectEncoding(input);

            try {
                return Buffer.from(input, encoding);
            } catch {
                // If detected encoding fails, try the other one
                const fallbackEncoding = encoding === 'hex' ? 'base64' : 'hex';
                try {
                    return Buffer.from(input, fallbackEncoding);
                } catch {
                    return undefined;
                }
            }
        }

        // Object with numeric keys (like { 0: 72, 1: 101, ... })
        if (typeof input === 'object') {
            try {
                const raw: Record<string, number> = input;
                const len = Math.max(...Object.keys(raw).map((k) => +k)) + 1;
                const buf = Buffer.alloc(len);
                for (const [k, v] of Object.entries(raw)) {
                    buf[+k] = v;
                }
                return buf;
            } catch {
                return undefined;
            }
        }

        return undefined;
    };

    /**
     * Converts UTXO fields to proper format
     */
    private processUTXOFields = (
        utxo: TransactionUTXO & { raw?: string | Buffer }
    ): TransactionUTXO & { raw?: string | Buffer } => {
        return {
            ...utxo,
            value: typeof utxo.value === 'bigint' ? utxo.value : BigInt(utxo.value as unknown as string),
            nonWitnessUtxo: this.convertToBuffer(utxo.nonWitnessUtxo),
            redeemScript: this.convertToBuffer(utxo.redeemScript),
            witnessScript: this.convertToBuffer(utxo.witnessScript),
            raw: this.convertToBuffer(utxo.raw)
        };
    };

    private processOutputFields = (
        output: PsbtOutputExtendedAddress | PsbtOutputExtendedScript
    ): PsbtOutputExtended => {
        const outputFinal: {
            address?: string;
            script?: Buffer;
            value: number;
        } = {
            value: typeof output.value === 'number' ? output.value : Number(output.value as unknown as string)
        };

        if ((output as PsbtOutputExtendedAddress).address) {
            outputFinal.address = (output as PsbtOutputExtendedAddress).address;
        }

        if ((output as PsbtOutputExtendedScript).script) {
            outputFinal.script = this.convertToBuffer((output as PsbtOutputExtendedScript).script) as Buffer;
        }

        return outputFinal as PsbtOutputExtended;
    };

    private signInteractionInternal = async (
        account: Account,
        wallet: Wallet,
        interactionParameters: InteractionParametersWithoutSigner,
        requiredMinimum = 0
    ): Promise<{ response: InteractionResponse; utxos: UTXOs }> => {
        const challenge = await Web3API.provider.getChallenge();

        // Process UTXOs using the new method
        const utxos: UTXOs = interactionParameters.utxos.map(this.processUTXOFields);

        if (requiredMinimum !== 0) {
            const currentTotal = utxos.reduce<bigint>((s, u) => s + u.value, 0n);

            if (currentTotal < BigInt(requiredMinimum)) {
                const stillNeeded = BigInt(requiredMinimum) - currentTotal;

                const fetched: UTXOs = await Web3API.getAllUTXOsForAddresses([account.address], stillNeeded);
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

        // Process optional inputs using the new method
        const optionalInputs = interactionParameters.optionalInputs?.map(this.processUTXOFields) || [];
        const optionalOutputs = interactionParameters.optionalOutputs?.map(this.processOutputFields) || [];

        const submit: IInteractionParameters = {
            from: interactionParameters.from,
            to: interactionParameters.to,
            challenge,
            utxos,
            signer: wallet.keypair,
            mldsaSigner: wallet.mldsaKeypair,
            network: Web3API.network,
            feeRate: interactionParameters.feeRate,
            priorityFee: BigInt((interactionParameters.priorityFee as unknown as string) || 0n),
            gasSatFee: BigInt((interactionParameters.gasSatFee as unknown as string) || 330n),
            calldata: Buffer.from(interactionParameters.calldata as unknown as string, 'hex'),
            optionalInputs,
            optionalOutputs,
            contract: interactionParameters.contract,
            note: interactionParameters.note,
            linkMLDSAPublicKeyToAddress: true
        };

        const response = await Web3API.transactionFactory.signInteraction(submit);
        return { response, utxos };
    };

    /**
     * Retrieve a keyring by type if it exists; else throw.
     * @throws WalletControllerError if no matching keyring found
     */
    private _getKeyringByType = (type: string): Keyring | EmptyKeyring => {
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

        // If pubKey exists, include CSV addresses in the key
        if (pubKey) {
            const addressInst = Address.fromString(
                '0x0000000000000000000000000000000000000000000000000000000000000000',
                pubKey
            );

            const csv75 = addressInst.toCSV(75, Web3API.network).address;
            const csv2 = addressInst.toCSV(2, Web3API.network).address;
            const csv1 = addressInst.toCSV(1, Web3API.network).address;
            const p2wda = addressInst.p2wda(Web3API.network).address;
            return `${chainType}:${address}:${csv75}:${csv2}:${csv1}:${p2wda}`;
        }

        // No pubKey = simple balance only
        return `${chainType}:${address}:simple`;
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

    };

    /**
     * Record a transaction in the history
     */
    public recordTransaction = async (
        params: RecordTransactionInput,
        origin: TransactionOrigin = { type: 'internal' }
    ): Promise<void> => {
        try {
            const account = await this.getCurrentAccount();
            if (!account) {
                console.warn('[WalletController] Cannot record transaction: no current account');
                return;
            }

            const chainType = this.getChainType();

            await transactionHistoryService.addTransaction(chainType, account.pubkey, {
                ...params,
                origin
            });

            // Trigger immediate status poll
            void transactionStatusPoller.pollNow();

            console.log(`[WalletController] Recorded transaction: ${params.txid} (${params.type})`);
        } catch (error) {
            console.error('[WalletController] Failed to record transaction:', error);
            // Don't throw - transaction recording failure shouldn't break the main flow
        }
    };

    /**
     * Get transaction history for current account
     */
    public getTransactionHistory = async (): Promise<
        import('@/shared/types/TransactionHistory').TransactionHistoryItem[]
    > => {
        const account = await this.getCurrentAccount();
        if (!account) {
            return [];
        }

        const chainType = this.getChainType();
        return transactionHistoryService.getHistory(chainType, account.pubkey);
    };

    /**
     * Get filtered transaction history for current account
     */
    public getFilteredTransactionHistory = async (
        filter?: import('@/shared/types/TransactionHistory').TransactionHistoryFilter
    ): Promise<import('@/shared/types/TransactionHistory').TransactionHistoryItem[]> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            return [];
        }

        const chainType = this.getChainType();
        return transactionHistoryService.getFilteredHistory(chainType, account.pubkey, filter);
    };

    /**
     * Clear transaction history for current account
     */
    public clearTransactionHistory = async (): Promise<void> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            return;
        }

        const chainType = this.getChainType();
        await transactionHistoryService.clearHistory(chainType, account.pubkey);
    };

    // =========================================================================
    // OPNet Browser / Protocol Methods
    // =========================================================================

    /**
     * Get OPNet browser settings
     */
    public getOpnetBrowserSettings = (): OpnetBrowserSettings => {
        return opnetProtocolService.getBrowserSettings();
    };

    /**
     * Update OPNet browser settings
     */
    public setOpnetBrowserSettings = async (settings: Partial<OpnetBrowserSettings>): Promise<void> => {
        await opnetProtocolService.setBrowserSettings(settings);
    };

    /**
     * Get OPNet cache settings
     */
    public getOpnetCacheSettings = (): OpnetCacheSettings => {
        return opnetProtocolService.getCacheSettings();
    };

    /**
     * Update OPNet cache settings
     */
    public updateOpnetCacheSettings = async (settings: Partial<OpnetCacheSettings>): Promise<void> => {
        await opnetProtocolService.updateCacheSettings(settings);
    };

    /**
     * Get OPNet cache statistics
     */
    public getOpnetCacheStats = (): OpnetCacheStats => {
        return opnetProtocolService.getCacheStats();
    };

    /**
     * Clear OPNet cache
     */
    public clearOpnetCache = async (): Promise<void> => {
        await opnetProtocolService.clearCache();
    };

    /**
     * Get IPFS gateways with health status
     */
    public getOpnetGateways = (): { config: GatewayConfig; health: GatewayHealth }[] => {
        return opnetProtocolService.getGateways();
    };

    /**
     * Add a custom IPFS gateway
     */
    public addOpnetGateway = async (url: string): Promise<void> => {
        await opnetProtocolService.addGateway(url);
    };

    /**
     * Remove a custom IPFS gateway
     */
    public removeOpnetGateway = async (url: string): Promise<void> => {
        await opnetProtocolService.removeGateway(url);
    };

    /**
     * Refresh IPFS gateway health status
     */
    public refreshOpnetGateways = async (): Promise<void> => {
        await opnetProtocolService.refreshGateways();
    };

    /**
     * Resolve a .btc domain to a P2TR address
     * @param domain - The .btc domain (with or without .btc suffix)
     * @returns The P2TR address of the domain owner, or null if not found
     */
    public resolveBtcDomain = async (domain: string): Promise<string | null> => {
        try {
            // Normalize domain - remove .btc suffix if present for the resolver
            const normalizedDomain = domain.toLowerCase().replace(/\.btc$/, '');

            const resolverAddress = Web3API.btcResolverAddressP2OP;
            if (!resolverAddress) {
                console.error('BtcNameResolver contract not configured for this network');
                return null;
            }

            const resolverContract = getContract<IBtcNameResolverContract>(
                resolverAddress,
                BTC_NAME_RESOLVER_ABI,
                Web3API.provider,
                Web3API.network
            );

            // Use the simple resolve method that just returns the owner
            const result = await resolverContract.resolve(normalizedDomain);
            const ownerAddress = result.properties.owner;

            // Check if owner is empty/zero address
            if (!ownerAddress || ownerAddress.isDead()) {
                return null;
            }

            const publicOwner = await Web3API.provider.getPublicKeyInfo(ownerAddress.toHex(), false);

            // Convert to P2TR address
            return publicOwner.p2tr(Web3API.network);
        } catch (error) {
            console.error('Failed to resolve .btc domain:', error);
            return null;
        }
    };

    /**
     * Get .btc domain information including availability, owner, and price
     */
    public getBtcDomainInfo = async (
        domainName: string
    ): Promise<{
        exists: boolean;
        owner: string | null;
        price: bigint;
        treasuryAddress: string;
    }> => {
        const normalizedDomain = domainName.toLowerCase().replace(/\.btc$/, '');

        const resolverAddress = Web3API.btcResolverAddressP2OP;
        if (!resolverAddress) {
            throw new WalletControllerError('BtcNameResolver contract not configured for this network');
        }

        const resolverContract = getContract<IBtcNameResolverContract>(
            resolverAddress,
            BTC_NAME_RESOLVER_ABI,
            Web3API.provider,
            Web3API.network
        );

        // Get domain info
        const domainResult = await resolverContract.getDomain(normalizedDomain);
        const exists = domainResult.properties.exists;

        let owner: string | null = null;
        if (exists && domainResult.properties.owner && !domainResult.properties.owner.isDead()) {
            try {
                const publicOwner = await Web3API.provider.getPublicKeyInfo(
                    domainResult.properties.owner.toHex(),
                    false
                );
                owner = publicOwner.p2tr(Web3API.network);
            } catch {
                owner = domainResult.properties.owner.toHex();
            }
        }

        // Get price for this domain
        const priceResult = await resolverContract.getDomainPrice(normalizedDomain);
        const price = priceResult.properties.priceSats;

        // Get treasury address
        const treasuryResult = await resolverContract.getTreasuryAddress();
        const treasuryAddress = treasuryResult.properties.treasuryAddress;

        return { exists, owner, price, treasuryAddress };
    };

    /**
     * Upload a file to IPFS via ipfs.opnet.org
     * Returns the CID of the uploaded file
     */
    public uploadToIpfs = async (fileData: string, fileName: string): Promise<string> => {
        // Convert base64 data to binary
        const base64Data = fileData.split(',')[1] || fileData;
        const binaryData = Buffer.from(base64Data, 'base64');

        // Use ipfs.opnet.org pinning endpoint
        const pinEndpoint = 'https://ipfs.opnet.org/api/v0/add';

        const formData = new FormData();
        const blob = new Blob([binaryData], { type: 'text/html' });
        formData.append('file', blob, fileName);

        const response = await fetch(pinEndpoint, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new WalletControllerError('Failed to upload to IPFS');
        }

        const result = (await response.json()) as { Hash?: string; cid?: string };
        return result.Hash ?? result.cid ?? '';
    };

    /**
     * Get tracked domains for the current account
     */
    public getTrackedDomains = async (): Promise<
        Array<{
            name: string;
            registeredAt?: number;
            lastVerified?: number;
            isOwner: boolean;
        }>
    > => {
        const account = preferenceService.getCurrentAccount();
        if (!account?.address) return [];

        const trackedDomains = preferenceService.getTrackedDomains(account.address);
        const results = [];

        // Verify ownership for each domain
        for (const domain of trackedDomains) {
            try {
                const info = await this.getBtcDomainInfo(domain.name);
                const isOwner = info.owner?.toLowerCase() === account.address.toLowerCase();

                // Update verification timestamp if still owner
                if (isOwner) {
                    await preferenceService.updateTrackedDomainVerification(account.address, domain.name);
                }

                results.push({
                    name: domain.name,
                    registeredAt: domain.registeredAt,
                    lastVerified: Date.now(),
                    isOwner
                });
            } catch {
                // If verification fails, still show domain but mark as unverified
                results.push({
                    name: domain.name,
                    registeredAt: domain.registeredAt,
                    lastVerified: domain.lastVerified,
                    isOwner: false
                });
            }
        }

        return results;
    };

    /**
     * Add a domain to track
     */
    public addTrackedDomain = async (domainName: string): Promise<void> => {
        const account = preferenceService.getCurrentAccount();
        if (!account?.address) throw new WalletControllerError('No account selected');

        const normalizedDomain = domainName.toLowerCase().replace(/\.btc$/, '');

        // Verify ownership before adding
        const info = await this.getBtcDomainInfo(normalizedDomain);
        if (!info.exists) {
            throw new WalletControllerError('Domain does not exist');
        }
        if (info.owner?.toLowerCase() !== account.address.toLowerCase()) {
            throw new WalletControllerError('You do not own this domain');
        }

        await preferenceService.addTrackedDomain(account.address, {
            name: normalizedDomain,
            registeredAt: Date.now(),
            lastVerified: Date.now()
        });
    };

    /**
     * Remove a tracked domain
     */
    public removeTrackedDomain = async (domainName: string): Promise<void> => {
        const account = preferenceService.getCurrentAccount();
        if (!account?.address) throw new WalletControllerError('No account selected');

        const normalizedDomain = domainName.toLowerCase().replace(/\.btc$/, '');
        await preferenceService.removeTrackedDomain(account.address, normalizedDomain);
    };

    /**
     * Get pending domain transfer info
     */
    public getPendingDomainTransfer = async (
        domainName: string
    ): Promise<{
        newOwner: string | null;
        initiatedAt: bigint;
    }> => {
        const normalizedDomain = domainName.toLowerCase().replace(/\.btc$/, '');

        const resolverAddress = Web3API.btcResolverAddressP2OP;
        if (!resolverAddress) {
            throw new WalletControllerError('BtcNameResolver contract not configured for this network');
        }

        const resolverContract = getContract<IBtcNameResolverContract>(
            resolverAddress,
            BTC_NAME_RESOLVER_ABI,
            Web3API.provider,
            Web3API.network
        );

        // Get pending transfer info
        const pendingResult = await resolverContract.getPendingTransfer(normalizedDomain);

        let newOwner: string | null = null;
        if (pendingResult.properties.pendingOwner && !pendingResult.properties.pendingOwner.isDead()) {
            try {
                const publicOwner = await Web3API.provider.getPublicKeyInfo(
                    pendingResult.properties.pendingOwner.toHex(),
                    false
                );
                if (publicOwner) {
                    newOwner = publicOwner.p2tr(Web3API.network);
                }
            } catch {
                // Fallback to just using the hash if we can't resolve the address
                newOwner = pendingResult.properties.pendingOwner.toHex();
            }
        }

        return {
            newOwner,
            initiatedAt: pendingResult.properties.initiatedAt
        };
    };

    // ==================== ADDRESS ROTATION MODE ====================

    /**
     * Check if rotation mode is supported for current keyring (HD wallets only)
     */
    public isRotationModeSupported = async (): Promise<boolean> => {
        const keyring = await this.getCurrentKeyring();
        return keyring?.type === KEYRING_TYPE.HdKeyring;
    };

    /**
     * Check if rotation mode is enabled for current account
     */
    public isRotationModeEnabled = async (): Promise<boolean> => {
        const account = await this.getCurrentAccount();
        if (!account) return false;
        return addressRotationService.isRotationEnabled(account.pubkey);
    };

    /**
     * Enable rotation mode for current account
     */
    public enableRotationMode = async (): Promise<AddressRotationState> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();

        if (!account || !keyring) {
            throw new WalletControllerError('No current account or keyring');
        }

        if (keyring.type !== KEYRING_TYPE.HdKeyring) {
            throw new WalletControllerError('Rotation mode only supported for HD wallets');
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        return addressRotationService.enableRotationMode(keyring.index, account.pubkey, network);
    };

    /**
     * Disable rotation mode for current account
     */
    public disableRotationMode = async (): Promise<void> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        await addressRotationService.disableRotationMode(account.pubkey);
    };

    /**
     * Get current hot wallet address for receiving
     */
    public getCurrentHotAddress = async (): Promise<RotatedAddress | null> => {
        const account = await this.getCurrentAccount();
        if (!account) return null;

        return addressRotationService.getCurrentHotAddress(account.pubkey);
    };

    /**
     * Manually rotate to next address
     */
    public rotateToNextAddress = async (): Promise<RotatedAddress> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();

        if (!account || !keyring) {
            throw new WalletControllerError('No current account or keyring');
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        return addressRotationService.deriveNextHotAddress(keyring.index, account.pubkey, network);
    };

    public getRotationModeSummary = async (): Promise<RotationModeSummary | null> => {
        const account = await this.getCurrentAccount();
        if (!account) return null;

        return addressRotationService.getRotationSummary(account.pubkey);
    };

    public getRotationHistory = async (): Promise<RotatedAddress[]> => {
        const account = await this.getCurrentAccount();
        if (!account) return [];

        return addressRotationService.getRotationHistory(account.pubkey);
    };

    public getRotationModeBalance = async (): Promise<BitcoinBalance> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();

        if (!account || !keyring) {
            return this.getEmptyBalance();
        }

        const rotationEnabled = addressRotationService.isRotationEnabled(account.pubkey);
        if (!rotationEnabled) {
            return this.getEmptyBalance();
        }

        try {
            await Web3API.setNetwork(this.getChainType());
            const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());

            const coldAddress = addressRotationService.getColdWalletAddress(keyring.index, network);
            const history = addressRotationService.getRotationHistory(account.pubkey);
            const hotAddresses = history.map((h) => h.address);

            const allAddresses = [coldAddress, ...hotAddresses];

            const [allUTXOs, unspentUTXOs] = await Promise.all([
                Web3API.getAllUTXOsForAddresses(allAddresses),
                Web3API.getUnspentUTXOsForAddresses(allAddresses)
            ]);

            const totalAll = allUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const totalUnspent = unspentUTXOs.reduce((sum, u) => sum + u.value, 0n);
            const pendingAmount = totalAll - totalUnspent;

            let usdValue = '0.00';
            try {
                const btcPrice = await opnetApi.getBtcPrice();
                if (btcPrice > 0) {
                    const btcAmount = Number(totalAll) / 100000000;
                    usdValue = (btcAmount * btcPrice).toFixed(2);
                }
            } catch {
                // Silently fail
            }

            return {
                btc_total_amount: BitcoinUtils.formatUnits(totalAll, 8),
                btc_confirm_amount: BitcoinUtils.formatUnits(totalUnspent, 8),
                btc_pending_amount: BitcoinUtils.formatUnits(pendingAmount, 8),

                csv75_total_amount: '0',
                csv75_unlocked_amount: '0',
                csv75_locked_amount: '0',
                csv2_total_amount: '0',
                csv2_unlocked_amount: '0',
                csv2_locked_amount: '0',
                csv1_total_amount: '0',
                csv1_unlocked_amount: '0',
                csv1_locked_amount: '0',
                p2wda_pending_amount: '0',
                p2wda_total_amount: '0',

                consolidation_amount: '0',
                consolidation_unspent_amount: '0',
                consolidation_unspent_count: 0,
                consolidation_csv75_unlocked_amount: '0',
                consolidation_csv75_unlocked_count: 0,
                consolidation_csv2_unlocked_amount: '0',
                consolidation_csv2_unlocked_count: 0,
                consolidation_csv1_unlocked_amount: '0',
                consolidation_csv1_unlocked_count: 0,
                consolidation_p2wda_unspent_amount: '0',
                consolidation_p2wda_unspent_count: 0,

                usd_value: usdValue,

                all_utxos_count: allUTXOs.length,
                unspent_utxos_count: unspentUTXOs.length,
                csv75_locked_utxos_count: 0,
                csv75_unlocked_utxos_count: 0,
                csv2_locked_utxos_count: 0,
                csv2_unlocked_utxos_count: 0,
                csv1_locked_utxos_count: 0,
                csv1_unlocked_utxos_count: 0,
                p2wda_utxos_count: 0,
                unspent_p2wda_utxos_count: 0
            };
        } catch (err) {
            console.error('[getRotationModeBalance] Error:', err);
            return this.getEmptyBalance();
        }
    };


    public refreshRotationBalances = async (): Promise<void> => {
        const account = await this.getCurrentAccount();
        if (!account) return;

        await addressRotationService.refreshAddressBalances(account.pubkey, this.getChainType());
    };

    /**
     * Prepare consolidation transaction (gather UTXOs from hot addresses to cold)
     */
    public prepareConsolidation = async (feeRate: number): Promise<ConsolidationParams> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();

        if (!account || !keyring) {
            throw new WalletControllerError('No current account or keyring');
        }

        return addressRotationService.prepareConsolidation(keyring.index, account.pubkey, feeRate);
    };

    /**
     * Execute consolidation to cold storage using TransactionFactory with addressRotation
     */
    public executeConsolidation = async (feeRate: number): Promise<ConsolidationResult> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();

        if (!account || !keyring) {
            throw new WalletControllerError('No current account or keyring');
        }

        try {
            // Get the bitcoin network
            const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());

            // Get addresses with balance for consolidation
            const sourceAddresses = addressRotationService.getAddressesForConsolidation(account.pubkey);
            if (sourceAddresses.length === 0) {
                throw new WalletControllerError('No funds to consolidate');
            }

            // Get cold wallet address
            const coldAddress = addressRotationService.getColdWalletAddress(keyring.index, network);

            // Fetch UTXOs from all source addresses
            const addressList = sourceAddresses.map((a) => a.address);
            await Web3API.setNetwork(this.getChainType());
            const allUtxos = await Web3API.getAllUTXOsForAddresses(addressList);

            if (allUtxos.length === 0) {
                throw new WalletControllerError('No UTXOs found to consolidate');
            }

            // Calculate total input value
            const totalInputValue = allUtxos.reduce((sum, u) => sum + u.value, 0n);

            // Get the consolidation keyring with all needed derivation indices
            const consolidationKeyring = addressRotationService.getConsolidationKeyring(
                keyring.index,
                account.pubkey,
                network
            );

            // Build signer map: address -> keypair for each source address
            const signerPairs: Array<readonly [string, ECPairInterface]> = [];
            let primaryWallet: Wallet | null = null;

            for (const addr of sourceAddresses) {
                const wallet = consolidationKeyring.getWallet(addr.pubkey);
                if (!wallet) {
                    throw new WalletControllerError(`Failed to get wallet for address ${addr.address}`);
                }
                signerPairs.push([addr.address, wallet.keypair] as const);

                // Use first wallet as primary signer (required by interface)
                if (!primaryWallet) {
                    primaryWallet = wallet;
                }
            }

            if (!primaryWallet) {
                throw new WalletControllerError('No wallets available for consolidation');
            }

            // Create address rotation config with signer map
            const addressRotation = createAddressRotation(signerPairs);

            // Estimate fees: ~68 vbytes per P2TR input, ~43 vbytes for output, ~12 overhead
            const estimatedVSize = BigInt(12 + allUtxos.length * 68 + 43);
            const estimatedFee = estimatedVSize * BigInt(feeRate);

            // Calculate output amount with 20% fee buffer
            const feeBuffer = (estimatedFee * 120n) / 100n;
            const outputAmount = totalInputValue - feeBuffer;

            if (outputAmount <= 0n) {
                throw new WalletControllerError('Consolidation amount too small to cover fees');
            }

            // Build funding transaction parameters
            // Set 'from' to cold address so any change also goes to cold storage
            const fundingParams: IFundingTransactionParameters = {
                amount: outputAmount,
                utxos: allUtxos,
                signer: primaryWallet.keypair,
                mldsaSigner: primaryWallet.mldsaKeypair,
                network: Web3API.network,
                feeRate: feeRate,
                priorityFee: 0n,
                gasSatFee: 0n,
                to: coldAddress,
                from: coldAddress, // Change also goes to cold storage
                addressRotation: addressRotation
            };

            // Create and sign the consolidation transaction using TransactionFactory
            const signedTx = await Web3API.transactionFactory.createBTCTransfer(fundingParams);

            // Broadcast the transaction
            const txid = await this.pushTx(signedTx.tx);

            // Calculate actual fee from the transaction
            const actualFee = signedTx.estimatedFees;
            const consolidatedAmount = (totalInputValue - actualFee).toString();

            // Mark addresses as consolidated
            await addressRotationService.markConsolidated(
                account.pubkey,
                addressList,
                consolidatedAmount
            );

            return {
                success: true,
                txid,
                consolidatedAmount,
                fee: actualFee.toString(),
                sourceAddressCount: sourceAddresses.length
            };
        } catch (error) {
            return {
                success: false,
                error: String(error),
                consolidatedAmount: '0',
                fee: '0',
                sourceAddressCount: 0
            };
        }
    };

    /**
     * Update rotation mode settings
     */
    public updateRotationSettings = async (settings: RotationModeUpdateSettings): Promise<void> => {
        const account = await this.getCurrentAccount();
        if (!account) throw new WalletControllerError('No current account');

        const state = addressRotationService.getRotationState(account.pubkey);
        if (!state) throw new WalletControllerError('Rotation mode not enabled');

        const updates: Partial<AddressRotationState> = {};
        if (settings.autoRotate !== undefined) {
            updates.autoRotate = settings.autoRotate;
        }
        if (settings.rotationThreshold !== undefined) {
            updates.rotationThreshold = settings.rotationThreshold;
        }

        await addressRotationService.updateRotationState(account.pubkey, updates);
    };

    /**
     * Get the cold wallet address (INTERNAL - for consolidation only)
     */
    public getColdWalletAddress = async (): Promise<string> => {
        const keyring = await this.getCurrentKeyring();
        if (!keyring) {
            throw new WalletControllerError('No current keyring');
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        return addressRotationService.getColdWalletAddress(keyring.index, network);
    };

    /**
     * Get the next unused rotation address for change outputs
     */
    public getNextUnusedRotationAddress = async (): Promise<string> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();
        if (!keyring || !account) {
            throw new WalletControllerError('No current keyring or account');
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        return addressRotationService.getNextUnusedRotationAddress(keyring.index, account.pubkey, network);
    };

    /**
     * Get cold storage wallet data for transaction signing
     * Returns [wif, mldsaPrivateKey, chainCode, pubkey]
     */
    public getColdStorageWallet = async (): Promise<[string, string, string, string]> => {
        const keyring = await this.getCurrentKeyring();
        if (!keyring) {
            throw new Error('No current keyring');
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        const coldKeyring = addressRotationService.getColdWalletKeyring(keyring.index, network);
        const coldAccounts = coldKeyring.getAccounts();

        if (!coldAccounts[0]) {
            throw new Error('Failed to get cold wallet account');
        }

        const wallet = coldKeyring.getWallet(coldAccounts[0]);
        if (!wallet) {
            throw new Error('Failed to get cold wallet');
        }

        const wif = wallet.keypair.toWIF();
        const mldsaPrivateKey = wallet.mldsaKeypair?.privateKey?.toString('hex') || '';
        const chainCode = Buffer.from(wallet.chainCode).toString('hex');

        return [wif, mldsaPrivateKey, chainCode, coldAccounts[0]];
    };

    /**
     * Get the next unused rotation wallet with full data for signing
     * Returns { address, pubkey, wif, mldsaPrivateKey, chainCode, derivationIndex }
     */
    public getNextUnusedRotationWallet = async (): Promise<{
        address: string;
        pubkey: string;
        wif: string;
        mldsaPrivateKey: string;
        chainCode: string;
        derivationIndex: number;
    }> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();
        if (!keyring || !account) {
            throw new WalletControllerError('No current keyring or account');
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        return addressRotationService.getNextUnusedRotationWallet(keyring.index, account.pubkey, network);
    };

    /**
     * Register change address after cold storage withdrawal
     */
    public registerColdStorageChangeAddress = async (): Promise<void> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();
        if (!keyring || !account) {
            throw new Error('No current keyring or account');
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        await addressRotationService.deriveNextHotAddress(keyring.index, account.pubkey, network);
    };

    /**
     * Get wallet data for consolidation signers
     * Returns [wif, pubkey, mldsaPrivateKey, chainCode] for each source pubkey
     */
    public getConsolidationWallets = async (
        sourcePubkeys: string[]
    ): Promise<Array<[string, string, string, string]>> => {
        const account = await this.getCurrentAccount();
        const keyring = await this.getCurrentKeyring();

        if (!account || !keyring) {
            throw new Error('No current account or keyring');
        }

        const network = getBitcoinLibJSNetwork(this.getNetworkType(), this.getChainType());
        const consolidationKeyring = addressRotationService.getConsolidationKeyring(
            keyring.index,
            account.pubkey,
            network
        );

        const results: Array<[string, string, string, string]> = [];

        for (const pubkey of sourcePubkeys) {
            const wallet = consolidationKeyring.getWallet(pubkey);
            if (!wallet) {
                throw new Error(`Failed to get wallet for pubkey ${pubkey}`);
            }

            const wif = wallet.keypair.toWIF();
            const mldsaPrivateKey = wallet.mldsaKeypair?.privateKey?.toString('hex') || '';
            const chainCode = Buffer.from(wallet.chainCode).toString('hex');
            results.push([wif, pubkey, mldsaPrivateKey, chainCode]);
        }

        return results;
    };

    /**
     * Mark addresses as consolidated after successful broadcast
     */
    public markAddressesConsolidated = async (addresses: string[], consolidatedAmount: string): Promise<void> => {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new Error('No current account');
        }

        await addressRotationService.markConsolidated(account.pubkey, addresses, consolidatedAmount);
    };
}

// Export a single instance.
export default new WalletController();
