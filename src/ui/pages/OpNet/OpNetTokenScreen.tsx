import BigNumber from 'bignumber.js';
import { BitcoinUtils, getContract, IOP20Contract, OP_20_ABI } from 'opnet';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OPTokenInfo } from '@/shared/types';
import { addressShortner } from '@/shared/utils';
import Web3API from '@/shared/web3/Web3API';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { Column, Content, Header, Layout, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { copyToClipboard, useLocationState, useWallet } from '@/ui/utils';
import {
    CheckOutlined,
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    LoadingOutlined,
    SendOutlined,
    SwapOutlined
} from '@ant-design/icons';
import { Address, AddressMap } from '@btc-vision/transaction';

import { RouteTypes, useNavigate } from '../MainRoute';

interface LocationState {
    address: string;
}

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

export default function OpNetTokenScreen() {
    const navigate = useNavigate();
    const params = useLocationState<LocationState>();
    const account = useCurrentAccount();
    const tools = useTools();
    const wallet = useWallet();
    const unitBtc = useBTCUnit();

    const [tokenSummary, setTokenSummary] = useState<OPTokenInfo>({
        address: '',
        name: '',
        symbol: '',
        logo: '',
        amount: 0n,
        divisibility: 0
    });

    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const getAddress = async () => {
            try {
                await Web3API.setNetwork(await wallet.getChainType());

                const [mldsaHashPubKey, legacyPubKey] = await wallet.getWalletAddress();
                const userAddress = Address.fromString(mldsaHashPubKey, legacyPubKey);
                const contract: IOP20Contract = getContract<IOP20Contract>(
                    params.address,
                    OP_20_ABI,
                    Web3API.provider,
                    Web3API.network,
                    userAddress
                );

                const contractInfo: ContractInformation | false | undefined = await Web3API.queryContractInformation(
                    params.address
                );

                if (!contractInfo) {
                    throw new Error('Contract information not found');
                }

                try {
                    const balance = await contract.balanceOf(userAddress);
                    const newSummaryData = {
                        address: params.address,
                        name: contractInfo.name ?? '',
                        amount: balance.properties.balance,
                        divisibility: contractInfo.decimals ?? 8,
                        symbol: contractInfo.symbol,
                        logo: contractInfo.logo
                    };

                    setTokenSummary(newSummaryData);
                } catch (e) {
                    tools.toastError('Error getting balance');
                    return;
                }

                try {
                    const deployer = await contract.deployer();
                    setIsOwner(userAddress.equals(deployer.properties.deployer));
                } catch {
                    try {
                        const addy: AddressMap<bigint> = new AddressMap();
                        addy.set(userAddress, 100000000n);
                        await contract.airdrop(addy);
                        setIsOwner(true);
                    } catch {}
                }
            } catch (error) {
                console.error('Error loading token:', error);
                tools.toastError('Failed to load token information');
            } finally {
                setLoading(false);
            }
        };

        void getAddress();
    }, [account.address, params.address, tools, unitBtc, wallet]);

    const enableTransfer = useMemo(() => {
        return tokenSummary.amount && tokenSummary.amount > 0n;
    }, [tokenSummary]);

    const formattedBalance = useMemo(() => {
        if (!tokenSummary.amount) return '0';
        const value = new BigNumber(BitcoinUtils.formatUnits(tokenSummary.amount, tokenSummary.divisibility)).toFixed(
            Math.min(tokenSummary.divisibility, 6)
        );
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: Math.min(tokenSummary.divisibility, 6)
        });
    }, [tokenSummary]);

    const copy = async (data: string) => {
        await copyToClipboard(data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        tools.toastSuccess('Copied!');
    };

    const deleteToken = useCallback(async () => {
        const getChain = await wallet.getChainType();
        const storageKey = `opnetTokens_${getChain}_${account.pubkey}`;
        const tokensImported = localStorage.getItem(storageKey);

        if (tokensImported) {
            let updatedTokens = JSON.parse(tokensImported) as OPTokenInfo[];
            updatedTokens = updatedTokens.filter((item) => {
                const address = typeof item === 'string' ? item : item.address;
                return address !== tokenSummary.address;
            });
            localStorage.setItem(storageKey, JSON.stringify(updatedTokens));
        }

        tools.toastSuccess('Token removed successfully');
        window.history.go(-1);
    }, [account.pubkey, tokenSummary.address, tools, wallet]);

    if (loading) {
        return (
            <Layout>
                <Content itemsCenter justifyCenter>
                    <Column itemsCenter justifyCenter style={{ minHeight: 250 }}>
                        <LoadingOutlined style={{ fontSize: 24, color: colors.main }} />
                        <Text text="Loading..." color="textDim" size="sm" style={{ marginTop: 8 }} />
                    </Column>
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header
                onBack={() => window.history.go(-1)}
                title={tokenSummary.symbol}
                RightComponent={
                    <button
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px'
                        }}
                        onClick={() => setShowDeleteConfirm(true)}>
                        <DeleteOutlined style={{ fontSize: 16, color: colors.textFaded }} />
                    </button>
                }
            />

            <Content style={{ padding: '12px' }}>
                {/* Compact Token Info Card */}
                <div
                    style={{
                        background: colors.buttonHoverBg,
                        borderRadius: '14px',
                        padding: '16px',
                        marginBottom: '12px',
                        textAlign: 'center'
                    }}>
                    {/* Token Logo */}
                    {tokenSummary.logo ? (
                        <img
                            src={tokenSummary.logo}
                            alt={tokenSummary.symbol}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: '12px',
                                marginBottom: '12px'
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: '12px',
                                background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.main}80 100%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 12px'
                            }}>
                            <span style={{ fontSize: 18, fontWeight: 'bold', color: colors.background }}>
                                {tokenSummary.symbol?.charAt(0) || '?'}
                            </span>
                        </div>
                    )}

                    {/* Balance */}
                    <div
                        style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: colors.text,
                            marginBottom: '2px'
                        }}>
                        {formattedBalance}
                    </div>

                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: colors.main,
                            marginBottom: '8px'
                        }}>
                        {tokenSummary.symbol}
                    </div>

                    {/* Token Name */}
                    <div
                        style={{
                            fontSize: '12px',
                            color: colors.textFaded,
                            marginBottom: '12px'
                        }}>
                        {tokenSummary.name}
                    </div>

                    {/* Address with Copy */}
                    <button
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: colors.containerBgFaded,
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => copy(tokenSummary.address)}>
                        <span
                            style={{
                                fontSize: '11px',
                                color: colors.textFaded,
                                fontFamily: 'monospace'
                            }}>
                            {addressShortner(tokenSummary.address)}
                        </span>
                        {copied ? (
                            <CheckOutlined style={{ fontSize: 11, color: colors.success }} />
                        ) : (
                            <CopyOutlined style={{ fontSize: 11, color: colors.textFaded }} />
                        )}
                    </button>

                    {/* Owner Badge */}
                    {isOwner && (
                        <div
                            style={{
                                marginLeft: '4px',
                                marginTop: '8px',
                                padding: '3px 8px',
                                background: `${colors.warning}20`,
                                border: `1px solid ${colors.warning}40`,
                                borderRadius: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                            <span style={{ fontSize: '10px', color: colors.warning, fontWeight: 600 }}>OWNER</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        marginBottom: '12px'
                    }}>
                    <button
                        style={{
                            padding: '12px',
                            background: enableTransfer ? colors.main : colors.buttonHoverBg,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: enableTransfer ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: enableTransfer ? 1 : 0.5
                        }}
                        disabled={!enableTransfer}
                        onClick={() => navigate(RouteTypes.SendOpNetScreen, tokenSummary)}>
                        <SendOutlined
                            style={{
                                fontSize: 18,
                                color: enableTransfer ? colors.background : colors.textFaded
                            }}
                        />
                        <span
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: enableTransfer ? colors.background : colors.textFaded
                            }}>
                            Send
                        </span>
                    </button>

                    <button
                        style={{
                            padding: '12px',
                            background: colors.main,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onClick={() => {
                            window.open('https://motoswap.org', '_blank', 'noopener noreferrer');
                        }}>
                        <SwapOutlined style={{ fontSize: 18, color: colors.background }} />
                        <span
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: colors.background
                            }}>
                            Swap
                        </span>
                    </button>
                </div>

                {/* Mint Button for Owner */}
                {isOwner && (
                    <button
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: colors.buttonBg,
                            border: `1px solid ${colors.warning}40`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginBottom: '12px'
                        }}
                        onClick={() => navigate(RouteTypes.Mint, tokenSummary)}>
                        <EditOutlined style={{ fontSize: 16, color: colors.warning }} />
                        <span
                            style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: colors.warning
                            }}>
                            Mint Tokens
                        </span>
                    </button>
                )}

                {/* Compact Token Info */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '10px',
                        padding: '12px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.textFaded,
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                        Details
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: colors.textFaded }}>Decimals</span>
                            <span style={{ fontSize: '12px', color: colors.text, fontWeight: 500 }}>
                                {tokenSummary.divisibility}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: colors.textFaded }}>Type</span>
                            <span style={{ fontSize: '12px', color: colors.text, fontWeight: 500 }}>OP_20</span>
                        </div>
                    </div>
                </div>
            </Content>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '16px'
                    }}>
                    <div
                        style={{
                            background: colors.containerBg,
                            borderRadius: '12px',
                            padding: '20px',
                            width: '100%',
                            maxWidth: '320px',
                            border: `1px solid ${colors.containerBorder}`
                        }}>
                        <div
                            style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: colors.text,
                                marginBottom: '8px'
                            }}>
                            Remove Token?
                        </div>
                        <div
                            style={{
                                fontSize: '13px',
                                color: colors.textFaded,
                                marginBottom: '16px',
                                lineHeight: '1.4'
                            }}>
                            Remove {tokenSummary.symbol} from your wallet? You can re-import it anytime.
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: colors.buttonHoverBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '8px',
                                    color: colors.text,
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                                onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: colors.error,
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                                onClick={deleteToken}>
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
