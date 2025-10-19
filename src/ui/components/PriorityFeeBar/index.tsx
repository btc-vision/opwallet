import { Column, Input, Row, Text } from '@/ui/components';
import { useCallback, useEffect, useState } from 'react';

enum FeeRateType {
    NONE = 0,
    LOW = 1,
    HIGH = 2,
    CUSTOM = 3
}

interface Option {
    title: string;
    feeRate: number;
}

export function PriorityFeeBar({
    readonly = false,
    onChange
}: {
    readonly?: boolean;
    onChange?: (val: number) => void;
}) {
    const [feeOptions] = useState<Option[]>([
        { title: 'None', feeRate: 0 },
        { title: 'Low', feeRate: 1_000 },
        { title: 'High', feeRate: 5_000 },
        { title: 'Custom', feeRate: 0 }
    ]);

    const [optionIdx, setOptionIdx] = useState<FeeRateType>(FeeRateType.NONE);
    const [customVal, setCustomVal] = useState('');

    useEffect(() => {
        const chosen = feeOptions[optionIdx].feeRate;
        const val = optionIdx === FeeRateType.CUSTOM ? Math.max(Number(customVal) || 0, 0) : chosen < 1 ? 1 : chosen;

        onChange?.(val);
    }, [optionIdx, customVal, feeOptions, onChange]);

    const pick = useCallback(
        (idx: number) => {
            if (!readonly) setOptionIdx(idx as FeeRateType);
        },
        [readonly]
    );

    return (
        <Column gap="sm">
            <Row classname="op_fee_rates" gap="sm">
                {feeOptions.map((opt, _idx) => {
                    const idx = _idx as FeeRateType;
                    const selected = idx === optionIdx && !readonly;
                    const isPreset = idx !== FeeRateType.CUSTOM;

                    return (
                        <Column
                            key={opt.title}
                            gap={'xs'}
                            itemsCenter
                            classname={`op_fee_rate ${selected ? 'op_fee_selected' : ''}`}
                            style={{
                                cursor: readonly ? 'default' : 'pointer',
                                padding: '6px 10px',
                                borderRadius: 6,
                                minWidth: 70
                            }}
                            onClick={() => pick(idx)}>
                            <Text text={opt.title} size="xs" />

                            {isPreset ? (
                                <>
                                    <Text text={opt.feeRate.toString()} size="sm" />
                                    <Text text="sat" size="xs" color="textDim" />
                                </>
                            ) : (
                                <Text text="…" size="sm" color="textDim" />
                            )}
                        </Column>
                    );
                })}
            </Row>

            {optionIdx === FeeRateType.CUSTOM && (
                <Input
                    preset="amount"
                    placeholder="sat"
                    value={customVal}
                    onAmountInputChange={(val) => {
                        const sanitized = val.replace(/[^\d]/g, '');
                        setCustomVal(sanitized);
                    }}
                    autoFocus
                />
            )}
        </Column>
    );
}
