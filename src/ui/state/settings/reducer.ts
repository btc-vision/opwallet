import { ChainType, DEFAULT_LOCKTIME_ID } from '@/shared/constant';
import { NetworkType, WalletConfig } from '@/shared/types';
import { AddressTypes } from '@btc-vision/transaction';
import { createSlice } from '@reduxjs/toolkit';

import { updateVersion } from '../global/actions';

export interface SettingsState {
    locale: string;
    addressType: AddressTypes;
    networkType: NetworkType;
    chainType: ChainType;
    walletConfig: WalletConfig;
    skippedVersion: string;
    autoLockTimeId: number;
}

export const initialState: SettingsState = {
    locale: 'English',
    addressType: AddressTypes.P2TR,
    networkType: NetworkType.MAINNET,
    chainType: ChainType.BITCOIN_MAINNET,
    walletConfig: {
        version: '',
        moonPayEnabled: true,
        statusMessage: '',
        endpoint: '',
        chainTip: ''
    },
    skippedVersion: '',
    autoLockTimeId: DEFAULT_LOCKTIME_ID
};

const slice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        reset() {
            return initialState;
        },
        updateSettings(
            state,
            action: {
                payload: {
                    locale?: string;
                    addressType?: AddressTypes;
                    networkType?: NetworkType;
                    walletConfig?: WalletConfig;
                    skippedVersion?: string;
                    chainType?: ChainType;
                    autoLockTimeId?: number;
                };
            }
        ) {
            const { payload } = action;
            state = Object.assign({}, state, payload);
            return state;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(updateVersion, (state) => {
            // todo
            if (!state.networkType) {
                state.networkType = NetworkType.MAINNET;
            }
        });
    }
});

export const settingsActions = slice.actions;
export default slice.reducer;
