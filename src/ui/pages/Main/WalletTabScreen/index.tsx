import { Tooltip } from 'antd';
import { CSSProperties, useEffect, useState } from 'react';

import { AddressFlagType } from '@/shared/constant';
import { checkAddressFlag } from '@/shared/utils';
import { AddressBar, Column, Content, Footer, Header, Image, Layout, Row } from '@/ui/components';
import AccountSelect from '@/ui/components/AccountSelect';
import { BtcUsd } from '@/ui/components/BtcUsd';
import { DisableUnconfirmedsPopover } from '@/ui/components/DisableUnconfirmedPopover';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { UpgradePopover } from '@/ui/components/UpgradePopover';
import { BtcDisplay } from '@/ui/pages/Main/WalletTabScreen/components/BtcDisplay';
import {
    useAccountBalance,
    useAddressSummary,
    useCurrentAccount,
    useFetchBalanceCallback
} from '@/ui/state/accounts/hooks';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import {
    useBTCUnit,
    useChain,
    useFaucetUrl,
    useSkipVersionCallback,
    useVersionInfo,
    useWalletConfig
} from '@/ui/state/settings/hooks';
import { useResetUiTxCreateScreen } from '@/ui/state/ui/hooks';
import { amountToSatoshis, useWallet } from '@/ui/utils';

