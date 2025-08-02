import { compareVersions } from 'compare-versions';
import { useCallback } from 'react';

import { CHAINS_MAP, ChainType, TypeChain, VERSION } from '@/shared/constant';
import { NetworkType } from '@/shared/types';
import { useWallet } from '@/ui/utils';

import { AppState } from '..';
import { useAppDispatch, useAppSelector } from '../hooks';
import { settingsActions } from './reducer';

export function useSettingsState(): AppState['settings'] {
    return useAppSelector((state) => state.settings);
}

export function useNetworkType() {
    const accountsState = useSettingsState();
    const chain = CHAINS_MAP[accountsState.chainType];
    if (chain) {
        return chain.networkType;
    } else if (accountsState.chainType === ChainType.BITCOIN_REGTEST) {
        return NetworkType.REGTEST;
    } else {
        return NetworkType.TESTNET;
    }
}

export function useChainType() {
    const accountsState = useSettingsState();
    return accountsState.chainType;
}

export function useChain(): TypeChain<ChainType> {
    const accountsState = useSettingsState();
    const chain = CHAINS_MAP[accountsState.chainType];

    if (!chain) throw new Error(`Chain not found for type: ${accountsState.chainType}`);

    return chain;
}

export function useChangeChainTypeCallback() {
    const dispatch = useAppDispatch();
    const wallet = useWallet();

    return useCallback(
        async (type: ChainType) => {
            await wallet.setChainType(type);
            dispatch(
                settingsActions.updateSettings({
                    chainType: type
                })
            );
        },
        [dispatch, wallet]
    );
}

export function useBTCUnit() {
    const chainType = useChainType();
    return CHAINS_MAP[chainType]?.unit || 'BTC';
}

export function useTxExplorerUrl(txId: string) {
    const chain = useChain();

    switch (chain?.enum) {
        case ChainType.BITCOIN_MAINNET:
            return `https://opscan.org/transactions/${txId}?network=mainnet`;
        case ChainType.BITCOIN_TESTNET:
            return `https://opscan.org/transactions/${txId}?network=testnet`;
        case ChainType.BITCOIN_REGTEST:
            return `https://opscan.org/transactions/${txId}?network=regtest`;
        default:
            return `https://opscan.org/transactions/${txId}`;
    }
}

export function useAddressExplorerUrl(address: string) {
    const chain = useChain();

    switch (chain?.enum) {
        case ChainType.BITCOIN_MAINNET:
            return `https://opscan.org/accounts/${address}?network=mainnet`;
        case ChainType.BITCOIN_TESTNET:
            return `https://opscan.org/accounts/${address}?network=testnet`;
        case ChainType.BITCOIN_REGTEST:
            return `https://opscan.org/accounts/${address}?network=regtest`;
        default:
            return `https://opscan.org/accounts/${address}`;
    }
}

export function useFaucetUrl() {
    const chain = useChain();
    return chain?.faucetUrl || '';
}

export function useWalletConfig() {
    const accountsState = useSettingsState();
    return accountsState.walletConfig;
}

export function useVersionInfo() {
    const accountsState = useSettingsState();
    const walletConfig = accountsState.walletConfig;
    const newVersion = walletConfig.version;
    const skippedVersion = accountsState.skippedVersion;
    const currentVesion = VERSION;
    let skipped = false;
    let latestVersion = '';
    // skip if new version is empty
    if (!newVersion) {
        skipped = true;
    }

    // skip if skipped
    if (newVersion == skippedVersion) {
        skipped = true;
    }

    // skip if current version is greater or equal to new version
    if (newVersion) {
        if (compareVersions(currentVesion, newVersion) >= 0) {
            skipped = true;
        } else {
            latestVersion = newVersion;
        }
    }

    // skip if current version is 0.0.0
    if (currentVesion === '0.0.0') {
        skipped = true;
    }
    return {
        currentVesion,
        newVersion,
        latestVersion,
        skipped
    };
}

export function useSkipVersionCallback() {
    const wallet = useWallet();
    const dispatch = useAppDispatch();
    return useCallback(
        async (version: string) => {
            await wallet.setSkippedVersion(version);
            dispatch(settingsActions.updateSettings({ skippedVersion: version }));
        },
        [dispatch, wallet]
    );
}

export function useAutoLockTimeId() {
    const state = useSettingsState();
    return state.autoLockTimeId;
}
