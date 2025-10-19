/**
 * UI Display Labels for UTXO sections
 * Used in TransactionsCount component to display different UTXO categories
 */
export const UTXO_SECTION_LABELS = {
    PRIMARY: 'Primary Account',
    CSV75_LOCKED: 'CSV75 Locked',
    CSV75_UNLOCKED: 'CSV75 Unlocked',
    CSV1_LOCKED: 'CSV1 Locked',
    CSV1_UNLOCKED: 'CSV1 Unlocked',
    P2WDA_ALL: 'P2WDA All',
    P2WDA_UNSPENT: 'P2WDA Unspent',
    ALL_UTXOS: 'All UTXOs',
    UNSPENT_UTXOS: 'Unspent UTXOs'
} as const;

/**
 * Tab types for the balance details section
 */
export type BalanceTabType = 'balance' | 'quotas';