import {
    DownOutlined,
    ExclamationCircleOutlined,
    ExperimentOutlined,
    InfoCircleOutlined,
    QrcodeOutlined,
    SendOutlined,
    SwapOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { RouteTypes, useNavigate } from '../../MainRoute';
import { SwitchChainModal } from '../../Settings/network/SwitchChainModal';
import { OPNetList } from './OPNetList';

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
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

const $noBreakStyle: CSSProperties = {
    whiteSpace: 'nowrap',
    wordBreak: 'keep-all'
};

export default function WalletTabScreen() {
    const navigate = useNavigate();

    const accountBalance = useAccountBalance();
    const fetchBalance = useFetchBalanceCallback();
    const chain = useChain();
    const addressSummary = useAddressSummary();
    const btcUnit = useBTCUnit();
    const faucetUrl = useFaucetUrl();

    const [switchChainModalVisible, setSwitchChainModalVisible] = useState(false);

    const currentKeyring = useCurrentKeyring();
    const currentAccount = useCurrentAccount();
    const wallet = useWallet();

    const dispatch = useAppDispatch();

    const skipVersion = useSkipVersionCallback();

    const walletConfig = useWalletConfig();
    const versionInfo = useVersionInfo();

    const resetUiTxCreateScreen = useResetUiTxCreateScreen();

    const [showDisableUnconfirmedUtxoNotice, setShowDisableUnconfirmedUtxoNotice] = useState(false);

    useEffect(() => {
        void (async () => {
            if (currentAccount.address !== addressSummary.address) {
                return;
            }
            if (checkAddressFlag(currentAccount.flag, AddressFlagType.CONFIRMED_UTXO_MODE)) {
                return;
            }
            if (checkAddressFlag(currentAccount.flag, AddressFlagType.DISABLE_AUTO_SWITCH_CONFIRMED)) {
                return;
            }

            const account = await wallet.addAddressFlag(currentAccount, AddressFlagType.CONFIRMED_UTXO_MODE);
            dispatch(accountActions.setCurrent(account));

            setShowDisableUnconfirmedUtxoNotice(true);
        })();
    }, [addressSummary, currentAccount, dispatch, wallet]);

    useEffect(() => {
        void fetchBalance();
    }, [fetchBalance]);

    return (
        <Layout>
            <Header
                LeftComponent={
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            background: colors.buttonHoverBg,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            maxWidth: '120px'
                        }}
                        onClick={() => navigate(RouteTypes.SwitchKeyringScreen)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}>
                        <WalletOutlined style={{ fontSize: 10, color: colors.main }} />
                        <span
                            style={{
                                fontSize: '10px',
                                color: colors.text,
                                fontWeight: 500,
                                fontFamily: 'Inter-Regular, serif',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                            {currentKeyring.alianName}
                        </span>
                        <DownOutlined style={{ fontSize: 8, color: colors.textFaded }} />
                    </button>
                }
                RightComponent={
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            background: colors.buttonHoverBg,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={() => setSwitchChainModalVisible(true)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}>
                        <Image src={chain?.icon || './images/artifacts/bitcoin-mainnet.png'} size={20} />
                        <DownOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                    </button>
                }
                logoWithoutText
            />

            <Content style={{ padding: '12px' }}>
                <Column gap="sm">
                    {/* Status Messages */}
                    {(walletConfig.chainTip || walletConfig.statusMessage) && (
                        <div
                            style={{
                                background: `linear-gradient(135deg, ${colors.error}10 0%, ${colors.error}05 100%)`,
                                border: `1px solid ${colors.error}30`,
                                borderRadius: '10px',
                                padding: '10px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}>
                            <ExclamationCircleOutlined
                                style={{
                                    fontSize: 13,
                                    color: colors.error,
                                    marginTop: '1px',
                                    flexShrink: 0
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                {walletConfig.chainTip && (
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            color: colors.text,
                                            marginBottom: walletConfig.statusMessage ? '4px' : 0
                                        }}>
                                        {walletConfig.chainTip}
                                    </div>
                                )}
                                {walletConfig.statusMessage && (
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            color: colors.error,
                                            fontWeight: 500
                                        }}>
                                        {walletConfig.statusMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <AccountSelect />

                    <AddressBar />

                    {/* Balance Card */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                            border: `1px solid ${colors.main}30`,
                            borderRadius: '16px',
                            padding: '20px',
                            marginTop: '8px',
                            marginBottom: '12px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                        {/* Background decoration */}
                        <div
                            style={{
                                position: 'absolute',
                                top: -30,
                                right: -30,
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${colors.main}10 0%, transparent 70%)`,
                                pointerEvents: 'none'
                            }}
                        />

                        <Tooltip
                            placement={'bottom'}
                            title={
                                <div style={{ padding: '4px' }}>
                                    <Row justifyBetween style={{ marginBottom: '4px' }}>
                                        <span style={$noBreakStyle}>Available</span>
                                        <span
                                            style={$noBreakStyle}>{`${accountBalance.confirm_amount} ${btcUnit}`}</span>
                                    </Row>
                                    <Row justifyBetween style={{ marginBottom: '4px' }}>
                                        <span style={$noBreakStyle}>Pending</span>
                                        <span
                                            style={$noBreakStyle}>{`${accountBalance.pending_amount} ${btcUnit}`}</span>
                                    </Row>
                                    <div
                                        style={{
                                            borderTop: `1px solid ${colors.containerBorder}`,
                                            paddingTop: '4px',
                                            marginTop: '4px'
                                        }}>
                                        <Row justifyBetween>
                                            <span style={{ ...$noBreakStyle, fontWeight: 600 }}>Total</span>
                                            <span style={{ ...$noBreakStyle, fontWeight: 600 }}>
                                                {`${accountBalance.amount} ${btcUnit}`}
                                            </span>
                                        </Row>
                                    </div>
                                </div>
                            }
                            overlayStyle={{
                                fontSize: '11px'
                            }}>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: colors.textFaded,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                    }}>
                                    TOTAL BALANCE
                                    <InfoCircleOutlined style={{ fontSize: 10 }} />
                                </div>
                                <BtcDisplay balance={accountBalance.amount} />
                                <BtcUsd
                                    sats={amountToSatoshis(accountBalance.amount)}
                                    textCenter
                                    size={'sm'}
                                    style={{
                                        marginTop: '8px'
                                    }}
                                />
                            </div>
                        </Tooltip>
                    </div>

                    {/* Action Buttons */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '8px',
                            marginBottom: '12px'
                        }}>
                        <button
                            onClick={() => navigate(RouteTypes.ReceiveScreen)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '12px 8px',
                                background: colors.buttonHoverBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = colors.buttonBg;
                                e.currentTarget.style.borderColor = colors.main;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                                e.currentTarget.style.borderColor = colors.containerBorder;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: colors.main,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <QrcodeOutlined style={{ fontSize: 16, color: colors.background }} />
                            </div>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Receive
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                resetUiTxCreateScreen();
                                navigate(RouteTypes.TxCreateScreen);
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '12px 8px',
                                background: colors.buttonHoverBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = colors.buttonBg;
                                e.currentTarget.style.borderColor = colors.main;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                                e.currentTarget.style.borderColor = colors.containerBorder;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: colors.main,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <SendOutlined style={{ fontSize: 16, color: colors.background }} />
                            </div>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Send
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                window.open('https://motoswap.org', '_blank', 'noopener noreferrer');
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '12px 8px',
                                background: colors.buttonHoverBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = colors.buttonBg;
                                e.currentTarget.style.borderColor = colors.main;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                                e.currentTarget.style.borderColor = colors.containerBorder;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: colors.main,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <SwapOutlined style={{ fontSize: 16, color: colors.background }} />
                            </div>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Swap
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                window.open(faucetUrl || '', '_blank', 'noopener noreferrer');
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '12px 8px',
                                background: colors.buttonHoverBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = colors.buttonBg;
                                e.currentTarget.style.borderColor = colors.main;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                                e.currentTarget.style.borderColor = colors.containerBorder;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: colors.main,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <ExperimentOutlined style={{ fontSize: 16, color: colors.background }} />
                            </div>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Faucet
                            </span>
                        </button>
                    </div>

                    {/* Tokens Section */}
                    <div style={{ marginTop: '4px' }}>
                        <OPNetList />
                    </div>
                </Column>

                {!versionInfo.skipped && (
                    <UpgradePopover
                        onClose={async () => {
                            await skipVersion(versionInfo.newVersion);
                        }}
                    />
                )}

                {showDisableUnconfirmedUtxoNotice && (
                    <DisableUnconfirmedsPopover onClose={() => setShowDisableUnconfirmedUtxoNotice(false)} />
                )}

                {switchChainModalVisible && (
                    <SwitchChainModal
                        onClose={() => {
                            setSwitchChainModalVisible(false);
                        }}
                    />
                )}
            </Content>

            <Footer px="zero" py="zero">
                <NavTabBar tab="home" />
            </Footer>
        </Layout>
    );
}
