import React from 'react';
import { ArrowDownOutlined } from '@ant-design/icons';
import { TxBowtieGraph } from './index';
import { TxInput, TxOutput } from './types';

// Colors matching the wallet theme
const colors = {
    main: '#f37413',
    connector: '#f37413',
    background: '#1a1a1a',
    border: '#333',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    epochMiner: '#ff6b6b'
};

export interface TransactionData {
    label: string;
    inputs: TxInput[];
    outputs: TxOutput[];
    fee: number;
    txid?: string;
    vsize?: number;
}

export interface MultiTxBowtieGraphProps {
    transactions: TransactionData[];
    width?: number;
    showTooltip?: boolean;
    compact?: boolean;
}

export function MultiTxBowtieGraph({
    transactions,
    width = 340,
    showTooltip = true,
    compact = true
}: MultiTxBowtieGraphProps) {
    if (transactions.length === 0) {
        return null;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.map((tx, index) => (
                <React.Fragment key={index}>
                    {/* Transaction Card */}
                    <div
                        style={{
                            background: colors.background,
                            borderRadius: '8px',
                            padding: '12px',
                            border: `1px solid ${colors.border}`
                        }}>
                        {/* Transaction Header */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px',
                                paddingBottom: '8px',
                                borderBottom: `1px solid ${colors.border}`
                            }}>
                            <div
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: colors.main,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                {tx.label}
                            </div>
                            {tx.vsize && (
                                <div style={{ fontSize: '10px', color: colors.textFaded }}>
                                    {tx.vsize} vB
                                </div>
                            )}
                        </div>

                        {/* TXID if available */}
                        {tx.txid && (
                            <div
                                style={{
                                    fontSize: '9px',
                                    color: colors.textFaded,
                                    fontFamily: 'monospace',
                                    marginBottom: '8px',
                                    wordBreak: 'break-all'
                                }}>
                                {tx.txid.substring(0, 16)}...{tx.txid.substring(tx.txid.length - 16)}
                            </div>
                        )}

                        {/* Bowtie Graph */}
                        <TxBowtieGraph
                            inputs={tx.inputs}
                            outputs={tx.outputs}
                            fee={tx.fee}
                            width={width - 24}
                            height={compact ? 120 : 160}
                            showTooltip={showTooltip}
                            showLabels={true}
                            compact={compact}
                        />
                    </div>

                    {/* Connector Arrow between transactions */}
                    {index < transactions.length - 1 && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '4px 0'
                            }}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px'
                                }}>
                                <div
                                    style={{
                                        width: '2px',
                                        height: '12px',
                                        background: `linear-gradient(to bottom, ${colors.connector}, ${colors.connector}80)`
                                    }}
                                />
                                <ArrowDownOutlined
                                    style={{
                                        fontSize: 14,
                                        color: colors.connector
                                    }}
                                />
                                <div
                                    style={{
                                        fontSize: '9px',
                                        color: colors.textFaded
                                    }}>
                                    spends output
                                </div>
                            </div>
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export default MultiTxBowtieGraph;
