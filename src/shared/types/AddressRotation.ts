/**
 * Address Rotation Mode Types
 *
 * This module defines types for the Bitcoin address rotation privacy feature.
 * Hot wallet addresses rotate automatically when funds are received.
 * Cold wallet address is never revealed to the user.
 */

/**
 * Status of a rotated address
 */
export enum RotatedAddressStatus {
    /** Currently displayed for receiving */
    ACTIVE = 'active',
    /** Has received funds, pending consolidation */
    RECEIVED = 'received',
    /** Funds moved to cold storage */
    CONSOLIDATED = 'consolidated',
    /** No longer in use, no remaining funds */
    ARCHIVED = 'archived'
}

/**
 * A single rotated hot wallet address
 */
export interface RotatedAddress {
    /** The taproot address string */
    address: string;
    /** The public key used to derive this address */
    pubkey: string;
    /** Derivation index from the rotation path */
    derivationIndex: number;
    /** Current status of this address */
    status: RotatedAddressStatus;
    /** When this address was created (timestamp) */
    createdAt: number;
    /** When funds were first received (if any) */
    receivedAt?: number;
    /** When funds were consolidated (if any) */
    consolidatedAt?: number;
    /** Total satoshis ever received at this address */
    totalReceived: string;
    /** Current balance in satoshis */
    currentBalance: string;
    /** Number of UTXOs at this address */
    utxoCount: number;
    /** Last time balance was checked */
    lastBalanceCheck?: number;
}

/**
 * Cold wallet information (internal, address never exposed to user)
 */
export interface ColdWalletInfo {
    /** Whether cold wallet has been derived */
    isInitialized: boolean;
    /** Total balance in cold storage (satoshis) */
    totalBalance: string;
    /** Number of consolidation transactions completed */
    consolidationCount: number;
    /** Last consolidation timestamp */
    lastConsolidation?: number;
    /** MLDSA public key hash (for verification, NOT the address) */
    mldsaPublicKeyHash?: string;
}

/**
 * Complete rotation state for an account
 */
export interface AddressRotationState {
    /** Whether rotation mode is enabled for this account */
    enabled: boolean;
    /** Current active derivation index */
    currentIndex: number;
    /** Maximum index ever used (for gap limit) */
    maxUsedIndex: number;
    /** All rotated addresses with their history */
    rotatedAddresses: RotatedAddress[];
    /** Cold wallet summary (address itself is NEVER stored here) */
    coldWallet: ColdWalletInfo;
    /** When rotation mode was enabled */
    enabledAt?: number;
    /** Last time state was updated */
    lastUpdated: number;
    /** Auto-rotation enabled (rotate after receiving) */
    autoRotate: boolean;
    /** Minimum satoshis before triggering rotation notification */
    rotationThreshold: number;
}

/**
 * Rotation mode settings stored per-account
 */
export interface RotationModeSettings {
    /** Account pubkey -> rotation state */
    [accountPubkey: string]: AddressRotationState;
}

/**
 * Summary for UI display
 */
export interface RotationModeSummary {
    /** Whether rotation mode is enabled */
    enabled: boolean;
    /** Current hot address for receiving */
    currentHotAddress: string;
    /** Current hot address public key */
    currentHotPubkey: string;
    /** Current derivation index */
    currentIndex: number;
    /** Total number of rotated addresses */
    totalRotatedAddresses: number;
    /** Number of addresses that have a balance */
    addressesWithBalance: number;
    /** Total balance across all hot addresses (satoshis) */
    totalHotBalance: string;
    /** Cold wallet balance (satoshis) */
    coldWalletBalance: string;
    /** Amount pending consolidation (satoshis) */
    pendingConsolidation: string;
    /** Last rotation timestamp */
    lastRotation?: number;
    /** Whether auto-rotation is enabled */
    autoRotate: boolean;
}

/**
 * Consolidation transaction parameters
 */
export interface ConsolidationParams {
    /** Source addresses to consolidate from */
    sourceAddresses: string[];
    /** Source public keys corresponding to addresses */
    sourcePubkeys: string[];
    /** Total amount to consolidate (satoshis) */
    totalAmount: string;
    /** Fee rate in sat/vB */
    feeRate: number;
    /** Estimated fee (satoshis) */
    estimatedFee: string;
    /** Net amount after fee */
    netAmount: string;
    /** Number of UTXOs being consolidated */
    utxoCount: number;
}

/**
 * Result of a consolidation transaction
 */
export interface ConsolidationResult {
    /** Whether consolidation was successful */
    success: boolean;
    /** Transaction ID if successful */
    txid?: string;
    /** Error message if failed */
    error?: string;
    /** Amount consolidated (satoshis) */
    consolidatedAmount: string;
    /** Fee paid (satoshis) */
    fee: string;
    /** Number of source addresses */
    sourceAddressCount: number;
}

/**
 * Rotation mode settings that can be updated
 */
export interface RotationModeUpdateSettings {
    /** Enable/disable auto-rotation */
    autoRotate?: boolean;
    /** Minimum amount to trigger rotation */
    rotationThreshold?: number;
}

/**
 * Default rotation state for new accounts
 */
export const DEFAULT_ROTATION_STATE: Omit<AddressRotationState, 'enabledAt' | 'lastUpdated'> = {
    enabled: false,
    currentIndex: 0,
    maxUsedIndex: 0,
    rotatedAddresses: [],
    coldWallet: {
        isInitialized: false,
        totalBalance: '0',
        consolidationCount: 0
    },
    autoRotate: true,
    rotationThreshold: 546 // dust limit
};
