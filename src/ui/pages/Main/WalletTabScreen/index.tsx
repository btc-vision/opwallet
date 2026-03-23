import { useCallback, useEffect, useMemo, useState } from 'react';

import { UTXO_CONFIG } from '@/shared/config';
import { AddressFlagType, KEYRING_TYPE } from '@/shared/constant';
import { DuplicationDetectionResult } from '@/shared/types/Duplication';
import { checkAddressFlag } from '@/shared/utils';
import { Column, Content, Footer, Header, Image, Layout } from '@/ui/components';
import AccountSelect from '@/ui/components/AccountSelect';
import { DuplicationAlertModal } from '@/ui/components/DuplicationAlertModal';
import { MldsaBackupReminder } from '@/ui/components/MldsaBackupReminder';
import { CsvFundsWarningPopup, LowBalancePopup, LowUtxoPopup, WalletHealthBadge } from '@/ui/components/WalletHealthPopup';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { QuantumMigrationBanner } from '@/ui/components/QuantumMigrationBanner';
import { UpgradePopover } from '@/ui/components/UpgradePopover';
import { BalanceDetailPopup } from '@/ui/components/BalanceDetailPopup';
import { BtcDisplay } from '@/ui/pages/Main/WalletTabScreen/components/BtcDisplay';
import { BtcUsd } from '@/ui/components/BtcUsd';
import {
    useAccountAddress,
    useAccountBalance,
    useAccountPublicKey,
    useAddressSummary,
    useCurrentAccount,
    useFetchBalanceCallback,
    useWalletHealthShowTime
} from '@/ui/state/accounts/hooks';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import { useCurrentRotationAddress, useRotationEnabled } from '@/ui/state/rotation/hooks';
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
import { BitcoinUtils } from 'opnet';

