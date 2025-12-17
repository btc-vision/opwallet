/**
 * OPNet Protocol Handler Type Definitions
 *
 * Types for the opnet:// protocol handler and .btc domain resolution.
 */

import { NetworkType } from '../types';

// =============================================================================
// Contenthash Types
// =============================================================================

/** Contenthash type identifiers matching contract constants */
export enum ContenthashType {
    NONE = 0,
    CIDv0 = 1, // Qm... prefixed
    CIDv1 = 2, // bafy... prefixed
    IPNS = 3, // k... prefixed
    SHA256 = 4 // Raw hash
}

// =============================================================================
// Cache Types
// =============================================================================

/** Contenthash cache entry */
export interface ContenthashCacheEntry {
    domain: string; // Lowercase domain name
    contenthash: string; // IPFS CID or other content hash
    contenthashType: ContenthashType; // Type of contenthash
    resolvedAt: number; // Timestamp when resolved
    expiresAt: number; // TTL expiration timestamp
    networkType: NetworkType; // Which network this was resolved on
    ttl: number; // TTL in seconds from contract
}

/** Content cache entry for fetched IPFS content */
export interface ContentCacheEntry {
    cid: string; // IPFS CID
    content: string; // Content as string (for HTML/text)
    contentType: string; // MIME type
    fetchedAt: number; // Timestamp when fetched
    expiresAt: number; // Based on HTTP cache headers
    size: number; // Content size in bytes
}

// =============================================================================
// Gateway Types
// =============================================================================

/** Gateway health status */
export interface GatewayHealth {
    url: string;
    isHealthy: boolean;
    latency: number; // Milliseconds
    lastChecked: number; // Timestamp
    failureCount: number;
    successCount: number;
}

/** Gateway configuration */
export interface GatewayConfig {
    url: string;
    priority: number; // Lower = higher priority
    isDefault: boolean;
    isUserConfigured: boolean;
    isLocalNode: boolean;
}

// =============================================================================
// Settings Types
// =============================================================================

/** Cache settings stored in preferences */
export interface OpnetCacheSettings {
    contenthashTtlMs: number; // Default: 5 minutes (300000)
    contentCacheMaxSizeMb: number; // Default: 50 MB
    enableContentCache: boolean; // Default: true
    customGateways: GatewayConfig[];
    localIpfsNodeUrl: string | null; // e.g., "http://localhost:8080"
}

/** Browser settings stored in preferences */
export interface OpnetBrowserSettings {
    enabled: boolean; // Enable .btc browsing
    interceptHttp: boolean; // Intercept http://*.btc
    showRedirectNotification: boolean; // Show notification on redirect
    showResolverDetails: boolean; // Show CID in toolbar
}

// =============================================================================
// Domain Resolution Types
// =============================================================================

/** Resolved domain record from contract */
export interface OpnetDomainRecord {
    domain: string; // Full domain name
    owner: string; // Owner address
    contenthash: string; // IPFS CID or content identifier
    contenthashType: ContenthashType;
    ttl: number; // TTL in seconds
    createdAt: number; // Block number when registered
    exists: boolean;
}

/** Resolved subdomain record */
export interface OpnetSubdomainRecord {
    fullName: string; // subdomain.domain format
    owner: string; // Owner address
    parentHash: string; // Parent domain hash
    contenthash: string;
    contenthashType: ContenthashType;
    ttl: number;
    exists: boolean;
}

/** Resolved content ready for display */
export interface ResolvedContent {
    html: string;
    contentType: string;
    ipfsHash: string;
    domain: string;
    path: string;
    error?: string;
}

// =============================================================================
// Error Types
// =============================================================================

/** Error types for protocol handling */
export enum OpnetProtocolError {
    DOMAIN_NOT_REGISTERED = 'DOMAIN_NOT_REGISTERED',
    CONTENTHASH_EMPTY = 'CONTENTHASH_EMPTY',
    IPFS_UNREACHABLE = 'IPFS_UNREACHABLE',
    INDEXER_OFFLINE = 'INDEXER_OFFLINE',
    NETWORK_ERROR = 'NETWORK_ERROR',
    INVALID_CONTENTHASH = 'INVALID_CONTENTHASH',
    GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
    WALLET_LOCKED = 'WALLET_LOCKED'
}

/** Protocol error with details */
export interface OpnetProtocolErrorInfo {
    type: OpnetProtocolError;
    message: string;
    domain?: string;
    details?: string;
}

// =============================================================================
// URL Types
// =============================================================================

/** Parsed opnet:// URL */
export interface ParsedOpnetUrl {
    protocol: string; // 'opnet:' or 'web+opnet:'
    domain: string; // Lowercase domain (without .btc suffix)
    fullDomain: string; // Full domain including .btc
    path: string; // Path after domain
    query: string; // Query string
    hash: string; // Fragment
    isSubdomain: boolean;
    parentDomain?: string; // Parent domain if subdomain
    subdomainLabel?: string; // Subdomain label if subdomain
}

// =============================================================================
// Message Types for Background Communication
// =============================================================================

/** Message types for protocol handler */
export enum OpnetMessageType {
    RESOLVE_DOMAIN = 'opnet:resolveDomain',
    FETCH_CONTENT = 'opnet:fetchContent',
    GET_SETTINGS = 'opnet:getSettings',
    UPDATE_SETTINGS = 'opnet:updateSettings',
    CLEAR_CACHE = 'opnet:clearCache',
    GET_GATEWAYS = 'opnet:getGateways',
    ADD_GATEWAY = 'opnet:addGateway',
    REMOVE_GATEWAY = 'opnet:removeGateway',
    SET_LOCAL_NODE = 'opnet:setLocalNode',
    REFRESH_GATEWAYS = 'opnet:refreshGateways',
    GET_CACHE_STATS = 'opnet:getCacheStats'
}

/** Cache statistics */
export interface OpnetCacheStats {
    contenthashEntries: number;
    contentEntries: number;
    contentSizeMb: number;
    maxSizeMb: number;
}

// =============================================================================
// Default Values
// =============================================================================

/** Default cache settings */
export const DEFAULT_CACHE_SETTINGS: OpnetCacheSettings = {
    contenthashTtlMs: 5 * 60 * 1000, // 5 minutes
    contentCacheMaxSizeMb: 50,
    enableContentCache: true,
    customGateways: [],
    localIpfsNodeUrl: null
};

/** Default browser settings */
export const DEFAULT_BROWSER_SETTINGS: OpnetBrowserSettings = {
    enabled: true, // Enabled by default
    interceptHttp: true, // Intercept http://*.btc when enabled
    showRedirectNotification: false,
    showResolverDetails: false
};

/** Default IPFS gateways */
export const DEFAULT_IPFS_GATEWAYS: GatewayConfig[] = [
    {
        url: 'https://ipfs.opnet.org',
        priority: 0,
        isDefault: true,
        isUserConfigured: false,
        isLocalNode: false
    },
    {
        url: 'https://dweb.link',
        priority: 1,
        isDefault: true,
        isUserConfigured: false,
        isLocalNode: false
    },
    {
        url: 'https://cloudflare-ipfs.com',
        priority: 2,
        isDefault: true,
        isUserConfigured: false,
        isLocalNode: false
    }
];
