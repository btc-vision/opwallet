import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { NETWORK_TYPES } from '@/shared/constant';
import {
    Action,
    AcceptDomainTransferParameters,
    CancelDomainTransferParameters,
    Features,
    InitiateDomainTransferParameters,
    PublishDomainParameters,
    RegisterDomainParameters
} from '@/shared/interfaces/RawTxParameters';
import { NetworkType } from '@/shared/types';
import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { useAccountAddress } from '@/ui/state/accounts/hooks';
import { useChain } from '@/ui/state/settings/hooks';
import { copyToClipboard, useWallet } from '@/ui/utils';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    CloudUploadOutlined,
    CodeOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownOutlined,
    GlobalOutlined,
    LoadingOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SendOutlined,
    SwapOutlined,
    UploadOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { RouteTypes, useNavigate } from '../routeTypes';
import { useBtcDomainsEnabled } from '@/ui/hooks/useAppConfig';

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
    inputBg: '#1a1a1a',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    info: '#3b82f6'
};

type Tab = 'mydomains' | 'register' | 'publish' | 'transfer';

interface TrackedDomainInfo {
    name: string;
    registeredAt?: number;
    lastVerified?: number;
    isOwner: boolean;
}

interface DomainInfo {
    exists: boolean;
    owner: string | null;
    isOwner: boolean;
    price: bigint;
    treasuryAddress: string;
}

interface PendingTransferInfo {
    domainName: string;
    newOwner: string;
    isOutgoing: boolean; // true if current user is transferring away, false if receiving
}

