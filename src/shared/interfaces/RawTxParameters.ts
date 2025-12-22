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
    MintNFT = 'MintNFT',
    RegisterDomain = 'registerDomain',
    PublishDomain = 'publishDomain',
    InitiateDomainTransfer = 'initiateDomainTransfer',
    AcceptDomainTransfer = 'acceptDomainTransfer',
    CancelDomainTransfer = 'cancelDomainTransfer'
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
    CSV2 = 'csv2',
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
    readonly from?: string;
    readonly sourceType?: SourceType;
    readonly optimize: boolean;
    readonly splitInputsInto?: number; // Number of UTXOs to split into (opposite of consolidation)
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

export interface RegisterDomainParameters extends BaseRawTxInfo<Action.RegisterDomain> {
    readonly domainName: string;
    readonly price: bigint;
    readonly treasuryAddress: string;
}

export interface PublishDomainParameters extends BaseRawTxInfo<Action.PublishDomain> {
    readonly domainName: string;
    readonly cid: string;
}

export interface InitiateDomainTransferParameters extends BaseRawTxInfo<Action.InitiateDomainTransfer> {
    readonly domainName: string;
    readonly newOwner: string; // The recipient's address (p2tr or other valid address)
}

export interface AcceptDomainTransferParameters extends BaseRawTxInfo<Action.AcceptDomainTransfer> {
    readonly domainName: string;
}

export interface CancelDomainTransferParameters extends BaseRawTxInfo<Action.CancelDomainTransfer> {
    readonly domainName: string;
}

export type RawTxInfo =
    | TransferParameters
    | AirdropParameters
    | SendBitcoinParameters
    | DeployContractParameters
    | MintParameters
    | SendNFTParameters
    | MintNFTParameters
    | RegisterDomainParameters
    | PublishDomainParameters
    | InitiateDomainTransferParameters
    | AcceptDomainTransferParameters
    | CancelDomainTransferParameters;
