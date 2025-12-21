import { ContactBookItem, ContactBookStore } from '@/background/service/contactBook';
import { SavedVault, ToSignInput } from '@/background/service/keyring';
import { PreSignedTransactionData, SerializedPreSignedInteractionData } from '@/background/service/notification';
import { ConnectedSite } from '@/background/service/permission';
import { AddressFlagType, ChainId, ChainType, CustomNetwork } from '@/shared/constant';
import {
    ConflictResolutionChoice,
    DuplicationDetectionResult,
    DuplicationState,
    OnChainLinkageInfo
} from '@/shared/types/Duplication';
import {
    Account,
    AddressSummary,
    AddressTypes,
    AppSummary,
    BitcoinBalance,
    DecodedPsbt,
    NetworkType,
    ParsedSignMsgUr,
    ParsedSignPsbtUr,
    SignPsbtOptions,
    TxHistoryItem,
    UnspentOutput,
    VersionDetail,
    WalletConfig,
    WalletKeyring
} from '@/shared/types';
import { ApprovalData, ApprovalResponse } from '@/shared/types/Approval';
import {
    GatewayConfig,
    GatewayHealth,
    OpnetBrowserSettings,
    OpnetCacheSettings,
    OpnetCacheStats
} from '@/shared/types/OpnetProtocol';
import { TransactionHistoryFilter, TransactionHistoryItem } from '@/shared/types/TransactionHistory';
import { Psbt } from '@btc-vision/bitcoin';
import { InteractionParametersWithoutSigner } from '@btc-vision/transaction';
import { createContext, ReactNode, useContext } from 'react';

export interface WalletController {
    changePassword: (password: string, newPassword: string) => Promise<void>;
    getAllAlianName: () => (ContactBookItem | undefined)[];
    getContactsByMap: () => ContactBookStore;
    updateAlianName: (pubkey: string, name: string) => Promise<void>;
    getNextAlianName: (keyring: WalletKeyring) => Promise<string>;
    getAddressHistory: (params: {
        address: string;
        start: number;
        limit: number;
    }) => Promise<{ start: number; total: number; detail: TxHistoryItem[] }>;

    getAddressCacheHistory: (address: string) => Promise<TxHistoryItem[]>;

    boot(password: string): Promise<void>;

    isBooted(): Promise<boolean>;

    getApproval(): Promise<ApprovalData | undefined>;

    resolveApproval(
        data?: ApprovalResponse,
        interactionParametersToUse?: InteractionParametersWithoutSigner,
        forceReject?: boolean
    ): Promise<void>;

    rejectApproval(err?: string, stay?: boolean, isInternal?: boolean): Promise<void>;

    hasVault(): Promise<boolean>;

    verifyPassword(password: string): Promise<void>;

    unlock(password: string): Promise<void>;

    isUnlocked(): Promise<boolean>;

    lockWallet(): Promise<void>;

    setPopupOpen(isOpen: boolean): void;

    isReady(): Promise<boolean>;

    getAddressBalance(address: string, pubKey?: string): Promise<BitcoinBalance>;

    getMultiAddressAssets(addresses: string): Promise<AddressSummary[]>;

    getLocale(): Promise<string>;

    setLocale(locale: string): Promise<void>;

    getCurrency(): Promise<string>;

    setCurrency(currency: string): Promise<void>;

    clearKeyrings(): Promise<void>;

    getPrivateKey(
        password: string,
        account: { address: string; type: string }
    ): Promise<{ hex: string; wif: string } | null>;

    getInternalPrivateKey(account: { pubkey: string; type: string }): Promise<{ hex: string; wif: string }>;

    getOPNetWallet(): Promise<[string, string, string]>;

    getWalletAddress(): Promise<[string, string]>;

    getMnemonics(
        password: string,
        keyring: WalletKeyring
    ): Promise<{ mnemonic: string | undefined; hdPath: string | undefined; passphrase: string | undefined }>;

    createKeyringWithPrivateKey(
        data: string,
        addressType: AddressTypes,
        quantumPrivateKey: string,
        alianName?: string
    ): Promise<Account[]>;

    getPreMnemonics(): Promise<SavedVault[] | null>;

    generatePreMnemonic(): Promise<string>;

    removePreMnemonics(): void;

    createKeyringWithMnemonics(
        mnemonic: string,
        hdPath: string,
        passphrase: string,
        addressType: AddressTypes,
        accountCount: number
    ): Promise<{ address: string; type: string }[]>;

    createKeyringWithKeystone(
        urType: string,
        urCbor: string,
        addressType: AddressTypes,
        hdPath: string,
        accountCount: number,
        filterPubkey?: string[]
    ): Promise<{ address: string; type: string }[]>;

    createTmpKeyringWithPrivateKey(privateKey: string, addressType: AddressTypes): Promise<WalletKeyring>;

