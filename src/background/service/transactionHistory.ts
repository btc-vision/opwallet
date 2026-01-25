import { ChainType } from '@/shared/constant';
import {
    RecordTransactionParams,
    TransactionHistoryFilter,
    TransactionHistoryItem,
    TransactionHistoryStore,
    TransactionStatus,
    TransactionType
} from '@/shared/types/TransactionHistory';

import storage from '../webapi/storage';
import { browserStorageLocalGet } from '../webapi/browser';

const STORAGE_VERSION = 1;
const MAX_TRANSACTIONS = 200;

class TransactionHistoryService {
    /**
     * Generate storage key for a specific chain and account
     */
    private getStorageKey(chainType: ChainType, pubkey: string): string {
        return `txHistory_${chainType}_${pubkey}`;
    }

    /**
     * Get transaction history store for an account
     */
    async getStore(chainType: ChainType, pubkey: string): Promise<TransactionHistoryStore> {
        const key = this.getStorageKey(chainType, pubkey);
        const stored = await storage.get<TransactionHistoryStore>(key);

        if (!stored) {
            return {
                version: STORAGE_VERSION,
                transactions: [],
                lastUpdated: Date.now(),
                knownUtxoTxids: []
            };
        }

        return stored;
    }

    /**
     * Save transaction history store
     */
    private async saveStore(chainType: ChainType, pubkey: string, store: TransactionHistoryStore): Promise<void> {
        const key = this.getStorageKey(chainType, pubkey);
        store.lastUpdated = Date.now();
        await storage.set(key, store);
    }

    /**
     * Get all transactions for an account
     */
    async getHistory(chainType: ChainType, pubkey: string): Promise<TransactionHistoryItem[]> {
        const store = await this.getStore(chainType, pubkey);
        return store.transactions;
    }

    /**
     * Get filtered transactions
     */
    async getFilteredHistory(
        chainType: ChainType,
        pubkey: string,
        filter?: TransactionHistoryFilter
    ): Promise<TransactionHistoryItem[]> {
        const store = await this.getStore(chainType, pubkey);
        let transactions = store.transactions;

        if (filter) {
            if (filter.types && filter.types.length > 0) {
                const types = filter.types;
                transactions = transactions.filter((tx) => types.includes(tx.type));
            }
            if (filter.statuses && filter.statuses.length > 0) {
                const statuses = filter.statuses;
                transactions = transactions.filter((tx) => statuses.includes(tx.status));
            }
            if (filter.startDate !== undefined) {
                const startDate = filter.startDate;
                transactions = transactions.filter((tx) => tx.timestamp >= startDate);
            }
            if (filter.endDate !== undefined) {
                const endDate = filter.endDate;
                transactions = transactions.filter((tx) => tx.timestamp <= endDate);
            }
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                transactions = transactions.filter(
                    (tx) =>
                        tx.txid.toLowerCase().includes(searchLower) ||
                        tx.to?.toLowerCase().includes(searchLower) ||
                        tx.from.toLowerCase().includes(searchLower) ||
                        tx.contractAddress?.toLowerCase().includes(searchLower) ||
                        tx.contractName?.toLowerCase().includes(searchLower) ||
                        tx.tokenSymbol?.toLowerCase().includes(searchLower)
                );
            }
        }

