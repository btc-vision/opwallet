import VirtualList from 'rc-virtual-list';
import { forwardRef, useMemo, useState } from 'react';

import { KEYRING_CLASS, KEYRING_TYPE } from '@/shared/constant';
import { Account } from '@/shared/types';
import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import { copyToClipboard, shortAddress, useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    CopyOutlined,
    EditOutlined,
    KeyOutlined,
    MoreOutlined,
    PlusOutlined,
    UserOutlined
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
    error: '#ef4444'
};

export interface ItemData {
    key: string;
    account?: Account;
}

interface MyItemProps {
    account?: Account;
    autoNav?: boolean;
}

export function MyItem({ account, autoNav }: MyItemProps) {
    const navigate = useNavigate();
    const currentAccount = useCurrentAccount();
    const wallet = useWallet();
    const dispatch = useAppDispatch();
    const keyring = useCurrentKeyring();
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const tools = useTools();

    if (!account) {
        return <div />;
    }

    const selected = currentAccount.pubkey === account.pubkey;

    let path = '';
    if (keyring.type !== KEYRING_CLASS.PRIVATE_KEY && account.index !== undefined) {
        path = `m/${keyring.hdPath}/${account.index}`;
    }

    const handleSelectAccount = async () => {
        if (currentAccount.pubkey !== account.pubkey) {
            await wallet.changeKeyring(keyring, account.index);
            const newCurrentAccount = await wallet.getCurrentAccount();
            dispatch(accountActions.setCurrent(newCurrentAccount));
        }
        if (autoNav) {
            navigate(RouteTypes.MainScreen);
        }
    };

    const handleEditName = () => {
        setOptionsVisible(false);
        navigate(RouteTypes.EditAccountNameScreen, { account });
    };

    const handleCopyAddress = async () => {
        await copyToClipboard(account.address);
        tools.toastSuccess('Copied');
        setOptionsVisible(false);
    };

    const handleExportPrivateKey = () => {
        setOptionsVisible(false);
        navigate(RouteTypes.ExportPrivateKeyScreen, { account });
    };

    return (
        <>
            <div
                style={{
                    position: 'relative',
                    marginBottom: '8px',
                    borderRadius: '12px',
                    border: `1px solid ${selected ? colors.main : colors.containerBorder}`,
                    background: selected
                        ? `linear-gradient(135deg, ${colors.main}10 0%, ${colors.main}05 100%)`
                        : isHovered
                          ? colors.buttonBg
                          : colors.buttonHoverBg,
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                }}
                onClick={handleSelectAccount}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        gap: '12px'
                    }}>
                    {/* Account Icon */}
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: selected ? colors.main : colors.containerBgFaded,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            flexShrink: 0
                        }}>
                        <UserOutlined
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

                    {/* Account Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: colors.text,
                                marginBottom: '2px',
                                fontFamily: 'Inter-Regular, serif'
                            }}>
                            {account.alianName}
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
                            <span>{shortAddress(account.address, 6)}</span>
                            {path && (
                                <span
                                    style={{
                                        fontSize: '10px',
                                        padding: '1px 4px',
                                        background: colors.containerBgFaded,
                                        borderRadius: '4px',
                                        color: colors.main
                                    }}>
                                    {account.index}
                                </span>
                            )}
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
                            transition: 'all 0.15s',
                            flexShrink: 0
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOptionsVisible(!optionsVisible);
                        }}
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
                                zIndex: 998,
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
                                top: '60px',
                                right: '12px',
                                background: colors.containerBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '10px',
                                overflow: 'hidden',
                                zIndex: 999,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                minWidth: '180px'
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
                                    transition: 'all 0.15s',
                                    textAlign: 'left'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditName();
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

                            <button
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom:
                                        account.type !== KEYRING_TYPE.KeystoneKeyring
                                            ? `1px solid ${colors.containerBorder}`
                                            : 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.15s',
                                    textAlign: 'left'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyAddress();
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}>
                                <CopyOutlined style={{ fontSize: 14, color: colors.text }} />
                                <span
                                    style={{
                                        fontSize: '13px',
                                        color: colors.text,
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    Copy Address
                                </span>
                            </button>

                            {account.type !== KEYRING_TYPE.KeystoneKeyring && (
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
                                        transition: 'all 0.15s',
                                        textAlign: 'left'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleExportPrivateKey();
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
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default function SwitchAccountScreen() {
    const navigate = useNavigate();
    const keyring = useCurrentKeyring();

    const items = useMemo<ItemData[]>(() => {
        return keyring.accounts.map((acc) => ({
            key: acc.address,
            account: acc
        }));
    }, [keyring.accounts]);

    const ForwardMyItem = forwardRef(MyItem);

    return (
        <Layout>
            <Header
                onBack={() => window.history.back()}
                title="Accounts"
                RightComponent={
                    keyring.type === KEYRING_CLASS.PRIVATE_KEY ? null : (
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
                            onClick={() => navigate(RouteTypes.CreateAccountScreen)}
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
                    )
                }
            />
            <Content style={{ padding: '12px' }}>
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        padding: '8px'
                    }}>
                    <VirtualList
                        data={items}
                        data-id="list"
                        itemHeight={72}
                        itemKey={(item) => item.key}
                        style={{
                            boxSizing: 'border-box',
                            overflow: 'visible'
                        }}>
                        {(item) => <ForwardMyItem account={item.account} autoNav />}
                    </VirtualList>
                </div>

                {/* Empty State */}
                {items.length === 0 && (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '40px 20px'
                        }}>
                        <UserOutlined
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
                            No accounts yet
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded
                            }}>
                            {keyring.type === KEYRING_CLASS.PRIVATE_KEY
                                ? 'Only one account per private key wallet'
                                : 'Tap the + button to create an account'}
                        </div>
                    </div>
                )}

                {/* Account Info */}
                <div
                    style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: `${colors.main}10`,
                        border: `1px solid ${colors.main}30`,
                        borderRadius: '10px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.main,
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <UserOutlined style={{ fontSize: 12 }} />
                        Account Management
                    </div>
                    <div
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded,
                            lineHeight: '1.4'
                        }}>
                        {keyring.type === KEYRING_CLASS.PRIVATE_KEY
                            ? 'Private key wallets support only one account.'
                            : `You have ${items.length} account${items.length !== 1 ? 's' : ''} in this wallet.`}
                    </div>
                </div>
            </Content>
        </Layout>
    );
}
