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
        csv2_total_amount?: string;
        csv2_unlocked_amount?: string;
        csv2_locked_amount?: string;
        csv1_total_amount?: string;
        csv1_unlocked_amount?: string;
        csv1_locked_amount?: string;
        unspent_utxos_count: number;
        csv75_locked_utxos_count: number;
        csv75_unlocked_utxos_count: number;
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
}

export const BalanceTabs: React.FC<BalanceTabsProps> = ({
    accountBalance,
    btcUnit,
    colors,
    noBreakStyle,
    TransactionsCountComponent
}) => {
    const [activeTab, setActiveTab] = useState<BalanceTabType>('balance');

    const hasCSV75 = accountBalance.csv75_total_amount && parseFloat(accountBalance.csv75_total_amount) > 0;
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
        const csv2Total = parseFloat(accountBalance.csv2_total_amount || '0');
        const csv1Total = parseFloat(accountBalance.csv1_total_amount || '0');
        const total = mainBalance + csv75Total + csv2Total + csv1Total;
        return total.toFixed(8).replace(/\.?0+$/, '');
    };

    return (
        <div
            style={{
                background: 'rgba(0, 0, 0, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px',
                width: '280px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)'
            }}>
            {/* Tabs Header */}
            <div
                style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '12px',
                    borderBottom: `1px solid ${colors.containerBorder}`,
                    paddingBottom: '8px'
                }}>
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: activeTab === tab.id ? colors.main : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '10px',
                            fontWeight: activeTab === tab.id ? 600 : 500,
                            color: activeTab === tab.id ? '#000' : colors.textFaded
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.background = 'transparent';
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
                        <div style={{ marginBottom: hasCSV75 || hasCSV2 || hasCSV1 ? '12px' : '0' }}>
                            <div
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    marginBottom: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                Main Balance
                            </div>
                            <Row justifyBetween style={{ marginBottom: '4px' }}>
                                <span style={{ ...noBreakStyle, color: '#dbdbdb', fontSize: '11px' }}>Available</span>
                                <span
                                    style={{
                                        ...noBreakStyle,
                                        color: '#dbdbdb',
                                        fontSize: '11px'
                                    }}>{`${accountBalance.btc_confirm_amount} ${btcUnit}`}</span>
                            </Row>
                            <Row justifyBetween style={{ marginBottom: '4px' }}>
                                <span style={{ ...noBreakStyle, color: '#dbdbdb', fontSize: '11px' }}>Pending</span>
                                <span
                                    style={{
                                        ...noBreakStyle,
                                        color: '#dbdbdb',
                                        fontSize: '11px'
                                    }}>{`${accountBalance.btc_pending_amount} ${btcUnit}`}</span>
                            </Row>
                        </div>

                        {/* CSV75 Section */}
                        {hasCSV75 && (
                            <div
                                style={{
                                    marginBottom: hasCSV75 ? '12px' : '0',
                                    paddingTop: '12px',
                                    borderTop: `1px solid ${colors.containerBorder}`
                                }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: colors.main,
                                        marginBottom: '6px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    CSV 75 Balance
                                </div>
                                <Row justifyBetween style={{ marginBottom: '4px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '11px' }}>
                                        Unlocked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '11px' }}>
                                        {`${accountBalance.csv75_unlocked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row justifyBetween style={{ marginBottom: '4px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '11px' }}>
                                        Locked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '11px' }}>
                                        {`${accountBalance.csv75_locked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row
                                    justifyBetween
                                    style={{
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: `1px solid ${colors.containerBorder}`
                                    }}>
                                    <span
                                        style={{
                                            ...noBreakStyle,
                                            fontWeight: 600,
                                            color: '#dbdbdb',
                                            fontSize: '11px'
                                        }}>
                                        Total
                                    </span>
                                    <span
                                        style={{
                                            ...noBreakStyle,
                                            fontWeight: 600,
                                            color: '#dbdbdb',
                                            fontSize: '11px'
                                        }}>
                                        {`${accountBalance.csv75_total_amount} ${btcUnit}`}
                                    </span>
                                </Row>
                            </div>
                        )}

                        {/* CSV2 Section */}
                        {hasCSV2 && (
                            <div
                                style={{
                                    marginBottom: hasCSV1 ? '12px' : '0',
                                    paddingTop: '12px',
                                    borderTop: `1px solid ${colors.containerBorder}`
                                }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: colors.main,
                                        marginBottom: '6px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    CSV 2 Balance
                                </div>
                                <Row justifyBetween style={{ marginBottom: '4px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '11px' }}>
                                        Unlocked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '11px' }}>
                                        {`${accountBalance.csv2_unlocked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row justifyBetween style={{ marginBottom: '4px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '11px' }}>
                                        Locked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '11px' }}>
                                        {`${accountBalance.csv2_locked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row
                                    justifyBetween
                                    style={{
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: `1px solid ${colors.containerBorder}`
                                    }}>
                                    <span
                                        style={{
                                            ...noBreakStyle,
                                            fontWeight: 600,
                                            color: '#dbdbdb',
                                            fontSize: '11px'
                                        }}>
                                        Total
                                    </span>
                                    <span
                                        style={{
                                            ...noBreakStyle,
                                            fontWeight: 600,
                                            color: '#dbdbdb',
                                            fontSize: '11px'
                                        }}>
                                        {`${accountBalance.csv2_total_amount} ${btcUnit}`}
                                    </span>
                                </Row>
                            </div>
                        )}

                        {/* CSV1 Section */}
                        {hasCSV1 && (
                            <div
                                style={{
                                    paddingTop: '12px',
                                    borderTop: `1px solid ${colors.containerBorder}`
                                }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: colors.main,
                                        marginBottom: '6px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    CSV 1 Balance
                                </div>
                                <Row justifyBetween style={{ marginBottom: '4px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '11px' }}>
                                        Unlocked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.success, fontSize: '11px' }}>
                                        {`${accountBalance.csv1_unlocked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row justifyBetween style={{ marginBottom: '4px' }}>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '11px' }}>
                                        Locked
                                    </span>
                                    <span style={{ ...noBreakStyle, color: colors.warning, fontSize: '11px' }}>
                                        {`${accountBalance.csv1_locked_amount || '0'} ${btcUnit}`}
                                    </span>
                                </Row>
                                <Row
                                    justifyBetween
                                    style={{
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: `1px solid ${colors.containerBorder}`
                                    }}>
                                    <span
                                        style={{
                                            ...noBreakStyle,
                                            fontWeight: 600,
                                            color: '#dbdbdb',
                                            fontSize: '11px'
                                        }}>
                                        Total
                                    </span>
                                    <span
                                        style={{
                                            ...noBreakStyle,
                                            fontWeight: 600,
                                            color: '#dbdbdb',
                                            fontSize: '11px'
                                        }}>
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
                    borderTop: `2px solid ${colors.main}`,
                    paddingTop: '8px',
                    marginTop: '12px'
                }}>
                <Row justifyBetween>
                    <span
                        style={{
                            ...noBreakStyle,
                            fontWeight: 700,
                            color: colors.main,
                            fontSize: '11px'
                        }}>
                        GRAND TOTAL
                    </span>
                    <span
                        style={{
                            ...noBreakStyle,
                            fontWeight: 700,
                            color: colors.main,
                            fontSize: '11px'
                        }}>
                        {`${calculateTotalBalance()} ${btcUnit}`}
                    </span>
                </Row>
            </div>
        </div>
    );
};
