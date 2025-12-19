import { UTXO_CONFIG } from '@/shared/config';
import { Action, Features, SendBitcoinParameters, SourceType } from '@/shared/interfaces/RawTxParameters';
import { BitcoinBalance } from '@/shared/types';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useResetUiTxCreateScreen } from '@/ui/state/ui/hooks';
import { useWallet } from '@/ui/utils';
import { useCallback } from 'react';
import { RouteTypes, useNavigate } from '../../../MainRoute';

/**
 * Type of account for UTXO consolidation
 */
export type ConsolidationType = 'unspent' | 'csv75' | 'csv2' | 'csv1' | 'p2wda';

/**
 * Optimization status for the wallet
 */
export type OptimizationStatus = 'needs_split' | 'needs_consolidate' | 'optimized';

/**
 * Result of UTXO limit check
 */
export interface UTXOLimitStatus {
    /** Whether any UTXO category has reached the limit */
    hasReachedLimit: boolean;
    /** Maximum number of UTXOs that can be consolidated */
    consolidationLimit: number;
}

/**
 * Result of UTXO warning threshold check
 */
export interface UTXOWarningStatus {
    /** Whether any UTXO category has reached the warning threshold */
    hasReachedWarning: boolean;
    /** Warning threshold value */
    warningThreshold: number;
}

/**
 * Result of wallet optimization status check
 */
export interface OptimizationStatusResult {
    /** Current optimization status */
    status: OptimizationStatus;
    /** Combined UTXO count (csv1 unlocked + main wallet unspent) */
    utxoCount: number;
    /** Split threshold */
    splitThreshold: number;
    /** Consolidate threshold */
    consolidateThreshold: number;
    /** Available balance in satoshis for splitting */
    availableBalance: bigint;
}

/**
 * Hook to manage UTXO consolidation and optimization logic
 * Handles checking limits and navigating to consolidation/split screens
 */
