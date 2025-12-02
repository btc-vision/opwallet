import { useCallback, useEffect, useState } from 'react';

import { Column, Content, Header, Layout, OPNetLoader } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { copyToClipboard, useLocationState, useWallet } from '@/ui/utils';
import {
    TransactionHistoryItem,
    TransactionStatus,
    TransactionType
} from '@/shared/types/TransactionHistory';
import {
    CheckCircleOutlined,
    CheckOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    CopyOutlined,
    ExportOutlined
} from '@ant-design/icons';

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
    warning: '#f59e0b',
    pending: '#fbbf24'
};

interface LocationState {
    txid: string;
}

function getStatusColor(status: TransactionStatus): string {
    switch (status) {
        case TransactionStatus.CONFIRMED:
            return colors.success;
        case TransactionStatus.FAILED:
            return colors.error;
        case TransactionStatus.PENDING:
        default:
            return colors.pending;
    }
}

function getStatusIcon(status: TransactionStatus) {
    const size = 24;
    switch (status) {
        case TransactionStatus.CONFIRMED:
            return <CheckCircleOutlined style={{ fontSize: size, color: colors.success }} />;
        case TransactionStatus.FAILED:
            return <CloseCircleOutlined style={{ fontSize: size, color: colors.error }} />;
        case TransactionStatus.PENDING:
        default:
            return <ClockCircleOutlined style={{ fontSize: size, color: colors.pending }} />;
    }
}

function getTypeLabel(type: TransactionType): string {
    switch (type) {
        case TransactionType.BTC_TRANSFER:
            return 'BTC Transfer';
        case TransactionType.BTC_RECEIVE:
            return 'BTC Receive';
        case TransactionType.OPNET_INTERACTION:
            return 'Contract Interaction';
        case TransactionType.CONTRACT_DEPLOYMENT:
            return 'Contract Deployment';
        case TransactionType.TOKEN_TRANSFER:
            return 'Token Transfer';
        case TransactionType.CANCEL_TRANSACTION:
            return 'Cancel Transaction';
        default:
            return 'Transaction';
    }
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function shortenAddress(address: string): string {
    if (!address || address.length < 20) return address;
    return `${address.slice(0, 12)}...${address.slice(-10)}`;
}

interface DetailRowProps {
    label: string;
    value: string;
    copyable?: boolean;
    onCopy?: () => void;
    copied?: boolean;
    external?: string;
}

function DetailRow({ label, value, copyable, onCopy, copied, external }: DetailRowProps) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '10px 0',
                borderBottom: `1px solid ${colors.border}`
            }}>
            <span style={{ fontSize: 12, color: colors.textFaded, flexShrink: 0 }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '60%' }}>
                <span
                    style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        textAlign: 'right'
                    }}>
                    {value}
                </span>
                {copyable && (
                    <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={onCopy}>
                        {copied ? (
                            <CheckOutlined style={{ fontSize: 12, color: colors.success }} />
                        ) : (
                            <CopyOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                        )}
                    </div>
                )}
                {external && (
                    <a
                        href={external}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flexShrink: 0 }}>
                        <ExportOutlined style={{ fontSize: 12, color: colors.main }} />
                    </a>
                )}
            </div>
        </div>
    );
}

