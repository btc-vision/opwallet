import { Row } from '@/ui/components';
import React, { CSSProperties, useState } from 'react';
import { BalanceTabType } from '../constants';

interface BalanceTabsProps {
    accountBalance: {
        btc_confirm_amount: string;
        btc_pending_amount: string;
        btc_total_amount: string;
        csv75_total_amount?: string;
        csv75_unlocked_amount?: string;
        csv75_locked_amount?: string;
        csv3_total_amount?: string;
        csv3_unlocked_amount?: string;
        csv3_locked_amount?: string;
        csv2_total_amount?: string;
        csv2_unlocked_amount?: string;
        csv2_locked_amount?: string;
        csv1_total_amount?: string;
        csv1_unlocked_amount?: string;
        csv1_locked_amount?: string;
        unspent_utxos_count: number;
        csv75_locked_utxos_count: number;
        csv75_unlocked_utxos_count: number;
        csv3_locked_utxos_count: number;
        csv3_unlocked_utxos_count: number;
        csv2_locked_utxos_count: number;
        csv2_unlocked_utxos_count: number;
        csv1_locked_utxos_count: number;
        csv1_unlocked_utxos_count: number;
        p2wda_utxos_count: number;
        unspent_p2wda_utxos_count: number;
    };
    btcUnit: string;
    colors: {
        main: string;
        containerBorder: string;
        success: string;
        error: string;
        warning: string;
        textFaded: string;
        buttonBg: string;
        buttonHoverBg: string;
    };
    noBreakStyle: CSSProperties;
    TransactionsCountComponent: React.ReactNode;
    defaultActiveTab?: BalanceTabType;
    noBorder?: boolean;
    alignLeft?: boolean;
}

