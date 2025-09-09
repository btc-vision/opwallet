import { useCallback } from 'react';

import { useTools } from '@/ui/components/ActionComponent';
import { sleep, useWallet } from '@/ui/utils';
import { UnspentOutput } from '@btc-vision/wallet-sdk';

import { AppState } from '..';
import { useAppDispatch, useAppSelector } from '../hooks';
import { transactionsActions } from './reducer';

export function useTransactionsState(): AppState['transactions'] {
    return useAppSelector((state) => state.transactions);
}

export function useBitcoinTx() {
    const transactionsState = useTransactionsState();
    return transactionsState.bitcoinTx;
}

export function usePushBitcoinTxCallback() {
    const dispatch = useAppDispatch();
    const wallet = useWallet();
    const tools = useTools();
    return useCallback(
        async (rawtx: string) => {
            const ret = {
                success: false,
                txid: '',
                error: ''
            };
            try {
                tools.showLoading(true);
                const txid = await wallet.pushTx(rawtx);
                await sleep(3); // Wait for transaction synchronization
                tools.showLoading(false);
                dispatch(transactionsActions.updateBitcoinTx({ txid }));

                ret.success = true;
                ret.txid = txid;
            } catch (e) {
                ret.error = (e as Error).message;
                tools.showLoading(false);
            }

            return ret;
        },
        [dispatch, wallet]
    );
}

export function useSetSpendUnavailableUtxosCallback() {
    const dispatch = useAppDispatch();
    return useCallback(
        (utxos: UnspentOutput[]) => {
            dispatch(transactionsActions.setSpendUnavailableUtxos(utxos));
        },
        [dispatch]
    );
}
