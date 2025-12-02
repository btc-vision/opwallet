import { ChainType } from '@/shared/constant';
import { TransactionHistoryItem, TransactionStatus, TransactionType } from '@/shared/types/TransactionHistory';
import Web3API from '@/shared/web3/Web3API';

import transactionHistoryService from './transactionHistory';
import preferenceService from './preference';

const POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_STATUS_CHECK_ATTEMPTS = 50; // ~25 minutes then stop checking individual tx
const CONFIRMATION_THRESHOLD = 1; // Consider confirmed after 1 confirmation for OPNet

class TransactionStatusPoller {
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private isPolling = false;

    /**
     * Start polling for transaction status updates
     */
    start(): void {
        if (this.pollInterval) {
            return; // Already running
        }

        console.log('[TransactionStatusPoller] Starting polling service');

        // Poll immediately on start
        void this.poll();

        // Then poll at regular intervals
        this.pollInterval = setInterval(() => {
            void this.poll();
        }, POLL_INTERVAL_MS);
    }

    /**
     * Stop polling
     */
    stop(): void {
        if (this.pollInterval) {
            console.log('[TransactionStatusPoller] Stopping polling service');
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Check if poller is running
     */
    isRunning(): boolean {
        return this.pollInterval !== null;
    }

    /**
     * Main polling function
     */
    private async poll(): Promise<void> {
        if (this.isPolling) {
            return; // Prevent overlapping polls
        }

        this.isPolling = true;

        try {
            await this.pollPendingTransactions();
            await this.checkForIncomingTransactions();
        } catch (error) {
            console.error('[TransactionStatusPoller] Error during poll:', error);
        } finally {
            this.isPolling = false;
        }
    }

    /**
     * Check status of all pending transactions
     */
    private async pollPendingTransactions(): Promise<void> {
        const pendingTxs = await transactionHistoryService.getAllPendingTransactions();

        if (pendingTxs.length === 0) {
            return;
        }

        console.log(`[TransactionStatusPoller] Checking ${pendingTxs.length} pending transactions`);

        for (const { chainType, pubkey, transaction } of pendingTxs) {
            // Skip if we've exceeded max attempts
            if (transaction.statusCheckAttempts >= MAX_STATUS_CHECK_ATTEMPTS) {
                console.log(`[TransactionStatusPoller] Max attempts reached for tx ${transaction.txid}, marking as failed`);
                await transactionHistoryService.updateTransactionStatus(
                    chainType,
                    pubkey,
                    transaction.txid,
                    TransactionStatus.FAILED
                );
                continue;
            }

            try {
                await this.checkTransactionStatus(chainType, pubkey, transaction);
            } catch (error) {
                console.error(`[TransactionStatusPoller] Error checking tx ${transaction.txid}:`, error);
                // Just increment the attempt counter
                await transactionHistoryService.updateTransactionStatus(
                    chainType,
                    pubkey,
                    transaction.txid,
                    TransactionStatus.PENDING
                );
            }
        }
    }

    /**
     * Check status of a single transaction
     */
    private async checkTransactionStatus(
        chainType: ChainType,
        pubkey: string,
        transaction: TransactionHistoryItem
    ): Promise<void> {
        // Ensure Web3API is set to the correct network
        await Web3API.setNetwork(chainType);

        try {
            const txResult = await Web3API.provider.getTransaction(transaction.txid);

            if (txResult && !('error' in txResult)) {
                // Transaction found and confirmed
                console.log(`[TransactionStatusPoller] Transaction ${transaction.txid} confirmed`);

                await transactionHistoryService.updateTransactionStatus(
                    chainType,
                    pubkey,
                    transaction.txid,
                    TransactionStatus.CONFIRMED,
                    CONFIRMATION_THRESHOLD,
                    txResult.blockNumber !== undefined ? Number(txResult.blockNumber) : undefined
                );
            } else if (txResult && 'error' in txResult) {
                // Transaction has an error - might be reverted
                const errorMsg = String(txResult.error);
                if (errorMsg.includes('reverted') || errorMsg.includes('failed')) {
                    console.log(`[TransactionStatusPoller] Transaction ${transaction.txid} failed/reverted`);
                    await transactionHistoryService.updateTransactionStatus(
                        chainType,
                        pubkey,
                        transaction.txid,
                        TransactionStatus.FAILED
                    );
                }
            }
            // If txResult is null/undefined, transaction is still pending - just update attempt count
        } catch {
            // Transaction not found yet, still pending
            // Will be updated via the catch block in pollPendingTransactions
        }
    }

    /**
     * Check for incoming transactions by monitoring UTXOs
     */
    private async checkForIncomingTransactions(): Promise<void> {
        try {
            const currentAccount = preferenceService.getCurrentAccount();
            if (!currentAccount) {
                return;
            }

            const chainType = preferenceService.getChainType();
            const pubkey = currentAccount.pubkey;

            // Ensure Web3API is set to the correct network
            await Web3API.setNetwork(chainType);

            // Get current UTXOs
            const utxos = await Web3API.provider.utxoManager.getUTXOs({
                address: currentAccount.address,
                mergePendingUTXOs: true,
                filterSpentUTXOs: true
            });
            if (!utxos || utxos.length === 0) {
                return;
            }

            // Get known UTXO txids
            const knownTxids = await transactionHistoryService.getKnownUtxoTxids(chainType, pubkey);
            const knownSet = new Set(knownTxids);

            // Find new UTXOs
            const currentTxids: string[] = [];
            const newUtxos: Array<{ txid: string; value: bigint }> = [];

            for (const utxo of utxos) {
                const txid = utxo.transactionId;
                currentTxids.push(txid);

                if (!knownSet.has(txid)) {
                    // Check if this txid is from our own outgoing transactions
                    const existingTx = await transactionHistoryService.getTransactionByTxid(chainType, pubkey, txid);
                    if (!existingTx) {
                        // This is a new incoming transaction
                        newUtxos.push({ txid, value: utxo.value });
                    }
                }
            }

            // Record new incoming transactions
            for (const { txid, value } of newUtxos) {
                console.log(`[TransactionStatusPoller] Detected incoming transaction: ${txid}`);

                await transactionHistoryService.addIncomingTransaction(
                    chainType,
                    pubkey,
                    txid,
                    value.toString(),
                    'External', // We don't know the sender from UTXO data
                    currentAccount.address
                );
            }

            // Update known UTXOs (keep last 500 to avoid unbounded growth)
            const allKnownTxids = [...new Set([...knownTxids, ...currentTxids])].slice(-500);
            await transactionHistoryService.updateKnownUtxoTxids(chainType, pubkey, allKnownTxids);
        } catch (error) {
            console.error('[TransactionStatusPoller] Error checking incoming transactions:', error);
        }
    }

    /**
     * Force an immediate poll (useful after sending a transaction)
     */
    async pollNow(): Promise<void> {
        await this.poll();
    }
}

export default new TransactionStatusPoller();
