import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ADDRESS_TYPES, GITHUB_URL, KEYRING_TYPE, TELEGRAM_URL, TWITTER_URL } from '@/shared/constant';
import { Column, Content, Footer, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { getCurrentTab, useExtensionIsInTab, useOpenExtensionInTab } from '@/ui/features/browser/tabs';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import { useChain, useVersionInfo } from '@/ui/state/settings/hooks';
import { useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    ExpandOutlined,
    GithubOutlined,
    GlobalOutlined,
    KeyOutlined,
    LinkOutlined,
    LockOutlined,
    RightOutlined,
    SendOutlined,
    SettingOutlined,
    WifiOutlined,
    XOutlined
} from '@ant-design/icons';

import { Tabs } from 'webextension-polyfill';
import { SwitchChainModal } from '../Settings/network/SwitchChainModal';

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

interface Setting {
    label?: string;
    value?: string;
    desc?: string;
    icon?: React.ReactNode;
    danger?: boolean;
    action: string;
    route: string;
    right: boolean;
    isButton?: boolean;
}

const SettingList: Setting[] = [
    {
        label: 'Network',
        value: 'MAINNET',
        desc: 'Switch between networks',
        icon: <GlobalOutlined />,
        action: 'networkType',
        route: '/settings/network-type',
        right: true
    },
    {
        label: 'Address Type',
        value: 'Taproot',
        desc: 'Change address format',
        icon: <WifiOutlined />,
        action: 'addressType',
        route: '/settings/address-type',
        right: true
    },
    {
        label: 'Connected Sites',
        value: '',
        desc: 'Manage connected dApps',
        icon: <LinkOutlined />,
        action: 'connected-sites',
        route: '/connected-sites',
        right: true
    },
    {
        label: 'Security',
        value: '',
        desc: 'Change password',
        icon: <KeyOutlined />,
        action: 'password',
        route: '/settings/password',
        right: true
    },
    {
        label: 'Advanced',
        value: '',
        desc: 'Advanced settings',
        icon: <SettingOutlined />,
        action: 'advanced',
        route: '/settings/advanced',
        right: true
    },
    {
        desc: 'Expand View',
        icon: <ExpandOutlined />,
        action: 'expand-view',
        route: '',
        right: false,
        isButton: true
    },
    {
        desc: 'Lock Wallet',
        icon: <LockOutlined />,
        action: 'lock-wallet',
        route: '',
        right: false,
        isButton: true,
        danger: true
    }
];

export default function SettingsTabScreen() {
    const navigate = useNavigate();
    const chain = useChain();
    const isInTab = useExtensionIsInTab();
    const [connected, setConnected] = useState(false);
    const currentKeyring = useCurrentKeyring();
    const currentAccount = useCurrentAccount();
    const versionInfo = useVersionInfo();
    const wallet = useWallet();
    const [switchChainModalVisible, setSwitchChainModalVisible] = useState(false);
    const tools = useTools();
    const openExtensionInTab = useOpenExtensionInTab();

    useEffect(() => {
        const run = async () => {
            const res = (await getCurrentTab()) as Tabs.Tab | undefined;
            if (!res?.url) return;

            const origin = new URL(res.url).origin;

            if (origin === 'https://unisat.io') {
                setConnected(true);
            } else {
                const sites = await wallet.getConnectedSites();
                if (sites.find((i) => i.origin === origin)) {
                    setConnected(true);
                }
            }
        };
        void run();
    }, [wallet]);

    const isCustomHdPath = useMemo(() => {
        const item = ADDRESS_TYPES[currentKeyring.addressType];
        return (
            currentKeyring.hdPath !== '' &&
            item.hdPath !== currentKeyring.hdPath &&
            currentKeyring.type !== KEYRING_TYPE.HdKeyring
        );
    }, [currentKeyring]);

    const toRenderSettings = SettingList.filter((v) => {
        if (v.action == 'connected-sites') {
            v.value = connected ? 'Connected' : 'Not connected';
        }

        if (v.action == 'networkType') {
            v.value = chain.label;
        }

        if (v.action == 'addressType') {
            const item = ADDRESS_TYPES[currentKeyring.addressType];
            const hdPath = currentKeyring.hdPath || item.hdPath;
            if (currentKeyring.type === KEYRING_TYPE.SimpleKeyring) {
                v.value = item.name;
            } else {
                v.value = item.name;
            }
        }

        if (v.action == 'expand-view' && isInTab) {
            return false;
        }

        return true;
    });

    const handleSettingClick = (item: Setting) => {
        if (item.action == 'expand-view') {
            void openExtensionInTab();
            return;
        }

        if (item.action == 'lock-wallet') {
            void wallet.lockWallet();
            navigate('/account/unlock');
            return;
        }

        if (item.action == 'networkType') {
            setSwitchChainModalVisible(true);
            return;
        }

        if (item.action == 'addressType') {
            if (isCustomHdPath) {
                tools.showTip(
                    'The wallet currently uses a custom HD path and does not support switching address types.'
                );
                return;
            }
            navigate('/settings/address-type');
            return;
        }

        navigate(item.route);
    };

    // Separate settings and action buttons
    const settingsItems = toRenderSettings.filter((item) => !item.isButton);
    const actionButtons = toRenderSettings.filter((item) => item.isButton);

    return (
        <Layout>
            <Header 
                onBack={() => navigate('/main')}
            />
            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* Settings Cards */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '14px',
                            overflow: 'hidden',
                            marginBottom: '16px'
                        }}>
                        {settingsItems.map((item, index) => (
                            <div
                                key={item.action}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '14px 12px',
                                    borderBottom:
                                        index < settingsItems.length - 1
                                            ? `1px solid ${colors.containerBorder}`
                                            : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onClick={() => handleSettingClick(item)}
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
                                    <span style={{ fontSize: '18px', color: colors.main }}>{item.icon}</span>
                                </div>

                                {/* Text Content */}
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: colors.text,
                                            marginBottom: '2px',
                                            fontFamily: 'Inter-Regular, serif'
                                        }}>
                                        {item.label}
                                    </div>
                                    {item.value && (
                                        <div
                                            style={{
                                                fontSize: '12px',
                                                color:
                                                    item.action === 'connected-sites' && connected
                                                        ? colors.success
                                                        : colors.main,
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                            {item.action === 'connected-sites' && connected && (
                                                <CheckCircleFilled style={{ fontSize: 10 }} />
                                            )}
                                            {item.value}
                                        </div>
                                    )}
                                    {item.desc && (
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: colors.textFaded,
                                                marginTop: '2px'
                                            }}>
                                            {item.desc}
                                        </div>
                                    )}
                                </div>

                                {/* Arrow */}
                                {item.right && (
                                    <RightOutlined
                                        style={{
                                            fontSize: 12,
                                            color: colors.textFaded
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            marginBottom: '16px'
                        }}>
                        {actionButtons.map((item) => (
                            <button
                                key={item.action}
                                style={{
                                    padding: '12px',
                                    background: item.danger ? `${colors.error}15` : colors.buttonHoverBg,
                                    border: `1px solid ${item.danger ? `${colors.error}40` : colors.containerBorder}`,
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                onClick={() => handleSettingClick(item)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = item.danger
                                        ? `${colors.error}25`
                                        : colors.buttonBg;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = item.danger
                                        ? `${colors.error}15`
                                        : colors.buttonHoverBg;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}>
                                <span
                                    style={{
                                        fontSize: '20px',
                                        color: item.danger ? colors.error : colors.main
                                    }}>
                                    {item.icon}
                                </span>
                                <span
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: item.danger ? colors.error : colors.text,
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    {item.desc}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* About Section */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '14px',
                            padding: '16px',
                            textAlign: 'center',
                            marginBottom: '16px'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '12px'
                            }}>
                            About
                        </div>

                        {/* Social Links */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '20px',
                                marginBottom: '12px'
                            }}>
                            <button
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: colors.buttonHoverBg,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s'
                                }}
                                onClick={() => window.open(TWITTER_URL)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.buttonBg;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}>
                                <XOutlined style={{ fontSize: 18, color: colors.text }} />
                            </button>

                            <button
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: colors.buttonHoverBg,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s'
                                }}
                                onClick={() => window.open(GITHUB_URL)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.buttonBg;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}>
                                <GithubOutlined style={{ fontSize: 18, color: colors.text }} />
                            </button>

                            <button
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: colors.buttonHoverBg,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s'
                                }}
                                onClick={() => window.open(TELEGRAM_URL)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.buttonBg;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}>
                                <SendOutlined style={{ fontSize: 18, color: colors.text }} />
                            </button>
                        </div>

                        {/* Version Info */}
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                marginBottom: '4px'
                            }}>
                            Version {versionInfo.currentVesion}
                        </div>

                        {versionInfo.latestVersion && versionInfo.latestVersion !== versionInfo.currentVesion && (
                            <button
                                style={{
                                    marginTop: '8px',
                                    padding: '6px 12px',
                                    background: `${colors.warning}20`,
                                    border: `1px solid ${colors.warning}40`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onClick={() => {
                                    window.open(
                                        'https://chromewebstore.google.com/detail/opwallet/pmbjpcmaaladnfpacpmhmnfmpklgbdjb?hl=en'
                                    );
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `${colors.warning}30`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = `${colors.warning}20`;
                                }}>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: colors.warning,
                                        fontWeight: 600
                                    }}>
                                    Update to {versionInfo.latestVersion}
                                </span>
                            </button>
                        )}
                    </div>
                </Column>

                {switchChainModalVisible && (
                    <SwitchChainModal
                        onClose={() => {
                            setSwitchChainModalVisible(false);
                        }}
                    />
                )}
            </Content>
            <Footer px="zero" py="zero">
                <NavTabBar tab="settings" />
            </Footer>
        </Layout>
    );
}
