import { OPTokenInfo } from '@/shared/types';

export enum Features {
    /** Replace-By-Fee — let the user bump the fee after broadcast */
    rbf = 'rbf',

    /** Segregated Witness inputs (P2WPKH / P2WSH) */
    segwit = 'segwit',

    /** Taproot inputs / outputs (P2TR + Schnorr) */
    taproot = 'taproot',

    /** Child-Pays-For-Parent fee rescue */
    cpfp = 'cpfp',

    /** Pay-to-Script-Hash (legacy multisig, time-locks, etc.) */
    p2sh = 'p2sh',

    /** Native multisig (≥ n-of-m) detected */
    multisig = 'multisig',

    /** Transaction embeds an OP_RETURN payload */
    opreturn = 'opreturn',

    /** Absolute or relative lock-time is used */
    locktime = 'locktime',

    /** Built / exported as a PSBT (partially-signed tx) */
    psbt = 'psbt',

    /** PayJoin (BIP-78) privacy payment */
    payjoin = 'payjoin'
}

export type PotentialFeatures = {
    [key in Features]?: boolean;
};

export enum Action {
    Transfer = 'transfer',
    Airdrop = 'airdrop',
    SendBitcoin = 'sendBitcoin',
    DeployContract = 'deploy',
    Mint = 'mint',
    Swap = 'swap',
    SendNFT = 'SendNFT',
    MintNFT = 'MintNFT'
}

export interface BaseRawTxInfo<T extends Action> {
    readonly header: string;
    readonly features: PotentialFeatures;
    readonly tokens: OPTokenInfo[];
    readonly feeRate: number;
    readonly priorityFee: bigint;
    readonly gasSatFee?: bigint; // TODO: Implement this.
    readonly note?: string | Buffer; // Optional note for the transaction

    readonly action: T;
}

export interface TransferParameters extends BaseRawTxInfo<Action.Transfer> {
    readonly contractAddress: string;
    readonly to: string;
    readonly inputAmount: bigint;
}

export interface AirdropParameters extends BaseRawTxInfo<Action.Airdrop> {
    readonly contractAddress: string;
    readonly amounts: { [key: string]: string };
}

export enum SourceType {
    CURRENT = 'current',
    CSV75 = 'csv75',
    CSV1 = 'csv1',
    P2WDA = 'p2wda'
}

export interface NFTMetadata {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
}

export interface MintNFTParameters extends BaseRawTxInfo<Action.MintNFT> {
    readonly collectionAddress: string;
    readonly collectionName: string;
    readonly quantity: bigint;
    readonly mintPrice: bigint;
    readonly totalCost: bigint;
}

export interface SendNFTParameters extends BaseRawTxInfo<Action.SendNFT> {
    readonly to: string;
    readonly tokenId: bigint;
    readonly collectionAddress: string;
    readonly collectionName: string;
}

export interface SendBitcoinParameters extends BaseRawTxInfo<Action.SendBitcoin> {
    readonly to: string;
    readonly inputAmount: number;
    readonly from?: string; // Optional: source address (current, CSV75, or CSV1)
    readonly sourceType?: SourceType; // Optional: type of source address
}

export interface DeployContractParameters extends BaseRawTxInfo<Action.DeployContract> {
    readonly file: File;
    readonly calldataHex: string;
}

export interface MintParameters extends BaseRawTxInfo<Action.Mint> {
    readonly contractAddress: string;
    readonly inputAmount: number;
    readonly to: string;
}

export interface SwapParameters extends BaseRawTxInfo<Action.Swap> {
    readonly amountIn: number;
    readonly amountOut: number;
    readonly tokenIn: string;
    readonly tokenOut: string;
    readonly slippageTolerance: number;
    readonly deadline: string;
}

export type RawTxInfo =
    | TransferParameters
    | AirdropParameters
    | SendBitcoinParameters
    | DeployContractParameters
    | MintParameters
    | SwapParameters;
