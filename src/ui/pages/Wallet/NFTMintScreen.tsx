import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Column, Content, Header, Layout } from '@/ui/components';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useWallet } from '@/ui/utils';
import Web3API from '@/shared/web3/Web3API';
import { FireOutlined, LoadingOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Action, Features, MintNFTParameters } from '@/shared/interfaces/RawTxParameters';

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
    error: '#ef4444',
    warning: '#fbbf24'
};

interface NFTCollection {
    address: string;
    name: string;
    symbol: string;
    icon?: string;
    banner?: string;
    description?: string;
    totalSupply: string;
    maximumSupply: string;
}

interface MintInfo {
    price: bigint;
    maxPerWallet?: bigint;
    userMinted?: bigint;
    totalMinted?: bigint;
    maxSupply?: bigint;
    isPaused?: boolean;
}

export default function NFTMintScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const wallet = useWallet();
    const currentAccount = useCurrentAccount();

    // Get collection from navigation state
    const { collection } = location.state as { collection: NFTCollection };

    const [feeRate, setFeeRate] = useState(5);
    const [quantity, setQuantity] = useState(1);
    const [mintInfo, setMintInfo] = useState<MintInfo | null>(null);
    const [loadingMintInfo, setLoadingMintInfo] = useState(true);
    const [error, setError] = useState('');
    const [maxMintable, setMaxMintable] = useState(1);

    // Initialize Web3API
    useEffect(() => {
        void (async () => {
            const chain = await wallet.getChainType();
            await Web3API.setNetwork(chain);
        })();
    }, [wallet]);

    // Load mint information
    useEffect(() => {
        const fetchMintInfo = async () => {
            if (!collection) return;

            await Promise.resolve();

            /*try {
                setLoadingMintInfo(true);

                // Get mint price
                const price = await Web3API.getMintPrice(collection.address);
                if (!price || price === false) {
                    setError('Unable to fetch mint price');
                    return;
                }

                // Get mint limits and status
                const maxPerWallet = await Web3API.getMaxMintPerWallet(collection.address);
                const userMinted = await Web3API.getUserMintedCount(collection.address, currentAccount.pubkey);
                const isPaused = await Web3API.isMintPaused(collection.address);

                const mintInfo: MintInfo = {
                    price: BigInt(price),
                    maxPerWallet: maxPerWallet ? BigInt(maxPerWallet) : undefined,
                    userMinted: userMinted ? BigInt(userMinted) : 0n,
                    totalMinted: BigInt(collection.totalSupply || 0),
                    maxSupply: BigInt(collection.maximumSupply || 0),
                    isPaused: isPaused === true
                };

                setMintInfo(mintInfo);

                // Calculate max mintable
                if (mintInfo.maxPerWallet && mintInfo.userMinted !== undefined) {
                    const remaining = Number(mintInfo.maxPerWallet - mintInfo.userMinted);
                    setMaxMintable(Math.max(0, remaining));
                } else {
                    setMaxMintable(10); // Default max
                }

                if (mintInfo.isPaused) {
                    setError('Minting is currently paused');
                } else if (maxMintable === 0) {
                    setError('You have reached the mint limit');
                }
            } catch (err) {
                console.error('Failed to fetch mint info:', err);
                setError('Failed to fetch mint information');
            } finally {
                setLoadingMintInfo(false);
            }*/
        };

        void fetchMintInfo();
    }, [collection, currentAccount.pubkey]);

    const handleMint = () => {
        if (!collection || !mintInfo) return;

        const totalCost = mintInfo.price * BigInt(quantity);

        const event: MintNFTParameters = {
            priorityFee: 0n,
            tokens: [],
            collectionAddress: collection.address,
            collectionName: collection.name,
            quantity: BigInt(quantity),
            mintPrice: mintInfo.price,
            totalCost,
            feeRate,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true
            },
            action: Action.MintNFT,
            header: `Mint ${quantity} NFT${quantity > 1 ? 's' : ''} from ${collection.name}`
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo: event });
    };

    if (!collection) {
        return (
            <Layout>
                <Header title="Mint NFT" onBack={() => window.history.go(-1)} />
                <Content style={{ padding: '16px' }}>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: colors.error }}>Collection data not found</p>
                    </div>
                </Content>
            </Layout>
        );
    }

    const formatPrice = (price: bigint) => {
        const btc = Number(price) / 1e8;
        return `${btc.toFixed(8)} BTC`;
    };

    const disabled =
        !mintInfo ||
        mintInfo.isPaused ||
        maxMintable === 0 ||
        quantity < 1 ||
        quantity > maxMintable ||
        loadingMintInfo;

    return (
        <Layout>
            <Header title="Mint NFT" onBack={() => window.history.go(-1)} />

            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* Collection Info */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '12px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center'
                        }}>
                        <div
                            style={{
                                width: '64px',
                                height: '64px',
                                background: colors.containerBg,
                                borderRadius: '10px',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                            {collection.icon ? (
                                <img
                                    src={collection.icon}
                                    alt={collection.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '28px'
                                    }}>
                                    🎨
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text }}>
                                {collection.name}
                            </div>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                                {mintInfo && mintInfo.totalMinted !== undefined && mintInfo.maxSupply
                                    ? `${mintInfo.totalMinted.toString()} / ${mintInfo.maxSupply.toString()} minted`
                                    : 'Loading...'}
                            </div>
                        </div>
                    </div>

                    {loadingMintInfo ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <LoadingOutlined style={{ fontSize: 24, color: colors.main }} />
                            <div style={{ marginTop: '8px', color: colors.textFaded, fontSize: '12px' }}>
                                Loading mint information...
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mint Details */}
                            <div
                                style={{
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px',
                                    padding: '14px',
                                    marginBottom: '12px'
                                }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '12px'
                                    }}>
                                    <FireOutlined style={{ fontSize: 14, color: colors.main }} />
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: colors.textFaded,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                        Mint Details
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '12px', color: colors.textFaded }}>
                                            Price per NFT:
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                                            {mintInfo ? formatPrice(mintInfo.price) : '---'}
                                        </span>
                                    </div>

                                    {mintInfo?.maxPerWallet && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '12px', color: colors.textFaded }}>
                                                Your minted:
                                            </span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                                                {mintInfo.userMinted?.toString() || '0'} /{' '}
                                                {mintInfo.maxPerWallet.toString()}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '12px', color: colors.textFaded }}>Status:</span>
                                        <span
                                            style={{
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: mintInfo?.isPaused ? colors.error : colors.success
                                            }}>
                                            {mintInfo?.isPaused ? 'Paused' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity Selector */}
                            <div
                                style={{
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px',
                                    padding: '14px',
                                    marginBottom: '12px'
                                }}>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: colors.textFaded,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '10px'
                                    }}>
                                    Quantity
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            background: colors.buttonBg,
                                            border: 'none',
                                            color: colors.text,
                                            fontSize: '16px',
                                            cursor: quantity > 1 ? 'pointer' : 'not-allowed',
                                            opacity: quantity > 1 ? 1 : 0.5,
                                            transition: 'all 0.15s'
                                        }}
                                        disabled={quantity <= 1}
                                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                        onMouseEnter={(e) => {
                                            if (quantity > 1) e.currentTarget.style.background = colors.main;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = colors.buttonBg;
                                        }}>
                                        −
                                    </button>

                                    <div
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            fontSize: '20px',
                                            fontWeight: 600,
                                            color: colors.text
                                        }}>
                                        {quantity}
                                    </div>

                                    <button
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            background: colors.buttonBg,
                                            border: 'none',
                                            color: colors.text,
                                            fontSize: '16px',
                                            cursor: quantity < maxMintable ? 'pointer' : 'not-allowed',
                                            opacity: quantity < maxMintable ? 1 : 0.5,
                                            transition: 'all 0.15s'
                                        }}
                                        disabled={quantity >= maxMintable}
                                        onClick={() => setQuantity((q) => Math.min(maxMintable, q + 1))}
                                        onMouseEnter={(e) => {
                                            if (quantity < maxMintable) e.currentTarget.style.background = colors.main;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = colors.buttonBg;
                                        }}>
                                        +
                                    </button>
                                </div>

                                <div
                                    style={{
                                        marginTop: '12px',
                                        padding: '8px',
                                        background: colors.containerBg,
                                        borderRadius: '6px',
                                        textAlign: 'center'
                                    }}>
                                    <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '4px' }}>
                                        Total Cost
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: colors.main }}>
                                        {mintInfo ? formatPrice(mintInfo.price * BigInt(quantity)) : '---'}
                                    </div>
                                </div>
                            </div>

                            {/* Fee Section */}
                            <div
                                style={{
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px',
                                    padding: '14px',
                                    marginBottom: '12px'
                                }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '10px'
                                    }}>
                                    <ThunderboltOutlined style={{ fontSize: 14, color: colors.main }} />
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: colors.textFaded,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                        Network Fee
                                    </span>
                                </div>

                                <FeeRateBar onChange={(val) => setFeeRate(val)} />
                            </div>
                        </>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div
                            style={{
                                padding: '8px',
                                background: `${colors.error}15`,
                                border: `1px solid ${colors.error}30`,
                                borderRadius: '8px',
                                textAlign: 'center',
                                marginBottom: '12px'
                            }}>
                            <span style={{ fontSize: '12px', color: colors.error }}>{error}</span>
                        </div>
                    )}

                    {/* Mint Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: disabled ? colors.buttonBg : colors.main,
                            border: 'none',
                            borderRadius: '12px',
                            color: disabled ? colors.textFaded : colors.background,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '20px'
                        }}
                        disabled={disabled}
                        onClick={handleMint}
                        onMouseEnter={(e) => {
                            if (!disabled) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <span>
                            Mint {quantity} NFT{quantity > 1 ? 's' : ''}
                        </span>
                        <FireOutlined style={{ fontSize: 14 }} />
                    </button>
                </Column>
            </Content>
        </Layout>
    );
}
