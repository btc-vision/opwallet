/**
 * Address Rotation Redux Slice
 *
 * Manages UI state for the address rotation privacy feature.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RotatedAddress, RotationModeSummary } from '@/shared/types/AddressRotation';

export interface RotationState {
    /** Whether rotation mode is enabled for current account */
    enabled: boolean;
    /** Loading state for async operations */
    loading: boolean;
    /** Summary data from backend */
    summary: RotationModeSummary | null;
    /** Current active hot address */
    currentAddress: RotatedAddress | null;
    /** Full rotation history */
    history: RotatedAddress[];
    /** Whether rotation mode is supported (HD wallet only) */
    isSupported: boolean;
    /** Last refresh timestamp */
    lastRefresh: number;
}

export const initialState: RotationState = {
    enabled: false,
    loading: false,
    summary: null,
    currentAddress: null,
    history: [],
    isSupported: false,
    lastRefresh: 0
};

const slice = createSlice({
    name: 'rotation',
    initialState,
    reducers: {
        reset() {
            return initialState;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        setEnabled(state, action: PayloadAction<boolean>) {
            state.enabled = action.payload;
        },
        setSupported(state, action: PayloadAction<boolean>) {
            state.isSupported = action.payload;
        },
        setSummary(state, action: PayloadAction<RotationModeSummary | null>) {
            state.summary = action.payload;
            if (action.payload) {
                state.enabled = action.payload.enabled;
            }
        },
        setCurrentAddress(state, action: PayloadAction<RotatedAddress | null>) {
            state.currentAddress = action.payload;
        },
        setHistory(state, action: PayloadAction<RotatedAddress[]>) {
            state.history = action.payload;
        },
        setLastRefresh(state, action: PayloadAction<number>) {
            state.lastRefresh = action.payload;
        },
        updateRotationData(
            state,
            action: PayloadAction<{
                enabled?: boolean;
                summary?: RotationModeSummary | null;
                currentAddress?: RotatedAddress | null;
                history?: RotatedAddress[];
                isSupported?: boolean;
            }>
        ) {
            const { payload } = action;
            if (payload.enabled !== undefined) state.enabled = payload.enabled;
            if (payload.summary !== undefined) state.summary = payload.summary;
            if (payload.currentAddress !== undefined) state.currentAddress = payload.currentAddress;
            if (payload.history !== undefined) state.history = payload.history;
            if (payload.isSupported !== undefined) state.isSupported = payload.isSupported;
            state.lastRefresh = Date.now();
        }
    }
});

export const rotationActions = slice.actions;
export default slice.reducer;
