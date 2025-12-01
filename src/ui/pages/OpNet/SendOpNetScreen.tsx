import { Action, Features, TransferParameters } from '@/shared/interfaces/RawTxParameters';
import { OPTokenInfo } from '@/shared/types';
import Web3API from '@/shared/web3/Web3API';
import { Content, Header, Input, Layout, Text } from '@/ui/components';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { PriorityFeeBar } from '@/ui/components/PriorityFeeBar';
import { formatBalance } from '@/ui/pages/OpNet/BigintToString';
import { useLocationState } from '@/ui/utils';
import {
    DollarOutlined,
    EditOutlined,
    SafetyOutlined,
    SendOutlined,
    ThunderboltOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { AddressTypes, AddressVerificator } from '@btc-vision/transaction';
import BigNumber from 'bignumber.js';
import { BitcoinUtils } from 'opnet';
import { useCallback, useEffect, useState } from 'react';
import { RouteTypes, useNavigate } from '../MainRoute';

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

export default function SendOpNetScreen() {
    const navigate = useNavigate();
    const { amount: balance, address, divisibility, name, symbol, logo } = useLocationState<OPTokenInfo>();

    const [toInfo, setToInfo] = useState({ address: '', domain: '' });
    const [inputAmount, setInputAmount] = useState('');
    const [feeRate, setFeeRate] = useState(5);
    const [priorityFee, setPriorityFee] = useState(0);
    const [error, setError] = useState('');
    const [disabled, setDisabled] = useState(true);
    const [note, setNote] = useState<string>('');
    const [publicKey, setPublicKey] = useState<string>('');
    const [fetchingPubKey, setFetchingPubKey] = useState(false);

    const balanceFormatted = new BigNumber(BitcoinUtils.formatUnits(balance, divisibility));

    const handleAddressChange = useCallback((newInfo: { address: string; domain: string }) => {
        setToInfo((prev) => {
            if (prev.address === newInfo.address && prev.domain === newInfo.domain) {
                return prev;
            }
            return newInfo;
        });
    }, []);

    // Fetch public key when address changes
    useEffect(() => {
        const fetchPublicKey = async () => {
            if (!toInfo.address) {
                setPublicKey('');
                return;
            }

            setFetchingPubKey(true);
            try {
                const pubKeyStr: string = toInfo.address.replace('0x', '');
                // Check if the input is already a public key
                if (
                    (pubKeyStr.length === 64 || pubKeyStr.length === 66 || pubKeyStr.length === 130) &&
                    pubKeyStr.match(/^[0-9a-fA-F]+$/) !== null
                ) {
                    setPublicKey(pubKeyStr);
                } else {
                    // Fetch public key from the address
                    const pubKey = await Web3API.provider.getPublicKeyInfo(toInfo.address, false);
                    if (pubKey) {
                        const pubKeyHex = pubKey.toHex ? pubKey.toHex() : pubKey.toString();
                        // Check for zero address (user not found on-chain)
                        if (pubKeyHex === '0x' + '00'.repeat(32) || pubKeyHex === '00'.repeat(32)) {
                            setPublicKey('');
                            setError(
                                'User not found on-chain. This wallet has not performed any OPNet transactions yet.'
                            );
                        } else {
                            setPublicKey(pubKeyHex);
                        }
                    } else {
                        setPublicKey('');
                    }
                }
            } catch (err) {
                console.error('Error fetching public key:', err);
                setPublicKey('');
            } finally {
                setFetchingPubKey(false);
            }
        };

        void fetchPublicKey();
    }, [toInfo.address]);

    useEffect(() => {
        setError('');
        setDisabled(true);

        if (!toInfo.address) {
            return;
        }

        // Check if address is a p2op (contract) address
        const isP2OP = AddressVerificator.detectAddressType(toInfo.address, Web3API.network) === AddressTypes.P2OP;
        if (isP2OP) {
            setError('Cannot send to contract addresses (p2op)');
            return;
        }

        // Check for 32-byte values (likely MLDSA public key hash, not valid address)
        const cleanAddress = toInfo.address.replace('0x', '');
        if (cleanAddress.length === 64 && /^[0-9a-fA-F]+$/.test(cleanAddress)) {
            setError(
                "32-byte values are not valid Bitcoin addresses. This may be an MLDSA public key hash - please use the recipient's Bitcoin address instead."
            );
            return;
        }

        if (!inputAmount.trim()) {
            return;
        }

        // Check if public key is being fetched
        if (fetchingPubKey) {
            return;
        }

        // Check if public key is found
        if (!publicKey) {
            setError('Cannot send: Public key not found for this address');
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
    }, [toInfo, inputAmount, balance, divisibility, publicKey, fetchingPubKey]);

    const handleNext = () => {
        const params: TransferParameters = {
            action: Action.Transfer,
            contractAddress: address,
            to: toInfo.address,
            inputAmount: BitcoinUtils.expandToDecimals(inputAmount, divisibility),
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
            },
            note
        };
        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo: params });
    };

    return (
        <Layout>
            <Header title={`Send ${symbol}`} onBack={() => window.history.go(-1)} />

            <Content
                style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                {/* Token Balance Card */}
                <div
                    style={{
                        background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                        border: `1px solid ${colors.main}30`,
                        borderRadius: '14px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            marginBottom: '8px'
                        }}>
                        {logo ? (
                            <img
                                src={logo}
                                alt={symbol}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px'
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    background: colors.main,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <WalletOutlined
                                    style={{
                                        fontSize: 16,
                                        color: colors.background
                                    }}
                                />
                            </div>
                        )}
                        <div>
                            <div
                                style={{
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    color: colors.text
                                }}>
                                {formatBalance(balanceFormatted, 6)}
                            </div>
                            <div
                                style={{
                                    fontSize: '14px',
                                    color: colors.main,
                                    fontWeight: 600
                                }}>
                                {symbol}
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded
                        }}>
                        Available Balance
                    </div>
                </div>

                {/* Recipient Input */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.textFaded,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <SendOutlined style={{ fontSize: 10 }} />
                        Recipient Address
                    </div>
                    <Input
                        preset="address"
                        addressInputData={toInfo}
                        onAddressInputChange={handleAddressChange}
                        placeholder="Enter recipient address..."
                        autoFocus
                        style={{
                            background: colors.inputBg,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '8px',
                            padding: '10px',
                            fontSize: '13px'
                        }}
                    />
                </div>

                {/* Public Key Display */}
                {toInfo.address && (
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '12px'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <SafetyOutlined style={{ fontSize: 10 }} />
                            Public Key
                        </div>
                        {fetchingPubKey ? (
                            <div
                                style={{
                                    padding: '10px',
                                    background: colors.inputBg,
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: colors.textFaded,
                                    textAlign: 'center'
                                }}>
                                Fetching public key...
                            </div>
                        ) : publicKey ? (
                            <div
                                style={{
                                    padding: '10px',
                                    background: colors.inputBg,
                                    border: `1px solid ${colors.success}30`,
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-all',
                                    lineHeight: '1.5'
                                }}>
                                {publicKey}
                            </div>
                        ) : (
                            <div
                                style={{
                                    padding: '10px',
                                    background: `${colors.error}15`,
                                    border: `1px solid ${colors.error}30`,
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    color: colors.error,
                                    lineHeight: '1.6'
                                }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Public Key Not Found</div>
                                <div style={{ color: colors.textFaded }}>
                                    This address has never spent a UTXO, so OP_NET cannot automatically retrieve its
                                    public key. Please use the recipient&apos;s token deposit address (public key)
                                    instead.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Amount Input */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <DollarOutlined style={{ fontSize: 10 }} />
                            Amount
                        </div>
                        <button
                            style={{
                                padding: '4px 8px',
                                background: colors.main,
                                border: 'none',
                                borderRadius: '6px',
                                color: colors.background,
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onClick={() => setInputAmount(BitcoinUtils.formatUnits(balance, divisibility))}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}>
                            MAX
                        </button>
                    </div>
                    <Input
                        preset="amount"
                        placeholder="0.00"
                        value={inputAmount}
                        onAmountInputChange={setInputAmount}
                        decimalPlaces={divisibility}
                        style={{
                            background: colors.inputBg,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '8px',
                            padding: '10px',
                            fontSize: '16px',
                            fontWeight: 600
                        }}
                    />
                </div>

                {/* Optional Note */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.textFaded,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <EditOutlined style={{ fontSize: 10 }} />
                        Note (Optional)
                    </div>
                    <Input
                        preset="text"
                        placeholder="Add a note..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        style={{
                            background: colors.inputBg,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '8px',
                            padding: '8px 10px',
                            fontSize: '12px'
                        }}
                    />
                </div>

                {/* Fee Settings */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.textFaded,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <ThunderboltOutlined style={{ fontSize: 10 }} />
                        Network Fees
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                marginBottom: '6px'
                            }}>
                            Miner Fee
                        </div>
                        <FeeRateBar onChange={setFeeRate} />
                    </div>

                    <div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                marginBottom: '6px'
                            }}>
                            Priority Fee
                        </div>
                        <PriorityFeeBar onChange={setPriorityFee} />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div
                        style={{
                            padding: '8px 12px',
                            background: `${colors.error}15`,
                            border: `1px solid ${colors.error}30`,
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                        <Text
                            text={error}
                            style={{
                                fontSize: '12px',
                                color: colors.error,
                                fontWeight: 500
                            }}
                        />
                    </div>
                )}

                {/* Send Button */}
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
                        transition: 'all 0.2s',
                        marginTop: 'auto',
                        opacity: disabled ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                    onClick={handleNext}
                    disabled={disabled}
                    onMouseEnter={(e) => {
                        if (!disabled) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 116, 19, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}>
                    <SendOutlined />
                    Review Transaction
                </button>
            </Content>
        </Layout>
    );
}
