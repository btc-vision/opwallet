import { useEffect, useState } from 'react';

import { Column, Content, Header, Layout, OPNetLoader } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { Popover } from '@/ui/components/Popover';
import { useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    ClearOutlined,
    ClockCircleOutlined,
    CloudServerOutlined,
    DeleteOutlined,
    GlobalOutlined,
    InfoCircleOutlined,
    LoadingOutlined,
    PlusOutlined,
    ReloadOutlined,
    RightOutlined
} from '@ant-design/icons';

import {
    DEFAULT_CACHE_SETTINGS,
    GatewayConfig,
    GatewayHealth,
    OpnetBrowserSettings,
    OpnetCacheSettings,
    OpnetCacheStats
} from '@/shared/types/OpnetProtocol';

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

const CACHE_TTL_OPTIONS = [
    { id: 60000, label: '1 minute' },
    { id: 300000, label: '5 minutes' },
    { id: 600000, label: '10 minutes' },
    { id: 1800000, label: '30 minutes' },
    { id: 3600000, label: '1 hour' }
];

export default function OpnetBrowserScreen() {
    const wallet = useWallet();
    const tools = useTools();

    const [init, setInit] = useState(false);
    const [browserSettings, setBrowserSettings] = useState<OpnetBrowserSettings | null>(null);
    const [cacheSettings, setCacheSettings] = useState<OpnetCacheSettings>(DEFAULT_CACHE_SETTINGS);
    const [cacheStats, setCacheStats] = useState<OpnetCacheStats | null>(null);
    const [gateways, setGateways] = useState<{ config: GatewayConfig; health: GatewayHealth }[]>([]);
    const [enableLoading, setEnableLoading] = useState(false);
    const [cacheTtlPopoverVisible, setCacheTtlPopoverVisible] = useState(false);
    const [addGatewayPopoverVisible, setAddGatewayPopoverVisible] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [refreshingGateways, setRefreshingGateways] = useState(false);

    useEffect(() => {
        const initSettings = async () => {
            try {
                const settings = await wallet.getOpnetBrowserSettings();
                const cache = await wallet.getOpnetCacheSettings();
                const stats = await wallet.getOpnetCacheStats();
                const gatewayList = await wallet.getOpnetGateways();

                setBrowserSettings(settings);
                setCacheSettings(cache);
                setCacheStats(stats);
                setGateways(gatewayList);
                setInit(true);
            } catch (error) {
                console.error('Failed to load OPNet browser settings:', error);
                tools.toastError('Failed to load settings');
            }
        };
        initSettings();
    }, [wallet, tools]);

    const handleToggleEnabled = async () => {
        if (!browserSettings || enableLoading) return;

        setEnableLoading(true);
        try {
            const newEnabled = !browserSettings.enabled;
            await wallet.setOpnetBrowserSettings({ enabled: newEnabled });
            setBrowserSettings({ ...browserSettings, enabled: newEnabled });
            tools.toastSuccess(newEnabled ? 'OPNet Browser enabled' : 'OPNet Browser disabled');
        } catch (error) {
            tools.toastError('Failed to update setting');
        } finally {
            setEnableLoading(false);
        }
    };

    const handleClearCache = async () => {
        if (clearingCache) return;

        setClearingCache(true);
        try {
            await wallet.clearOpnetCache();
            const stats = await wallet.getOpnetCacheStats();
            setCacheStats(stats);
            tools.toastSuccess('Cache cleared');
        } catch (error) {
            tools.toastError('Failed to clear cache');
        } finally {
            setClearingCache(false);
        }
    };

    const handleRefreshGateways = async () => {
        if (refreshingGateways) return;

        setRefreshingGateways(true);
        try {
            await wallet.refreshOpnetGateways();
            const gatewayList = await wallet.getOpnetGateways();
            setGateways(gatewayList);
            tools.toastSuccess('Gateways refreshed');
        } catch (error) {
            tools.toastError('Failed to refresh gateways');
        } finally {
            setRefreshingGateways(false);
        }
    };

    const handleRemoveGateway = async (url: string) => {
        try {
            await wallet.removeOpnetGateway(url);
            const gatewayList = await wallet.getOpnetGateways();
            setGateways(gatewayList);
            tools.toastSuccess('Gateway removed');
        } catch (error) {
            tools.toastError('Failed to remove gateway');
        }
    };

    const handleSetCacheTtl = async (ttl: number) => {
        try {
            await wallet.updateOpnetCacheSettings({ contenthashTtlMs: ttl });
            setCacheSettings({ ...cacheSettings, contenthashTtlMs: ttl });
            setCacheTtlPopoverVisible(false);
            tools.toastSuccess('Cache TTL updated');
        } catch (error) {
            tools.toastError('Failed to update cache TTL');
        }
    };

    const handleAddGateway = async (url: string) => {
        try {
            await wallet.addOpnetGateway(url);
            const gatewayList = await wallet.getOpnetGateways();
            setGateways(gatewayList);
            setAddGatewayPopoverVisible(false);
            tools.toastSuccess('Gateway added');
        } catch (error) {
            tools.toastError('Failed to add gateway');
        }
    };

    if (!init) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="OPNet Browser" />
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

    const cacheTtlConfig = CACHE_TTL_OPTIONS.find((o) => o.id === cacheSettings.contenthashTtlMs) || CACHE_TTL_OPTIONS[1];

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="OPNet Browser" />
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
                            OPNet Domain Browser
                        </div>
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.textFaded,
                                lineHeight: '1.3'
                            }}>
                            Browse .btc domains through the OPNet protocol. Content is served from IPFS gateways.
                        </div>
                    </div>
                </div>

                {/* Enable Toggle */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        marginBottom: '16px'
                    }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            cursor: enableLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s',
                            opacity: enableLoading ? 0.7 : 1
                        }}
                        onClick={handleToggleEnabled}
                        onMouseEnter={(e) => {
                            if (!enableLoading) e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
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
                            <GlobalOutlined style={{ fontSize: 18, color: colors.main }} />
                        </div>

                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Enable .btc Domain Browsing
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: browserSettings?.enabled ? colors.success : colors.textFaded,
                                    fontWeight: 500
                                }}>
                                {browserSettings?.enabled ? 'Enabled' : 'Disabled'}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                Intercept and resolve .btc domain navigation
                            </div>
                        </div>

                        <div
                            style={{
                                width: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                background: browserSettings?.enabled ? colors.main : colors.buttonBg,
                                position: 'relative',
                                transition: 'background 0.2s',
                                cursor: enableLoading ? 'not-allowed' : 'pointer'
                            }}>
                            <div
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '10px',
                                    background: colors.text,
                                    position: 'absolute',
                                    top: '2px',
                                    left: browserSettings?.enabled ? '22px' : '2px',
                                    transition: 'left 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                {enableLoading && <LoadingOutlined style={{ fontSize: 12, color: colors.main }} />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cache Settings */}
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
                    Cache Settings
                </div>

                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        marginBottom: '16px'
                    }}>
                    {/* Cache TTL */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            borderBottom: `1px solid ${colors.containerBorder}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={() => setCacheTtlPopoverVisible(true)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
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

                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Cache TTL
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.main,
                                    fontWeight: 500
                                }}>
                                {cacheTtlConfig.label}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                How long to cache domain resolutions
                            </div>
                        </div>

                        <RightOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                    </div>

                    {/* Cache Stats */}
                    {cacheStats && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 12px',
                                borderBottom: `1px solid ${colors.containerBorder}`
                            }}>
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
                                <CloudServerOutlined style={{ fontSize: 18, color: colors.main }} />
                            </div>

                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: colors.text,
                                        marginBottom: '2px',
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    Cache Usage
                                </div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        fontWeight: 500
                                    }}>
                                    {cacheStats.contenthashEntries} domains, {cacheStats.contentEntries} files
                                </div>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: colors.textFaded,
                                        marginTop: '2px'
                                    }}>
                                    {cacheStats.contentSizeMb.toFixed(2)} MB / {cacheStats.maxSizeMb} MB
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clear Cache */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            cursor: clearingCache ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s',
                            opacity: clearingCache ? 0.7 : 1
                        }}
                        onClick={handleClearCache}
                        onMouseEnter={(e) => {
                            if (!clearingCache) e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
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
                            {clearingCache ? (
                                <LoadingOutlined style={{ fontSize: 18, color: colors.error }} />
                            ) : (
                                <ClearOutlined style={{ fontSize: 18, color: colors.error }} />
                            )}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.error,
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Clear Cache
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                Remove all cached domain resolutions and content
                            </div>
                        </div>
                    </div>
                </div>

                {/* IPFS Gateways */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        paddingLeft: '4px',
                        paddingRight: '4px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.textFaded,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                        IPFS Gateways
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            style={{
                                padding: '4px 8px',
                                background: 'transparent',
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '6px',
                                cursor: refreshingGateways ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                opacity: refreshingGateways ? 0.7 : 1
                            }}
                            onClick={handleRefreshGateways}>
                            {refreshingGateways ? (
                                <LoadingOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                            ) : (
                                <ReloadOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                            )}
                            <span style={{ fontSize: '10px', color: colors.textFaded }}>Refresh</span>
                        </button>
                        <button
                            style={{
                                padding: '4px 8px',
                                background: colors.main,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            onClick={() => setAddGatewayPopoverVisible(true)}>
                            <PlusOutlined style={{ fontSize: 10, color: '#fff' }} />
                            <span style={{ fontSize: '10px', color: '#fff', fontWeight: 500 }}>Add</span>
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        marginBottom: '16px'
                    }}>
                    {gateways.map((gateway, index) => (
                        <div
                            key={gateway.config.url}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px',
                                borderBottom:
                                    index < gateways.length - 1 ? `1px solid ${colors.containerBorder}` : 'none'
                            }}>
                            {/* Health indicator */}
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: gateway.health.isHealthy ? colors.success : colors.error,
                                    marginRight: '10px',
                                    flexShrink: 0
                                }}
                            />

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: colors.text,
                                        fontFamily: 'monospace',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                    {gateway.config.url.replace('https://', '')}
                                </div>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        color: colors.textFaded,
                                        marginTop: '2px',
                                        display: 'flex',
                                        gap: '8px'
                                    }}>
                                    {gateway.config.isLocalNode && (
                                        <span style={{ color: colors.warning }}>Local</span>
                                    )}
                                    {gateway.config.isDefault && <span>Default</span>}
                                    {gateway.health.latency !== Infinity && (
                                        <span>{gateway.health.latency}ms</span>
                                    )}
                                </div>
                            </div>

                            {/* Remove button for user-configured gateways */}
                            {gateway.config.isUserConfigured && !gateway.config.isDefault && (
                                <button
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '6px',
                                        background: `${colors.error}15`,
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onClick={() => handleRemoveGateway(gateway.config.url)}>
                                    <DeleteOutlined style={{ fontSize: 12, color: colors.error }} />
                                </button>
                            )}
                        </div>
                    ))}

                    {gateways.length === 0 && (
                        <div
                            style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: colors.textFaded,
                                fontSize: '12px'
                            }}>
                            No gateways configured
                        </div>
                    )}
                </div>
            </Content>

            {/* Cache TTL Popover */}
            {cacheTtlPopoverVisible && (
                <CacheTtlPopover
                    currentTtlMs={cacheSettings.contenthashTtlMs}
                    onSelect={handleSetCacheTtl}
                    onCancel={() => setCacheTtlPopoverVisible(false)}
                />
            )}

            {/* Add Gateway Popover */}
            {addGatewayPopoverVisible && (
                <AddGatewayPopover
                    onAdd={handleAddGateway}
                    onCancel={() => setAddGatewayPopoverVisible(false)}
                />
            )}
        </Layout>
    );
}

const CacheTtlPopover = ({
    currentTtlMs,
    onSelect,
    onCancel
}: {
    currentTtlMs: number;
    onSelect: (ttl: number) => void;
    onCancel: () => void;
}) => {
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    return (
        <Popover onClose={onCancel}>
            <Column style={{ width: '100%' }}>
                <div
                    style={{
                        textAlign: 'center',
                        paddingBottom: '12px',
                        borderBottom: `1px solid ${colors.containerBorder}`
                    }}>
                    <div
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: colors.text,
                            marginBottom: '4px',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Cache TTL
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textFaded }}>
                        Choose how long to cache domain resolutions
                    </div>
                </div>

                <div style={{ margin: '12px 0' }}>
                    {CACHE_TTL_OPTIONS.map((option) => {
                        const isSelected = option.id === currentTtlMs;
                        const isHovered = option.id === hoveredId;

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
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    position: 'relative'
                                }}
                                onClick={() => onSelect(option.id)}
                                onMouseEnter={() => setHoveredId(option.id)}
                                onMouseLeave={() => setHoveredId(null)}>
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
                                    <ClockCircleOutlined
                                        style={{
                                            fontSize: 14,
                                            color: isSelected ? colors.main : colors.textFaded
                                        }}
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: isSelected ? 600 : 500,
                                            color: colors.text,
                                            fontFamily: 'Inter-Regular, serif'
                                        }}>
                                        {option.label}
                                    </div>
                                </div>

                                {isSelected && (
                                    <CheckCircleFilled style={{ fontSize: 14, color: colors.main, marginLeft: '8px' }} />
                                )}
                            </div>
                        );
                    })}
                </div>

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
                        fontFamily: 'Inter-Regular, serif'
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

const AddGatewayPopover = ({ onAdd, onCancel }: { onAdd: (url: string) => void; onCancel: () => void }) => {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        // Validate URL
        let gatewayUrl = url.trim();
        if (!gatewayUrl) {
            setError('Please enter a gateway URL');
            return;
        }

        // Add https if not present
        if (!gatewayUrl.startsWith('http://') && !gatewayUrl.startsWith('https://')) {
            gatewayUrl = 'https://' + gatewayUrl;
        }

        // Remove trailing slash
        gatewayUrl = gatewayUrl.replace(/\/+$/, '');

        try {
            new URL(gatewayUrl);
            onAdd(gatewayUrl);
        } catch {
            setError('Invalid URL format');
        }
    };

    return (
        <Popover onClose={onCancel}>
            <Column style={{ width: '100%' }}>
                <div
                    style={{
                        textAlign: 'center',
                        paddingBottom: '12px',
                        borderBottom: `1px solid ${colors.containerBorder}`
                    }}>
                    <div
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: colors.text,
                            marginBottom: '4px',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Add IPFS Gateway
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textFaded }}>
                        Enter the URL of an IPFS gateway
                    </div>
                </div>

                <div style={{ margin: '16px 0' }}>
                    <input
                        type="text"
                        placeholder="https://ipfs.io"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            setError('');
                        }}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: colors.buttonHoverBg,
                            border: `1px solid ${error ? colors.error : colors.containerBorder}`,
                            borderRadius: '10px',
                            color: colors.text,
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            outline: 'none'
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                        }}
                    />
                    {error && (
                        <div style={{ fontSize: '11px', color: colors.error, marginTop: '6px', paddingLeft: '4px' }}>
                            {error}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: colors.buttonHoverBg,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '10px',
                            color: colors.text,
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: 'Inter-Regular, serif'
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
                    <button
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: colors.main,
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: 'Inter-Regular, serif'
                        }}
                        onClick={handleAdd}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e56b0e';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.main;
                        }}>
                        Add Gateway
                    </button>
                </div>
            </Column>
        </Popover>
    );
};