        // Sort: pending first, then by block height descending (newest blocks first), then by timestamp
        return transactions.sort((a, b) => {
            // Pending transactions always on top
            const aIsPending = a.status === TransactionStatus.PENDING;
            const bIsPending = b.status === TransactionStatus.PENDING;
            if (aIsPending && !bIsPending) return -1;
            if (!aIsPending && bIsPending) return 1;

            // Both pending: sort by timestamp (newest first)
            if (aIsPending && bIsPending) {
                return b.timestamp - a.timestamp;
            }

            // Both confirmed: sort by block height (highest/newest first)
            if (a.blockHeight !== undefined && b.blockHeight !== undefined) {
                if (a.blockHeight !== b.blockHeight) {
                    return b.blockHeight - a.blockHeight;
                }
            }

            // If no block height, fall back to timestamp
            return b.timestamp - a.timestamp;
        });
    }

    /**
     * Add a new transaction to history
     */
    async addTransaction(chainType: ChainType, pubkey: string, params: RecordTransactionParams): Promise<void> {
        const store = await this.getStore(chainType, pubkey);

        // Generate unique ID
        const id = `${params.txid}_${chainType}_${pubkey}`;

        // Check if transaction already exists
        const existingIndex = store.transactions.findIndex((tx) => tx.id === id);
        if (existingIndex !== -1) {
            // Transaction already exists, don't add duplicate
            return;
        }

        const now = Date.now();
        const transaction: TransactionHistoryItem = {
            id,
            txid: params.txid,
            fundingTxid: params.fundingTxid,
            type: params.type,
            status: TransactionStatus.PENDING,
            timestamp: now,
            confirmations: 0,
            from: params.from,
            to: params.to,
            amount: params.amount,
            amountDisplay: params.amountDisplay,
            tokenSymbol: params.tokenSymbol,
            tokenDecimals: params.tokenDecimals,
            tokenAddress: params.tokenAddress,
            fee: params.fee,
            feeRate: params.feeRate,
            chainType,
            origin: params.origin,
            contractAddress: params.contractAddress,
            contractMethod: params.contractMethod,
            contractName: params.contractName,
            note: params.note,
            calldata: params.calldata,
            lastStatusCheck: now,
            statusCheckAttempts: 0
        };

        // Add to beginning (newest first)
        store.transactions.unshift(transaction);

        // Prune old transactions if exceeding limit
        if (store.transactions.length > MAX_TRANSACTIONS) {
            store.transactions = store.transactions.slice(0, MAX_TRANSACTIONS);
        }

        await this.saveStore(chainType, pubkey, store);
    }

    /**
     * Update transaction status
     */
    async updateTransactionStatus(
        chainType: ChainType,
        pubkey: string,
        txid: string,
        status: TransactionStatus,
        confirmations?: number,
        blockHeight?: number
    ): Promise<void> {
        const store = await this.getStore(chainType, pubkey);

        const transaction = store.transactions.find((tx) => tx.txid === txid);
        if (!transaction) {
            return;
        }

        transaction.status = status;
        transaction.lastStatusCheck = Date.now();
        transaction.statusCheckAttempts += 1;

        if (confirmations !== undefined) {
            transaction.confirmations = confirmations;
        }

        if (blockHeight !== undefined) {
            transaction.blockHeight = blockHeight;
        }

        if (status === TransactionStatus.CONFIRMED && !transaction.confirmedAt) {
            transaction.confirmedAt = Date.now();
        }

        await this.saveStore(chainType, pubkey, store);
    }

    /**
     * Get all pending transactions across all accounts
     * Returns array of { chainType, pubkey, transaction }
     */
    async getAllPendingTransactions(): Promise<
        Array<{ chainType: ChainType; pubkey: string; transaction: TransactionHistoryItem }>
    > {
        const pending: Array<{ chainType: ChainType; pubkey: string; transaction: TransactionHistoryItem }> = [];

        // Get all storage keys that match our pattern
        const allKeys = await this.getAllHistoryKeys();

        for (const key of allKeys) {
            const match = key.match(/^txHistory_(.+)_(.+)$/);
            if (!match) continue;

            const chainType = match[1] as ChainType;
            const pubkey = match[2];

            const store = await this.getStore(chainType, pubkey);
            const pendingTxs = store.transactions.filter((tx) => tx.status === TransactionStatus.PENDING);

            for (const tx of pendingTxs) {
                pending.push({ chainType, pubkey, transaction: tx });
            }
        }

        return pending;
    }

    /**
     * Get all transactions that need confirmation tracking (pending OR confirmed but not finalized)
     * Returns array of { chainType, pubkey, transaction }
     */
    async getTransactionsNeedingConfirmationTracking(): Promise<
        Array<{ chainType: ChainType; pubkey: string; transaction: TransactionHistoryItem }>
    > {
        const results: Array<{ chainType: ChainType; pubkey: string; transaction: TransactionHistoryItem }> = [];

        const allKeys = await this.getAllHistoryKeys();

        for (const key of allKeys) {
            const match = key.match(/^txHistory_(.+)_(.+)$/);
            if (!match) continue;

            const chainType = match[1] as ChainType;
            const pubkey = match[2];

            const store = await this.getStore(chainType, pubkey);
            // Get pending transactions OR confirmed but not yet finalized
            const needsTracking = store.transactions.filter(
                (tx) =>
                    tx.status === TransactionStatus.PENDING ||
                    (tx.status === TransactionStatus.CONFIRMED && !tx.finalized)
            );

            for (const tx of needsTracking) {
                results.push({ chainType, pubkey, transaction: tx });
            }
        }

        return results;
    }

    /**
     * Mark a transaction as finalized (3+ confirmations, no more polling needed)
     */
    async markTransactionFinalized(chainType: ChainType, pubkey: string, txid: string): Promise<void> {
        const store = await this.getStore(chainType, pubkey);
        const transaction = store.transactions.find((tx) => tx.txid === txid);

        if (transaction) {
            transaction.finalized = true;
            await this.saveStore(chainType, pubkey, store);
        }
    }

    /**
     * Check if there are any recent unfinalized transactions (within last 10 minutes)
     * Used to optimize UTXO polling frequency
     */
    async hasRecentUnfinalizedTransactions(chainType: ChainType, pubkey: string): Promise<boolean> {
        const store = await this.getStore(chainType, pubkey);
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

        return store.transactions.some(
            (tx) =>
                !tx.finalized &&
                tx.timestamp > tenMinutesAgo &&
                (tx.status === TransactionStatus.PENDING || tx.status === TransactionStatus.CONFIRMED)
        );
    }

    /**
     * Get all history storage keys
     */
    private async getAllHistoryKeys(): Promise<string[]> {
        const allData = await browserStorageLocalGet(null);
        return Object.keys(allData).filter((key) => key.startsWith('txHistory_'));
    }

    /**
     * Get known UTXO txids for incoming transaction detection
     */
    async getKnownUtxoTxids(chainType: ChainType, pubkey: string): Promise<string[]> {
        const store = await this.getStore(chainType, pubkey);
        return store.knownUtxoTxids || [];
    }

    /**
     * Update known UTXO txids
     */
    async updateKnownUtxoTxids(chainType: ChainType, pubkey: string, txids: string[]): Promise<void> {
        const store = await this.getStore(chainType, pubkey);
        store.knownUtxoTxids = txids;
        await this.saveStore(chainType, pubkey, store);
    }

    /**
     * Add incoming transaction (BTC receive)
     */
    async addIncomingTransaction(
        chainType: ChainType,
        pubkey: string,
        txid: string,
        amount: string,
        from: string,
        to: string
    ): Promise<void> {
        await this.addTransaction(chainType, pubkey, {
            txid,
            type: TransactionType.BTC_RECEIVE,
            from,
            to,
            amount,
            fee: 0, // Receiver doesn't pay fee
            origin: { type: 'external' }
        });
    }

    /**
     * Clear all history for an account
     */
    async clearHistory(chainType: ChainType, pubkey: string): Promise<void> {
        const key = this.getStorageKey(chainType, pubkey);
        await storage.set(key, {
            version: STORAGE_VERSION,
            transactions: [],
            lastUpdated: Date.now(),
            knownUtxoTxids: []
        });
    }

    /**
     * Get transaction by txid
     */
    async getTransactionByTxid(
        chainType: ChainType,
        pubkey: string,
        txid: string
    ): Promise<TransactionHistoryItem | undefined> {
        const store = await this.getStore(chainType, pubkey);
        return store.transactions.find((tx) => tx.txid === txid);
    }
}

export default new TransactionHistoryService();
