import React, { CSSProperties, useEffect, useState } from 'react';

import { AddressFlagType } from '@/shared/constant';
import { checkAddressFlag } from '@/shared/utils';
import { Column, Content, Footer, Header, Image, Layout, Row } from '@/ui/components';
import AccountSelect from '@/ui/components/AccountSelect';
import { DisableUnconfirmedsPopover } from '@/ui/components/DisableUnconfirmedPopover';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { UpgradePopover } from '@/ui/components/UpgradePopover';
import { BalanceDisplay } from '@/ui/pages/Main/WalletTabScreen/components/BalanceDisplay';
import {
    useAccountBalance,
    useAccountPublicKey,
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
import { amountToSatoshis, copyToClipboard, useWallet } from '@/ui/utils';

import { useTools } from '@/ui/components/ActionComponent';
import ParticleField from '@/ui/components/ParticleField/ParticleField';
import {
    DownOutlined,
    ExclamationCircleOutlined,
    ExperimentOutlined,
    HistoryOutlined,
    QrcodeOutlined,
    SendOutlined,
    SwapOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Address } from '@btc-vision/transaction';
import ActionButton from '../../../components/ActionButton/index';
import { RouteTypes, useNavigate } from '../../MainRoute';
import { SwitchChainModal } from '../../Settings/network/SwitchChainModal';
import { OPNetList } from './OPNetList';
import { useConsolidation } from './hooks';

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
    warning: '#fbbf24',

    btcOrange: '#e9983d',

    buttonBorder: '#444746',
    buttonBorderHover: '#f37413'
};

const $noBreakStyle: CSSProperties = {
    whiteSpace: 'nowrap',
    wordBreak: 'keep-all'
};

