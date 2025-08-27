import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Column, Content, Header, Input, Layout } from '@/ui/components';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { isValidAddress, useWallet } from '@/ui/utils';
import Web3API, { OwnedNFT } from '@/shared/web3/Web3API';
import { InfoCircleOutlined, LoadingOutlined, SendOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Address, AddressTypes, AddressVerificator } from '@btc-vision/transaction';
import { Action, Features, NFTMetadata, SendNFTParameters } from '@/shared/interfaces/RawTxParameters';

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
}

export default function NFTSendScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const wallet = useWallet();
    const currentAccount = useCurrentAccount();

    // Get NFT and collection from navigation state
    const { nft, collection } = location.state as {
        nft: OwnedNFT;
        collection: NFTCollection;
    };

    const [toAddress, setToAddress] = useState('');
    const [feeRate, setFeeRate] = useState(5);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [disabled, setDisabled] = useState(true);
    const [showP2PKWarning, setShowP2PKWarning] = useState(false);
    const [showP2OPWarning, setShowP2OPWarning] = useState(false);
    const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
    const [loadingMetadata, setLoadingMetadata] = useState(true);

    // Initialize Web3API
    useEffect(() => {
        void (async () => {
            const chain = await wallet.getChainType();
            await Web3API.setNetwork(chain);
        })();
    }, [wallet]);

    // Load NFT metadata
    useEffect(() => {
        if (!nft) return;

        fetch(nft.tokenURI)
            .then((res) => res.json())
            .then((data: object) => {
                setMetadata(data as NFTMetadata);
            })
            .catch((err: unknown) => {
                console.error('Failed to fetch NFT metadata:', err);
            })
            .finally(() => setLoadingMetadata(false));
    }, [nft]);

    // Validate form
    useEffect(() => {
        setError('');
        setDisabled(true);

        if (!toAddress) return;
        if (!isValidAddress(toAddress)) {
            setError('Invalid recipient address');
            return;
        }
        if (feeRate <= 0) return;

        // Check if sending to self
        if (toAddress.toLowerCase() === currentAccount.address.toLowerCase()) {
            setError('Cannot send NFT to yourself');
            return;
        }

        setDisabled(false);
    }, [toAddress, feeRate, currentAccount.address]);

    const handleAddressChange = (val: string) => {
        setShowP2PKWarning(false);
        setShowP2OPWarning(false);
        setToAddress(val);

        if (!val) return;

        const type = AddressVerificator.detectAddressType(val, Web3API.network);

        if (type === null) {
            setError('Invalid recipient address');
            return;
        }

        if (type === AddressTypes.P2PK) {
            setShowP2PKWarning(true);
            // Convert P2PK to P2TR
            const convertedAddress = Address.fromString(val).p2tr(Web3API.network);
            setToAddress(convertedAddress);
            return;
        }

        if (type === AddressTypes.P2OP) {
            setShowP2OPWarning(true);
            setError('Cannot send NFT to contract address');
            return;
        }
    };

    const handleSend = () => {
        if (!nft || !collection) return;

        const event: SendNFTParameters = {
            priorityFee: 0n,
            tokens: [],
            to: toAddress,
            tokenId: nft.tokenId,
            collectionAddress: collection.address,
            collectionName: collection.name,
            feeRate,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true
            },
            action: Action.SendNFT,
            note,
            header: `Send NFT from ${collection.name}`
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo: event });
    };

    if (!nft || !collection) {
        return (
            <Layout>
                <Header title="Send NFT" onBack={() => window.history.go(-1)} />
                <Content style={{ padding: '16px' }}>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: colors.error }}>NFT data not found</p>
                    </div>
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header title="Send NFT" onBack={() => window.history.go(-1)} />

            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* NFT Preview */}
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
                                width: '80px',
                                height: '80px',
                                background: colors.containerBg,
                                borderRadius: '10px',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                            {loadingMetadata ? (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                    <LoadingOutlined style={{ fontSize: 24, color: colors.textFaded }} />
                                </div>
                            ) : metadata?.image ? (
                                <img
                                    src={metadata.image}
                                    alt={metadata.name || `NFT #${nft.tokenId}`}
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
                                        fontSize: '36px'
                                    }}>
                                    ERROR
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text }}>
                                {metadata?.name || `NFT #${nft.tokenId}`}
                            </div>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                                {collection.name} • Token ID: {nft.tokenId.toString()}
                            </div>
                            {metadata?.description && (
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: colors.textFaded,
                                        marginTop: '8px',
                                        maxHeight: '40px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                    {metadata.description}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recipient Section */}
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
                            <SendOutlined style={{ fontSize: 14, color: colors.main }} />
                            <span
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                Recipient
                            </span>
                        </div>

                        <Input
                            placeholder="Enter recipient address"
                            value={toAddress}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            autoFocus
                            style={{
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px'
                            }}
                        />

                        {showP2PKWarning && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '8px',
                                    background: `${colors.warning}15`,
                                    border: `1px solid ${colors.warning}30`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '6px'
                                }}>
                                <InfoCircleOutlined
                                    style={{
                                        fontSize: 12,
                                        color: colors.warning,
                                        flexShrink: 0,
                                        marginTop: '2px'
                                    }}
                                />
                                <div>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.warning,
                                            lineHeight: '1.4'
                                        }}>
                                        P2PK Address Detected - NFT will be sent to the associated Taproot address.
                                    </span>
                                </div>
                            </div>
                        )}

                        {showP2OPWarning && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '8px',
                                    background: `${colors.error}15`,
                                    border: `1px solid ${colors.error}30`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '6px'
                                }}>
                                <InfoCircleOutlined
                                    style={{
                                        fontSize: 12,
                                        color: colors.error,
                                        flexShrink: 0
                                    }}
                                />
                                <div>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.error,
                                            lineHeight: '1.4'
                                        }}>
                                        Cannot send NFTs directly to contract addresses.
                                    </span>
                                </div>
                            </div>
                        )}
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

                    {/* Note Section */}
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
                            Note (Optional)
                        </div>

                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note for this transaction"
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px',
                                color: colors.text,
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'border-color 0.15s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = colors.main;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = colors.containerBorder;
                            }}
                        />
                    </div>

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

                    {/* Send Button */}
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
                        onClick={handleSend}
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
                        <span>Send NFT</span>
                        <SendOutlined style={{ fontSize: 14 }} />
                    </button>
                </Column>
            </Content>
        </Layout>
    );
}
