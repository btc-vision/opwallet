import { NFTMetadata } from '@/shared/interfaces/RawTxParameters';
import ImageService from '@/shared/services/ImageService';
import Web3API, { OwnedNFT } from '@/shared/web3/Web3API';
import { Column, Content, Footer, Header, Layout, Row } from '@/ui/components';
import { AsyncImage } from '@/ui/components/AsyncImage';
import { CopyableAddress } from '@/ui/components/CopyableAddress';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChainType } from '@/ui/state/settings/hooks';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import React, { useEffect, useState } from 'react';

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
    error: '#e74c3c'
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

interface CacheItem<T> {
    data: T;
    expiry: number;
}

// Properly typed cache
class NFTCache {
    private metadata = new Map<string, CacheItem<NFTMetadata>>();
    private ownedNfts = new Map<string, CacheItem<OwnedNFT[]>>();

    setMetadata(key: string, data: NFTMetadata, ttl: number = 7200000) {
        this.metadata.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }

    setOwnedNfts(key: string, data: OwnedNFT[], ttl: number = 30000) {
        this.ownedNfts.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }

    getMetadata(key: string): NFTMetadata | null {
        const item = this.metadata.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.metadata.delete(key);
            return null;
        }
        return item.data;
    }

    getOwnedNfts(key: string): OwnedNFT[] | null {
        const item = this.ownedNfts.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.ownedNfts.delete(key);
            return null;
        }
        return item.data;
    }
}

const nftCache = new NFTCache();

