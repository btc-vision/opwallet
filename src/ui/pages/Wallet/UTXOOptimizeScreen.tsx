import { useCallback, useMemo, useState } from 'react';

import { UTXO_CONFIG } from '@/shared/config';
import { Content, Header, Layout } from '@/ui/components';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { useAccountBalance } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useConsolidation } from '@/ui/pages/Main/WalletTabScreen/hooks';
import {
    CheckCircleOutlined,
    WarningOutlined
} from '@ant-design/icons';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

export default function UTXOOptimizeScreen() {
    const accountBalance = useAccountBalance();
    const btcUnit = useBTCUnit();
    const {
        checkOptimizationStatus,
        navigateToConsolidation,
        navigateToSplit,
        validateSplit,
        calculateMaxSplits
    } = useConsolidation();

    const [splitCount, setSplitCount] = useState(25);
    const [splitFeeRate, setSplitFeeRate] = useState(5);

    const optimizationStatus = useMemo(
        () => checkOptimizationStatus(accountBalance),
        [accountBalance, checkOptimizationStatus]
    );

    const isSplitValid = useMemo(
        () => validateSplit(optimizationStatus.availableBalance, splitCount),
        [optimizationStatus.availableBalance, splitCount, validateSplit]
    );

    const maxSplits = useMemo(
        () => calculateMaxSplits(optimizationStatus.availableBalance),
        [optimizationStatus.availableBalance, calculateMaxSplits]
    );

    const outputPerSplit = useMemo(() => {
        if (splitCount <= 0) return 0n;
        return optimizationStatus.availableBalance / BigInt(splitCount);
    }, [optimizationStatus.availableBalance, splitCount]);

    const handleSplit = useCallback(async () => {
        if (isSplitValid && splitFeeRate > 0) {
            await navigateToSplit(splitCount, splitFeeRate);
        }
    }, [isSplitValid, splitCount, splitFeeRate, navigateToSplit]);

    const handleConsolidate = useCallback(async () => {
        await navigateToConsolidation();
    }, [navigateToConsolidation]);

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Optimize Wallet" />
            <Content style={{ padding: '12px' }}>
                {/* Current Status */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '14px',
                        border: `1px solid ${colors.containerBorder}`,
                        marginBottom: '16px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded,
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontWeight: 600
                        }}>
                        UTXO Status
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                        <span style={{ fontSize: '13px', color: colors.text }}>
                            Available UTXOs (Main + CSV1)
                        </span>
                        <span
                            style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color:
                                    optimizationStatus.status === 'optimized'
                                        ? colors.success
                                        : optimizationStatus.status === 'needs_split'
                                          ? colors.warning
                                          : colors.error
                            }}>
                            {optimizationStatus.utxoCount}
                        </span>
                    </div>
                    <div style={{ fontSize: '11px', color: colors.textFaded, marginTop: '6px' }}>
                        Optimal range: {optimizationStatus.splitThreshold} - {optimizationStatus.consolidateThreshold} UTXOs
                    </div>
                </div>

                {/* Optimized */}
                {optimizationStatus.status === 'optimized' && (
                    <div
                        style={{
                            background: `${colors.success}10`,
                            border: `1px solid ${colors.success}30`,
                            borderRadius: '12px',
                            padding: '24px',
                            textAlign: 'center'
                        }}>
                        <CheckCircleOutlined style={{ fontSize: 36, color: colors.success, marginBottom: '10px' }} />
                        <div style={{ fontSize: '16px', fontWeight: 600, color: colors.success, marginBottom: '6px' }}>
                            Wallet Optimized
                        </div>
                        <div style={{ fontSize: '12px', color: colors.textFaded, lineHeight: '1.5' }}>
                            Your wallet has an optimal number of UTXOs for contract interactions.
                        </div>
                    </div>
                )}

                {/* Needs Split */}
                {optimizationStatus.status === 'needs_split' && (
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '12px',
                                background: `${colors.warning}10`,
                                border: `1px solid ${colors.warning}30`,
                                borderRadius: '10px',
                                marginBottom: '16px'
                            }}>
                            <WarningOutlined style={{ fontSize: 14, color: colors.warning, marginTop: '1px', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.warning, marginBottom: '4px' }}>
                                    Low UTXO Count
                                </div>
                                <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                                    More UTXOs allow parallel contract interactions per block. Split to enable this.
                                </div>
                            </div>
                        </div>

                        {/* Split Config */}
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '12px',
                                padding: '14px',
                                border: `1px solid ${colors.containerBorder}`,
                                marginBottom: '16px'
                            }}>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px', fontWeight: 500 }}>
                                Split into how many UTXOs?
                            </div>
                            <input
                                type="number"
                                value={splitCount}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setSplitCount(Math.max(1, Math.min(val, maxSplits || 1)));
                                }}
                                min={1}
                                max={maxSplits || 1}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: colors.background,
                                    border: `1px solid ${isSplitValid ? colors.containerBorder : colors.error}`,
                                    borderRadius: '8px',
                                    color: colors.text,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '6px',
                                    fontSize: '10px',
                                    color: colors.textFaded
                                }}>
                                <span>Max: {maxSplits || 0}</span>
                                <span>
                                    Each: {(Number(outputPerSplit) / 1e8).toFixed(8).replace(/\.?0+$/, '')} {btcUnit}
                                </span>
                            </div>
                            {!isSplitValid && (
                                <div style={{ fontSize: '10px', color: colors.error, marginTop: '4px' }}>
                                    Each output must be at least {UTXO_CONFIG.MIN_SPLIT_OUTPUT.toLocaleString()} sats
                                </div>
                            )}
                        </div>

                        {/* Fee Rate */}
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '12px',
                                padding: '14px',
                                border: `1px solid ${colors.containerBorder}`,
                                marginBottom: '16px'
                            }}>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px', fontWeight: 500 }}>
                                Network Fee
                            </div>
                            <FeeRateBar onChange={(val) => setSplitFeeRate(val)} />
                        </div>

                        <button
                            onClick={() => void handleSplit()}
                            disabled={!isSplitValid || splitFeeRate <= 0}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: isSplitValid && splitFeeRate > 0 ? colors.main : colors.buttonBg,
                                border: 'none',
                                borderRadius: '12px',
                                cursor: isSplitValid && splitFeeRate > 0 ? 'pointer' : 'not-allowed',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: isSplitValid && splitFeeRate > 0 ? '#000' : colors.textFaded,
                                opacity: isSplitValid && splitFeeRate > 0 ? 1 : 0.5,
                                transition: 'all 0.2s'
                            }}>
                            Split UTXOs
                        </button>
                    </div>
                )}

                {/* Needs Consolidate */}
                {optimizationStatus.status === 'needs_consolidate' && (
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '12px',
                                background: `${colors.error}10`,
                                border: `1px solid ${colors.error}30`,
                                borderRadius: '10px',
                                marginBottom: '16px'
                            }}>
                            <WarningOutlined style={{ fontSize: 14, color: colors.error, marginTop: '1px', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.error, marginBottom: '4px' }}>
                                    High UTXO Count
                                </div>
                                <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                                    Too many UTXOs slows down operations and increases fees. Consolidate to improve performance.
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => void handleConsolidate()}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: colors.main,
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#000',
                                transition: 'all 0.2s'
                            }}>
                            Consolidate UTXOs
                        </button>
                    </div>
                )}
            </Content>
        </Layout>
    );
}
