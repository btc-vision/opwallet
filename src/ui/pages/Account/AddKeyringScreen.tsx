import { useState, useEffect } from 'react';

import { Column, Content, Header, Layout } from '@/ui/components';
import { WalletSetupGuideModal } from '@/ui/components/WalletSetupGuideModal';
import { useExtensionIsInTab } from '@/ui/features/browser/tabs';
import {
    FileTextOutlined,
    ImportOutlined,
    KeyOutlined,
    PlusCircleOutlined,
    RightOutlined,
    SafetyOutlined,
    UsbOutlined
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
    ethereum: '#627EEA'
};

interface WalletOption {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    badge?: string;
    accentColor?: string;
}

export default function AddKeyringScreen() {
    const navigate = useNavigate();
    const isInTab = useExtensionIsInTab();
    const [showSetupGuide, setShowSetupGuide] = useState(false);

    // Show setup guide on first mount
    useEffect(() => {
        // Check if this is a first-time visit or show guide for wallet creation
        setShowSetupGuide(true);
    }, []);

    const handleSelectHD = () => {
        setShowSetupGuide(false);
        navigate(RouteTypes.CreateHDWalletScreen, { isImport: false });
    };

    const handleSelectWIF = () => {
        setShowSetupGuide(false);
        navigate(RouteTypes.CreateSimpleWalletScreen);
    };

    const handleCloseGuide = () => {
        setShowSetupGuide(false);
    };

    const createOptions: WalletOption[] = [
        {
            icon: <PlusCircleOutlined style={{ fontSize: 20 }} />,
            title: 'Create New Wallet',
            description: 'Generate a new 12-word seed phrase',
            onClick: () => navigate(RouteTypes.CreateHDWalletScreen, { isImport: false })
        }
    ];

    const restoreOptions: WalletOption[] = [
        {
            icon: <FileTextOutlined style={{ fontSize: 20 }} />,
            title: 'Seed Phrase',
            description: 'Restore from 12 or 24 words',
            onClick: () => navigate(RouteTypes.CreateHDWalletScreen, { isImport: true })
        },
        {
            icon: <KeyOutlined style={{ fontSize: 20 }} />,
            title: 'Private Key',
            description: 'Import a single private key',
            onClick: () => navigate(RouteTypes.CreateSimpleWalletScreen)
        },
        {
            icon: <ImportOutlined style={{ fontSize: 20 }} />,
            title: 'Ethereum Private Key',
            description: 'Import from MetaMask or other EVM wallets',
            onClick: () => navigate(RouteTypes.CreateSimpleWalletScreen),
            badge: 'ETH',
            accentColor: colors.ethereum
        }
    ];

    const hardwareOptions: WalletOption[] = [
        {
            icon: <UsbOutlined style={{ fontSize: 20 }} />,
            title: 'Keystone',
            description: 'Connect via QR code',
            onClick: () => {
                if (isInTab) {
                    navigate(RouteTypes.CreateKeystoneWalletScreen);
                } else {
                    window.open('#/account/create-keystone-wallet');
                }
            }
        }
    ];

    const WalletOptionCard = ({ option }: { option: WalletOption }) => (
        <button
            style={{
                width: '100%',
                padding: '14px',
                background: colors.buttonHoverBg,
                border: `1px solid ${colors.containerBorder}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                marginBottom: '8px'
            }}
            onClick={option.onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.buttonBg;
                e.currentTarget.style.borderColor = option.accentColor || colors.main;
                e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.buttonHoverBg;
                e.currentTarget.style.borderColor = colors.containerBorder;
                e.currentTarget.style.transform = 'translateX(0)';
            }}>
            {/* Icon */}
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: option.accentColor ? `${option.accentColor}15` : colors.containerBgFaded,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                <span style={{ color: option.accentColor || colors.main }}>{option.icon}</span>
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                <div
                    style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: colors.text,
                        marginBottom: '2px',
                        fontFamily: 'Inter-Regular, serif',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                    {option.title}
                    {option.badge && (
                        <span
                            style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: option.accentColor ? `${option.accentColor}20` : `${colors.main}20`,
                                color: option.accentColor || colors.main,
                                borderRadius: '4px',
                                fontWeight: 700
                            }}>
                            {option.badge}
                        </span>
                    )}
                </div>
                <div
                    style={{
                        fontSize: '12px',
                        color: colors.textFaded
                    }}>
                    {option.description}
                </div>
            </div>

            {/* Arrow */}
            <RightOutlined
                style={{
                    fontSize: 12,
                    color: colors.textFaded
                }}
            />
        </button>
    );

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
                    {/* Create Section */}
                    <div style={{ marginBottom: '20px' }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '10px',
                                paddingLeft: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <SafetyOutlined style={{ fontSize: 12 }} />
                            Create New
                        </div>
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '8px'
                            }}>
                            {createOptions.map((option, index) => (
                                <WalletOptionCard key={index} option={option} />
                            ))}
                        </div>
                    </div>

                    {/* Restore Section */}
                    <div style={{ marginBottom: '20px' }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '10px',
                                paddingLeft: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <ImportOutlined style={{ fontSize: 12 }} />
                            Import Existing
                        </div>
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '8px'
                            }}>
                            {restoreOptions.map((option, index) => (
                                <WalletOptionCard key={index} option={option} />
                            ))}
                        </div>
                    </div>

                    {/* Hardware Section */}
                    <div style={{ marginBottom: '20px' }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '10px',
                                paddingLeft: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <UsbOutlined style={{ fontSize: 12 }} />
                            Hardware Wallets
                        </div>
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '14px',
                                padding: '8px'
                            }}>
                            {hardwareOptions.map((option, index) => (
                                <WalletOptionCard key={index} option={option} />
                            ))}
                        </div>
                    </div>

                    {/* Security Note */}
                    <div
                        style={{
                            padding: '12px',
                            background: `${colors.warning}10`,
                            border: `1px solid ${colors.warning}30`,
                            borderRadius: '10px',
                            marginTop: '8px'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.warning,
                                fontWeight: 600,
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <SafetyOutlined style={{ fontSize: 12 }} />
                            Security Tip
                        </div>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.textFaded,
                                lineHeight: '1.4'
                            }}>
                            Never share your seed phrase or private keys with anyone. Store them securely offline.
                        </div>
                    </div>
                </Column>
            </Content>

            {/* Setup Guide Modal */}
            <WalletSetupGuideModal
                open={showSetupGuide}
                onSelectHD={handleSelectHD}
                onSelectWIF={handleSelectWIF}
                onClose={handleCloseGuide}
            />
        </Layout>
    );
}