export function useConsolidation() {
    const wallet = useWallet();
    const currentAccount = useCurrentAccount();
    const resetUiTxCreateScreen = useResetUiTxCreateScreen();
    const navigate = useNavigate();

    /**
     * Check if any UTXO category has reached the warning threshold (yellow indicator)
     */
    const checkUTXOWarning = useCallback((accountBalance: BitcoinBalance): UTXOWarningStatus => {
        const warningThreshold = UTXO_CONFIG.WARNING_THRESHOLD;

        // Check if ANY individual category has reached the warning threshold
        const hasReachedWarning =
            accountBalance.unspent_utxos_count >= warningThreshold ||
            accountBalance.csv75_locked_utxos_count >= warningThreshold ||
            accountBalance.csv75_unlocked_utxos_count >= warningThreshold ||
            accountBalance.csv2_locked_utxos_count >= warningThreshold ||
            accountBalance.csv2_unlocked_utxos_count >= warningThreshold ||
            accountBalance.csv1_locked_utxos_count >= warningThreshold ||
            accountBalance.csv1_unlocked_utxos_count >= warningThreshold ||
            accountBalance.p2wda_utxos_count >= warningThreshold ||
            accountBalance.unspent_p2wda_utxos_count >= warningThreshold;

        return {
            hasReachedWarning,
            warningThreshold
        };
    }, []);

    /**
     * Check if any UTXO category has reached the maximum limit
     */
    const checkUTXOLimit = useCallback((accountBalance: BitcoinBalance): UTXOLimitStatus => {
        const maxUTXOs = UTXO_CONFIG.MAX_UTXOS;
        const consolidationLimit = UTXO_CONFIG.CONSOLIDATION_LIMIT;

        const hasReachedLimit =
            accountBalance.all_utxos_count >= maxUTXOs ||
            accountBalance.unspent_utxos_count >= maxUTXOs ||
            accountBalance.csv75_locked_utxos_count >= maxUTXOs ||
            accountBalance.csv75_unlocked_utxos_count >= maxUTXOs ||
            accountBalance.csv2_locked_utxos_count >= maxUTXOs ||
            accountBalance.csv2_unlocked_utxos_count >= maxUTXOs ||
            accountBalance.csv1_locked_utxos_count >= maxUTXOs ||
            accountBalance.csv1_unlocked_utxos_count >= maxUTXOs ||
            accountBalance.p2wda_utxos_count >= maxUTXOs ||
            accountBalance.unspent_p2wda_utxos_count >= maxUTXOs;

        return {
            hasReachedLimit,
            consolidationLimit
        };
    }, []);

    /**
     * Check wallet optimization status
     * Combines csv1 unlocked UTXOs + main wallet unspent UTXOs for the count
     */
    const checkOptimizationStatus = useCallback((accountBalance: BitcoinBalance): OptimizationStatusResult => {
        const splitThreshold = UTXO_CONFIG.SPLIT_THRESHOLD;
        const consolidateThreshold = UTXO_CONFIG.CONSOLIDATE_THRESHOLD;

        // Combined UTXO count: csv1 unlocked + main wallet unspent
        const utxoCount = accountBalance.csv1_unlocked_utxos_count + accountBalance.unspent_utxos_count;

        // Available balance for splitting (csv1 unlocked + main wallet confirmed)
        const csv1UnlockedAmount = BigInt(
            Math.floor(parseFloat(accountBalance.csv1_unlocked_amount || '0') * 1e8)
        );
        const mainConfirmedAmount = BigInt(
            Math.floor(parseFloat(accountBalance.btc_confirm_amount || '0') * 1e8)
        );
        const availableBalance = csv1UnlockedAmount + mainConfirmedAmount;

        let status: OptimizationStatus;
        if (utxoCount < splitThreshold) {
            status = 'needs_split';
        } else if (utxoCount > consolidateThreshold) {
            status = 'needs_consolidate';
        } else {
            status = 'optimized';
        }

        return {
            status,
            utxoCount,
            splitThreshold,
            consolidateThreshold,
            availableBalance
        };
    }, []);

    /**
     * Determine which account type has the most UTXOs available for consolidation
     * Priority order (in case of equality): unspent > csv1 > csv2 > p2wda > csv75
     */
    const selectConsolidationType = useCallback(
        (
            freshBalance: BitcoinBalance
        ): {
            type: ConsolidationType;
            count: number;
        } => {
            const consolidationCounts = {
                unspent: freshBalance.unspent_utxos_count,
                csv75: freshBalance.csv75_unlocked_utxos_count,
                csv2: freshBalance.csv2_unlocked_utxos_count,
                csv1: freshBalance.csv1_unlocked_utxos_count,
                p2wda: freshBalance.p2wda_utxos_count
            };

            // Find the type with the most UTXOs
            // Check in reverse priority order (lowest to highest)
            let selectedType: ConsolidationType = 'unspent';
            let maxCount = consolidationCounts.unspent;

            if (consolidationCounts.csv75 >= maxCount) {
                selectedType = 'csv75';
                maxCount = consolidationCounts.csv75;
            }
            if (consolidationCounts.p2wda >= maxCount) {
                selectedType = 'p2wda';
                maxCount = consolidationCounts.p2wda;
            }
            if (consolidationCounts.csv2 >= maxCount) {
                selectedType = 'csv2';
                maxCount = consolidationCounts.csv2;
            }
            if (consolidationCounts.csv1 >= maxCount) {
                selectedType = 'csv1';
                maxCount = consolidationCounts.csv1;
            }
            if (consolidationCounts.unspent >= maxCount) {
                selectedType = 'unspent';
                maxCount = consolidationCounts.unspent;
            }

            return {
                type: selectedType,
                count: maxCount
            };
        },
        []
    );

    /**
     * Navigate to the consolidation screen with the appropriate account type selected
     */
    const navigateToConsolidation = useCallback(async () => {
        resetUiTxCreateScreen();

        // Fetch fresh balance data directly to ensure we have the latest consolidation counts
        const freshBalance = await wallet.getAddressBalance(currentAccount.address, currentAccount.pubkey);

        // Determine which account has the most UTXOs to consolidate
        const { type, count } = selectConsolidationType(freshBalance);

        // Limit to the actual consolidation limit (1400)
        const consolidationLimit = UTXO_CONFIG.CONSOLIDATION_LIMIT;
        const actualUTXOsToConsolidate = Math.min(count, consolidationLimit);

        navigate(RouteTypes.TxCreateScreen, {
            consolidation: {
                enabled: true,
                selectedType: type,
                maxUTXOs: actualUTXOsToConsolidate,
                autoFillAmount: true
            }
        });
    }, [wallet, currentAccount, resetUiTxCreateScreen, navigate, selectConsolidationType]);

    /**
     * Navigate directly to the confirmation screen with split parameters
     */
    const navigateToSplit = useCallback(
        async (splitCount: number, feeRate: number) => {
            resetUiTxCreateScreen();

            // Fetch fresh balance to get accurate amount
            const freshBalance = await wallet.getAddressBalance(currentAccount.address, currentAccount.pubkey);

            // Use confirmed amount from main wallet for splitting
            const splitAmount = freshBalance.btc_confirm_amount || '0';
            const inputAmount = parseFloat(splitAmount);

            if (inputAmount <= 0) {
                throw new Error('No available balance to split');
            }

            // Build the transaction parameters
            const txParams: SendBitcoinParameters = {
                to: currentAccount.address, // Send to self
                inputAmount: inputAmount,
                feeRate: feeRate,
                features: { [Features.rbf]: true, [Features.taproot]: true },
                priorityFee: 0n,
                header: 'Split UTXOs',
                tokens: [],
                action: Action.SendBitcoin,
                note: `UTXO Split - Creating ${splitCount} UTXOs`,
                from: currentAccount.address,
                sourceType: SourceType.CURRENT,
                optimize: true,
                splitInputsInto: splitCount
            };

            // Navigate directly to confirmation screen
            navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo: txParams });
        },
        [wallet, currentAccount, resetUiTxCreateScreen, navigate]
    );

    /**
     * Validate if a split is possible with the given parameters
     * @param totalAmount Total amount in satoshis to split
     * @param splitCount Number of UTXOs to split into
     * @returns Whether each output will be >= MIN_SPLIT_OUTPUT
     */
    const validateSplit = useCallback((totalAmount: bigint, splitCount: number): boolean => {
        if (splitCount <= 0) return false;
        const outputAmount = totalAmount / BigInt(splitCount);
        return outputAmount >= BigInt(UTXO_CONFIG.MIN_SPLIT_OUTPUT);
    }, []);

    /**
     * Calculate the maximum number of splits possible for a given amount
     * @param totalAmount Total amount in satoshis
     * @returns Maximum number of valid splits
     */
    const calculateMaxSplits = useCallback((totalAmount: bigint): number => {
        const minOutput = BigInt(UTXO_CONFIG.MIN_SPLIT_OUTPUT);
        if (totalAmount < minOutput) return 0;
        return Number(totalAmount / minOutput);
    }, []);

    return {
        checkUTXOLimit,
        checkUTXOWarning,
        checkOptimizationStatus,
        navigateToConsolidation,
        navigateToSplit,
        validateSplit,
        calculateMaxSplits
    };
}
