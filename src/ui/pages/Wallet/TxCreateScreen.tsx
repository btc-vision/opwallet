import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ChainType, COIN_DUST } from '@/shared/constant';
import { Action, Features, SendBitcoinParameters } from '@/shared/interfaces/RawTxParameters';
import Web3API from '@/shared/web3/Web3API';
import { Column, Content, Header, Image, Input, Layout } from '@/ui/components';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit, useChain } from '@/ui/state/settings/hooks';
import { useUiTxCreateScreen, useUpdateUiTxCreateScreen } from '@/ui/state/ui/hooks';
import { amountToSatoshis, isValidAddress, satoshisToAmount, useWallet } from '@/ui/utils';
import {
    DollarOutlined,
    FileTextOutlined,
    InfoCircleOutlined,
    SendOutlined,
    ThunderboltOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { Address, AddressTypes, AddressVerificator } from '@btc-vision/transaction';
import { BitcoinUtils } from 'opnet';

BigNumber.config({ EXPONENTIAL_AT: 256 });

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

export default function TxCreateScreen() {
    const navigate = useNavigate();
    const btcUnit = useBTCUnit();
    const setUiState = useUpdateUiTxCreateScreen();
    const uiState = useUiTxCreateScreen();
    const account = useCurrentAccount();
    const wallet = useWallet();
    const chain = useChain();

    const { toInfo, inputAmount, enableRBF, feeRate } = uiState;

    const [disabled, setDisabled] = useState(true);
    const [error, setError] = useState('');
    const [showP2PKWarning, setDisplayP2PKWarning] = useState(false);
    const [showP2OPWarning, setDisplayP2OPWarning] = useState(false);
    const [autoAdjust, setAutoAdjust] = useState(false);
    const [totalBalanceValue, setTotalBalanceValue] = useState('0');
    const [balanceValue, setBalanceValue] = useState('0');
    const [balanceValueInSatoshis, setBalanceValueInSatoshis] = useState(0n);
    const [note, setNote] = useState<string>('');

    useEffect(() => {
        void (async () => {
            const chain = await wallet.getChainType();
            await Web3API.setNetwork(chain);
        })();
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

    const toSatoshis = useMemo(() => (inputAmount ? amountToSatoshis(inputAmount) : 0), [inputAmount]);
    const dustAmount = useMemo(() => satoshisToAmount(COIN_DUST), []);

    useEffect(() => {
        setError('');
        setDisabled(true);

        if (!isValidAddress(toInfo.address)) return;
        if (!toSatoshis) return;
        if (toSatoshis < COIN_DUST) {
            setError(`Minimum amount: ${dustAmount} ${btcUnit}`);
            return;
        }
        if (toSatoshis > balanceValueInSatoshis) {
            setError('Insufficient balance');
            return;
        }
        if (feeRate <= 0) return;

        setDisabled(false);
    }, [toInfo, inputAmount, feeRate, enableRBF, toSatoshis, balanceValueInSatoshis, dustAmount, btcUnit]);

    const handleNext = () => {
        const event: SendBitcoinParameters = {
            to: toInfo.address,
            inputAmount: parseFloat(inputAmount),
            feeRate,
            features: { [Features.rbf]: true, [Features.taproot]: true },
            priorityFee: 0n,
            header: `Send ${btcUnit}`,
            tokens: [],
            action: Action.SendBitcoin,
            note
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
                setError(`Invalid recipient address`);
                return;
            }

            if (type === AddressTypes.P2PK) {
                setDisplayP2PKWarning(true);
                setUiState({ toInfo: { ...val, address: Address.fromString(address).p2tr(Web3API.network) } });
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

    return (
        <Layout>
            <Header title={`Send ${btcUnit}`} onBack={() => window.history.go(-1)} />

            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* Network Badge */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '16px'
                        }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: colors.containerBgFaded,
                                borderRadius: '20px',
                                border: `1px solid ${colors.containerBorder}`
                            }}>
                            <Image src={chain.icon} size={16} />
                            <span
                                style={{
                                    fontSize: '12px',
                                    color: colors.text,
                                    fontWeight: 500
                                }}>
                                {chain.label}
                            </span>
                        </div>
                    </div>

                    {/* Recipient Section */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '12px'
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '10px'
                            }}>
                            <WalletOutlined style={{ fontSize: 14, color: colors.main }} />
                            <span
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                Recipient
                            </span>
                        </div>

                        <Input
                            preset="address"
                            addressInputData={toInfo}
                            onAddressInputChange={(val) => onSetAddress(val)}
                            placeholder="Enter address"
                            autoFocus
                            style={{
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px'
                            }}
                        />

                        {showP2PKWarning && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '8px',
                                    background: `${colors.warning}15`,
                                    border: `1px solid ${colors.warning}30`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '6px'
                                }}>
                                <InfoCircleOutlined
                                    style={{
                                        fontSize: 12,
                                        color: colors.warning,
                                        flexShrink: 0,
                                        marginTop: '2px'
                                    }}
                                />
                                <div>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.warning,
                                            lineHeight: '1.4',
                                            fontWeight: 600
                                        }}>
                                        P2PK Address Detected
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.warning,
                                            lineHeight: '1.4',
                                            display: 'block',
                                            marginTop: '4px',
                                            opacity: 0.9
                                        }}>
                                        Funds will be sent to the associated Taproot address. Only proceed if you
                                        understand this conversion.
                                    </span>
                                </div>
                            </div>
                        )}

                        {showP2OPWarning && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '8px',
                                    background: `${colors.error}15`,
                                    border: `1px solid ${colors.error}30`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '6px'
                                }}>
                                <InfoCircleOutlined
                                    style={{
                                        fontSize: 12,
                                        color: colors.error,
                                        flexShrink: 0
                                    }}
                                />
                                <div>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.error,
                                            lineHeight: '1.4',
                                            fontWeight: 600
                                        }}>
                                        Contract Address Detected
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.error,
                                            lineHeight: '1.4',
                                            display: 'block',
                                            marginTop: '4px',
                                            opacity: 0.9
                                        }}>
                                        P2OP addresses are contract addresses and cannot receive direct BTC transfers.
                                        Please use an alternative address.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Amount Section */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '12px'
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '10px'
                            }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                <DollarOutlined style={{ fontSize: 14, color: colors.main }} />
                                <span
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: colors.textFaded,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    Amount
                                </span>
                            </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Input
                                preset="amount"
                                placeholder="0.00"
                                value={inputAmount}
                                onAmountInputChange={(amount) => {
                                    if (autoAdjust) setAutoAdjust(false);
                                    setUiState({ inputAmount: amount });
                                }}
                                style={{
                                    background: colors.inputBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '8px',
                                    paddingRight: '60px'
                                }}
                            />
                            <button
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    padding: '4px 8px',
                                    background: colors.main,
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: colors.background,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onClick={() => {
                                    setAutoAdjust(true);
                                    setUiState({ inputAmount: balanceValue });
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                }}>
                                MAX
                            </button>
                        </div>

                        {/* Balance Info */}
                        <div
                            style={{
                                marginTop: '10px',
                                padding: '8px',
                                background: colors.inputBg,
                                borderRadius: '8px'
                            }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '4px'
                                }}>
                                <span style={{ fontSize: '11px', color: colors.textFaded }}>Available</span>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: colors.success,
                                        fontWeight: 600
                                    }}>
                                    {balanceValue} {btcUnit}
                                </span>
                            </div>
                            {chain.enum !== ChainType.BITCOIN_REGTEST && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}>
                                    <span style={{ fontSize: '11px', color: colors.textFaded }}>Total Balance</span>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.textFaded
                                        }}>
                                        {totalBalanceValue} {btcUnit}
                                    </span>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '6px',
                                    background: `${colors.error}15`,
                                    borderRadius: '6px',
                                    textAlign: 'center'
                                }}>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: colors.error
                                    }}>
                                    {error}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Fee Section */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '12px'
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '10px'
                            }}>
                            <ThunderboltOutlined style={{ fontSize: 14, color: colors.main }} />
                            <span
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                Network Fee
                            </span>
                        </div>

                        <FeeRateBar onChange={(val) => setUiState({ feeRate: val })} />
                    </div>

                    {/* Note Section (Optional) */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '12px'
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '10px'
                            }}>
                            <FileTextOutlined style={{ fontSize: 14, color: colors.main }} />
                            <span
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                Note (Optional)
                            </span>
                        </div>

                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note for this transaction"
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px',
                                color: colors.text,
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'border-color 0.15s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = colors.main;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = colors.containerBorder;
                            }}
                        />
                    </div>

                    {/* Summary */}
                    <div
                        style={{
                            padding: '12px',
                            background: `linear-gradient(135deg, ${colors.main}10 0%, ${colors.main}05 100%)`,
                            border: `1px solid ${colors.main}20`,
                            borderRadius: '10px',
                            marginBottom: '80px'
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                            <span
                                style={{
                                    fontSize: '12px',
                                    color: colors.textFaded
                                }}>
                                Total Amount (est.)
                            </span>
                            <div style={{ textAlign: 'right' }}>
                                <div
                                    style={{
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: colors.text
                                    }}>
                                    {BitcoinUtils.formatUnits(toSatoshis, 8)} {btcUnit}
                                </div>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        color: colors.textFaded
                                    }}>
                                    + network fee
                                </div>
                            </div>
                        </div>
                    </div>
                </Column>
            </Content>

            {/* Fixed Bottom Button */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px',
                    background: `linear-gradient(to top, ${colors.background} 0%, ${colors.background}00 100%)`,
                    backdropFilter: 'blur(10px)'
                }}>
                <button
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: disabled ? colors.buttonBg : colors.main,
                        border: 'none',
                        borderRadius: '12px',
                        color: disabled ? colors.textFaded : colors.background,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                    disabled={disabled}
                    onClick={handleNext}
                    onMouseEnter={(e) => {
                        if (!disabled) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}>
                    <span>Review Transaction</span>
                    <SendOutlined style={{ fontSize: 14 }} />
                </button>
            </div>
        </Layout>
    );
}
