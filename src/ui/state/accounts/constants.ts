import { BitcoinBalance } from '@/shared/types';

/**
 * Default Bitcoin balance structure with all fields initialized to zero
 * Used across hooks and reducers to ensure consistency
 */
export const DEFAULT_BITCOIN_BALANCE: BitcoinBalance = {
    btc_total_amount: '0',
    btc_confirm_amount: '0',
    btc_pending_amount: '0',

    csv75_total_amount: '0',
    csv75_unlocked_amount: '0',
    csv75_locked_amount: '0',

    csv1_total_amount: '0',
    csv1_unlocked_amount: '0',
    csv1_locked_amount: '0',

    p2wda_pending_amount: '0',
    p2wda_total_amount: '0',

    consolidation_amount: '0',
    consolidation_unspent_amount: '0',
    consolidation_unspent_count: 0,
    consolidation_csv1_unlocked_amount: '0',
    consolidation_csv1_unlocked_count: 0,
    consolidation_csv75_unlocked_amount: '0',
    consolidation_csv75_unlocked_count: 0,
    consolidation_p2wda_unspent_amount: '0',
    consolidation_p2wda_unspent_count: 0,

    usd_value: '0.00',

    all_utxos_count: 0,
    unspent_utxos_count: 0,
    csv75_locked_utxos_count: 0,
    csv75_unlocked_utxos_count: 0,
    csv1_locked_utxos_count: 0,
    csv1_unlocked_utxos_count: 0,
    p2wda_utxos_count: 0,
    unspent_p2wda_utxos_count: 0
};
