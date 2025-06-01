import { useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';
import { Button, Column, Content, Header, Image, Input, Layout, Row, Text } from '@/ui/components';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { PriorityFeeBar } from '@/ui/components/PriorityFeeBar';
import { fontSizes } from '@/ui/theme/font';
import { useLocationState } from '@/ui/utils';
import { BitcoinUtils } from 'opnet';
import { RouteTypes, useNavigate } from '../MainRoute';
import { Action, Features, TransferParameters } from '@/shared/interfaces/RawTxParameters';
import { OPTokenInfo } from '@/shared/types';
import { formatBalance } from '@/ui/pages/OpNet/BigintToString';

BigNumber.config({ EXPONENTIAL_AT: 256 });

export default function SendOpNetScreen() {
    const navigate = useNavigate();
    const { amount: balance, address, divisibility, name, symbol, logo } = useLocationState<OPTokenInfo>();

    const [toInfo, setToInfo] = useState({ address: '', domain: '' });
    const [inputAmount, setInputAmount] = useState('');
    const [feeRate, setFeeRate] = useState(5);
    const [priorityFee, setPriorityFee] = useState(0);
    const [error, setError] = useState('');
    const [disabled, setDisabled] = useState(true);

    const balanceFormatted = new BigNumber(BitcoinUtils.formatUnits(balance, divisibility));

    useEffect(() => {
        setError('');
        setDisabled(true);

        if (!toInfo.address) {
            setError('Invalid recipient');
            return;
        }
        if (!inputAmount.trim()) {
            setError('Enter an amount');
            return;
        }

        const amountBN = new BigNumber(BitcoinUtils.expandToDecimals(inputAmount, divisibility).toString());
        const availableBalance = new BigNumber(balance.toString());

        if (amountBN.isLessThanOrEqualTo(0)) {
            setError('Invalid amount');
            return;
        }

        if (amountBN.isGreaterThan(availableBalance)) {
            setError('Insufficient balance');
            return;
        }

        setDisabled(false);
    }, [toInfo, inputAmount, balance, divisibility]);

    const handleNext = () => {
        const params: TransferParameters = {
            action: Action.Transfer,
            contractAddress: address,
            to: toInfo.address,
            inputAmount: BigInt(BitcoinUtils.expandToDecimals(inputAmount, divisibility)),
            feeRate,
            priorityFee: BigInt(priorityFee),
            tokens: [
                {
                    address,
                    amount: balance,
                    divisibility,
                    name,
                    symbol,
                    logo
                }
            ],
            header: `Send ${symbol}`,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true,
                [Features.cpfp]: true
            }
        };
        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo: params });
    };

    return (
        <Layout>
            <Header title={`Send ${name}`} onBack={() => window.history.go(-1)} />

            <Content style={{ padding: 0, display: 'flex', justifyContent: 'center' }}>
                <div
                    style={{
                        width: '100%',
                        maxWidth: 420,
                        padding: '20px 20px 100px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                        backdropFilter: 'blur(6px)',
                        background: 'rgba(255,255,255,0.025)'
                    }}>
                    {/* balance banner */}
                    <Row justifyCenter itemsCenter gap={'sm'} style={{ marginTop: '14vh' }}>
                        {logo && <Image src={logo} size={fontSizes.tiny} />}
                        <Text
                            text={`${formatBalance(balanceFormatted, 4)} ${symbol}`}
                            preset="bold"
                            size="xl"
                            color="gold"
                        />
                    </Row>

                    {/* recipient */}
                    <Column mt="lg">
                        <Text text="Recipient" color="textDim" />
                        <Input preset="address" addressInputData={toInfo} onAddressInputChange={setToInfo} autoFocus />
                    </Column>

                    {/* amount */}
                    <Column mt="lg">
                        <Row justifyBetween>
                            <Text text="Balance" color="textDim" />
                            <Row
                                itemsCenter
                                style={{ cursor: 'pointer' }}
                                onClick={() => setInputAmount(BitcoinUtils.formatUnits(balance, divisibility))}>
                                <Text text="MAX" size="xs" color="textDim" style={{ marginRight: 4 }} />
                                <Text text={`${formatBalance(balanceFormatted, 4)} ${symbol}`} size="sm" color="gold" />
                            </Row>
                        </Row>
                        <Input
                            preset="amount"
                            placeholder="0.00"
                            value={inputAmount}
                            onAmountInputChange={setInputAmount}
                            runesDecimal={divisibility}
                        />
                    </Column>

                    {/* fees */}
                    <Column mt="lg">
                        <Text text="Miner fee" color="textDim" />
                        <FeeRateBar onChange={setFeeRate} />
                    </Column>

                    <Column mt="lg">
                        <Text text="Priority fee" color="textDim" />
                        <PriorityFeeBar onChange={setPriorityFee} />
                    </Column>

                    {error && <Text text={error} color="error" style={{ marginTop: 12, textAlign: 'center' }} />}
                </div>
            </Content>

            {/* sticky button */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 16px 24px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                <Button
                    preset="primary"
                    text="Next"
                    disabled={disabled}
                    style={{ width: '100%', maxWidth: 420 }}
                    onClick={handleNext}
                />
            </div>
        </Layout>
    );
}
