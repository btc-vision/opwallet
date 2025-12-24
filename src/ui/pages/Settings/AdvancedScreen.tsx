import { useEffect, useState } from 'react';

import { AddressFlagType, AUTO_LOCKTIMES, DEFAULT_LOCKTIME_ID } from '@/shared/constant';
import { checkAddressFlag } from '@/shared/utils';
import { Column, Content, Header, Layout, OPNetLoader } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { EnableUnconfirmedPopover } from '@/ui/components/EnableUnconfirmedPopover';
import { Popover } from '@/ui/components/Popover';
import { useCurrentAccount, useReloadAccounts } from '@/ui/state/accounts/hooks';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { useAutoLockTimeId } from '@/ui/state/settings/hooks';
import { settingsActions } from '@/ui/state/settings/reducer';
import { useWallet } from '@/ui/utils';
import {
    AppstoreOutlined,
    BugOutlined,
    CheckCircleFilled,
    ClockCircleOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
    LayoutOutlined,
    LoadingOutlined,
    RightOutlined,
    SwapOutlined,
    WarningOutlined
} from '@ant-design/icons';

import { RouteTypes, useNavigate } from '../routeTypes';
import { useKeyringRotationMode } from '@/ui/state/rotation/hooks';

type NotificationWindowMode = 'auto' | 'popup' | 'fullscreen';

const NOTIFICATION_WINDOW_MODES: { id: NotificationWindowMode; label: string; description: string }[] = [
    { id: 'popup', label: 'Popup Window', description: 'Always open as a small popup (recommended)' },
    { id: 'fullscreen', label: 'Fullscreen', description: 'Always open in fullscreen mode' },
    { id: 'auto', label: 'Auto', description: 'Match browser window state (fullscreen if browser is fullscreen)' }
];

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

function AddressRotationSetting() {
    const navigate = useNavigate();
    const { isKeyringRotationMode } = useKeyringRotationMode();

    return (
        <div
            style={{
                background: colors.containerBgFaded,
                borderRadius: '14px',
                overflow: 'hidden'
            }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                }}
                onClick={() => navigate(RouteTypes.AddressRotationScreen)}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.buttonHoverBg;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                }}>
                {/* Icon */}
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}10 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                    }}>
                    <SwapOutlined style={{ fontSize: 18, color: colors.main }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: colors.text,
                            marginBottom: '2px',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Address Rotation
                        {isKeyringRotationMode && (
                            <span
                                style={{
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    color: colors.success,
                                    background: `${colors.success}20`,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase'
                                }}>
                                Permanent
                            </span>
                        )}
                    </div>
                    <div
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded,
                            marginTop: '2px'
                        }}>
                        Privacy mode with one-time receiving addresses
                    </div>
                </div>

                {/* Arrow */}
                <RightOutlined
                    style={{
                        fontSize: 12,
                        color: colors.textFaded
                    }}
                />
            </div>
        </div>
    );
}