export const BalanceTabs: React.FC<BalanceTabsProps> = ({
    accountBalance,
    btcUnit,
    colors,
    noBreakStyle,
    TransactionsCountComponent,
    defaultActiveTab = 'balance',
    noBorder = false,
    alignLeft = false
}) => {
    const [activeTab, setActiveTab] = useState<BalanceTabType>(defaultActiveTab);

    const hasCSV75 = accountBalance.csv75_total_amount && parseFloat(accountBalance.csv75_total_amount) > 0;
    const hasCSV3 = accountBalance.csv3_total_amount && parseFloat(accountBalance.csv3_total_amount) > 0;
    const hasCSV2 = accountBalance.csv2_total_amount && parseFloat(accountBalance.csv2_total_amount) > 0;
    const hasCSV1 = accountBalance.csv1_total_amount && parseFloat(accountBalance.csv1_total_amount) > 0;

    const tabs: { id: BalanceTabType; label: string; visible: boolean }[] = [
        { id: 'balance', label: 'Balance', visible: true },
        { id: 'quotas', label: 'Quotas', visible: true }
    ];

    const visibleTabs = tabs.filter((tab) => tab.visible);

    const calculateTotalBalance = () => {
        const mainBalance = parseFloat(accountBalance.btc_total_amount || '0');
        const csv75Total = parseFloat(accountBalance.csv75_total_amount || '0');
        const csv3Total = parseFloat(accountBalance.csv3_total_amount || '0');
        const csv2Total = parseFloat(accountBalance.csv2_total_amount || '0');
        const csv1Total = parseFloat(accountBalance.csv1_total_amount || '0');
        const total = mainBalance + csv75Total + csv3Total + csv2Total + csv1Total;
        return total.toFixed(8).replace(/\.?0+$/, '');
    };

    return (
        <div
            style={{
                background: noBorder ? 'transparent' : '#1a1a1a',
                border: noBorder ? 'none' : `1px solid ${colors.containerBorder}`,
                borderRadius: noBorder ? '0' : '14px',
                padding: noBorder ? '0' : '14px',
                width: alignLeft ? '100%' : '300px',
                boxShadow: noBorder ? 'none' : '0 8px 24px rgba(0, 0, 0, 0.4)',
                backdropFilter: noBorder ? 'none' : 'blur(12px)'
            }}>
            {/* Tabs Header */}
            <div
                style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '10px',
                    padding: '3px'
                }}>
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1,
                            padding: '7px 10px',
                            background: activeTab === tab.id ? colors.main : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: activeTab === tab.id ? '#000' : colors.textFaded
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.color = '#dbdbdb';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = colors.textFaded;
                            }
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: '80px' }}>
                {/* Main Balance Tab - Combined */}
                {activeTab === 'balance' && (
                    <div>
                        {/* Main Balance Section */}
                        <div
                            style={{
                                marginBottom: hasCSV75 || hasCSV3 || hasCSV2 || hasCSV1 ? '10px' : '0',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '10px',
                                padding: '10px 12px'
                            }}>
                            <div
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: colors.textFaded,
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    textAlign: 'left'
                                }}>
                                Main Balance
                            </div>
                            <Row justifyBetween style={{ marginBottom: '5px' }}>
                                <span style={{ ...noBreakStyle, color: '#dbdbdb', fontSize: '12px' }}>Available</span>
                                <span
                                    style={{
                                        ...noBreakStyle,
                                        color: '#dbdbdb',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}>{`${accountBalance.btc_confirm_amount} ${btcUnit}`}</span>
                            </Row>
                            <Row justifyBetween>
                                <span style={{ ...noBreakStyle, color: '#dbdbdb', fontSize: '12px' }}>Pending</span>
                                <span
                                    style={{
                                        ...noBreakStyle,
                                        color: '#dbdbdb',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}>{`${accountBalance.btc_pending_amount} ${btcUnit}`}</span>
                            </Row>
                        </div>

                        {/* CSV75 Section */}
                        {hasCSV75 && (
                            <div
                                style={{
                                    marginBottom: hasCSV3 || hasCSV2 || hasCSV1 ? '10px' : '0',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '10px',
                                    padding: '10px 12px'
                                }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: colors.main,
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        textAlign: 'left'
                                    }}>
                                    CSV 75 Balance
                                </div>
                                <Row justifyBetween style={{ marginBottom: '5px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '12px' }}>
                                        Unlocked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '12px', fontWeight: 600 }}>
                                        {`${accountBalance.csv75_unlocked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row justifyBetween style={{ marginBottom: '5px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '12px' }}>
                                        Locked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '12px', fontWeight: 600 }}>
                                        {`${accountBalance.csv75_locked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row
                                    justifyBetween
                                    style={{
                                        marginTop: '6px',
                                        paddingTop: '6px',
                                        borderTop: `1px solid rgba(255, 255, 255, 0.06)`
                                    }}>
                                    <span
                                        style={{
                                            ...noBreakStyle,
                                            fontWeight: 700,
                                            color: '#dbdbdb',
                                            fontSize: '12px'
                                        }}>
                                        Total
                                    </span>
                                    <span
                                        style={{
                                            ...noBreakStyle,
                                            fontWeight: 700,
                                            color: '#dbdbdb',
                                            fontSize: '12px'
                                        }}>
                                        {`${accountBalance.csv75_total_amount} ${btcUnit}`}
                                    </span>
                                </Row>
                            </div>
                        )}

                        {/* CSV3 Section */}
                        {hasCSV3 && (
                            <div
                                style={{
                                    marginBottom: hasCSV2 || hasCSV1 ? '10px' : '0',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '10px',
                                    padding: '10px 12px'
                                }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: colors.main,
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    CSV 3 Balance
                                </div>
                                <Row justifyBetween style={{ marginBottom: '5px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '12px' }}>
                                        Unlocked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '12px', fontWeight: 600 }}>
                                        {`${accountBalance.csv3_unlocked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row justifyBetween style={{ marginBottom: '5px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '12px' }}>
                                        Locked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '12px', fontWeight: 600 }}>
                                        {`${accountBalance.csv3_locked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row
                                    justifyBetween
                                    style={{
                                        marginTop: '6px',
                                        paddingTop: '6px',
                                        borderTop: `1px solid rgba(255, 255, 255, 0.06)`
                                    }}>
                                    <span style={{ ...noBreakStyle, fontWeight: 700, color: '#dbdbdb', fontSize: '12px' }}>
                                        Total
                                    </span>
                                    <span style={{ ...noBreakStyle, fontWeight: 700, color: '#dbdbdb', fontSize: '12px' }}>
                                        {`${accountBalance.csv3_total_amount} ${btcUnit}`}
                                    </span>
                                </Row>
                            </div>
                        )}

                        {/* CSV2 Section */}
                        {hasCSV2 && (
                            <div
                                style={{
                                    marginBottom: hasCSV1 ? '10px' : '0',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '10px',
                                    padding: '10px 12px'
                                }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: colors.main,
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    CSV 2 Balance
                                </div>
                                <Row justifyBetween style={{ marginBottom: '5px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '12px' }}>
                                        Unlocked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '12px', fontWeight: 600 }}>
                                        {`${accountBalance.csv2_unlocked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row justifyBetween style={{ marginBottom: '5px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '12px' }}>
                                        Locked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '12px', fontWeight: 600 }}>
                                        {`${accountBalance.csv2_locked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row
                                    justifyBetween
                                    style={{
                                        marginTop: '6px',
                                        paddingTop: '6px',
                                        borderTop: `1px solid rgba(255, 255, 255, 0.06)`
                                    }}>
                                    <span style={{ ...noBreakStyle, fontWeight: 700, color: '#dbdbdb', fontSize: '12px' }}>
                                        Total
                                    </span>
                                    <span style={{ ...noBreakStyle, fontWeight: 700, color: '#dbdbdb', fontSize: '12px' }}>
                                        {`${accountBalance.csv2_total_amount} ${btcUnit}`}
                                    </span>
                                </Row>
                            </div>
                        )}

                        {/* CSV1 Section */}
                        {hasCSV1 && (
                            <div
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '10px',
                                    padding: '10px 12px'
                                }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: colors.main,
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        textAlign: 'left'
                                    }}>
                                    CSV 1 Balance
                                </div>
                                <Row justifyBetween style={{ marginBottom: '5px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '12px' }}>
                                        Unlocked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '12px', fontWeight: 600 }}>
                                        {`${accountBalance.csv1_unlocked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row justifyBetween style={{ marginBottom: '5px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '12px' }}>
                                        Locked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '12px', fontWeight: 600 }}>
                                        {`${accountBalance.csv1_locked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row
                                    justifyBetween
                                    style={{
                                        marginTop: '6px',
                                        paddingTop: '6px',
                                        borderTop: `1px solid rgba(255, 255, 255, 0.06)`
                                    }}>
                                    <span style={{ ...noBreakStyle, fontWeight: 700, color: '#dbdbdb', fontSize: '12px' }}>
                                        Total
                                    </span>
                                    <span style={{ ...noBreakStyle, fontWeight: 700, color: '#dbdbdb', fontSize: '12px' }}>
                                        {`${accountBalance.csv1_total_amount} ${btcUnit}`}
                                    </span>
                                </Row>
                            </div>
                        )}
                    </div>
                )}

                {/* Quotas Tab */}
                {activeTab === 'quotas' && <div>{TransactionsCountComponent}</div>}
            </div>

            {/* Grand Total Footer */}
            <div
                style={{
                    background: `linear-gradient(135deg, ${colors.main}18 0%, ${colors.main}08 100%)`,
                    border: `1px solid ${colors.main}30`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginTop: '10px'
                }}>
                <Row justifyBetween>
                    <span
                        style={{
                            ...noBreakStyle,
                            fontWeight: 700,
                            color: colors.main,
                            fontSize: '12px'
                        }}>
                        GRAND TOTAL
                    </span>
                    <span
                        style={{
                            ...noBreakStyle,
                            fontWeight: 700,
                            color: colors.main,
                            fontSize: '12px'
                        }}>
                        {`${calculateTotalBalance()} ${btcUnit}`}
                    </span>
                </Row>
            </div>
        </div>
    );
};
