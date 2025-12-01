import { UTXO_CONFIG } from '@/shared/config';
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
 * Hook to manage UTXO consolidation logic
 * Handles checking limits and navigating to consolidation screen
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
                unspent: freshBalance.consolidation_unspent_count,
                csv75: freshBalance.consolidation_csv75_unlocked_count,
                csv2: freshBalance.consolidation_csv2_unlocked_count,
                csv1: freshBalance.consolidation_csv1_unlocked_count,
                p2wda: freshBalance.consolidation_p2wda_unspent_count
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

    return {
        checkUTXOLimit,
        checkUTXOWarning,
        navigateToConsolidation
    };
}
