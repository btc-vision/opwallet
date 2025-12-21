import VirtualList from 'rc-virtual-list';
import React, { forwardRef, useMemo, useState } from 'react';

import { KEYRING_TYPE } from '@/shared/constant';
import { WalletKeyring } from '@/shared/types';
import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { RemoveWalletPopover } from '@/ui/components/RemoveWalletPopover';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { useCurrentKeyring, useKeyrings } from '@/ui/state/keyrings/hooks';
import { keyringsActions } from '@/ui/state/keyrings/reducer';
import { shortAddress, useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    DeleteOutlined,
    EditOutlined,
    KeyOutlined,
    LockOutlined,
    MoreOutlined,
    PlusOutlined,
    WalletOutlined
} from '@ant-design/icons';

import { RouteTypes, useNavigate } from '../routeTypes';

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

export interface ItemData {
    key: string;
    keyring: WalletKeyring;
}

interface MyItemProps {
    keyring: WalletKeyring;
    autoNav?: boolean;
}

export function MyItem({ keyring, autoNav }: MyItemProps, ref: React.Ref<HTMLDivElement>) {
    const navigate = useNavigate();
    const currentKeyring = useCurrentKeyring();
    const selected = currentKeyring.index === keyring?.index;
    const wallet = useWallet();
    const keyrings = useKeyrings();
    const dispatch = useAppDispatch();
    const tools = useTools();

    const displayAddress = useMemo(() => {
        if (!keyring.accounts[0]) {
            return 'Invalid';
        }
        const address = keyring.accounts[0].address;
        return shortAddress(address, 6);
    }, [keyring]);

    const [optionsVisible, setOptionsVisible] = useState(false);
    const [removeVisible, setRemoveVisible] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

    const handleOptionsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        // Calculate if dropdown should open upward or downward
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 200; // Approximate height of dropdown

        if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
            setDropdownPosition('top');
        } else {
            setDropdownPosition('bottom');
        }

        setOptionsVisible(!optionsVisible);
    };

    const getWalletTypeIcon = () => {
        switch (keyring.type) {
            case KEYRING_TYPE.HdKeyring:
                return '🔑';
            case KEYRING_TYPE.SimpleKeyring:
                return '🔐';
            case KEYRING_TYPE.KeystoneKeyring:
                return '🗝️';
            default:
                return '🔑';
        }
    };

    const getWalletTypeLabel = () => {
        switch (keyring.type) {
            case KEYRING_TYPE.HdKeyring:
                return 'HD Wallet';
            case KEYRING_TYPE.SimpleKeyring:
                return 'Simple Wallet';
            case KEYRING_TYPE.KeystoneKeyring:
                return 'Hardware Wallet';
            default:
                return 'Wallet';
        }
    };

    return (
        <>
            <div
                ref={ref}
                style={{
                    position: 'relative',
                    marginBottom: '8px',
                    borderRadius: '12px',
                    border: `1px solid ${selected ? colors.main : colors.containerBorder}`,
                    background: selected
                        ? `linear-gradient(135deg, ${colors.main}10 0%, ${colors.main}05 100%)`
                        : colors.buttonHoverBg,
                    transition: 'all 0.2s'
                }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        cursor: 'pointer'
                    }}
                    onClick={async () => {
                        if (!keyring.accounts[0]) {
                            tools.toastError('Invalid wallet, please remove it and add new one');
                            return;
                        }
                        if (currentKeyring.key !== keyring.key) {
                            await wallet.changeKeyring(keyring);
                            dispatch(keyringsActions.setCurrent(keyring));
                            const _currentAccount = await wallet.getCurrentAccount();
                            dispatch(accountActions.setCurrent(_currentAccount));
                        }
                        if (autoNav) navigate(RouteTypes.MainScreen);
                    }}
                    onMouseEnter={(e) => {
                        if (!selected) {
                            if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.style.background = colors.buttonBg;
                            }
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!selected) {
                            if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.style.background = colors.buttonHoverBg;
                            }
                        }
                    }}>
                    {/* Wallet Icon */}
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: selected ? colors.main : colors.containerBgFaded,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            position: 'relative'
                        }}>
                        <WalletOutlined
                            style={{
                                fontSize: 18,
                                color: selected ? colors.background : colors.text
                            }}
                        />
                        {selected && (
                            <CheckCircleFilled
                                style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    fontSize: 14,
                                    color: colors.success,
                                    background: colors.background,
                                    borderRadius: '50%'
                                }}
                            />
                        )}
                    </div>

                    {/* Wallet Info */}
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: colors.text,
                                marginBottom: '2px',
                                fontFamily: 'Inter-Regular, serif'
                            }}>
                            {keyring.alianName}
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                fontFamily: 'monospace',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            {displayAddress}
                            <span
                                style={{
                                    fontSize: '10px',
                                    padding: '1px 4px',
                                    background: colors.containerBgFaded,
                                    borderRadius: '4px',
                                    color: colors.main
                                }}>
                                {getWalletTypeLabel()}
                            </span>
                        </div>
                    </div>

                    {/* Options Button */}
                    <button
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: optionsVisible ? colors.buttonBg : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                        }}
                        onClick={handleOptionsClick}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                        }}
                        onMouseLeave={(e) => {
                            if (!optionsVisible) {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}>
                        <MoreOutlined style={{ fontSize: 16, color: colors.textFaded }} />
                    </button>
                </div>

                {/* Options Dropdown */}
                {optionsVisible && (
                    <>
                        <div
                            style={{
                                position: 'fixed',
                                zIndex: 999, // Below the dropdown menu
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                background: 'transparent'
                            }}
                            onClick={() => setOptionsVisible(false)}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                ...(dropdownPosition === 'top'
                                    ? {
                                          bottom: '52px',
                                          transformOrigin: 'bottom right'
                                      }
                                    : {
                                          top: '52px',
                                          transformOrigin: 'top right'
                                      }),
                                right: '12px',
                                background: colors.containerBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '10px',
                                overflow: 'hidden',
                                zIndex: 1000,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                minWidth: '200px',
                                animation: `${dropdownPosition === 'top' ? 'slideUp' : 'slideDown'} 0.2s ease-out`
                            }}>
                            <button
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: `1px solid ${colors.containerBorder}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.15s'
                                }}
                                onClick={() => {
                                    setOptionsVisible(false);
                                    navigate(RouteTypes.EditWalletNameScreen, { keyring });
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}>
                                <EditOutlined style={{ fontSize: 14, color: colors.text }} />
                                <span
                                    style={{
                                        fontSize: '13px',
                                        color: colors.text,
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    Edit Name
                                </span>
                            </button>

                            {keyring.type === KEYRING_TYPE.HdKeyring && (
                                <button
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: `1px solid ${colors.containerBorder}`,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        transition: 'all 0.15s'
                                    }}
                                    onClick={() => {
                                        setOptionsVisible(false);
                                        navigate(RouteTypes.ExportMnemonicsScreen, { keyring });
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = colors.buttonHoverBg;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                    }}>
                                    <LockOutlined style={{ fontSize: 14, color: colors.text }} />
                                    <span
                                        style={{
                                            fontSize: '13px',
                                            color: colors.text,
                                            fontFamily: 'Inter-Regular, serif'
                                        }}>
                                        Show Seed Phrase
                                    </span>
                                </button>
                            )}

                            {keyring.type !== KEYRING_TYPE.HdKeyring &&
                                keyring.type !== KEYRING_TYPE.KeystoneKeyring && (
                                    <button
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: `1px solid ${colors.containerBorder}`,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.15s'
                                        }}
                                        onClick={() => {
                                            setOptionsVisible(false);
                                            navigate(RouteTypes.ExportPrivateKeyScreen, {
                                                account: keyring.accounts[0]
                                            });
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = colors.buttonHoverBg;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}>
                                        <KeyOutlined style={{ fontSize: 14, color: colors.text }} />
                                        <span
                                            style={{
                                                fontSize: '13px',
                                                color: colors.text,
                                                fontFamily: 'Inter-Regular, serif'
                                            }}>
                                            Export Private Key
                                        </span>
                                    </button>
                                )}

                            <button
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.15s'
                                }}
                                onClick={() => {
                                    if (keyrings.length == 1) {
                                        tools.toastError('Cannot remove the last wallet');
                                        return;
                                    }
                                    setRemoveVisible(true);
                                    setOptionsVisible(false);
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `${colors.error}20`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}>
                                <DeleteOutlined style={{ fontSize: 14, color: colors.error }} />
                                <span
                                    style={{
                                        fontSize: '13px',
                                        color: colors.error,
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    Remove Wallet
                                </span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {removeVisible && (
                <RemoveWalletPopover
                    keyring={keyring}
                    onClose={() => {
                        setRemoveVisible(false);
                    }}
                />
            )}
        </>
    );
}

export default function SwitchKeyringScreen() {
    const navigate = useNavigate();
    const keyrings = useKeyrings();

    const items = useMemo(() => {
        const _items: ItemData[] = keyrings.map((v) => {
            return {
                key: v.key,
                keyring: v
            };
        });
        return _items;
    }, [keyrings]);

    const ForwardMyItem = forwardRef(MyItem);

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Wallets"
                RightComponent={
                    <button
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: colors.main,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => {
                            navigate(RouteTypes.AddKeyringScreen);
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(243, 116, 19, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <PlusOutlined style={{ fontSize: 16, color: colors.background }} />
                    </button>
                }
            />
            <Content style={{ padding: '12px' }}>
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        padding: '8px',
                        overflow: 'visible' // Changed from default to visible
                    }}>
                    <VirtualList
                        data={items}
                        data-id="list"
                        itemHeight={80}
                        itemKey={(item) => item.key}
                        style={{
                            boxSizing: 'border-box',
                            overflow: 'visible' // Allow dropdown to show outside
                        }}>
                        {(item) => <ForwardMyItem keyring={item.keyring} autoNav={true} />}
                    </VirtualList>
                </div>

                {/* Add Wallet Hint */}
                {keyrings.length === 0 && (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '40px 20px'
                        }}>
                        <WalletOutlined
                            style={{
                                fontSize: 48,
                                color: colors.textFaded,
                                marginBottom: '16px'
                            }}
                        />
                        <div
                            style={{
                                fontSize: '14px',
                                color: colors.text,
                                marginBottom: '8px',
                                fontWeight: 500
                            }}>
                            No wallets yet
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded
                            }}>
                            Tap the + button to add a wallet
                        </div>
                    </div>
                )}
            </Content>
        </Layout>
    );
}
