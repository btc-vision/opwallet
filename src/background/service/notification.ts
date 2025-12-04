import Events from 'events';

import { winMgr } from '@/background/webapi';
import { IS_CHROME, IS_LINUX } from '@/shared/constant';
import { providerErrors, rpcErrors } from '@/shared/lib/bitcoin-rpc-errors/errors';
import { Approval, ApprovalData, ApprovalResponse } from '@/shared/types/Approval';
import { InteractionParametersWithoutSigner, InteractionResponse, UTXO } from '@btc-vision/transaction';
import browser, { WindowProps } from '../webapi/browser';

// Parsed transaction output for UI display
export interface ParsedTxOutput {
    address: string | null;  // null if script-only output
    value: bigint;
    script: string;
    isOpReturn: boolean;
}

// Parsed transaction for UI display
export interface ParsedTransaction {
    txid: string;
    hex: string;
    size: number;           // in bytes
    vsize: number;          // virtual size for fee calculation
    inputs: {
        txid: string;
        vout: number;
        value: bigint;      // from UTXO
    }[];
    outputs: ParsedTxOutput[];
    totalInputValue: bigint;
    totalOutputValue: bigint;
    minerFee: bigint;       // inputs - outputs = real mining fee
}

// Transaction type for pre-signed data
export type PreSignedTxType = 'interaction' | 'deployment' | 'bitcoin_transfer' | 'token_transfer' | 'mint' | 'airdrop' | 'nft_transfer';

// Pre-signed transaction data for preview (never exposed to dApps until approved)
export interface PreSignedInteractionData {
    response: InteractionResponse;
    utxos: UTXO[];
    fundingTxHex: string | null;
    interactionTxHex: string;
    estimatedFees: bigint;
    // Parsed transaction details for accurate UI display
    fundingTx: ParsedTransaction | null;
    interactionTx: ParsedTransaction;
    // First output of interaction is always the OPNet Epoch Miner (gas fee)
    opnetEpochMinerOutput: ParsedTxOutput | null;
}

// Pre-signed data expiration time in milliseconds (2 minutes)
export const PRESIGNED_DATA_EXPIRATION_MS = 2 * 60 * 1000;

