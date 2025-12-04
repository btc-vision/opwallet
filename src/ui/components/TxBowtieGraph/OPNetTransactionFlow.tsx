import React, { useMemo } from 'react';
import { LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

import { ParsedTransaction, PreSignedInteractionData } from '@/background/service/notification';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { selectorToString } from '@/shared/web3/decoder/CalldataDecoder';
import { shortAddress } from '@/ui/utils';
import { TxInput, TxOutput } from './index';
import { MultiTxBowtieGraph, TransactionData } from './MultiTxBowtieGraph';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBg: '#292929',
    success: '#4ade80',
    epochMiner: '#ff6b6b'
};

// Method name mapping for common selectors
const METHOD_NAMES: Record<string, string> = {
    // OP-20
    'f6688a68': 'Transfer',
    '69712a94': 'Transfer From',
    '8d645723': 'Approve',
    'a600a1df': 'Revoke',
    '308dce5f': 'Burn',
    '3950e061': 'Mint',
    '3a546b21': 'Airdrop',
    'ca1a382d': 'Airdrop',
    // Motoswap
    '4c2a940b': 'Add Liquidity',
    'b82480d3': 'Remove Liquidity',
    '713a012c': 'Swap Tokens',
    '0ccd8b3d': 'Stake',
    '453c505b': 'Unstake',
    'c76d0d0a': 'Claim Rewards',
    // MotoChef
    '09fd1691': 'Stake BTC',
    '8f2235ed': 'Unstake BTC',
    '77b7872f': 'Harvest',
    '51eb2cd8': 'Deposit',
    'f3813d86': 'Withdraw',
    // NativeSwap
    '073c2730': 'Reserve',
    'dbed39e2': 'Swap',
    '90d83548': 'Add Liquidity',
    '70dccc7f': 'Remove Liquidity',
    'ced27635': 'Create Pool',
    '2960f13b': 'List Liquidity',
    'a48e507c': 'Cancel Listing',
    '4203f335': 'Create Pool',
    'b1a5f7c2': 'Set Fees'
};

function getMethodName(calldata: string): string {
    if (calldata.length >= 8) {
        const selector = calldata.replace(/^0x/, '').substring(0, 8);
        return METHOD_NAMES[selector] || selectorToString(selector);
    }
    return 'Unknown';
}

// Safely convert bigint to number, handling edge cases
function safeNumber(value: bigint | number | undefined): number {
    if (value === undefined || value === null) return 0;
    const num = typeof value === 'bigint' ? Number(value) : value;
    if (!Number.isFinite(num) || num < 0) return 0;
    return num;
}

// Convert ParsedTransaction to TxBowtieGraph format
function parsedTxToBowtieFormat(
    tx: ParsedTransaction,
    isInteraction: boolean = false
): { inputs: TxInput[]; outputs: TxOutput[]; fee: number } {
    const inputs: TxInput[] = tx.inputs.map((input) => ({
        txid: input.txid,
        vout: input.vout,
        address: `${input.txid.substring(0, 8)}:${input.vout}`,
        value: safeNumber(input.value)
    }));

    const outputs: TxOutput[] = tx.outputs.map((output, index) => {
        // First output of interaction TX is OPNet Epoch Miner (gas)
        const isEpochMiner = isInteraction && index === 0;

        return {
            address: output.isOpReturn
                ? 'OP_RETURN'
                : output.address
                  ? shortAddress(output.address, 6)
                  : 'Script',
            value: safeNumber(output.value),
            isChange: !isEpochMiner && output.address !== null && !output.isOpReturn,
            // Mark epoch miner for special handling - we use isFee styling for red color
            isFee: isEpochMiner
        };
    });

    // Mining fee must be non-negative (inputs - outputs)
    // If negative, it means inputs weren't properly matched - show 0 instead
    const fee = safeNumber(tx.minerFee);

    return {
        inputs,
        outputs,
        fee
    };
}

export interface OPNetTransactionFlowProps {
    preSignedData: PreSignedInteractionData | null;
    contractAddress: string;
    contractInfo?: ContractInformation;
    calldata: string;
    isLoading?: boolean;
    width?: number;
}

