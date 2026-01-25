import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import {
    CheckCircleFilled,
    CopyOutlined,
    DownOutlined,
    RightOutlined,
    SafetyOutlined,
    SwapOutlined
} from '@ant-design/icons';

import { Column, Content, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useAccountAddress, useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import {
    useCurrentRotationAddress,
    useKeyringRotationMode,
    useRefreshRotation,
    useRotationEnabled
} from '@/ui/state/rotation/hooks';
import { useChain } from '@/ui/state/settings/hooks';
import { copyToClipboard, useWallet } from '@/ui/utils';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { Address, AddressTypes } from '@btc-vision/transaction';
import { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBg: '#434343',
    containerBorder: '#303030',
    cardBg: '#2a2a2a',
    recommended: '#00AA00',
    quantum: 'rgba(139, 92, 246)'
};

const COMPACT_QR_SIZE = 140;

interface AddressTypeOption {
    value: AddressTypes;
    name: string;
    label: string;
    address: string;
}

export default function ReceiveScreen() {
    const navigate = useNavigate();
    const currentAccount = useCurrentAccount();
    const baseAddress = useAccountAddress();
    const chain = useChain();
    const wallet = useWallet();
    const tools = useTools();
    const currentKeyring = useCurrentKeyring();

    const rotationEnabled = useRotationEnabled();
    const currentRotationAddress = useCurrentRotationAddress();
    const refreshRotation = useRefreshRotation();
    const { isKeyringRotationMode } = useKeyringRotationMode();

    const [showAddressTypeDropdown, setShowAddressTypeDropdown] = useState(false);
    const [addressTypes, setAddressTypes] = useState<AddressTypeOption[]>([]);
    const [selectedAddressType, setSelectedAddressType] = useState<AddressTypeOption | null>(null);
    const [quantumPublicKeyHash, setQuantumPublicKeyHash] = useState<string>('');
    const [loadingQuantum, setLoadingQuantum] = useState(true);

    const address = rotationEnabled && currentRotationAddress ? currentRotationAddress.address : baseAddress;

    const hideQuantumSection = isKeyringRotationMode && rotationEnabled;

    useEffect(() => {
        void refreshRotation();
    }, [refreshRotation]);

    // Load address types
    const loadAddressTypes = useCallback(async () => {
        try {
            if (!currentAccount.quantumPublicKeyHash || !currentAccount.pubkey) {
                return;
            }

            const networkType = await wallet.getNetworkType();
            const chainType = await wallet.getChainType();
            const network = getBitcoinLibJSNetwork(networkType, chainType);

            const addr = Address.fromString(currentAccount.quantumPublicKeyHash, currentAccount.pubkey);

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

            // Set current address type as selected
            const currentType = types.find((t) => t.value === currentKeyring.addressType);
            if (currentType) {
                setSelectedAddressType(currentType);
            } else {
                setSelectedAddressType(types[0]);
            }
        } catch (error) {
            console.error('Failed to load address types:', error);
        }
    }, [currentAccount, wallet, currentKeyring.addressType]);

    useEffect(() => {
        void loadAddressTypes();
    }, [loadAddressTypes]);

    useEffect(() => {
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
    }, [wallet]);

    const handleCopyAddress = () => {
        const addressToCopy = selectedAddressType?.address || address;
        if (addressToCopy) {
            copyToClipboard(addressToCopy).then(() => {
                tools.toastSuccess('Address copied to clipboard');
            });
        }
    };

    const handleCopyQuantumKey = () => {
        if (quantumPublicKeyHash) {
            copyToClipboard(quantumPublicKeyHash).then(() => {
                tools.toastSuccess('OPNet address copied');
            });
        }
    };

    const handleAddressTypeSelect = (type: AddressTypeOption) => {
        setSelectedAddressType(type);
        setShowAddressTypeDropdown(false);
    };

    const displayAddress = selectedAddressType?.address || address;

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Receive"
            />
            <Content style={{ padding: '12px' }}>
                <Column gap="sm">
                    {/* OPNet Receive Address - Compact */}
                    {!hideQuantumSection && (
                        <div
                            onClick={quantumPublicKeyHash ? handleCopyQuantumKey : undefined}
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                borderRadius: 10,
                                padding: '10px 12px',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                cursor: quantumPublicKeyHash ? 'pointer' : 'default'
                            }}>
                            <SafetyOutlined style={{ fontSize: 14, color: colors.quantum, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Text
                                        text="OPNet Address"
                                        style={{ fontSize: 11, fontWeight: 600, color: colors.text }}
                                    />
                                    <Text text="(OP20)" style={{ fontSize: 9, color: colors.textFaded }} />
                                </div>
                                {loadingQuantum ? (
                                    <Text text="Loading..." style={{ fontSize: 10, color: colors.textFaded }} />
                                ) : quantumPublicKeyHash ? (
                                    <Text
                                        text={quantumPublicKeyHash}
                                        style={{
                                            fontSize: 10,
                                            color: colors.textFaded,
                                            fontFamily: 'monospace',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    />
                                ) : (
                                    <Text
                                        text="Available after first OPNet transaction"
                                        style={{ fontSize: 10, color: colors.textFaded, opacity: 0.7 }}
                                    />
                                )}
                            </div>
                            {quantumPublicKeyHash && (
                                <CopyOutlined style={{ fontSize: 14, color: colors.quantum, flexShrink: 0 }} />
                            )}
                        </div>
                    )}

                    {/* Main Card - Compact */}
                    <div
                        style={{
                            backgroundColor: colors.cardBg,
                            borderRadius: 12,
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12,
                            border: `1px solid ${colors.containerBorder}`
                        }}>
                        {/* User Name + Address Type in one row */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%'
                            }}>
                            <Row style={{ gap: 6, alignItems: 'center' }}>
                                <Icon icon="user" size={14} />
                                <Text
                                    text={currentAccount?.alianName}
                                    style={{ fontSize: 13, fontWeight: 600, color: colors.text }}
                                />
                            </Row>
                            <div
                                onClick={() => setShowAddressTypeDropdown(!showAddressTypeDropdown)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${colors.containerBg}`,
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}>
                                <Text
                                    text={selectedAddressType?.label || '...'}
                                    style={{ fontSize: 11, color: colors.textFaded }}
                                />
                                {selectedAddressType?.value === AddressTypes.P2TR && (
                                    <span
                                        style={{
                                            fontSize: 8,
                                            color: colors.recommended,
                                            fontWeight: 600
                                        }}>
                                        *
                                    </span>
                                )}
                                <DownOutlined style={{ fontSize: 10, color: colors.textFaded }} />

                                {/* Dropdown */}
                                {showAddressTypeDropdown && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            backgroundColor: colors.containerBg,
                                            borderRadius: 8,
                                            border: `1px solid ${colors.containerBorder}`,
                                            marginTop: 4,
                                            zIndex: 100,
                                            overflow: 'hidden',
                                            minWidth: 140
                                        }}>
                                        {addressTypes.map((type) => (
                                            <div
                                                key={type.value}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddressTypeSelect(type);
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    backgroundColor:
                                                        selectedAddressType?.value === type.value
                                                            ? `${colors.main}20`
                                                            : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                <Text
                                                    text={`${type.name} (${type.label})`}
                                                    style={{ fontSize: 11, color: colors.text }}
                                                />
                                                {selectedAddressType?.value === type.value && (
                                                    <CheckCircleFilled style={{ fontSize: 12, color: colors.main }} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* QR Code - Smaller */}
                        <div
                            style={{
                                padding: 12,
                                backgroundColor: 'white',
                                borderRadius: 12
                            }}>
                            <QRCodeSVG
                                value={displayAddress || ''}
                                size={COMPACT_QR_SIZE}
                                imageRendering={chain.icon}
                                imageSettings={{
                                    src: chain.icon,
                                    width: 24,
                                    height: 24,
                                    excavate: true
                                }}
                            />
                        </div>

                        {/* Rotation Badge - Compact inline */}
                        {rotationEnabled && currentRotationAddress && (
                            <div
                                onClick={() => navigate(RouteTypes.AddressRotationScreen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    background: `${colors.main}15`,
                                    border: `1px solid ${colors.main}30`,
                                    cursor: 'pointer'
                                }}>
                                <SwapOutlined style={{ color: colors.main, fontSize: 12 }} />
                                <Text
                                    text={`One-Time #${currentRotationAddress.derivationIndex + 1}`}
                                    style={{ fontSize: 10, color: colors.main }}
                                />
                                <RightOutlined style={{ fontSize: 8, color: colors.main, opacity: 0.6 }} />
                            </div>
                        )}

                        {/* Address Display - Compact */}
                        <div
                            style={{
                                width: '100%',
                                backgroundColor: colors.containerBg,
                                borderRadius: 8,
                                padding: '10px 12px',
                                border: `1px solid ${colors.containerBorder}`
                            }}>
                            <Text
                                text={displayAddress}
                                style={{
                                    fontSize: 11,
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                    lineHeight: '16px',
                                    wordBreak: 'break-all',
                                    textAlign: 'center'
                                }}
                            />
                        </div>

                        {/* Copy Button - Compact */}
                        <div
                            onClick={handleCopyAddress}
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                backgroundColor: colors.main,
                                borderRadius: 8,
                                padding: '10px 20px',
                                cursor: 'pointer',
                                width: '100%'
                            }}>
                            <CopyOutlined style={{ fontSize: 14, color: colors.text }} />
                            <Text
                                text="Copy Address"
                                style={{ fontSize: 13, fontWeight: 600, color: colors.text }}
                            />
                        </div>
                    </div>
                </Column>
            </Content>
        </Layout>
    );
}
