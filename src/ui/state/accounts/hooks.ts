import { useCallback } from 'react';

import { Account } from '@/shared/types';
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
        accountsState.balanceMap[currentAccount.address] || {
            amount: '0',
            expired: true,
            confirm_btc_amount: '0',
            pending_btc_amount: '0',
            inscription_amount: '0'
        }
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

        const cachedBalance = await wallet.getAddressCacheBalance(currentAccount.address);
        const _accountBalance = await wallet.getAddressBalance(currentAccount.address);

        dispatch(
            accountActions.setBalance({
                address: currentAccount.address,
                amount: _accountBalance.amount,
                btc_amount: _accountBalance.btc_amount,
                inscription_amount: _accountBalance.inscription_amount,
                confirm_btc_amount: _accountBalance.confirm_btc_amount,
                pending_btc_amount: _accountBalance.pending_btc_amount
            })
        );

        if (cachedBalance.amount !== _accountBalance.amount) {
            dispatch(accountActions.expireHistory());
        }

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

        dispatch(accountActions.expireBalance());
        dispatch(accountActions.expireInscriptions());

        const configs = await wallet.getWalletConfig();
        dispatch(settingsActions.updateSettings({ walletConfig: configs }));
    }, [dispatch, wallet]);
}
