import React, { useCallback, useMemo, useState } from 'react';

import { useAccountAddress } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { satoshisToAmount, shortAddress } from '@/ui/utils';

import { TxBowtieTooltip, TooltipPosition } from './TxBowtieTooltip';

// Types for transaction inputs/outputs
export interface TxInput {
    txid?: string;
    vout?: number;
    address: string;
    value: number; // in satoshis
    isToSign?: boolean;
    isCoinbase?: boolean;
}

export interface TxOutput {
    address: string;
    value: number; // in satoshis
    isChange?: boolean;
    isFee?: boolean;
    isEpochMiner?: boolean; // OPNet epoch miner output (gas fee)
}

export interface TxBowtieGraphProps {
    inputs: TxInput[];
    outputs: TxOutput[];
    fee?: number;
    width?: number;
    height?: number;
    showTooltip?: boolean;
    showLabels?: boolean;
    compact?: boolean;
}

interface SvgLine {
    path: string;
    strokeWidth: number;
    className: string;
    zeroValue?: boolean;
}

interface LineParams {
    weight: number;
    thickness: number;
    offset: number;
    innerY: number;
    outerY: number;
}

// Color scheme matching the wallet theme
const colors = {
    input: {
        start: '#f37413', // orange
        end: '#ee771b'    // gold
    },
    output: {
        start: '#ee771b',
        end: '#f37413'
    },
    fee: {
        start: '#ee771b', // orange - transitions to blue
        end: '#3b82f6'    // blue - mining fee paid to miners
    },
    epochMiner: {
        start: '#ee771b', // orange - transitions to purple
        end: '#a855f7'    // purple - OPNet epoch miner
    },
    highlight: '#4ade80', // green for user's addresses
    hover: '#ffffff',
    middle: '#ee771b'
};

