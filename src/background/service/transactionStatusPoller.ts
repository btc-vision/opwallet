import { ChainType } from '@/shared/constant';
import { TransactionHistoryItem, TransactionStatus } from '@/shared/types/TransactionHistory';
import { RotatedAddressStatus, AddressRotationState } from '@/shared/types/AddressRotation';
import Web3API from '@/shared/web3/Web3API';
import { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import { NetworkType } from '@/shared/types';

import addressRotationService from './addressRotation';
import preferenceService from './preference';
import transactionHistoryService from './transactionHistory';
import keyringService from './keyring';

const POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_STATUS_CHECK_ATTEMPTS = 50; // ~25 minutes then stop checking individual tx
const CONFIRMATION_THRESHOLD = 1; // Consider confirmed after 1 confirmation for OPNet
const FINALIZATION_CONFIRMATIONS = 3; // Stop polling after 3 confirmations
const UTXO_CHECK_COOLDOWN_MS = 2 * 60 * 1000; // Only check UTXOs every 2 minutes when idle

class TransactionStatusPoller {
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private isPolling = false;
    private lastUtxoCheck = 0;
    private cachedBlockHeight: number | null = null;
    private cachedBlockHeightTimestamp = 0;

    /**
     * Start polling for transaction status updates
     */
    start(): void {
        if (this.pollInterval) {
            return; // Already running
        }

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
            // Poll transactions that need confirmation tracking (pending OR confirmed but not finalized)
            await this.pollTransactionsNeedingTracking();

            // Only check for incoming transactions if we haven't checked recently
            // or if there are recent unfinalized transactions
            const now = Date.now();
            const shouldCheckUtxos = now - this.lastUtxoCheck > UTXO_CHECK_COOLDOWN_MS;

            if (shouldCheckUtxos) {
                await this.checkForIncomingTransactions();
                this.lastUtxoCheck = now;
            }
        } catch (error) {
            console.error('[TransactionStatusPoller] Error during poll:', error);
        } finally {
            this.isPolling = false;
        }
    }

    /**
     * Check status of all transactions that need tracking (pending or confirmed but not finalized)
     */
    private async pollTransactionsNeedingTracking(): Promise<void> {
        const txsNeedingTracking = await transactionHistoryService.getTransactionsNeedingConfirmationTracking();

        if (txsNeedingTracking.length === 0) {
            return;
        }

        for (const { chainType, pubkey, transaction } of txsNeedingTracking) {
            // For pending transactions, check max attempts
            if (transaction.status === TransactionStatus.PENDING) {
                if (transaction.statusCheckAttempts >= MAX_STATUS_CHECK_ATTEMPTS) {
                    await transactionHistoryService.updateTransactionStatus(
                        chainType,
                        pubkey,
                        transaction.txid,
                        TransactionStatus.FAILED
                    );
                    continue;
                }
            }

            try {
                await this.checkTransactionStatus(chainType, pubkey, transaction);
            } catch (error) {
                console.warn(`[TransactionStatusPoller] Error checking tx ${transaction.txid}:`, error);
                // Only increment attempt counter for pending transactions
                if (transaction.status === TransactionStatus.PENDING) {
                    await transactionHistoryService.updateTransactionStatus(
                        chainType,
                        pubkey,
                        transaction.txid,
                        TransactionStatus.PENDING
                    );
                }
            }
        }
    }

    /**
     * Get current block height (cached for 30 seconds to reduce RPC calls)
     */
    private async getCurrentBlockHeight(chainType: ChainType): Promise<number | null> {
        const now = Date.now();
        // Use cached value if fresh (within 30 seconds)
        if (this.cachedBlockHeight && now - this.cachedBlockHeightTimestamp < 30000) {
            return this.cachedBlockHeight;
        }

        try {
            await Web3API.setNetwork(chainType);
            const blockNumber = await Web3API.provider.getBlockNumber();
            if (blockNumber !== undefined) {
                this.cachedBlockHeight = Number(blockNumber);
                this.cachedBlockHeightTimestamp = now;
                return this.cachedBlockHeight;
            }
        } catch (error) {
            console.warn('[TransactionStatusPoller] Failed to get block height:', error);
        }
        return this.cachedBlockHeight; // Return stale cache if available
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
        try {
            await Web3API.setNetwork(chainType);
        } catch (networkError) {
            console.error(`[TransactionStatusPoller] Failed to set network for ${chainType}:`, networkError);
            throw networkError;
        }

        try {
            const txResult = await Web3API.provider.getTransaction(transaction.txid);

            if (txResult && !('error' in txResult)) {
                const txBlockHeight = txResult.blockNumber !== undefined ? Number(txResult.blockNumber) : undefined;

                // Calculate actual confirmations
                let confirmations = CONFIRMATION_THRESHOLD;
                if (txBlockHeight !== undefined) {
                    const currentBlockHeight = await this.getCurrentBlockHeight(chainType);
                    if (currentBlockHeight !== null) {
                        confirmations = Math.max(1, currentBlockHeight - txBlockHeight + 1);
                    }
                }

                // Update transaction status
                await transactionHistoryService.updateTransactionStatus(
                    chainType,
                    pubkey,
                    transaction.txid,
                    TransactionStatus.CONFIRMED,
                    confirmations,
                    txBlockHeight
                );

                // If we have enough confirmations, mark as finalized (no more polling)
                if (confirmations >= FINALIZATION_CONFIRMATIONS) {
                    await transactionHistoryService.markTransactionFinalized(chainType, pubkey, transaction.txid);
                    console.log(
                        `[TransactionStatusPoller] Transaction ${transaction.txid.slice(0, 8)}... finalized with ${confirmations} confirmations`
                    );
                }
            } else if (txResult && 'error' in txResult) {
                // Transaction has an error - might be reverted
                const errorMsg = String(txResult.error);
                if (errorMsg.includes('reverted') || errorMsg.includes('failed')) {
                    await transactionHistoryService.updateTransactionStatus(
                        chainType,
                        pubkey,
                        transaction.txid,
                        TransactionStatus.FAILED
                    );
                }
            }
            // If txResult is null/undefined, transaction is still pending - just update attempt count
        } catch (error) {
            // Log the actual error for debugging
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Check for CSP or eval-related errors
            if (
                errorMessage.includes('eval') ||
                errorMessage.includes('CSP') ||
                errorMessage.includes('Content Security Policy')
            ) {
                console.error(
                    `[TransactionStatusPoller] CSP/eval error checking tx ${transaction.txid}:`,
                    errorMessage
                );
            } else {
                console.log(
                    `[TransactionStatusPoller] Transaction ${transaction.txid} not found yet (pending):`,
                    errorMessage
                );
            }

            // Re-throw to let the caller handle it
            throw error;
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

            // Check rotation mode addresses if enabled
            await this.checkRotationAddresses(pubkey, chainType);
        } catch (error) {
            console.error('[TransactionStatusPoller] Error checking incoming transactions:', error);
        }
    }

    /**
     * Check rotation mode addresses for incoming funds
     * Automatically rotates to next address when funds are detected
     */
    private async checkRotationAddresses(pubkey: string, chainType: ChainType): Promise<void> {
        try {
            const rotationState = addressRotationService.getRotationState(pubkey);
            if (!rotationState?.enabled) {
                return;
            }

            // Get addresses that need balance checking
            const addressesToCheck = rotationState.rotatedAddresses
                .filter(
                    (a) =>
                        a.status === RotatedAddressStatus.ACTIVE ||
                        a.status === RotatedAddressStatus.RECEIVED
                )
                .map((a) => a.address);

            if (addressesToCheck.length === 0) {
                return;
            }

            // Fetch UTXOs for all rotation addresses
            const utxos = await Web3API.getAllUTXOsForAddresses(addressesToCheck);

            // Group UTXOs by address
            const balancesByAddress = new Map<string, bigint>();
            for (const utxo of utxos) {
                const addr = utxo.scriptPubKey?.address || '';
                if (!addr) continue;
                const current = balancesByAddress.get(addr) || 0n;
                // utxo.value is already bigint from Web3API
                balancesByAddress.set(addr, current + utxo.value);
            }

            // Check current hot address for new funds
            const currentHot = addressRotationService.getCurrentHotAddress(pubkey);
            if (currentHot) {
                const newBalance = balancesByAddress.get(currentHot.address) || 0n;
                const prevBalance = BigInt(currentHot.currentBalance);

                if (newBalance > 0n && prevBalance === 0n) {
                    // New funds detected on current hot address - trigger rotation!
                    console.log(
                        `[TransactionStatusPoller] New funds detected on rotation address ${currentHot.address}: ${newBalance} sats`
                    );

                    // Get keyring index for derivation
                    const currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
                    const networkType = preferenceService.store.networkType;
                    const network = getBitcoinLibJSNetwork(networkType, chainType);

                    // Handle incoming funds (may trigger auto-rotation)
                    const rotated = await addressRotationService.handleIncomingFunds(
                        pubkey,
                        currentHot.address,
                        newBalance.toString(),
                        currentKeyringIndex,
                        network
                    );

                    if (rotated) {
                        console.log('[TransactionStatusPoller] Auto-rotated to new address');
                    }
                }
            }

            // Refresh all rotation address balances
            await addressRotationService.refreshAddressBalances(pubkey, chainType);
        } catch (error) {
            console.error('[TransactionStatusPoller] Error checking rotation addresses:', error);
        }
    }

    /**
     * Force an immediate poll (useful after sending a transaction)
     * Resets the UTXO check cooldown to ensure incoming transactions are detected
     */
    async pollNow(): Promise<void> {
        this.lastUtxoCheck = 0; // Reset cooldown to force UTXO check
        await this.poll();
    }

    /**
     * Reset block height cache (useful when switching networks)
     */
    resetBlockHeightCache(): void {
        this.cachedBlockHeight = null;
        this.cachedBlockHeightTimestamp = 0;
    }
}

export default new TransactionStatusPoller();
