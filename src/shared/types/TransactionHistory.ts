import { ChainType } from '@/shared/constant';

/**
 * Transaction type enum covering all wallet operations
 */
export enum TransactionType {
    BTC_TRANSFER = 'btc_transfer',
    BTC_RECEIVE = 'btc_receive',
    OPNET_INTERACTION = 'opnet_interaction',
    CONTRACT_DEPLOYMENT = 'contract_deployment',
    TOKEN_TRANSFER = 'token_transfer',
    CANCEL_TRANSACTION = 'cancel_transaction'
}

/**
 * Transaction status for tracking confirmation state
 */
export enum TransactionStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    FAILED = 'failed'
}

/**
 * Origin of the transaction (wallet UI vs external DApp)
 */
export interface TransactionOrigin {
    type: 'internal' | 'external';
    siteName?: string;
    siteUrl?: string;
    siteIcon?: string;
}

/**
 * Core transaction history item
 */
export interface TransactionHistoryItem {
    /** Unique identifier: `${txid}_${chainType}_${pubkey}` */
    id: string;

    /** Main transaction hash */
    txid: string;

    /** Funding transaction hash (for OPNet interactions) */
    fundingTxid?: string;

    /** Type of transaction */
    type: TransactionType;

    /** Current confirmation status */
    status: TransactionStatus;

    /** Unix timestamp when transaction was created */
    timestamp: number;

    /** Unix timestamp when transaction was confirmed */
    confirmedAt?: number;

    /** Block height where transaction was confirmed */
    blockHeight?: number;

    /** Number of confirmations */
    confirmations: number;

    /** Sender address */
    from: string;

    /** Recipient address (if applicable) */
    to?: string;

    /** Amount in satoshis or token base units */
    amount?: string;

    /** Human-readable amount display */
    amountDisplay?: string;

    /** Token symbol (if token transfer) */
    tokenSymbol?: string;

    /** Token decimals (if token transfer) */
    tokenDecimals?: number;

    /** Token contract address (if token transfer) */
    tokenAddress?: string;

    /** Fee paid in satoshis */
    fee: number;

    /** Fee rate in sat/vB */
    feeRate?: number;

    /** Chain type (mainnet, testnet, etc.) */
    chainType: ChainType;

    /** Origin of the transaction */
    origin: TransactionOrigin;

    /** Contract address (for interactions/deployments) */
    contractAddress?: string;

    /** Contract method called (for interactions) */
    contractMethod?: string;

    /** Contract name (if available) */
    contractName?: string;

    /** Transaction note/memo */
    note?: string;

    /** Last time status was checked (Unix timestamp) */
    lastStatusCheck: number;

    /** Number of status check attempts */
    statusCheckAttempts: number;
}

/**
 * Transaction history storage structure
 */
export interface TransactionHistoryStore {
    version: number;
    transactions: TransactionHistoryItem[];
    lastUpdated: number;
    /** Track known UTXO txids to detect incoming transactions */
    knownUtxoTxids?: string[];
}

/**
 * Filter options for querying history
 */
export interface TransactionHistoryFilter {
    types?: TransactionType[];
    statuses?: TransactionStatus[];
    chainType?: ChainType;
    startDate?: number;
    endDate?: number;
    search?: string;
}

/**
 * Parameters for recording a new transaction (without origin, added by controller)
 */
export interface RecordTransactionInput {
    txid: string;
    fundingTxid?: string;
    type: TransactionType;
    from: string;
    to?: string;
    amount?: string;
    amountDisplay?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    tokenAddress?: string;
    fee: number;
    feeRate?: number;
    contractAddress?: string;
    contractMethod?: string;
    contractName?: string;
    note?: string;
}

/**
 * Full parameters for recording a new transaction (with origin)
 */
export interface RecordTransactionParams extends RecordTransactionInput {
    origin: TransactionOrigin;
}
