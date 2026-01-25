import { NetworkType } from './types';

/**
 * Feature flags that can be toggled per network
 */
export interface FeatureFlags {
    /** .btc domain registration and resolution */
    btcDomains: boolean;
    /** Privacy mode (address rotation) */
    privacyMode: boolean;
}

/**
 * Network-specific feature configuration
 */
export type NetworkFeatureConfig = {
    [key in NetworkType]?: Partial<FeatureFlags>;
};

/**
 * Application configuration with default and network-specific overrides
 */
export interface AppConfig {
    /** Default feature flags (applied when no network-specific override exists) */
    defaults: FeatureFlags;
    /** Network-specific overrides */
    networks: NetworkFeatureConfig;
}

export const APP_CONFIG: AppConfig = {
    defaults: {
        btcDomains: false,
        privacyMode: false
    },
    networks: {
        [NetworkType.REGTEST]: {
            btcDomains: true,
            privacyMode: true
        }
    }
};

/**
 * Get the effective feature flags for a given network type
 */
export function getFeatureFlags(networkType: NetworkType): FeatureFlags {
    const networkOverrides = APP_CONFIG.networks[networkType] ?? {};
    return {
        ...APP_CONFIG.defaults,
        ...networkOverrides
    };
}

/**
 * Check if a specific feature is enabled for a network
 */
export function isFeatureEnabled(feature: keyof FeatureFlags, networkType: NetworkType): boolean {
    const flags = getFeatureFlags(networkType);
    return flags[feature];
}
