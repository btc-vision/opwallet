import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';

import { AddressFlagType, KEYRING_TYPE, NETWORK_TYPES, NetworkType } from '@/shared/constant';
import { UTXO_CONFIG } from '@/shared/config';
import { checkAddressFlag } from '@/shared/utils';
import { Column, Content, Footer, Header, Image, Layout } from '@/ui/components';
import AccountSelect from '@/ui/components/AccountSelect';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { QuantumMigrationBanner } from '@/ui/components/QuantumMigrationBanner';
import { DisableUnconfirmedsPopover } from '@/ui/components/DisableUnconfirmedPopover';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { UpgradePopover } from '@/ui/components/UpgradePopover';
import { BalanceDisplay } from '@/ui/pages/Main/WalletTabScreen/components/BalanceDisplay';
import {
    useAccountAddress,
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
import { copyToClipboard, useWallet } from '@/ui/utils';

import { useTools } from '@/ui/components/ActionComponent';
import ParticleField from '@/ui/components/ParticleField/ParticleField';
import {
    CheckCircleOutlined,
    CloseOutlined,
    CopyOutlined,
    DownOutlined,
    ExclamationCircleOutlined,
    ExperimentOutlined,
    GlobalOutlined,
    HistoryOutlined,
    QrcodeOutlined,
    SendOutlined,
    SettingOutlined,
    SwapOutlined,
    WalletOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import { Tooltip } from 'antd';
import ActionButton from '../../../components/ActionButton/index';
import { RouteTypes, useNavigate } from '../../MainRoute';
import { SwitchChainModal } from '../../Settings/network/SwitchChainModal';
import { OPNetList } from './OPNetList';
import { useConsolidation, OptimizationStatus } from './hooks';

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
    const bitcoinAddress = useAccountAddress();

    const [address, setAddress] = useState<Address | null>(null);

    // untweakedPublicKey.mldsa can be UNDEFINED if the account is not quantum-enabled! we need to handle this gracefully, no error!
    // Address.fromString requires (mldsaHashedKey, legacyKey) - use pubkey for both if no mldsa
    useEffect(() => {
        if (untweakedPublicKey.mldsa) {
            setAddress(Address.fromString(untweakedPublicKey.mldsa, untweakedPublicKey.pubkey));
        } else if (untweakedPublicKey.pubkey) {
            setAddress(
                Address.fromString(
                    '0x0000000000000000000000000000000000000000000000000000000000000000',
                    untweakedPublicKey.pubkey
                )
            );
        } else {
            setAddress(null);
        }
    }, [untweakedPublicKey.pubkey, untweakedPublicKey.mldsa]);

    const mldsaHashedPublicKey = address ? address.toHex() : '';
    //const publicKey = address ? '0x' + address.originalPublicKeyBuffer().toString('hex') : '';
    //const explorerUrl = address ? `https://opscan.org/accounts/${mldsaHashedPublicKey}` : '';

    const accountBalance = useAccountBalance();
    const fetchBalance = useFetchBalanceCallback();
    const chain = useChain();
    const addressSummary = useAddressSummary();
    const btcUnit = useBTCUnit();
    const faucetUrl = useFaucetUrl();

    const [switchChainModalVisible, setSwitchChainModalVisible] = useState(false);
    const [showBalanceDetails, setShowBalanceDetails] = useState(false);

    const currentKeyring = useCurrentKeyring();
    const currentAccount = useCurrentAccount();
    const wallet = useWallet();

    const dispatch = useAppDispatch();

    const skipVersion = useSkipVersionCallback();

    const walletConfig = useWalletConfig();
    const versionInfo = useVersionInfo();

    const resetUiTxCreateScreen = useResetUiTxCreateScreen();
    const {
        checkUTXOLimit,
        checkUTXOWarning,
        checkOptimizationStatus,
        navigateToConsolidation,
        navigateToSplit,
        validateSplit,
        calculateMaxSplits
    } = useConsolidation();

    const [showDisableUnconfirmedUtxoNotice, setShowDisableUnconfirmedUtxoNotice] = useState(false);
    const [showOptimizeModal, setShowOptimizeModal] = useState(false);
    const [showBtcDomainModal, setShowBtcDomainModal] = useState(false);
    const [splitCount, setSplitCount] = useState(25);
    const [splitFeeRate, setSplitFeeRate] = useState(5); // Default fee rate
    const [needsQuantumMigration, setNeedsQuantumMigration] = useState(false);

    // Check if quantum migration is needed (SimpleKeyring without quantum key)
    useEffect(() => {
        const checkQuantumStatus = async () => {
            try {
                if (currentKeyring.type === KEYRING_TYPE.SimpleKeyring) {
                    // Try to get the wallet address - if it fails, migration needed
                    try {
                        await wallet.getWalletAddress();
                        setNeedsQuantumMigration(false);
                    } catch {
                        setNeedsQuantumMigration(true);
                    }
                } else {
                    setNeedsQuantumMigration(false);
                }
            } catch {
                setNeedsQuantumMigration(false);
            }
        };
        void checkQuantumStatus();
    }, [currentKeyring, wallet]);

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

    // Helper function to check if there are CSV balances
    const hasCSVBalances = () => {
        const csv75Total = parseFloat(accountBalance.csv75_total_amount || '0');
        const csv2Total = parseFloat(accountBalance.csv2_total_amount || '0');
        const csv1Total = parseFloat(accountBalance.csv1_total_amount || '0');
        return csv75Total > 0 || csv2Total > 0 || csv1Total > 0;
    };

    // Get optimization status for the wallet
    const optimizationStatus = useMemo(() => {
        return checkOptimizationStatus(accountBalance);
    }, [accountBalance, checkOptimizationStatus]);

    // Calculate if current split count is valid
    const isSplitValid = useMemo(() => {
        return validateSplit(optimizationStatus.availableBalance, splitCount);
    }, [optimizationStatus.availableBalance, splitCount, validateSplit]);

    // Calculate max possible splits
    const maxSplits = useMemo(() => {
        return calculateMaxSplits(optimizationStatus.availableBalance);
    }, [optimizationStatus.availableBalance, calculateMaxSplits]);

    // Calculate output amount per split
    const outputPerSplit = useMemo(() => {
        if (splitCount <= 0) return 0n;
        return optimizationStatus.availableBalance / BigInt(splitCount);
    }, [optimizationStatus.availableBalance, splitCount]);

    // Get network flag for CLI commands (empty for mainnet, -n <network> for others)
    const networkFlag = useMemo(() => {
        if (chain.networkType === NetworkType.MAINNET) return '';
        return ` -n ${NETWORK_TYPES[chain.networkType].name}`;
    }, [chain.networkType]);

    // Handle split action
    const handleSplit = useCallback(async () => {
        if (isSplitValid && splitFeeRate > 0) {
            setShowOptimizeModal(false);
            await navigateToSplit(splitCount, splitFeeRate);
        }
    }, [isSplitValid, splitCount, splitFeeRate, navigateToSplit]);

    // Handle consolidate action
    const handleConsolidate = useCallback(async () => {
        setShowOptimizeModal(false);
        await navigateToConsolidation();
    }, [navigateToConsolidation]);

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

                    {/* Quantum Migration Banner */}
                    {needsQuantumMigration && (
                        <div style={{ marginTop: '8px' }}>
                            <QuantumMigrationBanner onMigrate={() => navigate(RouteTypes.QuantumMigrationScreen)} />
                        </div>
                    )}

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
                        csv2_total_amount={accountBalance.csv2_total_amount}
                        csv2_unlocked_amount={accountBalance.csv2_unlocked_amount}
                        csv2_locked_amount={accountBalance.csv2_locked_amount}
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
                                {/* Warning message when threshold is reached (yellow/red based on count) */}
                                {(() => {
                                    const { hasReachedWarning, warningThreshold } = checkUTXOWarning(accountBalance);
                                    const { hasReachedLimit } = checkUTXOLimit(accountBalance);

                                    if (!hasReachedWarning || hasReachedLimit) return null;

                                    // Check if we've reached the error threshold (1500) to show red instead of yellow
                                    const errorThreshold = UTXO_CONFIG.ERROR_THRESHOLD;
                                    const hasReachedError =
                                        accountBalance.unspent_utxos_count >= errorThreshold ||
                                        accountBalance.csv75_locked_utxos_count >= errorThreshold ||
                                        accountBalance.csv75_unlocked_utxos_count >= errorThreshold ||
                                        accountBalance.csv2_locked_utxos_count >= errorThreshold ||
                                        accountBalance.csv2_unlocked_utxos_count >= errorThreshold ||
                                        accountBalance.csv1_locked_utxos_count >= errorThreshold ||
                                        accountBalance.csv1_unlocked_utxos_count >= errorThreshold ||
                                        accountBalance.p2wda_utxos_count >= errorThreshold ||
                                        accountBalance.unspent_p2wda_utxos_count >= errorThreshold;

                                    // Use same colors as 2000+ message when >= 1500
                                    const alertColor = hasReachedError ? colors.error : colors.warning;
                                    const strongTextColor = hasReachedError ? colors.main : colors.warning;
                                    const buttonColor = hasReachedError ? colors.main : colors.warning;
                                    const buttonTextColor = '#000';

                                    return (
                                        <div
                                            style={{
                                                background: `linear-gradient(135deg, ${alertColor}15 0%, ${alertColor}08 100%)`,
                                                border: `1px solid ${alertColor}40`,
                                                borderRadius: '8px',
                                                padding: '10px',
                                                marginBottom: '12px',
                                                fontSize: '10px',
                                                color: '#dbdbdb',
                                                lineHeight: '1.4',
                                                maxWidth: '320px',
                                                margin: '0 auto 12px'
                                            }}>
                                            <div style={{ fontWeight: 600, color: alertColor, marginBottom: '4px' }}>
                                                ⚠️ High UTXO Count
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '9px',
                                                    color: 'rgba(219, 219, 219, 0.7)',
                                                    marginBottom: '8px'
                                                }}>
                                                One or more UTXO categories has reached {warningThreshold} UTXOs.
                                                Consider consolidating now to avoid issues.
                                                <strong
                                                    style={{
                                                        display: 'block',
                                                        marginTop: '4px',
                                                        color: strongTextColor
                                                    }}>
                                                    If you exceed 2,000 UTXOs in any category, your balance will not be
                                                    fully displayed.
                                                </strong>
                                            </div>
                                            <button
                                                onClick={navigateToConsolidation}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 12px',
                                                    background: buttonColor,
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    color: buttonTextColor,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.opacity = '0.8';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                }}>
                                                Consolidate UTXOs
                                            </button>
                                        </div>
                                    );
                                })()}

                                {/* Critical warning message when limit is reached (red) */}
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
                                            <div
                                                style={{
                                                    fontSize: '9px',
                                                    color: 'rgba(219, 219, 219, 0.7)',
                                                    marginBottom: '8px'
                                                }}>
                                                Balance incomplete (2,000+ UTXOs). Consolidate to fix.
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

                                {/* Total Balance Label + Details Button + Optimize Button */}
                                <div
                                    style={{
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
                                        onClick={() => setShowBalanceDetails(!showBalanceDetails)}
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
                                                transform: showBalanceDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s'
                                            }}
                                        />
                                    </button>
                                    <Tooltip title="Optimize wallet UTXOs for better performance">
                                        <button
                                            onClick={() => setShowOptimizeModal(true)}
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
                                            <SettingOutlined style={{ fontSize: 9 }} />
                                            Optimize
                                        </button>
                                    </Tooltip>
                                </div>

                                {/* Balance Details Tabs or Balance Display */}
                                <BalanceDisplay
                                    accountBalance={accountBalance}
                                    showDetails={showBalanceDetails}
                                    btcUnit={btcUnit}
                                    colors={colors}
                                    noBreakStyle={$noBreakStyle}
                                />

                                {/* Metadata: CSV Badge, MLDSA Key, and Bitcoin Address */}
                                {!showBalanceDetails && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginTop: '4px'
                                        }}>
                                        {/* Show CSV balances if they exist */}
                                        {hasCSVBalances() && (
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

                                        {/* MLDSA Key and Bitcoin Address Row */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                flexWrap: 'wrap'
                                            }}>
                                            {/* MLDSA Key Display - only show if wallet is migrated */}
                                            {untweakedPublicKey.mldsa && (
                                                <Tooltip title="Click to copy MLDSA public key hash" placement="top">
                                                    <button
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '3px 8px',
                                                            background: 'rgba(139, 92, 246, 0.1)',
                                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                            maxWidth: '130px'
                                                        }}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            await copyToClipboard(mldsaHashedPublicKey);
                                                            tools.toastSuccess('MLDSA key copied');
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background =
                                                                'rgba(139, 92, 246, 0.2)';
                                                            e.currentTarget.style.borderColor =
                                                                'rgba(139, 92, 246, 0.5)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background =
                                                                'rgba(139, 92, 246, 0.1)';
                                                            e.currentTarget.style.borderColor =
                                                                'rgba(139, 92, 246, 0.3)';
                                                        }}>
                                                        <span
                                                            style={{
                                                                fontSize: '9px',
                                                                color: '#8B5CF6',
                                                                fontWeight: 600
                                                            }}>
                                                            MLDSA
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '10px',
                                                                color: '#8B5CF6',
                                                                fontFamily: 'monospace',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                            {mldsaHashedPublicKey.slice(0, 6)}...
                                                            {mldsaHashedPublicKey.slice(-4)}
                                                        </span>
                                                        <svg
                                                            width="10"
                                                            height="10"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            style={{ flexShrink: 0 }}>
                                                            <path
                                                                d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11v6M9 14h6M15 4H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"
                                                                stroke="#8B5CF6"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                </Tooltip>
                                            )}

                                            {/* Bitcoin Address Display */}
                                            <Tooltip title="Click to copy Bitcoin address" placement="top">
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
                                                        maxWidth: '130px'
                                                    }}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await copyToClipboard(bitcoinAddress);
                                                        tools.toastSuccess('Address copied');
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
                                                            fontSize: '9px',
                                                            color: colors.main,
                                                            fontWeight: 600
                                                        }}>
                                                        BTC
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            color: colors.main,
                                                            fontFamily: 'monospace',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                        {bitcoinAddress.slice(0, 6)}...{bitcoinAddress.slice(-4)}
                                                    </span>
                                                    <svg
                                                        width="10"
                                                        height="10"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        style={{ flexShrink: 0 }}>
                                                        <path
                                                            d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11v6M9 14h6M15 4H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"
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
                                onClick={() => navigate(RouteTypes.HistoryScreen)}
                            />
                        </div>

                        {/* Assign .btc Domain Card */}
                        <div
                            onClick={() => setShowBtcDomainModal(true)}
                            style={{
                                margin: '0 12px 12px',
                                padding: '10px 14px',
                                background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                                border: `1px solid ${colors.main}30`,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = `${colors.main}60`;
                                e.currentTarget.style.background = `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}10 100%)`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = `${colors.main}30`;
                                e.currentTarget.style.background = `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`;
                            }}>
                            <GlobalOutlined style={{ fontSize: 18, color: colors.main }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                                    Assign .btc Domain
                                </div>
                                <div style={{ fontSize: '10px', color: colors.textFaded }}>
                                    Register your own .btc domain name
                                </div>
                            </div>
                            <DownOutlined style={{ fontSize: 10, color: colors.textFaded, transform: 'rotate(-90deg)' }} />
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

                {/* Optimization Modal */}
                {showOptimizeModal && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}
                        onClick={() => setShowOptimizeModal(false)}>
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '12px',
                                padding: '20px',
                                maxWidth: '340px',
                                width: '90%',
                                border: `1px solid ${colors.containerBorder}`
                            }}
                            onClick={(e) => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px'
                                }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                    Optimize Wallet
                                </div>
                                <button
                                    onClick={() => setShowOptimizeModal(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex'
                                    }}>
                                    <CloseOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                                </button>
                            </div>

                            {/* Current Status */}
                            <div
                                style={{
                                    background: colors.background,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px'
                                }}>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        color: colors.textFaded,
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    Current UTXO Status
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                    <span style={{ fontSize: '12px', color: colors.text }}>
                                        Available UTXOs (Main + CSV1)
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color:
                                                optimizationStatus.status === 'optimized'
                                                    ? colors.success
                                                    : optimizationStatus.status === 'needs_split'
                                                      ? colors.warning
                                                      : colors.error
                                        }}>
                                        {optimizationStatus.utxoCount}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        color: colors.textFaded,
                                        marginTop: '4px'
                                    }}>
                                    Optimal range: {optimizationStatus.splitThreshold} -{' '}
                                    {optimizationStatus.consolidateThreshold} UTXOs
                                </div>
                            </div>

                            {/* Status-specific content */}
                            {optimizationStatus.status === 'optimized' && (
                                <div
                                    style={{
                                        background: `${colors.success}15`,
                                        border: `1px solid ${colors.success}30`,
                                        borderRadius: '8px',
                                        padding: '16px',
                                        textAlign: 'center'
                                    }}>
                                    <CheckCircleOutlined
                                        style={{ fontSize: 32, color: colors.success, marginBottom: '8px' }}
                                    />
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: colors.success,
                                            marginBottom: '4px'
                                        }}>
                                        Wallet Optimized
                                    </div>
                                    <div style={{ fontSize: '11px', color: colors.textFaded }}>
                                        Your wallet has an optimal number of UTXOs for contract interactions.
                                    </div>
                                </div>
                            )}

                            {optimizationStatus.status === 'needs_split' && (
                                <div>
                                    <div
                                        style={{
                                            background: `${colors.warning}15`,
                                            border: `1px solid ${colors.warning}30`,
                                            borderRadius: '8px',
                                            padding: '12px',
                                            marginBottom: '16px'
                                        }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '8px'
                                            }}>
                                            <WarningOutlined style={{ color: colors.warning }} />
                                            <span
                                                style={{
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: colors.warning
                                                }}>
                                                Low UTXO Count
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: 1.4 }}>
                                            Having more UTXOs allows you to perform multiple contract interactions per
                                            block. Split your UTXOs to enable parallel transactions.
                                        </div>
                                    </div>

                                    {/* Split Configuration */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: colors.textFaded,
                                                marginBottom: '6px'
                                            }}>
                                            Split into how many UTXOs?
                                        </div>
                                        <input
                                            type="number"
                                            value={splitCount}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                setSplitCount(Math.max(1, Math.min(val, maxSplits || 1)));
                                            }}
                                            min={1}
                                            max={maxSplits || 1}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: colors.background,
                                                border: `1px solid ${isSplitValid ? colors.containerBorder : colors.error}`,
                                                borderRadius: '8px',
                                                color: colors.text,
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginTop: '6px',
                                                fontSize: '10px',
                                                color: colors.textFaded
                                            }}>
                                            <span>Max: {maxSplits || 0}</span>
                                            <span>
                                                Each output:{' '}
                                                {(Number(outputPerSplit) / 1e8).toFixed(8).replace(/\.?0+$/, '')}{' '}
                                                {btcUnit}
                                            </span>
                                        </div>
                                        {!isSplitValid && (
                                            <div
                                                style={{
                                                    fontSize: '10px',
                                                    color: colors.error,
                                                    marginTop: '4px'
                                                }}>
                                                Each output must be at least {UTXO_CONFIG.MIN_SPLIT_OUTPUT.toLocaleString()}{' '}
                                                sats
                                            </div>
                                        )}
                                    </div>

                                    {/* Fee Rate Selection */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: colors.textFaded,
                                                marginBottom: '6px'
                                            }}>
                                            Network Fee
                                        </div>
                                        <FeeRateBar onChange={(val) => setSplitFeeRate(val)} />
                                    </div>

                                    <button
                                        onClick={handleSplit}
                                        disabled={!isSplitValid || splitFeeRate <= 0}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: isSplitValid && splitFeeRate > 0 ? colors.main : colors.buttonBg,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: isSplitValid && splitFeeRate > 0 ? 'pointer' : 'not-allowed',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: isSplitValid && splitFeeRate > 0 ? '#000' : colors.textFaded,
                                            transition: 'all 0.2s'
                                        }}>
                                        Split UTXOs
                                    </button>
                                </div>
                            )}

                            {optimizationStatus.status === 'needs_consolidate' && (
                                <div>
                                    <div
                                        style={{
                                            background: `${colors.error}15`,
                                            border: `1px solid ${colors.error}30`,
                                            borderRadius: '8px',
                                            padding: '12px',
                                            marginBottom: '16px'
                                        }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '8px'
                                            }}>
                                            <WarningOutlined style={{ color: colors.error }} />
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: colors.error }}>
                                                High UTXO Count
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: 1.4 }}>
                                            Too many UTXOs can slow down wallet operations and increase transaction
                                            fees. Consolidate your UTXOs to improve performance.
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleConsolidate}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: colors.main,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#000',
                                            transition: 'all 0.2s'
                                        }}>
                                        Consolidate UTXOs
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* .btc Domain Registration Modal */}
                {showBtcDomainModal && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}
                        onClick={() => setShowBtcDomainModal(false)}>
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '12px',
                                padding: '20px',
                                maxWidth: '360px',
                                width: '90%',
                                maxHeight: '80vh',
                                overflowY: 'auto',
                                border: `1px solid ${colors.containerBorder}`
                            }}
                            onClick={(e) => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <GlobalOutlined style={{ fontSize: 18, color: colors.main }} />
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                        Register .btc Domain
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowBtcDomainModal(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex'
                                    }}>
                                    <CloseOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                                </button>
                            </div>

                            {/* Instructions */}
                            <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '16px', lineHeight: 1.5 }}>
                                Registering a .btc domain is easy! Follow these steps:
                            </div>

                            {/* Step 1 */}
                            <div
                                style={{
                                    background: colors.background,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '10px'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: colors.main,
                                            color: '#000',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        1
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                                        Download Node.js
                                    </span>
                                </div>
                                <div style={{ fontSize: '10px', color: colors.textFaded, marginLeft: '28px' }}>
                                    Install from{' '}
                                    <a
                                        href="https://nodejs.org"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: colors.main, textDecoration: 'none' }}>
                                        nodejs.org
                                    </a>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div
                                style={{
                                    background: colors.background,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '10px'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: colors.main,
                                            color: '#000',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        2
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                                        Open Terminal
                                    </span>
                                </div>
                                <div style={{ fontSize: '10px', color: colors.textFaded, marginLeft: '28px' }}>
                                    Open your system terminal or command prompt
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div
                                style={{
                                    background: colors.background,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '10px'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: colors.main,
                                            color: '#000',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        3
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                                        Login to CLI
                                    </span>
                                </div>
                                <div
                                    style={{
                                        background: '#1a1a1a',
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        marginLeft: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                    <code style={{ fontSize: '10px', color: colors.success, fontFamily: 'monospace' }}>
                                        npx @btc-vision/cli login
                                    </code>
                                    <button
                                        onClick={async () => {
                                            await copyToClipboard('npx @btc-vision/cli login');
                                            tools.toastSuccess('Copied!');
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '2px'
                                        }}>
                                        <CopyOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                    </button>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div
                                style={{
                                    background: colors.background,
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '10px'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: colors.main,
                                            color: '#000',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        4
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                                        Register Domain
                                    </span>
                                </div>
                                <div
                                    style={{
                                        background: '#1a1a1a',
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        marginLeft: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                    <code style={{ fontSize: '9px', color: colors.success, fontFamily: 'monospace' }}>
                                        npx @btc-vision/cli domain register YOUR_DOMAIN.btc{networkFlag}
                                    </code>
                                    <button
                                        onClick={async () => {
                                            await copyToClipboard(`npx @btc-vision/cli domain register YOUR_DOMAIN.btc${networkFlag}`);
                                            tools.toastSuccess('Copied!');
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '2px'
                                        }}>
                                        <CopyOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                    </button>
                                </div>
                                <div style={{ fontSize: '10px', color: colors.textFaded, marginLeft: '28px', marginTop: '6px' }}>
                                    Replace <code style={{ color: colors.main }}>YOUR_DOMAIN</code> with your desired name
                                </div>
                            </div>

                            {/* Optional Step 5 */}
                            <div
                                style={{
                                    background: `linear-gradient(135deg, ${colors.main}10 0%, ${colors.main}05 100%)`,
                                    border: `1px solid ${colors.main}20`,
                                    borderRadius: '8px',
                                    padding: '12px'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: colors.buttonBg,
                                            color: colors.main,
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        5
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                                        Publish Website{' '}
                                        <span style={{ fontSize: '9px', color: colors.textFaded, fontWeight: 400 }}>
                                            (optional)
                                        </span>
                                    </span>
                                </div>
                                <div
                                    style={{
                                        background: '#1a1a1a',
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        marginLeft: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                    <code style={{ fontSize: '9px', color: colors.success, fontFamily: 'monospace' }}>
                                        npx @btc-vision/cli deploy YOUR_DOMAIN.btc .{networkFlag}
                                    </code>
                                    <button
                                        onClick={async () => {
                                            await copyToClipboard(`npx @btc-vision/cli deploy YOUR_DOMAIN.btc .${networkFlag}`);
                                            tools.toastSuccess('Copied!');
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '2px'
                                        }}>
                                        <CopyOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                    </button>
                                </div>
                                <div style={{ fontSize: '10px', color: colors.textFaded, marginLeft: '28px', marginTop: '6px' }}>
                                    Requires <code style={{ color: colors.main }}>index.html</code> in your directory.
                                    Use <code style={{ color: colors.main }}>.</code> for full directory or specify a file path.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Content>

            <Footer px="zero" py="zero">
                <NavTabBar tab="home" />
            </Footer>
        </Layout>
    );
}
