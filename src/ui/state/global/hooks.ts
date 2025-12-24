import { useCallback } from 'react';

import { useApproval, useWallet } from '@/ui/utils';
import { AddressTypes } from '@btc-vision/transaction';

import { AppState } from '..';
import { useAppDispatch, useAppSelector } from '../hooks';
import { globalActions } from './reducer';

export function useGlobalState(): AppState['global'] {
    return useAppSelector((state) => state.global);
}

export function useBooted() {
    const globalState = useGlobalState();
    return globalState.isBooted;
}

export function useIsUnlocked() {
    const globalState = useGlobalState();
    return globalState.isUnlocked;
}

export function useIsReady() {
    const globalState = useGlobalState();
    return globalState.isReady;
}

export function useUnlockCallback() {
    const dispatch = useAppDispatch();
    const wallet = useWallet();
    const { resolveApproval } = useApproval();
    return useCallback(
        async (password: string) => {
            await wallet.unlock(password);
            dispatch(globalActions.update({ isUnlocked: true }));
            await resolveApproval();
        },
        [dispatch, resolveApproval, wallet]
    );
}

export function useCreateAccountCallback() {
    const dispatch = useAppDispatch();
    const wallet = useWallet();
    return useCallback(
        async (
            mnemonics: string,
            hdPath: string,
            passphrase: string,
            addressType: AddressTypes,
            accountCount: number,
            rotationModeEnabled = false
        ) => {
            await wallet.createKeyringWithMnemonics(
                mnemonics,
                hdPath,
                passphrase,
                addressType,
                accountCount,
                rotationModeEnabled
            );
            dispatch(globalActions.update({ isUnlocked: true }));
        },
        [dispatch, wallet]
    );
}

export function useImportAccountsFromKeystoneCallback() {
    const dispatch = useAppDispatch();
    const wallet = useWallet();
    return useCallback(
        async (
            urType: string,
            urCbor: string,
            addressType: AddressTypes,
            accountCount: number,
            hdPath: string,
            filterPubkey?: string[]
        ) => {
            await wallet.createKeyringWithKeystone(urType, urCbor, addressType, hdPath, accountCount, filterPubkey);
            dispatch(globalActions.update({ isUnlocked: true }));
        },
        [dispatch, wallet]
    );
}
