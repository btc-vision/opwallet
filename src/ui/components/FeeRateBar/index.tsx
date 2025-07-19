import { useCallback, useEffect, useState } from 'react';

import Web3API from '@/shared/web3/Web3API';
import { Column } from '../Column';
import { Input } from '../Input';

enum FeeRateType {
    SLOW,
    AVG,
    FAST,
    CUSTOM
}

type BitcoinFees = {
    readonly conservative: number;
    readonly recommended: {
        readonly low: number;
        readonly medium: number;
        readonly high: number;
    };
};

export function FeeRateBar({ readonly, onChange }: { readonly?: boolean; onChange?: (val: number) => void }) {
    const [feeOptions, setFeeOptions] = useState<{ title: string; desc?: string; feeRate: number }[]>([]);

    const getData = useCallback(async () => {
        const gasParameters = await Web3API.provider.gasParameters();
        if (!gasParameters) {
            setFeeOptions([
                { title: 'Slow', desc: 'Slow', feeRate: 2 },
                { title: 'Medium', desc: 'Medium', feeRate: 5 },
                { title: 'Fast', desc: 'Fast', feeRate: 10 },
                { title: 'Custom', feeRate: 0 }
            ]);
            return;
        }

        const bitcoin = gasParameters.bitcoin as BitcoinFees;
        if (!bitcoin || !bitcoin.recommended) {
            setFeeOptions([
                { title: 'Slow', desc: 'Slow', feeRate: 2 },
                { title: 'Medium', desc: 'Medium', feeRate: 5 },
                { title: 'Fast', desc: 'Fast', feeRate: 10 },
                { title: 'Custom', feeRate: 0 }
            ]);
            return;
        }

        setFeeOptions([
            { title: 'Slow', desc: 'Slow', feeRate: bitcoin.recommended.low },
            { title: 'Medium', desc: 'Medium', feeRate: bitcoin.recommended.medium },
            { title: 'Fast', desc: 'Fast', feeRate: bitcoin.recommended.high },
            { title: 'Custom', feeRate: 0 }
        ]);
    }, []);

    useEffect(() => {
        void getData();
    }, [getData]);

    const [feeOptionIndex, setFeeOptionIndex] = useState(FeeRateType.AVG);
    const [feeRateInputVal, setFeeRateInputVal] = useState('');

    useEffect(() => {
        const defaultOption = feeOptions[1];
        let val = defaultOption ? defaultOption.feeRate : 5;
        if (feeOptionIndex === FeeRateType.CUSTOM) {
            val = parseFloat(feeRateInputVal) || 0;
        } else if (feeOptions.length > 0) {
            val = feeOptions[feeOptionIndex].feeRate;

            if (val < 5) {
                val = 5;
            }
        }

        onChange?.(val);
    }, [feeOptions, feeOptionIndex, feeRateInputVal, onChange]);

    const adjustFeeRateInput = (inputVal: string) => {
        const val = parseFloat(inputVal);
        if (!val) {
            setFeeRateInputVal('');
            return;
        }
        const defaultOption = feeOptions[1];
        const defaultVal = defaultOption ? defaultOption.feeRate : 1;
        if (val <= 0) {
            setFeeRateInputVal(defaultVal.toString());
        }
        setFeeRateInputVal(inputVal);
    };

    return (
        <Column>
            <div className="op_fee_rates">
                {feeOptions.map((v, index) => {
                    let selected = index === (feeOptionIndex as number);
                    if (readonly) {
                        selected = false;
                    }

                    return (
                        <div
                            key={v.title}
                            className={`op_fee_rate ${selected ? 'op_fee_selected' : ''}`}
                            onClick={() => {
                                if (readonly) {
                                    return;
                                }
                                setFeeOptionIndex(index);
                            }}>
                            {v.title !== 'Custom' ? (
                                <>
                                    <div className="op_fee_rate_title">{v.title}</div>
                                    <div className="op_fee_rate_rate">
                                        {v.title !== 'Custom' && (
                                            <>
                                                <div className="op_fee_rate_amount">{v.feeRate}</div>
                                                <div className="op_fee_rate_units">sat/vB</div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="op_fee_rate_amount">{v.title}</div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
            {feeOptionIndex === FeeRateType.CUSTOM && (
                <Input
                    preset="amount"
                    placeholder={'sat/vB'}
                    runesDecimal={1}
                    value={feeRateInputVal}
                    onAmountInputChange={(amount) => {
                        adjustFeeRateInput(amount);
                    }}
                    autoFocus={true}
                />
            )}
        </Column>
    );
}
