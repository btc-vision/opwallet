import { useEffect, useState } from 'react';

import { AddressFlagType, AUTO_LOCKTIMES, DEFAULT_LOCKTIME_ID } from '@/shared/constant';
import { checkAddressFlag } from '@/shared/utils';
import { Column, Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { EnableUnconfirmedPopover } from '@/ui/components/EnableUnconfirmedPopover';
import { Popover } from '@/ui/components/Popover';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { useAutoLockTimeId } from '@/ui/state/settings/hooks';
import { settingsActions } from '@/ui/state/settings/reducer';
import { useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    ClockCircleOutlined,
    InfoCircleOutlined,
    LoadingOutlined,
    RightOutlined
} from '@ant-design/icons';

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

export default function AdvancedScreen() {
    const wallet = useWallet();
    const [enableUnconfirmed, setEnableUnconfirmed] = useState(false);
    const [unconfirmedPopoverVisible, setUnconfirmedPopoverVisible] = useState(false);
    const [lockTimePopoverVisible, setLockTimePopoverVisible] = useState(false);
    const autoLockTimeId = useAutoLockTimeId();
    const lockTimeConfig = AUTO_LOCKTIMES[autoLockTimeId] || AUTO_LOCKTIMES[DEFAULT_LOCKTIME_ID];
    const currentAccount = useCurrentAccount();
    const dispatch = useAppDispatch();
    const [init, setInit] = useState(false);

    useEffect(() => {
        setInit(true);
        const only_confirmed = checkAddressFlag(currentAccount.flag, AddressFlagType.CONFIRMED_UTXO_MODE);
        if (only_confirmed) {
            setEnableUnconfirmed(false);
        } else {
            setEnableUnconfirmed(true);
        }
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
                    <LoadingOutlined style={{ fontSize: 24, color: colors.main }} />
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Advanced Settings" />
            <Content style={{ padding: '12px' }}>
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
                </div>
            </Content>

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
