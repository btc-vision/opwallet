// Wallet health check: derived from balance data, no effect needed
import { BitcoinBalance } from '@/shared/types';
import { amountToSatoshis } from '@/ui/utils';
import { WalletHealthType } from '@/ui/pages/Main/WalletTabScreen/constants';
import { BitcoinUtils } from 'opnet';

export type WalletHealthCheck = {
    type: WalletHealthType;
    show: boolean;
    hasCsv1?: boolean;
    hasCsv2?: boolean;
    hasCsv3?: boolean;
    hasCsv75?: boolean;
};

export const getWalletHealthChecks = (accountBalance: BitcoinBalance): WalletHealthCheck[] => {
    const checks: WalletHealthCheck[] = [];

    // Don't show popups if balance hasn't actually loaded (all zeros = likely fetch failed)
    if (
        accountBalance.btc_total_amount === '0' &&
        accountBalance.all_utxos_count === 0 &&
        accountBalance.csv1_unlocked_utxos_count === 0 &&
        accountBalance.csv1_locked_utxos_count === 0
    ) {
        return checks;
    }

    let show;
    const primarySats = amountToSatoshis(accountBalance.btc_total_amount || '0');

    // 1) Primary balance critically low (skip if CSV1 unlocked covers it)
    show = false;
    if (primarySats < 10000) {
        const csv1UnlockedSats = amountToSatoshis(accountBalance.csv1_unlocked_amount || '0');
        if (csv1UnlockedSats <= 10000) {
            show = true;
        }
    }
    checks.push({ type: 'low-balance', show });

    // 2) CSV UTXOs > 5 total, need consolidation with per-type warnings
    show = false;
    const mainBalance = BitcoinUtils.expandToDecimals(accountBalance.btc_total_amount || '0', 8);

    const totalCsvBalances =
        0n +
        BitcoinUtils.expandToDecimals(accountBalance.csv75_total_amount || '0', 8) +
        BitcoinUtils.expandToDecimals(accountBalance.csv3_total_amount || '0', 8) +
        BitcoinUtils.expandToDecimals(accountBalance.csv2_total_amount || '0', 8) +
        BitcoinUtils.expandToDecimals(accountBalance.csv1_total_amount || '0', 8);

    const totalCsvUtxos =
        accountBalance.csv1_locked_utxos_count +
        accountBalance.csv1_unlocked_utxos_count +
        accountBalance.csv2_locked_utxos_count +
        accountBalance.csv2_unlocked_utxos_count +
        accountBalance.csv3_locked_utxos_count +
        accountBalance.csv3_unlocked_utxos_count +
        accountBalance.csv75_locked_utxos_count +
        accountBalance.csv75_unlocked_utxos_count;

    // Only show csv health result if most of 50% of account balance is in CSV instead of main
    if (totalCsvUtxos > 5 && totalCsvBalances > mainBalance) {
        const hasCsv1 = accountBalance.csv1_locked_utxos_count + accountBalance.csv1_unlocked_utxos_count > 0;
        const hasCsv2 = accountBalance.csv2_locked_utxos_count + accountBalance.csv2_unlocked_utxos_count > 0;
        const hasCsv3 = accountBalance.csv3_locked_utxos_count + accountBalance.csv3_unlocked_utxos_count > 0;
        const hasCsv75 = accountBalance.csv75_locked_utxos_count + accountBalance.csv75_unlocked_utxos_count > 0;
        checks.push({ type: 'csv-consolidation', show: true, hasCsv1, hasCsv2, hasCsv3, hasCsv75 });
    } else {
        checks.push({ type: 'csv-consolidation', show });
    }

    // 3) Primary UTXOs too few for concurrent transactions
    //    Skip if multiple UTXOs are pending (all includes pending, unspent is confirmed only)
    show = false;
    const pendingUtxoCount = accountBalance.all_utxos_count - accountBalance.unspent_utxos_count;
    if (accountBalance.unspent_utxos_count < 5 && pendingUtxoCount < 2) {
        show = true;
    }
    checks.push({ type: 'low-utxos', show });

    // Return cumulated checks
    return checks;
};