import { BTCDomainModal, TOS_DOMAIN_ACCEPTED_KEY } from '@/ui/components/AcceptModals/btcDomainTermsModal';
import { useTools } from '@/ui/components/ActionComponent';
import ParticleField from '@/ui/components/ParticleField/ParticleField';
import { useBtcDomainsEnabled, usePrivacyModeEnabled } from '@/ui/hooks/useAppConfig';
import { useSimpleModeEnabled } from '@/ui/hooks/useExperienceMode';
import {
    CopyOutlined,
    DownOutlined,
    ExclamationCircleOutlined,
    ExperimentOutlined,
    GlobalOutlined,
    HistoryOutlined,
    LoadingOutlined,
    LockOutlined,
    QrcodeOutlined,
    RocketOutlined,
    SendOutlined,
    SettingOutlined,
    SwapOutlined,
    WalletOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import { Tooltip } from 'antd';
import ActionButton from '../../../components/ActionButton/index';
import { RouteTypes, useNavigate } from '../../routeTypes';
import { SwitchChainModal } from '../../Settings/network/SwitchChainModal';
import { useConsolidation } from './hooks';
import { OPNetList } from './OPNetList';
import { getWalletHealthChecks, WalletHealthCheck } from './health';

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

export default function WalletTabScreen() {
    const navigate = useNavigate();

    const untweakedPublicKey = useAccountPublicKey();
    const baseAddress = useAccountAddress();
    const tools = useTools();

    const rotationEnabled = useRotationEnabled();
    const currentRotationAddress = useCurrentRotationAddress();
    const bitcoinAddress = rotationEnabled && currentRotationAddress ? currentRotationAddress.address : baseAddress;

    // Feature flags
    const btcDomainsEnabled = useBtcDomainsEnabled();
    const privacyModeEnabled = usePrivacyModeEnabled();
    const isSimpleMode = useSimpleModeEnabled();

    const address = useMemo(() => {
        if (untweakedPublicKey.mldsa) {
            return Address.fromString(untweakedPublicKey.mldsa, untweakedPublicKey.pubkey);
        } else if (untweakedPublicKey.pubkey) {
            return Address.fromString(
                '0x0000000000000000000000000000000000000000000000000000000000000000',
                untweakedPublicKey.pubkey
            );
        }
        return null;
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
    const { lastShow, mayShowWalletHealth, healthBadgeOnly, updateWalletHealthShowTime } = useWalletHealthShowTime();

    const [switchChainModalVisible, setSwitchChainModalVisible] = useState(false);
    const [showBalanceDetails, setShowBalanceDetails] = useState(false);
    const [consolidateLoading, setConsolidateLoading] = useState(false);

    const currentKeyring = useCurrentKeyring();
    const currentAccount = useCurrentAccount();
    const wallet = useWallet();

    const dispatch = useAppDispatch();

    const skipVersion = useSkipVersionCallback();

    const walletConfig = useWalletConfig();
    const versionInfo = useVersionInfo();

    const resetUiTxCreateScreen = useResetUiTxCreateScreen();
    const { checkUTXOLimit, checkUTXOWarning, navigateToConsolidation } = useConsolidation();

    const [needsQuantumMigration, setNeedsQuantumMigration] = useState<boolean | null>(null);
    const [showMldsaBackupReminder, setShowMldsaBackupReminder] = useState(false);

    // Duplication detection state
    const [duplicationDetection, setDuplicationDetection] = useState<DuplicationDetectionResult | null>(null);
    const [showDuplicationAlert, setShowDuplicationAlert] = useState(false);

    // Wallet health popup dismissal state (resets on every mount)
    const [showHealthPopup, setShowHealthPopup] = useState<WalletHealthCheck | undefined>(undefined);

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

    // Check for wallet duplications
    useEffect(() => {
        const checkForDuplicates = async () => {
            // Only check once per session (30 seconds threshold)
            if (await wallet.shouldSkipDuplicateCheck()) {
                return;
            }

            // Mark check as done immediately to prevent concurrent checks
            await wallet.setDuplicateCheckDone();

            try {
                const detection = await wallet.checkForDuplicates();

                if (detection.hasDuplicates) {
                    const state = await wallet.getDuplicationState();

                    // If there are still conflicts but state says resolved, reset it
                    // This can happen if resolution didn't fully work or new conflicts appeared
                    if (state.isResolved && detection.totalConflicts > 0) {
                        await wallet.resetDuplicationState();
                    }

                    if (!state.isResolved || detection.totalConflicts > 0) {
                        setDuplicationDetection(detection);
                        setShowDuplicationAlert(true);
                    }
                }
            } catch {
                // Failed to check for duplicates
            }
        };

        void checkForDuplicates();
    }, []);

    // Check if MLDSA backup reminder should be shown (only for Simple Keyrings / WIF imports)
    useEffect(() => {
        const checkMldsaBackupReminder = async () => {
            try {
                // Wait for quantum migration check to complete before deciding
                if (needsQuantumMigration === null) {
                    return;
                }

                // Only show for SimpleKeyring (WIF imports) - HD wallets derive MLDSA from seed phrase
                if (currentKeyring.type !== KEYRING_TYPE.SimpleKeyring) {
                    setShowMldsaBackupReminder(false);
                    return;
                }

                // Don't show if wallet still needs quantum migration
                if (needsQuantumMigration) {
                    setShowMldsaBackupReminder(false);
                    return;
                }

                // Check if user has already dismissed the reminder for this wallet
                const dismissed = await wallet.getMldsaBackupDismissed(currentAccount.pubkey);
                setShowMldsaBackupReminder(!dismissed);
            } catch {
                setShowMldsaBackupReminder(false);
            }
        };
        void checkMldsaBackupReminder();
    }, [currentAccount.pubkey, currentKeyring.type, needsQuantumMigration, wallet]);

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
        })();
    }, [addressSummary, currentAccount, dispatch, wallet]);

    useEffect(() => {
        void fetchBalance().catch((err: unknown) => {
            console.error('[WalletTabScreen] Balance fetch failed:', err);
        });
    }, [fetchBalance]);

    const walletHealthChecks = useMemo(() => {
        // Only evaluate once balance data is loaded for the current account
        if (currentAccount.address !== addressSummary.address) return [];

        // If we can show popup (no other popup displayed and not badge only),
        // find the most important failed wallet health check.
        const noPopups = !healthBadgeOnly && !showMldsaBackupReminder && !showDuplicationAlert;
        const checks = getWalletHealthChecks(accountBalance);
        const check = checks.find((w) => w.show && noPopups && mayShowWalletHealth(w.type));
        setShowHealthPopup(check);
        // In any case, return the full health check diagnostic
        return checks;
    }, [
        accountBalance,
        addressSummary.address,
        currentAccount.address,
        healthBadgeOnly,
        lastShow,
        showMldsaBackupReminder,
        showDuplicationAlert
    ]);

    // Helper function to check if there are CSV balances
    const cSVBalances = () => {
        const csv75Total = BitcoinUtils.expandToDecimals(accountBalance.csv75_total_amount || '0', 8);
        const csv3Total = BitcoinUtils.expandToDecimals(accountBalance.csv3_total_amount || '0', 8);
        const csv2Total = BitcoinUtils.expandToDecimals(accountBalance.csv2_total_amount || '0', 8);
        const csv1Total = BitcoinUtils.expandToDecimals(accountBalance.csv1_total_amount || '0', 8);
        return csv75Total + csv3Total + csv2Total + csv1Total;
    };

    const totalBalance = useMemo(() => {
        const main = BitcoinUtils.expandToDecimals(accountBalance.btc_total_amount || '0', 8);
        const total = main + cSVBalances();
        return BitcoinUtils.formatUnits(total, 8).replace(/\.?0+$/, '') || '0';
    }, [accountBalance]);

    // Helper function to check if there are CSV balances
    const hasCSVBalances = () => {
        return cSVBalances() > 0n;
    };

    // Handle duplication resolution navigation
    const handleDuplicationResolve = useCallback(() => {
        setShowDuplicationAlert(false);
        navigate(RouteTypes.DuplicationResolutionScreen);
    }, [navigate]);

    const [domainTermsVisible, setDomainTermsVisible] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(TOS_DOMAIN_ACCEPTED_KEY) !== '1';
    });
    const [showDomainTerms, setShowDomainTerms] = useState(false);

    const forceShowHealthPopup = (type: WalletHealthCheck) => {
        setShowHealthPopup(type);
    };

    const dismissHealthPopup = () => {
        setShowHealthPopup(undefined);
        void updateWalletHealthShowTime(showHealthPopup?.type);
    };

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

                    <AccountSelect
                        rightExtra={
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBalanceDetails(true);
                                }}
                                style={{
                                    padding: '4px 10px',
                                    background: colors.containerBgFaded,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    transition: 'all 0.15s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    flexShrink: 0
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
                                <DownOutlined style={{ fontSize: 6 }} />
                            </button>
                        }
                    />

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
                        <ParticleField count={25} speed={0.22} />
                        {/*
                    <AddressBar
                        csv75_total_amount={accountBalance.csv75_total_amount}
                        csv75_unlocked_amount={accountBalance.csv75_unlocked_amount}
                        csv75_locked_amount={accountBalance.csv75_locked_amount}
                        csv3_total_amount={accountBalance.csv3_total_amount}
                        csv3_unlocked_amount={accountBalance.csv3_unlocked_amount}
                        csv3_locked_amount={accountBalance.csv3_locked_amount}
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
                                padding: '20px 20px 0px',
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
                                {/* UTXO warning / limit banners */}
                                {(() => {
                                    const { hasReachedWarning, warningThreshold } = checkUTXOWarning(accountBalance);
                                    const { hasReachedLimit, consolidationLimit } = checkUTXOLimit(accountBalance);

                                    if (hasReachedLimit) {
                                        return (
                                            <div
                                                style={{
                                                    background: '#3b1111',
                                                    borderRadius: '10px',
                                                    padding: '12px',
                                                    marginBottom: '12px',
                                                    maxWidth: '320px',
                                                    margin: '0 auto 12px'
                                                }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        marginBottom: '6px'
                                                    }}>
                                                    <WarningOutlined style={{ fontSize: 13, color: colors.error }} />
                                                    <span
                                                        style={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            color: colors.error
                                                        }}>
                                                        UTXO Limit Reached
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '10px',
                                                        color: '#ccc',
                                                        lineHeight: '1.5',
                                                        marginBottom: '10px'
                                                    }}>
                                                    Balance incomplete (2,000+ UTXOs). Consolidate to restore full
                                                    balance visibility.
                                                </div>
                                                <button
                                                    disabled={consolidateLoading}
                                                    onClick={() => {
                                                        setConsolidateLoading(true);
                                                        void navigateToConsolidation().finally(() =>
                                                            setConsolidateLoading(false)
                                                        );
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        background: consolidateLoading ? colors.buttonBg : colors.error,
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: consolidateLoading ? 'not-allowed' : 'pointer',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        color: consolidateLoading ? colors.textFaded : '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}>
                                                    {consolidateLoading && <LoadingOutlined style={{ fontSize: 12 }} />}
                                                    {consolidateLoading
                                                        ? 'Loading UTXOs...'
                                                        : `Consolidate ${consolidationLimit} UTXOs`}
                                                </button>
                                            </div>
                                        );
                                    }

                                    if (!hasReachedWarning) return null;

                                    const errorThreshold = UTXO_CONFIG.ERROR_THRESHOLD;
                                    const hasReachedError =
                                        accountBalance.unspent_utxos_count >= errorThreshold ||
                                        accountBalance.csv75_locked_utxos_count >= errorThreshold ||
                                        accountBalance.csv75_unlocked_utxos_count >= errorThreshold ||
                                        accountBalance.csv3_locked_utxos_count >= errorThreshold ||
                                        accountBalance.csv3_unlocked_utxos_count >= errorThreshold ||
                                        accountBalance.csv2_locked_utxos_count >= errorThreshold ||
                                        accountBalance.csv2_unlocked_utxos_count >= errorThreshold ||
                                        accountBalance.csv1_locked_utxos_count >= errorThreshold ||
                                        accountBalance.csv1_unlocked_utxos_count >= errorThreshold ||
                                        accountBalance.p2wda_utxos_count >= errorThreshold ||
                                        accountBalance.unspent_p2wda_utxos_count >= errorThreshold;

                                    const bg = hasReachedError ? '#3b1111' : '#3b2e11';
                                    const accent = hasReachedError ? colors.error : colors.warning;

                                    return (
                                        <div
                                            style={{
                                                background: bg,
                                                borderRadius: '10px',
                                                padding: '12px',
                                                marginBottom: '12px',
                                                maxWidth: '320px',
                                                margin: '0 auto 12px'
                                            }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    marginBottom: '6px'
                                                }}>
                                                <WarningOutlined style={{ fontSize: 13, color: accent }} />
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: accent }}>
                                                    High UTXO Count
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '10px',
                                                    color: '#ccc',
                                                    lineHeight: '1.5',
                                                    marginBottom: '10px'
                                                }}>
                                                {warningThreshold}+ UTXOs in a category. Consolidate to avoid exceeding
                                                the 2,000 limit.
                                            </div>
                                            <button
                                                disabled={consolidateLoading}
                                                onClick={() => {
                                                    setConsolidateLoading(true);
                                                    void navigateToConsolidation().finally(() =>
                                                        setConsolidateLoading(false)
                                                    );
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    background: consolidateLoading ? colors.buttonBg : accent,
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: consolidateLoading ? 'not-allowed' : 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: consolidateLoading ? colors.textFaded : '#000',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}>
                                                {consolidateLoading && <LoadingOutlined style={{ fontSize: 12 }} />}
                                                {consolidateLoading ? 'Loading UTXOs...' : 'Consolidate UTXOs'}
                                            </button>
                                        </div>
                                    );
                                })()}

                                {/* Optimize - absolute top right */}
                                <Tooltip title="Optimize wallet UTXOs for better performance">
                                    <button
                                        onClick={() => navigate(RouteTypes.UTXOOptimizeScreen)}
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            padding: '3px 9px',
                                            background: colors.containerBgFaded,
                                            border: `1px solid ${colors.containerBorder}`,
                                            borderRadius: '20px',
                                            cursor: 'pointer',
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: colors.textFaded,
                                            transition: 'all 0.15s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            zIndex: 1
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

                                {/* Total Balance Label */}
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: colors.textFaded,
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '2px'
                                    }}>
                                    TOTAL BALANCE
                                </div>

                                {/* Balance */}
                                <div style={{ position: 'relative' }}>
                                    <BtcDisplay balance={totalBalance} />
                                    {healthBadgeOnly && (
                                        <WalletHealthBadge checks={walletHealthChecks} onClick={forceShowHealthPopup} />
                                    )}
                                </div>

                                <BtcUsd
                                    sats={amountToSatoshis(totalBalance)}
                                    textCenter
                                    size={'sm'}
                                    style={{ marginBottom: '4px' }}
                                />

                                {/* Metadata: CSV Badge, MLDSA Key, and Bitcoin Address */}
                                {
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginTop: '10px'
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

                                        {/* MLDSA Key and Bitcoin Address - unified input group */}
                                        {!isSimpleMode && (
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'stretch',
                                                    background: colors.containerBgFaded,
                                                    border: `1px solid ${colors.containerBorder}`,
                                                    borderRadius: '10px',
                                                    overflow: 'hidden'
                                                }}>
                                                {/* MLDSA Key - only show if wallet is migrated */}
                                                {untweakedPublicKey.mldsa && (
                                                    <Tooltip
                                                        title="Click to copy MLDSA public key hash"
                                                        placement="top">
                                                        <button
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '5px 10px',
                                                                background: 'rgba(139, 92, 246, 0.1)',
                                                                border: 'none',
                                                                borderRight: `1px solid ${colors.containerBorder}`,
                                                                cursor: 'pointer',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                await copyToClipboard(mldsaHashedPublicKey);
                                                                tools.toastSuccess('MLDSA key copied');
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background =
                                                                    'rgba(139, 92, 246, 0.2)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background =
                                                                    'rgba(139, 92, 246, 0.1)';
                                                            }}>
                                                            <span
                                                                style={{
                                                                    fontSize: '9px',
                                                                    color: '#8B5CF6',
                                                                    fontWeight: 700
                                                                }}>
                                                                MLDSA
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: '10px',
                                                                    color: '#dbdbdb',
                                                                    fontFamily: 'monospace',
                                                                    opacity: 0.8
                                                                }}>
                                                                {mldsaHashedPublicKey.slice(0, 6)}...
                                                                {mldsaHashedPublicKey.slice(-4)}
                                                            </span>
                                                            <CopyOutlined
                                                                style={{ fontSize: 9, color: '#dbdbdb', opacity: 0.4 }}
                                                            />
                                                        </button>
                                                    </Tooltip>
                                                )}

                                                {/* Bitcoin Address */}
                                                <Tooltip title="Click to copy Bitcoin address" placement="top">
                                                    <button
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '5px 10px',
                                                            background: `${colors.main}15`,
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.15s'
                                                        }}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            await copyToClipboard(bitcoinAddress);
                                                            tools.toastSuccess('Address copied');
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = `${colors.main}28`;
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = `${colors.main}15`;
                                                        }}>
                                                        <span
                                                            style={{
                                                                fontSize: '9px',
                                                                color: colors.main,
                                                                fontWeight: 700
                                                            }}>
                                                            BTC
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '10px',
                                                                color: '#dbdbdb',
                                                                fontFamily: 'monospace',
                                                                opacity: 0.8
                                                            }}>
                                                            {bitcoinAddress.slice(0, 6)}...{bitcoinAddress.slice(-4)}
                                                        </span>
                                                        <CopyOutlined
                                                            style={{ fontSize: 9, color: '#dbdbdb', opacity: 0.4 }}
                                                        />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>
                                }
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '12px 12px 0px'
                            }}>
                            <ActionButton
                                label="Receive"
                                icon={<QrcodeOutlined style={{ fontSize: 20, color: colors.text }} />}
                                onClick={() => navigate(RouteTypes.ReceiveSelectScreen)}
                            />

                            <ActionButton
                                label="Send"
                                icon={<SendOutlined style={{ fontSize: 20, color: colors.text }} />}
                                onClick={() => {
                                    resetUiTxCreateScreen();
                                    navigate(RouteTypes.TxCreateScreen);
                                }}
                            />

                            <ActionButton
                                label="Swap"
                                icon={<SwapOutlined style={{ fontSize: 20, color: colors.text }} />}
                                onClick={() => {
                                    window.open('https://motoswap.org', '_blank', 'noopener noreferrer');
                                }}
                            />

                            {btcUnit !== 'BTC' ? (
                                <ActionButton
                                    label="Faucet"
                                    icon={<ExperimentOutlined style={{ fontSize: 20, color: colors.text }} />}
                                    onClick={() => {
                                        window.open(faucetUrl || '', '_blank', 'noopener noreferrer');
                                    }}
                                />
                            ) : (
                                <ActionButton
                                    label="Deploy"
                                    icon={<RocketOutlined style={{ fontSize: 20, color: colors.text }} />}
                                    onClick={() => navigate(RouteTypes.DeployContract)}
                                />
                            )}

                            <ActionButton
                                label="History"
                                icon={<HistoryOutlined style={{ fontSize: 20, color: colors.text }} />}
                                onClick={() => navigate(RouteTypes.HistoryScreen)}
                            />
                        </div>

                        {/* Assign .btc Domain Card - Only show when feature is enabled */}
                        {btcDomainsEnabled && (
                            <div
                                onClick={() =>
                                    domainTermsVisible ? setShowDomainTerms(true) : navigate(RouteTypes.BtcDomainScreen)
                                }
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
                                        .btc Domains
                                    </div>
                                    <div style={{ fontSize: '10px', color: colors.textFaded }}>
                                        Register domains & publish websites
                                    </div>
                                </div>
                                <DownOutlined
                                    style={{ fontSize: 10, color: colors.textFaded, transform: 'rotate(-90deg)' }}
                                />
                            </div>
                        )}

                        {/* Address Rotation Card - Only show when feature and rotation mode are enabled */}
                        {privacyModeEnabled && rotationEnabled && (
                            <div
                                onClick={() => navigate(RouteTypes.AddressRotationScreen)}
                                style={{
                                    margin: '0 12px 12px',
                                    padding: '10px 14px',
                                    background: `linear-gradient(135deg, ${colors.success}15 0%, ${colors.success}08 100%)`,
                                    border: `1px solid ${colors.success}30`,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = `${colors.success}60`;
                                    e.currentTarget.style.background = `linear-gradient(135deg, ${colors.success}20 0%, ${colors.success}10 100%)`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = `${colors.success}30`;
                                    e.currentTarget.style.background = `linear-gradient(135deg, ${colors.success}15 0%, ${colors.success}08 100%)`;
                                }}>
                                <LockOutlined style={{ fontSize: 18, color: colors.success }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                                        Privacy Mode
                                    </div>
                                    <div style={{ fontSize: '10px', color: colors.textFaded }}>
                                        Manage rotating addresses & consolidation
                                    </div>
                                </div>
                                <DownOutlined
                                    style={{ fontSize: 10, color: colors.textFaded, transform: 'rotate(-90deg)' }}
                                />
                            </div>
                        )}
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

                {showMldsaBackupReminder && (
                    <MldsaBackupReminder account={currentAccount} onClose={() => setShowMldsaBackupReminder(false)} />
                )}

                {switchChainModalVisible && (
                    <SwitchChainModal
                        onClose={() => {
                            setSwitchChainModalVisible(false);
                        }}
                    />
                )}
            </Content>

            <BTCDomainModal
                onClose={() => setShowDomainTerms(false)}
                open={domainTermsVisible && showDomainTerms}
                onAccept={() => {
                    setDomainTermsVisible(false);
                    navigate(RouteTypes.BtcDomainScreen);
                }}
            />

            {/* Balance Details Popup */}
            {showBalanceDetails && (
                <BalanceDetailPopup
                    accountBalance={accountBalance}
                    btcUnit={btcUnit}
                    onClose={() => setShowBalanceDetails(false)}
                />
            )}

            {/* Wallet Health Popups - only show when no higher-priority modal is active */}
            {showHealthPopup?.type === 'low-balance' && <LowBalancePopup onClose={dismissHealthPopup} />}

            {showHealthPopup?.type === 'csv-consolidation' && (
                <CsvFundsWarningPopup
                    hasCsv1={!!showHealthPopup.hasCsv1}
                    hasCsv2={!!showHealthPopup.hasCsv2}
                    hasCsv3={!!showHealthPopup.hasCsv3}
                    hasCsv75={!!showHealthPopup.hasCsv75}
                    onClose={dismissHealthPopup}
                />
            )}

            {showHealthPopup?.type === 'low-utxos' && <LowUtxoPopup onClose={dismissHealthPopup} />}

            {/* Duplication Alert Modal - blocks interaction until resolved */}
            {duplicationDetection && showDuplicationAlert && (
                <DuplicationAlertModal detection={duplicationDetection} onResolve={handleDuplicationResolve} />
            )}

            <Footer px="zero" py="zero">
                <NavTabBar tab="home" />
            </Footer>
        </Layout>
    );
}
