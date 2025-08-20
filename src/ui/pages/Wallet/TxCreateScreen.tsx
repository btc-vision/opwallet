import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { COIN_DUST } from '@/shared/constant';
import { Action, Features, SendBitcoinParameters, SourceType } from '@/shared/interfaces/RawTxParameters';
import Web3API from '@/shared/web3/Web3API';
import { Column, Content, Header, Input, Layout } from '@/ui/components';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useUiTxCreateScreen, useUpdateUiTxCreateScreen } from '@/ui/state/ui/hooks';
import { amountToSatoshis, isValidAddress, satoshisToAmount, useWallet } from '@/ui/utils';
import {
    DollarOutlined,
    FileTextOutlined,
    InfoCircleOutlined,
    LoadingOutlined,
    LockOutlined,
    SendOutlined,
    ThunderboltOutlined,
    UnlockOutlined
} from '@ant-design/icons';
import { Address, AddressTypes, AddressVerificator } from '@btc-vision/transaction';

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

interface AddressBalance {
    type: SourceType;
    label: string;
    address: string;
    balance: string;
    totalBalance?: string; // For CSV addresses, show total
    lockedBalance?: string; // For CSV addresses, show locked amount
    satoshis: bigint;
    available: boolean;
    lockTime?: number;
    description: string;
}

