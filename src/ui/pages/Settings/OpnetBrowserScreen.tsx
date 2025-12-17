import { useEffect, useState } from 'react';

import { Header, Layout } from '@/ui/components';
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
    LinkOutlined,
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
    const [protocolRegistered, setProtocolRegistered] = useState(false);

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

    const handleRegisterProtocol = () => {
        try {
            const extensionUrl = chrome.runtime.getURL('opnet-resolver.html?url=%s');
            navigator.registerProtocolHandler('web+opnet', extensionUrl, 'OPNet Domain Browser');
            setProtocolRegistered(true);
            tools.toastSuccess('Protocol handler registered');
        } catch (error) {
            console.error('Failed to register protocol:', error);
            tools.toastError('Failed to register protocol');
        }
    };

    if (!init) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="OPNet Browser" />
                <div className="opnet-browser-loading">
                    <LoadingOutlined style={{ fontSize: 24, color: '#f37413' }} />
                    <span>Loading...</span>
                </div>
            </Layout>
        );
    }

    const cacheTtlLabel =
        CACHE_TTL_OPTIONS.find((o) => o.id === cacheSettings.contenthashTtlMs)?.label || '5 minutes';

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="OPNet Browser" />
            <div className="opnet-browser-scroll">
                {/* Info Card */}
                <div className="opnet-browser-info">
                    <InfoCircleOutlined className="opnet-browser-info-icon" />
                    <div>
                        <div className="opnet-browser-info-title">OPNet Domain Browser</div>
                        <div className="opnet-browser-info-desc">
                            Browse .btc domains through the OPNet protocol. Content is served from IPFS
                            gateways.
                        </div>
                    </div>
                </div>

                {/* Main Settings Card */}
                <div className="opnet-browser-card">
                    {/* Register Protocol */}
                    <div
                        className={`opnet-browser-row ${protocolRegistered ? 'disabled' : 'clickable'}`}
                        onClick={!protocolRegistered ? handleRegisterProtocol : undefined}>
                        <div className="opnet-browser-row-icon">
                            <LinkOutlined style={{ fontSize: 18, color: '#f37413' }} />
                        </div>
                        <div className="opnet-browser-row-content">
                            <div className="opnet-browser-row-title">Register web+opnet:// Protocol</div>
                            <div
                                className="opnet-browser-row-status"
                                style={{ color: protocolRegistered ? '#4ade80' : '#f37413' }}>
                                {protocolRegistered ? 'Registered' : 'Click to register'}
                            </div>
                            <div className="opnet-browser-row-desc">
                                Handle web+opnet:// links in the browser
                            </div>
                        </div>
                        {protocolRegistered && (
                            <CheckCircleFilled style={{ fontSize: 16, color: '#4ade80' }} />
                        )}
                    </div>

                    {/* Enable Toggle */}
                    <div
                        className={`opnet-browser-row ${enableLoading ? 'disabled' : 'clickable'}`}
                        onClick={handleToggleEnabled}>
                        <div className="opnet-browser-row-icon">
                            <GlobalOutlined style={{ fontSize: 18, color: '#f37413' }} />
                        </div>
                        <div className="opnet-browser-row-content">
                            <div className="opnet-browser-row-title">Enable .btc Domain Browsing</div>
                            <div
                                className="opnet-browser-row-status"
                                style={{ color: browserSettings?.enabled ? '#4ade80' : '#888' }}>
                                {browserSettings?.enabled ? 'Enabled' : 'Disabled'}
                            </div>
                            <div className="opnet-browser-row-desc">
                                Intercept and resolve .btc domain navigation
                            </div>
                        </div>
                        <div
                            className="opnet-browser-toggle"
                            style={{ background: browserSettings?.enabled ? '#f37413' : '#434343' }}>
                            <div
                                className="opnet-browser-toggle-knob"
                                style={{ left: browserSettings?.enabled ? 22 : 2 }}>
                                {enableLoading && (
                                    <LoadingOutlined style={{ fontSize: 10, color: '#f37413' }} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cache Settings Label */}
                <div className="opnet-browser-section-label">Cache Settings</div>

                {/* Cache Settings Card */}
                <div className="opnet-browser-card">
                    {/* Cache TTL */}
                    <div
                        className="opnet-browser-row clickable"
                        onClick={() => setCacheTtlPopoverVisible(true)}>
                        <div className="opnet-browser-row-icon">
                            <ClockCircleOutlined style={{ fontSize: 18, color: '#f37413' }} />
                        </div>
                        <div className="opnet-browser-row-content">
                            <div className="opnet-browser-row-title">Cache TTL</div>
                            <div className="opnet-browser-row-status" style={{ color: '#f37413' }}>
                                {cacheTtlLabel}
                            </div>
                            <div className="opnet-browser-row-desc">
                                How long to cache domain resolutions
                            </div>
                        </div>
                        <RightOutlined style={{ fontSize: 12, color: '#888' }} />
                    </div>

                    {/* Cache Stats */}
                    {cacheStats && (
                        <div className="opnet-browser-row">
                            <div className="opnet-browser-row-icon">
                                <CloudServerOutlined style={{ fontSize: 18, color: '#f37413' }} />
                            </div>
                            <div className="opnet-browser-row-content">
                                <div className="opnet-browser-row-title">Cache Usage</div>
                                <div className="opnet-browser-row-status" style={{ color: '#888' }}>
                                    {cacheStats.contenthashEntries} domains, {cacheStats.contentEntries}{' '}
                                    files
                                </div>
                                <div className="opnet-browser-row-desc">
                                    {cacheStats.contentSizeMb.toFixed(2)} MB / {cacheStats.maxSizeMb} MB
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clear Cache */}
                    <div
                        className={`opnet-browser-row ${clearingCache ? 'disabled' : 'clickable'}`}
                        onClick={handleClearCache}>
                        <div
                            className="opnet-browser-row-icon"
                            style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                            {clearingCache ? (
                                <LoadingOutlined style={{ fontSize: 18, color: '#ef4444' }} />
                            ) : (
                                <ClearOutlined style={{ fontSize: 18, color: '#ef4444' }} />
                            )}
                        </div>
                        <div className="opnet-browser-row-content">
                            <div className="opnet-browser-row-title" style={{ color: '#ef4444' }}>
                                Clear Cache
                            </div>
                            <div className="opnet-browser-row-desc">
                                Remove all cached domain resolutions and content
                            </div>
                        </div>
                    </div>
                </div>

                {/* IPFS Gateways Label */}
                <div className="opnet-browser-section-header">
                    <div className="opnet-browser-section-label">IPFS Gateways</div>
                    <div className="opnet-browser-section-actions">
                        <button
                            className="opnet-browser-btn-secondary"
                            onClick={handleRefreshGateways}
                            disabled={refreshingGateways}>
                            {refreshingGateways ? (
                                <LoadingOutlined style={{ fontSize: 10 }} />
                            ) : (
                                <ReloadOutlined style={{ fontSize: 10 }} />
                            )}
                            <span>Refresh</span>
                        </button>
                        <button
                            className="opnet-browser-btn-primary"
                            onClick={() => setAddGatewayPopoverVisible(true)}>
                            <PlusOutlined style={{ fontSize: 10 }} />
                            <span>Add</span>
                        </button>
                    </div>
                </div>

                {/* Gateways Card */}
                <div className="opnet-browser-card">
                    {gateways.map((gateway, index) => (
                        <div
                            key={gateway.config.url}
                            className="opnet-browser-gateway-row"
                            style={{
                                borderBottom:
                                    index < gateways.length - 1 ? '1px solid #303030' : 'none'
                            }}>
                            <div
                                className="opnet-browser-gateway-dot"
                                style={{
                                    background: gateway.health.isHealthy ? '#4ade80' : '#ef4444'
                                }}
                            />
                            <div className="opnet-browser-gateway-info">
                                <div className="opnet-browser-gateway-url">
                                    {gateway.config.url.replace('https://', '')}
                                </div>
                                <div className="opnet-browser-gateway-meta">
                                    {gateway.config.isLocalNode && (
                                        <span style={{ color: '#fbbf24' }}>Local</span>
                                    )}
                                    {gateway.config.isDefault && <span>Default</span>}
                                    {typeof gateway.health.latency === 'number' &&
                                        isFinite(gateway.health.latency) &&
                                        gateway.health.latency > 0 && (
                                            <span>{gateway.health.latency}ms</span>
                                        )}
                                </div>
                            </div>
                            {gateway.config.isUserConfigured && !gateway.config.isDefault && (
                                <button
                                    className="opnet-browser-gateway-delete"
                                    onClick={() => handleRemoveGateway(gateway.config.url)}>
                                    <DeleteOutlined style={{ fontSize: 12, color: '#ef4444' }} />
                                </button>
                            )}
                        </div>
                    ))}
                    {gateways.length === 0 && (
                        <div className="opnet-browser-empty">No gateways configured</div>
                    )}
                </div>

                {/* Bottom spacing */}
                <div style={{ height: 24 }} />
            </div>

            {/* Popovers */}
            {cacheTtlPopoverVisible && (
                <CacheTtlPopover
                    currentTtlMs={cacheSettings.contenthashTtlMs}
                    onSelect={handleSetCacheTtl}
                    onCancel={() => setCacheTtlPopoverVisible(false)}
                />
            )}
            {addGatewayPopoverVisible && (
                <AddGatewayPopover
                    onAdd={handleAddGateway}
                    onCancel={() => setAddGatewayPopoverVisible(false)}
                />
            )}

            <style>{`
                .opnet-browser-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    gap: 12px;
                    color: #888;
                }
                .opnet-browser-scroll {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 12px;
                }
                .opnet-browser-info {
                    background: #292929;
                    border-radius: 10px;
                    padding: 10px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                }
                .opnet-browser-info-icon {
                    font-size: 13px;
                    color: rgba(219, 219, 219, 0.7);
                    margin-top: 1px;
                    flex-shrink: 0;
                }
                .opnet-browser-info-title {
                    font-size: 11px;
                    color: #dbdbdb;
                    font-weight: 500;
                    margin-bottom: 3px;
                }
                .opnet-browser-info-desc {
                    font-size: 10px;
                    color: rgba(219, 219, 219, 0.7);
                    line-height: 1.3;
                }
                .opnet-browser-card {
                    background: #292929;
                    border-radius: 14px;
                    overflow: hidden;
                    margin-bottom: 16px;
                }
                .opnet-browser-row {
                    display: flex;
                    align-items: center;
                    padding: 14px 12px;
                    border-bottom: 1px solid #303030;
                }
                .opnet-browser-row:last-child {
                    border-bottom: none;
                }
                .opnet-browser-row.clickable {
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .opnet-browser-row.clickable:hover {
                    background: rgba(85, 85, 85, 0.3);
                }
                .opnet-browser-row.disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .opnet-browser-row-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: rgba(85, 85, 85, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    flex-shrink: 0;
                }
                .opnet-browser-row-content {
                    flex: 1;
                    min-width: 0;
                }
                .opnet-browser-row-title {
                    font-size: 14px;
                    font-weight: 500;
                    color: #dbdbdb;
                    margin-bottom: 2px;
                }
                .opnet-browser-row-status {
                    font-size: 12px;
                    font-weight: 500;
                }
                .opnet-browser-row-desc {
                    font-size: 11px;
                    color: rgba(219, 219, 219, 0.7);
                    margin-top: 2px;
                }
                .opnet-browser-toggle {
                    width: 44px;
                    height: 24px;
                    border-radius: 12px;
                    position: relative;
                    transition: background 0.2s;
                    flex-shrink: 0;
                }
                .opnet-browser-toggle-knob {
                    width: 20px;
                    height: 20px;
                    border-radius: 10px;
                    background: #dbdbdb;
                    position: absolute;
                    top: 2px;
                    transition: left 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .opnet-browser-section-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: rgba(219, 219, 219, 0.7);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                    padding-left: 4px;
                }
                .opnet-browser-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    padding: 0 4px;
                }
                .opnet-browser-section-actions {
                    display: flex;
                    gap: 8px;
                }
                .opnet-browser-btn-secondary {
                    padding: 4px 8px;
                    background: transparent;
                    border: 1px solid #303030;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 10px;
                    color: rgba(219, 219, 219, 0.7);
                }
                .opnet-browser-btn-secondary:hover {
                    background: rgba(85, 85, 85, 0.3);
                }
                .opnet-browser-btn-secondary:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .opnet-browser-btn-primary {
                    padding: 4px 8px;
                    background: #f37413;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 10px;
                    color: #fff;
                    font-weight: 500;
                }
                .opnet-browser-btn-primary:hover {
                    background: #e56b0e;
                }
                .opnet-browser-gateway-row {
                    display: flex;
                    align-items: center;
                    padding: 12px;
                }
                .opnet-browser-gateway-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 4px;
                    margin-right: 10px;
                    flex-shrink: 0;
                }
                .opnet-browser-gateway-info {
                    flex: 1;
                    min-width: 0;
                }
                .opnet-browser-gateway-url {
                    font-size: 12px;
                    font-weight: 500;
                    color: #dbdbdb;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .opnet-browser-gateway-meta {
                    font-size: 10px;
                    color: rgba(219, 219, 219, 0.7);
                    margin-top: 2px;
                    display: flex;
                    gap: 8px;
                }
                .opnet-browser-gateway-delete {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: rgba(239, 68, 68, 0.1);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .opnet-browser-gateway-delete:hover {
                    background: rgba(239, 68, 68, 0.2);
                }
                .opnet-browser-empty {
                    padding: 20px;
                    text-align: center;
                    color: rgba(219, 219, 219, 0.7);
                    font-size: 12px;
                }
            `}</style>
        </Layout>
    );
}

