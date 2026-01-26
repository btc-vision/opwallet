import { AddressTypes, WalletNetworks } from '@btc-vision/transaction';

export enum LegacyAddressType {
    P2PKH = 0,
    P2WPKH = 1,
    P2TR = 2,
    P2SH_P2WPKH = 3,
    M44_P2WPKH = 4,
    M44_P2TR = 5
}

export function legacyToAddressTypes(legacy: LegacyAddressType): AddressTypes {
    switch (legacy) {
        case LegacyAddressType.P2PKH:
            return AddressTypes.P2PKH;
        case LegacyAddressType.P2WPKH:
        case LegacyAddressType.M44_P2WPKH:
            return AddressTypes.P2WPKH;
        case LegacyAddressType.P2TR:
        case LegacyAddressType.M44_P2TR:
            return AddressTypes.P2TR;
        case LegacyAddressType.P2SH_P2WPKH:
            return AddressTypes.P2SH_OR_P2SH_P2WPKH;
        default:
            return AddressTypes.P2TR;
    }
}

export function isLegacyAddressType(value: unknown): value is LegacyAddressType {
    return typeof value === 'number' && value >= 0 && value <= 5;
}

export function addressTypesToStorage(addressType: AddressTypes): string {
    return addressType;
}

export function storageToAddressTypes(stored: string | number): AddressTypes {
    if (typeof stored === 'number') {
        if (isLegacyAddressType(stored)) {
            return legacyToAddressTypes(stored);
        }
        return AddressTypes.P2TR;
    }
    if (Object.values(AddressTypes).includes(stored as AddressTypes)) {
        return stored as AddressTypes;
    }
    return AddressTypes.P2TR;
}

export enum NetworkType {
    MAINNET = 0,
    TESTNET = 1,
    REGTEST = 2
}

export function networkTypeToOPNet(networkType: NetworkType): WalletNetworks {
    switch (networkType) {
        case NetworkType.MAINNET:
            return WalletNetworks.Mainnet;
        case NetworkType.TESTNET:
            return WalletNetworks.Testnet;
        case NetworkType.REGTEST:
            return WalletNetworks.Regtest;
        default:
            return WalletNetworks.Mainnet;
    }
}

export enum RestoreWalletType {
    OP_WALLET,
    UNISAT,
    SPARROW,
    XVERSE,
    OTHERS
}

export interface BitcoinBalance {
    btc_total_amount: string;
    btc_confirm_amount: string;
    btc_pending_amount: string;

    csv75_total_amount: string;
    csv75_unlocked_amount: string;
    csv75_locked_amount: string;

    csv2_total_amount: string;
    csv2_unlocked_amount: string;
    csv2_locked_amount: string;

    csv1_total_amount: string;
    csv1_unlocked_amount: string;
    csv1_locked_amount: string;

    p2wda_total_amount: string;
    p2wda_pending_amount?: string;

    usd_value: string;

    consolidation_amount: string;

    consolidation_unspent_amount: string;
    consolidation_csv75_unlocked_amount: string;
    consolidation_csv2_unlocked_amount: string;
    consolidation_csv1_unlocked_amount: string;
    consolidation_p2wda_unspent_amount: string;

    all_utxos_count: number;
    unspent_utxos_count: number;
    csv75_locked_utxos_count: number;
    csv75_unlocked_utxos_count: number;
    csv2_locked_utxos_count: number;
    csv2_unlocked_utxos_count: number;
    csv1_locked_utxos_count: number;
    csv1_unlocked_utxos_count: number;
    p2wda_utxos_count: number;
    unspent_p2wda_utxos_count: number;
}

export interface AddressAssets {
    total_btc: string;
    satoshis: number;
}

export interface TxHistoryInOutItem {
    address: string;
    value: number;
}

export interface TxHistoryItem {
    txid: string;
    confirmations: number;
    height: number;
    timestamp: number;
    size: number;
    feeRate: number;
    fee: number;
    outputValue: number;
    vin: TxHistoryInOutItem[];
    vout: TxHistoryInOutItem[];
    types: string[];
    methods: string[];
}

