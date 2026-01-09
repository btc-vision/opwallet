import { BitcoinUtils } from 'opnet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    TransactionHistoryFilter,
    TransactionHistoryItem,
    TransactionStatus,
    TransactionType
} from '@/shared/types/TransactionHistory';
import { Column, Content, Header, Layout, OPNetLoader } from '@/ui/components';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChainType } from '@/ui/state/settings/hooks';
import { useWallet } from '@/ui/utils';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    DeploymentUnitOutlined,
    ExportOutlined,
    FilterOutlined,
    SendOutlined,
    SwapOutlined,
    WalletOutlined
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

const ITEMS_PER_PAGE = 10;

function getTypeIcon(type: TransactionType) {
    switch (type) {
        case TransactionType.BTC_TRANSFER:
            return <SendOutlined style={{ color: colors.main }} />;
        case TransactionType.BTC_RECEIVE:
            return <WalletOutlined style={{ color: colors.success }} />;
        case TransactionType.OPNET_INTERACTION:
            return <SwapOutlined style={{ color: colors.main }} />;
        case TransactionType.CONTRACT_DEPLOYMENT:
            return <DeploymentUnitOutlined style={{ color: colors.warning }} />;
        case TransactionType.TOKEN_TRANSFER:
            return <SendOutlined style={{ color: colors.main }} />;
        case TransactionType.TOKEN_RECEIVE:
            return <WalletOutlined style={{ color: colors.success }} />;
        case TransactionType.CANCEL_TRANSACTION:
            return <CloseCircleOutlined style={{ color: colors.error }} />;
        default:
            return <SwapOutlined style={{ color: colors.textFaded }} />;
    }
}

function getTypeLabel(tx: TransactionHistoryItem): string {
    const formatBtcAmount = (amount: string | undefined): string => {
        if (!amount) return '';
        // If amountDisplay is already set, use it (it already includes formatting)
        if (tx.amountDisplay) {
            return ` ${tx.amountDisplay}`;
        }
        // Otherwise format the raw satoshi amount
        const formatted = BitcoinUtils.formatUnits(BigInt(amount), 8);
        return ` ${formatted} BTC`;
    };

    const formatTokenAmount = (amount: string | undefined, symbol: string | undefined, decimals?: number): string => {
        if (!amount) return '';
        // If amountDisplay is already set, use it
        if (tx.amountDisplay) {
            return ` ${tx.amountDisplay}`;
        }
        // Otherwise format with token decimals
        const dec = decimals ?? tx.tokenDecimals ?? 8;
        const formatted = BitcoinUtils.formatUnits(BigInt(amount), dec);
        return ` ${formatted} ${symbol || ''}`;
    };

    switch (tx.type) {
        case TransactionType.BTC_TRANSFER:
            return `Sent${formatBtcAmount(tx.amount)}`;
        case TransactionType.BTC_RECEIVE:
            return `Received${formatBtcAmount(tx.amount)}`;
        case TransactionType.OPNET_INTERACTION:
            return tx.contractMethod ? tx.contractMethod : 'Contract Interaction';
        case TransactionType.CONTRACT_DEPLOYMENT:
            return 'Contract Deployment';
        case TransactionType.TOKEN_TRANSFER:
            return `Sent${formatTokenAmount(tx.amount, tx.tokenSymbol, tx.tokenDecimals)}`;
        case TransactionType.TOKEN_RECEIVE:
            return `Received${formatTokenAmount(tx.amount, tx.tokenSymbol, tx.tokenDecimals)}`;
        case TransactionType.CANCEL_TRANSACTION:
            return 'Cancelled Transaction';
        default:
            return 'Transaction';
    }
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
    switch (status) {
        case TransactionStatus.CONFIRMED:
            return <CheckCircleOutlined style={{ fontSize: 12, color: colors.success }} />;
        case TransactionStatus.FAILED:
            return <CloseCircleOutlined style={{ fontSize: 12, color: colors.error }} />;
        case TransactionStatus.PENDING:
        default:
            return <ClockCircleOutlined style={{ fontSize: 12, color: colors.pending }} />;
    }
}

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shortenTxid(txid: string): string {
    if (!txid || txid.length < 16) return txid;
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
}

interface TransactionItemProps {
    tx: TransactionHistoryItem;
    onClick: () => void;
}

function TransactionItem({ tx, onClick }: TransactionItemProps) {
    return (
        <div
            style={{
                background: colors.cardBg,
                borderRadius: 10,
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                marginBottom: 8
            }}
            onClick={onClick}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#333')}
            onMouseLeave={(e) => (e.currentTarget.style.background = colors.cardBg)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Type Icon or Site Favicon for external */}
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        position: 'relative'
                    }}>
                    {tx.origin.type === 'external' && tx.origin.siteIcon ? (
                        <img
                            src={tx.origin.siteIcon}
                            alt=""
                            style={{ width: 20, height: 20, borderRadius: 4 }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                    const fallback = document.createElement('span');
                                    fallback.innerHTML =
                                        '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="color: #f37413"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
                                    if (fallback.firstChild) {
                                        parent.appendChild(fallback.firstChild);
                                    }
                                }
                            }}
                        />
                    ) : (
                        getTypeIcon(tx.type)
                    )}
                </div>

                {/* Main Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{getTypeLabel(tx)}</span>
                        {tx.origin.type === 'external' && (
                            <span
                                style={{
                                    fontSize: 9,
                                    color: colors.textFaded,
                                    background: 'rgba(255,255,255,0.08)',
                                    padding: '1px 4px',
                                    borderRadius: 3
                                }}
                                title={tx.origin.siteName || tx.origin.siteUrl}>
                                {tx.origin.siteName || 'DApp'}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textFaded, fontFamily: 'monospace' }}>
                        {shortenTxid(tx.txid)}
                    </div>
                </div>

                {/* Status & Time */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        {getStatusIcon(tx.status)}
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: getStatusColor(tx.status),
                                textTransform: 'capitalize'
                            }}>
                            {tx.status}
                        </span>
                    </div>
                    <div style={{ fontSize: 10, color: colors.textFaded, marginTop: 2 }}>
                        {formatTimestamp(tx.timestamp)}
                    </div>
                </div>
            </div>
        </div>
    );
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'failed';