export function TxBowtieGraph({
    inputs,
    outputs,
    fee = 0,
    width = 320,
    height = 200,
    showTooltip = true,
    showLabels = true,
    compact = false
}: TxBowtieGraphProps) {
    const currentAddress = useAccountAddress();
    const btcUnit = useBTCUnit();

    const [hoverLine, setHoverLine] = useState<{
        type: 'input' | 'output' | 'fee' | 'epochminer';
        data: TxInput | TxOutput | { value: number };
        index: number;
    } | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ x: 0, y: 0 });

    // Configuration
    const midWidth = Math.min(6, Math.ceil(width / 100));
    const connectorWidth = 10;
    const txWidth = width - 20;
    const maxCombinedWeight = Math.min(60, Math.floor((txWidth - (2 * midWidth)) / 6));
    const minWeight = 2;
    const maxStrands = compact ? 4 : 6; // Max visible strands before consolidation
    const zeroValueWidth = 40;
    const zeroValueThickness = 12;

    // Calculate total value for scaling
    // Ensure all values are valid numbers (not NaN, Infinity, or negative)
    const safeValue = (v: number): number => {
        if (!Number.isFinite(v) || v < 0) return 0;
        return v;
    };

    // Consolidate inputs if too many - like mempool.space
    const consolidatedInputs = useMemo((): (TxInput & { isConsolidated?: boolean; consolidatedCount?: number })[] => {
        if (inputs.length <= maxStrands) {
            return inputs;
        }

        // Show first (maxStrands - 1) inputs, consolidate the rest
        const visible = inputs.slice(0, maxStrands - 1);
        const consolidated = inputs.slice(maxStrands - 1);
        const consolidatedValue = consolidated.reduce((sum, inp) => sum + safeValue(inp.value || 0), 0);

        return [
            ...visible,
            {
                address: `+${consolidated.length} more`,
                value: consolidatedValue,
                isConsolidated: true,
                consolidatedCount: consolidated.length
            }
        ];
    }, [inputs, maxStrands]);

    // Consolidate outputs if too many
    const consolidatedOutputs = useMemo((): (TxOutput & { isConsolidated?: boolean; consolidatedCount?: number })[] => {
        if (outputs.length <= maxStrands) {
            return outputs;
        }

        // Show first (maxStrands - 1) outputs, consolidate the rest
        const visible = outputs.slice(0, maxStrands - 1);
        const consolidated = outputs.slice(maxStrands - 1);
        const consolidatedValue = consolidated.reduce((sum, out) => sum + safeValue(out.value || 0), 0);

        return [
            ...visible,
            {
                address: `+${consolidated.length} more`,
                value: consolidatedValue,
                isConsolidated: true,
                consolidatedCount: consolidated.length
            }
        ];
    }, [outputs, maxStrands]);

    const totalInputValue = useMemo(() =>
        inputs.reduce((sum, inp) => sum + safeValue(inp.value || 0), 0),
        [inputs]
    );

    const totalOutputValue = useMemo(() =>
        outputs.reduce((sum, out) => sum + safeValue(out.value || 0), 0) + safeValue(fee),
        [outputs, fee]
    );

    // Use a reasonable minimum to avoid division issues
    const totalValue = Math.max(totalInputValue, totalOutputValue, 1);

    // Prepare output data with fee
    const outputsWithFee = useMemo(() => {
        const result: (TxOutput & { isFee?: boolean; isConsolidated?: boolean; consolidatedCount?: number })[] = [];
        if (fee > 0) {
            result.push({ address: 'Fee', value: fee, isFee: true });
        }
        result.push(...consolidatedOutputs);
        return result;
    }, [consolidatedOutputs, fee]);

    // Calculate line parameters
    const calculateLineParams = useCallback((
        items: { value: number }[],
        total: number
    ): LineParams[] => {
        // Ensure total is valid to prevent division by zero or infinity
        const safeTotal = Math.max(total, 1);

        const params: LineParams[] = items.map(item => {
            const itemValue = safeValue(item.value || 0);
            const weight = (maxCombinedWeight * itemValue) / safeTotal;
            // Clamp weight to reasonable bounds
            const clampedWeight = Math.min(Math.max(weight, 0), maxCombinedWeight);
            return {
                weight: clampedWeight,
                thickness: itemValue === 0
                    ? zeroValueThickness
                    : Math.min(maxCombinedWeight + 0.5, Math.max(minWeight - 1, clampedWeight) + 1),
                offset: 0,
                innerY: 0,
                outerY: 0
            };
        });

        const visibleStrands = Math.min(maxStrands, items.length);
        const visibleWeight = params.slice(0, visibleStrands).reduce((acc, v) => v.thickness + acc, 0);
        const gaps = Math.max(1, visibleStrands - 1);

        const innerTop = (height / 2) - (maxCombinedWeight / 2);
        const innerBottom = innerTop + maxCombinedWeight + 0.5;
        let lastOuter = 0;
        let lastInner = innerTop;
        const spacing = Math.max(4, (height - visibleWeight) / gaps);

        let offset = 0;
        let minOffset = 0;
        let maxOffset = 0;
        let lastWeight = 0;
        let pad = 0;

        params.forEach((line, i) => {
            if (items[i].value === 0) {
                line.outerY = lastOuter + (zeroValueThickness / 2);
                if (items.length === 1) {
                    line.outerY = height / 2;
                }
                lastOuter += zeroValueThickness + spacing;
                return;
            }

            line.outerY = lastOuter + (line.thickness / 2);
            line.innerY = Math.min(
                innerBottom - (line.thickness / 2),
                Math.max(innerTop + (line.thickness / 2), lastInner + (line.weight / 2))
            );

            if (items.length === 1) {
                line.outerY = height / 2;
            }

            lastOuter += line.thickness + spacing;
            lastInner += line.weight;

            // Calculate offset to prevent overlap
            const w = (txWidth - Math.max(lastWeight, line.weight) - (connectorWidth * 2)) / 2;
            const y1 = line.outerY;
            const y2 = line.innerY;
            const t = (lastWeight + line.weight) / 2;

            const dx = 0.75 * w;
            const dy = 1.5 * (y2 - y1);
            const a = Math.atan2(dy, dx);

            if (Math.sin(a) !== 0) {
                offset += Math.max(Math.min(t * (1 - Math.cos(a)) / Math.sin(a), t), -t);
            }

            line.offset = offset;
            minOffset = Math.min(minOffset, offset);
            maxOffset = Math.max(maxOffset, offset);
            pad = Math.max(pad, line.thickness / 2);
            lastWeight = line.weight;
        });

        // Normalize offsets
        params.forEach(line => {
            line.offset -= minOffset;
        });

        return params;
    }, [height, maxCombinedWeight, minWeight, maxStrands, txWidth, connectorWidth, zeroValueThickness]);

    // Generate SVG path for a line
    const makePath = useCallback((
        side: 'in' | 'out',
        outer: number,
        inner: number,
        weight: number,
        offset: number,
        pad: number
    ): string => {
        const start = (weight * 0.5) + connectorWidth;
        const curveStart = Math.max(start + 5, pad + connectorWidth - offset);
        const end = width / 2 - (midWidth * 0.9) + 1;
        const curveEnd = end - offset - 10;
        const midpoint = (curveStart + curveEnd) / 2;

        // Correct for SVG horizontal gradient bug
        if (Math.round(outer) === Math.round(inner)) {
            outer -= 1;
        }

        if (side === 'in') {
            return `M ${start} ${outer} L ${curveStart} ${outer} C ${midpoint} ${outer}, ${midpoint} ${inner}, ${curveEnd} ${inner} L ${end} ${inner}`;
        } else {
            return `M ${width - start} ${outer} L ${width - curveStart} ${outer} C ${width - midpoint} ${outer}, ${width - midpoint} ${inner}, ${width - curveEnd} ${inner} L ${width - end} ${inner}`;
        }
    }, [width, midWidth, connectorWidth]);

    // Generate zero value path (dashed line)
    const makeZeroValuePath = useCallback((side: 'in' | 'out', y: number): string => {
        const offset = zeroValueThickness / 2;
        const start = (connectorWidth / 2) + 10;
        if (side === 'in') {
            return `M ${start + offset} ${y} L ${start + zeroValueWidth + offset} ${y}`;
        } else {
            return `M ${width - start - offset} ${y} L ${width - start - zeroValueWidth - offset} ${y}`;
        }
    }, [width, connectorWidth, zeroValueThickness, zeroValueWidth]);

    // Generate lines for inputs and outputs
    const inputLines = useMemo((): SvgLine[] => {
        const params = calculateLineParams(consolidatedInputs, totalValue);
        return params.map((line, i) => {
            const input = consolidatedInputs[i];
            const isUserAddress = input.address === currentAddress;
            const isConsolidated = 'isConsolidated' in input && input.isConsolidated;
            if (input.value === 0) {
                return {
                    path: makeZeroValuePath('in', line.outerY),
                    strokeWidth: zeroValueThickness,
                    className: `input zerovalue ${isUserAddress ? 'highlight' : ''}`,
                    zeroValue: true
                };
            }
            return {
                path: makePath('in', line.outerY, line.innerY, line.thickness, line.offset, 0),
                strokeWidth: line.thickness,
                className: `input ${isUserAddress ? 'highlight' : ''} ${input.isToSign ? 'to-sign' : ''} ${isConsolidated ? 'consolidated' : ''}`
            };
        });
    }, [consolidatedInputs, totalValue, currentAddress, calculateLineParams, makePath, makeZeroValuePath, zeroValueThickness]);

    const outputLines = useMemo((): SvgLine[] => {
        const params = calculateLineParams(outputsWithFee, totalValue);
        return params.map((line, i) => {
            const output = outputsWithFee[i];
            const isUserAddress = output.address === currentAddress;
            const isFee = output.isFee;
            const isEpochMiner = 'isEpochMiner' in output && output.isEpochMiner;
            const isConsolidated = 'isConsolidated' in output && output.isConsolidated;

            if (output.value === 0) {
                return {
                    path: makeZeroValuePath('out', line.outerY),
                    strokeWidth: zeroValueThickness,
                    className: `output zerovalue ${isUserAddress ? 'highlight' : ''}`,
                    zeroValue: true
                };
            }
            return {
                path: makePath('out', line.outerY, line.innerY, line.thickness, line.offset, 0),
                strokeWidth: line.thickness,
                className: `output ${isFee ? 'fee' : ''} ${isEpochMiner ? 'epochminer' : ''} ${isUserAddress ? 'highlight' : ''} ${isConsolidated ? 'consolidated' : ''}`
            };
        });
    }, [outputsWithFee, totalValue, currentAddress, calculateLineParams, makePath, makeZeroValuePath, zeroValueThickness]);

    // Middle line path
    const middlePath = useMemo(() => {
        return `M ${(width / 2) - midWidth} ${(height / 2) + 0.25} L ${(width / 2) + midWidth} ${(height / 2) + 0.25}`;
    }, [width, height, midWidth]);

    // Has any value flowing through
    const hasLine = useMemo(() => {
        const hasInput = inputLines.some(l => !l.zeroValue);
        const hasOutput = outputLines.some(l => !l.zeroValue);
        return hasInput && hasOutput;
    }, [inputLines, outputLines]);

    // Event handlers
    const handlePointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        });
    }, []);

    const handleHover = useCallback((
        type: 'input' | 'output',
        index: number
    ) => {
        if (type === 'input') {
            setHoverLine({ type: 'input', data: consolidatedInputs[index], index });
        } else {
            const output = outputsWithFee[index];
            if (output.isFee) {
                setHoverLine({ type: 'fee', data: { value: fee }, index });
            } else if ('isEpochMiner' in output && output.isEpochMiner) {
                setHoverLine({ type: 'epochminer', data: output, index });
            } else {
                setHoverLine({ type: 'output', data: output, index });
            }
        }
    }, [consolidatedInputs, outputsWithFee, fee]);

    const handleBlur = useCallback(() => {
        setHoverLine(null);
    }, []);

    return (
        <div className="tx-bowtie-container" style={{ position: 'relative' }}>
            {/* Labels */}
            {showLabels && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.6)'
                }}>
                    <span>Inputs ({inputs.length})</span>
                    <span>Outputs ({outputs.length})</span>
                </div>
            )}

            <svg
                className="tx-bowtie-graph"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                onPointerMove={handlePointerMove}
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* Input gradient */}
                    <linearGradient id="input-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.input.start} />
                        <stop offset="100%" stopColor={colors.input.end} />
                    </linearGradient>

                    {/* Output gradient */}
                    <linearGradient id="output-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.output.start} />
                        <stop offset="100%" stopColor={colors.output.end} />
                    </linearGradient>

                    {/* Fee gradient - orange to blue for mining fee */}
                    <linearGradient id="fee-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.fee.start} />
                        <stop offset="100%" stopColor={colors.fee.end} />
                    </linearGradient>

                    {/* Epoch miner gradient - purple for OPNet gas fee */}
                    <linearGradient id="epochminer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.epochMiner.start} />
                        <stop offset="100%" stopColor={colors.epochMiner.end} />
                    </linearGradient>

                    {/* Hover gradients */}
                    <linearGradient id="input-hover-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.input.start} />
                        <stop offset="30%" stopColor={colors.hover} />
                        <stop offset="100%" stopColor={colors.input.end} />
                    </linearGradient>

                    <linearGradient id="output-hover-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.output.start} />
                        <stop offset="70%" stopColor={colors.hover} />
                        <stop offset="100%" stopColor={colors.output.end} />
                    </linearGradient>

                    <linearGradient id="epochminer-hover-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.epochMiner.start} />
                        <stop offset="70%" stopColor={colors.hover} />
                        <stop offset="100%" stopColor={colors.epochMiner.end} />
                    </linearGradient>

                    <linearGradient id="fee-hover-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.fee.start} />
                        <stop offset="70%" stopColor={colors.hover} />
                        <stop offset="100%" stopColor={colors.fee.end} />
                    </linearGradient>

                    {/* Highlight gradients for user's addresses */}
                    <linearGradient id="input-highlight-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.input.start} />
                        <stop offset="30%" stopColor={colors.highlight} />
                        <stop offset="100%" stopColor={colors.input.end} />
                    </linearGradient>

                    <linearGradient id="output-highlight-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.output.start} />
                        <stop offset="70%" stopColor={colors.highlight} />
                        <stop offset="100%" stopColor={colors.output.end} />
                    </linearGradient>
                </defs>

                {/* Middle line */}
                {hasLine && (
                    <path
                        d={middlePath}
                        fill="none"
                        stroke={colors.middle}
                        strokeWidth={maxCombinedWeight + 0.5}
                        strokeLinecap="round"
                    />
                )}

                {/* Input lines */}
                {inputLines.map((line, i) => (
                    <path
                        key={`input-${i}`}
                        d={line.path}
                        fill="none"
                        stroke={
                            hoverLine?.type === 'input' && hoverLine?.index === i
                                ? 'url(#input-hover-gradient)'
                                : line.className.includes('highlight')
                                    ? 'url(#input-highlight-gradient)'
                                    : 'url(#input-gradient)'
                        }
                        strokeWidth={line.strokeWidth}
                        strokeLinecap={line.zeroValue ? 'round' : 'butt'}
                        strokeDasharray={line.zeroValue ? '4 4' : undefined}
                        style={{ cursor: 'pointer' }}
                        onPointerEnter={() => handleHover('input', i)}
                        onPointerLeave={handleBlur}
                    />
                ))}

                {/* Output lines */}
                {outputLines.map((line, i) => {
                    // Determine stroke color based on line type
                    let strokeUrl = 'url(#output-gradient)';
                    const isHovering = hoverLine?.index === i;

                    if (isHovering && hoverLine?.type === 'epochminer') {
                        strokeUrl = 'url(#epochminer-hover-gradient)'; // Purple hover for epoch miner
                    } else if (isHovering && hoverLine?.type === 'fee') {
                        strokeUrl = 'url(#fee-hover-gradient)'; // Blue hover for mining fee
                    } else if (isHovering && hoverLine?.type === 'output') {
                        strokeUrl = 'url(#output-hover-gradient)';
                    } else if (line.className.includes('fee')) {
                        strokeUrl = 'url(#fee-gradient)'; // Orange to blue for mining fee
                    } else if (line.className.includes('epochminer')) {
                        strokeUrl = 'url(#epochminer-gradient)'; // Orange to purple for OPNet epoch miner
                    } else if (line.className.includes('highlight')) {
                        strokeUrl = 'url(#output-highlight-gradient)';
                    }

                    return (
                        <path
                            key={`output-${i}`}
                            d={line.path}
                            fill="none"
                            stroke={strokeUrl}
                            strokeWidth={line.strokeWidth}
                            strokeLinecap={line.zeroValue ? 'round' : 'butt'}
                            strokeDasharray={line.zeroValue ? '4 4' : undefined}
                            style={{ cursor: 'pointer' }}
                            onPointerEnter={() => handleHover('output', i)}
                            onPointerLeave={handleBlur}
                        />
                    );
                })}
            </svg>

            {/* Tooltip */}
            {showTooltip && hoverLine && (
                <TxBowtieTooltip
                    type={hoverLine.type}
                    data={hoverLine.data}
                    position={tooltipPosition}
                    btcUnit={btcUnit}
                    containerWidth={width}
                />
            )}

            {/* Summary below the graph */}
            {showLabels && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '11px'
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                        <span style={{ color: colors.input.start }}>
                            {satoshisToAmount(totalInputValue)} {btcUnit}
                        </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>
                        Fee: {satoshisToAmount(fee)} {btcUnit}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                        <span style={{ color: colors.output.end }}>
                            {satoshisToAmount(totalOutputValue - fee)} {btcUnit}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TxBowtieGraph;