    createTmpKeyringWithKeystone(
        urType: string,
        urCbor: string,
        addressType: AddressTypes,
        hdPath: string,
        accountCount?: number
    ): Promise<WalletKeyring>;

    createTmpKeyringWithMnemonics(
        mnemonic: string,
        hdPath: string,
        passphrase: string,
        addressType: AddressTypes,
        accountCount?: number
    ): Promise<WalletKeyring>;

    removeKeyring(keyring: WalletKeyring): Promise<WalletKeyring>;

    deriveNewAccountFromMnemonic(keyring: WalletKeyring, alianName?: string): Promise<string[]>;

    getAccountsCount(): Promise<number>;

    getCurrentAccount(): Promise<Account>;

    getAccounts(): Promise<Account[]>;

    getCurrentKeyringAccounts(): Promise<Account[]>;

    signTransaction(psbt: Psbt, inputs: ToSignInput[]): Promise<Psbt>;

    signPsbtWithHex(psbtHex: string, toSignInputs: ToSignInput[], autoFinalized: boolean): Promise<string>;

    sendBTC(data: {
        to: string;
        amount: number;
        btcUtxos: UnspentOutput[];
        feeRate: number;
        enableRBF: boolean;
        memo?: string;
        memos?: string[];
    }): Promise<string>;

    sendAllBTC(data: { to: string; btcUtxos: UnspentOutput[]; feeRate: number; enableRBF: boolean }): Promise<string>;

    pushTx(rawtx: string): Promise<string>;

    getAppSummary(): Promise<AppSummary>;

    getBTCUtxos(): Promise<UnspentOutput[]>;

    getUnavailableUtxos(): Promise<UnspentOutput[]>;

    getNetworkType(): Promise<NetworkType>;

    setNetworkType(type: NetworkType): Promise<void>;

    getChainType(): Promise<ChainType>;

    setChainType(type: ChainType): Promise<void>;

    getConnectedSites(): Promise<ConnectedSite[]>;

    removeConnectedSite(origin: string): Promise<void>;

    getCurrentConnectedSite(id: string): Promise<ConnectedSite>;

    getCurrentKeyring(): Promise<WalletKeyring>;

    getKeyrings(): Promise<WalletKeyring[]>;

    changeKeyring(keyring: WalletKeyring, accountIndex?: number): Promise<void>;

    setKeyringAlianName(keyring: WalletKeyring, name: string): Promise<WalletKeyring>;

    changeAddressType(addressType: AddressTypes): Promise<void>;

    setAccountAlianName(account: Account, name: string): Promise<Account>;

    getBtcPrice(): Promise<number>;

    setEditingKeyring(keyringIndex: number): Promise<void>;

    getEditingKeyring(): Promise<WalletKeyring>;

    setEditingAccount(account: Account): Promise<void>;

    getEditingAccount(): Promise<Account>;

    decodePsbt(psbtHex: string): Promise<DecodedPsbt>;

    createPaymentUrl(address: string, channel: string): Promise<string>;

    getWalletConfig(): Promise<WalletConfig>;

    getSkippedVersion(): Promise<string>;

    setSkippedVersion(version: string): Promise<void>;

    checkWebsite(website: string): Promise<{ isScammer: boolean; warning: string }>;

    readTab(tabName: string): Promise<void>;

    readApp(appid: number): Promise<void>;

    formatOptionsToSignInputs(psbtHex: string, options?: SignPsbtOptions): Promise<ToSignInput[]>;

    getAddressSummary(address: string): Promise<AddressSummary>;

    getShowSafeNotice(): Promise<boolean>;

    setShowSafeNotice(show: boolean): Promise<void>;

    getMldsaBackupDismissed(pubkey: string): Promise<boolean>;

    setMldsaBackupDismissed(pubkey: string, dismissed: boolean): Promise<void>;

    // address flag
    addAddressFlag(account: Account, flag: AddressFlagType): Promise<Account>;

    removeAddressFlag(account: Account, flag: AddressFlagType): Promise<Account>;

    getVersionDetail(version: string): Promise<VersionDetail>;

    genSignPsbtUr(psbtHex: string): Promise<{ type: string; cbor: string }>;

    parseSignPsbtUr(type: string, cbor: string, isFinalize?: boolean): Promise<ParsedSignPsbtUr>;

    genSignMsgUr(text: string, msgType?: string): Promise<{ type: string; cbor: string; requestId: string }>;

    parseSignMsgUr(type: string, cbor: string, msgType?: string): Promise<ParsedSignMsgUr>;

    addCustomNetwork(params: {
        name: string;
        networkType: NetworkType;
        chainId: ChainId;
        unit: string;
        opnetUrl: string;
        mempoolSpaceUrl: string;
        faucetUrl?: string;
        showPrice?: boolean;
    }): Promise<CustomNetwork>;

