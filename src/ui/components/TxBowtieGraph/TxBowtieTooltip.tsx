import React from 'react';

import { satoshisToAmount, shortAddress } from '@/ui/utils';

import { TxInput, TxOutput } from './index';

export interface TooltipPosition {
    x: number;
    y: number;
}

interface TxBowtieTooltipProps {
    type: 'input' | 'output' | 'fee' | 'epochminer';
    data: TxInput | TxOutput | { value: number };
    position: TooltipPosition;
    btcUnit: string;
    containerWidth: number;
}

const tooltipStyles: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(33, 33, 33, 0.95)',
    border: '1px solid rgba(243, 116, 19, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    padding: '10px 14px',
    pointerEvents: 'none',
    zIndex: 1000,
    maxWidth: '280px',
    minWidth: '180px',
    fontSize: '12px',
    color: '#dbdbdb'
};

const labelStyles: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '2px'
};

const valueStyles: React.CSSProperties = {
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '13px',
    fontFamily: 'monospace'
};

const addressStyles: React.CSSProperties = {
    color: '#f37413',
    fontFamily: 'monospace',
    fontSize: '11px',
    wordBreak: 'break-all'
};

export function TxBowtieTooltip({
    type,
    data,
    position,
    btcUnit,
    containerWidth
}: TxBowtieTooltipProps) {
    // Calculate tooltip position (avoid going off-screen)
    const tooltipX = position.x > containerWidth / 2
        ? position.x - 200  // Show on left if hovering right side
        : position.x + 15;  // Show on right if hovering left side

    const tooltipY = position.y + 20;

    if (type === 'fee') {
        return (
            <div
                style={{
                    ...tooltipStyles,
                    left: tooltipX,
                    top: tooltipY,
                    border: '1px solid rgba(59, 130, 246, 0.3)' // Blue border for mining fee
                }}
            >
                <div style={{ marginBottom: '8px' }}>
                    <div style={labelStyles}>Mining Fee</div>
                    <div style={{ ...valueStyles, color: '#3b82f6' }}>
                        {satoshisToAmount(data.value)} {btcUnit}
                    </div>
                </div>
                <div style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: '6px',
                    marginTop: '6px'
                }}>
                    Paid to Bitcoin miners
                </div>
            </div>
        );
    }

    if (type === 'epochminer') {
        return (
            <div
                style={{
                    ...tooltipStyles,
                    left: tooltipX,
                    top: tooltipY,
                    border: '1px solid rgba(168, 85, 247, 0.3)' // Purple border for epoch miner
                }}
            >
                <div style={{ marginBottom: '8px' }}>
                    <div style={labelStyles}>OPNet Gas Fee</div>
                    <div style={{ ...valueStyles, color: '#a855f7' }}>
                        {satoshisToAmount(data.value)} {btcUnit}
                    </div>
                </div>
                <div style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: '6px',
                    marginTop: '6px'
                }}>
                    Paid to OPNet Epoch Miner
                </div>
            </div>
        );
    }

    const hasAddress = 'address' in data && data.address;
    const isInput = type === 'input';
    const inputData = data as TxInput & { isConsolidated?: boolean; consolidatedCount?: number };
    const outputData = data as TxOutput & { isConsolidated?: boolean; consolidatedCount?: number };
    const isConsolidated = 'isConsolidated' in data && (data as { isConsolidated?: boolean }).isConsolidated;
    const consolidatedCount = 'consolidatedCount' in data ? (data as { consolidatedCount?: number }).consolidatedCount || 0 : 0;

    // Handle consolidated items differently
    // Pink for consolidated inputs, orange for consolidated outputs
    const consolidatedColor = isInput ? '#ec4899' : '#ee771b';

    if (isConsolidated) {
        return (
            <div
                style={{
                    ...tooltipStyles,
                    left: tooltipX,
                    top: tooltipY,
                    border: isInput ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid rgba(243, 116, 19, 0.3)'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: consolidatedColor
                    }} />
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: consolidatedColor
                    }}>
                        {consolidatedCount} {isInput ? 'INPUTS' : 'OUTPUTS'} COMBINED
                    </span>
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <div style={labelStyles}>Total Value</div>
                    <div style={valueStyles}>
                        {satoshisToAmount(data.value)} {btcUnit}
                    </div>
                    <div style={{
                        fontSize: '10px',
                        color: 'rgba(255, 255, 255, 0.4)'
                    }}>
                        {data.value.toLocaleString()} sats
                    </div>
                </div>

                <div style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: '6px'
                }}>
                    Combined for display
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                ...tooltipStyles,
                left: tooltipX,
                top: tooltipY
            }}
        >
            {/* Type indicator */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isInput ? '#f37413' : '#ee771b'
                }} />
                <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isInput ? '#f37413' : '#ee771b'
                }}>
                    {isInput ? 'INPUT' : outputData.isChange ? 'CHANGE OUTPUT' : 'OUTPUT'}
                </span>
                {isInput && inputData.isToSign && (
                    <span style={{
                        fontSize: '9px',
                        background: 'rgba(243, 116, 19, 0.2)',
                        color: '#f37413',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginLeft: 'auto'
                    }}>
                        TO SIGN
                    </span>
                )}
            </div>

            {/* Value */}
            <div style={{ marginBottom: '8px' }}>
                <div style={labelStyles}>Value</div>
                <div style={valueStyles}>
                    {satoshisToAmount(data.value)} {btcUnit}
                </div>
                <div style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.4)'
                }}>
                    {data.value.toLocaleString()} sats
                </div>
            </div>

            {/* Address */}
            {hasAddress && (
                <div style={{ marginBottom: isInput && inputData.txid ? '8px' : 0 }}>
                    <div style={labelStyles}>Address</div>
                    <div style={addressStyles}>
                        {shortAddress(data.address, 12)}
                    </div>
                </div>
            )}

            {/* Previous tx (for inputs) */}
            {isInput && inputData.txid && (
                <div>
                    <div style={labelStyles}>Previous TX</div>
                    <div style={{
                        ...addressStyles,
                        fontSize: '10px',
                        color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                        {shortAddress(inputData.txid, 10)}:{inputData.vout}
                    </div>
                </div>
            )}

            {/* Coinbase indicator */}
            {isInput && inputData.isCoinbase && (
                <div style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '10px',
                    color: '#4ade80'
                }}>
                    Coinbase (newly mined)
                </div>
            )}
        </div>
    );
}

export default TxBowtieTooltip;
