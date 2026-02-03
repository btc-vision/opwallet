import {
    CheckCircleFilled,
    CopyOutlined,
    DownOutlined,
    InfoCircleOutlined,
    RightOutlined,
    SwapOutlined
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import { Column, Content, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useAccountAddress, useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import {
    useCurrentRotationAddress,
    useKeyringRotationMode,
    useRefreshRotation,
    useRotationEnabled
} from '@/ui/state/rotation/hooks';
import { useChain } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { sizes } from '@/ui/theme/spacing';
import { copyToClipboard, useWallet } from '@/ui/utils';
import { Address, AddressTypes } from '@btc-vision/transaction';
import { RECEIVE_CONFIG, ReceiveType } from '@/ui/pages/Wallet/receive/constants.js';

// =============================================================================
// TYPES
// =============================================================================

/** BTC address type option for dropdown selector */
interface AddressTypeOption {
    value: AddressTypes;
    name: string;
    label: string;
    address: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ReceiveScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentAccount = useCurrentAccount();
    const baseAddress = useAccountAddress();
    const chain = useChain();
    const wallet = useWallet();
    const tools = useTools();
    const currentKeyring = useCurrentKeyring();

    // Address rotation hooks (BTC only feature)
    const rotationEnabled = useRotationEnabled();
    const currentRotationAddress = useCurrentRotationAddress();
    const refreshRotation = useRefreshRotation();
    const { isKeyringRotationMode } = useKeyringRotationMode();

    // =========================================================================
    // READ RECEIVE TYPE FROM NAVIGATION STATE
    // =========================================================================
    // Passed from ReceiveSelectScreen when user selects BTC or OP_20
    // Defaults to 'btc' for backwards compatibility if accessed directly via URL
    const receiveType: ReceiveType = (location.state as { type?: ReceiveType })?.type || 'btc';

    // GET CONFIG for current receive type (config-driven approach)
    // This replaces scattered isOP20 checks throughout the code
    const config = RECEIVE_CONFIG[receiveType];

    // Helper boolean for conditional logic (more readable than receiveType === 'op20')
    const isOP20 = receiveType === 'op20';

    // =========================================================================
    // STATE
    // =========================================================================
    // BTC-specific state
    const [showAddressTypeDropdown, setShowAddressTypeDropdown] = useState(false);
    const [addressTypes, setAddressTypes] = useState<AddressTypeOption[]>([]);
    const [selectedAddressType, setSelectedAddressType] = useState<AddressTypeOption | null>(null);

    // OP_20-specific state
    const [quantumPublicKeyHash, setQuantumPublicKeyHash] = useState<string>('');
    const [loadingQuantum, setLoadingQuantum] = useState(true);

    // Computed BTC address (considering rotation)
    const btcAddress = rotationEnabled && currentRotationAddress ? currentRotationAddress.address : baseAddress;

    // =========================================================================
    // EFFECTS
    // =========================================================================

    // Refresh rotation status on mount
    useEffect(() => {
        void refreshRotation();
    }, [refreshRotation]);

    /**
     * Load BTC address types (P2TR, P2WPKH, P2PKH)
     * Only runs in BTC mode - skipped for OP_20
     */
    const loadAddressTypes = useCallback(async () => {
        // Skip for OP_20 mode - no address type selection needed
        if (isOP20) return;

        try {
            if (!currentAccount.quantumPublicKeyHash || !currentAccount.pubkey) {
                return;
            }

            const networkType = await wallet.getNetworkType();
            const chainType = await wallet.getChainType();
            const network = getBitcoinLibJSNetwork(networkType, chainType);

            const addr = Address.fromString(currentAccount.quantumPublicKeyHash, currentAccount.pubkey);

            // Generate addresses for each type
            const types: AddressTypeOption[] = [
                {
                    value: AddressTypes.P2TR,
                    name: 'Taproot',
                    label: 'P2TR',
                    address: addr.p2tr(network)
                },
                {
                    value: AddressTypes.P2WPKH,
                    name: 'Native SegWit',
                    label: 'P2WPKH',
                    address: addr.p2wpkh(network)
                },
                {
                    value: AddressTypes.P2PKH,
                    name: 'Legacy',
                    label: 'P2PKH',
                    address: addr.p2pkh(network)
                }
            ];

            setAddressTypes(types);

            // Set current keyring's address type as selected
            const currentType = types.find((t) => t.value === currentKeyring.addressType);
            if (currentType) {
                setSelectedAddressType(currentType);
            } else {
                setSelectedAddressType(types[0]);
            }
        } catch (error) {
            console.error('Failed to load address types:', error);
        }
    }, [currentAccount, wallet, currentKeyring.addressType, isOP20]);

    useEffect(() => {
        void loadAddressTypes();
    }, [loadAddressTypes]);

    /**
     * Fetch MLDSA/quantum address for OP_20 mode
     * Only runs in OP_20 mode - skipped for BTC
     */
    useEffect(() => {
        // Skip for BTC mode - no MLDSA address needed
        if (!isOP20) {
            setLoadingQuantum(false);
            return;
        }

        const fetchQuantumInfo = async () => {
            setLoadingQuantum(true);
            try {
                const [mldsaHashPubKey] = await wallet.getWalletAddress();
                if (mldsaHashPubKey) {
                    setQuantumPublicKeyHash(`0x${mldsaHashPubKey}`);
                }
            } catch (e) {
                console.error('Error fetching quantum public key:', e);
            } finally {
                setLoadingQuantum(false);
            }
        };

        void fetchQuantumInfo();
    }, [wallet, isOP20]);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    /** Copy current display address to clipboard */
    const handleCopyAddress = () => {
        const addressToCopy = getDisplayAddress();
        if (addressToCopy) {
            copyToClipboard(addressToCopy).then(() => {
                tools.toastSuccess('Address copied to clipboard');
            });
        }
    };

    /** Handle BTC address type selection from dropdown */
    const handleAddressTypeSelect = (type: AddressTypeOption) => {
        setSelectedAddressType(type);
        setShowAddressTypeDropdown(false);
    };

    // =========================================================================
    // COMPUTED VALUES (using config-driven approach)
    // =========================================================================

    /**
     * Get the address to display based on receive type
     * BTC: Uses selected address type or rotation address
     * OP_20: Uses MLDSA quantum public key hash
     */
    const getDisplayAddress = (): string => {
        if (isOP20) {
            return quantumPublicKeyHash;
        }
        return selectedAddressType?.address || btcAddress;
    };

    /**
     * Get address label for display
     * BTC: Dynamic based on selected address type (e.g., "Taproot Address")
     * OP_20: Fixed "MLDSA Address" from config
     */
    const getAddressLabel = (): string => {
        if (isOP20) {
            return config.addressLabel;
        }
        return selectedAddressType ? `${selectedAddressType.name} Address` : 'Address';
    };

    // Values from config
    const displayAddress = getDisplayAddress();
    const addressLabel = getAddressLabel();
    const { headerTitle, accentColor, showRotation: configShowRotation, showAddressSelector } = config;

    // Conditional display flags
    const showRotation = configShowRotation && rotationEnabled && currentRotationAddress;
    const hideAddressTypeSelector = !showAddressSelector || (isKeyringRotationMode && rotationEnabled);

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title={headerTitle} // From RECEIVE_CONFIG
            />
            <Content style={{ padding: '16px' }}>
                <Column gap="md">
                    {/* ============================================================= */}
                    {/* QR CODE CARD - Reused for both BTC and OP_20 modes */}
                    {/* ============================================================= */}
                    <div
                        style={{
                            backgroundColor: colors.bg2,
                            borderRadius: 16,
                            padding: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 16,
                            border: `1px solid ${colors.border}`
                        }}>
                        {/* --------------------------------------------------------- */}
                        {/* ADDRESS TYPE SELECTOR - BTC mode only */}
                        {/* Allows switching between P2TR, P2WPKH, P2PKH */}
                        {/* Hidden for OP_20 mode (showAddressSelector = false) */}
                        {/* --------------------------------------------------------- */}
                        {!hideAddressTypeSelector && (
                            <div
                                onClick={() => setShowAddressTypeDropdown(!showAddressTypeDropdown)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    border: `1px solid ${colors.bg3}`,
                                    paddingLeft: 12,
                                    paddingRight: 12,
                                    paddingTop: 8,
                                    paddingBottom: 8,
                                    borderRadius: 10,
                                    gap: 6,
                                    width: '100%',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}>
                                <div style={{ flex: 1 }}>
                                    <Text
                                        text={`${chain.label || 'Bitcoin'} Address`}
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: colors.textDim,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5
                                        }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <Text
                                            text={
                                                selectedAddressType
                                                    ? `${selectedAddressType.name} (${selectedAddressType.label})`
                                                    : 'Loading...'
                                            }
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: colors.textDim
                                            }}
                                        />
                                        {/* Recommended badge for Taproot (P2TR) */}
                                        {selectedAddressType?.value === AddressTypes.P2TR && (
                                            <span
                                                style={{
                                                    marginLeft: 12,
                                                    borderRadius: 5,
                                                    border: `1px solid ${colors.green_dark}`,
                                                    fontSize: 9,
                                                    color: `${colors.text}A0`,
                                                    paddingTop: 2,
                                                    paddingBottom: 2,
                                                    paddingLeft: 4,
                                                    paddingRight: 4
                                                }}>
                                                Recommended
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <DownOutlined style={{ fontSize: 16, color: colors.textDim }} />

                                {/* Dropdown menu for address type selection */}
                                {showAddressTypeDropdown && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            backgroundColor: colors.bg3,
                                            borderRadius: 12,
                                            border: `1px solid ${colors.border}`,
                                            marginTop: 4,
                                            zIndex: 100,
                                            overflow: 'hidden'
                                        }}>
                                        {addressTypes.map((type) => (
                                            <div
                                                key={type.value}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddressTypeSelect(type);
                                                }}
                                                style={{
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                    backgroundColor:
                                                        selectedAddressType?.value === type.value
                                                            ? `${colors.warning}20`
                                                            : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                <div>
                                                    <Text
                                                        text={`${type.name} (${type.label})`}
                                                        style={{ fontSize: 13, color: colors.text }}
                                                    />
                                                </div>
                                                {selectedAddressType?.value === type.value && (
                                                    <CheckCircleFilled
                                                        style={{ fontSize: 14, color: colors.warning }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --------------------------------------------------------- */}
                        {/* OP_20 HEADER - OP_20 mode only */}
                        {/* Shows "OPNet MLDSA Address" label */}
                        {/* --------------------------------------------------------- */}
                        {isOP20 && config.headerLabel && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    width: '100%',
                                    justifyContent: 'center'
                                }}>
                                <Text
                                    text={config.headerLabel}
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: colors.purple,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5
                                    }}
                                />
                            </div>
                        )}

                        {/* --------------------------------------------------------- */}
                        {/* QR CODE SECTION */}
                        {/* Shows loading, error, or QR code based on state */}
                        {/* --------------------------------------------------------- */}
                        {/* Loading state - OP_20 mode while fetching MLDSA */}
                        {loadingQuantum && isOP20 ? (
                            <div
                                style={{
                                    padding: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: sizes.qrcode
                                }}>
                                <Text text="Loading..." preset="sub" />
                            </div>
                        ) : /* Error state - MLDSA not available */ !displayAddress && isOP20 ? (
                            <div
                                style={{
                                    padding: 20,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: sizes.qrcode,
                                    gap: 12
                                }}>
                                <InfoCircleOutlined style={{ fontSize: 32, color: colors.textDim }} />
                                <Text
                                    text="MLDSA address not available"
                                    style={{ fontSize: 14, color: colors.textDim, textAlign: 'center' }}
                                />
                                <Text
                                    text="Quantum migration may be required"
                                    style={{ fontSize: 12, color: colors.textDim, opacity: 0.7 }}
                                />
                            </div>
                        ) : (
                            /* Success state - Show QR code */
                            <div
                                style={{
                                    padding: 16,
                                    backgroundColor: 'white',
                                    borderRadius: 16,
                                    border: `2px solid ${colors.border}`
                                }}>
                                <QRCodeSVG
                                    value={displayAddress || ''}
                                    size={sizes.qrcode}
                                    imageSettings={
                                        // Show chain icon for BTC, custom qrIcon for OP_20
                                        config.showChainIcon && chain.icon
                                            ? {
                                                  src: chain.icon,
                                                  width: 30,
                                                  height: 30,
                                                  excavate: true
                                              }
                                            : config.qrIcon
                                              ? {
                                                    src: config.qrIcon,
                                                    width: 30,
                                                    height: 30,
                                                    excavate: true
                                                }
                                              : undefined
                                    }
                                />
                            </div>
                        )}

                        {/* --------------------------------------------------------- */}
                        {/* USER NAME DISPLAY */}
                        {/* --------------------------------------------------------- */}
                        <Row justifyCenter>
                            <Icon icon="user" />
                            <Text preset="regular-bold" text={currentAccount?.alianName} />
                        </Row>

                        {/* --------------------------------------------------------- */}
                        {/* ADDRESS ROTATION BADGE - BTC mode only */}
                        {/* Shows when rotation is enabled (privacy feature) */}
                        {/* Hidden for OP_20 mode (showRotation = false in config) */}
                        {/* --------------------------------------------------------- */}
                        {showRotation && (
                            <div
                                style={{
                                    background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.warning}08 100%)`,
                                    border: `1px solid ${colors.warning}40`,
                                    borderRadius: 12,
                                    padding: '12px 16px',
                                    width: '100%'
                                }}>
                                <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Row style={{ gap: 8, alignItems: 'center' }}>
                                        <SwapOutlined style={{ color: colors.warning, fontSize: 16 }} />
                                        <Column style={{ gap: 2 }}>
                                            <Text
                                                text="One-Time Address"
                                                style={{ fontSize: 12, fontWeight: 600, color: colors.warning }}
                                            />
                                            <Text
                                                text={`Rotation #${currentRotationAddress.derivationIndex + 1}`}
                                                style={{ fontSize: 10, color: colors.textDim }}
                                            />
                                        </Column>
                                    </Row>
                                    <div
                                        onClick={() => navigate(RouteTypes.AddressRotationScreen)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            cursor: 'pointer',
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            background: 'rgba(255,255,255,0.05)'
                                        }}>
                                        <Text text="Manage" style={{ fontSize: 11, color: colors.textDim }} />
                                        <RightOutlined style={{ fontSize: 10, color: colors.textDim }} />
                                    </div>
                                </Row>
                                <Text
                                    text="This address is for one-time use. A new address will be generated after receiving funds."
                                    style={{
                                        fontSize: 10,
                                        color: colors.textDim,
                                        marginTop: 8,
                                        lineHeight: 1.4
                                    }}
                                />
                            </div>
                        )}

                        {/* --------------------------------------------------------- */}
                        {/* ADDRESS DISPLAY BOX */}
                        {/* Shows address text and copy button */}
                        {/* Accent color changes based on mode (orange/purple) */}
                        {/* --------------------------------------------------------- */}
                        <div
                            style={{
                                width: '100%',
                                backgroundColor: colors.bg3,
                                borderRadius: 12,
                                padding: 14,
                                gap: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                border: `1px solid ${colors.border}`
                            }}>
                            <Text
                                text={addressLabel}
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: colors.textDim,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}
                            />
                            <Text
                                text={displayAddress || 'Loading...'}
                                style={{
                                    fontSize: 13,
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                    lineHeight: '20px',
                                    wordBreak: 'break-all'
                                }}
                            />
                            {/* Copy button - uses accentColor from config */}
                            <div
                                onClick={handleCopyAddress}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    backgroundColor: accentColor, // From RECEIVE_CONFIG (orange for BTC, purple for OP_20)
                                    borderRadius: 10,
                                    padding: 10,
                                    marginTop: 2,
                                    cursor: 'pointer'
                                }}>
                                <CopyOutlined style={{ fontSize: 18, color: colors.text }} />
                                <Text
                                    text="Copy Address"
                                    style={{ fontSize: 14, fontWeight: 600, color: colors.text }}
                                />
                            </div>
                        </div>
                    </div>
                </Column>
            </Content>
        </Layout>
    );
}
