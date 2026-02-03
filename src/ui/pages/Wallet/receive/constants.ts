/**
 * Shared constants for Receive screens (ReceiveSelectScreen & ReceiveScreen)
 * 
 * This file centralizes:
 * - ReceiveType union type
 * - Configuration objects for each receive type
 * 
 * 
 * WHY: Avoids duplication and makes adding new asset types easy.
 * To add a new asset type (e.g., 'runes'), just add to RECEIVE_OPTIONS and RECEIVE_CONFIG.
 */

import { SafetyOutlined, WalletOutlined } from '@ant-design/icons';

import { colors } from '@/ui/theme/colors';

// =============================================================================
// RECEIVE TYPE DEFINITION
// =============================================================================
// Union type for all supported receive types
export type ReceiveType = 'btc' | 'op20';

// =============================================================================
// RECEIVE SELECT SCREEN OPTIONS
// =============================================================================
// Configuration for the intermediary selection screen (ReceiveSelectScreen)
// Each option defines how it appears in the selection list
export const RECEIVE_OPTIONS = [
    {
        /** Unique identifier - matches ReceiveType */
        id: 'btc' as ReceiveType,
        /** Display title */
        title: 'Bitcoin (BTC)',
        /** Description shown below title */
        description: 'Receive native Bitcoin to your wallet',
        /** Icon component from ant-design */
        icon: WalletOutlined,
        /** Icon color - uses theme orange */
        iconColor: colors.warning,
        /** Icon background color (with transparency) */
        iconBg: `${colors.warning}20`,
        /** Hover background for action buttons */
        hoverButtonBg: `${colors.warning}20`
    },
    {
        id: 'op20' as ReceiveType,
        title: 'OP_20',
        description: 'Receive OPNet tokens via MLDSA address',
        icon: SafetyOutlined,
        iconColor: colors.purple,
        iconBg: `${colors.purple}20`,
        /** Hover background for action buttons */
        hoverButtonBg: `${colors.purple}40`
    }
] as const;

// =============================================================================
// RECEIVE SCREEN CONFIGURATION
// =============================================================================
// Configuration for the address display screen (ReceiveScreen)
// Defines how each receive type behaves and appears
export const RECEIVE_CONFIG: Record<ReceiveType, {
    /** Header title for the screen */
    headerTitle: string;
    /** Label shown above the address */
    addressLabel: string;
    /** Header label when showing OP_20 mode */
    headerLabel?: string;
    /** Accent color for buttons and highlights */
    accentColor: string;
    /** Whether to show address rotation badge (BTC only) */
    showRotation: boolean;
    /** Whether to show address type selector dropdown (BTC only) */
    showAddressSelector: boolean;
    /** Whether to show chain icon in QR code (uses chain.icon) */
    showChainIcon: boolean;
    /** Custom icon for QR code center (used when showChainIcon is false) */
    qrIcon?: string;
}> = {
    btc: {
        headerTitle: 'Receive BTC',
        addressLabel: '', // Dynamic based on selected address type
        accentColor: colors.warning, // Theme orange
        showRotation: true,
        showAddressSelector: true,
        showChainIcon: true
    },
    op20: {
        headerTitle: 'Receive OP_20',
        addressLabel: 'MLDSA Address',
        accentColor: colors.purple, // OP_20 purple
        showRotation: false,
        showAddressSelector: false,
        showChainIcon: false,
        qrIcon: './images/logo/logo@32x.png'
    }
};

// =============================================================================
// HELPER TYPE - Infer option type from RECEIVE_OPTIONS
// =============================================================================
// Use this when typing OptionCard props
export type ReceiveOption = (typeof RECEIVE_OPTIONS)[number];