function CacheTtlPopover({
    currentTtlMs,
    onSelect,
    onCancel
}: {
    currentTtlMs: number;
    onSelect: (ttl: number) => void;
    onCancel: () => void;
}) {
    return (
        <Popover onClose={onCancel}>
            <div style={{ width: '100%' }}>
                <div
                    style={{
                        textAlign: 'center',
                        paddingBottom: 12,
                        borderBottom: '1px solid #303030'
                    }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#dbdbdb', marginBottom: 4 }}>
                        Cache TTL
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(219, 219, 219, 0.7)' }}>
                        Choose how long to cache domain resolutions
                    </div>
                </div>
                <div style={{ margin: '12px 0' }}>
                    {CACHE_TTL_OPTIONS.map((option) => {
                        const isSelected = option.id === currentTtlMs;
                        return (
                            <div
                                key={option.id}
                                onClick={() => onSelect(option.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 10,
                                    marginBottom: 6,
                                    background: isSelected
                                        ? 'linear-gradient(135deg, rgba(243,116,19,0.15) 0%, rgba(243,116,19,0.05) 100%)'
                                        : 'rgba(85, 85, 85, 0.3)',
                                    border: isSelected ? '1px solid #f37413' : '1px solid transparent',
                                    borderRadius: 10,
                                    cursor: 'pointer'
                                }}>
                                <div
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 8,
                                        background: isSelected ? 'rgba(243,116,19,0.2)' : '#292929',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 10
                                    }}>
                                    <ClockCircleOutlined
                                        style={{ fontSize: 14, color: isSelected ? '#f37413' : '#888' }}
                                    />
                                </div>
                                <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#dbdbdb' }}>
                                    {option.label}
                                </div>
                                {isSelected && (
                                    <CheckCircleFilled style={{ fontSize: 14, color: '#f37413' }} />
                                )}
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={onCancel}
                    style={{
                        width: '100%',
                        padding: 10,
                        background: 'rgba(85, 85, 85, 0.3)',
                        border: '1px solid #303030',
                        borderRadius: 10,
                        color: '#dbdbdb',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}>
                    Cancel
                </button>
            </div>
        </Popover>
    );
}

function AddGatewayPopover({
    onAdd,
    onCancel
}: {
    onAdd: (url: string) => void;
    onCancel: () => void;
}) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        let gatewayUrl = url.trim();
        if (!gatewayUrl) {
            setError('Please enter a gateway URL');
            return;
        }
        if (!gatewayUrl.startsWith('http://') && !gatewayUrl.startsWith('https://')) {
            gatewayUrl = 'https://' + gatewayUrl;
        }
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
            <div style={{ width: '100%' }}>
                <div
                    style={{
                        textAlign: 'center',
                        paddingBottom: 12,
                        borderBottom: '1px solid #303030'
                    }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#dbdbdb', marginBottom: 4 }}>
                        Add IPFS Gateway
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(219, 219, 219, 0.7)' }}>
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
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        style={{
                            width: '100%',
                            padding: 12,
                            background: 'rgba(85, 85, 85, 0.3)',
                            border: `1px solid ${error ? '#ef4444' : '#303030'}`,
                            borderRadius: 10,
                            color: '#dbdbdb',
                            fontSize: 13,
                            fontFamily: 'monospace',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                    {error && (
                        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6, paddingLeft: 4 }}>
                            {error}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: 10,
                            background: 'rgba(85, 85, 85, 0.3)',
                            border: '1px solid #303030',
                            borderRadius: 10,
                            color: '#dbdbdb',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        style={{
                            flex: 1,
                            padding: 10,
                            background: '#f37413',
                            border: 'none',
                            borderRadius: 10,
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}>
                        Add Gateway
                    </button>
                </div>
            </div>
        </Popover>
    );
}
