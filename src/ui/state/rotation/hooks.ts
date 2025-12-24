/**
 * Address Rotation Hooks
 *
 * React hooks for accessing and managing rotation state.
 */
import { useCallback, useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../hooks';
import { rotationActions } from './reducer';
import { useWallet } from '@/ui/utils';
import { RotationModeUpdateSettings } from '@/shared/types/AddressRotation';
import type { AppState } from '../index';

// ==================== Selectors ====================

export const useRotationState = (): AppState['rotation'] => {
    return useAppSelector((state) => state.rotation);
};

export const useRotationEnabled = (): boolean => {
    return useAppSelector((state) => state.rotation.enabled);
};

/**
 * Check if the current keyring was created with rotation mode (permanent choice).
 * This is set at wallet creation time and cannot be changed.
 */
export const useKeyringRotationMode = () => {
    const wallet = useWallet();
    const [isKeyringRotationMode, setIsKeyringRotationMode] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkKeyringRotationMode = async () => {
            try {
                const result = await wallet.isKeyringRotationMode();
                setIsKeyringRotationMode(result);
            } catch (error) {
                console.error('[useKeyringRotationMode] Error:', error);
            } finally {
                setLoading(false);
            }
        };

        void checkKeyringRotationMode();
    }, [wallet]);

    return { isKeyringRotationMode, loading };
};

export const useRotationSupported = (): boolean => {
    return useAppSelector((state) => state.rotation.isSupported);
};

export const useRotationLoading = (): boolean => {
    return useAppSelector((state) => state.rotation.loading);
};

export const useRotationSummary = () => {
    return useAppSelector((state) => state.rotation.summary);
};

export const useCurrentRotationAddress = () => {
    return useAppSelector((state) => state.rotation.currentAddress);
};

export const useRotationHistory = () => {
    return useAppSelector((state) => state.rotation.history);
};

// ==================== Actions ====================

/**
 * Hook to refresh all rotation data from the backend
 */
export const useRefreshRotation = () => {
    const wallet = useWallet();
    const dispatch = useAppDispatch();

    return useCallback(async () => {
        dispatch(rotationActions.setLoading(true));
        try {
            const [isSupported, isEnabled] = await Promise.all([
                wallet.isRotationModeSupported(),
                wallet.isRotationModeEnabled()
            ]);

            dispatch(rotationActions.setSupported(isSupported));

            if (isEnabled) {
                const [summary, currentAddress, history] = await Promise.all([
                    wallet.getRotationModeSummary(),
                    wallet.getCurrentHotAddress(),
                    wallet.getRotationHistory()
                ]);

                dispatch(
                    rotationActions.updateRotationData({
                        enabled: true,
                        summary,
                        currentAddress,
                        history,
                        isSupported
                    })
                );
            } else {
                dispatch(
                    rotationActions.updateRotationData({
                        enabled: false,
                        summary: null,
                        currentAddress: null,
                        history: [],
                        isSupported
                    })
                );
            }
        } catch (error) {
            console.error('[useRefreshRotation] Error:', error);
        } finally {
            dispatch(rotationActions.setLoading(false));
        }
    }, [wallet, dispatch]);
};

/**
 * Hook to enable rotation mode
 */
export const useEnableRotationMode = () => {
    const wallet = useWallet();
    const dispatch = useAppDispatch();
    const refreshRotation = useRefreshRotation();

    return useCallback(async () => {
        dispatch(rotationActions.setLoading(true));
        try {
            await wallet.enableRotationMode();
            await refreshRotation();
            return true;
        } catch (error) {
            console.error('[useEnableRotationMode] Error:', error);
            return false;
        } finally {
            dispatch(rotationActions.setLoading(false));
        }
    }, [wallet, dispatch, refreshRotation]);
};

/**
 * Hook to disable rotation mode
 */
export const useDisableRotationMode = () => {
    const wallet = useWallet();
    const dispatch = useAppDispatch();

    return useCallback(async () => {
        dispatch(rotationActions.setLoading(true));
        try {
            await wallet.disableRotationMode();
            dispatch(
                rotationActions.updateRotationData({
                    enabled: false,
                    summary: null,
                    currentAddress: null,
                    history: []
                })
            );
            return true;
        } catch (error) {
            console.error('[useDisableRotationMode] Error:', error);
            return false;
        } finally {
            dispatch(rotationActions.setLoading(false));
        }
    }, [wallet, dispatch]);
};

/**
 * Hook to manually rotate to the next address
 */
export const useRotateToNextAddress = () => {
    const wallet = useWallet();
    const dispatch = useAppDispatch();
    const refreshRotation = useRefreshRotation();

    return useCallback(async () => {
        dispatch(rotationActions.setLoading(true));
        try {
            const newAddress = await wallet.rotateToNextAddress();
            dispatch(rotationActions.setCurrentAddress(newAddress));
            await refreshRotation();
            return newAddress;
        } catch (error) {
            console.error('[useRotateToNextAddress] Error:', error);
            return null;
        } finally {
            dispatch(rotationActions.setLoading(false));
        }
    }, [wallet, dispatch, refreshRotation]);
};

/**
 * Hook to refresh rotation address balances
 */
export const useRefreshRotationBalances = () => {
    const wallet = useWallet();
    const refreshRotation = useRefreshRotation();

    return useCallback(async () => {
        try {
            await wallet.refreshRotationBalances();
            await refreshRotation();
        } catch (error) {
            console.error('[useRefreshRotationBalances] Error:', error);
        }
    }, [wallet, refreshRotation]);
};

/**
 * Hook to update rotation settings
 */
export const useUpdateRotationSettings = () => {
    const wallet = useWallet();
    const refreshRotation = useRefreshRotation();

    return useCallback(
        async (settings: RotationModeUpdateSettings) => {
            try {
                await wallet.updateRotationSettings(settings);
                await refreshRotation();
                return true;
            } catch (error) {
                console.error('[useUpdateRotationSettings] Error:', error);
                return false;
            }
        },
        [wallet, refreshRotation]
    );
};
