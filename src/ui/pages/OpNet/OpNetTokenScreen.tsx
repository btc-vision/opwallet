import BigNumber from 'bignumber.js';
import { BitcoinUtils, getContract, IOP20Contract, OP_20_ABI } from 'opnet';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { OPTokenInfo } from '@/shared/types';
import { addressShortner } from '@/shared/utils';
import Web3API from '@/shared/web3/Web3API';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { Content, Header, Layout, OPNetLoader } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { copyToClipboard, useLocationState, useWallet } from '@/ui/utils';
import {
    CheckOutlined,
    CopyOutlined,
    DeleteOutlined,
    ExportOutlined,
    InfoCircleOutlined,
    SendOutlined,
    SwapOutlined,
    ToolOutlined
} from '@ant-design/icons';
import { Address, AddressMap } from '@btc-vision/transaction';

import { RouteTypes, useNavigate } from '../MainRoute';

interface LocationState {
    address: string;
}

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#ffffff',
    textSecondary: '#dbdbdb',
    textFaded: 'rgba(255, 255, 255, 0.5)',
    cardBg: '#2a2a2a',
    buttonPrimary: '#f37413',
    buttonSecondary: '#3a3a3a',
    border: 'rgba(255, 255, 255, 0.08)',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#f59e0b'
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
    const [isPegged, setIsPegged] = useState(false);
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

                // Check if OP-20S (pegged asset) by calling pegUpdatedAt()
                try {
                    const calldata = contract.encodeCalldata('pegUpdatedAt', []);
                    const result = await Web3API.provider.call(params.address, calldata);
                    // If we get a result without error, it's an OP-20S token
                    setIsPegged(result && !('error' in result));
                } catch {
                    setIsPegged(false);
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
        const value = new BigNumber(BitcoinUtils.formatUnits(tokenSummary.amount, tokenSummary.divisibility));

        const Q = new BigNumber('1000000000000000'); // 10^15
        const T = new BigNumber('1000000000000'); // 10^12
        const B = new BigNumber('1000000000'); // 10^9
        const M = new BigNumber('1000000'); // 10^6
        const K = new BigNumber('100000'); // 10^5

        // Large numbers: use K/M/B/T/Q suffixes
        if (value.gte(Q)) {
            return value.div(Q).toFixed(2) + 'Q';
        } else if (value.gte(T)) {
            return value.div(T).toFixed(2) + 'T';
        } else if (value.gte(B)) {
            return value.div(B).toFixed(2) + 'B';
        } else if (value.gte(M)) {
            return value.div(M).toFixed(2) + 'M';
        } else if (value.gte(K)) {
            return value.div(new BigNumber('1000')).toFixed(1) + 'K';
        }

        // Small numbers: show significant decimals
        if (value.gt(0) && value.lt(0.0001)) {
            // Very small - show up to 8 decimals, trim trailing zeros
            return value.toFixed(Math.min(tokenSummary.divisibility, 8)).replace(/\.?0+$/, '');
        } else if (value.gt(0) && value.lt(1)) {
            // Small - show up to 6 decimals
            return value.toFixed(Math.min(tokenSummary.divisibility, 6)).replace(/\.?0+$/, '');
        }

        // Normal numbers
        return value.toNumber().toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: Math.min(tokenSummary.divisibility, 4)
        });
    }, [tokenSummary]);

    const copy = async (data: string) => {
        await copyToClipboard(data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        tools.toastSuccess('Copied');
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

        tools.toastSuccess('Token removed');
        window.history.go(-1);
    }, [account.pubkey, tokenSummary.address, tools, wallet]);

    const openExplorer = () => {
        window.open(`https://opscan.org/accounts/${tokenSummary.address}`, '_blank', 'noopener noreferrer');
    };

    if (loading) {
        return (
            <Layout>
                <Content itemsCenter justifyCenter style={{ backgroundColor: colors.background }}>
                    <OPNetLoader size={80} text="Loading token" />
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title={tokenSummary.symbol} />

            <Content style={{ padding: '16px', backgroundColor: colors.background }}>
                {/* Token Info Card */}
                <div
                    style={{
                        background: colors.cardBg,
                        borderRadius: 12,
                        padding: '16px',
                        marginBottom: 16
                    }}>
                    {/* Top row: Logo + Name + Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        {/* Logo */}
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                            {tokenSummary.logo ? (
                                <img
                                    src={tokenSummary.logo}
                                    alt={tokenSummary.symbol}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        background: `linear-gradient(135deg, ${colors.main} 0%, #d45a00 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                                        {tokenSummary.symbol?.charAt(0) || '?'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Name + Symbol */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: colors.text,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                    {tokenSummary.name || tokenSummary.symbol}
                                </span>
                                {isOwner && (
                                    <span
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 600,
                                            color: colors.warning,
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            padding: '2px 5px',
                                            borderRadius: 4,
                                            flexShrink: 0
                                        }}>
                                        OWNER
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 12, color: colors.textFaded }}>{tokenSummary.symbol}</div>
                        </div>

                        {/* Token Standard Badge */}
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 500,
                                color: isPegged ? colors.success : colors.main,
                                background: isPegged ? 'rgba(74, 222, 128, 0.1)' : 'rgba(243, 116, 19, 0.1)',
                                padding: '4px 8px',
                                borderRadius: 5,
                                flexShrink: 0
                            }}>
                            {isPegged ? 'OP-20S' : 'OP-20'}
                        </div>
                    </div>

                    {/* Balance */}
                    <div
                        style={{
                            background: 'rgba(243, 116, 19, 0.08)',
                            borderRadius: 8,
                            padding: '12px',
                            marginBottom: 12,
                            textAlign: 'center'
                        }}>
                        <div
                            style={{
                                fontSize: 10,
                                color: colors.textFaded,
                                marginBottom: 4,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}>
                            Balance
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>
                            {formattedBalance}{' '}
                            <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>
                                {tokenSummary.symbol}
                            </span>
                        </div>
                    </div>

                    {/* Contract Address */}
                    <div
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 8,
                            padding: '10px 12px',
                            cursor: 'pointer'
                        }}
                        onClick={() => copy(tokenSummary.address)}>
                        <div
                            style={{
                                fontSize: 10,
                                color: colors.textFaded,
                                marginBottom: 4,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}>
                            Contract Address
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'monospace' }}>
                                {addressShortner(tokenSummary.address)}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {copied ? (
                                    <CheckOutlined style={{ fontSize: 13, color: colors.success }} />
                                ) : (
                                    <CopyOutlined style={{ fontSize: 13, color: colors.textFaded }} />
                                )}
                                <ExportOutlined
                                    style={{ fontSize: 13, color: colors.textFaded }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openExplorer();
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div style={{ marginBottom: 16 }}>
                    <div
                        style={{
                            fontSize: 11,
                            color: colors.textFaded,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 10
                        }}>
                        Actions
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: enableTransfer ? colors.buttonPrimary : colors.buttonSecondary,
                                border: 'none',
                                borderRadius: 10,
                                cursor: enableTransfer ? 'pointer' : 'not-allowed',
                                opacity: enableTransfer ? 1 : 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}
                            disabled={!enableTransfer}
                            onClick={() => navigate(RouteTypes.SendOpNetScreen, tokenSummary)}>
                            <SendOutlined style={{ fontSize: 15, color: '#fff' }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Send</span>
                        </button>

                        <button
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: colors.buttonSecondary,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 10,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}
                            onClick={() => window.open('https://motoswap.org', '_blank', 'noopener noreferrer')}>
                            <SwapOutlined style={{ fontSize: 15, color: colors.textSecondary }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textSecondary }}>Swap</span>
                        </button>

                        {isOwner && (
                            <button
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: `1px solid rgba(245, 158, 11, 0.3)`,
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8
                                }}
                                onClick={() => navigate(RouteTypes.Mint, tokenSummary)}>
                                <ToolOutlined style={{ fontSize: 15, color: colors.warning }} />
                                <span style={{ fontSize: 14, fontWeight: 600, color: colors.warning }}>Mint</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Remove Token */}
                <button
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'transparent',
                        border: `1px solid rgba(239, 68, 68, 0.25)`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                    }}
                    onClick={() => setShowDeleteConfirm(true)}>
                    <DeleteOutlined style={{ fontSize: 13, color: colors.error }} />
                    <span style={{ fontSize: 13, color: colors.error }}>Remove Token</span>
                </button>
            </Content>

            {/* Delete Modal */}
            {showDeleteConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 20
                    }}>
                    <div
                        style={{
                            background: colors.cardBg,
                            borderRadius: 14,
                            padding: 20,
                            width: '100%',
                            maxWidth: 300
                        }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 14px'
                            }}>
                            <InfoCircleOutlined style={{ fontSize: 20, color: colors.error }} />
                        </div>

                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                color: colors.text,
                                textAlign: 'center',
                                marginBottom: 6
                            }}>
                            Remove Token?
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: colors.textFaded,
                                textAlign: 'center',
                                marginBottom: 20,
                                lineHeight: 1.4
                            }}>
                            {tokenSummary.symbol} will be removed from your wallet.
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                style={{
                                    flex: 1,
                                    padding: '11px',
                                    background: colors.buttonSecondary,
                                    border: 'none',
                                    borderRadius: 8,
                                    color: colors.textSecondary,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                                onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button
                                style={{
                                    flex: 1,
                                    padding: '11px',
                                    background: colors.error,
                                    border: 'none',
                                    borderRadius: 8,
                                    color: '#fff',
                                    fontSize: 13,
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
