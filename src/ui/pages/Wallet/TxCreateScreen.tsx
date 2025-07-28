import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ChainType, COIN_DUST } from '@/shared/constant';
import { Action, Features, SendBitcoinParameters } from '@/shared/interfaces/RawTxParameters';
import Web3API from '@/shared/web3/Web3API';
import { Button, Column, Content, Header, Image, Input, Layout, Row, Text } from '@/ui/components';
import { BtcUsd } from '@/ui/components/BtcUsd';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit, useChain } from '@/ui/state/settings/hooks';
import { useUiTxCreateScreen, useUpdateUiTxCreateScreen } from '@/ui/state/ui/hooks';
import { amountToSatoshis, isValidAddress, satoshisToAmount, useWallet } from '@/ui/utils';
import { AddressTypes, AddressVerificator } from '@btc-vision/transaction';
import { BitcoinUtils } from 'opnet';

BigNumber.config({ EXPONENTIAL_AT: 256 });

export default function TxCreateScreen() {
    const navigate = useNavigate();
    const btcUnit = useBTCUnit();

    /* --------------------------------------------------------------------- */
    const setUiState = useUpdateUiTxCreateScreen();
    const uiState = useUiTxCreateScreen();
    const account = useCurrentAccount();
    const wallet = useWallet();
    const chain = useChain();

    const { toInfo, inputAmount, enableRBF, feeRate } = uiState;

    /* --------------------------------------------------------------------- */
    const [disabled, setDisabled] = useState(true);
    const [error, setError] = useState('');
    const [showP2PKWarning, setDisplayP2PKWarning] = useState(false);
    const [showP2OPWarning, setDisplayP2OPWarning] = useState(false);
    const [autoAdjust, setAutoAdjust] = useState(false);
    const [totalBalanceValue, setTotalBalanceValue] = useState('0');
    const [balanceValue, setBalanceValue] = useState('0');
    const [balanceValueInSatoshis, setBalanceValueInSatoshis] = useState(0n);

    /* --------------------------------------------------------------------- */
    useEffect(() => {
        void wallet.getChainType().then(Web3API.setNetwork.bind(Web3API));
    }, [wallet]);

    useEffect(() => {
        const fetchTotalBalanceValue = async () => {
            const addressBalance = await wallet.getAddressBalance(account.address);
            setTotalBalanceValue(addressBalance.amount);
        };
        void fetchTotalBalanceValue();
    }, [account.address, wallet]);

    useEffect(() => {
        const fetchBalanceValue = async () => {
            const addressBalance = await wallet.getAddressBalance(account.address);
            setBalanceValue(addressBalance.amount);
            setBalanceValueInSatoshis(BigInt(amountToSatoshis(addressBalance.amount)));
        };
        void fetchBalanceValue();
    }, [chain.enum, account.address, wallet]);

    /* --------------------------------------------------------------------- */
    const toSatoshis = useMemo(() => (inputAmount ? amountToSatoshis(inputAmount) : 0), [inputAmount]);
    const dustAmount = useMemo(() => satoshisToAmount(COIN_DUST), []);

    /* --------------------------------------------------------------------- */
    useEffect(() => {
        setError('');
        setDisabled(true);

        if (!isValidAddress(toInfo.address)) return;
        if (!toSatoshis) return;
        if (toSatoshis < COIN_DUST) {
            setError(`Amount must be at least ${dustAmount} ${btcUnit}`);
            return;
        }
        if (toSatoshis > balanceValueInSatoshis) {
            setError('Amount exceeds your available balance');
            return;
        }
        if (feeRate <= 0) return;

        setDisabled(false);
    }, [toInfo, inputAmount, feeRate, enableRBF, toSatoshis, balanceValueInSatoshis, dustAmount, btcUnit]);

    /* --------------------------------------------------------------------- */
    const handleNext = () => {
        const event: SendBitcoinParameters = {
            to: toInfo.address,
            inputAmount: parseFloat(inputAmount),
            feeRate,
            features: { [Features.rbf]: true, [Features.taproot]: true },
            priorityFee: 0n,
            header: `Send ${btcUnit}`,
            tokens: [],
            action: Action.SendBitcoin
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo: event });
    };

    const onSetAddress = useCallback(
        (val: { address: string; domain: string }) => {
            setDisplayP2PKWarning(false);
            setDisplayP2OPWarning(false);

            const address = val.address;
            const type = AddressVerificator.detectAddressType(address, Web3API.network);

            if (type === null) {
                setError(`Invalid recipient address.`);
                return;
            }

            if (type === AddressTypes.P2PK) {
                setDisplayP2PKWarning(true);
                return;
            }

            if (type === AddressTypes.P2OP) {
                setDisplayP2OPWarning(true);
                return;
            }

            setUiState({ toInfo: val });
        },
        [setUiState]
    );

    /* --------------------------------------------------------------------- */
    return (
        <Layout>
            <Header title={`Send ${btcUnit}`} onBack={() => window.history.go(-1)} />

            <Content style={{ padding: 0, display: 'flex', justifyContent: 'center' }}>
                <div
                    style={{
                        width: '100%',
                        maxWidth: 420,
                        padding: '12px 20px 96px', // reduced top padding
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                        backdropFilter: 'blur(6px)',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                    {/* chain icon fixed spacing */}
                    <Row justifyCenter style={{ marginTop: '14vh', marginBottom: 8 }}>
                        <Image src={chain.icon} size={60} style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))' }} />
                    </Row>

                    {/* Recipient */}
                    <Column mt="lg">
                        <Text text="Recipient" preset="regular" color="textDim" />
                        <Input
                            preset="address"
                            addressInputData={toInfo}
                            onAddressInputChange={(val) => onSetAddress(val)}
                            autoFocus
                        />

                        {showP2PKWarning && (
                            <Row
                                fullX
                                style={{
                                    background: 'rgba(255,165,0,0.12)',
                                    border: '1px solid #ffa640',
                                    borderRadius: 6,
                                    padding: 6,
                                    marginTop: 6
                                }}>
                                <Text
                                    text="⚠️ Wallets don't support P2PK addresses. Use only for tokens—don't send BTC here."
                                    size="xs"
                                    color="gold"
                                    textCenter
                                />
                            </Row>
                        )}

                        {showP2OPWarning && (
                            <Row
                                fullX
                                style={{
                                    background: 'rgba(255,165,0,0.12)',
                                    border: '1px solid #ffa640',
                                    borderRadius: 6,
                                    padding: 6,
                                    marginTop: 6
                                }}>
                                <Text
                                    text="⚠️ Sending BTC to P2OP addresses is not supported."
                                    size="xs"
                                    color="gold"
                                    textCenter
                                />
                            </Row>
                        )}
                    </Column>

                    {/* Amount */}
                    <Column mt="lg">
                        <Row justifyBetween itemsCenter>
                            <Text text="Amount" color="textDim" />
                            <BtcUsd sats={toSatoshis} />
                        </Row>

                        <Input
                            preset="amount"
                            placeholder="0.00"
                            value={inputAmount}
                            onAmountInputChange={(amount) => {
                                if (autoAdjust) setAutoAdjust(false);
                                setUiState({ inputAmount: amount });
                            }}
                            enableMax
                            onMaxClick={() => {
                                setAutoAdjust(true);
                                setUiState({ inputAmount: balanceValue });
                            }}
                        />

                        {/* balances */}
                        <Row justifyBetween style={{ marginTop: 6 }}>
                            <Text text="Available" color="gold" />
                            <Row gap={'sm'}>
                                <Text text={balanceValue} size="sm" color="gold" />
                                <Text text={btcUnit} size="sm" color="textDim" />
                            </Row>
                        </Row>
                        {chain.enum !== ChainType.BITCOIN_REGTEST && (
                            <Row justifyBetween>
                                <Text text="Total" color="textDim" />
                                <Row gap={'sm'}>
                                    <Text text={totalBalanceValue} size="sm" color="gold" />
                                    <Text text={btcUnit} size="sm" color="textDim" />
                                </Row>
                            </Row>
                        )}

                        {/* divider */}
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />

                        {error && <Text text={error} color="error" style={{ textAlign: 'center' }} />}

                        <Row justifyBetween>
                            <Text text="Total (est.)" color="textDim" />
                            <Row gap={'sm'}>
                                <Text text={BitcoinUtils.formatUnits(toSatoshis, 8)} size="sm" color="textDim" />
                                <Text text={`${btcUnit} + fee `} size="sm" color="textDim" />
                            </Row>
                        </Row>
                    </Column>

                    {/* Fees */}
                    <Column mt="lg">
                        <Text text="Miner fee" color="textDim" />
                        <FeeRateBar onChange={(val) => setUiState({ feeRate: val })} />
                    </Column>
                </div>
            </Content>

            {/* sticky next */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 16px 24px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))',
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