export function OPNetTransactionFlow({
    preSignedData,
    contractAddress,
    contractInfo,
    calldata,
    isLoading = false,
    width = 340
}: OPNetTransactionFlowProps) {
    const methodName = useMemo(() => getMethodName(calldata), [calldata]);

    // Convert pre-signed data to MultiTxBowtieGraph format
    const transactions = useMemo((): TransactionData[] => {
        if (!preSignedData) return [];

        const txs: TransactionData[] = [];

        // Funding Transaction (if present)
        if (preSignedData.fundingTx) {
            const { inputs, outputs, fee } = parsedTxToBowtieFormat(preSignedData.fundingTx, false);
            txs.push({
                label: 'Funding Transaction',
                inputs,
                outputs,
                fee,
                txid: preSignedData.fundingTx.txid,
                vsize: preSignedData.fundingTx.vsize
            });
        }

        // Interaction Transaction
        const { inputs, outputs, fee } = parsedTxToBowtieFormat(preSignedData.interactionTx, true);

        // Mark the first output as Epoch Miner in the label
        if (outputs.length > 0 && preSignedData.opnetEpochMinerOutput) {
            outputs[0].address = `⚡ Epoch Miner`;
        }

        txs.push({
            label: 'Interaction Transaction',
            inputs,
            outputs,
            fee,
            txid: preSignedData.interactionTx.txid,
            vsize: preSignedData.interactionTx.vsize
        });

        return txs;
    }, [preSignedData]);

    // Calculate total fees
    const totalFees = useMemo(() => {
        if (!preSignedData) return { mining: 0n, gas: 0n };

        const fundingFee = preSignedData.fundingTx?.minerFee ?? 0n;
        const interactionFee = preSignedData.interactionTx.minerFee;
        const gasFee = preSignedData.opnetEpochMinerOutput?.value ?? 0n;

        return {
            mining: fundingFee + interactionFee,
            gas: gasFee
        };
    }, [preSignedData]);

    return (
        <div
            style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                border: `1px solid ${colors.main}20`
            }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    paddingBottom: '10px',
                    borderBottom: `1px solid ${colors.main}30`
                }}>
                <div>
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: colors.text
                        }}>
                        {methodName}
                    </div>
                    <div
                        style={{
                            fontSize: '10px',
                            color: colors.textFaded,
                            fontFamily: 'monospace'
                        }}>
                        {contractInfo?.name || shortAddress(contractAddress, 8)}
                    </div>
                </div>
                <div
                    style={{
                        background: preSignedData ? `${colors.success}20` : `${colors.main}20`,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: preSignedData ? colors.success : colors.main,
                        fontWeight: 600
                    }}>
                    {preSignedData ? 'READY' : 'BUILDING'}
                </div>
            </div>

            {/* Loading State */}
            {isLoading && !preSignedData && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '24px',
                        gap: '12px'
                    }}>
                    <LoadingOutlined style={{ fontSize: 32, color: colors.main }} spin />
                    <div style={{ fontSize: '12px', color: colors.text }}>Building transaction...</div>
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
                        <span>Safe - will not broadcast until approved</span>
                    </div>
                </div>
            )}

            {/* Transaction Flow */}
            {preSignedData && transactions.length > 0 && (
                <>
                    <MultiTxBowtieGraph
                        transactions={transactions}
                        width={width}
                        showTooltip={true}
                        compact={true}
                    />

                    {/* Fee Summary */}
                    <div
                        style={{
                            marginTop: '12px',
                            paddingTop: '10px',
                            borderTop: `1px solid ${colors.main}20`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '10px'
                        }}>
                        <div>
                            <span style={{ color: colors.textFaded }}>OPNet Gas: </span>
                            <span style={{ color: colors.epochMiner, fontWeight: 600 }}>
                                {(Number(totalFees.gas) / 1e8).toFixed(8).replace(/\.?0+$/, '')} BTC
                            </span>
                        </div>
                        <div>
                            <span style={{ color: colors.textFaded }}>Mining: </span>
                            <span style={{ color: colors.main, fontWeight: 600 }}>
                                {(Number(totalFees.mining) / 1e8).toFixed(8).replace(/\.?0+$/, '')} BTC
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* Fallback when no pre-signed data and not loading */}
            {!preSignedData && !isLoading && (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: colors.textFaded,
                        fontSize: '11px'
                    }}>
                    Transaction preview not available
                </div>
            )}
        </div>
    );
}

export default OPNetTransactionFlow;