export default function AdvancedScreen() {
    const wallet = useWallet();
    const tools = useTools();
    const reloadAccounts = useReloadAccounts();

    const [enableUnconfirmed, setEnableUnconfirmed] = useState(false);
    const [unconfirmedPopoverVisible, setUnconfirmedPopoverVisible] = useState(false);
    const [lockTimePopoverVisible, setLockTimePopoverVisible] = useState(false);
    const [windowModePopoverVisible, setWindowModePopoverVisible] = useState(false);
    const [notificationWindowMode, setNotificationWindowMode] = useState<NotificationWindowMode>('popup');
    const [useSidePanel, setUseSidePanel] = useState(false);
    const [sidePanelLoading, setSidePanelLoading] = useState(false);
    const [testConflictsLoading, setTestConflictsLoading] = useState(false);
    const [clearConflictsLoading, setClearConflictsLoading] = useState(false);
    const autoLockTimeId = useAutoLockTimeId();
    const lockTimeConfig = AUTO_LOCKTIMES[autoLockTimeId] || AUTO_LOCKTIMES[DEFAULT_LOCKTIME_ID];
    const windowModeConfig =
        NOTIFICATION_WINDOW_MODES.find((m) => m.id === notificationWindowMode) || NOTIFICATION_WINDOW_MODES[0];
    const currentAccount = useCurrentAccount();
    const dispatch = useAppDispatch();
    const [init, setInit] = useState(false);

    useEffect(() => {
        const initSettings = async () => {
            const only_confirmed = checkAddressFlag(currentAccount.flag, AddressFlagType.CONFIRMED_UTXO_MODE);
            if (only_confirmed) {
                setEnableUnconfirmed(false);
            } else {
                setEnableUnconfirmed(true);
            }

            // Load notification window mode
            const mode = await wallet.getNotificationWindowMode();
            setNotificationWindowMode(mode);

            // Load side panel preference
            const sidePanel = await wallet.getUseSidePanel();
            setUseSidePanel(sidePanel);

            setInit(true);
        };
        initSettings();
    }, []);

    if (!init) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Advanced" />
                <Content
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '300px'
                    }}>
                    <OPNetLoader size={70} text="Loading" />
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Advanced Settings" />
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '12px',
                    paddingBottom: '40px'
                }}>
                {/* Info Card */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                    <InfoCircleOutlined
                        style={{
                            fontSize: 13,
                            color: colors.textFaded,
                            marginTop: '1px',
                            flexShrink: 0
                        }}
                    />
                    <div>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.text,
                                fontWeight: 500,
                                marginBottom: '3px'
                            }}>
                            Advanced Options
                        </div>
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.textFaded,
                                lineHeight: '1.3'
                            }}>
                            Configure security and wallet behavior settings.
                        </div>
                    </div>
                </div>

                {/* Settings List */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        overflow: 'hidden'
                    }}>
                    {/* Auto Lock Time Setting */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            borderBottom: `1px solid ${colors.containerBorder}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={() => setLockTimePopoverVisible(true)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
                        {/* Icon */}
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: colors.buttonHoverBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '12px'
                            }}>
                            <ClockCircleOutlined style={{ fontSize: 18, color: colors.main }} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Auto-Lock Timer
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.main,
                                    fontWeight: 500
                                }}>
                                {lockTimeConfig.label}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                Automatically lock wallet after inactivity
                            </div>
                        </div>

                        {/* Arrow */}
                        <RightOutlined
                            style={{
                                fontSize: 12,
                                color: colors.textFaded
                            }}
                        />
                    </div>

                    {/* Notification Window Mode Setting */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            borderBottom: `1px solid ${colors.containerBorder}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={() => setWindowModePopoverVisible(true)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
                        {/* Icon */}
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: colors.buttonHoverBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '12px'
                            }}>
                            <AppstoreOutlined style={{ fontSize: 18, color: colors.main }} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Notification Window
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.main,
                                    fontWeight: 500
                                }}>
                                {windowModeConfig.label}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                How transaction approval windows open
                            </div>
                        </div>

                        {/* Arrow */}
                        <RightOutlined
                            style={{
                                fontSize: 12,
                                color: colors.textFaded
                            }}
                        />
                    </div>

                    {/* Side Panel Mode Setting (Chrome only) */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            cursor: sidePanelLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s',
                            opacity: sidePanelLoading ? 0.7 : 1
                        }}
                        onClick={async () => {
                            if (sidePanelLoading) return;
                            setSidePanelLoading(true);
                            try {
                                const newValue = !useSidePanel;
                                await wallet.setUseSidePanel(newValue);
                                setUseSidePanel(newValue);
                                tools.toastSuccess(
                                    newValue
                                        ? 'Side panel enabled. Restart extension to apply.'
                                        : 'Side panel disabled. Restart extension to apply.'
                                );
                            } catch (error) {
                                tools.toastError('Failed to update side panel setting');
                            } finally {
                                setSidePanelLoading(false);
                            }
                        }}
                        onMouseEnter={(e) => {
                            if (!sidePanelLoading) e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
                        {/* Icon */}
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: colors.buttonHoverBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '12px'
                            }}>
                            <LayoutOutlined style={{ fontSize: 18, color: colors.main }} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Side Panel Mode
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: useSidePanel ? colors.success : colors.textFaded,
                                    fontWeight: 500
                                }}>
                                {useSidePanel ? 'Enabled' : 'Disabled'}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                Open as side panel instead of popup (Chrome only)
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <div
                            style={{
                                width: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                background: useSidePanel ? colors.main : colors.buttonBg,
                                position: 'relative',
                                transition: 'background 0.2s',
                                cursor: sidePanelLoading ? 'not-allowed' : 'pointer'
                            }}>
                            <div
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '10px',
                                    background: colors.text,
                                    position: 'absolute',
                                    top: '2px',
                                    left: useSidePanel ? '22px' : '2px',
                                    transition: 'left 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                {sidePanelLoading && <LoadingOutlined style={{ fontSize: 12, color: colors.main }} />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Privacy Section */}
                <div
                    style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: colors.textFaded,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: '20px',
                        marginBottom: '10px',
                        paddingLeft: '4px'
                    }}>
                    Privacy
                </div>

                <AddressRotationSetting />

                {/* Developer Tools Section - Only visible in development builds */}
                {process.env.NODE_ENV !== 'production' && (
                <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.warning,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '10px',
                            paddingLeft: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <BugOutlined style={{ fontSize: 12 }} />
                        Developer Tools (DEV BUILD ONLY)
                    </div>

                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '14px',
                            overflow: 'hidden',
                            border: `1px solid ${colors.warning}30`
                        }}>
                        {/* Create Test Conflicts Button */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 12px',
                                borderBottom: `1px solid ${colors.containerBorder}`,
                                cursor: testConflictsLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                opacity: testConflictsLoading ? 0.7 : 1
                            }}
                            onClick={async () => {
                                if (testConflictsLoading) return;
                                setTestConflictsLoading(true);
                                try {
                                    const result = await wallet.createTestConflicts();
                                    tools.toastSuccess(result.message);
                                    console.log('Test conflicts created:', result.created);
                                    // Reload accounts to show new test wallets
                                    await reloadAccounts();
                                } catch (error) {
                                    tools.toastError(
                                        `Failed to create test conflicts: ${error instanceof Error ? error.message : String(error)}`
                                    );
                                } finally {
                                    setTestConflictsLoading(false);
                                }
                            }}
                            onMouseEnter={(e) => {
                                if (!testConflictsLoading) e.currentTarget.style.background = colors.buttonHoverBg;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}>
                            {/* Icon */}
                            <div
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: `${colors.warning}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px'
                                }}>
                                {testConflictsLoading ? (
                                    <LoadingOutlined style={{ fontSize: 18, color: colors.warning }} />
                                ) : (
                                    <WarningOutlined style={{ fontSize: 18, color: colors.warning }} />
                                )}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: colors.text,
                                        marginBottom: '2px',
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    Create Test Conflicts
                                </div>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: colors.textFaded,
                                        marginTop: '2px'
                                    }}>
                                    Creates duplicate wallets to test conflict resolution
                                </div>
                            </div>

                            {/* Arrow */}
                            <RightOutlined
                                style={{
                                    fontSize: 12,
                                    color: colors.textFaded
                                }}
                            />
                        </div>

                        {/* Clear Test Data Button */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 12px',
                                cursor: clearConflictsLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                opacity: clearConflictsLoading ? 0.7 : 1
                            }}
                            onClick={async () => {
                                if (clearConflictsLoading) return;
                                setClearConflictsLoading(true);
                                try {
                                    await wallet.clearTestConflicts();
                                    tools.toastSuccess('Test data cleared. State reset.');
                                } catch (error) {
                                    tools.toastError(
                                        `Failed to clear: ${error instanceof Error ? error.message : String(error)}`
                                    );
                                } finally {
                                    setClearConflictsLoading(false);
                                }
                            }}
                            onMouseEnter={(e) => {
                                if (!clearConflictsLoading) e.currentTarget.style.background = colors.buttonHoverBg;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}>
                            {/* Icon */}
                            <div
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: `${colors.error}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px'
                                }}>
                                {clearConflictsLoading ? (
                                    <LoadingOutlined style={{ fontSize: 18, color: colors.error }} />
                                ) : (
                                    <DeleteOutlined style={{ fontSize: 18, color: colors.error }} />
                                )}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: colors.text,
                                        marginBottom: '2px',
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    Clear Test Data
                                </div>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: colors.textFaded,
                                        marginTop: '2px'
                                    }}>
                                    Reset duplication state and clear backup
                                </div>
                            </div>

                            {/* Arrow */}
                            <RightOutlined
                                style={{
                                    fontSize: 12,
                                    color: colors.textFaded
                                }}
                            />
                        </div>
                    </div>

                    {/* Warning Note */}
                    <div
                        style={{
                            padding: '10px',
                            background: `${colors.warning}10`,
                            border: `1px solid ${colors.warning}25`,
                            borderRadius: '8px',
                            marginTop: '10px'
                        }}>
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.warning,
                                lineHeight: '1.4'
                            }}>
                            <strong>Testing:</strong> After creating test conflicts, lock and unlock your wallet to
                            trigger the detection modal.
                        </div>
                    </div>
                </div>
                )}
            </div>

            {unconfirmedPopoverVisible ? (
                <EnableUnconfirmedPopover
                    onClose={() => setUnconfirmedPopoverVisible(false)}
                    onConfirm={async () => {
                        let _currentAccount = currentAccount;
                        _currentAccount = await wallet.addAddressFlag(
                            _currentAccount,
                            AddressFlagType.DISABLE_AUTO_SWITCH_CONFIRMED
                        );
                        _currentAccount = await wallet.removeAddressFlag(
                            _currentAccount,
                            AddressFlagType.CONFIRMED_UTXO_MODE
                        );
                        dispatch(accountActions.setCurrent(_currentAccount));
                        setEnableUnconfirmed(true);
                        setUnconfirmedPopoverVisible(false);
                    }}
                />
            ) : null}

            {lockTimePopoverVisible ? (
                <LockTimePopover
                    onNext={() => setLockTimePopoverVisible(false)}
                    onCancel={() => setLockTimePopoverVisible(false)}
                />
            ) : null}

            {windowModePopoverVisible ? (
                <WindowModePopover
                    currentMode={notificationWindowMode}
                    onNext={(mode) => {
                        setNotificationWindowMode(mode);
                        setWindowModePopoverVisible(false);
                    }}
                    onCancel={() => setWindowModePopoverVisible(false)}
                />
            ) : null}
        </Layout>
    );
}

