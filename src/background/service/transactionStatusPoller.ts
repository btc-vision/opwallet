import { ChainType, EVENTS } from '@/shared/constant';
import { TransactionHistoryItem, TransactionStatus } from '@/shared/types/TransactionHistory';
import { RotatedAddressStatus, AddressRotationState } from '@/shared/types/AddressRotation';
import Web3API from '@/shared/web3/Web3API';
import { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import { NetworkType } from '@/shared/types';
import eventBus from '@/shared/eventBus';

import addressRotationService from './addressRotation';
import preferenceService from './preference';
import transactionHistoryService from './transactionHistory';
import keyringService from './keyring';

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
     * Main polling function - checks pending transaction status and rotation addresses
     * Heavy operations like full incoming transaction detection are done on-demand
     */
    private async poll(): Promise<void> {
        if (this.isPolling) {
            return; // Prevent overlapping polls
        }

        this.isPolling = true;

        try {
            // Poll pending transaction status - this is lightweight
            await this.pollPendingTransactions();

            // Check rotation addresses for auto-rotation feature
            // This is lightweight since it only checks rotation-enabled accounts
            await this.pollRotationAddresses();

            // NOTE: checkForIncomingTransactions() not called in background polling
            // It's called on-demand via refreshTransactionsNow() when user opens history page
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

        for (const { chainType, pubkey, transaction } of pendingTxs) {
            // Skip if we've exceeded max attempts
            if (transaction.statusCheckAttempts >= MAX_STATUS_CHECK_ATTEMPTS) {
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
                console.warn(`[TransactionStatusPoller] Error checking tx ${transaction.txid}:`, error);
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
        try {
            await Web3API.setNetwork(chainType);
        } catch (networkError) {
            console.error(`[TransactionStatusPoller] Failed to set network for ${chainType}:`, networkError);
            throw networkError;
        }

        try {
            const txResult = await Web3API.provider.getTransaction(transaction.txid);

            if (txResult && !('error' in txResult)) {
                // Transaction found and confirmed
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
     * Poll rotation addresses for all accounts with rotation mode enabled
     * This runs in the background to detect incoming funds and trigger auto-rotation
     */
    private async pollRotationAddresses(): Promise<void> {
        try {
            const currentAccount = preferenceService.getCurrentAccount();
            if (!currentAccount) {
                return;
            }

            const chainType = preferenceService.getChainType();
            const pubkey = currentAccount.pubkey;

            // Only check if rotation mode is enabled for current account
            const rotationState = addressRotationService.getRotationState(pubkey);
            if (!rotationState?.enabled) {
                return;
            }

            // Ensure Web3API is set to the correct network
            await Web3API.setNetwork(chainType);

            // Check rotation addresses for incoming funds
            await this.checkRotationAddresses(pubkey, chainType);
        } catch (error) {
            console.error('[TransactionStatusPoller] Error polling rotation addresses:', error);
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

            // Always notify UI of balance refresh so it can update display
            eventBus.emit(EVENTS.broadcastToUI, {
                method: 'rotationStateChanged',
                params: { pubkey }
            });
        } catch (error) {
            console.error('[TransactionStatusPoller] Error checking rotation addresses:', error);
        }
    }

    /**
     * Force an immediate poll (useful after sending a transaction)
     */
    async pollNow(): Promise<void> {
        await this.poll();
    }

    /**
     * Refresh transaction status on-demand
     * Called when user opens the transaction history page
     * Checks both pending transaction status and incoming transactions
     */
    async refreshTransactionsNow(): Promise<void> {
        if (this.isPolling) {
            return;
        }
        this.isPolling = true;
        try {
            await this.pollPendingTransactions();
            await this.checkForIncomingTransactions();
        } catch (error) {
            console.error('[TransactionStatusPoller] Error refreshing transactions:', error);
        } finally {
            this.isPolling = false;
        }
    }
}

export default new TransactionStatusPoller();