export default function BtcDomainScreen() {
    const navigate = useNavigate();
    const tools = useTools();
    const wallet = useWallet();
    const chain = useChain();
    const userAddress = useAccountAddress();
    const btcDomainsEnabled = useBtcDomainsEnabled();
    const [activeTab, setActiveTab] = useState<Tab>('mydomains');

    // My Domains state
    const [myDomains, setMyDomains] = useState<TrackedDomainInfo[]>([]);
    const [isLoadingDomains, setIsLoadingDomains] = useState(false);
    const [addDomainInput, setAddDomainInput] = useState('');
    const [isAddingDomain, setIsAddingDomain] = useState(false);

    // Registration state
    const [domainInput, setDomainInput] = useState('');
    const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
    const [isCheckingDomain, setIsCheckingDomain] = useState(false);
    const [feeRate, setFeeRate] = useState(5);

    // Publishing state
    const [publishDomain, setPublishDomain] = useState('');
    const [publishDomainInfo, setPublishDomainInfo] = useState<DomainInfo | null>(null);
    const [isCheckingPublishDomain, setIsCheckingPublishDomain] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedCid, setUploadedCid] = useState<string | null>(null);
    const [publishFeeRate, setPublishFeeRate] = useState(5);

    // CLI instructions state
    const [showCliInstructions, setShowCliInstructions] = useState(false);

    // Transfer state
    const [transferDomainInput, setTransferDomainInput] = useState('');
    const [transferDomainInfo, setTransferDomainInfo] = useState<DomainInfo | null>(null);
    const [isCheckingTransferDomain, setIsCheckingTransferDomain] = useState(false);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [pendingTransfers, setPendingTransfers] = useState<PendingTransferInfo[]>([]);
    const [isLoadingPendingTransfers, setIsLoadingPendingTransfers] = useState(false);
    const [acceptDomainInput, setAcceptDomainInput] = useState('');
    const [acceptDomainPendingInfo, setAcceptDomainPendingInfo] = useState<PendingTransferInfo | null>(null);
    const [isCheckingAcceptDomain, setIsCheckingAcceptDomain] = useState(false);
    const [transferFeeRate, setTransferFeeRate] = useState(5);

    // Get network flag for CLI commands (empty for mainnet, -n <network> for others)
    const networkFlag = useMemo(() => {
        if (chain.networkType === NetworkType.MAINNET) return '';
        return ` -n ${NETWORK_TYPES[chain.networkType].name}`;
    }, [chain.networkType]);

    // Load tracked domains
    const loadMyDomains = useCallback(async () => {
        setIsLoadingDomains(true);
        try {
            const domains = await wallet.getTrackedDomains();
            setMyDomains(domains);
        } catch (err) {
            console.error('Failed to load domains:', err);
        } finally {
            setIsLoadingDomains(false);
        }
    }, [wallet]);

    // Load domains on mount and when tab changes (also needed for transfer tab)
    useEffect(() => {
        if (activeTab === 'mydomains' || activeTab === 'transfer') {
            loadMyDomains();
        }
    }, [activeTab, loadMyDomains]);

    // Add domain to tracking
    const handleAddDomain = useCallback(async () => {
        if (!addDomainInput.trim()) return;

        setIsAddingDomain(true);
        try {
            await wallet.addTrackedDomain(addDomainInput);
            setAddDomainInput('');
            await loadMyDomains();
            tools.toastSuccess('Domain added!');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to add domain';
            tools.toastError(message);
        } finally {
            setIsAddingDomain(false);
        }
    }, [addDomainInput, wallet, loadMyDomains, tools]);

    // Remove domain from tracking
    const handleRemoveDomain = useCallback(async (domainName: string) => {
        try {
            await wallet.removeTrackedDomain(domainName);
            await loadMyDomains();
            tools.toastSuccess('Domain removed');
        } catch {
            tools.toastError('Failed to remove domain');
        }
    }, [wallet, loadMyDomains, tools]);

    // Normalize domain name
    const normalizeDomain = (input: string): string => {
        return input.toLowerCase().replace(/\.btc$/, '').trim();
    };

    // Validate domain name
    const validateDomainName = (name: string): string | null => {
        if (!name) return 'Enter a domain name';
        if (name.length > 63) return 'Domain must be 63 characters or less';
        if (!/^[a-z0-9]/.test(name)) return 'Must start with a letter or number';
        if (!/[a-z0-9]$/.test(name)) return 'Must end with a letter or number';
        if (!/^[a-z0-9-]+$/.test(name)) return 'Only letters, numbers, and hyphens allowed';
        if (/--/.test(name)) return 'Cannot have consecutive hyphens';
        return null;
    };

    // Check domain availability
    const checkDomain = useCallback(async () => {
        const normalized = normalizeDomain(domainInput);
        const error = validateDomainName(normalized);
        if (error) {
            tools.toastError(error);
            return;
        }

        setIsCheckingDomain(true);
        setDomainInfo(null);

        try {
            const info = await wallet.getBtcDomainInfo(normalized);
            setDomainInfo({
                exists: info.exists,
                owner: info.owner,
                isOwner: info.owner?.toLowerCase() === userAddress.toLowerCase(),
                price: info.price,
                treasuryAddress: info.treasuryAddress
            });
        } catch (err) {
            console.error('Failed to check domain:', err);
            tools.toastError('Failed to check domain availability');
        } finally {
            setIsCheckingDomain(false);
        }
    }, [domainInput, wallet, userAddress, tools]);

    // Check publish domain ownership
    const checkPublishDomain = useCallback(async () => {
        const normalized = normalizeDomain(publishDomain);
        const error = validateDomainName(normalized);
        if (error) {
            tools.toastError(error);
            return;
        }

        setIsCheckingPublishDomain(true);
        setPublishDomainInfo(null);

        try {
            const info = await wallet.getBtcDomainInfo(normalized);
            setPublishDomainInfo({
                exists: info.exists,
                owner: info.owner,
                isOwner: info.owner?.toLowerCase() === userAddress.toLowerCase(),
                price: info.price,
                treasuryAddress: info.treasuryAddress
            });
        } catch (err) {
            console.error('Failed to check domain:', err);
            tools.toastError('Failed to check domain');
        } finally {
            setIsCheckingPublishDomain(false);
        }
    }, [publishDomain, wallet, userAddress, tools]);

    // Check domain ownership for transfer
    const checkTransferDomain = useCallback(async () => {
        const normalized = normalizeDomain(transferDomainInput);
        const error = validateDomainName(normalized);
        if (error) {
            tools.toastError(error);
            return;
        }

        setIsCheckingTransferDomain(true);
        setTransferDomainInfo(null);

        try {
            const info = await wallet.getBtcDomainInfo(normalized);
            setTransferDomainInfo({
                exists: info.exists,
                owner: info.owner,
                isOwner: info.owner?.toLowerCase() === userAddress.toLowerCase(),
                price: info.price,
                treasuryAddress: info.treasuryAddress
            });
        } catch (err) {
            console.error('Failed to check domain:', err);
            tools.toastError('Failed to check domain');
        } finally {
            setIsCheckingTransferDomain(false);
        }
    }, [transferDomainInput, wallet, userAddress, tools]);

    // Check pending transfer for accept
    const checkPendingTransfer = useCallback(async () => {
        const normalized = normalizeDomain(acceptDomainInput);
        const error = validateDomainName(normalized);
        if (error) {
            tools.toastError(error);
            return;
        }

        setIsCheckingAcceptDomain(true);
        setAcceptDomainPendingInfo(null);

        try {
            const pendingInfo = await wallet.getPendingDomainTransfer(normalized);
            if (pendingInfo && pendingInfo.newOwner) {
                const isForMe = pendingInfo.newOwner.toLowerCase() === userAddress.toLowerCase();
                setAcceptDomainPendingInfo({
                    domainName: normalized,
                    newOwner: pendingInfo.newOwner,
                    isOutgoing: !isForMe
                });
            } else {
                tools.toastError('No pending transfer found for this domain');
            }
        } catch (err) {
            console.error('Failed to check pending transfer:', err);
            tools.toastError('Failed to check pending transfer');
        } finally {
            setIsCheckingAcceptDomain(false);
        }
    }, [acceptDomainInput, wallet, userAddress, tools]);

    // Load pending transfers for owned domains
    const loadPendingTransfers = useCallback(async () => {
        setIsLoadingPendingTransfers(true);
        try {
            const transfers: PendingTransferInfo[] = [];
            // Check owned domains for outgoing transfers
            for (const domain of myDomains) {
                if (domain.isOwner) {
                    try {
                        const pendingInfo = await wallet.getPendingDomainTransfer(domain.name);
                        if (pendingInfo && pendingInfo.newOwner) {
                            transfers.push({
                                domainName: domain.name,
                                newOwner: pendingInfo.newOwner,
                                isOutgoing: true
                            });
                        }
                    } catch {
                        // No pending transfer for this domain
                    }
                }
            }
            setPendingTransfers(transfers);
        } catch (err) {
            console.error('Failed to load pending transfers:', err);
        } finally {
            setIsLoadingPendingTransfers(false);
        }
    }, [myDomains, wallet]);

    // Load pending transfers when switching to transfer tab
    useEffect(() => {
        if (activeTab === 'transfer' && myDomains.length > 0) {
            loadPendingTransfers();
        }
         
    }, [activeTab, myDomains.length]);

    // Handle initiate transfer - navigate to TxOpnetConfirmScreen
    const handleInitiateTransfer = useCallback(() => {
        if (!transferDomainInfo?.isOwner || !recipientAddress.trim()) return;

        const normalizedDomain = normalizeDomain(transferDomainInput);
        const rawTxInfo: InitiateDomainTransferParameters = {
            header: `Transfer ${normalizedDomain}.btc`,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true
            },
            tokens: [],
            feeRate: transferFeeRate,
            priorityFee: 0n,
            action: Action.InitiateDomainTransfer,
            domainName: normalizedDomain,
            newOwner: recipientAddress.trim()
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo });
    }, [transferDomainInfo, transferDomainInput, recipientAddress, transferFeeRate, navigate]);

    // Handle accept transfer - navigate to TxOpnetConfirmScreen
    const handleAcceptTransfer = useCallback((domainName: string) => {
        const normalizedDomain = normalizeDomain(domainName);
        const rawTxInfo: AcceptDomainTransferParameters = {
            header: `Accept ${normalizedDomain}.btc`,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true
            },
            tokens: [],
            feeRate: transferFeeRate,
            priorityFee: 0n,
            action: Action.AcceptDomainTransfer,
            domainName: normalizedDomain
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo });
    }, [transferFeeRate, navigate]);

    // Handle cancel transfer - navigate to TxOpnetConfirmScreen
    const handleCancelTransfer = useCallback((domainName: string) => {
        const normalizedDomain = normalizeDomain(domainName);
        const rawTxInfo: CancelDomainTransferParameters = {
            header: `Cancel Transfer ${normalizedDomain}.btc`,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true
            },
            tokens: [],
            feeRate: transferFeeRate,
            priorityFee: 0n,
            action: Action.CancelDomainTransfer,
            domainName: normalizedDomain
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo });
    }, [transferFeeRate, navigate]);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Only allow HTML files for single-file publishing
        if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
            tools.toastError('Only HTML files supported for in-wallet publishing');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            tools.toastError('File too large (max 5MB)');
            return;
        }

        setSelectedFile(file);
        setUploadedCid(null);
    };

    // Upload file to IPFS
    const uploadToIpfs = useCallback(async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            // Read file as base64
            const reader = new FileReader();
            const fileData = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
            });

            const cid = await wallet.uploadToIpfs(fileData, selectedFile.name);
            setUploadedCid(cid);
            tools.toastSuccess('File uploaded to IPFS!');
        } catch (err) {
            console.error('Failed to upload to IPFS:', err);
            tools.toastError('Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    }, [selectedFile, wallet, tools]);

    // Format satoshis to BTC
    const formatBtc = (sats: bigint): string => {
        const btc = Number(sats) / 100_000_000;
        return btc.toFixed(8).replace(/\.?0+$/, '');
    };

    // Handle domain registration - navigate to TxOpnetConfirmScreen
    const handleRegisterDomain = useCallback(() => {
        if (!domainInfo || domainInfo.exists) return;

        const normalizedDomain = normalizeDomain(domainInput);
        const rawTxInfo: RegisterDomainParameters = {
            header: `Register ${normalizedDomain}.btc`,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true
            },
            tokens: [],
            feeRate: feeRate,
            priorityFee: 0n,
            action: Action.RegisterDomain,
            domainName: normalizedDomain,
            price: domainInfo.price,
            treasuryAddress: domainInfo.treasuryAddress
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo });
    }, [domainInfo, domainInput, feeRate, navigate]);

    // Handle website publishing - navigate to TxOpnetConfirmScreen
    const handlePublishWebsite = useCallback(() => {
        if (!publishDomainInfo?.isOwner || !uploadedCid) return;

        const normalizedDomain = normalizeDomain(publishDomain);
        const rawTxInfo: PublishDomainParameters = {
            header: `Publish to ${normalizedDomain}.btc`,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true
            },
            tokens: [],
            feeRate: publishFeeRate,
            priorityFee: 0n,
            action: Action.PublishDomain,
            domainName: normalizedDomain,
            cid: uploadedCid
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo });
    }, [publishDomainInfo, publishDomain, uploadedCid, publishFeeRate, navigate]);

    // Feature flag check - .btc domains not available on this network
    if (!btcDomainsEnabled) {
        return (
            <Layout>
                <Header title=".btc Domains" onBack={() => navigate(RouteTypes.MainScreen)} />
                <Content style={{ padding: '20px' }}>
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.warning}08 100%)`,
                            border: `1px solid ${colors.warning}40`,
                            borderRadius: '14px',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                        <GlobalOutlined style={{ fontSize: 48, color: colors.warning, marginBottom: 16 }} />
                        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: colors.text }}>
                            Coming Soon
                        </div>
                        <div style={{ fontSize: 13, color: colors.textFaded, textAlign: 'center' }}>
                            .btc domains are currently only available on Bitcoin Regtest. Switch networks to use this feature.
                        </div>
                    </div>
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header title=".btc Domains" onBack={() => navigate(RouteTypes.MainScreen)} />

            <Content style={{ padding: '16px' }}>
                {/* Tabs */}
                <div
                    style={{
                        display: 'flex',
                        gap: '4px',
                        marginBottom: '20px',
                        background: colors.containerBgFaded,
                        borderRadius: '10px',
                        padding: '4px'
                    }}>
                    <button
                        onClick={() => setActiveTab('mydomains')}
                        style={{
                            flex: 1,
                            padding: '8px 4px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: activeTab === 'mydomains' ? colors.main : 'transparent',
                            color: activeTab === 'mydomains' ? '#000' : colors.textFaded,
                            transition: 'all 0.2s'
                        }}>
                        My Domains
                    </button>
                    <button
                        onClick={() => setActiveTab('register')}
                        style={{
                            flex: 1,
                            padding: '8px 4px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: activeTab === 'register' ? colors.main : 'transparent',
                            color: activeTab === 'register' ? '#000' : colors.textFaded,
                            transition: 'all 0.2s'
                        }}>
                        Register
                    </button>
                    <button
                        onClick={() => setActiveTab('publish')}
                        style={{
                            flex: 1,
                            padding: '8px 4px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: activeTab === 'publish' ? colors.main : 'transparent',
                            color: activeTab === 'publish' ? '#000' : colors.textFaded,
                            transition: 'all 0.2s'
                        }}>
                        Publish
                    </button>
                    <button
                        onClick={() => setActiveTab('transfer')}
                        style={{
                            flex: 1,
                            padding: '8px 4px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: activeTab === 'transfer' ? colors.main : 'transparent',
                            color: activeTab === 'transfer' ? '#000' : colors.textFaded,
                            transition: 'all 0.2s'
                        }}>
                        Transfer
                    </button>
                </div>

                {/* My Domains Tab */}
                {activeTab === 'mydomains' && (
                    <div>
                        {/* Add Domain Input */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px' }}>
                                Add Owned Domain
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: colors.inputBg,
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.containerBorder}`,
                                        padding: '0 12px'
                                    }}>
                                    <input
                                        type="text"
                                        value={addDomainInput}
                                        onChange={(e) => setAddDomainInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                                        placeholder="yourdomain"
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: colors.text,
                                            fontSize: '14px',
                                            padding: '12px 0'
                                        }}
                                    />
                                    <span style={{ color: colors.main, fontWeight: 600 }}>.btc</span>
                                </div>
                                <button
                                    onClick={handleAddDomain}
                                    disabled={isAddingDomain || !addDomainInput.trim()}
                                    style={{
                                        padding: '12px 16px',
                                        background: colors.main,
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isAddingDomain || !addDomainInput.trim() ? 'not-allowed' : 'pointer',
                                        opacity: isAddingDomain || !addDomainInput.trim() ? 0.5 : 1
                                    }}>
                                    {isAddingDomain ? (
                                        <LoadingOutlined style={{ color: '#000' }} />
                                    ) : (
                                        <PlusOutlined style={{ color: '#000' }} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Refresh Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                            <button
                                onClick={loadMyDomains}
                                disabled={isLoadingDomains}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: colors.textFaded,
                                    fontSize: '11px'
                                }}>
                                <ReloadOutlined spin={isLoadingDomains} /> Refresh
                            </button>
                        </div>

                        {/* Domain List */}
                        {isLoadingDomains ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: colors.textFaded }}>
                                <LoadingOutlined style={{ fontSize: 24 }} />
                                <div style={{ marginTop: '8px' }}>Loading domains...</div>
                            </div>
                        ) : myDomains.length === 0 ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: colors.textFaded,
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px'
                                }}>
                                <GlobalOutlined style={{ fontSize: 32, marginBottom: '12px', opacity: 0.5 }} />
                                <div style={{ fontSize: '13px' }}>No domains tracked yet</div>
                                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                    Add a domain you own or register a new one
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {myDomains.map((domain) => (
                                    <div
                                        key={domain.name}
                                        style={{
                                            background: colors.containerBgFaded,
                                            borderRadius: '10px',
                                            padding: '12px 14px',
                                            border: `1px solid ${domain.isOwner ? colors.success : colors.error}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                        <div
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                background: domain.isOwner ? `${colors.success}15` : `${colors.error}15`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                            {domain.isOwner ? (
                                                <CheckCircleOutlined style={{ color: colors.success, fontSize: 18 }} />
                                            ) : (
                                                <CloseCircleOutlined style={{ color: colors.error, fontSize: 18 }} />
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                                {domain.name}.btc
                                            </div>
                                            <div style={{ fontSize: '10px', color: colors.textFaded }}>
                                                {domain.isOwner ? 'Verified owner' : 'Not owned'}
                                            </div>
                                        </div>
                                        {domain.isOwner && (
                                            <button
                                                onClick={() => {
                                                    setTransferDomainInput(domain.name);
                                                    setTransferDomainInfo({
                                                        exists: true,
                                                        owner: userAddress,
                                                        isOwner: true,
                                                        price: 0n,
                                                        treasuryAddress: ''
                                                    });
                                                    setActiveTab('transfer');
                                                }}
                                                title="Transfer domain"
                                                style={{
                                                    background: `${colors.main}15`,
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    color: colors.main
                                                }}>
                                                <SwapOutlined />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRemoveDomain(domain.name)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                color: colors.textFaded
                                            }}>
                                            <DeleteOutlined />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Register Tab */}
                {activeTab === 'register' && (
                    <div>
                        {/* Search Input */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px' }}>
                                Domain Name
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: colors.inputBg,
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.containerBorder}`,
                                        padding: '0 12px'
                                    }}>
                                    <input
                                        type="text"
                                        value={domainInput}
                                        onChange={(e) => {
                                            setDomainInput(e.target.value);
                                            setDomainInfo(null); // Clear old info when input changes
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && checkDomain()}
                                        placeholder="yourdomain"
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: colors.text,
                                            fontSize: '14px',
                                            padding: '12px 0'
                                        }}
                                    />
                                    <span style={{ color: colors.main, fontWeight: 600 }}>.btc</span>
                                </div>
                                <button
                                    onClick={checkDomain}
                                    disabled={isCheckingDomain || !domainInput.trim()}
                                    style={{
                                        padding: '12px 16px',
                                        background: colors.main,
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isCheckingDomain || !domainInput.trim() ? 'not-allowed' : 'pointer',
                                        opacity: isCheckingDomain || !domainInput.trim() ? 0.5 : 1
                                    }}>
                                    {isCheckingDomain ? (
                                        <LoadingOutlined style={{ color: '#000' }} />
                                    ) : (
                                        <SearchOutlined style={{ color: '#000' }} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Domain Info */}
                        {domainInfo && (
                            <div
                                style={{
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '16px',
                                    border: `1px solid ${domainInfo.exists ? colors.error : colors.success}30`
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    {domainInfo.exists ? (
                                        <>
                                            <CloseCircleOutlined style={{ fontSize: 20, color: colors.error }} />
                                            <span style={{ color: colors.error, fontWeight: 600 }}>
                                                Domain is taken
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleOutlined style={{ fontSize: 20, color: colors.success }} />
                                            <span style={{ color: colors.success, fontWeight: 600 }}>
                                                Domain is available!
                                            </span>
                                        </>
                                    )}
                                </div>

                                {domainInfo.exists && domainInfo.owner && (
                                    <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '8px' }}>
                                        Owner: {domainInfo.owner.slice(0, 10)}...{domainInfo.owner.slice(-8)}
                                    </div>
                                )}

                                {!domainInfo.exists && (
                                    <>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '12px',
                                                background: colors.background,
                                                borderRadius: '8px',
                                                marginBottom: '12px'
                                            }}>
                                            <span style={{ color: colors.textFaded, fontSize: '12px' }}>
                                                Registration Price
                                            </span>
                                            <span style={{ color: colors.main, fontWeight: 700, fontSize: '16px' }}>
                                                {formatBtc(domainInfo.price)} BTC
                                            </span>
                                        </div>

                                        {/* Fee Rate Selector */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <FeeRateBar onChange={(val) => setFeeRate(val)} />
                                        </div>

                                        {/* Register Button */}
                                        <button
                                            onClick={handleRegisterDomain}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                background: colors.main,
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: '#000',
                                                marginBottom: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}>
                                            <GlobalOutlined /> Register {normalizeDomain(domainInput)}.btc
                                        </button>

                                        {/* CLI Command to register */}
                                        <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px' }}>
                                            Or register via CLI:
                                        </div>
                                        <div
                                            style={{
                                                background: colors.inputBg,
                                                borderRadius: '8px',
                                                padding: '10px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px'
                                            }}>
                                            <code style={{ fontSize: '10px', color: colors.success, fontFamily: 'monospace' }}>
                                                npx @btc-vision/cli domain register {normalizeDomain(domainInput)}.btc{networkFlag}
                                            </code>
                                            <button
                                                onClick={async () => {
                                                    await copyToClipboard(`npx @btc-vision/cli domain register ${normalizeDomain(domainInput)}.btc${networkFlag}`);
                                                    tools.toastSuccess('Copied!');
                                                }}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                                <CopyOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Info Box */}
                        <div
                            style={{
                                background: `${colors.info}10`,
                                border: `1px solid ${colors.info}30`,
                                borderRadius: '10px',
                                padding: '12px',
                                fontSize: '11px',
                                color: colors.textFaded,
                                lineHeight: 1.5
                            }}>
                            <GlobalOutlined style={{ color: colors.info, marginRight: '8px' }} />
                            Domain names are registered on Bitcoin directly. Once registered, you can publish
                            websites and receive payments to your .btc address.
                        </div>
                    </div>
                )}

                {/* Publish Tab */}
                {activeTab === 'publish' && (
                    <div>
                        {/* Domain Input */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px' }}>
                                Your Domain
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: colors.inputBg,
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.containerBorder}`,
                                        padding: '0 12px'
                                    }}>
                                    <input
                                        type="text"
                                        value={publishDomain}
                                        onChange={(e) => setPublishDomain(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && checkPublishDomain()}
                                        placeholder="yourdomain"
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: colors.text,
                                            fontSize: '14px',
                                            padding: '12px 0'
                                        }}
                                    />
                                    <span style={{ color: colors.main, fontWeight: 600 }}>.btc</span>
                                </div>
                                <button
                                    onClick={checkPublishDomain}
                                    disabled={isCheckingPublishDomain || !publishDomain.trim()}
                                    style={{
                                        padding: '12px 16px',
                                        background: colors.main,
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isCheckingPublishDomain || !publishDomain.trim() ? 'not-allowed' : 'pointer',
                                        opacity: isCheckingPublishDomain || !publishDomain.trim() ? 0.5 : 1
                                    }}>
                                    {isCheckingPublishDomain ? (
                                        <LoadingOutlined style={{ color: '#000' }} />
                                    ) : (
                                        <SearchOutlined style={{ color: '#000' }} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Domain Verification Result */}
                        {publishDomainInfo && (
                            <div
                                style={{
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '16px',
                                    border: `1px solid ${publishDomainInfo.isOwner ? colors.success : colors.error}30`
                                }}>
                                {!publishDomainInfo.exists ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <CloseCircleOutlined style={{ fontSize: 20, color: colors.error }} />
                                        <span style={{ color: colors.error, fontWeight: 600 }}>
                                            Domain not registered
                                        </span>
                                    </div>
                                ) : !publishDomainInfo.isOwner ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <CloseCircleOutlined style={{ fontSize: 20, color: colors.error }} />
                                        <span style={{ color: colors.error, fontWeight: 600 }}>
                                            You don&apos;t own this domain
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <CheckCircleOutlined style={{ fontSize: 20, color: colors.success }} />
                                        <span style={{ color: colors.success, fontWeight: 600 }}>
                                            Domain verified - you are the owner!
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* File Upload (only if domain is verified) */}
                        {publishDomainInfo?.isOwner && (
                            <>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px' }}>
                                        Upload HTML File
                                    </div>
                                    <label
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '24px',
                                            background: colors.inputBg,
                                            border: `2px dashed ${selectedFile ? colors.success : colors.containerBorder}`,
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}>
                                        <input
                                            type="file"
                                            accept=".html,.htm"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                        />
                                        {selectedFile ? (
                                            <>
                                                <CheckCircleOutlined style={{ fontSize: 32, color: colors.success, marginBottom: '8px' }} />
                                                <span style={{ color: colors.text, fontWeight: 600 }}>{selectedFile.name}</span>
                                                <span style={{ color: colors.textFaded, fontSize: '11px' }}>
                                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <UploadOutlined style={{ fontSize: 32, color: colors.textFaded, marginBottom: '8px' }} />
                                                <span style={{ color: colors.textFaded }}>
                                                    Click to select index.html
                                                </span>
                                            </>
                                        )}
                                    </label>
                                </div>

                                {/* Upload to IPFS button */}
                                {selectedFile && !uploadedCid && (
                                    <button
                                        onClick={uploadToIpfs}
                                        disabled={isUploading}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            background: colors.info,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: isUploading ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#fff',
                                            marginBottom: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}>
                                        {isUploading ? (
                                            <>
                                                <LoadingOutlined /> Uploading to IPFS...
                                            </>
                                        ) : (
                                            <>
                                                <CloudUploadOutlined /> Upload to IPFS
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* CID Display */}
                                {uploadedCid && (
                                    <div
                                        style={{
                                            background: `${colors.success}15`,
                                            border: `1px solid ${colors.success}30`,
                                            borderRadius: '10px',
                                            padding: '12px',
                                            marginBottom: '16px'
                                        }}>
                                        <div style={{ fontSize: '11px', color: colors.success, marginBottom: '6px', fontWeight: 600 }}>
                                            IPFS CID
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: colors.background,
                                                borderRadius: '6px',
                                                padding: '8px 10px'
                                            }}>
                                            <code style={{ fontSize: '10px', color: colors.text, fontFamily: 'monospace' }}>
                                                {uploadedCid.slice(0, 20)}...{uploadedCid.slice(-10)}
                                            </code>
                                            <button
                                                onClick={async () => {
                                                    await copyToClipboard(uploadedCid);
                                                    tools.toastSuccess('CID copied!');
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '4px'
                                                }}>
                                                <CopyOutlined style={{ color: colors.textFaded }} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Fee Rate Selector */}
                                {uploadedCid && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <FeeRateBar onChange={(val) => setPublishFeeRate(val)} />
                                    </div>
                                )}

                                {/* Publish Button */}
                                {uploadedCid && (
                                    <button
                                        onClick={handlePublishWebsite}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            background: colors.main,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#000',
                                            marginBottom: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}>
                                        <CloudUploadOutlined /> Publish to {normalizeDomain(publishDomain)}.btc
                                    </button>
                                )}

                                {/* Publish via CLI */}
                                {uploadedCid && (
                                    <div>
                                        <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px' }}>
                                            Or publish via CLI:
                                        </div>
                                        <div
                                            style={{
                                                background: colors.inputBg,
                                                borderRadius: '8px',
                                                padding: '10px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px'
                                            }}>
                                            <code style={{ fontSize: '9px', color: colors.success, fontFamily: 'monospace' }}>
                                                npx @btc-vision/cli publish {normalizeDomain(publishDomain)}.btc {uploadedCid}{networkFlag}
                                            </code>
                                            <button
                                                onClick={async () => {
                                                    await copyToClipboard(`npx @btc-vision/cli publish ${normalizeDomain(publishDomain)}.btc ${uploadedCid}${networkFlag}`);
                                                    tools.toastSuccess('Copied!');
                                                }}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                                <CopyOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Info Box */}
                        <div
                            style={{
                                background: `${colors.warning}10`,
                                border: `1px solid ${colors.warning}30`,
                                borderRadius: '10px',
                                padding: '12px',
                                fontSize: '11px',
                                color: colors.textFaded,
                                lineHeight: 1.5,
                                marginTop: '16px'
                            }}>
                            <CloudUploadOutlined style={{ color: colors.warning, marginRight: '8px' }} />
                            <strong>Single-file publishing only.</strong> For multi-file websites with assets,
                            use the CLI: <code style={{ color: colors.main }}>npx @btc-vision/cli deploy</code>
                        </div>
                    </div>
                )}

                {/* Transfer Tab */}
                {activeTab === 'transfer' && (
                    <div>
                        {/* Loading Pending Transfers */}
                        {isLoadingPendingTransfers && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '8px' }}>
                                <LoadingOutlined style={{ color: colors.main }} />
                                <span style={{ color: colors.textFaded, fontSize: '12px' }}>Loading pending transfers...</span>
                            </div>
                        )}

                        {/* Pending Outgoing Transfers */}
                        {!isLoadingPendingTransfers && pendingTransfers.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', color: colors.warning, marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <WarningOutlined /> Pending Outgoing Transfers
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pendingTransfers.map((transfer) => (
                                        <div
                                            key={transfer.domainName}
                                            style={{
                                                background: `${colors.warning}15`,
                                                border: `1px solid ${colors.warning}30`,
                                                borderRadius: '10px',
                                                padding: '12px'
                                            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <div style={{ fontWeight: 600, color: colors.text }}>
                                                    {transfer.domainName}.btc
                                                </div>
                                                <span style={{ fontSize: '10px', padding: '2px 8px', background: colors.warning, color: '#000', borderRadius: '4px', fontWeight: 600 }}>
                                                    PENDING
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '10px', color: colors.textFaded, marginBottom: '8px' }}>
                                                To: {transfer.newOwner.slice(0, 12)}...{transfer.newOwner.slice(-8)}
                                            </div>
                                            <button
                                                onClick={() => handleCancelTransfer(transfer.domainName)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    background: colors.error,
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}>
                                                <CloseCircleOutlined /> Cancel Transfer
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Initiate Transfer Section */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px', fontWeight: 600 }}>
                                Send Domain to Someone
                            </div>

                            {/* Domain Input */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px' }}>
                                    Domain to Transfer
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: colors.inputBg,
                                            borderRadius: '8px',
                                            border: `1px solid ${colors.containerBorder}`,
                                            padding: '0 12px'
                                        }}>
                                        <input
                                            type="text"
                                            value={transferDomainInput}
                                            onChange={(e) => {
                                                setTransferDomainInput(e.target.value);
                                                setTransferDomainInfo(null);
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && checkTransferDomain()}
                                            placeholder="yourdomain"
                                            style={{
                                                flex: 1,
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                color: colors.text,
                                                fontSize: '14px',
                                                padding: '10px 0'
                                            }}
                                        />
                                        <span style={{ color: colors.main, fontWeight: 600 }}>.btc</span>
                                    </div>
                                    <button
                                        onClick={checkTransferDomain}
                                        disabled={isCheckingTransferDomain || !transferDomainInput.trim()}
                                        style={{
                                            padding: '10px 14px',
                                            background: colors.main,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: isCheckingTransferDomain || !transferDomainInput.trim() ? 'not-allowed' : 'pointer',
                                            opacity: isCheckingTransferDomain || !transferDomainInput.trim() ? 0.5 : 1
                                        }}>
                                        {isCheckingTransferDomain ? (
                                            <LoadingOutlined style={{ color: '#000' }} />
                                        ) : (
                                            <SearchOutlined style={{ color: '#000' }} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Domain Verification Result */}
                            {transferDomainInfo && (
                                <div
                                    style={{
                                        background: colors.containerBgFaded,
                                        borderRadius: '10px',
                                        padding: '12px',
                                        marginBottom: '12px',
                                        border: `1px solid ${transferDomainInfo.isOwner ? colors.success : colors.error}30`
                                    }}>
                                    {!transferDomainInfo.exists ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CloseCircleOutlined style={{ fontSize: 16, color: colors.error }} />
                                            <span style={{ color: colors.error, fontWeight: 600, fontSize: '13px' }}>
                                                Domain not registered
                                            </span>
                                        </div>
                                    ) : !transferDomainInfo.isOwner ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CloseCircleOutlined style={{ fontSize: 16, color: colors.error }} />
                                            <span style={{ color: colors.error, fontWeight: 600, fontSize: '13px' }}>
                                                You don&apos;t own this domain
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CheckCircleOutlined style={{ fontSize: 16, color: colors.success }} />
                                            <span style={{ color: colors.success, fontWeight: 600, fontSize: '13px' }}>
                                                Domain verified - you can transfer it!
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recipient Address (only if domain verified) */}
                            {transferDomainInfo?.isOwner && (
                                <>
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px' }}>
                                            Recipient Address
                                        </div>
                                        <input
                                            type="text"
                                            value={recipientAddress}
                                            onChange={(e) => setRecipientAddress(e.target.value)}
                                            placeholder="bc1p... or tb1p..."
                                            style={{
                                                width: '100%',
                                                background: colors.inputBg,
                                                borderRadius: '8px',
                                                border: `1px solid ${colors.containerBorder}`,
                                                padding: '12px',
                                                color: colors.text,
                                                fontSize: '13px',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    {/* Fee Rate Selector */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <FeeRateBar onChange={(val) => setTransferFeeRate(val)} />
                                    </div>

                                    {/* Transfer Button */}
                                    <button
                                        onClick={handleInitiateTransfer}
                                        disabled={!recipientAddress.trim()}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            background: recipientAddress.trim() ? colors.main : colors.buttonBg,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: recipientAddress.trim() ? 'pointer' : 'not-allowed',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: recipientAddress.trim() ? '#000' : colors.textFaded,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}>
                                        <SendOutlined /> Initiate Transfer
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: colors.containerBorder, margin: '20px 0' }} />

                        {/* Accept Transfer Section */}
                        <div>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px', fontWeight: 600 }}>
                                Accept Incoming Transfer
                            </div>

                            {/* Domain Input for Accept */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px' }}>
                                    Domain to Accept
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: colors.inputBg,
                                            borderRadius: '8px',
                                            border: `1px solid ${colors.containerBorder}`,
                                            padding: '0 12px'
                                        }}>
                                        <input
                                            type="text"
                                            value={acceptDomainInput}
                                            onChange={(e) => {
                                                setAcceptDomainInput(e.target.value);
                                                setAcceptDomainPendingInfo(null);
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && checkPendingTransfer()}
                                            placeholder="domain-to-accept"
                                            style={{
                                                flex: 1,
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                color: colors.text,
                                                fontSize: '14px',
                                                padding: '10px 0'
                                            }}
                                        />
                                        <span style={{ color: colors.main, fontWeight: 600 }}>.btc</span>
                                    </div>
                                    <button
                                        onClick={checkPendingTransfer}
                                        disabled={isCheckingAcceptDomain || !acceptDomainInput.trim()}
                                        style={{
                                            padding: '10px 14px',
                                            background: colors.main,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: isCheckingAcceptDomain || !acceptDomainInput.trim() ? 'not-allowed' : 'pointer',
                                            opacity: isCheckingAcceptDomain || !acceptDomainInput.trim() ? 0.5 : 1
                                        }}>
                                        {isCheckingAcceptDomain ? (
                                            <LoadingOutlined style={{ color: '#000' }} />
                                        ) : (
                                            <SearchOutlined style={{ color: '#000' }} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Pending Transfer Info */}
                            {acceptDomainPendingInfo && (
                                <div
                                    style={{
                                        background: colors.containerBgFaded,
                                        borderRadius: '10px',
                                        padding: '12px',
                                        marginBottom: '12px',
                                        border: `1px solid ${acceptDomainPendingInfo.isOutgoing ? colors.warning : colors.success}30`
                                    }}>
                                    {acceptDomainPendingInfo.isOutgoing ? (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <WarningOutlined style={{ fontSize: 16, color: colors.warning }} />
                                                <span style={{ color: colors.warning, fontWeight: 600, fontSize: '13px' }}>
                                                    This transfer is not for you
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: colors.textFaded }}>
                                                Recipient: {acceptDomainPendingInfo.newOwner.slice(0, 12)}...{acceptDomainPendingInfo.newOwner.slice(-8)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <CheckCircleOutlined style={{ fontSize: 16, color: colors.success }} />
                                                <span style={{ color: colors.success, fontWeight: 600, fontSize: '13px' }}>
                                                    Transfer found for you!
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '12px' }}>
                                                {acceptDomainPendingInfo.domainName}.btc is being transferred to you
                                            </div>
                                            <button
                                                onClick={() => handleAcceptTransfer(acceptDomainPendingInfo.domainName)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: colors.success,
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: '#000',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}>
                                                <CheckCircleOutlined /> Accept Transfer
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Info Box */}
                        <div
                            style={{
                                background: `${colors.info}10`,
                                border: `1px solid ${colors.info}30`,
                                borderRadius: '10px',
                                padding: '12px',
                                fontSize: '11px',
                                color: colors.textFaded,
                                lineHeight: 1.5,
                                marginTop: '20px'
                            }}>
                            <SwapOutlined style={{ color: colors.info, marginRight: '8px' }} />
                            Domain transfers require two steps: the current owner initiates the transfer,
                            then the recipient must accept it. The owner can cancel before acceptance.
                        </div>
                    </div>
                )}

                {/* CLI Instructions Collapsible */}
                <div style={{ marginTop: '20px' }}>
                    <button
                        onClick={() => setShowCliInstructions(!showCliInstructions)}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: colors.containerBgFaded,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                        <CodeOutlined style={{ fontSize: 16, color: colors.textFaded }} />
                        <span style={{ flex: 1, textAlign: 'left', fontSize: '12px', fontWeight: 600, color: colors.text }}>
                            CLI Instructions
                        </span>
                        <DownOutlined
                            style={{
                                fontSize: 10,
                                color: colors.textFaded,
                                transform: showCliInstructions ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                            }}
                        />
                    </button>

                    {showCliInstructions && (
                        <div
                            style={{
                                marginTop: '8px',
                                padding: '16px',
                                background: colors.containerBgFaded,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '10px'
                            }}>
                            <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '12px' }}>
                                Requires <strong>Node.js 24+</strong> from{' '}
                                <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" style={{ color: colors.main }}>
                                    nodejs.org
                                </a>
                            </div>

                            {/* Step 1: Login */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', color: colors.text, fontWeight: 600, marginBottom: '6px' }}>
                                    1. Login to CLI
                                </div>
                                <div
                                    style={{
                                        background: colors.inputBg,
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                    <code style={{ fontSize: '10px', color: colors.success, fontFamily: 'monospace' }}>
                                        npx @btc-vision/cli login
                                    </code>
                                    <button
                                        onClick={async () => {
                                            await copyToClipboard('npx @btc-vision/cli login');
                                            tools.toastSuccess('Copied!');
                                        }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                        <CopyOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: Register */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', color: colors.text, fontWeight: 600, marginBottom: '6px' }}>
                                    2. Register Domain
                                </div>
                                <div
                                    style={{
                                        background: colors.inputBg,
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                    <code style={{ fontSize: '9px', color: colors.success, fontFamily: 'monospace' }}>
                                        npx @btc-vision/cli domain register YOUR_DOMAIN.btc{networkFlag}
                                    </code>
                                    <button
                                        onClick={async () => {
                                            await copyToClipboard(`npx @btc-vision/cli domain register YOUR_DOMAIN.btc${networkFlag}`);
                                            tools.toastSuccess('Copied!');
                                        }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                        <CopyOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                    </button>
                                </div>
                            </div>

                            {/* Step 3: Deploy */}
                            <div>
                                <div style={{ fontSize: '11px', color: colors.text, fontWeight: 600, marginBottom: '6px' }}>
                                    3. Publish Website <span style={{ fontWeight: 400, color: colors.textFaded }}>(optional)</span>
                                </div>
                                <div
                                    style={{
                                        background: colors.inputBg,
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                    <code style={{ fontSize: '9px', color: colors.success, fontFamily: 'monospace' }}>
                                        npx @btc-vision/cli deploy YOUR_DOMAIN.btc .{networkFlag}
                                    </code>
                                    <button
                                        onClick={async () => {
                                            await copyToClipboard(`npx @btc-vision/cli deploy YOUR_DOMAIN.btc .${networkFlag}`);
                                            tools.toastSuccess('Copied!');
                                        }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                        <CopyOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                                    </button>
                                </div>
                                <div style={{ fontSize: '9px', color: colors.textFaded, marginTop: '6px' }}>
                                    Use <code style={{ color: colors.main }}>.</code> for full directory or <code style={{ color: colors.main }}>index.html</code> for single file
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