export default function TransactionDetailScreen() {
    const navigate = useNavigate();
    const wallet = useWallet();
    const tools = useTools();
    const currentAccount = useCurrentAccount();
    const { txid } = useLocationState<LocationState>();

    const [loading, setLoading] = useState(true);
    const [tx, setTx] = useState<TransactionHistoryItem | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const loadTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const history = await wallet.getTransactionHistory();
            const found = history.find((t) => t.txid === txid);
            setTx(found || null);
        } catch (error) {
            console.error('Failed to load transaction:', error);
            setTx(null);
        } finally {
            setLoading(false);
        }
    }, [wallet, txid]);

    useEffect(() => {
        if (txid) {
            void loadTransaction();
        }
    }, [loadTransaction, txid]);

    const handleCopy = async (field: string, value: string) => {
        await copyToClipboard(value);
        setCopiedField(field);
        tools.toastSuccess('Copied');
        setTimeout(() => setCopiedField(null), 2000);
    };

    if (loading) {
        return (
            <Layout>
                <Content itemsCenter justifyCenter style={{ backgroundColor: colors.background }}>
                    <OPNetLoader size={60} text="Loading transaction" />
                </Content>
            </Layout>
        );
    }

    if (!tx) {
        return (
            <Layout>
                <Header title="Transaction Details" onBack={() => navigate(RouteTypes.HistoryScreen)} />
                <Content style={{ padding: 16, backgroundColor: colors.background }}>
                    <div style={{ textAlign: 'center', paddingTop: 60, color: colors.textFaded }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>❓</div>
                        <div style={{ fontSize: 14 }}>Transaction not found</div>
                    </div>
                </Content>
            </Layout>
        );
    }

    const explorerUrl = `https://opscan.org/tx/${tx.txid}`;

    return (
        <Layout>
            <Header title="Transaction Details" onBack={() => navigate(RouteTypes.HistoryScreen)} />

            <Content style={{ padding: 16, backgroundColor: colors.background }}>
                <Column gap="md">
                    {/* Status Header */}
                    <div
                        style={{
                            background: colors.cardBg,
                            borderRadius: 12,
                            padding: 20,
                            textAlign: 'center'
                        }}>
                        <div style={{ marginBottom: 12 }}>{getStatusIcon(tx.status)}</div>
                        <div
                            style={{
                                fontSize: 18,
                                fontWeight: 600,
                                color: getStatusColor(tx.status),
                                textTransform: 'capitalize',
                                marginBottom: 4
                            }}>
                            {tx.status}
                        </div>
                        <div style={{ fontSize: 13, color: colors.textFaded }}>{getTypeLabel(tx.type)}</div>
                    </div>

                    {/* Transaction Details */}
                    <div
                        style={{
                            background: colors.cardBg,
                            borderRadius: 12,
                            padding: '4px 14px'
                        }}>
                        <DetailRow
                            label="Transaction ID"
                            value={shortenAddress(tx.txid)}
                            copyable
                            onCopy={() => handleCopy('txid', tx.txid)}
                            copied={copiedField === 'txid'}
                            external={explorerUrl}
                        />

                        {tx.fundingTxid && (
                            <DetailRow
                                label="Funding TX"
                                value={shortenAddress(tx.fundingTxid)}
                                copyable
                                onCopy={() => handleCopy('fundingTxid', tx.fundingTxid ?? '')}
                                copied={copiedField === 'fundingTxid'}
                                external={`https://opscan.org/tx/${tx.fundingTxid}`}
                            />
                        )}

                        <DetailRow label="Type" value={getTypeLabel(tx.type)} />

                        <DetailRow label="Timestamp" value={formatDate(tx.timestamp)} />

                        {tx.confirmedAt && <DetailRow label="Confirmed" value={formatDate(tx.confirmedAt)} />}

                        {tx.blockHeight && <DetailRow label="Block" value={tx.blockHeight.toString()} />}
                    </div>

                    {/* Addresses */}
                    <div
                        style={{
                            background: colors.cardBg,
                            borderRadius: 12,
                            padding: '4px 14px'
                        }}>
                        <DetailRow
                            label="From"
                            value={shortenAddress(tx.from)}
                            copyable
                            onCopy={() => handleCopy('from', tx.from)}
                            copied={copiedField === 'from'}
                        />

                        {tx.to && (
                            <DetailRow
                                label="To"
                                value={shortenAddress(tx.to)}
                                copyable
                                onCopy={() => handleCopy('to', tx.to ?? '')}
                                copied={copiedField === 'to'}
                            />
                        )}

                        {tx.contractAddress && (
                            <DetailRow
                                label="Contract"
                                value={shortenAddress(tx.contractAddress)}
                                copyable
                                onCopy={() => handleCopy('contract', tx.contractAddress ?? '')}
                                copied={copiedField === 'contract'}
                                external={`https://opscan.org/address/${tx.contractAddress}`}
                            />
                        )}
                    </div>

                    {/* Amounts & Fees */}
                    {(tx.amount || tx.fee > 0) && (
                        <div
                            style={{
                                background: colors.cardBg,
                                borderRadius: 12,
                                padding: '4px 14px'
                            }}>
                            {tx.amount && (
                                <DetailRow
                                    label="Amount"
                                    value={`${tx.amountDisplay || tx.amount} ${tx.tokenSymbol || 'sats'}`}
                                />
                            )}

                            {tx.fee > 0 && <DetailRow label="Fee" value={`${tx.fee} sats`} />}

                            {tx.feeRate && <DetailRow label="Fee Rate" value={`${tx.feeRate} sat/vB`} />}
                        </div>
                    )}

                    {/* Origin Info */}
                    {tx.origin.type === 'external' && (
                        <div
                            style={{
                                background: colors.cardBg,
                                borderRadius: 12,
                                padding: '4px 14px'
                            }}>
                            <DetailRow label="Origin" value="External DApp" />
                            {tx.origin.siteName && <DetailRow label="Site" value={tx.origin.siteName} />}
                            {tx.origin.siteUrl && <DetailRow label="URL" value={tx.origin.siteUrl} />}
                        </div>
                    )}

                    {/* View on Explorer Button */}
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: 14,
                            background: colors.buttonSecondary,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 10,
                            color: colors.textSecondary,
                            fontSize: 14,
                            fontWeight: 600,
                            textAlign: 'center',
                            textDecoration: 'none',
                            marginTop: 8
                        }}>
                        View on OPScan <ExportOutlined style={{ marginLeft: 6 }} />
                    </a>
                </Column>
            </Content>
        </Layout>
    );
}