export const LockTimePopover = ({ onNext, onCancel }: { onNext: () => void; onCancel: () => void }) => {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const autoLockTimeId = useAutoLockTimeId();
    const dispatch = useAppDispatch();
    const wallet = useWallet();
    const tools = useTools();

    return (
        <Popover onClose={onCancel}>
            <Column
                style={{
                    width: '100%',
                    maxHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                {/* Fixed Header */}
                <div
                    style={{
                        textAlign: 'center',
                        paddingBottom: '12px',
                        borderBottom: `1px solid ${colors.containerBorder}`,
                        flexShrink: 0
                    }}>
                    <div
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: colors.text,
                            marginBottom: '4px',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Auto-Lock Timer
                    </div>
                    <div
                        style={{
                            fontSize: '12px',
                            color: colors.textFaded
                        }}>
                        Choose when to automatically lock your wallet
                    </div>
                </div>

                {/* Scrollable Options Container */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        margin: '12px 0',
                        paddingRight: '4px',
                        minHeight: 0,
                        maxHeight: '240px'
                    }}>
                    <style>{`
                        /* Custom Scrollbar Styles */
                        div::-webkit-scrollbar {
                            width: 6px;
                        }
                        
                        div::-webkit-scrollbar-track {
                            background: ${colors.containerBgFaded};
                            border-radius: 3px;
                        }
                        
                        div::-webkit-scrollbar-thumb {
                            background: ${colors.buttonBg};
                            border-radius: 3px;
                            transition: background 0.2s;
                        }
                        
                        div::-webkit-scrollbar-thumb:hover {
                            background: ${colors.main}80;
                        }
                        
                        /* Scroll Shadow Effects */
                        .scroll-container {
                            position: relative;
                        }
                        
                        .scroll-container::before,
                        .scroll-container::after {
                            content: '';
                            position: absolute;
                            left: 0;
                            right: 0;
                            height: 20px;
                            pointer-events: none;
                            z-index: 1;
                        }
                        
                        .scroll-container::before {
                            top: 0;
                            background: linear-gradient(to bottom, ${colors.background}, transparent);
                        }
                        
                        .scroll-container::after {
                            bottom: 0;
                            background: linear-gradient(to top, ${colors.background}, transparent);
                        }
                    `}</style>

                    {AUTO_LOCKTIMES.map((option, index) => {
                        const isSelected = option.id === autoLockTimeId;
                        const isHovered = option.id === selectedId;

                        return (
                            <div
                                key={option.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px',
                                    marginBottom: '6px',
                                    marginRight: '2px',
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`
                                        : isHovered
                                          ? colors.buttonBg
                                          : colors.buttonHoverBg,
                                    border: `1px solid ${isSelected ? colors.main : 'transparent'}`,
                                    borderRadius: '10px',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                    position: 'relative',
                                    opacity: isProcessing ? 0.7 : 1
                                }}
                                onClick={async () => {
                                    if (option.id === autoLockTimeId || isProcessing) return;

                                    setIsProcessing(true);
                                    try {
                                        await wallet.setAutoLockTimeId(option.id);
                                        dispatch(settingsActions.updateSettings({ autoLockTimeId: option.id }));
                                        tools.toastSuccess(`Auto-lock time changed to ${option.label}`);
                                        onNext();
                                    } catch (error) {
                                        tools.toastError('Failed to update auto-lock time');
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                onMouseEnter={() => !isProcessing && setSelectedId(option.id)}
                                onMouseLeave={() => setSelectedId(null)}>
                                {/* Selected indicator */}
                                {isSelected && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: '3px',
                                            background: colors.main,
                                            borderRadius: '10px 0 0 10px'
                                        }}
                                    />
                                )}

                                {/* Timer Icon */}
                                <div
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        minWidth: '30px',
                                        borderRadius: '8px',
                                        background: isSelected ? `${colors.main}20` : colors.containerBgFaded,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '10px'
                                    }}>
                                    {isProcessing && option.id === selectedId ? (
                                        <LoadingOutlined
                                            style={{
                                                fontSize: 14,
                                                color: colors.main
                                            }}
                                        />
                                    ) : (
                                        <ClockCircleOutlined
                                            style={{
                                                fontSize: 14,
                                                color: isSelected ? colors.main : colors.textFaded
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Label */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: isSelected ? 600 : 500,
                                            color: colors.text,
                                            fontFamily: 'Inter-Regular, serif',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                        {option.label}
                                    </div>
                                    {option.id === 0 && (
                                        <div
                                            style={{
                                                fontSize: '10px',
                                                color: colors.warning,
                                                marginTop: '1px',
                                                fontStyle: 'italic'
                                            }}>
                                            More secure but less convenient
                                        </div>
                                    )}
                                </div>

                                {/* Check Icon */}
                                {isSelected && (
                                    <CheckCircleFilled
                                        style={{
                                            fontSize: 14,
                                            color: colors.main,
                                            marginLeft: '8px'
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {/* Scroll Indicator - shows when there are more items */}
                    {AUTO_LOCKTIMES.length > 5 && (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '8px',
                                fontSize: '10px',
                                color: colors.textFaded,
                                fontStyle: 'italic'
                            }}>
                            Scroll for more options
                        </div>
                    )}
                </div>

                {/* Fixed Cancel Button */}
                <button
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: colors.buttonHoverBg,
                        border: `1px solid ${colors.containerBorder}`,
                        borderRadius: '10px',
                        color: colors.text,
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'Inter-Regular, serif',
                        flexShrink: 0
                    }}
                    onClick={onCancel}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.buttonBg;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.buttonHoverBg;
                    }}>
                    Cancel
                </button>
            </Column>
        </Popover>
    );
};

export const WindowModePopover = ({
    currentMode,
    onNext,
    onCancel
}: {
    currentMode: NotificationWindowMode;
    onNext: (mode: NotificationWindowMode) => void;
    onCancel: () => void;
}) => {
    const [selectedId, setSelectedId] = useState<NotificationWindowMode | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const wallet = useWallet();
    const tools = useTools();

    return (
        <Popover onClose={onCancel}>
            <Column
                style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                {/* Header */}
                <div
                    style={{
                        textAlign: 'center',
                        paddingBottom: '12px',
                        borderBottom: `1px solid ${colors.containerBorder}`,
                        flexShrink: 0
                    }}>
                    <div
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: colors.text,
                            marginBottom: '4px',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Notification Window
                    </div>
                    <div
                        style={{
                            fontSize: '12px',
                            color: colors.textFaded
                        }}>
                        Choose how transaction approval windows open
                    </div>
                </div>

                {/* Options */}
                <div style={{ margin: '12px 0' }}>
                    {NOTIFICATION_WINDOW_MODES.map((option) => {
                        const isSelected = option.id === currentMode;
                        const isHovered = option.id === selectedId;

                        return (
                            <div
                                key={option.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px',
                                    marginBottom: '6px',
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`
                                        : isHovered
                                          ? colors.buttonBg
                                          : colors.buttonHoverBg,
                                    border: `1px solid ${isSelected ? colors.main : 'transparent'}`,
                                    borderRadius: '10px',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                    position: 'relative',
                                    opacity: isProcessing ? 0.7 : 1
                                }}
                                onClick={async () => {
                                    if (option.id === currentMode || isProcessing) return;

                                    setIsProcessing(true);
                                    try {
                                        await wallet.setNotificationWindowMode(option.id);
                                        tools.toastSuccess(`Window mode changed to ${option.label}`);
                                        onNext(option.id);
                                    } catch (error) {
                                        tools.toastError('Failed to update window mode');
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                onMouseEnter={() => !isProcessing && setSelectedId(option.id)}
                                onMouseLeave={() => setSelectedId(null)}>
                                {/* Selected indicator */}
                                {isSelected && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: '3px',
                                            background: colors.main,
                                            borderRadius: '10px 0 0 10px'
                                        }}
                                    />
                                )}

                                {/* Icon */}
                                <div
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        minWidth: '30px',
                                        borderRadius: '8px',
                                        background: isSelected ? `${colors.main}20` : colors.containerBgFaded,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '10px'
                                    }}>
                                    {isProcessing && option.id === selectedId ? (
                                        <LoadingOutlined
                                            style={{
                                                fontSize: 14,
                                                color: colors.main
                                            }}
                                        />
                                    ) : (
                                        <AppstoreOutlined
                                            style={{
                                                fontSize: 14,
                                                color: isSelected ? colors.main : colors.textFaded
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Label */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: isSelected ? 600 : 500,
                                            color: colors.text,
                                            fontFamily: 'Inter-Regular, serif'
                                        }}>
                                        {option.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '10px',
                                            color: colors.textFaded,
                                            marginTop: '1px'
                                        }}>
                                        {option.description}
                                    </div>
                                </div>

                                {/* Check Icon */}
                                {isSelected && (
                                    <CheckCircleFilled
                                        style={{
                                            fontSize: 14,
                                            color: colors.main,
                                            marginLeft: '8px'
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Cancel Button */}
                <button
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: colors.buttonHoverBg,
                        border: `1px solid ${colors.containerBorder}`,
                        borderRadius: '10px',
                        color: colors.text,
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'Inter-Regular, serif',
                        flexShrink: 0
                    }}
                    onClick={onCancel}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.buttonBg;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.buttonHoverBg;
                    }}>
                    Cancel
                </button>
            </Column>
        </Popover>
    );
};
