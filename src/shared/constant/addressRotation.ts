/**
 * Derivation path for hot wallet rotating addresses
 * Uses BIP86 taproot path with change index (1) for rotation addresses
 * Format: m/86'/0'/0'/1/index
 *
 * This is the change address path, which is conventionally used for
 * internal wallet operations. Perfect for rotation addresses that
 * should not be reused.
 */
export const ROTATION_DERIVATION_PATH = "m/86'/0'/0'/1";

/**
 * Derivation path for cold wallet (MLDSA address)
 * Uses a dedicated branch (2) that is never used elsewhere
 * This is a single fixed address that is NEVER revealed to the user
 * Format: m/86'/0'/0'/2/0
 */
export const COLD_WALLET_DERIVATION_PATH = "m/86'/0'/0'/2/0";

/**
 * Default settings for rotation mode
 */
export const DEFAULT_ROTATION_SETTINGS = {
    /** Automatically rotate to next address after receiving funds */
    autoRotate: true,
    /** Minimum satoshis to trigger rotation (dust limit) */
    rotationThreshold: 546,
    /** Maximum number of addresses to keep in history */
    maxHistoryAddresses: 100,
    /** How often to refresh balances (in milliseconds) */
    balanceRefreshInterval: 30000
};

/**
 * Gap limit for address scanning during recovery
 * If this many consecutive addresses have no history, stop scanning
 */
export const ROTATION_GAP_LIMIT = 20;

/**
 * Storage key for rotation mode settings in browser.storage.local
 */
export const ROTATION_STORAGE_KEY = 'addressRotation';

/**
 * Maximum UTXOs to consolidate in a single transaction
 * Prevents transactions from becoming too large
 */
export const MAX_CONSOLIDATION_UTXOS = 100;

/**
 * Cold wallet derivation index
 * Uses a very high index (1 million) to ensure it never conflicts with
 * rotation addresses which start at index 0 and increment.
 * This provides complete separation between hot rotation addresses and cold storage.
 */
export const COLD_WALLET_INDEX = 1000000;

/**
 * Minimum confirmations required before auto-rotation triggers
 */
export const MIN_CONFIRMATIONS_FOR_ROTATION = 0; // Rotate immediately on detection

/**
 * Balance cache duration for rotation addresses (in milliseconds)
 */
export const ROTATION_BALANCE_CACHE_DURATION = 10000; // 10 seconds
