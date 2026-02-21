import { ChainType, DEFAULT_LOCKTIME_ID } from '@/shared/constant';
import { NetworkType, WalletConfig } from '@/shared/types';
import { AddressTypes } from '@btc-vision/transaction';
import { createSlice } from '@reduxjs/toolkit';

import { updateVersion } from '../global/actions';

export interface DisplaySettings {
    /** Decimal precision: -1 = full/current behavior, 0/2/4/8 = fixed decimals */
    decimalPrecision: number;
    /** Use K/M/B notation for large numbers */
    useKMBNotation: boolean;
    /** Use comma separators for thousands */
    useCommas: boolean;
}

export interface SettingsState {
    locale: string;
    addressType: AddressTypes;
    networkType: NetworkType;
    chainType: ChainType;
    walletConfig: WalletConfig;
    skippedVersion: string;
    autoLockTimeId: number;
    displaySettings: DisplaySettings;
    hasCompletedDisplaySetup: boolean;
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
    autoLockTimeId: DEFAULT_LOCKTIME_ID,
    displaySettings: {
        decimalPrecision: -1,
        useKMBNotation: false,
        useCommas: false
    },
    hasCompletedDisplaySetup: false
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
                    displaySettings?: DisplaySettings;
                    hasCompletedDisplaySetup?: boolean;
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