export default function TxCreateScreen() {
    const navigate = useNavigate();
    const btcUnit = useBTCUnit();
    const setUiState = useUpdateUiTxCreateScreen();
    const uiState = useUiTxCreateScreen();
    const account = useCurrentAccount();
    const wallet = useWallet();

    const { toInfo, inputAmount, enableRBF, feeRate } = uiState;

    const [disabled, setDisabled] = useState(true);
    const [error, setError] = useState('');
    const [showP2PKWarning, setDisplayP2PKWarning] = useState(false);
    const [showP2OPWarning, setDisplayP2OPWarning] = useState(false);
    const [autoAdjust, setAutoAdjust] = useState(false);
    const [note, setNote] = useState<string>('');

    // Address selection states
    const [addressBalances, setAddressBalances] = useState<AddressBalance[]>([]);
    const [selectedBalance, setSelectedBalance] = useState<AddressBalance | null>(null);
    const [loadingBalances, setLoadingBalances] = useState(true);
    const [hasSelectedAddress, setHasSelectedAddress] = useState(false);

    useEffect(() => {
        void (async () => {
            const chain = await wallet.getChainType();
            await Web3API.setNetwork(chain);
        })();
    }, [wallet]);

    // Fetch all address balances including CSV addresses
    useEffect(() => {
        const fetchAllBalances = async () => {
            setLoadingBalances(true);
            try {
                const currentAddress = Address.fromString(account.pubkey);

                // Get all balances in one call
                const currentBalance = await wallet.getAddressBalance(account.address, account.pubkey);

                // Get CSV addresses for display
                const csv75Address = currentAddress.toCSV(75, Web3API.network);
                const csv1Address = currentAddress.toCSV(1, Web3API.network);

                const balances: AddressBalance[] = [];

                // Always add current address
                balances.push({
                    type: SourceType.CURRENT,
                    label: 'Primary Wallet',
                    address: account.address,
                    balance: currentBalance.amount,
                    satoshis: BigInt(amountToSatoshis(currentBalance.amount)),
                    available: true,
                    description: 'Standard wallet address'
                });

                // Check CSV75 balance from the response
                if (currentBalance.csv75_total_amount && currentBalance.csv75_total_amount !== '0') {
                    const csv75UnlockedAmount = currentBalance.csv75_unlocked_amount || '0';
                    const csv75LockedAmount = currentBalance.csv75_locked_amount || '0';
                    const hasUnlocked = csv75UnlockedAmount !== '0';

                    balances.push({
                        type: SourceType.CSV75,
                        label: 'CSV-75 Mining Rewards',
                        address: csv75Address.address,
                        balance: csv75UnlockedAmount,
                        totalBalance: currentBalance.csv75_total_amount,
                        lockedBalance: csv75LockedAmount,
                        satoshis: BigInt(amountToSatoshis(csv75UnlockedAmount)),
                        available: hasUnlocked,
                        lockTime: 75,
                        description: 'SHA1 mining rewards (75 block lock)'
                    });
                }

                // Check CSV1 balance from the response
                if (currentBalance.csv1_total_amount && currentBalance.csv1_total_amount !== '0') {
                    const csv1UnlockedAmount = currentBalance.csv1_unlocked_amount || '0';
                    const hasUnlocked = csv1UnlockedAmount !== '0';

                    balances.push({
                        type: SourceType.CSV1,
                        label: 'CSV-1 Fast Access',
                        address: csv1Address.address,
                        balance: csv1UnlockedAmount,
                        totalBalance: currentBalance.csv1_total_amount,
                        satoshis: BigInt(amountToSatoshis(csv1UnlockedAmount)),
                        available: hasUnlocked,
                        lockTime: 1,
                        description: 'Anti-pinning protection (1 block lock)'
                    });
                }

                setAddressBalances(balances);
            } catch (error) {
                console.error('Failed to fetch balances:', error);
            } finally {
                setLoadingBalances(false);
            }
        };

        void fetchAllBalances();
    }, [account.address, account.pubkey, wallet]);

    const toSatoshis = useMemo(() => (inputAmount ? amountToSatoshis(inputAmount) : 0), [inputAmount]);
    const dustAmount = useMemo(() => satoshisToAmount(COIN_DUST), []);

    useEffect(() => {
        setError('');
        setDisabled(true);

        if (!selectedBalance) {
            setError('Please select a source address');
            return;
        }
        if (!isValidAddress(toInfo.address)) return;
        if (!toSatoshis) return;
        if (toSatoshis < COIN_DUST) {
            setError(`Minimum amount: ${dustAmount} ${btcUnit}`);
            return;
        }
        if (toSatoshis > selectedBalance.satoshis) {
            setError('Insufficient balance');
            return;
        }
        if (feeRate <= 0) return;

        setDisabled(false);
    }, [toInfo, inputAmount, feeRate, enableRBF, toSatoshis, selectedBalance, dustAmount, btcUnit]);

    const handleNext = () => {
        if (!selectedBalance) return;

        const event: SendBitcoinParameters = {
            to: toInfo.address,
            inputAmount: parseFloat(inputAmount),
            feeRate,
            features: { [Features.rbf]: true, [Features.taproot]: true },
            priorityFee: 0n,
            header: `Send ${btcUnit} from ${selectedBalance.label}`,
            tokens: [],
            action: Action.SendBitcoin,
            note,
            from: selectedBalance.address,
            sourceType: selectedBalance.type
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

    const handleSelectAddress = (balance: AddressBalance) => {
        if (balance.available && balance.satoshis > 0n) {
            setSelectedBalance(balance);
            setHasSelectedAddress(true);
            // Clear any existing input amount when switching addresses
            setUiState({ inputAmount: '' });
        }
    };

    // Show address selection screen first
    if (!hasSelectedAddress) {
        return (
            <Layout>
                <Header title={`Send ${btcUnit}`} onBack={() => window.history.go(-1)} />

                <Content style={{ padding: '16px' }}>
                    <Column>
                        {/* Title */}
                        <div
                            style={{
                                textAlign: 'center',
                                marginBottom: '24px'
                            }}>
                            <h2
                                style={{
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: colors.text,
                                    marginBottom: '8px'
                                }}>
                                Select Source Address
                            </h2>
                            <p
                                style={{
                                    fontSize: '13px',
                                    color: colors.textFaded
                                }}>
                                Choose which address to send from
                            </p>
                        </div>

                        {loadingBalances ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '60px 20px'
                                }}>
                                <LoadingOutlined style={{ fontSize: 32, color: colors.main }} />
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: colors.textFaded,
                                        marginTop: '16px'
                                    }}>
                                    Loading balances...
                                </div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                {addressBalances.map((balance) => {
                                    const isDisabled = !balance.available || balance.satoshis === 0n;
                                    const hasBalance = balance.satoshis > 0n;

                                    return (
                                        <button
                                            key={balance.type}
                                            style={{
                                                width: '100%',
                                                padding: '16px',
                                                background: colors.containerBgFaded,
                                                border: `1px solid ${colors.containerBorder}`,
                                                borderRadius: '14px',
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                opacity: isDisabled ? 0.6 : 1,
                                                transition: 'all 0.2s',
                                                textAlign: 'left',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onClick={() => handleSelectAddress(balance)}
                                            disabled={isDisabled}
                                            onMouseEnter={(e) => {
                                                if (!isDisabled) {
                                                    e.currentTarget.style.borderColor = colors.main;
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}20`;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = colors.containerBorder;
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}>
                                            {/* Card Header */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '12px'
                                                }}>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            color: colors.text,
                                                            marginBottom: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px'
                                                        }}>
                                                        {balance.label}
                                                        {balance.type === SourceType.CURRENT && (
                                                            <span
                                                                style={{
                                                                    fontSize: '10px',
                                                                    padding: '2px 6px',
                                                                    background: colors.main + '20',
                                                                    color: colors.main,
                                                                    borderRadius: '4px',
                                                                    fontWeight: 600
                                                                }}>
                                                                PRIMARY
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            color: colors.textFaded
                                                        }}>
                                                        {balance.description}
                                                    </div>
                                                </div>

                                                {balance.type !== SourceType.CURRENT && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                        {balance.available ? (
                                                            <UnlockOutlined
                                                                style={{
                                                                    fontSize: 14,
                                                                    color: colors.success
                                                                }}
                                                            />
                                                        ) : (
                                                            <LockOutlined
                                                                style={{
                                                                    fontSize: 14,
                                                                    color: colors.warning
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Balance Display */}
                                            <div
                                                style={{
                                                    padding: '12px',
                                                    background: colors.inputBg,
                                                    borderRadius: '10px',
                                                    marginBottom: balance.lockedBalance ? '8px' : '0'
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
                                                        Available
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: '16px',
                                                            fontWeight: 600,
                                                            color: hasBalance ? colors.success : colors.textFaded
                                                        }}>
                                                        {balance.balance} {btcUnit}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Locked Balance Info */}
                                            {balance.lockedBalance && balance.lockedBalance !== '0' && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '8px 12px',
                                                        background: `${colors.warning}10`,
                                                        borderRadius: '8px',
                                                        fontSize: '11px'
                                                    }}>
                                                    <span style={{ color: colors.warning }}>
                                                        <LockOutlined style={{ marginRight: '4px' }} />
                                                        Locked ({balance.lockTime} blocks)
                                                    </span>
                                                    <span
                                                        style={{
                                                            color: colors.warning,
                                                            fontWeight: 600
                                                        }}>
                                                        {balance.lockedBalance} {btcUnit}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Total if different from available */}
                                            {balance.totalBalance && balance.totalBalance !== balance.balance && (
                                                <div
                                                    style={{
                                                        marginTop: '8px',
                                                        paddingTop: '8px',
                                                        borderTop: `1px solid ${colors.containerBorder}`,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: '11px'
                                                    }}>
                                                    <span style={{ color: colors.textFaded }}>Total Balance</span>
                                                    <span style={{ color: colors.textFaded }}>
                                                        {balance.totalBalance} {btcUnit}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Select indicator */}
                                            {!isDisabled && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        right: '16px',
                                                        transform: 'translateY(-50%)',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: colors.main + '20',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                    <SendOutlined
                                                        style={{
                                                            fontSize: 14,
                                                            color: colors.main
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Info message if only one address */}
                        {addressBalances.length === 1 && !loadingBalances && (
                            <div
                                style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    background: `${colors.main}10`,
                                    border: `1px solid ${colors.main}20`,
                                    borderRadius: '10px',
                                    textAlign: 'center'
                                }}>
                                <InfoCircleOutlined
                                    style={{
                                        fontSize: 14,
                                        color: colors.main,
                                        marginBottom: '4px'
                                    }}
                                />
                                <p
                                    style={{
                                        fontSize: '12px',
                                        color: colors.main,
                                        margin: 0
                                    }}>
                                    No CSV addresses with balance detected
                                </p>
                            </div>
                        )}
                    </Column>
                </Content>
            </Layout>
        );
    }

    // Main transaction form after address selection
    return (
        <Layout>
            <Header title={`Send ${btcUnit}`} onBack={() => setHasSelectedAddress(false)} />

            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* Selected Address Display */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                            border: `1px solid ${colors.main}30`,
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                        <div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.main,
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '4px'
                                }}>
                                Sending From
                            </div>
                            <div
                                style={{
                                    fontSize: '13px',
                                    color: colors.text,
                                    fontWeight: 500
                                }}>
                                {selectedBalance?.label}
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.success,
                                    marginTop: '2px'
                                }}>
                                {selectedBalance?.balance} {btcUnit} available
                            </div>
                        </div>
                        <button
                            style={{
                                padding: '6px 10px',
                                background: colors.buttonHoverBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px',
                                color: colors.text,
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onClick={() => setHasSelectedAddress(false)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = colors.buttonBg;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                            }}>
                            Change
                        </button>
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
                            <SendOutlined style={{ fontSize: 14, color: colors.main }} />
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
                            placeholder="Enter recipient address"
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
                                        Funds will be sent to the associated Taproot address.
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
                                        Cannot send BTC directly to contract addresses.
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
                                gap: '6px',
                                marginBottom: '10px'
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
                                    if (selectedBalance) {
                                        setAutoAdjust(true);
                                        setUiState({ inputAmount: selectedBalance.balance });
                                    }
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

                    {/* Note Section */}
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
                    <span>Continue</span>
                    <SendOutlined style={{ fontSize: 14 }} />
                </button>
            </div>
        </Layout>
    );
}
