/**
 * UTXO Management Configuration
 * Business rules for UTXO limits and thresholds
 * These values are shared between backend and frontend
 */
export const UTXO_CONFIG = {
    /**
     * Maximum number of UTXOs allowed before triggering warnings
     * When this limit is reached, users should consolidate their UTXOs
     */
    MAX_UTXOS: 2000,

    /**
     * Warning threshold for UTXO count
     * UI will show warning indicators when UTXO count exceeds this value
     */
    WARNING_THRESHOLD: 1500,

    /**
     * Maximum number of UTXOs that can be consolidated in a single transaction
     * This is a technical limitation based on transaction size constraints
     */
    CONSOLIDATION_LIMIT: 1400
} as const;