export interface AppInfo {
    logo: string;
    title: string;
    desc: string;
    url: string;
    time: number;
    id: number;
    tag?: string;
    readtime?: number;
    new?: boolean;
    tagColor?: string;
}

export interface AppSummary {
    apps: AppInfo[];
    readTabTime?: number;
}

export interface BtcPrice {
    price: number;
    updateTime: number;
}

export interface UTXO {
    txid: string;
    vout: number;
    satoshis: number;
    scriptPk: string;
    addressType: AddressTypes;
}

export type UnspentOutput = UTXO;

export enum TxType {
    SIGN_TX,
    SEND_BITCOIN
}

interface BaseUserToSignInput {
    index: number;
    sighashTypes: number[] | undefined;
    disableTweakSigner?: boolean;
}

export interface AddressUserToSignInput extends BaseUserToSignInput {
    address: string;
}

export interface PublicKeyUserToSignInput extends BaseUserToSignInput {
    publicKey: string;
}

export type UserToSignInput = AddressUserToSignInput | PublicKeyUserToSignInput;

export interface SignPsbtOptions {
    autoFinalized: boolean;
    toSignInputs?: UserToSignInput[];
}

export interface ToSignInput {
    index: number;
    publicKey: string;
    sighashTypes?: number[];
}

export interface WalletKeyring {
    key: string;
    index: number;
    type: string;
    addressType: AddressTypes;
    accounts: Account[];
    alianName: string;
    hdPath: string;
}

export enum QuantumKeyStatus {
    NOT_REQUIRED = 'not_required',
    NOT_MIGRATED = 'not_migrated',
    MIGRATED = 'migrated',
    LINKED_ON_CHAIN = 'linked_on_chain'
}

export interface Account {
    type: string;
    pubkey: string;
    address: string;
    brandName?: string;
    alianName?: string;
    displayBrandName?: string;
    index?: number;
    balance?: number;
    key: string;
    flag: number;
    quantumPublicKeyHash?: string;
    quantumKeyStatus?: QuantumKeyStatus;
}

export enum RiskType {
    LOW_FEE_RATE,
    HIGH_FEE_RATE
}

export interface Risk {
    type: RiskType;
    level: 'danger' | 'warning' | 'critical';
    title: string;
    desc: string;
}

export interface DecodedPsbt {
    inputs: {
        txid: string;
        vout: number;
        address: string;
        value: number;
        sighashType?: number;
    }[];
    outputs: {
        address: string;
        value: number;
    }[];
    risks: Risk[];
    fee: number;
    feeRate: number;
    transactionSize: number;
    rbfEnabled: boolean;
    recommendedFeeRate: number;
    shouldWarnFeeRate: boolean;
}

export interface ToAddressInfo {
    address: string;
    domain?: string;
}

export interface RawTxInfo {
    psbtHex: string;
    rawtx: string;
    toAddressInfo?: ToAddressInfo;
    fee?: number;
}

export interface WalletConfig {
    version: string;
    moonPayEnabled: boolean;
    statusMessage: string;
    endpoint: string;
    chainTip: string;
}

export enum WebsiteState {
    CHECKING,
    SCAMMER,
    SAFE
}

export interface AddressSummary {
    address: string;
    totalSatoshis: number;
    loading?: boolean;
}

export interface VersionDetail {
    version: string;
    title: string;
    changelogs: string[];
}

export interface OPTokenInfo {
    name: string;
    amount: bigint;
    address: string;
    symbol: string;
    divisibility: number;
    logo?: string;
}

export interface TickPriceItem {
    curPrice: number;
    changePercent: number;
}

export interface GroupAsset {
    type: number;
    address_arr: string[];
    satoshis_arr: number[];
}

export interface AddressRecentHistory {
    start: number;
    total: number;
    detail: TxHistoryItem[];
}

export interface ParsedSignPsbtUr {
    psbtHex: string;
    rawTx: string;
}

export interface ParsedSignMsgUr {
    requestId: string;
    publicKey: string;
    signature: string;
}
