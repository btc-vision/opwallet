import { BitcoinUtils, getContract, IOP20Contract, OP_20_ABI } from 'opnet';
import { useCallback, useEffect, useState } from 'react';

import { Action, Features, MintParameters } from '@/shared/interfaces/RawTxParameters';
import { OPTokenInfo } from '@/shared/types';
import Web3API, { bigIntToDecimal } from '@/shared/web3/Web3API';
import { Column, Content, Header, Input, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { PriorityFeeBar } from '@/ui/components/PriorityFeeBar';
import { useLocationState, useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    DollarOutlined,
    FileTextOutlined,
    InfoCircleOutlined,
    RocketOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import { RouteTypes, useNavigate } from '../MainRoute';

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

export default function Mint() {
    const prop = useLocationState<OPTokenInfo>();
    const navigate = useNavigate();
    const [inputAmount, setInputAmount] = useState('');
    const [disabled, setDisabled] = useState(true);
    const [priorityFee, adjustFeeRateInput] = useState(0);
    const [error, setError] = useState('');
    const tools = useTools();
    const [feeRate, setFeeRate] = useState(5);
    const wallet = useWallet();
    const [maxSupply, setMaxSupply] = useState<bigint>(0n);
    const [note, setNote] = useState<string>('');
    const [address, setAddress] = useState<Address | null>(null);
    const [isLoadingSupply, setIsLoadingSupply] = useState(true);

    const cb = useCallback(async () => {
        const [mldsaHashPubKey, legacyPubKey] = await wallet.getWalletAddress();
        const userAddress = Address.fromString(mldsaHashPubKey, legacyPubKey);
        setAddress(userAddress);
        setDisabled(false);
        setError('');
    }, [wallet]);

    useEffect(() => {
        setDisabled(true);
        if (!inputAmount) {
            setError('');
            return;
        }
        void cb();
    }, [inputAmount, cb]);

    useEffect(() => {
        const setWallet = async () => {
            setIsLoadingSupply(true);
            try {
                await Web3API.setNetwork(await wallet.getChainType());
                const contract: IOP20Contract = getContract<IOP20Contract>(
                    prop.address,
                    OP_20_ABI,
                    Web3API.provider,
                    Web3API.network
                );

                const maxSupply = await contract.maximumSupply();
                const totalSupply = await contract.totalSupply();
                setMaxSupply(maxSupply.properties.maximumSupply - totalSupply.properties.totalSupply);
            } catch (e) {
                setError(`Error fetching supply`);
                tools.toastError(`Error fetching supply: ${e}`);
            } finally {
                setIsLoadingSupply(false);
            }
        };

        void setWallet();
    }, [prop.address, tools, wallet]);

    const handleNext = () => {
        if (!address) return;

        const txInfo: MintParameters = {
            contractAddress: prop.address,
            to: address.toHex(),
            inputAmount: Number(inputAmount),
            header: 'Mint Token',
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true,
                [Features.cpfp]: true
            },
            tokens: [prop],
            feeRate: feeRate,
            priorityFee: BigInt(priorityFee),
            action: Action.Mint,
            note
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo: txInfo });
    };

    const formattedMaxSupply = BitcoinUtils.formatUnits(maxSupply.toString(), prop.divisibility);
    const formattedBalance = BitcoinUtils.formatUnits(prop.amount.toString(), prop.divisibility);

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title={`Mint ${prop.symbol}`} />

            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* Token Info Card */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                            border: `1px solid ${colors.main}30`,
                            borderRadius: '14px',
                            padding: '16px',
                            marginBottom: '16px',
                            textAlign: 'center'
                        }}>
                        {prop.logo ? (
                            <img
                                src={prop.logo}
                                alt={prop.symbol}
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '12px',
                                    marginBottom: '12px'
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '12px',
                                    background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.main}80 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 12px',
                                    fontSize: 24,
                                    fontWeight: 'bold',
                                    color: colors.background
                                }}>
                                {prop.symbol?.charAt(0) || '?'}
                            </div>
                        )}

                        <div
                            style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                color: colors.text,
                                marginBottom: '4px'
                            }}>
                            {prop.name}
                        </div>

                        <div
                            style={{
                                fontSize: '14px',
                                color: colors.main,
                                fontWeight: 500,
                                marginBottom: '12px'
                            }}>
                            {prop.symbol}
                        </div>

                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: colors.containerBgFaded,
                                borderRadius: '8px'
                            }}>
                            <span style={{ fontSize: '11px', color: colors.textFaded }}>Your Balance:</span>
                            <span
                                style={{
                                    fontSize: '12px',
                                    color: colors.success,
                                    fontWeight: 600
                                }}>
                                {formattedBalance} {prop.symbol}
                            </span>
                        </div>
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
                                    Mint Amount
                                </span>
                            </div>
                            {!isLoadingSupply && (
                                <button
                                    style={{
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
                                    onClick={() => setInputAmount(formattedMaxSupply)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}>
                                    MAX
                                </button>
                            )}
                        </div>

                        <Input
                            preset="amount"
                            placeholder="0.00"
                            value={inputAmount}
                            onAmountInputChange={(amount) => {
                                const numAmount = Number(amount);
                                const maxSupplyParsed = bigIntToDecimal(maxSupply, prop.divisibility);
                                if (numAmount <= Number(maxSupplyParsed)) {
                                    setInputAmount(amount);
                                } else {
                                    setInputAmount(formattedMaxSupply);
                                }
                            }}
                            decimalPlaces={prop.divisibility}
                            style={{
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px'
                            }}
                        />

                        {/* Available to Mint */}
                        <div
                            style={{
                                marginTop: '10px',
                                padding: '8px',
                                background: colors.inputBg,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <InfoCircleOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                <span style={{ fontSize: '11px', color: colors.textFaded }}>Available to Mint</span>
                            </div>
                            {isLoadingSupply ? (
                                <span style={{ fontSize: '11px', color: colors.textFaded }}>Loading...</span>
                            ) : (
                                <span
                                    style={{
                                        fontSize: '12px',
                                        color: colors.warning,
                                        fontWeight: 600
                                    }}>
                                    {formattedMaxSupply} {prop.symbol}
                                </span>
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
                                <span style={{ fontSize: '11px', color: colors.error }}>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Note Section */}
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

                        <Input
                            preset="text"
                            placeholder="Add a note for this mint"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={{
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px'
                            }}
                        />
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

                        <FeeRateBar onChange={(val) => setFeeRate(val)} />
                    </div>

                    {/* Priority Fee Section */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '80px'
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '10px'
                            }}>
                            <RocketOutlined style={{ fontSize: 14, color: colors.main }} />
                            <span
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                Priority Fee
                            </span>
                        </div>

                        <PriorityFeeBar onChange={(val) => adjustFeeRateInput(val)} />
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
                        background: disabled || !inputAmount ? colors.buttonBg : colors.main,
                        border: 'none',
                        borderRadius: '12px',
                        color: disabled || !inputAmount ? colors.textFaded : colors.background,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: disabled || !inputAmount ? 'not-allowed' : 'pointer',
                        opacity: disabled || !inputAmount ? 0.5 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                    disabled={disabled || !inputAmount}
                    onClick={handleNext}
                    onMouseEnter={(e) => {
                        if (!disabled && inputAmount) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}>
                    {!inputAmount ? (
                        <span>Enter Amount to Continue</span>
                    ) : (
                        <>
                            <span>Review Mint Transaction</span>
                            <CheckCircleFilled style={{ fontSize: 14 }} />
                        </>
                    )}
                </button>
            </div>
        </Layout>
    );
}