// Generic pre-signed data that works for all transaction types
export interface PreSignedTransactionData {
    type: PreSignedTxType;
    // Timestamp when this was created (for expiration)
    createdAt: number;
    // Parsed transactions for bowtie display
    transactions: ParsedTransaction[];
    // Total fees breakdown
    totalMiningFee: bigint;      // inputs - outputs across all TXs
    opnetGasFee: bigint;         // First output of interaction TX (epoch miner)
    // For OPNet interactions - first output is epoch miner
    opnetEpochMinerOutput: ParsedTxOutput | null;
    // Raw response data (for broadcasting)
    rawData: {
        fundingTxHex: string | null;
        interactionTxHex: string | null;
        // For deployment: [fundingTxHex, deployTxHex]
        deploymentTxs: [string, string] | null;
        // For bitcoin transfer
        bitcoinTxHex: string | null;
        // Next UTXOs after broadcast
        nextUTXOs: UTXO[];
    };
}

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService extends Events {
    approval: Approval | null = null;
    interactionParametersToUse: InteractionParametersWithoutSigner | undefined = undefined;
    notifiWindowId = 0;
    isLocked = false;

    // Pre-signed transaction data for preview display (security: cleared after approval)
    private preSignedData: PreSignedInteractionData | null = null;
    // Generic pre-signed data for internal wallet transactions
    private preSignedTxData: PreSignedTransactionData | null = null;
    // Flag to track if pre-signing is in progress (prevents concurrent requests)
    private isPreSigning = false;

    constructor() {
        super();

        winMgr.event.on('windowRemoved', async (winId: number) => {
            if (winId === this.notifiWindowId) {
                this.notifiWindowId = 0;
                await this.rejectApproval();
            }
        });

        winMgr.event.on('windowFocusChange', (winId: number) => {
            if (this.notifiWindowId && winId !== this.notifiWindowId) {
                if (IS_CHROME && winId === browser.windows.WINDOW_ID_NONE && IS_LINUX) {
                    // Wired issue: When notification popuped, will focus to -1 first then focus on notification
                    return;
                }
                // this.rejectApproval();
            }
        });
    }

    getApproval = () => this.approval?.data;

    getApprovalInteractionParametersToUse = () => this.interactionParametersToUse;

    clearApprovalInteractionParametersToUse = () => {
        this.interactionParametersToUse = undefined;
    };

    // Pre-signed data methods (for transaction flow preview)
    setPreSignedData = (data: PreSignedInteractionData) => {
        this.preSignedData = data;
    };

    getPreSignedData = (): PreSignedInteractionData | null => {
        return this.preSignedData;
    };

    clearPreSignedData = () => {
        this.preSignedData = null;
    };

    // Pre-signing state management (prevents concurrent requests)
    isPreSigningInProgress = (): boolean => {
        return this.isPreSigning;
    };

    setPreSigningInProgress = (inProgress: boolean) => {
        this.isPreSigning = inProgress;
    };

    // Check if there's an active approval request
    hasActiveApproval = (): boolean => {
        return this.approval !== null;
    };

    // Generic pre-signed transaction data methods (for internal wallet transactions)
    setPreSignedTxData = (data: PreSignedTransactionData) => {
        this.preSignedTxData = data;
    };

    getPreSignedTxData = (): PreSignedTransactionData | null => {
        if (!this.preSignedTxData) return null;

        // Check if data has expired (2 minutes)
        const now = Date.now();
        if (now - this.preSignedTxData.createdAt > PRESIGNED_DATA_EXPIRATION_MS) {
            console.warn('Pre-signed transaction data expired, clearing');
            this.preSignedTxData = null;
            return null;
        }

        return this.preSignedTxData;
    };

    clearPreSignedTxData = () => {
        this.preSignedTxData = null;
    };

    // Check if pre-signed data is expired
    isPreSignedTxDataExpired = (): boolean => {
        if (!this.preSignedTxData) return true;
        const now = Date.now();
        return now - this.preSignedTxData.createdAt > PRESIGNED_DATA_EXPIRATION_MS;
    };

    resolveApproval = (
        data?: ApprovalResponse,
        interactionParametersToUse?: InteractionParametersWithoutSigner,
        forceReject = false
    ) => {
        if (forceReject) {
            this.approval?.reject(providerErrors.userRejectedRequest());
        } else {
            this.interactionParametersToUse = interactionParametersToUse;
            this.approval?.resolve(data);
        }
        this.approval = null;
        // Security: Clear ALL pre-signed data after approval resolution
        this.clearPreSignedData();
        this.clearPreSignedTxData();
        this.emit('resolve', data);
    };

    rejectApproval = async (err?: string, stay = false, isInternal = false) => {
        if (!this.approval) return;
        if (isInternal) {
            this.approval?.reject(rpcErrors.internal({ message: err }));
        } else {
            this.approval?.reject(providerErrors.userRejectedRequest({ message: err }));
        }

        // Security: Clear ALL pre-signed data on rejection
        this.clearPreSignedData();
        this.clearPreSignedTxData();
        await this.clear(stay);
        this.emit('reject', err);
    };

    // currently it only support one approval at the same time
    requestApproval = async (data: ApprovalData, winProps?: WindowProps): Promise<ApprovalResponse | undefined> => {
        // We will just override the existing open approval with the new one coming in
        return new Promise(async (resolve, reject) => {
            this.approval = {
                data,
                resolve,
                reject
            };

            await this.openNotification(winProps);
        });
    };

    clear = async (stay = false) => {
        this.approval = null;
        if (this.notifiWindowId && !stay) {
            await winMgr.remove(this.notifiWindowId);
            this.notifiWindowId = 0;
        }
    };

    unLock = () => {
        this.isLocked = false;
    };

    lock = () => {
        this.isLocked = true;
    };

    openNotification = async (winProps?: WindowProps) => {
        // if (this.isLocked) return;
        // this.lock();
        if (this.notifiWindowId) {
            await winMgr.remove(this.notifiWindowId);
            this.notifiWindowId = 0;
        }

        winMgr.openNotification(winProps).then((winId: number | undefined) => {
            if (typeof winId === 'number') {
                this.notifiWindowId = winId;
            }
        });
    };
}

export default new NotificationService();
