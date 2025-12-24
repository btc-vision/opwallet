/**
 * Address Rotation Screen
 *
 * Main management page for the address rotation privacy feature.
 * Displays current hot address, cold wallet status, and controls.
 */
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
    containerBg: '#434343',
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

    // If keyring rotation mode is enabled, the disable button should not be shown
    // (rotation mode is permanent for this wallet)
    const canDisable = !isKeyringRotationMode;

    useEffect(() => {
        void refreshRotation();
    }, [refreshRotation]);

    // Fetch cold wallet address when rotation is enabled
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
            tools.toastSuccess('Address copied to clipboard');
        } catch {
            tools.toastError('Failed to copy address');
        } finally {
            setTimeout(() => setCopying(false), 1500);
        }
    };

    const handleCopyColdAddress = async () => {
        if (!coldWalletAddress) return;
        setCopyingCold(true);
        try {
            await copyToClipboard(coldWalletAddress);
            tools.toastSuccess('Cold wallet address copied');
        } catch {
            tools.toastError('Failed to copy address');
        } finally {
            setTimeout(() => setCopyingCold(false), 1500);
        }
    };

    const handleEnable = async () => {
        setEnabling(true);
        try {
            const success = await enableRotation();
            if (success) {
                tools.toastSuccess('Address rotation enabled');
            } else {
                tools.toastError('Failed to enable rotation mode');
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
                tools.toastSuccess('Address rotation disabled');
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
                tools.toastSuccess('Rotated to new address');
            } else {
                tools.toastError('Failed to rotate address');
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

    // Loading state
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

    // Not supported (not HD wallet)
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
                            <InfoCircleOutlined
                                style={{ fontSize: 48, color: colors.warning, marginBottom: 16 }}
                            />
                            <Text
                                text="HD Wallet Required"
                                style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}
                            />
                            <Text
                                text="Address rotation mode requires an HD wallet created from a mnemonic phrase. This feature is not available for imported private key wallets."
                                preset="sub"
                                style={{ textAlign: 'center' }}
                            />
                        </div>
                    </Column>
                </Content>
            </Layout>
        );
    }

    // Not enabled - show enable screen
    if (!rotationState.enabled) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Address Rotation" />
                <Content>
                    <Column gap="lg" style={{ padding: '20px' }}>
                        {/* Feature explanation */}
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
                            <Text
                                text="Enhanced Privacy Mode"
                                style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}
                            />
                            <Text
                                text="Generate a fresh receiving address for every transaction. This is how Bitcoin was designed to be used - never reuse addresses."
                                preset="sub"
                                style={{ textAlign: 'center', lineHeight: 1.5 }}
                            />
                        </div>

                        {/* Features list */}
                        <div style={{ background: colors.containerBgFaded, borderRadius: '14px', overflow: 'hidden' }}>
                            <FeatureItem
                                icon={<ThunderboltOutlined style={{ color: colors.hotOrange }} />}
                                title="Auto-Rotating Addresses"
                                description="New address generated automatically when funds are received"
                            />
                            <FeatureItem
                                icon={<LockOutlined style={{ color: colors.coldBlue }} />}
                                title="Hidden Cold Storage"
                                description="Your cold wallet address is never revealed for maximum security"
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

    // Enabled - show management screen
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
                    {/* Current Hot Address Card */}
                    <div
                        style={{
                            background: `linear-gradient(145deg, ${colors.containerBgFaded} 0%, ${colors.containerBg}40 100%)`,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                        {/* Hot badge */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                background: colors.hotOrange,
                                color: 'white',
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '4px 8px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}>
                            <ThunderboltOutlined style={{ fontSize: 10 }} />
                            HOT WALLET
                        </div>

                        <Text
                            text="Current Receiving Address"
                            style={{ fontSize: 12, color: colors.textFaded, marginBottom: 12 }}
                        />

                        {/* QR Code */}
                        <div
                            style={{
                                background: 'white',
                                padding: 16,
                                borderRadius: 12,
                                display: 'inline-block',
                                marginBottom: 16
                            }}>
                            <QRCodeSVG
                                value={currentAddress?.address || ''}
                                size={160}
                                level="M"
                                includeMargin={false}
                            />
                        </div>

                        {/* Address */}
                        <div
                            onClick={handleCopyAddress}
                            style={{
                                background: colors.buttonHoverBg,
                                borderRadius: 10,
                                padding: '12px 14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 12
                            }}>
                            <Text
                                text={currentAddress?.address || ''}
                                style={{
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    flex: 1,
                                    wordBreak: 'break-all'
                                }}
                            />
                            {copying ? (
                                <CheckCircleFilled style={{ color: colors.success, fontSize: 16 }} />
                            ) : (
                                <CopyOutlined style={{ color: colors.textFaded, fontSize: 16 }} />
                            )}
                        </div>

                        {/* Index indicator */}
                        <Row justifyBetween>
                            <Text
                                text={`Address #${(summary?.currentIndex || 0) + 1}`}
                                style={{ fontSize: 11, color: colors.textFaded }}
                            />
                            <Button
                                preset="default"
                                text={rotating ? 'Rotating...' : 'Rotate Now'}
                                icon={<SwapOutlined />}
                                onClick={handleRotate}
                                disabled={rotating}
                                style={{ fontSize: 12 }}
                            />
                        </Row>
                    </div>

                    {/* Cold Storage Card */}
                    <div
                        style={{
                            background: `linear-gradient(145deg, ${colors.coldBlue}15 0%, ${colors.coldBlue}08 100%)`,
                            border: `1px solid ${colors.coldBlue}30`,
                            borderRadius: '16px',
                            padding: '16px'
                        }}>
                        <Row style={{ alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: `${colors.coldBlue}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <SafetyCertificateOutlined style={{ fontSize: 22, color: colors.coldBlue }} />
                            </div>
                            <Column style={{ flex: 1 }}>
                                <Row justifyBetween style={{ marginBottom: 4 }}>
                                    <Text text="Cold Storage" style={{ fontWeight: 600, fontSize: 14 }} />
                                    <LockOutlined style={{ fontSize: 12, color: colors.coldBlue }} />
                                </Row>
                                <Text
                                    text={`${satoshisToAmount(Number(BigInt(summary?.coldWalletBalance || '0')))} BTC`}
                                    style={{ fontSize: 18, fontWeight: 600, color: colors.coldBlue }}
                                />
                            </Column>
                        </Row>

                        {/* Cold wallet address display */}
                        {coldWalletAddress && (
                            <div
                                onClick={handleCopyColdAddress}
                                style={{
                                    background: colors.buttonHoverBg,
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginBottom: 12
                                }}>
                                <Text
                                    text={coldWalletAddress}
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        flex: 1,
                                        wordBreak: 'break-all',
                                        color: colors.textFaded
                                    }}
                                />
                                {copyingCold ? (
                                    <CheckCircleFilled style={{ color: colors.success, fontSize: 14 }} />
                                ) : (
                                    <CopyOutlined style={{ color: colors.textFaded, fontSize: 14 }} />
                                )}
                            </div>
                        )}

                        {/* Withdraw button */}
                        {BigInt(summary?.coldWalletBalance || '0') > 0n && (
                            <Button
                                preset="default"
                                text="Withdraw from Cold Storage"
                                onClick={() => navigate(RouteTypes.ColdStorageWithdrawScreen)}
                                style={{
                                    width: '100%',
                                    background: `${colors.coldBlue}20`,
                                    borderColor: `${colors.coldBlue}40`,
                                    color: colors.coldBlue
                                }}
                            />
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10
                        }}>
                        <StatCard
                            label="Hot Addresses"
                            value={summary?.totalRotatedAddresses?.toString() || '0'}
                            subValue={`${summary?.addressesWithBalance || 0} with balance`}
                        />
                        <StatCard
                            label="Hot Balance"
                            value={`${satoshisToAmount(Number(BigInt(summary?.totalHotBalance || '0')))} BTC`}
                            subValue="Pending consolidation"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ background: colors.containerBgFaded, borderRadius: '14px', overflow: 'hidden' }}>
                        <ActionItem
                            icon={<HistoryOutlined style={{ color: colors.main }} />}
                            title="View History"
                            description={`${summary?.totalRotatedAddresses || 0} addresses rotated`}
                            onClick={() => navigate(RouteTypes.RotationHistoryScreen)}
                        />
                        <ActionItem
                            icon={<SwapOutlined style={{ color: colors.success }} />}
                            title="Consolidate Funds"
                            description={`${satoshisToAmount(Number(BigInt(summary?.pendingConsolidation || '0')))} BTC ready`}
                            onClick={() => navigate(RouteTypes.ConsolidationScreen)}
                            disabled={BigInt(summary?.pendingConsolidation || '0') === 0n}
                        />
                        <ActionItem
                            icon={<SettingOutlined style={{ color: colors.textFaded }} />}
                            title="Auto-Rotate"
                            description="Rotate automatically when funds received"
                            isToggle
                            toggleValue={summary?.autoRotate}
                            onToggle={handleToggleAutoRotate}
                            isLast
                        />
                    </div>

                    {/* Disable button - only shown if rotation mode was NOT set at wallet creation */}
                    {canDisable && (
                        <Button
                            preset="default"
                            text="Disable Rotation Mode"
                            onClick={handleDisable}
                            style={{
                                marginTop: 10,
                                background: 'transparent',
                                border: `1px solid ${colors.error}40`,
                                color: colors.error
                            }}
                        />
                    )}

                    {/* Show permanent mode indicator when keyring rotation mode is enabled */}
                    {isKeyringRotationMode && (
                        <div
                            style={{
                                marginTop: 16,
                                padding: '12px 16px',
                                background: `linear-gradient(135deg, ${colors.success}15 0%, ${colors.success}08 100%)`,
                                border: `1px solid ${colors.success}40`,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10
                            }}>
                            <CheckCircleFilled style={{ color: colors.success, fontSize: 18 }} />
                            <Column>
                                <Text
                                    text="Privacy Mode Active"
                                    style={{ fontSize: 13, fontWeight: 600, color: colors.success }}
                                />
                                <Text
                                    text="This wallet was created with privacy mode permanently enabled"
                                    style={{ fontSize: 11, color: colors.textFaded }}
                                />
                            </Column>
                        </div>
                    )}
                </Column>
            </Content>
        </Layout>
    );
}

// Helper Components

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

function StatCard({ label, value, subValue }: { label: string; value: string; subValue: string }) {
    return (
        <div
            style={{
                background: colors.containerBgFaded,
                borderRadius: 12,
                padding: 14
            }}>
            <Text text={label} style={{ fontSize: 11, color: colors.textFaded }} />
            <Text text={value} style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }} />
            <Text text={subValue} style={{ fontSize: 10, color: colors.textFaded, marginTop: 2 }} />
        </div>
    );
}

function ActionItem({
    icon,
    title,
    description,
    onClick,
    disabled,
    isToggle,
    toggleValue,
    onToggle,
    isLast
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
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
                padding: '14px 16px',
                gap: 12,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                borderBottom: isLast ? 'none' : `1px solid ${colors.containerBorder}`,
                transition: 'background 0.15s'
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
                    fontSize: 16
                }}>
                {icon}
            </div>
            <Column style={{ flex: 1 }}>
                <Text text={title} style={{ fontWeight: 500, fontSize: 14 }} />
                <Text text={description} preset="sub" style={{ fontSize: 11, marginTop: 2 }} />
            </Column>
            {isToggle ? (
                <div
                    style={{
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        background: toggleValue ? colors.main : colors.buttonBg,
                        padding: 2,
                        transition: 'background 0.2s'
                    }}>
                    <div
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            background: 'white',
                            transform: toggleValue ? 'translateX(20px)' : 'translateX(0)',
                            transition: 'transform 0.2s'
                        }}
                    />
                </div>
            ) : (
                <RightOutlined style={{ fontSize: 12, color: colors.textFaded }} />
            )}
        </div>
    );
}
