import Web3API from '@/shared/web3/Web3API';
import { Column, Content, Header, Layout } from '@/ui/components';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useAddressExplorerUrl, useTxExplorerUrl } from '@/ui/state/settings/hooks';
import { useLocationState } from '@/ui/utils';
import {
    CheckCircleFilled,
    CopyOutlined,
    ExportOutlined,
    FileTextOutlined,
    HomeOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import { useState } from 'react';

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

export interface ExpectedSuccessScreenParameters {
    txid: string | undefined;
    contractAddress?: Address | string;
}

export default function TxSuccessScreen() {
    const { txid, contractAddress } = useLocationState<ExpectedSuccessScreenParameters>();
    const navigate = useNavigate();
    const [copiedTx, setCopiedTx] = useState(false);
    const [copiedContract, setCopiedContract] = useState(false);

    const txidUrlRaw = useTxExplorerUrl(txid ?? '');
    const txidUrl = txid ? txidUrlRaw : '';
    const contractAddressString = contractAddress
        ? typeof contractAddress === 'string'
            ? contractAddress
            : contractAddress.p2op(Web3API.network)
        : '';

    const addressUrlRaw = useAddressExplorerUrl(contractAddressString);
    const addressUrl = contractAddress ? addressUrlRaw : '';

    const handleCopyTxid = async () => {
        if (txid) {
            await navigator.clipboard.writeText(txid);
            setCopiedTx(true);
            setTimeout(() => setCopiedTx(false), 2000);
        }
    };

    const handleCopyContract = async () => {
        if (contractAddressString) {
            await navigator.clipboard.writeText(contractAddressString);
            setCopiedContract(true);
            setTimeout(() => setCopiedContract(false), 2000);
        }
    };

    const shortenAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    };

    return (
        <Layout>
            <Header title="" />

            <Content
                style={{
                    padding: '20px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px'
                }}>
                <Column style={{ width: '100%', maxWidth: '360px' }}>
                    {/* Success Animation Container */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '24px'
                        }}>
                        <div
                            style={{
                                position: 'relative',
                                width: '80px',
                                height: '80px'
                            }}>
                            {/* Animated Circle Background */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${colors.success}20 0%, ${colors.success}10 100%)`,
                                    animation: 'pulse 2s ease-in-out infinite'
                                }}
                            />

                            {/* Icon */}
                            <div
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${colors.success}30 0%, ${colors.success}15 100%)`,
                                    border: `2px solid ${colors.success}40`
                                }}>
                                <CheckCircleFilled
                                    style={{
                                        fontSize: 40,
                                        color: colors.success,
                                        animation: 'checkmark 0.5s ease-out'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Success Text */}
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h2
                            style={{
                                fontSize: '24px',
                                fontWeight: 600,
                                color: colors.text,
                                margin: '0 0 8px 0',
                                fontFamily: 'Inter-Regular, serif'
                            }}>
                            Transaction Successful!
                        </h2>
                        <p
                            style={{
                                fontSize: '14px',
                                color: colors.textFaded,
                                margin: 0,
                                lineHeight: '1.5'
                            }}>
                            Your transaction has been successfully
                            <br />
                            broadcast to the network
                        </p>
                    </div>

                    {/* Transaction Details */}
                    {txid && (
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '12px'
                            }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '12px'
                                }}>
                                <FileTextOutlined style={{ fontSize: 16, color: colors.main }} />
                                <span
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: colors.textFaded,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    Transaction ID
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                }}>
                                <span
                                    style={{
                                        fontSize: '13px',
                                        color: colors.text,
                                        fontFamily: 'monospace',
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                    {shortenAddress(txid)}
                                </span>

                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        style={{
                                            padding: '6px',
                                            background: copiedTx ? colors.success : 'transparent',
                                            border: `1px solid ${copiedTx ? colors.success : colors.containerBorder}`,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={handleCopyTxid}>
                                        {copiedTx ? (
                                            <CheckCircleFilled style={{ fontSize: 14, color: colors.background }} />
                                        ) : (
                                            <CopyOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                                        )}
                                    </button>

                                    <button
                                        style={{
                                            padding: '6px',
                                            background: colors.main,
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => window.open(txidUrl)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}>
                                        <ExportOutlined style={{ fontSize: 14, color: colors.background }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Contract Address */}
                    {contractAddress && (
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '24px'
                            }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '12px'
                                }}>
                                <WalletOutlined style={{ fontSize: 16, color: colors.main }} />
                                <span
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: colors.textFaded,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                    Contract Address
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                }}>
                                <span
                                    style={{
                                        fontSize: '13px',
                                        color: colors.text,
                                        fontFamily: 'monospace',
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                    {shortenAddress(contractAddressString)}
                                </span>

                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        style={{
                                            padding: '6px',
                                            background: copiedContract ? colors.success : 'transparent',
                                            border: `1px solid ${copiedContract ? colors.success : colors.containerBorder}`,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={handleCopyContract}>
                                        {copiedContract ? (
                                            <CheckCircleFilled style={{ fontSize: 14, color: colors.background }} />
                                        ) : (
                                            <CopyOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                                        )}
                                    </button>

                                    <button
                                        style={{
                                            padding: '6px',
                                            background: colors.main,
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => window.open(addressUrl)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}>
                                        <ExportOutlined style={{ fontSize: 14, color: colors.background }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Explorer Link Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'transparent',
                            border: `1px solid ${colors.main}40`,
                            borderRadius: '10px',
                            color: colors.main,
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                        }}
                        onClick={() => window.open(txidUrl)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = `${colors.main}15`;
                            e.currentTarget.style.borderColor = colors.main;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = `${colors.main}40`;
                        }}>
                        <span>View on OP_SCAN</span>
                        <ExportOutlined style={{ fontSize: 12 }} />
                    </button>

                    {/* Done Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: colors.main,
                            border: 'none',
                            borderRadius: '12px',
                            color: colors.background,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                        onClick={() => navigate(RouteTypes.MainScreen)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <HomeOutlined style={{ fontSize: 16 }} />
                        <span>Back to Home</span>
                    </button>
                </Column>

                <style>{`
                    @keyframes pulse {
                        0% {
                            transform: scale(1);
                            opacity: 0.3;
                        }
                        50% {
                            transform: scale(1.1);
                            opacity: 0.2;
                        }
                        100% {
                            transform: scale(1);
                            opacity: 0.3;
                        }
                    }
                    
                    @keyframes checkmark {
                        0% {
                            transform: scale(0) rotate(-45deg);
                            opacity: 0;
                        }
                        50% {
                            transform: scale(1.2) rotate(5deg);
                        }
                        100% {
                            transform: scale(1) rotate(0);
                            opacity: 1;
                        }
                    }
                `}</style>
            </Content>
        </Layout>
    );
}
