import { Action, TransferParameters } from '@/shared/interfaces/RawTxParameters';
import { OPTokenInfo } from '@/shared/types';
import { Button, Column, Content, Header, Image, Input, Layout, Row, Text } from '@/ui/components';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { RBFBar } from '@/ui/components/RBFBar';
import { colors } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';
import { useLocationState } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { BitcoinUtils } from 'opnet';
import { useEffect, useState } from 'react';
import { RouteTypes, useNavigate } from '../MainRoute';

BigNumber.config({ EXPONENTIAL_AT: 256 });

export default function SendOpNetScreen() {
    const navigate = useNavigate();
    const { amount: balanceBigInt, address, divisibility, name, symbol, logo } = useLocationState<OPTokenInfo>();

    const [error, setError] = useState('');
    const [inputAmount, setInputAmount] = useState('');
    const [disabled, setDisabled] = useState(true);
    const [OpnetRateInputVal, adjustFeeRateInput] = useState('0');
    const [toInfo, setToInfo] = useState<{
        address: string;
        domain: string;
    }>({
        address: '',
        domain: ''
    });
    const [feeRate, setFeeRate] = useState(5);
    const [enableRBF, setEnableRBF] = useState(false);

    useEffect(() => {
        setError('');
        setDisabled(true);

        if (!toInfo.address) {
            setError('Invalid recipient');
            return;
        }

        if (!inputAmount.trim()) {
            setError('Please enter an amount');
            return;
        }

        const inputAmountToNumber = new BigNumber(BitcoinUtils.expandToDecimals(inputAmount, divisibility).toString());
        const availableBalance = new BigNumber(balanceBigInt.toString());

        if (inputAmountToNumber.isLessThanOrEqualTo(0)) {
            setError('Invalid amount');
            return;
        }

        if (inputAmountToNumber.isGreaterThan(availableBalance)) {
            setError('Insufficient balance');
            return;
        }

        setDisabled(false);
    }, [toInfo, inputAmount, feeRate, enableRBF, balanceBigInt, divisibility]);

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title={'Send ' + name}
            />
            <Content>
                <Row itemsCenter fullX justifyCenter>
                    {logo && <Image src={logo} size={fontSizes.tiny} />}
                    <Text
                        text={`${new BigNumber(BitcoinUtils.formatUnits(balanceBigInt, divisibility)).toFixed(
                            divisibility
                        )} ${symbol} `}
                        preset="bold"
                        textCenter
                        size="xxl"
                        wrap
                    />
                </Row>

                <Column mt="lg">
                    <Text text="Recipient" preset="regular" color="textDim" />
                    <Input
                        preset="address"
                        addressInputData={toInfo}
                        onAddressInputChange={(val) => {
                            setToInfo(val);
                        }}
                        autoFocus={true}
                    />
                </Column>

                <Column mt="lg">
                    <Row justifyBetween>
                        <Text text="Balance" color="textDim" />
                        <Row
                            itemsCenter
                            onClick={() => {
                                setInputAmount(BitcoinUtils.formatUnits(balanceBigInt, divisibility));
                            }}>
                            <Text text="MAX" preset="sub" style={{ color: colors.white_muted }} />
                            <Text
                                text={`${new BigNumber(BitcoinUtils.formatUnits(balanceBigInt, divisibility)).toFixed(8)} ${symbol} `}
                                preset="bold"
                                size="sm"
                                wrap
                            />
                        </Row>
                    </Row>
                    <Input
                        preset="amount"
                        placeholder={'Amount'}
                        value={inputAmount.toString()}
                        onAmountInputChange={(amount) => {
                            setInputAmount(amount);
                        }}
                        runesDecimal={divisibility}
                    />
                </Column>

                <Column mt="lg">
                    <Text text="Fee" color="textDim" />

                    <FeeRateBar
                        onChange={(val) => {
                            setFeeRate(val);
                        }}
                    />
                </Column>
                <Text text="Priority Fee" color="textDim" />
                <Input
                    preset="amount"
                    placeholder={'sat/vB'}
                    value={OpnetRateInputVal}
                    onAmountInputChange={(amount) => {
                        adjustFeeRateInput(amount);
                    }}
                    autoFocus={true}
                />
                <Column mt="lg">
                    <RBFBar
                        onChange={(val) => {
                            setEnableRBF(val);
                        }}
                    />
                </Column>

                {error && <Text text={error} color="error" />}

                <Button
                    disabled={disabled}
                    preset="primary"
                    text="Next"
                    onClick={() => {
                        const sendTransfer: TransferParameters = {
                            action: Action.Transfer,
                            contractAddress: address,
                            to: toInfo.address,
                            inputAmount: BigInt(BitcoinUtils.expandToDecimals(inputAmount, divisibility)),
                            feeRate: feeRate,
                            priorityFee: BigInt(OpnetRateInputVal),
                            tokens: [
                                {
                                    address,
                                    amount: balanceBigInt,
                                    divisibility,
                                    name,
                                    symbol,
                                    logo
                                } as OPTokenInfo
                            ],
                            header: `Send ${symbol}`,
                            features: {
                                rbf: enableRBF
                            }
                        };

                        navigate(RouteTypes.TxOpnetConfirmScreen, {
                            rawTxInfo: sendTransfer
                        });
                    }}></Button>
            </Content>
        </Layout>
    );
}