export default function WalletTabScreen() {
    const navigate = useNavigate();

    const untweakedPublicKey = useAccountPublicKey();

    const address = untweakedPublicKey ? Address.fromString(untweakedPublicKey) : null;
    const tweakedPublicKey = address ? address.toHex() : '';
    const publicKey = address ? '0x' + address.originalPublicKeyBuffer().toString('hex') : '';
    const explorerUrl = address ? `https://opscan.org/accounts/${tweakedPublicKey}` : '';

    const accountBalance = useAccountBalance();
    const fetchBalance = useFetchBalanceCallback();
    const chain = useChain();
    const addressSummary = useAddressSummary();
    const btcUnit = useBTCUnit();
    const faucetUrl = useFaucetUrl();

    const [switchChainModalVisible, setSwitchChainModalVisible] = useState(false);
    const [showUTXOsSection, setShowUTXOsSection] = useState(false);

    const currentKeyring = useCurrentKeyring();
    const currentAccount = useCurrentAccount();
    const wallet = useWallet();

    const dispatch = useAppDispatch();

    const skipVersion = useSkipVersionCallback();

    const walletConfig = useWalletConfig();
    const versionInfo = useVersionInfo();

    const resetUiTxCreateScreen = useResetUiTxCreateScreen();
    const { checkUTXOLimit, navigateToConsolidation } = useConsolidation();

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

    const tools = useTools();

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
                <Column>
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

                    <div
                        style={{
                            position: 'relative',
                            margin: '-8px -12px -8px -12px',
                            background: 'Linear-gradient(180deg, #2e2922 0%, rgba(0,0,0,0) 100%)'
                        }}>
                        <ParticleField speed={0.3} />
                        {/*
                    <AddressBar
                        csv75_total_amount={accountBalance.csv75_total_amount}
                        csv75_unlocked_amount={accountBalance.csv75_unlocked_amount}
                        csv75_locked_amount={accountBalance.csv75_locked_amount}
                        csv1_total_amount={accountBalance.csv1_total_amount}
                        csv1_unlocked_amount={accountBalance.csv1_unlocked_amount}
                        csv1_locked_amount={accountBalance.csv1_locked_amount}
                    />
                    */}

                        {/* Balance Card */}
                        <div
                            style={{
                                padding: '20px',
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

                            <div>
                                {/* Warning message when limit is reached */}
                                {(() => {
                                    const { hasReachedLimit, consolidationLimit } = checkUTXOLimit(accountBalance);

                                    return hasReachedLimit ? (
                                        <div
                                            style={{
                                                background: `linear-gradient(135deg, ${colors.error}15 0%, ${colors.error}08 100%)`,
                                                border: `1px solid ${colors.error}40`,
                                                borderRadius: '8px',
                                                padding: '10px',
                                                marginBottom: '12px',
                                                fontSize: '10px',
                                                color: '#dbdbdb',
                                                lineHeight: '1.4',
                                                maxWidth: '320px',
                                                margin: '0 auto 12px'
                                            }}>
                                            <div style={{ fontWeight: 600, color: colors.error, marginBottom: '4px' }}>
                                                ⚠️ UTXO Limit Reached
                                            </div>
                                            <div style={{ fontSize: '9px', color: 'rgba(219, 219, 219, 0.7)', marginBottom: '8px' }}>
                                                Your total balance is not fully displayed since it has exceeded 2,000 UTXOs.
                                                <strong style={{ display: 'block', marginTop: '4px', color: colors.main }}>
                                                    You can consolidate up to {consolidationLimit} UTXOs at a time to fix this issue.
                                                </strong>
                                            </div>
                                            <button
                                                onClick={navigateToConsolidation}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 12px',
                                                    background: colors.main,
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    color: '#000',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.opacity = '0.8';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                }}>
                                                Consolidate {consolidationLimit} UTXOs
                                            </button>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Total Balance Label + Details Button */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    marginBottom: '3px'
                                }}>
                                    <div
                                        style={{
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            color: colors.textFaded,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                        TOTAL BALANCE
                                    </div>
                                    <button
                                        onClick={() => setShowUTXOsSection(!showUTXOsSection)}
                                        style={{
                                            padding: '2px 8px',
                                            background: colors.buttonHoverBg,
                                            border: `1px solid ${colors.containerBorder}`,
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: colors.textFaded,
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = colors.main;
                                            e.currentTarget.style.borderColor = colors.main;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = colors.textFaded;
                                            e.currentTarget.style.borderColor = colors.containerBorder;
                                        }}>
                                        Details
                                        <DownOutlined 
                                            style={{ 
                                                fontSize: 7, 
                                                transform: showUTXOsSection ? 'rotate(180deg)' : 'rotate(0deg)', 
                                                transition: 'transform 0.2s' 
                                            }} 
                                        />
                                    </button>
                                </div>

                                {/* Balance Details Tabs or Balance Display */}
                                <BalanceDisplay
                                    accountBalance={accountBalance}
                                    showDetails={showUTXOsSection}
                                    btcUnit={btcUnit}
                                    colors={colors}
                                    noBreakStyle={$noBreakStyle}
                                />

                                {/* Metadata: CSV Badge and Public Key */}
                                {!showUTXOsSection && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            marginTop: '4px'
                                        }}>
                                        {/* Show CSV balances if they exist */}
                                        {(parseFloat(accountBalance.csv75_total_amount || '0') > 0 || 
                                          parseFloat(accountBalance.csv1_total_amount || '0') > 0) && (
                                            <span
                                                style={{
                                                    fontSize: '10px',
                                                    color: colors.btcOrange,
                                                    backgroundColor: 'rgba(233, 152, 61, 0.15)',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    textAlign: 'center',
                                                    fontWeight: 500
                                                }}>
                                                + CSV Balances
                                            </span>
                                        )}

                                        {/* Public Key Display */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px'
                                            }}>
                                            <Tooltip title="Click to copy public key" placement="top">
                                            <button
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '3px 8px',
                                                    background: 'rgba(243, 116, 19, 0.1)',
                                                    border: '1px solid rgba(243, 116, 19, 0.3)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    maxWidth: '120px'
                                                }}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await copyToClipboard(publicKey);
                                                    tools.toastSuccess('Copied');
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(243, 116, 19, 0.2)';
                                                    e.currentTarget.style.borderColor = 'rgba(243, 116, 19, 0.5)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(243, 116, 19, 0.1)';
                                                    e.currentTarget.style.borderColor = 'rgba(243, 116, 19, 0.3)';
                                                }}>
                                                <span
                                                    style={{
                                                        fontSize: '10px',
                                                        color: colors.main,
                                                        fontFamily: 'monospace',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                    {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
                                                </span>
                                                <svg
                                                    width="10"
                                                    height="10"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    style={{ flexShrink: 0 }}>
                                                    <path
                                                        d="M8 4H6C5.46957 4 4.96086 4.21071 4.58579 4.58579C4.21071 4.96086 4 5.46957 4 6V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.46957 20 6 20H18C18.5304 20 19.0391 19.7893 19.4142 19.4142C19.7893 19.0391 20 18.5304 20 18V16M16 4H20M20 4V8M20 4L10 14"
                                                        stroke={colors.main}
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: btcUnit == 'BTC' ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)',
                                gap: '6px',
                                padding: '0 12px',
                                marginBottom: '12px'
                            }}>
                            <ActionButton
                                label="Receive"
                                icon={<QrcodeOutlined style={{ fontSize: 18, color: colors.text }} />}
                                onClick={() => navigate(RouteTypes.ReceiveScreen)}
                            />

                            <ActionButton
                                label="Send"
                                icon={<SendOutlined style={{ fontSize: 18, color: colors.text }} />}
                                onClick={() => {
                                    resetUiTxCreateScreen();
                                    navigate(RouteTypes.TxCreateScreen);
                                }}
                            />

                            <ActionButton
                                label="Swap"
                                icon={<SwapOutlined style={{ fontSize: 18, color: colors.text }} />}
                                onClick={() => {
                                    window.open('https://motoswap.org', '_blank', 'noopener noreferrer');
                                }}
                            />

                            {btcUnit !== 'BTC' && (
                                <ActionButton
                                    label="Faucet"
                                    icon={<ExperimentOutlined style={{ fontSize: 18, color: colors.text }} />}
                                    onClick={() => {
                                        window.open(faucetUrl || '', '_blank', 'noopener noreferrer');
                                    }}
                                />
                            )}

                            <ActionButton
                                label="History"
                                icon={<HistoryOutlined style={{ fontSize: 18, color: colors.text }} />}
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    window.open(explorerUrl, '_blank');
                                }}
                            />
                        </div>
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
