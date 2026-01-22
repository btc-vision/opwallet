import React, { useMemo } from 'react';
import { LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

import { ParsedTransaction, PreSignedTransactionData } from '@/background/service/notification';
import { shortAddress } from '@/ui/utils';

import { MultiTxBowtieGraph, TransactionData } from './MultiTxBowtieGraph';
import { TxInput, TxOutput } from './types';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    success: '#4ade80',
    epochMiner: '#ff6b6b'
};

interface OPNetTxFlowPreviewProps {
    // Pre-signed transaction data (REQUIRED - no fallback)
    preSignedData: PreSignedTransactionData | null;
    // Loading state
    isLoading?: boolean;
    // Display options
    width?: number;
    showTooltip?: boolean;
    compact?: boolean;
    // Optional label override
    title?: string;
}

// Convert ParsedTransaction to TxBowtieGraph format
function parsedTxToBowtieFormat(
    tx: ParsedTransaction,
    isInteraction: boolean = false,
    epochMinerOutput: { value: bigint } | null = null
): { inputs: TxInput[]; outputs: TxOutput[]; fee: number } {
    const inputs: TxInput[] = tx.inputs.map((input) => ({
        txid: input.txid,
        vout: input.vout,
        address: `${input.txid.substring(0, 8)}:${input.vout}`,
        value: Number(input.value)
    }));

    const outputs: TxOutput[] = tx.outputs.map((output, index) => {
        const isEpochMinerOutput = isInteraction && index === 0 && epochMinerOutput !== null;

        return {
            address: output.isOpReturn
                ? 'OP_RETURN'
                : isEpochMinerOutput
                  ? '⚡ Epoch Miner'
                  : output.address
                    ? shortAddress(output.address, 6)
                    : 'Script',
            value: Number(output.value),
            isChange: !isEpochMinerOutput && output.address !== null && !output.isOpReturn,
            isEpochMiner: isEpochMinerOutput // Purple flow for OPNet gas fee
        };
    });

    return {
        inputs,
        outputs,
        fee: Number(tx.minerFee)
    };
}

/**
 * OPNetTxFlowPreview - Shows a transaction flow preview using pre-signed data
 * Pre-signed data is REQUIRED - no estimation fallback
 */
export function OPNetTxFlowPreview({
    preSignedData,
    isLoading = false,
    width = 340,
    showTooltip = true,
    compact = true,
    title
}: OPNetTxFlowPreviewProps) {
    // Convert pre-signed data to MultiTxBowtieGraph format
    const transactions: TransactionData[] = useMemo(() => {
        if (!preSignedData) return [];

        return preSignedData.transactions.map((tx, index) => {
            const isInteraction = preSignedData.type !== 'bitcoin_transfer' && index === preSignedData.transactions.length - 1;
            const { inputs, outputs, fee } = parsedTxToBowtieFormat(
                tx,
                isInteraction,
                isInteraction ? preSignedData.opnetEpochMinerOutput : null
            );

            let label = 'Transaction';
            if (preSignedData.transactions.length === 1) {
                if (preSignedData.type === 'bitcoin_transfer') {
                    label = 'Bitcoin Transfer';
                } else {
                    label = 'Interaction Transaction';
                }
            } else if (index === 0) {
                label = 'Funding Transaction';
            } else if (preSignedData.type === 'deployment') {
                label = 'Deployment Transaction';
            } else {
                label = 'Interaction Transaction';
            }

            return {
                label,
                inputs,
                outputs,
                fee,
                txid: tx.txid,
                vsize: tx.vsize
            };
        });
    }, [preSignedData]);

    // Loading state
    if (isLoading || !preSignedData) {
        return (
            <div
                style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '12px',
                    padding: '12px',
                    border: `1px solid ${colors.main}20`
                }}>
                {title && (
                    <div
                        style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: colors.main,
                            marginBottom: '12px',
                            textAlign: 'center'
                        }}>
                        {title}
                    </div>
                )}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '24px',
                        gap: '12px'
                    }}>
                    <LoadingOutlined style={{ fontSize: 32, color: colors.main }} spin />
                    <div style={{ fontSize: '12px', color: colors.text }}>
                        Building transaction...
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '10px',
                            color: colors.success,
                            background: `${colors.success}10`,
                            padding: '6px 10px',
                            borderRadius: '6px'
                        }}>
                        <SafetyCertificateOutlined style={{ fontSize: 12 }} />
                        <span>Safe - will not broadcast until confirmed</span>
                    </div>
                </div>
            </div>
        );
    }

    // No transactions available
    if (preSignedData.transactions.length === 0) {
        return (
            <div
                style={{
                    width,
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '12px',
                    color: colors.textFaded,
                    fontSize: '12px',
                    textAlign: 'center'
                }}>
                <div style={{ marginBottom: '8px', color: colors.main }}>
                    Transaction Preview
                </div>
                <div style={{ fontSize: '11px' }}>
                    No transaction data available
                </div>
            </div>
        );
    }

    // Render with pre-signed data
    return (
        <div
            style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                border: `1px solid ${colors.main}20`
            }}>
            {title && (
                <div
                    style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: colors.main,
                        marginBottom: '12px',
                        textAlign: 'center'
                    }}>
                    {title}
                </div>
            )}

            <MultiTxBowtieGraph
                transactions={transactions}
                width={width - 24}
                showTooltip={showTooltip}
                compact={compact}
            />

            <div
                style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: `1px solid ${colors.main}20`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px'
                }}>
                {preSignedData.opnetGasFee > 0n && (
                    <div>
                        <span style={{ color: colors.textFaded }}>OPNet Gas: </span>
                        <span style={{ color: colors.epochMiner, fontWeight: 600 }}>
                            {(Number(preSignedData.opnetGasFee) / 1e8).toFixed(8).replace(/\.?0+$/, '')} BTC
                        </span>
                    </div>
                )}
                <div>
                    <span style={{ color: colors.textFaded }}>Mining Fee: </span>
                    <span style={{ color: colors.main, fontWeight: 600 }}>
                        {(Number(preSignedData.totalMiningFee) / 1e8).toFixed(8).replace(/\.?0+$/, '')} BTC
                    </span>
                </div>
            </div>
        </div>
    );
}

export default OPNetTxFlowPreview;
