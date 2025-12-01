import { useCallback } from 'react';

import { Account } from '@/shared/types';
import { useWallet } from '@/ui/utils';
import { AppState } from '..';
import { useAppDispatch, useAppSelector } from '../hooks';
import { keyringsActions } from '../keyrings/reducer';
import { settingsActions } from '../settings/reducer';
import { DEFAULT_BITCOIN_BALANCE } from './constants';
import { accountActions } from './reducer';

export function useAccountsState(): AppState['accounts'] {
    return useAppSelector((state) => state.accounts);
}

export function useCurrentAccount() {
    const accountsState = useAccountsState();
    return accountsState.current;
}

export function useAccountBalance() {
    const accountsState = useAccountsState();
    const currentAccount = useCurrentAccount();

    return accountsState.balanceMap[currentAccount.address] || DEFAULT_BITCOIN_BALANCE;
}

export function useAddressSummary() {
    const accountsState = useAccountsState();
    return accountsState.addressSummary;
}

export function useAppSummary() {
    const accountsState = useAccountsState();
    return accountsState.appSummary;
}

export function useUnreadAppSummary() {
    const accountsState = useAccountsState();
    const summary = accountsState.appSummary;
    return summary.apps.find((w) => w.time && summary.readTabTime && w.time > summary.readTabTime);
}

export function useReadApp() {
    const wallet = useWallet();
    const dispatch = useAppDispatch();
    return useCallback(
        async (id: number) => {
            await wallet.readApp(id);
            const appSummary = await wallet.getAppSummary();
            dispatch(accountActions.setAppSummary(appSummary));
        },
        [dispatch, wallet]
    );
}

export function useAccountAddress() {
    const currentAccount = useCurrentAccount();
    return currentAccount.address;
}

export function useAccountPublicKey() {
    const currentAccount = useCurrentAccount();

    return {
        pubkey: currentAccount.pubkey,
        mldsa: currentAccount.quantumPublicKeyHash
    };
}

export function useSetCurrentAccountCallback() {
    const dispatch = useAppDispatch();
    return useCallback(
        (account: Account) => {
            dispatch(accountActions.setCurrent(account));
        },
        [dispatch]
    );
}

export function useFetchBalanceCallback() {
    const dispatch = useAppDispatch();
    const wallet = useWallet();
    const currentAccount = useCurrentAccount();

    return useCallback(async () => {
        if (!currentAccount.address) return;

        const accountBalance = await wallet.getAddressBalance(currentAccount.address, currentAccount.pubkey);

        const balanceToDispatch = {
            address: currentAccount.address,

            btc_total_amount: accountBalance.btc_total_amount,
            btc_confirm_amount: accountBalance.btc_confirm_amount,
            btc_pending_amount: accountBalance.btc_pending_amount,

            csv75_total_amount: accountBalance.csv75_total_amount ?? '0',
            csv75_unlocked_amount: accountBalance.csv75_unlocked_amount ?? '0',
            csv75_locked_amount: accountBalance.csv75_locked_amount ?? '0',

            csv2_total_amount: accountBalance.csv2_total_amount ?? '0',
            csv2_unlocked_amount: accountBalance.csv2_unlocked_amount ?? '0',
            csv2_locked_amount: accountBalance.csv2_locked_amount ?? '0',

            csv1_total_amount: accountBalance.csv1_total_amount ?? '0',
            csv1_unlocked_amount: accountBalance.csv1_unlocked_amount ?? '0',
            csv1_locked_amount: accountBalance.csv1_locked_amount ?? '0',

            p2wda_pending_amount: accountBalance.p2wda_pending_amount ?? '0',
            p2wda_total_amount: accountBalance.p2wda_total_amount ?? '0',

            consolidation_amount: accountBalance.consolidation_amount,
            consolidation_unspent_amount: accountBalance.consolidation_unspent_amount,
            consolidation_unspent_count: accountBalance.consolidation_unspent_count,
            consolidation_csv75_unlocked_amount: accountBalance.consolidation_csv75_unlocked_amount,
            consolidation_csv75_unlocked_count: accountBalance.consolidation_csv75_unlocked_count,
            consolidation_csv2_unlocked_amount: accountBalance.consolidation_csv2_unlocked_amount,
            consolidation_csv2_unlocked_count: accountBalance.consolidation_csv2_unlocked_count,
            consolidation_csv1_unlocked_amount: accountBalance.consolidation_csv1_unlocked_amount,
            consolidation_csv1_unlocked_count: accountBalance.consolidation_csv1_unlocked_count,
            consolidation_p2wda_unspent_amount: accountBalance.consolidation_p2wda_unspent_amount,
            consolidation_p2wda_unspent_count: accountBalance.consolidation_p2wda_unspent_count,

            usd_value: accountBalance.usd_value,

            all_utxos_count: accountBalance.all_utxos_count,
            unspent_utxos_count: accountBalance.unspent_utxos_count,
            csv75_locked_utxos_count: accountBalance.csv75_locked_utxos_count,
            csv75_unlocked_utxos_count: accountBalance.csv75_unlocked_utxos_count,
            csv2_locked_utxos_count: accountBalance.csv2_locked_utxos_count,
            csv2_unlocked_utxos_count: accountBalance.csv2_unlocked_utxos_count,
            csv1_locked_utxos_count: accountBalance.csv1_locked_utxos_count,
            csv1_unlocked_utxos_count: accountBalance.csv1_unlocked_utxos_count,
            p2wda_utxos_count: accountBalance.p2wda_utxos_count,
            unspent_p2wda_utxos_count: accountBalance.unspent_p2wda_utxos_count
        };

        dispatch(accountActions.setBalance(balanceToDispatch));

        dispatch(
            accountActions.setAddressSummary({
                address: currentAccount.address,
                loading: false,
                totalSatoshis: 0
            })
        );
    }, [dispatch, wallet, currentAccount]);
}

export function useReloadAccounts() {
    const dispatch = useAppDispatch();
    const wallet = useWallet();
    return useCallback(async () => {
        const keyrings = await wallet.getKeyrings();
        dispatch(keyringsActions.setKeyrings(keyrings));

        const currentKeyring = await wallet.getCurrentKeyring();
        dispatch(keyringsActions.setCurrent(currentKeyring));

        const _accounts = await wallet.getAccounts();
        dispatch(accountActions.setAccounts(_accounts));

        const account = await wallet.getCurrentAccount();
        dispatch(accountActions.setCurrent(account));

        const configs = await wallet.getWalletConfig();
        dispatch(settingsActions.updateSettings({ walletConfig: configs }));
    }, [dispatch, wallet]);
}
