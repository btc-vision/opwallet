import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { CopyOutlined, InfoCircleOutlined, SafetyOutlined, SwapOutlined, RightOutlined } from '@ant-design/icons';

import { AddressBar, Button, Card, Column, Content, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useAccountAddress, useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useRotationEnabled, useCurrentRotationAddress, useRefreshRotation, useKeyringRotationMode } from '@/ui/state/rotation/hooks';
import { useChain } from '@/ui/state/settings/hooks';
import { sizes } from '@/ui/theme/spacing';
import { copyToClipboard, useWallet } from '@/ui/utils';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';

import './index.less';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    success: '#4ade80'
};

export default function ReceiveScreen() {
    const navigate = useNavigate();
    const currentAccount = useCurrentAccount();
    const baseAddress = useAccountAddress();
    const chain = useChain();
    const wallet = useWallet();
    const tools = useTools();

    const rotationEnabled = useRotationEnabled();
    const currentRotationAddress = useCurrentRotationAddress();
    const refreshRotation = useRefreshRotation();
    const { isKeyringRotationMode } = useKeyringRotationMode();

    const address = rotationEnabled && currentRotationAddress
        ? currentRotationAddress.address
        : baseAddress;

    const hideQuantumSection = isKeyringRotationMode && rotationEnabled;

    const [quantumPublicKeyHash, setQuantumPublicKeyHash] = useState<string>('');
    const [loadingQuantum, setLoadingQuantum] = useState(true);

    useEffect(() => {
        void refreshRotation();
    }, [refreshRotation]);

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

    const handleCopyQuantumKey = () => {
        if (quantumPublicKeyHash) {
            copyToClipboard(quantumPublicKeyHash).then(() => {
                tools.toastSuccess('Quantum public key hash copied');
            });
        }
    };

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Receive"
            />
            <Content>
                <Column gap="lg" mt="lg">
                    <Column
                        justifyCenter
                        rounded
                        style={{ backgroundColor: 'white', alignSelf: 'center', alignItems: 'center', padding: 10 }}>
                        <QRCodeSVG
                            value={address || ''}
                            size={sizes.qrcode}
                            imageRendering={chain.icon}
                            imageSettings={{
                                src: chain.icon,
                                width: 30,
                                height: 30,
                                excavate: true
                            }}></QRCodeSVG>
                    </Column>

                    <Row justifyCenter>
                        <Icon icon="user" />
                        <Text preset="regular-bold" text={currentAccount?.alianName} />
                    </Row>

                    {rotationEnabled && currentRotationAddress && (
                        <div
                            style={{
                                background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                                border: `1px solid ${colors.main}40`,
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginTop: '8px'
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
                                    <Text
                                        text="Manage"
                                        style={{ fontSize: 11, color: colors.textFaded }}
                                    />
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

                    <AddressBar
                        csv75_total_amount={undefined}
                        csv75_unlocked_amount={undefined}
                        csv75_locked_amount={undefined}
                        csv2_total_amount={undefined}
                        csv2_unlocked_amount={undefined}
                        csv2_locked_amount={undefined}
                        csv1_total_amount={undefined}
                        csv1_unlocked_amount={undefined}
                        csv1_locked_amount={undefined}
                        p2wda_total_amount={undefined}
                    />

                    {!hideQuantumSection && (
                    <Card
                        style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            borderColor: 'rgba(139, 92, 246, 0.3)',
                            marginTop: '8px'
                        }}>
                        <Column gap="md">
                            <Row itemsCenter gap="sm">
                                <SafetyOutlined style={{ fontSize: 16, color: '#8B5CF6' }} />
                                <Text text="Post-Quantum Identity" preset="bold" size="sm" />
                            </Row>

                            {loadingQuantum ? (
                                <Text text="Loading..." preset="sub" size="xs" />
                            ) : quantumPublicKeyHash ? (
                                <>
                                    <Column gap="xs">
                                        <Text
                                            text="MLDSA Public Key Hash (SHA256)"
                                            preset="sub"
                                            size="xs"
                                            style={{ opacity: 0.7 }}
                                        />
                                        <Row
                                            itemsCenter
                                            gap="sm"
                                            onClick={handleCopyQuantumKey}
                                            style={{ cursor: 'pointer' }}>
                                            <div
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                    borderRadius: '6px',
                                                    fontFamily: 'monospace',
                                                    fontSize: '11px',
                                                    wordBreak: 'break-all',
                                                    lineHeight: 1.4,
                                                    color: '#ffffff'
                                                }}>
                                                {quantumPublicKeyHash}
                                            </div>
                                            <CopyOutlined style={{ fontSize: 14, color: '#8B5CF6', flexShrink: 0 }} />
                                        </Row>
                                    </Column>

                                    <Button
                                        text="View Full Details"
                                        preset="default"
                                        style={{
                                            backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                            borderColor: 'rgba(139, 92, 246, 0.4)'
                                        }}
                                        onClick={() => navigate(RouteTypes.QuantumMigrationScreen)}
                                    />
                                </>
                            ) : (
                                <Row itemsCenter gap="sm">
                                    <InfoCircleOutlined style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }} />
                                    <Text
                                        text="Post-quantum keys available after first OPNet transaction"
                                        preset="sub"
                                        size="xs"
                                        style={{ opacity: 0.7 }}
                                    />
                                </Row>
                            )}
                        </Column>
                    </Card>
                    )}
                </Column>
            </Content>
        </Layout>
    );
}