export default function NFTTabScreen() {
    const navigate = useNavigate();
    const currentAccount = useCurrentAccount();
    const chainType = useChainType();

    const [collections, setCollections] = useState<NFTCollection[]>([]);
    const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
    const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null);
    const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([]);
    const [loadingNFTs, setLoadingNFTs] = useState(false);

    const storageKey = `opnet_nft_collections_${chainType}_${currentAccount.pubkey}`;

    const handleDeleteCollection = (collectionAddress: string) => {
        const updatedCollections = collections.filter((c) => c.address !== collectionAddress);
        setCollections(updatedCollections);
        localStorage.setItem(storageKey, JSON.stringify(updatedCollections));
    };

    useEffect(() => {
        const fetchCollectionCounts = async () => {
            const counts: Record<string, number> = {};
            const userAddress = currentAccount.quantumPublicKeyHash
                ? Address.fromString(currentAccount.quantumPublicKeyHash, currentAccount.pubkey)
                : Address.fromString(currentAccount.pubkey, currentAccount.pubkey);

            for (const collection of collections) {
                const cacheKey = `${collection.address}-${currentAccount.pubkey}`;
                const cached = nftCache.getOwnedNfts(cacheKey);

                if (cached) {
                    counts[collection.address] = cached.length;
                } else {
                    try {
                        const nfts = await Web3API.getOwnedNFTsForCollection(collection.address, userAddress);
                        if (nfts && typeof nfts !== 'boolean') {
                            counts[collection.address] = nfts.length;
                            nftCache.setOwnedNfts(cacheKey, nfts);
                        } else {
                            counts[collection.address] = 0;
                        }
                    } catch (error) {
                        console.error(`Failed to fetch NFTs for ${collection.address}:`, error);
                        counts[collection.address] = 0;
                    }
                }
            }

            setCollectionCounts(counts);
        };

        if (collections.length > 0) {
            void fetchCollectionCounts();
        }
    }, [collections, currentAccount.pubkey]);

    useEffect(() => {
        const storedCollections = localStorage.getItem(storageKey);
        if (storedCollections) {
            setCollections(JSON.parse(storedCollections) as NFTCollection[]);
        }
    }, [storageKey]);

    useEffect(() => {
        void (async () => {
            await Web3API.setNetwork(chainType);
        })();
    }, [chainType]);

    const handleCollectionClick = async (collection: NFTCollection) => {
        setSelectedCollection(collection);
        setLoadingNFTs(true);

        try {
            const cacheKey = `${collection.address}-${currentAccount.pubkey}`;
            const cached = nftCache.getOwnedNfts(cacheKey);

            if (cached) {
                setOwnedNFTs(cached);
                setLoadingNFTs(false);
                return;
            }

            const userAddress = currentAccount.quantumPublicKeyHash
                ? Address.fromString(currentAccount.quantumPublicKeyHash, currentAccount.pubkey)
                : Address.fromString(currentAccount.pubkey, currentAccount.pubkey);
            const nfts: OwnedNFT[] | undefined | boolean = await Web3API.getOwnedNFTsForCollection(
                collection.address,
                userAddress
            );

            if (nfts && typeof nfts !== 'boolean') {
                setOwnedNFTs(nfts);
                nftCache.setOwnedNfts(cacheKey, nfts);
            } else {
                setOwnedNFTs([]);
            }
        } catch (error) {
            console.error('Failed to fetch NFTs:', error);
            setOwnedNFTs([]);
        } finally {
            setLoadingNFTs(false);
        }
    };

    const handleNFTClick = (nft: OwnedNFT) => {
        navigate(RouteTypes.NFTSendScreen, {
            collection: selectedCollection,
            nft
        });
    };

    const handleBack = () => {
        setSelectedCollection(null);
        setOwnedNFTs([]);
    };

    // Main collections view
    if (!selectedCollection) {
        return (
            <Layout>
                <Header title="NFT Collections" />

                <Content
                    style={{
                        margin: 0,
                        padding: 0
                    }}>
                    <Column>
                        {collections.length === 0 ? (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '300px',
                                    textAlign: 'center',
                                    gap: '24px',
                                    padding: ' 12px'
                                }}>
                                <div>
                                    <div style={{ fontSize: '14px', color: colors.textFaded, marginBottom: '8px' }}>
                                        No NFT collections imported
                                    </div>
                                    <div style={{ fontSize: '12px', color: colors.textFaded }}>Import one now!</div>
                                </div>

                                <button
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        background: colors.containerBg,
                                        border: `2px dashed ${colors.containerBorder}`,
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontSize: '36px',
                                        color: colors.textFaded
                                    }}
                                    onClick={() => navigate(RouteTypes.ImportSelectionScreen)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = colors.main;
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                        e.currentTarget.style.color = colors.main;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = colors.containerBorder;
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.color = colors.textFaded;
                                    }}>
                                    <PlusOutlined />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Row
                                    justifyBetween
                                    style={{
                                        background: '#313131',
                                        borderTop: `1px solid #444746`,
                                        borderBottom: `1px solid #444746`,
                                        padding: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                    <span
                                        style={{
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: colors.text
                                        }}>
                                        My Collections
                                    </span>
                                    <button
                                        style={{
                                            padding: '6px 12px',
                                            background: colors.main,
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: colors.background,
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => navigate(RouteTypes.ImportNFTScreen)}>
                                        + Add
                                    </button>
                                </Row>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '12px',
                                        padding: '12px'
                                    }}>
                                    {collections.map((collection) => (
                                        <CollectionCard
                                            key={collection.address}
                                            collection={collection}
                                            onClick={() => handleCollectionClick(collection)}
                                            onDelete={() => handleDeleteCollection(collection.address)}
                                            ownedCount={collectionCounts[collection.address]}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </Column>
                </Content>

                <Footer px="zero" py="zero">
                    <NavTabBar tab="nft" />
                </Footer>
            </Layout>
        );
    }

    // NFT inventory view
    return (
        <Layout>
            <Header title={selectedCollection.name} onBack={handleBack} />

            <CollectionHeader collection={selectedCollection} />

            <Content style={{ padding: '0' }}>
                {loadingNFTs ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <LoadingOutlined style={{ fontSize: 32, color: colors.main }} />
                        <div style={{ marginTop: '12px', color: colors.textFaded, fontSize: '12px' }}>
                            Loading your NFTs...
                        </div>
                    </div>
                ) : (
                    <>
                        <Row
                            justifyBetween
                            style={{
                                borderBottom: '1px solid #444746',
                                padding: '12px',
                                background: 'rgb(49, 49, 49)'
                            }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>My NFTs</span>
                            <span style={{ fontSize: '12px', color: colors.textFaded }}>{ownedNFTs.length} items</span>
                        </Row>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '12px',
                                padding: '0 12px 12px 12px'
                            }}>
                            {ownedNFTs.map((nft) => (
                                <NFTCard key={nft.tokenId.toString()} nft={nft} onClick={() => handleNFTClick(nft)} />
                            ))}
                        </div>
                    </>
                )}
            </Content>
        </Layout>
    );
}

