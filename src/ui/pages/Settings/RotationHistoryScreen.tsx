import { useEffect } from 'react';
import {
    CheckCircleFilled,
    ClockCircleOutlined,
    SwapOutlined,
    ReloadOutlined,
    CopyOutlined
} from '@ant-design/icons';

import { Layout, Header, Content, Column, Row, Text, OPNetLoader } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { copyToClipboard, satoshisToAmount, shortAddress } from '@/ui/utils';
import { useRotationHistory, useRefreshRotation, useRotationLoading } from '@/ui/state/rotation/hooks';
import { RotatedAddressStatus } from '@/shared/types/AddressRotation';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    warning: '#fbbf24',
    hotOrange: '#f97316',
    coldBlue: '#3b82f6'
};

const statusConfig: Record<
    RotatedAddressStatus,
    { label: string; color: string; icon: React.ReactNode }
> = {
    [RotatedAddressStatus.ACTIVE]: {
        label: 'Active',
        color: colors.hotOrange,
        icon: <ClockCircleOutlined />
    },
    [RotatedAddressStatus.RECEIVED]: {
        label: 'Received',
        color: colors.warning,
        icon: <SwapOutlined />
    },
    [RotatedAddressStatus.CONSOLIDATED]: {
        label: 'Consolidated',
        color: colors.success,
        icon: <CheckCircleFilled />
    },
    [RotatedAddressStatus.ARCHIVED]: {
        label: 'Archived',
        color: colors.textFaded,
        icon: <CheckCircleFilled />
    }
};

export default function RotationHistoryScreen() {
    const tools = useTools();
    const history = useRotationHistory();
    const loading = useRotationLoading();
    const refreshRotation = useRefreshRotation();

    useEffect(() => {
        void refreshRotation();
    }, [refreshRotation]);

    const handleCopyAddress = async (address: string) => {
        try {
            await copyToClipboard(address);
            tools.toastSuccess('Address copied');
        } catch {
            tools.toastError('Failed to copy');
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && history.length === 0) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Rotation History" />
                <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <OPNetLoader size={70} text="Loading" />
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header
                onBack={() => window.history.go(-1)}
                title="Rotation History"
                RightComponent={
                    <ReloadOutlined
                        style={{ fontSize: 18, color: colors.text, cursor: 'pointer' }}
                        onClick={() => refreshRotation()}
                    />
                }
            />
            <Content>
                <Column gap="sm" style={{ padding: '16px' }}>
                    {history.length === 0 ? (
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '40px 20px',
                                textAlign: 'center'
                            }}>
                            <SwapOutlined
                                style={{ fontSize: 48, color: colors.textFaded, marginBottom: 16 }}
                            />
                            <Text text="No rotation history yet" preset="sub" />
                        </div>
                    ) : (
                        <>
                            <Text
                                text={`${history.length} address${history.length !== 1 ? 'es' : ''} in rotation`}
                                style={{ fontSize: 12, color: colors.textFaded, marginBottom: 8 }}
                            />

                            {history.map((addr, index) => {
                                const config = statusConfig[addr.status];
                                const hasBalance = BigInt(addr.currentBalance) > 0n;

                                return (
                                    <div
                                        key={addr.address}
                                        style={{
                                            background: colors.containerBgFaded,
                                            borderRadius: '12px',
                                            padding: '14px',
                                            border: addr.status === RotatedAddressStatus.ACTIVE
                                                ? `1px solid ${colors.hotOrange}40`
                                                : 'none'
                                        }}>
                                        <Row justifyBetween style={{ marginBottom: 8 }}>
                                            <Row style={{ gap: 8 }}>
                                                <Text
                                                    text={`#${addr.derivationIndex + 1}`}
                                                    style={{
                                                        fontSize: 11,
                                                        color: colors.textFaded,
                                                        fontFamily: 'monospace'
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        background: `${config.color}20`,
                                                        color: config.color,
                                                        fontSize: 10,
                                                        fontWeight: 500,
                                                        padding: '2px 6px',
                                                        borderRadius: 4
                                                    }}>
                                                    {config.icon}
                                                    <span>{config.label}</span>
                                                </div>
                                            </Row>
                                            {hasBalance && (
                                                <Text
                                                    text={`${satoshisToAmount(Number(BigInt(addr.currentBalance)))} BTC`}
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: colors.success
                                                    }}
                                                />
                                            )}
                                        </Row>

                                        <Row
                                            onClick={() => handleCopyAddress(addr.address)}
                                            style={{
                                                gap: 8,
                                                cursor: 'pointer',
                                                padding: '8px',
                                                background: 'rgba(0,0,0,0.2)',
                                                borderRadius: 8,
                                                marginBottom: 8
                                            }}>
                                            <Text
                                                text={shortAddress(addr.address, 12)}
                                                style={{
                                                    flex: 1,
                                                    fontSize: 12,
                                                    fontFamily: 'monospace',
                                                    color: colors.text
                                                }}
                                            />
                                            <CopyOutlined
                                                style={{ fontSize: 12, color: colors.textFaded }}
                                            />
                                        </Row>

                                        <Row justifyBetween>
                                            <Text
                                                text={`Created ${formatDate(addr.createdAt)}`}
                                                style={{ fontSize: 10, color: colors.textFaded }}
                                            />
                                            {addr.receivedAt && (
                                                <Text
                                                    text={`Received ${formatDate(addr.receivedAt)}`}
                                                    style={{ fontSize: 10, color: colors.warning }}
                                                />
                                            )}
                                            {addr.consolidatedAt && (
                                                <Text
                                                    text={`Consolidated ${formatDate(addr.consolidatedAt)}`}
                                                    style={{ fontSize: 10, color: colors.success }}
                                                />
                                            )}
                                        </Row>

                                        {BigInt(addr.totalReceived) > 0n && (
                                            <Text
                                                text={`Total received: ${satoshisToAmount(Number(BigInt(addr.totalReceived)))} BTC`}
                                                style={{
                                                    fontSize: 10,
                                                    color: colors.textFaded,
                                                    marginTop: 8
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </Column>
            </Content>
        </Layout>
    );
}
