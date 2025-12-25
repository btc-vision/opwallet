import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    SwapOutlined,
    SafetyCertificateOutlined,
    HistoryOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
    CopyOutlined,
    CheckCircleFilled,
    LockOutlined,
    ThunderboltOutlined,
    RightOutlined,
    SettingOutlined
} from '@ant-design/icons';

import { Layout, Header, Content, Column, Row, Button, Text, OPNetLoader } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useWallet, copyToClipboard, satoshisToAmount } from '@/ui/utils';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import {
    useRotationState,
    useRefreshRotation,
    useEnableRotationMode,
    useDisableRotationMode,
    useRotateToNextAddress,
    useUpdateRotationSettings,
    useKeyringRotationMode
} from '@/ui/state/rotation/hooks';

const colors = {
    main: '#f37413',
    mainGradient: 'linear-gradient(135deg, #f37413 0%, #ff8c42 100%)',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    coldBlue: '#3b82f6',
    hotOrange: '#f97316'
};

export default function AddressRotationScreen() {
    const wallet = useWallet();
    const tools = useTools();
    const navigate = useNavigate();

    const rotationState = useRotationState();
    const refreshRotation = useRefreshRotation();
    const enableRotation = useEnableRotationMode();
    const disableRotation = useDisableRotationMode();
    const rotateToNext = useRotateToNextAddress();
    const updateSettings = useUpdateRotationSettings();
    const { isKeyringRotationMode } = useKeyringRotationMode();

    const [copying, setCopying] = useState(false);
    const [copyingCold, setCopyingCold] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [enabling, setEnabling] = useState(false);
    const [coldWalletAddress, setColdWalletAddress] = useState<string>('');

    const canDisable = !isKeyringRotationMode;

    useEffect(() => {
        void refreshRotation();
    }, [refreshRotation]);

    useEffect(() => {
        const fetchColdAddress = async () => {
            if (rotationState.enabled) {
                try {
                    const address = await wallet.getColdWalletAddress();
                    setColdWalletAddress(address);
                } catch (error) {
                    console.error('Failed to fetch cold wallet address:', error);
                }
            }
        };
        void fetchColdAddress();
    }, [rotationState.enabled, wallet]);

    const handleCopyAddress = async () => {
        if (!rotationState.currentAddress) return;
        setCopying(true);
        try {
            await copyToClipboard(rotationState.currentAddress.address);
            tools.toastSuccess('Address copied');
        } catch {
            tools.toastError('Failed to copy');
        } finally {
            setTimeout(() => setCopying(false), 1500);
        }
    };

    const handleCopyColdAddress = async () => {
        if (!coldWalletAddress) return;
        setCopyingCold(true);
        try {
            await copyToClipboard(coldWalletAddress);
            tools.toastSuccess('Cold address copied');
        } catch {
            tools.toastError('Failed to copy');
        } finally {
            setTimeout(() => setCopyingCold(false), 1500);
        }
    };

    const handleEnable = async () => {
        setEnabling(true);
        try {
            const success = await enableRotation();
            if (success) {
                tools.toastSuccess('Rotation enabled');
            } else {
                tools.toastError('Failed to enable');
            }
        } catch (error) {
            tools.toastError(String(error));
        } finally {
            setEnabling(false);
        }
    };

    const handleDisable = async () => {
        try {
            const success = await disableRotation();
            if (success) {
                tools.toastSuccess('Rotation disabled');
            }
        } catch (error) {
            tools.toastError(String(error));
        }
    };

    const handleRotate = async () => {
        setRotating(true);
        try {
            const newAddr = await rotateToNext();
            if (newAddr) {
                tools.toastSuccess('New address generated');
            } else {
                tools.toastError('Failed to rotate');
            }
        } catch (error) {
            tools.toastError(String(error));
        } finally {
            setRotating(false);
        }
    };

    const handleToggleAutoRotate = async () => {
        const newValue = !rotationState.summary?.autoRotate;
        await updateSettings({ autoRotate: newValue });
    };

    if (rotationState.loading && !rotationState.summary) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Address Rotation" />
                <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <OPNetLoader size={70} text="Loading" />
                </Content>
            </Layout>
        );
    }

    if (!rotationState.isSupported) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Address Rotation" />
                <Content>
                    <Column gap="lg" style={{ padding: '20px' }}>
                        <div
                            style={{
                                background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.warning}08 100%)`,
                                border: `1px solid ${colors.warning}40`,
                                borderRadius: '14px',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                            <InfoCircleOutlined style={{ fontSize: 48, color: colors.warning, marginBottom: 16 }} />
                            <Text text="HD Wallet Required" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }} />
                            <Text
                                text="Address rotation requires an HD wallet created from a mnemonic phrase."
                                preset="sub"
                                style={{ textAlign: 'center' }}
                            />
                        </div>
                    </Column>
                </Content>
            </Layout>
        );
    }

    if (!rotationState.enabled) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Address Rotation" />
                <Content>
                    <Column gap="lg" style={{ padding: '20px' }}>
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                            <div
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    background: colors.mainGradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px'
                                }}>
                                <SwapOutlined style={{ fontSize: 36, color: 'white' }} />
                            </div>
                            <Text text="Enhanced Privacy" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }} />
                            <Text
                                text="Generate fresh receiving addresses for every transaction. Never reuse addresses."
                                preset="sub"
                                style={{ textAlign: 'center', lineHeight: 1.5 }}
                            />
                        </div>

                        <div style={{ background: colors.containerBgFaded, borderRadius: '14px', overflow: 'hidden' }}>
                            <FeatureItem
                                icon={<ThunderboltOutlined style={{ color: colors.hotOrange }} />}
                                title="Auto-Rotating Addresses"
                                description="New address generated when funds received"
                            />
                            <FeatureItem
                                icon={<LockOutlined style={{ color: colors.coldBlue }} />}
                                title="Hidden Cold Storage"
                                description="Cold wallet address never revealed"
                                isLast
                            />
                        </div>

                        <Button
                            preset="primary"
                            text={enabling ? 'Enabling...' : 'Enable Rotation Mode'}
                            onClick={handleEnable}
                            disabled={enabling}
                            style={{ marginTop: 10 }}
                        />
                    </Column>
                </Content>
            </Layout>
        );
    }

    const { summary, currentAddress } = rotationState;

    return (
        <Layout>
            <Header
                onBack={() => window.history.go(-1)}
                title="Address Rotation"
                RightComponent={
                    <ReloadOutlined
                        style={{ fontSize: 18, color: colors.text, cursor: 'pointer' }}
                        onClick={() => refreshRotation()}
                    />
                }
            />
            <Content>
                <Column gap="md" style={{ padding: '16px' }}>
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '16px',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                        <Row style={{ justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                            <ThunderboltOutlined style={{ color: colors.hotOrange, fontSize: 14 }} />
                            <Text
                                text={`Address #${(summary?.currentIndex || 0) + 1}`}
                                style={{ fontSize: 13, color: colors.hotOrange, fontWeight: 600 }}
                            />
                        </Row>

                        <div
                            style={{
                                background: 'white',
                                padding: 12,
                                borderRadius: 12,
                                display: 'inline-block',
                                marginBottom: 16
                            }}>
                            <QRCodeSVG value={currentAddress?.address || ''} size={140} level="M" />
                        </div>

                        <div
                            onClick={handleCopyAddress}
                            style={{
                                background: colors.buttonHoverBg,
                                borderRadius: 10,
                                padding: '10px 14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                marginBottom: 16
                            }}>
                            <Text
                                text={currentAddress?.address || ''}
                                style={{
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all',
                                    textAlign: 'center'
                                }}
                            />
                            {copying ? (
                                <CheckCircleFilled style={{ color: colors.success, fontSize: 14, flexShrink: 0 }} />
                            ) : (
                                <CopyOutlined style={{ color: colors.textFaded, fontSize: 14, flexShrink: 0 }} />
                            )}
                        </div>

                        <Button
                            preset="primary"
                            text={rotating ? 'Generating...' : 'New Address'}
                            icon={<SwapOutlined />}
                            onClick={handleRotate}
                            disabled={rotating}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div
                        style={{
                            background: `linear-gradient(145deg, ${colors.coldBlue}15 0%, ${colors.coldBlue}08 100%)`,
                            border: `1px solid ${colors.coldBlue}30`,
                            borderRadius: '14px',
                            padding: '14px'
                        }}>
                        <Row style={{ alignItems: 'center', gap: 12 }}>
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: `${colors.coldBlue}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <SafetyCertificateOutlined style={{ fontSize: 20, color: colors.coldBlue }} />
                            </div>
                            <Column style={{ flex: 1 }}>
                                <Text text="Cold Storage" style={{ fontWeight: 600, fontSize: 13 }} />
                                <Text
                                    text={`${satoshisToAmount(Number(BigInt(summary?.coldWalletBalance || '0')))} BTC`}
                                    style={{ fontSize: 16, fontWeight: 600, color: colors.coldBlue }}
                                />
                            </Column>
                            {BigInt(summary?.coldWalletBalance || '0') > 0n && (
                                <Button
                                    preset="default"
                                    text="Withdraw"
                                    onClick={() => navigate(RouteTypes.ColdStorageWithdrawScreen)}
                                    style={{
                                        fontSize: 12,
                                        padding: '6px 12px',
                                        background: `${colors.coldBlue}20`,
                                        borderColor: `${colors.coldBlue}40`,
                                        color: colors.coldBlue
                                    }}
                                />
                            )}
                        </Row>
                        {coldWalletAddress && (
                            <div
                                onClick={handleCopyColdAddress}
                                style={{
                                    background: colors.buttonHoverBg,
                                    borderRadius: 8,
                                    padding: '8px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginTop: 10
                                }}>
                                <Text
                                    text={`${coldWalletAddress.slice(0, 14)}...${coldWalletAddress.slice(-14)}`}
                                    style={{ fontSize: 10, fontFamily: 'monospace', flex: 1, color: colors.textFaded }}
                                />
                                {copyingCold ? (
                                    <CheckCircleFilled style={{ color: colors.success, fontSize: 12 }} />
                                ) : (
                                    <CopyOutlined style={{ color: colors.textFaded, fontSize: 12 }} />
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <StatCard
                            label="Hot Addresses"
                            value={summary?.totalRotatedAddresses?.toString() || '0'}
                            sub={`${summary?.addressesWithBalance || 0} with balance`}
                        />
                        <StatCard
                            label="Hot Balance"
                            value={satoshisToAmount(Number(BigInt(summary?.totalHotBalance || '0')))}
                            sub="BTC to consolidate"
                        />
                    </div>

                    <div style={{ background: colors.containerBgFaded, borderRadius: '12px', overflow: 'hidden' }}>
                        <ActionRow
                            icon={<HistoryOutlined style={{ color: colors.main }} />}
                            title="View History"
                            onClick={() => navigate(RouteTypes.RotationHistoryScreen)}
                        />
                        <ActionRow
                            icon={<SwapOutlined style={{ color: colors.success }} />}
                            title="Consolidate Funds"
                            sub={`${satoshisToAmount(Number(BigInt(summary?.pendingConsolidation || '0')))} BTC`}
                            onClick={() => navigate(RouteTypes.ConsolidationScreen)}
                            disabled={BigInt(summary?.pendingConsolidation || '0') === 0n}
                        />
                        <ActionRow
                            icon={<SettingOutlined style={{ color: colors.textFaded }} />}
                            title="Auto-Rotate"
                            isToggle
                            toggleValue={summary?.autoRotate}
                            onToggle={handleToggleAutoRotate}
                            isLast
                        />
                    </div>

                    {canDisable && (
                        <Button
                            preset="default"
                            text="Disable Rotation"
                            onClick={handleDisable}
                            style={{
                                marginTop: 8,
                                background: 'transparent',
                                border: `1px solid ${colors.error}40`,
                                color: colors.error,
                                fontSize: 13
                            }}
                        />
                    )}
                </Column>
            </Content>
        </Layout>
    );
}

function FeatureItem({
    icon,
    title,
    description,
    isLast
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    isLast?: boolean;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '14px 16px',
                gap: 12,
                borderBottom: isLast ? 'none' : `1px solid ${colors.containerBorder}`
            }}>
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: colors.buttonHoverBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18
                }}>
                {icon}
            </div>
            <Column style={{ flex: 1 }}>
                <Text text={title} style={{ fontWeight: 500, fontSize: 14 }} />
                <Text text={description} preset="sub" style={{ fontSize: 12, marginTop: 2 }} />
            </Column>
        </div>
    );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div style={{ background: colors.containerBgFaded, borderRadius: 10, padding: 12 }}>
            <Text text={label} style={{ fontSize: 10, color: colors.textFaded }} />
            <Text text={value} style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }} />
            <Text text={sub} style={{ fontSize: 9, color: colors.textFaded, marginTop: 1 }} />
        </div>
    );
}

function ActionRow({
    icon,
    title,
    sub,
    onClick,
    disabled,
    isToggle,
    toggleValue,
    onToggle,
    isLast
}: {
    icon: React.ReactNode;
    title: string;
    sub?: string;
    onClick?: () => void;
    disabled?: boolean;
    isToggle?: boolean;
    toggleValue?: boolean;
    onToggle?: () => void;
    isLast?: boolean;
}) {
    return (
        <div
            onClick={disabled ? undefined : isToggle ? onToggle : onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 14px',
                gap: 10,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                borderBottom: isLast ? 'none' : `1px solid ${colors.containerBorder}`
            }}>
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: colors.buttonHoverBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14
                }}>
                {icon}
            </div>
            <Column style={{ flex: 1 }}>
                <Text text={title} style={{ fontWeight: 500, fontSize: 13 }} />
                {sub && <Text text={sub} preset="sub" style={{ fontSize: 10, marginTop: 1 }} />}
            </Column>
            {isToggle ? (
                <div
                    style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        background: toggleValue ? colors.main : colors.buttonBg,
                        padding: 2
                    }}>
                    <div
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            background: 'white',
                            transform: toggleValue ? 'translateX(18px)' : 'translateX(0)',
                            transition: 'transform 0.2s'
                        }}
                    />
                </div>
            ) : (
                <RightOutlined style={{ fontSize: 11, color: colors.textFaded }} />
            )}
        </div>
    );
}
