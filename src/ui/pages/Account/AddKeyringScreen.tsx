import { Column, Content, Header, Layout } from '@/ui/components';
import { useExtensionIsInTab } from '@/ui/features/browser/tabs';
import {
    CheckCircleOutlined,
    FileTextOutlined,
    ImportOutlined,
    KeyOutlined,
    PlusCircleOutlined,
    SafetyOutlined,
    UsbOutlined,
    WarningOutlined
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
    warning: '#fbbf24',
    ethereum: '#627EEA',
    purple: '#8B5CF6'
};

export default function AddKeyringScreen() {
    const navigate = useNavigate();
    const isInTab = useExtensionIsInTab();

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Add Wallet"
            />
            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* Recommended: Create/Import with Seed Phrase */}
                    <div style={{ marginBottom: '12px' }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.success,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                                paddingLeft: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <CheckCircleOutlined style={{ fontSize: 12 }} />
                            Recommended
                        </div>

                        {/* Create New Wallet - HD */}
                        <button
                            onClick={() => navigate(RouteTypes.CreateHDWalletScreen, { isImport: false })}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: `${colors.success}10`,
                                border: `2px solid ${colors.success}40`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                marginBottom: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.success;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = `${colors.success}40`;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: `${colors.success}20`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                    <PlusCircleOutlined style={{ fontSize: 20, color: colors.success }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                            Create New Wallet
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '9px',
                                                padding: '2px 6px',
                                                background: colors.success,
                                                color: '#fff',
                                                borderRadius: '4px',
                                                fontWeight: 700
                                            }}>
                                            BEST
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '6px' }}>
                                        Generate a new 12-word seed phrase
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        <span style={{ fontSize: '10px', color: colors.success, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <CheckCircleOutlined style={{ fontSize: 10 }} /> Auto MLDSA derivation
                                        </span>
                                        <span style={{ fontSize: '10px', color: colors.success, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <CheckCircleOutlined style={{ fontSize: 10 }} /> Single backup
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Import Seed Phrase */}
                        <button
                            onClick={() => navigate(RouteTypes.CreateHDWalletScreen, { isImport: true })}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: `${colors.success}08`,
                                border: `1px solid ${colors.success}30`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.success;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = `${colors.success}30`;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: `${colors.success}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                    <FileTextOutlined style={{ fontSize: 20, color: colors.success }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                        Import Seed Phrase
                                    </span>
                                    <div style={{ fontSize: '12px', color: colors.textFaded }}>
                                        Restore from 12 or 24 words
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Private Key Import - Advanced */}
                    <div style={{ marginBottom: '12px' }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.warning,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                                paddingLeft: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <WarningOutlined style={{ fontSize: 12 }} />
                            Advanced
                        </div>

                        {/* Bitcoin Private Key */}
                        <button
                            onClick={() => navigate(RouteTypes.CreateSimpleWalletScreen)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: colors.containerBgFaded,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                marginBottom: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.warning;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = colors.containerBorder;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: `${colors.warning}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                    <KeyOutlined style={{ fontSize: 20, color: colors.warning }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                            Private Key (WIF)
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '9px',
                                                padding: '2px 6px',
                                                background: `${colors.warning}20`,
                                                color: colors.warning,
                                                borderRadius: '4px',
                                                fontWeight: 600
                                            }}>
                                            ADVANCED
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: colors.textFaded, display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                        <WarningOutlined style={{ fontSize: 10, marginTop: '2px', flexShrink: 0 }} />
                                        <span>Requires separate MLDSA key backup</span>
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Ethereum Private Key */}
                        <button
                            onClick={() => navigate(RouteTypes.CreateSimpleWalletScreen)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: colors.containerBgFaded,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.ethereum;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = colors.containerBorder;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: `${colors.ethereum}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                    <ImportOutlined style={{ fontSize: 20, color: colors.ethereum }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                            Ethereum Private Key
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '9px',
                                                padding: '2px 6px',
                                                background: `${colors.ethereum}20`,
                                                color: colors.ethereum,
                                                borderRadius: '4px',
                                                fontWeight: 700
                                            }}>
                                            ETH
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: colors.textFaded }}>
                                        Import from MetaMask or other EVM wallets
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Hardware Wallets */}
                    <div style={{ marginBottom: '12px' }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                                paddingLeft: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <UsbOutlined style={{ fontSize: 12 }} />
                            Hardware
                        </div>

                        <button
                            onClick={() => {
                                if (isInTab) {
                                    navigate(RouteTypes.CreateKeystoneWalletScreen);
                                } else {
                                    window.open('#/account/create-keystone-wallet');
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: colors.containerBgFaded,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.main;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = colors.containerBorder;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: `${colors.main}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                    <UsbOutlined style={{ fontSize: 20, color: colors.main }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                        Keystone
                                    </span>
                                    <div style={{ fontSize: '12px', color: colors.textFaded }}>
                                        Connect via QR code
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Info Note */}
                    <div
                        style={{
                            padding: '10px 12px',
                            background: `${colors.purple}10`,
                            border: `1px solid ${colors.purple}25`,
                            borderRadius: '10px',
                            marginTop: '4px'
                        }}>
                        <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0, lineHeight: '1.5' }}>
                            <strong style={{ color: colors.purple }}>Why Seed Phrase?</strong> HD wallets automatically
                            derive your MLDSA (post-quantum) key from the mnemonic, making recovery simple and secure.
                        </p>
                    </div>

                    {/* Security Note */}
                    <div
                        style={{
                            padding: '10px 12px',
                            background: `${colors.warning}08`,
                            border: `1px solid ${colors.warning}20`,
                            borderRadius: '10px',
                            marginTop: '8px'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.warning,
                                fontWeight: 600,
                                marginBottom: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <SafetyOutlined style={{ fontSize: 11 }} />
                            Security Tip
                        </div>
                        <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.4' }}>
                            Never share your seed phrase or private keys. Store them securely offline.
                        </div>
                    </div>
                </Column>
            </Content>
        </Layout>
    );
}