    deleteCustomNetwork(id: string): Promise<boolean>;

    getAllCustomNetworks(): Promise<CustomNetwork[]>;

    testRpcConnection(url: string): Promise<boolean>;

    setAutoLockTimeId(timeId: number): Promise<void>;

    getAutoLockTimeId(): Promise<number>;

    setLastActiveTime(): Promise<void>;

    getNotificationWindowMode(): Promise<'auto' | 'popup' | 'fullscreen'>;

    setNotificationWindowMode(mode: 'auto' | 'popup' | 'fullscreen'): Promise<void>;

    getUseSidePanel(): Promise<boolean>;

    setUseSidePanel(useSidePanel: boolean): Promise<void>;

    setQuantumKey(quantumPrivateKey: string): Promise<void>;

    generateQuantumKey(): Promise<void>;

    // Transaction history
    getTransactionHistory(): Promise<TransactionHistoryItem[]>;

    getFilteredTransactionHistory(filter?: TransactionHistoryFilter): Promise<TransactionHistoryItem[]>;

    clearTransactionHistory(): Promise<void>;

    recordTransaction(
        params: import('@/shared/types/TransactionHistory').RecordTransactionInput,
        origin?: import('@/shared/types/TransactionHistory').TransactionOrigin
    ): Promise<void>;

    // Pre-signed data for transaction flow preview (dApp requests)
    // Returns serialized data (BigInt as strings) - caller must deserialize
    getPreSignedDataForPreview(): Promise<SerializedPreSignedInteractionData | null>;

    // Trigger pre-signing for the current interaction approval (called when SignInteraction UI mounts)
    triggerPreSignInteraction(): void;

    // Generic pre-signed data for internal wallet transactions
    getPreSignedTxData(): Promise<PreSignedTransactionData | null>;
    setPreSignedTxData(data: PreSignedTransactionData): Promise<void>;
    clearPreSignedTxData(): Promise<void>;

    // OPNet Browser / Protocol Methods
    getOpnetBrowserSettings(): Promise<OpnetBrowserSettings>;
    setOpnetBrowserSettings(settings: Partial<OpnetBrowserSettings>): Promise<void>;
    getOpnetCacheSettings(): Promise<OpnetCacheSettings>;
    updateOpnetCacheSettings(settings: Partial<OpnetCacheSettings>): Promise<void>;
    getOpnetCacheStats(): Promise<OpnetCacheStats>;
    clearOpnetCache(): Promise<void>;
    getOpnetGateways(): Promise<{ config: GatewayConfig; health: GatewayHealth }[]>;
    addOpnetGateway(url: string): Promise<void>;
    removeOpnetGateway(url: string): Promise<void>;
    refreshOpnetGateways(): Promise<void>;
    resolveBtcDomain(domain: string): Promise<string | null>;
    getBtcDomainInfo(domainName: string): Promise<{
        exists: boolean;
        owner: string | null;
        price: bigint;
        treasuryAddress: string;
    }>;
    uploadToIpfs(fileData: string, fileName: string): Promise<string>;
    getTrackedDomains(): Promise<
        Array<{
            name: string;
            registeredAt?: number;
            lastVerified?: number;
            isOwner: boolean;
        }>
    >;
    addTrackedDomain(domainName: string): Promise<void>;
    removeTrackedDomain(domainName: string): Promise<void>;

    // Duplication detection and resolution
    checkForDuplicates(): Promise<DuplicationDetectionResult>;
    getDuplicationState(): Promise<DuplicationState>;
    createDuplicationBackup(password: string): Promise<boolean>;
    exportDuplicationBackup(password: string): Promise<{ content: string; filename: string }>;
    hasDuplicationBackup(): Promise<boolean>;
    verifyAllOnChainLinkage(): Promise<Map<string, OnChainLinkageInfo>>;
    resolveDuplicationConflict(choice: ConflictResolutionChoice): Promise<void>;
    removeDuplicateWallet(keyringIndex: number): Promise<void>;
    setDuplicationResolved(): Promise<void>;
    resetDuplicationState(): Promise<void>;
    importDuplicationBackup(
        fileContent: string,
        password: string
    ): Promise<{ version: string; walletCount: number; createdAt: number }>;
    restoreFromDuplicationBackup(password: string): Promise<{ restored: number; errors: string[] }>;
}

const WalletContext = createContext<{
    wallet: WalletController;
} | null>(null);

const WalletProvider = ({ children, wallet }: { children?: ReactNode; wallet: WalletController }) => (
    <WalletContext.Provider value={{ wallet }}>{children}</WalletContext.Provider>
);

const useWallet = () => {
    const { wallet } = useContext(WalletContext) as {
        wallet: WalletController;
    };

    return wallet;
};

export { useWallet, WalletProvider };
