import { useCallback } from 'react';

import { Account, BitcoinBalance } from '@/shared/types';
import { useWallet } from '@/ui/utils';
import { AppState } from '..';
import { useAppDispatch, useAppSelector } from '../hooks';
import { keyringsActions } from '../keyrings/reducer';
import { settingsActions } from '../settings/reducer';
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

    return (
        accountsState.balanceMap[currentAccount.address] ||
        ({
            btc_total_amount: '0',
            btc_confirm_amount: '0',
            btc_pending_amount: '0',

            csv75_total_amount: '0',
            csv75_unlocked_amount: '0',
            csv75_locked_amount: '0',

            csv1_total_amount: '0',
            csv1_unlocked_amount: '0',
            csv1_locked_amount: '0',

            usd_value: '0.00'
        } as BitcoinBalance)
    );
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
    return currentAccount.pubkey;
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

        dispatch(
            accountActions.setBalance({
                address: currentAccount.address,

                btc_total_amount: accountBalance.btc_total_amount,
                btc_confirm_amount: accountBalance.btc_confirm_amount,
                btc_pending_amount: accountBalance.btc_pending_amount,

                csv75_total_amount: accountBalance.csv75_total_amount ?? '0',
                csv75_unlocked_amount: accountBalance.csv75_unlocked_amount ?? '0',
                csv75_locked_amount: accountBalance.csv75_locked_amount ?? '0',

                csv1_total_amount: accountBalance.csv1_total_amount ?? '0',
                csv1_unlocked_amount: accountBalance.csv1_unlocked_amount ?? '0',
                csv1_locked_amount: accountBalance.csv1_locked_amount ?? '0',

                usd_value: accountBalance.usd_value
            })
        );

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