function CollectionCard({
    collection,
    onClick,
    onDelete,
    ownedCount
}: {
    collection: NFTCollection;
    onClick: () => void;
    onDelete: () => void;
    ownedCount?: number;
}) {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Remove ${collection.name} from your collections?`)) {
            onDelete();
        }
    };

    return (
        <div
            style={{
                aspectRatio: '1',
                background: colors.containerBgFaded,
                border: `1px solid ${colors.containerBorder}`,
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s'
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = colors.main;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = colors.containerBorder;
            }}>
            {collection.icon && (
                <AsyncImage
                    src={collection.icon}
                    alt={collection.name}
                    width="100%"
                    height="100%"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                />
            )}

            {/* Delete Button */}
            <button
                style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    zIndex: 10
                }}
                onClick={handleDelete}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.error;
                    e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Remove collection">
                ✕
            </button>

            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'white' }}>{collection.name}</div>
                <Row justifyBetween style={{ alignItems: 'flex-end' }}>
                    <span
                        style={{
                            fontSize: '9px',
                            color: 'rgba(255, 255, 255, 0.9)',
                            background: 'rgba(0, 0, 0, 0.5)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                        }}>
                        {ownedCount !== undefined ? `${ownedCount} owned` : 'Loading...'}
                    </span>
                </Row>
            </div>
        </div>
    );
}

function CollectionHeader({ collection }: { collection: NFTCollection }) {
    return (
        <div
            style={{
                position: 'relative',
                height: '120px',
                overflow: 'hidden',
                borderTop: '1px solid rgb(68, 71, 70)'
            }}>
            {collection.banner && (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute'
                    }}>
                    <AsyncImage
                        src={collection.banner}
                        alt=""
                        width="100%"
                        height="100%"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'brightness(0.7)'
                        }}
                    />
                </div>
            )}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px',
                    background: 'linear-gradient(to top, #212121 0%, transparent 100%)',
                    color: 'white',
                    zIndex: 1,
                    borderBottom: '1px solid rgb(68, 71, 70)'
                }}>
                <Row gap="md" style={{ alignItems: 'center' }}>
                    {collection.icon && (
                        <AsyncImage
                            src={collection.icon}
                            alt={collection.name}
                            width="48px"
                            height="48px"
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                border: '2px solid white'
                            }}
                        />
                    )}
                    <Column
                        style={{
                            gap: 0
                        }}>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>{collection.name}</div>
                        {collection.description && (
                            <div style={{ fontSize: '11px', opacity: 0.9 }}>{collection.description}</div>
                        )}
                    </Column>
                </Row>
            </div>
            <button
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#212121',
                    borderRadius: '5px',
                    border: '1px solid #444746',
                    color: 'white',
                    padding: '3px 7px'
                }}>
                <CopyableAddress address={collection.address} />
            </button>
        </div>
    );
}

function NFTCard({ nft, onClick }: { nft: OwnedNFT; onClick: () => void }) {
    const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cached = nftCache.getMetadata(nft.tokenURI);
        if (cached) {
            setMetadata(cached);
            setLoading(false);
            return;
        }

        const metadataUri = ImageService.resolveIPFSUri(nft.tokenURI);

        fetch(metadataUri)
            .then((res) => res.json())
            .then((data: NFTMetadata) => {
                setMetadata(data);
                nftCache.setMetadata(nft.tokenURI, data);
            })
            .catch((err: unknown) => {
                console.error('Failed to fetch NFT metadata:', err);
            })
            .finally(() => setLoading(false));
    }, [nft.tokenURI]);

    return (
        <div
            style={{
                background: colors.containerBgFaded,
                border: `1px solid #444746`,
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}20`;
                e.currentTarget.style.borderColor = colors.main;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = colors.containerBorder;
            }}>
            <div style={{ aspectRatio: '1', position: 'relative' }}>
                {loading ? (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: colors.containerBg
                        }}>
                        <LoadingOutlined style={{ fontSize: 24, color: colors.textFaded }} />
                    </div>
                ) : metadata?.image ? (
                    <AsyncImage
                        src={metadata.image}
                        width="100%"
                        height="100%"
                        alt={metadata.name || `NFT #${nft.tokenId}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '48px',
                            background: '#212121'
                        }}>
                        ❓
                    </div>
                )}
            </div>
            <div style={{ padding: '8px', background: '#212121' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                    {metadata?.name || `#${nft.tokenId}`}
                </div>
            </div>
        </div>
    );
}
