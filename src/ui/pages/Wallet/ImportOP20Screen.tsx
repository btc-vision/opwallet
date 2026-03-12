import Web3API from '@/shared/web3/Web3API';
import { Content, Header, Input, Layout, OPNetLoader } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { Image } from '@/ui/components/Image';
import { fontSizes } from '@/ui/theme/font';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChain, useChainType } from '@/ui/state/settings/hooks';
import { CheckCircleOutlined, DollarOutlined, PlusCircleOutlined, SearchOutlined, StarOutlined } from '@ant-design/icons';
import { Address, AddressTypes, AddressVerificator } from '@btc-vision/transaction';
import { useEffect, useState } from 'react';

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
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444'
};

interface TokenInfo {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    icon?: string;
}

interface StoredToken {
    address: string;
    hidden: boolean;
}

export default function ImportTokenScreen() {
    const navigate = useNavigate();
    const tools = useTools();
    const currentAccount = useCurrentAccount();
    const chainType = useChainType();
    const chain = useChain();

    const [contractAddress, setContractAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [suggestedTokens, setSuggestedTokens] = useState<Array<{ address: string; name: string; logo?: string }>>([]);

    const storageKey = `opnetTokens_${chainType}_${currentAccount.pubkey}`;

    useEffect(() => {
        void (async () => {
            await Web3API.setNetwork(chainType);

            // Check which default tokens are not currently stored
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];
            const storedAddresses = stored.map((t) => (typeof t === 'string' ? t : t.address));

            const suggestions = [];

            // Get default token addresses from Web3API
            const moto = Web3API.motoAddressP2OP;
            const pill = Web3API.pillAddressP2OP;

            // Load token info to get logos
            if (moto && !storedAddresses.includes(moto)) {
                try {
                    const info = await Web3API.queryContractInformation(moto);
                    suggestions.push({
                        address: moto,
                        name: 'Motoswap',
                        logo: info ? info.logo : undefined
                    });
                } catch (e) {
                    suggestions.push({ address: moto, name: 'Motoswap' });
                }
            }
            if (pill && !storedAddresses.includes(pill)) {
                try {
                    const info = await Web3API.queryContractInformation(pill);
                    suggestions.push({
                        address: pill,
                        name: 'Pill',
                        logo: info ? info.logo : undefined
                    });
                } catch (e) {
                    suggestions.push({ address: pill, name: 'Pill' });
                }
            }

            setSuggestedTokens(suggestions);
        })();
    }, [chainType, storageKey]);

    const formatSupply = (supply: string, decimals: number): string => {
        try {
            const supplyBigInt = BigInt(supply);
            const divisor = BigInt(10 ** decimals);
            const whole = supplyBigInt / divisor;
            const remainder = supplyBigInt % divisor;

            if (remainder === 0n) {
                return whole.toLocaleString();
            }

            // Format with decimals
            const decimalStr = remainder.toString().padStart(decimals, '0');
            const trimmedDecimal = decimalStr.replace(/0+$/, '');

            if (trimmedDecimal === '') {
                return whole.toLocaleString();
            }

            return `${whole.toLocaleString()}.${trimmedDecimal}`;
        } catch {
            return '0';
        }
    };

    const handleAddressChange = async (address: string) => {
        setContractAddress(address);
        setError('');
        setTokenInfo(null);

        if (!address) return;

        const type = AddressVerificator.detectAddressType(address, Web3API.network);
        if (type !== AddressTypes.P2OP && type !== AddressTypes.P2PK) {
            setError('Invalid address format. Must be a valid contract address.');
            return;
        }

        setLoading(true);
        try {
            const info = await Web3API.queryContractInformation(address);

            if (info === false) {
                setError('Token contract not found');
            } else if (info) {
                setTokenInfo({
                    address: type === AddressTypes.P2OP ? address : Address.fromString(address).p2op(Web3API.network),
                    name: info.name || 'Unknown Token',
                    symbol: info.symbol || 'UNKNOWN',
                    decimals: info.decimals || 18,
                    totalSupply: info.totalSupply?.toString() || '0',
                    icon: info.logo
                });
            }
        } catch (err) {
            setError('Failed to fetch token information');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = () => {
        if (!tokenInfo) return;

        try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];

            // Check if already exists
            const exists = stored.some((t) => {
                const addr = typeof t === 'string' ? t : t.address;
                return addr === tokenInfo.address;
            });

            if (exists) {
                setError('Token already imported');
                return;
            }

            // Add as plain string (address only) to match OPNetList format
            stored.push(tokenInfo.address);
            localStorage.setItem(storageKey, JSON.stringify(stored));

            // Remove from suggested tokens if it's already imported
            setSuggestedTokens((prev) => prev.filter((t) => t.address !== tokenInfo.address));

            tools.toastSuccess('Token imported successfully');

            navigate(RouteTypes.MainScreen);
        } catch (err) {
            setError('Failed to import token');
            console.error(err);
        }
    };

    if (chain.opnetDisabled) {
        return (
            <Layout>
                <Header title="Import OP_20 Token" onBack={() => navigate(RouteTypes.ImportSelectionScreen)} />
                <Content style={{ padding: '16px' }}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '200px',
                            textAlign: 'center',
                            gap: '16px'
                        }}>
                        <p style={{ fontSize: '14px', color: colors.textFaded }}>
                            OPNet features are not yet available on this network.
                        </p>
                    </div>
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header title="Import OP_20 Token" onBack={() => navigate(RouteTypes.ImportSelectionScreen)} />

            <Content style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Hero Header */}
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '20px 16px 16px'
                        }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '14px',
                                background: `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}08 100%)`,
                                border: `1px solid ${colors.main}25`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 12px'
                            }}>
                            <PlusCircleOutlined style={{ fontSize: 22, color: colors.main }} />
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                lineHeight: '1.5'
                            }}>
                            {suggestedTokens.length > 0
                                ? 'Pick a suggested token or enter a contract address'
                                : 'Enter the OP_20 token contract address to import'}
                        </div>
                    </div>

                    {/* Suggested Tokens */}
                    {suggestedTokens.length > 0 && (
                        <div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '10px'
                                }}>
                                <StarOutlined style={{ fontSize: 11, color: colors.main }} />
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: colors.textFaded,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    Suggested Tokens
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {suggestedTokens.map((token) => (
                                    <button
                                        key={token.address}
                                        style={{
                                            width: '100%',
                                            background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
                                            border: `1px solid rgba(255,255,255,0.06)`,
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                        onClick={() => handleAddressChange(token.address)}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = `${colors.main}50`;
                                            e.currentTarget.style.background = `linear-gradient(135deg, ${colors.main}08 0%, ${colors.main}03 100%)`;
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                            e.currentTarget.style.background = `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`;
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                    background: token.logo ? 'transparent' : `${colors.main}15`,
                                                    flexShrink: 0
                                                }}>
                                                {token.logo ? (
                                                    <Image src={token.logo} size={fontSizes.iconMiddle} />
                                                ) : (
                                                    <DollarOutlined
                                                        style={{ fontSize: '16px', color: colors.main }}
                                                    />
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <div
                                                    style={{
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: colors.text
                                                    }}>
                                                    {token.name}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '10px',
                                                        color: colors.textFaded,
                                                        marginTop: '2px',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                    {token.address.slice(0, 8)}...{token.address.slice(-6)}
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: colors.main,
                                                fontWeight: 600,
                                                background: `${colors.main}12`,
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                transition: 'all 0.2s'
                                            }}>
                                            Import
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Divider between suggestions and manual input */}
                    {suggestedTokens.length > 0 && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                            <span
                                style={{
                                    fontSize: '10px',
                                    color: 'rgba(255,255,255,0.25)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    fontWeight: 600
                                }}>
                                or
                            </span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                        </div>
                    )}

                    {/* Contract Address Input */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
                            borderRadius: '14px',
                            padding: '14px',
                            border: contractAddress
                                ? `1px solid ${error ? colors.error + '40' : tokenInfo ? colors.success + '30' : colors.main + '25'}`
                                : '1px solid rgba(255,255,255,0.06)',
                            transition: 'border-color 0.3s ease'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <SearchOutlined style={{ fontSize: 11 }} />
                            Contract Address
                        </div>
                        <Input
                            placeholder="Enter token address (bcrt1p... or 0x...)"
                            value={contractAddress}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            style={{
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '10px',
                                padding: '10px 12px',
                                fontSize: '13px',
                                fontFamily: 'monospace'
                            }}
                        />
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '24px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '14px',
                                border: '1px solid rgba(255,255,255,0.04)'
                            }}>
                            <OPNetLoader size={50} text="Fetching token" />
                        </div>
                    )}

                    {/* Token Info Preview */}
                    {tokenInfo && !loading && (
                        <div
                            style={{
                                background: `linear-gradient(135deg, ${colors.main}08 0%, rgba(255,255,255,0.02) 100%)`,
                                borderRadius: '14px',
                                padding: '16px',
                                border: `1px solid ${colors.main}20`,
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                            {/* Subtle glow accent */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '-30px',
                                    right: '-30px',
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: `radial-gradient(circle, ${colors.main}15 0%, transparent 70%)`,
                                    pointerEvents: 'none'
                                }}
                            />

                            {/* Token header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    marginBottom: '16px',
                                    position: 'relative'
                                }}>
                                <div
                                    style={{
                                        width: '52px',
                                        height: '52px',
                                        background: tokenInfo.icon
                                            ? 'transparent'
                                            : `linear-gradient(135deg, ${colors.main}30 0%, ${colors.main}10 100%)`,
                                        borderRadius: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        border: tokenInfo.icon ? 'none' : `1px solid ${colors.main}20`
                                    }}>
                                    {tokenInfo.icon ? (
                                        <img
                                            src={tokenInfo.icon}
                                            alt={tokenInfo.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: '14px'
                                            }}
                                        />
                                    ) : (
                                        <DollarOutlined style={{ fontSize: '24px', color: colors.main }} />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: '17px',
                                            fontWeight: 700,
                                            color: colors.text,
                                            lineHeight: '1.2'
                                        }}>
                                        {tokenInfo.name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: colors.main,
                                            fontWeight: 600,
                                            marginTop: '3px'
                                        }}>
                                        {tokenInfo.symbol}
                                    </div>
                                </div>
                                <CheckCircleOutlined
                                    style={{ fontSize: 18, color: colors.success, flexShrink: 0 }}
                                />
                            </div>

                            {/* Token details grid */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1px',
                                    background: 'rgba(255,255,255,0.04)',
                                    borderRadius: '10px',
                                    overflow: 'hidden'
                                }}>
                                <div
                                    style={{
                                        padding: '12px',
                                        background: colors.inputBg
                                    }}>
                                    <div
                                        style={{
                                            fontSize: '10px',
                                            color: colors.textFaded,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            marginBottom: '4px',
                                            fontWeight: 600
                                        }}>
                                        Decimals
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '15px',
                                            color: colors.text,
                                            fontWeight: 600,
                                            fontVariantNumeric: 'tabular-nums'
                                        }}>
                                        {tokenInfo.decimals}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: '12px',
                                        background: colors.inputBg
                                    }}>
                                    <div
                                        style={{
                                            fontSize: '10px',
                                            color: colors.textFaded,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            marginBottom: '4px',
                                            fontWeight: 600
                                        }}>
                                        Total Supply
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            color: colors.text,
                                            fontWeight: 600,
                                            fontVariantNumeric: 'tabular-nums',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                        {formatSupply(tokenInfo.totalSupply, tokenInfo.decimals)}{' '}
                                        <span style={{ fontSize: '11px', color: colors.textFaded, fontWeight: 500 }}>
                                            {tokenInfo.symbol}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contract address */}
                            <div
                                style={{
                                    marginTop: '12px',
                                    padding: '8px 10px',
                                    background: 'rgba(0,0,0,0.15)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                <span
                                    style={{
                                        fontSize: '9px',
                                        fontWeight: 600,
                                        color: colors.textFaded,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px',
                                        flexShrink: 0
                                    }}>
                                    Contract
                                </span>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: 'rgba(255,255,255,0.5)',
                                        fontFamily: 'monospace',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                    {tokenInfo.address}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div
                            style={{
                                padding: '10px 14px',
                                background: `linear-gradient(135deg, ${colors.error}10 0%, ${colors.error}05 100%)`,
                                border: `1px solid ${colors.error}25`,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                            <div
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: colors.error,
                                    flexShrink: 0
                                }}
                            />
                            <span style={{ fontSize: '12px', color: colors.error, fontWeight: 500 }}>{error}</span>
                        </div>
                    )}

                    {/* Import Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: '14px',
                            background:
                                tokenInfo && !loading
                                    ? `linear-gradient(135deg, ${colors.main} 0%, #d5640f 100%)`
                                    : colors.buttonBg,
                            border: 'none',
                            borderRadius: '12px',
                            color: tokenInfo && !loading ? '#000' : colors.textFaded,
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: tokenInfo && !loading ? 'pointer' : 'not-allowed',
                            opacity: tokenInfo && !loading ? 1 : 0.5,
                            transition: 'all 0.2s ease',
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow:
                                tokenInfo && !loading ? `0 4px 16px ${colors.main}30` : 'none'
                        }}
                        disabled={!tokenInfo || loading}
                        onClick={handleImport}
                        onMouseEnter={(e) => {
                            if (tokenInfo && !loading) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 6px 20px ${colors.main}40`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow =
                                tokenInfo && !loading ? `0 4px 16px ${colors.main}30` : 'none';
                        }}>
                        <PlusCircleOutlined style={{ fontSize: 16 }} />
                        Import Token
                    </button>
                </div>
            </Content>
        </Layout>
    );
}
