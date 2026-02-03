import { CopyOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useAccountAddress } from '@/ui/state/accounts/hooks';
import { colors } from '@/ui/theme/colors';
import { copyToClipboard, shortAddress, useWallet } from '@/ui/utils';

import { RECEIVE_OPTIONS, ReceiveOption, ReceiveType } from '@/ui/pages/Wallet/receive/constants.js';

// =============================================================================
// OPTION CARD COMPONENT
// =============================================================================

interface OptionCardProps {
    option: ReceiveOption;
    address: string;
    loading: boolean;
    onCopy: () => void;
    onQRClick: () => void;
}

function OptionCard({ option, address, loading, onCopy, onQRClick }: OptionCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const IconComponent = option.icon;

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '12px',
                border: `1px solid ${isHovered ? option.iconColor : colors.border}`,
                background: isHovered ? `${option.iconColor}08` : 'transparent',
                transition: 'all 0.2s',
                gap: '14px'
            }}>
            {/* Icon Container */}
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: option.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                <IconComponent style={{ fontSize: 20, color: option.iconColor }} />
            </div>

            {/* Text Content - Title + Address */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: colors.text,
                        marginBottom: '2px'
                    }}>
                    {option.title}
                </div>
                <div
                    style={{
                        fontSize: '12px',
                        color: colors.textDim,
                        fontFamily: 'monospace'
                    }}>
                    {loading ? 'Loading...' : shortAddress(address, 8)}
                </div>
            </div>

            {/* Action Icons */}
            <div style={{ display: 'flex', gap: '8px' }}>
                {/* Copy Address Button */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onCopy();
                    }}
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: colors.bg3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                        // Use configured hover background to support both hex and rgba colors
                        e.currentTarget.style.background = option.hoverButtonBg ?? colors.bg3;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.bg3;
                    }}>
                    <CopyOutlined style={{ fontSize: 16, color: colors.textDim }} />
                </div>

                {/* QR Code Button - Navigate to ReceiveScreen */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onQRClick();
                    }}
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: colors.bg3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                        // Use configured hover background to support both hex and rgba colors
                        e.currentTarget.style.background = option.hoverButtonBg ?? colors.bg3;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.bg3;
                    }}>
                    <QrcodeOutlined style={{ fontSize: 16, color: colors.textDim }} />
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN SCREEN COMPONENT
// =============================================================================

export default function ReceiveSelectScreen() {
    const navigate = useNavigate();
    const tools = useTools();
    const wallet = useWallet();

    // BTC address from hook
    const btcAddress = useAccountAddress();

    // OP_20 MLDSA address (fetched)
    const [mldsaAddress, setMldsaAddress] = useState<string>('');
    const [loadingMldsa, setLoadingMldsa] = useState(true);

    // Fetch MLDSA address on mount
    useEffect(() => {
        const fetchMldsaAddress = async () => {
            try {
                const [mldsaHashPubKey] = await wallet.getWalletAddress();
                if (mldsaHashPubKey) {
                    setMldsaAddress(`0x${mldsaHashPubKey}`);
                }
            } catch (e) {
                console.error('Error fetching MLDSA address:', e);
            } finally {
                setLoadingMldsa(false);
            }
        };
        void fetchMldsaAddress();
    }, [wallet]);

    // Get address for each option type
    const getAddress = (type: ReceiveType): string => {
        if (type === 'btc') return btcAddress;
        if (type === 'op20') return mldsaAddress;
        return '';
    };

    // Check if address is loading
    const isLoading = (type: ReceiveType): boolean => {
        if (type === 'op20') return loadingMldsa;
        return false;
    };

    // Copy address handler
    const handleCopy = (type: ReceiveType) => {
        const address = getAddress(type);
        if (address) {
            copyToClipboard(address).then(() => {
                tools.toastSuccess('Address copied');
            });
        }
    };

    // Navigate to QR screen
    const handleQRClick = (type: ReceiveType) => {
        navigate(RouteTypes.ReceiveScreen, { type });
    };

    return (
        <Layout>
            <Header onBack={() => window.history.back()} title="Receive" />
            <Content style={{ padding: '12px' }}>
                {/* Options Container */}
                <div
                    style={{
                        background: colors.bg2,
                        borderRadius: '14px',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                    {RECEIVE_OPTIONS.map((option) => (
                        <OptionCard
                            key={option.id}
                            option={option}
                            address={getAddress(option.id)}
                            loading={isLoading(option.id)}
                            onCopy={() => handleCopy(option.id)}
                            onQRClick={() => handleQRClick(option.id)}
                        />
                    ))}
                </div>

                {/* Info Box */}
                <div
                    style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: `${colors.warning}10`,
                        border: `1px solid ${colors.warning}30`,
                        borderRadius: '10px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.warning,
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        {(() => {
                            const WalletIcon = RECEIVE_OPTIONS[0].icon;
                            return <WalletIcon style={{ fontSize: 12 }} />;
                        })()}
                        Asset Selection
                    </div>
                    <div
                        style={{
                            fontSize: '11px',
                            color: colors.textDim,
                            lineHeight: '1.4'
                        }}>
                        Copy address directly or tap QR to view full address as a QR code. BTC uses your Bitcoin
                        address, OP_20 uses MLDSA.
                    </div>
                </div>
            </Content>
        </Layout>
    );
}
