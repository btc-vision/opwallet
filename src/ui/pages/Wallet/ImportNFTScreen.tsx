import Web3API from '@/shared/web3/Web3API';
import { Column, Content, Header, Input, Layout, OPNetLoader } from '@/ui/components';
import { AsyncImage } from '@/ui/components/AsyncImage';
import { useTools } from '@/ui/components/ActionComponent';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChainType } from '@/ui/state/settings/hooks';
import { PictureOutlined } from '@ant-design/icons';
import { AddressTypes, AddressVerificator } from '@btc-vision/transaction';
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

interface NFTCollectionInfo {
    address: string;
    name: string;
    symbol: string;
    icon?: string;
    banner?: string;
    description?: string;
}

interface RawNFTCollectionInfo extends NFTCollectionInfo {
    totalSupply: string;
    maximumSupply: string;
}

interface ParsedNFTCollectionInfo extends NFTCollectionInfo {
    totalSupply: bigint;
    //maximumSupply: bigint;
}

export default function ImportNFTScreen() {
    const navigate = useNavigate();
    const tools = useTools();
    const currentAccount = useCurrentAccount();
    const chainType = useChainType();

    const [contractAddress, setContractAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [collectionInfo, setCollectionInfo] = useState<ParsedNFTCollectionInfo | null>(null);

    const storageKey = `opnet_nft_collections_${chainType}_${currentAccount.pubkey}`;

    useEffect(() => {
        void (async () => {
            await Web3API.setNetwork(chainType);
        })();
    }, [chainType]);

    const handleAddressChange = async (address: string) => {
        setContractAddress(address);
        setError('');
        setCollectionInfo(null);

        if (!address) return;

        const type = AddressVerificator.detectAddressType(address, Web3API.network);
        if (type !== AddressTypes.P2OP && type !== AddressTypes.P2PK) {
            setError('Invalid address format. Must be a valid contract address.');
            return;
        }

        setLoading(true);
        try {
            const info = await Web3API.queryNFTContractInformation(address);

            if (info === false) {
                setError('Contract not found');
            } else if (info) {
                setCollectionInfo({
                    address,
                    name: info.name || 'Unknown Collection',
                    symbol: info.symbol || 'UNKNOWN',
                    icon: info.icon,
                    banner: info.banner,
                    description: info.description,
                    totalSupply: info.totalSupply || 0n
                });
            }
        } catch (err) {
            setError('Failed to fetch collection information');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = () => {
        if (!collectionInfo) return;

        try {
            const _existingCollections = JSON.parse(localStorage.getItem(storageKey) || '[]') as RawNFTCollectionInfo[];
            const existingCollections: ParsedNFTCollectionInfo[] = _existingCollections.map((c) => ({
                ...c,
                totalSupply: BigInt(c.totalSupply),
                maximumSupply: BigInt(c.maximumSupply)
            }));

            if (existingCollections.some((c: ParsedNFTCollectionInfo) => c.address === collectionInfo.address)) {
                setError('Collection already imported');
                return;
            }

            existingCollections.push({
                ...collectionInfo,
                totalSupply: collectionInfo.totalSupply
                //maximumSupply: collectionInfo.maximumSupply
            });

            localStorage.setItem(storageKey, JSON.stringify(existingCollections));
            tools.toastSuccess('NFT collection imported successfully');

            navigate(RouteTypes.NFTTabScreen);
        } catch (err) {
            setError('Failed to import collection');
            console.error(err);
        }
    };

    return (
        <Layout>
            <Header title="Import NFT Collection" onBack={() => navigate(RouteTypes.ImportSelectionScreen)} />

            <Content style={{ padding: '16px' }}>
                <Column gap="lg">
                    <div style={{ marginBottom: '8px' }}>
                        <p
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                marginBottom: '16px'
                            }}>
                            Enter the OP_721 collection contract address to import
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
                            placeholder="Enter collection address (0x...)"
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
                            <OPNetLoader size={50} text="Fetching collection" />
                        </div>
                    )}

                    {collectionInfo && !loading && (
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '12px',
                                padding: '16px',
                                border: `1px solid ${colors.main}30`
                            }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <div
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        background: colors.main,
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '32px',
                                        overflow: 'hidden'
                                    }}>
                                    {collectionInfo.icon ? (
                                        <AsyncImage
                                            src={collectionInfo.icon}
                                            alt={collectionInfo.name}
                                            width="64px"
                                            height="64px"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            fallback={
                                                <PictureOutlined
                                                    style={{ fontSize: '32px', color: colors.background }}
                                                />
                                            }
                                        />
                                    ) : (
                                        <PictureOutlined style={{ fontSize: '32px', color: colors.background }} />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text }}>
                                        {collectionInfo.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                                        {collectionInfo.symbol}
                                    </div>
                                    <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                                        Total Supply: {collectionInfo.totalSupply.toString()}
                                    </div>
                                    {collectionInfo.description && (
                                        <div style={{ fontSize: '11px', color: colors.textFaded, marginTop: '8px' }}>
                                            {collectionInfo.description}
                                        </div>
                                    )}
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
                            background: collectionInfo && !loading ? colors.main : colors.buttonBg,
                            border: 'none',
                            borderRadius: '12px',
                            color: collectionInfo && !loading ? colors.background : colors.textFaded,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: collectionInfo && !loading ? 'pointer' : 'not-allowed',
                            opacity: collectionInfo && !loading ? 1 : 0.5,
                            transition: 'all 0.2s',
                            marginTop: '24px'
                        }}
                        disabled={!collectionInfo || loading}
                        onClick={handleImport}>
                        Import Collection
                    </button>
                </Column>
            </Content>
        </Layout>
    );
}
