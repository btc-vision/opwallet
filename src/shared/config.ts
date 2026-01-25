export const UTXO_CONFIG = {
    /**
     * Maximum number of UTXOs allowed before triggering warnings
     * When this limit is reached, users should consolidate their UTXOs
     */
    MAX_UTXOS: 2000,

    /**
     * Warning threshold for UTXO count (yellow warning)
     * UI will show yellow warning indicators when UTXO count exceeds this value
     */
    WARNING_THRESHOLD: 500,

    /**
     * Error threshold for UTXO count (red warning)
     * UI will show red warning indicators when UTXO count exceeds this value
     */
    ERROR_THRESHOLD: 1500,

    /**
     * Maximum number of UTXOs that can be consolidated in a single transaction
     * This is a technical limitation based on transaction size constraints
     */
    CONSOLIDATION_LIMIT: 1400,

    /**
     * Split threshold - below this UTXO count, suggest splitting
     * Having fewer UTXOs limits parallel contract interactions per block
     */
    SPLIT_THRESHOLD: 25,

    /**
     * Consolidate threshold - above this UTXO count, suggest consolidating
     * Too many UTXOs can slow down wallet operations
     */
    CONSOLIDATE_THRESHOLD: 300,

    /**
     * Minimum satoshis per output when splitting UTXOs
     * Each split output must be at least this value to be valid
     */
    MIN_SPLIT_OUTPUT: 20000
} as const;
