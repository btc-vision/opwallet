import React, { useEffect, useState } from 'react';
import Web3API from '@/shared/web3/Web3API';
import { Column, Content, Header, Input, Layout } from '@/ui/components';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChainType } from '@/ui/state/settings/hooks';
import { useTools } from '@/ui/components/ActionComponent';
import { LoadingOutlined } from '@ant-design/icons';
import { AddressTypes, AddressVerificator } from '@btc-vision/transaction';

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

    const [contractAddress, setContractAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

    const storageKey = `opnetTokens_${chainType}_${currentAccount.pubkey}`;

    useEffect(() => {
        void (async () => {
            await Web3API.setNetwork(chainType);
        })();
    }, [chainType]);

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
            setError(`Invalid address format. Must be a valid contract address. Detected type: ${type}`);
            return;
        }

        setLoading(true);
        try {
            const info = await Web3API.queryContractInformation(address);

            if (info === false) {
                setError('Token contract not found');
            } else if (info) {
                setTokenInfo({
                    address,
                    name: info.name || 'Unknown Token',
                    symbol: info.symbol || 'UNKNOWN',
                    decimals: info.decimals || 18,
                    totalSupply: info.maximumSupply?.toString() || '0',
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
            tools.toastSuccess('Token imported successfully');

            navigate(RouteTypes.MainScreen);
        } catch (err) {
            setError('Failed to import token');
            console.error(err);
        }
    };

    return (
        <Layout>
            <Header title="Import OP20 Token" onBack={() => navigate(RouteTypes.ImportSelectionScreen)} />

            <Content style={{ padding: '16px' }}>
                <Column gap="lg">
                    <div style={{ marginBottom: '8px' }}>
                        <p
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                marginBottom: '16px'
                            }}>
                            Enter the OP20 token contract address to import
                        </p>
                    </div>

                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px'
                        }}>
                        <div
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            Contract Address
                        </div>
                        <Input
                            placeholder="Enter token address (0x...)"
                            value={contractAddress}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            style={{
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px'
                            }}
                        />
                    </div>

                    {loading && (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '20px'
                            }}>
                            <LoadingOutlined style={{ fontSize: 24, color: colors.main }} />
                            <div style={{ marginTop: '8px', color: colors.textFaded, fontSize: '12px' }}>
                                Fetching token information...
                            </div>
                        </div>
                    )}

                    {tokenInfo && !loading && (
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '12px',
                                padding: '16px',
                                border: `1px solid ${colors.main}30`
                            }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                <div
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        background: tokenInfo.icon ? 'transparent' : colors.main,
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px',
                                        overflow: 'hidden',
                                        flexShrink: 0
                                    }}>
                                    {tokenInfo.icon ? (
                                        <img
                                            src={tokenInfo.icon}
                                            alt={tokenInfo.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        '🪙'
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text }}>
                                        {tokenInfo.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                                        {tokenInfo.symbol}
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr',
                                    gap: '12px',
                                    padding: '12px',
                                    background: colors.inputBg,
                                    borderRadius: '8px'
                                }}>
                                <div>
                                    <div style={{ fontSize: '10px', color: colors.textFaded, marginBottom: '4px' }}>
                                        DECIMALS
                                    </div>
                                    <div style={{ fontSize: '14px', color: colors.text }}>{tokenInfo.decimals}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: colors.textFaded, marginBottom: '4px' }}>
                                        TOTAL SUPPLY
                                    </div>
                                    <div style={{ fontSize: '14px', color: colors.text }}>
                                        {formatSupply(tokenInfo.totalSupply, tokenInfo.decimals)} {tokenInfo.symbol}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div
                            style={{
                                padding: '12px',
                                background: `${colors.error}15`,
                                border: `1px solid ${colors.error}30`,
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                            <span style={{ fontSize: '12px', color: colors.error }}>{error}</span>
                        </div>
                    )}

                    <button
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: tokenInfo && !loading ? colors.main : colors.buttonBg,
                            border: 'none',
                            borderRadius: '12px',
                            color: tokenInfo && !loading ? colors.background : colors.textFaded,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: tokenInfo && !loading ? 'pointer' : 'not-allowed',
                            opacity: tokenInfo && !loading ? 1 : 0.5,
                            transition: 'all 0.2s',
                            marginTop: '24px'
                        }}
                        disabled={!tokenInfo || loading}
                        onClick={handleImport}>
                        Import Token
                    </button>
                </Column>
            </Content>
        </Layout>
    );
}
