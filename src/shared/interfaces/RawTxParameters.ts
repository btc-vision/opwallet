import { OPTokenInfo } from '@/shared/types';
import type { PsbtOutputExtended } from '@btc-vision/bitcoin';
import type { UTXO } from '@btc-vision/transaction';

export enum Features {
    /** Replace-By-Fee, let the user bump the fee after broadcast */
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
    ReserveDomain = 'reserveDomain',
    CompleteRegistration = 'completeRegistration',
    RegisterDomainWithMoto = 'registerDomainWithMoto',
    RenewDomain = 'renewDomain',
    RenewDomainWithMoto = 'renewDomainWithMoto',
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
    CSV3 = 'csv3',
    CSV2 = 'csv2',
    CSV1 = 'csv1',
    P2WDA = 'p2wda',
    COLD_STORAGE = 'cold_storage',
    CONSOLIDATION = 'consolidation',
    ROTATION_ALL = 'rotation_all' // Send from all rotation addresses (hot + cold)
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
    readonly splitInputsInto?: number;
    readonly autoAdjustAmount?: boolean;
    readonly changeAddress?: string;
    // Extra outputs to include in the transaction (e.g. multi-recipient sends)
    readonly optionalOutputs?: PsbtOutputExtended[];
    // Extra UTXOs used exclusively to cover transaction fees
    readonly feeUtxos?: UTXO[];
    // Consolidation-specific fields
    readonly sourceAddresses?: string[];
    readonly sourcePubkeys?: string[];
    // When true, this is a DApp request, resolve approval with BitcoinTransferResponse after broadcast
    readonly isDAppRequest?: boolean;
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

export interface ReserveDomainParameters extends BaseRawTxInfo<Action.ReserveDomain> {
    readonly domainName: string;
    readonly years: number;
    readonly reservationFee: bigint;
    readonly reservationFeeAddress: string;
}

export interface CompleteRegistrationParameters extends BaseRawTxInfo<Action.CompleteRegistration> {
    readonly domainName: string;
    readonly years: number;
    readonly totalPrice: bigint;
    readonly auctionPrice: bigint;
    readonly renewalPerYear: bigint;
    readonly treasuryAddress: string;
}

export interface RegisterDomainWithMotoParameters extends BaseRawTxInfo<Action.RegisterDomainWithMoto> {
    readonly domainName: string;
    readonly years: number;
    readonly motoContractAddress: string;
}

export interface RenewDomainParameters extends BaseRawTxInfo<Action.RenewDomain> {
    readonly domainName: string;
    readonly years: number;
    readonly totalPrice: bigint;
    readonly treasuryAddress: string;
}

export interface RenewDomainWithMotoParameters extends BaseRawTxInfo<Action.RenewDomainWithMoto> {
    readonly domainName: string;
    readonly years: number;
    readonly motoContractAddress: string;
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

export interface SwapParameters extends BaseRawTxInfo<Action.Swap> {
    readonly amountIn: bigint;
    readonly amountOut: bigint;
    readonly amountOutMin: bigint;
    readonly tokenIn: string;
    readonly tokenOut: string;
    /** Full swap path including intermediaries: [tokenIn, ...intermediates, tokenOut] */
    readonly path: string[];
    readonly slippageTolerance: number;
    readonly routerAddress: string;
}

export type RawTxInfo =
    | TransferParameters
    | AirdropParameters
    | SendBitcoinParameters
    | DeployContractParameters
    | MintParameters
    | SendNFTParameters
    | MintNFTParameters
    | ReserveDomainParameters
    | CompleteRegistrationParameters
    | RegisterDomainWithMotoParameters
    | RenewDomainParameters
    | RenewDomainWithMotoParameters
    | PublishDomainParameters
    | InitiateDomainTransferParameters
    | AcceptDomainTransferParameters
    | CancelDomainTransferParameters
    | SwapParameters;
