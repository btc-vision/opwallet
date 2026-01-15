import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import {
    CheckCircleFilled,
    CopyOutlined,
    DownOutlined,
    InfoCircleOutlined,
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
import { sizes } from '@/ui/theme/spacing';
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
                    setQuantumPublicKeyHash(mldsaHashPubKey);
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
            <Content style={{ padding: '16px' }}>
                <Column gap="md">
                    {/* Instructions Card */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            backgroundColor: `${colors.main}10`,
                            borderRadius: 12,
                            border: `1px solid ${colors.main}30`,
                            padding: 16
                        }}>
                        <InfoCircleOutlined style={{ fontSize: 24, color: colors.main }} />
                        <Text
                            text={`Share your ${chain.label || 'Bitcoin'} address or QR code to receive payments`}
                            style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: '20px' }}
                        />
                    </div>

                    {/* QR Code Card */}
                    <div
                        style={{
                            backgroundColor: colors.cardBg,
                            borderRadius: 16,
                            padding: 24,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 20,
                            border: `1px solid ${colors.containerBorder}`
                        }}>
                        {/* Address Type Selector */}
                        <div
                            onClick={() => setShowAddressTypeDropdown(!showAddressTypeDropdown)}
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                border: `1px solid ${colors.containerBg}`,
                                paddingLeft: 16,
                                paddingRight: 16,
                                paddingTop: 12,
                                paddingBottom: 12,
                                borderRadius: 12,
                                gap: 8,
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
                                        color: colors.textFaded,
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
                                            color: colors.textFaded
                                        }}
                                    />
                                    {selectedAddressType?.value === AddressTypes.P2TR && (
                                        <span
                                            style={{
                                                marginLeft: 12,
                                                borderRadius: 5,
                                                border: `1px solid ${colors.recommended}`,
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
                            <DownOutlined style={{ fontSize: 16, color: colors.textFaded }} />

                            {/* Dropdown */}
                            {showAddressTypeDropdown && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: colors.containerBg,
                                        borderRadius: 12,
                                        border: `1px solid ${colors.containerBorder}`,
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
                                                        ? `${colors.main}20`
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
                                                <CheckCircleFilled style={{ fontSize: 14, color: colors.main }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* QR Code */}
                        <div
                            style={{
                                padding: 20,
                                backgroundColor: 'white',
                                borderRadius: 16,
                                border: `2px solid ${colors.containerBorder}`
                            }}>
                            <QRCodeSVG
                                value={displayAddress || ''}
                                size={sizes.qrcode}
                                imageRendering={chain.icon}
                                imageSettings={{
                                    src: chain.icon,
                                    width: 30,
                                    height: 30,
                                    excavate: true
                                }}
                            />
                        </div>

                        {/* User Name */}
                        <Row justifyCenter>
                            <Icon icon="user" />
                            <Text preset="regular-bold" text={currentAccount?.alianName} />
                        </Row>

                        {/* Rotation Badge */}
                        {rotationEnabled && currentRotationAddress && (
                            <div
                                style={{
                                    background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                                    border: `1px solid ${colors.main}40`,
                                    borderRadius: 12,
                                    padding: '12px 16px',
                                    width: '100%'
                                }}>
                                <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Row style={{ gap: 8, alignItems: 'center' }}>
                                        <SwapOutlined style={{ color: colors.main, fontSize: 16 }} />
                                        <Column style={{ gap: 2 }}>
                                            <Text
                                                text="One-Time Address"
                                                style={{ fontSize: 12, fontWeight: 600, color: colors.main }}
                                            />
                                            <Text
                                                text={`Rotation #${currentRotationAddress.derivationIndex + 1}`}
                                                style={{ fontSize: 10, color: colors.textFaded }}
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
                                        <Text text="Manage" style={{ fontSize: 11, color: colors.textFaded }} />
                                        <RightOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                                    </div>
                                </Row>
                                <Text
                                    text="This address is for one-time use. A new address will be generated after receiving funds."
                                    style={{
                                        fontSize: 10,
                                        color: colors.textFaded,
                                        marginTop: 8,
                                        lineHeight: 1.4
                                    }}
                                />
                            </div>
                        )}

                        {/* Address Display */}
                        <div
                            style={{
                                width: '100%',
                                backgroundColor: colors.containerBg,
                                borderRadius: 12,
                                padding: 16,
                                gap: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                border: `1px solid ${colors.containerBorder}`
                            }}>
                            <Text
                                text={selectedAddressType ? `${selectedAddressType.name} Address` : 'Address'}
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}
                            />
                            <Text
                                text={displayAddress}
                                style={{
                                    fontSize: 13,
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                    lineHeight: '20px',
                                    wordBreak: 'break-all'
                                }}
                            />
                            <div
                                onClick={handleCopyAddress}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    backgroundColor: colors.main,
                                    borderRadius: 10,
                                    padding: 12,
                                    marginTop: 4,
                                    cursor: 'pointer'
                                }}>
                                <CopyOutlined style={{ fontSize: 18, color: colors.text }} />
                                <Text
                                    text="Copy Address"
                                    style={{ fontSize: 14, fontWeight: 600, color: colors.text }}
                                />
                            </div>
                        </div>

                        {/* OPNet Receive Address */}
                        {!hideQuantumSection && (
                            <div
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                    borderRadius: 12,
                                    padding: 16,
                                    gap: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid rgba(139, 92, 246, 0.3)'
                                }}>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                    <SafetyOutlined style={{ fontSize: 16, color: colors.quantum }} />
                                    <Text
                                        text="OPNet Receive Address"
                                        style={{ fontSize: 14, fontWeight: 600, color: colors.text }}
                                    />
                                    <Text text="(OP20)" style={{ fontSize: 11, color: colors.textFaded }} />
                                </div>

                                {loadingQuantum ? (
                                    <Text text="Loading..." preset="sub" size="xs" />
                                ) : quantumPublicKeyHash ? (
                                    <div
                                        onClick={handleCopyQuantumKey}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 8,
                                            cursor: 'pointer'
                                        }}>
                                        <Text
                                            text={quantumPublicKeyHash}
                                            style={{
                                                flex: 1,
                                                fontSize: 12,
                                                color: colors.textFaded,
                                                fontFamily: 'monospace',
                                                lineHeight: '18px',
                                                wordBreak: 'break-all'
                                            }}
                                        />
                                        <CopyOutlined style={{ fontSize: 16, color: colors.quantum, flexShrink: 0 }} />
                                    </div>
                                ) : (
                                    <Row itemsCenter gap="sm">
                                        <InfoCircleOutlined style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }} />
                                        <Text
                                            text="Available after first OPNet transaction"
                                            preset="sub"
                                            size="xs"
                                            style={{ opacity: 0.7 }}
                                        />
                                    </Row>
                                )}
                            </div>
                        )}
                    </div>
                </Column>
            </Content>
        </Layout>
    );
}
