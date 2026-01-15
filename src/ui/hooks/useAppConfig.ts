import { useMemo } from 'react';

import { FeatureFlags, getFeatureFlags, isFeatureEnabled } from '@/shared/appconfig';
import { useNetworkType } from '@/ui/state/settings/hooks';

/**
 * Hook to get all feature flags for the current network
 */
export function useFeatureFlags(): FeatureFlags {
    const networkType = useNetworkType();
    return useMemo(() => getFeatureFlags(networkType), [networkType]);
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeatureEnabled(feature: keyof FeatureFlags): boolean {
    const networkType = useNetworkType();
    return useMemo(() => isFeatureEnabled(feature, networkType), [feature, networkType]);
}

/**
 * Hook to check if .btc domains feature is enabled
 */
export function useBtcDomainsEnabled(): boolean {
    return useFeatureEnabled('btcDomains');
}

/**
 * Hook to check if privacy mode (address rotation) feature is enabled
 */
export function usePrivacyModeEnabled(): boolean {
    return useFeatureEnabled('privacyMode');
}
