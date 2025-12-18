import React, { useCallback, useMemo, useState } from 'react';

import { NETWORK_TYPES } from '@/shared/constant';
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
    DownOutlined,
    GlobalOutlined,
    LoadingOutlined,
    SearchOutlined,
    UploadOutlined
} from '@ant-design/icons';
import { RouteTypes, useNavigate } from '../MainRoute';

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

type Tab = 'register' | 'publish';

interface DomainInfo {
    exists: boolean;
    owner: string | null;
    isOwner: boolean;
    price: bigint;
    treasuryAddress: string;
}

export default function BtcDomainScreen() {
    const navigate = useNavigate();
    const tools = useTools();
    const wallet = useWallet();
    const chain = useChain();
    const userAddress = useAccountAddress();

    const [activeTab, setActiveTab] = useState<Tab>('register');

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

    // Get network flag for CLI commands (empty for mainnet, -n <network> for others)
    const networkFlag = useMemo(() => {
        if (chain.networkType === NetworkType.MAINNET) return '';
        return ` -n ${NETWORK_TYPES[chain.networkType].name}`;
    }, [chain.networkType]);

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

    // Register domain
    const handleRegister = useCallback(async () => {
        if (!domainInfo || domainInfo.exists) return;

        const normalized = normalizeDomain(domainInput);

        try {
            await wallet.registerBtcDomain(normalized, feeRate);
            tools.toastSuccess('Registration transaction submitted!');
            // Reset state
            setDomainInput('');
            setDomainInfo(null);
        } catch (err) {
            console.error('Failed to register domain:', err);
            tools.toastError('Failed to register domain');
        }
    }, [domainInput, domainInfo, feeRate, wallet, tools]);

    // Publish website
    const handlePublish = useCallback(async () => {
        if (!publishDomainInfo?.isOwner || !uploadedCid) return;

        const normalized = normalizeDomain(publishDomain);

        try {
            await wallet.publishBtcDomainWebsite(normalized, uploadedCid, publishFeeRate);
            tools.toastSuccess('Website publish transaction submitted!');
            // Reset state
            setSelectedFile(null);
            setUploadedCid(null);
        } catch (err) {
            console.error('Failed to publish website:', err);
            tools.toastError('Failed to publish website');
        }
    }, [publishDomain, publishDomainInfo, uploadedCid, publishFeeRate, wallet, tools]);

    // Format satoshis to BTC
    const formatBtc = (sats: bigint): string => {
        const btc = Number(sats) / 100_000_000;
        return btc.toFixed(8).replace(/\.?0+$/, '');
    };

    return (
        <Layout>
            <Header title=".btc Domains" onBack={() => navigate(RouteTypes.MainScreen)} />

            <Content style={{ padding: '16px' }}>
                {/* Tabs */}
                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '20px',
                        background: colors.containerBgFaded,
                        borderRadius: '10px',
                        padding: '4px'
                    }}>
                    <button
                        onClick={() => setActiveTab('register')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: activeTab === 'register' ? colors.main : 'transparent',
                            color: activeTab === 'register' ? '#000' : colors.textFaded,
                            transition: 'all 0.2s'
                        }}>
                        Register Domain
                    </button>
                    <button
                        onClick={() => setActiveTab('publish')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: activeTab === 'publish' ? colors.main : 'transparent',
                            color: activeTab === 'publish' ? '#000' : colors.textFaded,
                            transition: 'all 0.2s'
                        }}>
                        Publish Website
                    </button>
                </div>

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
                                        onChange={(e) => setDomainInput(e.target.value)}
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

                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px' }}>
                                                Network Fee
                                            </div>
                                            <FeeRateBar onChange={setFeeRate} />
                                        </div>

                                        <button
                                            onClick={handleRegister}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                background: colors.main,
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: '#000'
                                            }}>
                                            Register {normalizeDomain(domainInput)}.btc
                                        </button>
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
                            Domain names are registered on the OPNet network. Once registered, you can publish
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
                                            You don't own this domain
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

                                {/* Publish Button */}
                                {uploadedCid && (
                                    <>
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px' }}>
                                                Network Fee
                                            </div>
                                            <FeeRateBar onChange={setPublishFeeRate} />
                                        </div>

                                        <button
                                            onClick={handlePublish}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                background: colors.main,
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: '#000'
                                            }}>
                                            Publish to {normalizeDomain(publishDomain)}.btc
                                        </button>
                                    </>
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