export default function HistoryScreen() {
    const navigate = useNavigate();
    const wallet = useWallet();
    const currentAccount = useCurrentAccount();
    const chainType = useChainType();

    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadHistory = useCallback(
        async (showLoader: boolean) => {
            if (showLoader) {
                setLoading(true);
            }
            try {
                const filter: TransactionHistoryFilter | undefined =
                    filterStatus !== 'all'
                        ? { statuses: [filterStatus.toUpperCase() as TransactionStatus] }
                        : undefined;

                const history = await wallet.getFilteredTransactionHistory(filter);
                setTransactions(history);
            } catch (error) {
                console.error('Failed to load transaction history:', error);
                setTransactions([]);
            } finally {
                if (showLoader) {
                    setLoading(false);
                }
            }
        },
        [wallet, filterStatus]
    );

    // Initial load - refresh transaction status when opening history page
    useEffect(() => {
        const init = async () => {
            // Refresh pending tx status and check incoming (only when on this page)
            void wallet.refreshTransactionStatus();
            // Load history
            await loadHistory(true);
        };
        void init();
    }, [loadHistory, wallet, currentAccount.pubkey, chainType]);

    // Check if there are any pending transactions
    const hasPendingTransactions = useMemo(() => {
        return transactions.some((tx) => tx.status === TransactionStatus.PENDING);
    }, [transactions]);

    // Poll for updates when there are pending transactions
    useEffect(() => {
        // Clear any existing interval
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        // Only poll if there are pending transactions
        if (hasPendingTransactions) {
            pollIntervalRef.current = setInterval(() => {
                void loadHistory(false);
            }, 15000); // Poll every 15 seconds
        }

        // Cleanup on unmount
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [hasPendingTransactions, loadHistory]);

    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return transactions.slice(start, start + ITEMS_PER_PAGE);
    }, [transactions, currentPage]);

    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);

    const handleTxClick = (tx: TransactionHistoryItem) => {
        navigate(RouteTypes.TransactionDetailScreen, { txid: tx.txid });
    };

    const filterButtons: { value: FilterStatus; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'failed', label: 'Failed' }
    ];

    return (
        <Layout>
            <Header
                title="Transaction History"
                onBack={() => navigate(RouteTypes.MainScreen)}
                RightComponent={
                    <div style={{ cursor: 'pointer', padding: 8 }} onClick={() => setShowFilters(!showFilters)}>
                        <FilterOutlined style={{ fontSize: 16, color: showFilters ? colors.main : colors.textFaded }} />
                    </div>
                }
            />

            <Content style={{ padding: '12px 16px', backgroundColor: colors.background }}>
                {/* Filter Pills */}
                {showFilters && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        {filterButtons.map((btn) => (
                            <button
                                key={btn.value}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 16,
                                    border: 'none',
                                    background: filterStatus === btn.value ? colors.main : colors.buttonSecondary,
                                    color: filterStatus === btn.value ? '#fff' : colors.textSecondary,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                                onClick={() => {
                                    setFilterStatus(btn.value);
                                    setCurrentPage(1);
                                }}>
                                {btn.label}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
                        <OPNetLoader size={60} text="Loading history" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            paddingTop: 60,
                            color: colors.textFaded
                        }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>📜</div>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>No transactions yet</div>
                        <div style={{ fontSize: 12 }}>Your transaction history will appear here</div>
                    </div>
                ) : (
                    <Column>
                        {paginatedTransactions.map((tx) => (
                            <TransactionItem key={tx.id} tx={tx} onClick={() => handleTxClick(tx)} />
                        ))}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginTop: 16
                                }}>
                                <button
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: colors.buttonSecondary,
                                        color: currentPage === 1 ? colors.textFaded : colors.text,
                                        fontSize: 12,
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 1 ? 0.5 : 1
                                    }}
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}>
                                    Prev
                                </button>
                                <span style={{ fontSize: 12, color: colors.textFaded }}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: colors.buttonSecondary,
                                        color: currentPage === totalPages ? colors.textFaded : colors.text,
                                        fontSize: 12,
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === totalPages ? 0.5 : 1
                                    }}
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}>
                                    Next
                                </button>
                            </div>
                        )}

                        {/* View on Explorer Link */}
                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <a
                                href={`https://opscan.org/accounts/${currentAccount.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    fontSize: 12,
                                    color: colors.main,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                View on OPScan <ExportOutlined style={{ fontSize: 10 }} />
                            </a>
                        </div>
                    </Column>
                )}
            </Content>
        </Layout>
    );
}
