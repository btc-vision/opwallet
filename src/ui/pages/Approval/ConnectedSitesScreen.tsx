import { useEffect, useState } from 'react';

import { ConnectedSite } from '@/background/service/permission';
import { Column, Content, Header, Layout, Text } from '@/ui/components';
import { getCurrentTab } from '@/ui/features/browser/tabs';
import { useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    DeleteOutlined,
    DisconnectOutlined,
    ExclamationCircleOutlined,
    GlobalOutlined,
    LinkOutlined
} from '@ant-design/icons';
import { Tabs } from 'webextension-polyfill';

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

interface SiteItemProps {
    site: ConnectedSite;
    isCurrentSite: boolean;
    onRemove: (origin: string) => void;
}

function SiteItem({ site, isCurrentSite, onRemove }: SiteItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleRemoveClick = () => {
        setShowConfirm(true);
    };

    const handleConfirmRemove = () => {
        onRemove(site.origin);
        setShowConfirm(false);
    };

    const getDomain = (url: string) => {
        try {
            const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            return domain;
        } catch {
            return url;
        }
    };

    if (showConfirm) {
        return (
            <div
                style={{
                    background: colors.buttonHoverBg,
                    border: `1px solid ${colors.error}40`,
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '8px'
                }}>
                <div
                    style={{
                        fontSize: '12px',
                        color: colors.text,
                        marginBottom: '8px'
                    }}>
                    Disconnect from {getDomain(site.origin)}?
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: '8px'
                    }}>
                    <button
                        style={{
                            flex: 1,
                            padding: '6px',
                            background: colors.containerBgFaded,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '6px',
                            color: colors.text,
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={() => setShowConfirm(false)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.containerBgFaded;
                        }}>
                        Cancel
                    </button>
                    <button
                        style={{
                            flex: 1,
                            padding: '6px',
                            background: colors.error,
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={handleConfirmRemove}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                        }}>
                        Disconnect
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: isCurrentSite
                    ? `linear-gradient(135deg, ${colors.main}10 0%, ${colors.main}05 100%)`
                    : isHovered
                      ? colors.buttonBg
                      : colors.buttonHoverBg,
                border: `1px solid ${isCurrentSite ? `${colors.main}30` : 'transparent'}`,
                borderRadius: '12px',
                marginBottom: '8px',
                transition: 'all 0.15s',
                cursor: 'default'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}>
            {/* Current site indicator */}
            {isCurrentSite && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: colors.main,
                        borderRadius: '12px 0 0 12px'
                    }}
                />
            )}

            {/* Site Icon */}
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: colors.containerBgFaded,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                }}>
                {site.icon ? (
                    <img
                        src={site.icon}
                        alt={site.origin}
                        style={{
                            width: '24px',
                            height: '24px',
                            objectFit: 'contain'
                        }}
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div
                    style={{
                        display: site.icon ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                    }}>
                    <GlobalOutlined style={{ fontSize: 18, color: colors.textFaded }} />
                </div>
            </div>

            {/* Site Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: colors.text,
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'Inter-Regular, serif'
                    }}>
                    {getDomain(site.origin)}
                </div>
                <div
                    style={{
                        fontSize: '11px',
                        color: isCurrentSite ? colors.main : colors.textFaded,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                    {isCurrentSite ? (
                        <>
                            <CheckCircleFilled style={{ fontSize: 10, color: colors.main }} />
                            <span style={{ fontWeight: 500 }}>Current tab</span>
                        </>
                    ) : (
                        <>
                            <LinkOutlined style={{ fontSize: 10 }} />
                            <span>Connected</span>
                        </>
                    )}
                </div>
            </div>

            {/* Remove Button */}
            <button
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: `1px solid ${colors.containerBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    flexShrink: 0
                }}
                onClick={handleRemoveClick}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${colors.error}20`;
                    e.currentTarget.style.borderColor = `${colors.error}40`;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = colors.containerBorder;
                }}>
                <DeleteOutlined style={{ fontSize: 14, color: colors.textFaded }} />
            </button>
        </div>
    );
}

export default function ConnectedSitesScreen() {
    const wallet = useWallet();
    const [sites, setSites] = useState<ConnectedSite[]>([]);
    const [currentOrigin, setCurrentOrigin] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const getSites = async () => {
        setLoading(true);
        try {
            // Get current tab origin
            const currentTab = (await getCurrentTab()) as Tabs.Tab | undefined;
            if (currentTab?.url) {
                const origin = new URL(currentTab.url).origin;
                setCurrentOrigin(origin);
            }

            // Get connected sites
            const sites = await wallet.getConnectedSites();
            setSites(sites);
        } catch (error) {
            console.error('Failed to load connected sites:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getSites();
    }, []);

    const handleRemove = async (origin: string) => {
        try {
            await wallet.removeConnectedSite(origin);
            await getSites();
        } catch (error) {
            console.error('Failed to remove site:', error);
        }
    };

    // Sort sites to show current site first
    const sortedSites = [...sites].sort((a, b) => {
        if (a.origin === currentOrigin) return -1;
        if (b.origin === currentOrigin) return 1;
        return 0;
    });

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Connected Sites" />
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
                    <ExclamationCircleOutlined
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
                            Manage Connections
                        </div>
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.textFaded,
                                lineHeight: '1.3'
                            }}>
                            These sites can view your account address and request transactions.
                        </div>
                    </div>
                </div>

                {/* Sites List or Empty State */}
                {loading ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '200px'
                        }}>
                        <Column itemsCenter>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: colors.buttonHoverBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '12px',
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                }}>
                                <LinkOutlined style={{ fontSize: 20, color: colors.textFaded }} />
                            </div>
                            <Text text="Loading..." color="textDim" size="sm" />
                        </Column>
                    </div>
                ) : sites.length > 0 ? (
                    <Column>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                                paddingLeft: '4px'
                            }}>
                            {sites.length} Connected {sites.length === 1 ? 'Site' : 'Sites'}
                        </div>
                        {sortedSites.map((site) => (
                            <SiteItem
                                key={site.origin}
                                site={site}
                                isCurrentSite={site.origin === currentOrigin}
                                onRemove={handleRemove}
                            />
                        ))}
                    </Column>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '200px',
                            padding: '20px',
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                        <div
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: colors.buttonHoverBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '16px'
                            }}>
                            <DisconnectOutlined
                                style={{
                                    fontSize: 28,
                                    color: colors.textFaded
                                }}
                            />
                        </div>
                        <div
                            style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: colors.text,
                                marginBottom: '4px'
                            }}>
                            No Connected Sites
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                maxWidth: '240px',
                                lineHeight: '1.4'
                            }}>
                            Sites you connect to will appear here
                        </div>
                    </div>
                )}

                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.6; }
                    }
                `}</style>
            </Content>
        </Layout>
    );
}
