import React from 'react';

import { DecodedPsbt } from '@/shared/types';

import { TxBowtieGraph } from './index';
import { TxInput, TxOutput } from './types';

interface TxFlowPreviewProps {
    decodedPsbt: DecodedPsbt;
    width?: number;
    height?: number;
    showTooltip?: boolean;
    showLabels?: boolean;
    compact?: boolean;
    toSignInputs?: { index: number }[];
    currentAddress?: string;
}

/**
 * TxFlowPreview - A wrapper component that takes DecodedPsbt data
 * and renders the transaction flow visualization.
 */
export function TxFlowPreview({
    decodedPsbt,
    width = 320,
    height = 200,
    showTooltip = true,
    showLabels = true,
    compact = false,
    toSignInputs = [],
    currentAddress
}: TxFlowPreviewProps) {
    // Convert DecodedPsbt inputs to TxInput format
    const inputs: TxInput[] = decodedPsbt.inputs.map((input, index) => ({
        txid: input.txid,
        vout: input.vout,
        address: input.address,
        value: input.value,
        isToSign: toSignInputs.some(ts => ts.index === index)
    }));

    // Convert DecodedPsbt outputs to TxOutput format
    const outputs: TxOutput[] = decodedPsbt.outputs.map(output => ({
        address: output.address,
        value: output.value,
        isChange: currentAddress ? output.address === currentAddress : false
    }));

    return (
        <TxBowtieGraph
            inputs={inputs}
            outputs={outputs}
            fee={decodedPsbt.fee}
            width={width}
            height={height}
            showTooltip={showTooltip}
            showLabels={showLabels}
            compact={compact}
        />
    );
}

export default TxFlowPreview;
