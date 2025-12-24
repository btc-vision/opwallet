/**
 * Consolidation Screen
 *
 * Allows users to consolidate funds from hot wallet addresses to cold storage.
 */
import { useEffect, useState } from 'react';
import {
    SafetyCertificateOutlined,
    ArrowDownOutlined,
    InfoCircleOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';

import { Layout, Header, Content, Column, Row, Button, Text, OPNetLoader } from '@/ui/components';
import { useWallet, satoshisToAmount } from '@/ui/utils';
import { useRotationHistory } from '@/ui/state/rotation/hooks';
import { RotatedAddressStatus, ConsolidationParams } from '@/shared/types/AddressRotation';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { Action, SourceType } from '@/shared/interfaces/RawTxParameters';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    coldBlue: '#3b82f6',
    hotOrange: '#f97316'
};

const FEE_RATES = [
    { label: 'Economy', rate: 1, description: '~60+ min' },
    { label: 'Standard', rate: 5, description: '~30 min' },
    { label: 'Fast', rate: 10, description: '~10 min' }
];

export default function ConsolidationScreen() {
    const wallet = useWallet();
    const navigate = useNavigate();

    const history = useRotationHistory();

    const [loading, setLoading] = useState(true);
    const [selectedFeeIndex, setSelectedFeeIndex] = useState(1);
    const [params, setParams] = useState<ConsolidationParams | null>(null);
    const [coldAddress, setColdAddress] = useState('');

    const addressesWithBalance = history.filter(
        (a) =>
            (a.status === RotatedAddressStatus.RECEIVED || a.status === RotatedAddressStatus.ACTIVE) &&
            BigInt(a.currentBalance) > 0n
    );

    useEffect(() => {
        void loadConsolidationParams();
    }, [selectedFeeIndex]);

    const loadConsolidationParams = async () => {
        setLoading(true);
        try {
            const feeRate = FEE_RATES[selectedFeeIndex].rate;
            const consolidationParams = await wallet.prepareConsolidation(feeRate);
            setParams(consolidationParams);

            // Get cold wallet address for destination
            const coldAddr = await wallet.getColdWalletAddress();
            setColdAddress(coldAddr);
        } catch (error) {
            console.error('Failed to prepare consolidation:', error);
            setParams(null);
        } finally {
            setLoading(false);
        }
    };

    const handleConsolidate = () => {
        if (!params || !coldAddress) return;

        // Calculate total input amount in satoshis
        const totalAmount = Number(BigInt(params.totalAmount));

        // Navigate to TxOpnetConfirmScreen with consolidation parameters
        navigate(RouteTypes.TxOpnetConfirmScreen, {
            action: Action.SendBitcoin,
            header: 'Consolidate to Cold Storage',
            features: {},
            tokens: [],
            feeRate: FEE_RATES[selectedFeeIndex].rate,
            priorityFee: 0n,
            to: coldAddress,
            inputAmount: totalAmount,
            sourceType: SourceType.CONSOLIDATION,
            sourceAddresses: params.sourceAddresses,
            sourcePubkeys: params.sourcePubkeys,
            optimize: true
        });
    };

    if (loading && !params) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Consolidate Funds" />
                <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <OPNetLoader size={70} text="Preparing" />
                </Content>
            </Layout>
        );
    }

    // No funds to consolidate
    if (addressesWithBalance.length === 0) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Consolidate Funds" />
                <Content>
                    <Column gap="lg" style={{ padding: '20px' }}>
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '40px 20px',
                                textAlign: 'center'
                            }}>
                            <SafetyCertificateOutlined
                                style={{ fontSize: 48, color: colors.textFaded, marginBottom: 16 }}
                            />
                            <Text text="No funds to consolidate" style={{ marginBottom: 8 }} />
                            <Text
                                text="Your hot wallet addresses don't have any balance to move to cold storage."
                                preset="sub"
                                style={{ textAlign: 'center' }}
                            />
                        </div>
                    </Column>
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Consolidate Funds" />
            <Content>
                <Column gap="md" style={{ padding: '16px' }}>
                    {/* Info card */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                            border: `1px solid ${colors.main}30`,
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                        }}>
                        <InfoCircleOutlined style={{ fontSize: 16, color: colors.main, marginTop: 2 }} />
                        <Text
                            text="Move funds from your hot wallet addresses to your hidden cold storage for maximum security."
                            style={{ fontSize: 12, lineHeight: 1.5 }}
                        />
                    </div>

                    {/* Transfer visualization */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '14px',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                        {/* From */}
                        <div
                            style={{
                                background: `${colors.hotOrange}15`,
                                border: `1px solid ${colors.hotOrange}30`,
                                borderRadius: '12px',
                                padding: '14px'
                            }}>
                            <Row style={{ gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                                <ThunderboltOutlined style={{ color: colors.hotOrange }} />
                                <Text
                                    text={`${addressesWithBalance.length} Hot Address${addressesWithBalance.length !== 1 ? 'es' : ''}`}
                                    style={{ fontWeight: 500 }}
                                />
                            </Row>
                            <Text
                                text={`${satoshisToAmount(Number(BigInt(params?.totalAmount || '0')))} BTC`}
                                style={{ fontSize: 24, fontWeight: 600, color: colors.hotOrange }}
                            />
                        </div>

                        {/* Arrow */}
                        <div style={{ padding: '12px 0' }}>
                            <ArrowDownOutlined style={{ fontSize: 24, color: colors.textFaded }} />
                        </div>

                        {/* To */}
                        <div
                            style={{
                                background: `${colors.coldBlue}15`,
                                border: `1px solid ${colors.coldBlue}30`,
                                borderRadius: '12px',
                                padding: '14px'
                            }}>
                            <Row style={{ gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                                <SafetyCertificateOutlined style={{ color: colors.coldBlue }} />
                                <Text text="Cold Storage" style={{ fontWeight: 500 }} />
                            </Row>
                            <Text
                                text={`${satoshisToAmount(Number(BigInt(params?.netAmount || '0')))} BTC`}
                                style={{ fontSize: 24, fontWeight: 600, color: colors.coldBlue }}
                            />
                            <Text
                                text="After network fee"
                                style={{ fontSize: 11, color: colors.textFaded, marginTop: 4 }}
                            />
                        </div>
                    </div>

                    {/* Fee selection */}
                    <Column gap="sm">
                        <Text text="Network Fee" style={{ fontSize: 12, color: colors.textFaded }} />
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 8
                            }}>
                            {FEE_RATES.map((fee, index) => (
                                <div
                                    key={fee.label}
                                    onClick={() => setSelectedFeeIndex(index)}
                                    style={{
                                        background:
                                            selectedFeeIndex === index
                                                ? `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}10 100%)`
                                                : colors.containerBgFaded,
                                        border: `1px solid ${selectedFeeIndex === index ? colors.main : 'transparent'}`,
                                        borderRadius: '10px',
                                        padding: '12px 8px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}>
                                    <Text
                                        text={fee.label}
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 500,
                                            color: selectedFeeIndex === index ? colors.main : colors.text
                                        }}
                                    />
                                    <Text
                                        text={`${fee.rate} sat/vB`}
                                        style={{ fontSize: 11, color: colors.textFaded, marginTop: 2 }}
                                    />
                                    <Text
                                        text={fee.description}
                                        style={{ fontSize: 10, color: colors.textFaded, marginTop: 2 }}
                                    />
                                </div>
                            ))}
                        </div>
                    </Column>

                    {/* Transaction details */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px'
                        }}>
                        <Row justifyBetween style={{ marginBottom: 8 }}>
                            <Text text="Total amount" style={{ fontSize: 12, color: colors.textFaded }} />
                            <Text
                                text={`${satoshisToAmount(Number(BigInt(params?.totalAmount || '0')))} BTC`}
                                style={{ fontSize: 12 }}
                            />
                        </Row>
                        <Row justifyBetween style={{ marginBottom: 8 }}>
                            <Text text="Network fee" style={{ fontSize: 12, color: colors.textFaded }} />
                            <Text
                                text={`-${satoshisToAmount(Number(BigInt(params?.estimatedFee || '0')))} BTC`}
                                style={{ fontSize: 12, color: colors.error }}
                            />
                        </Row>
                        <Row justifyBetween style={{ marginBottom: 8 }}>
                            <Text text="UTXOs to consolidate" style={{ fontSize: 12, color: colors.textFaded }} />
                            <Text text={`${params?.utxoCount || 0}`} style={{ fontSize: 12 }} />
                        </Row>
                        <div
                            style={{
                                height: 1,
                                background: colors.containerBorder,
                                margin: '12px 0'
                            }}
                        />
                        <Row justifyBetween>
                            <Text text="You receive" style={{ fontSize: 14, fontWeight: 600 }} />
                            <Text
                                text={`${satoshisToAmount(Number(BigInt(params?.netAmount || '0')))} BTC`}
                                style={{ fontSize: 14, fontWeight: 600, color: colors.success }}
                            />
                        </Row>
                    </div>

                    {/* Consolidate button */}
                    <Button
                        preset="primary"
                        text="Review Consolidation"
                        onClick={handleConsolidate}
                        disabled={!params || !coldAddress || BigInt(params.netAmount) <= 0n}
                        style={{ marginTop: 10 }}
                    />

                    {params && BigInt(params.netAmount) <= 0n && (
                        <Text
                            text="Fee exceeds available balance"
                            style={{ fontSize: 12, color: colors.error, textAlign: 'center' }}
                        />
                    )}
                </Column>
            </Content>
        </Layout>
    );
}
