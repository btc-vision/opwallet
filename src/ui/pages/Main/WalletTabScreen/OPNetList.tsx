import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import browser from 'webextension-polyfill';

import Web3API from '@/shared/web3/Web3API';
import { getContract, IOP20Contract, OP_20_ABI } from 'opnet';

import { OPTokenInfo } from '@/shared/types';
import { Address, AddressTypes, AddressVerificator } from '@btc-vision/transaction';

import { Column, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import OpNetBalanceCard from '@/ui/components/OpNetBalanceCard';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChainType } from '@/ui/state/settings/hooks';

import { faEye, faEyeSlash, faPencil, faPlus, faRefresh, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { RouteTypes, useNavigate } from '../../MainRoute';

BigNumber.config({ EXPONENTIAL_AT: 256 });

const TOKENS_PER_PAGE = 3;

interface StoredToken {
    address: string;
    hidden: boolean;
}

interface TokenWithBalance extends OPTokenInfo {
    loadError?: boolean;
    isLoading?: boolean;
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

    headerBG: '#313131',
    headerBorder: '#444746'
};

const tokenButtonStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    flex: '1',
    justifyContent: 'center',
    gap: '8px',
    height: '32px',
    padding: '0 12px',
    border: '1px solid #444746',
    background: '#313131',
    transition: 'background-color 0.3s, border 0.3s',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'Inter-Regular, serif'
};

const tokenRefreshButtonStyle: React.CSSProperties = {
    ...tokenButtonStyle,
    width: '32px',
    padding: '0',
    flex: '0 0 32px'
};

export function OPNetList() {
    const navigate = useNavigate();
    const currentAccount = useCurrentAccount();
    const chainType = useChainType();
    const tools = useTools();

    // Core state
    const [allTokenAddresses, setAllTokenAddresses] = useState<string[]>([]);
    const [tokenBalancesMap, setTokenBalancesMap] = useState<Map<string, TokenWithBalance>>(new Map());
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // UI state
    //const [importTokenBool, setImportTokenBool] = useState(false);
    const [hasHiddenTokens, setHasHiddenTokens] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalToken, setModalToken] = useState<string | null>(null);

    const storageKey = `opnetTokens_${chainType}_${currentAccount.pubkey}`;
    const initializationKey = `opnetTokens_initialized_${chainType}_${currentAccount.pubkey}`;

    // Ensure default tokens are included only on first launch
    const ensureDefaultTokens = useCallback(
        (addresses: string[]): string[] => {
            const result = [...addresses];

            // Only add defaults if this account/chain combo has never been initialized
            const isInitialized = localStorage.getItem(initializationKey);

            if (!isInitialized) {
                const moto = Web3API.motoAddressP2OP;
                const pill = Web3API.pillAddressP2OP;

                // Add MOTO and PILL if they exist and aren't already in the list
                if (moto && !result.includes(moto)) {
                    console.log('Adding MOTO token on first launch:', moto);
                    result.unshift(moto); // Add to beginning
                }
                if (pill && !result.includes(pill)) {
                    console.log('Adding PILL token on first launch:', pill);
                    result.unshift(pill); // Add to beginning
                }

                // Save to storage if we added any
                if ((moto && !addresses.includes(moto)) || (pill && !addresses.includes(pill))) {
                    try {
                        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];
                        const updatedStored = [...stored];

                        if (moto && !stored.some((t) => (typeof t === 'string' ? t : t.address) === moto)) {
                            updatedStored.push(moto);
                        }
                        if (pill && !stored.some((t) => (typeof t === 'string' ? t : t.address) === pill)) {
                            updatedStored.push(pill);
                        }

                        localStorage.setItem(storageKey, JSON.stringify(updatedStored));
                    } catch (e) {
                        console.error('Failed to save default tokens:', e);
                    }
                }

                // Mark as initialized - never add defaults again for this account/chain
                localStorage.setItem(initializationKey, 'true');
            }

            return result;
        },
        [storageKey, initializationKey]
    );

    // Get all token addresses from storage
    const loadTokenAddresses = useCallback((): string[] => {
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];
            const dead = Address.dead().p2op(Web3API.network);

            // Check for hidden tokens
            const hasHidden = stored.some((t) => typeof t === 'object' && t.hidden);
            setHasHiddenTokens(hasHidden);

            // Get visible tokens only
            let addresses = stored
                .filter((t) => {
                    const addr = typeof t === 'string' ? t : t.address;
                    return addr !== dead;
                })
                .filter((t) => typeof t === 'string' || !t.hidden)
                .map((t) => (typeof t === 'string' ? t : t.address));

            // Remove duplicates
            addresses = Array.from(new Set(addresses));

            // Remove non P2OP addresses
            addresses = addresses.filter(
                (addr) => AddressVerificator.detectAddressType(addr, Web3API.network) === AddressTypes.P2OP
            );

            // Reverse to show newest first
            //addresses.reverse();

            // Ensure default tokens are included
            addresses = ensureDefaultTokens(addresses);

            return addresses;
        } catch (error) {
            console.error('Failed to load tokens:', error);
            // Return at least the default tokens
            return ensureDefaultTokens([]);
        }
    }, [storageKey, ensureDefaultTokens]);

    // Fetch balance for a single token
    const fetchTokenBalance = async (address: string): Promise<TokenWithBalance | null> => {
        try {
            // Set loading state for this token
            setTokenBalancesMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(address, {
                    address,
                    name: 'Loading...',
                    amount: 0n,
                    divisibility: 8,
                    symbol: '...',
                    isLoading: true
                });
                return newMap;
            });

            await Web3API.setNetwork(chainType);

            const ci = await Web3API.queryContractInformation(address);
            if (!ci || ci.name === 'Generic Contract') {
                console.warn(`No contract info found for ${address}, skipping...`);
                return {
                    address,
                    name: 'Unknown',
                    amount: 0n,
                    divisibility: 8,
                    symbol: '???',
                    isLoading: false
                };
            }

            const contract = getContract<IOP20Contract>(address, OP_20_ABI, Web3API.provider, Web3API.network);

            const balance = await contract.balanceOf(Address.fromString(currentAccount.pubkey));

            return {
                address,
                name: ci.name || 'Unknown',
                amount: balance.properties.balance,
                divisibility: 'divisibility' in ci ? (ci.divisibility as number) : (ci.decimals ?? 8),
                symbol: ci.symbol || '???',
                logo: ci.logo,
                isLoading: false
            };
        } catch (error) {
            console.error(`Failed to fetch token ${address}:`, error);
            return {
                address,
                name: 'Failed to load',
                amount: 0n,
                divisibility: 8,
                symbol: '???',
                loadError: true,
                isLoading: false
            };
        }
    };

    // Load balances for tokens on current page
    const loadPageBalances = async (addresses: string[], page: number) => {
        setIsLoading(true);

        try {
            const start = (page - 1) * TOKENS_PER_PAGE;
            const end = start + TOKENS_PER_PAGE;
            const pageAddresses = addresses.slice(start, end);

            // Fetch balances for this page
            const balances = await Promise.all(pageAddresses.map((addr) => fetchTokenBalance(addr)));

            // Update the map with new balances
            setTokenBalancesMap((prev) => {
                const newMap = new Map(prev);
                balances.forEach((balance) => {
                    if (balance) {
                        newMap.set(balance.address, balance);
                    }
                });
                return newMap;
            });
        } catch (error) {
            console.error('Failed to load page balances:', error);
            tools.toastError('Failed to load token balances');
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize tokens and load first page
    const initialize = async () => {
        setIsInitializing(true);

        try {
            await Web3API.setNetwork(chainType);
            const addresses = loadTokenAddresses();
            console.log('Loaded addresses:', addresses.length, addresses);
            setAllTokenAddresses(addresses);

            if (addresses.length > 0) {
                await loadPageBalances(addresses, 1);
            }
        } catch (error) {
            console.error('Initialization error:', error);
        } finally {
            setIsInitializing(false);
        }
    };

    // Handle page change
    const goToPage = async (page: number) => {
        const totalPages = Math.ceil(allTokenAddresses.length / TOKENS_PER_PAGE);
        const safePage = Math.min(Math.max(1, page), totalPages || 1);

        setCurrentPage(safePage);
        await loadPageBalances(allTokenAddresses, safePage);
    };

    // Refresh current page
    const refreshCurrentPage = async () => {
        // Clear cache for current page tokens
        const start = (currentPage - 1) * TOKENS_PER_PAGE;
        const end = start + TOKENS_PER_PAGE;
        const pageAddresses = allTokenAddresses.slice(start, end);

        pageAddresses.forEach((addr) => {
            tokenBalancesMap.delete(addr);
        });

        await loadPageBalances(allTokenAddresses, currentPage);
    };

    // Handle token removal/hiding
    const handleModalAction = (action: 'remove' | 'hide') => {
        if (!modalToken) return;

        try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];
            let updated: (StoredToken | string)[];

            if (action === 'remove') {
                updated = stored.filter((t) => {
                    const addr = typeof t === 'string' ? t : t.address;
                    return addr !== modalToken;
                });
            } else {
                updated = stored.map((t) => {
                    const addr = typeof t === 'string' ? t : t.address;
                    if (addr === modalToken) {
                        return { address: modalToken, hidden: true };
                    }
                    return t;
                });
            }

            localStorage.setItem(storageKey, JSON.stringify(updated));
            tools.toastSuccess(`Token ${action === 'remove' ? 'removed' : 'hidden'} successfully`);

            // Reload everything
            const newAddresses = loadTokenAddresses();
            setAllTokenAddresses(newAddresses);

            // Remove from map if removed
            if (action === 'remove') {
                setTokenBalancesMap((prev) => {
                    const newMap = new Map(prev);
                    newMap.delete(modalToken);
                    return newMap;
                });
            }

            // Calculate new page
            const totalPages = Math.ceil(newAddresses.length / TOKENS_PER_PAGE);
            const newPage = Math.min(currentPage, totalPages || 1);

            setCurrentPage(newPage);
            loadPageBalances(newAddresses, newPage);
        } catch (error) {
            console.error(`Failed to ${action} token:`, error);
            tools.toastError(`Failed to ${action} token`);
        } finally {
            setShowModal(false);
            setModalToken(null);
        }
    };

    // Show hidden tokens
    const showHiddenTokens = () => {
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];
            const updated = stored.map((t) => {
                if (typeof t === 'object' && t.hidden) {
                    return { ...t, hidden: false };
                }
                return t;
            });

            localStorage.setItem(storageKey, JSON.stringify(updated));
            tools.toastSuccess('Hidden tokens are now visible');

            // Reload everything
            const newAddresses = loadTokenAddresses();
            setAllTokenAddresses(newAddresses);
            setCurrentPage(1);
            loadPageBalances(newAddresses, 1);
        } catch (error) {
            console.error('Failed to show hidden tokens:', error);
            tools.toastError('Failed to show hidden tokens');
        }
    };

    // When account or chain changes, reset everything
    useEffect(() => {
        setCurrentPage(1);
        setTokenBalancesMap(new Map());
        initialize();
    }, [currentAccount.pubkey, chainType]);

    // Calculate current page tokens
    const start = (currentPage - 1) * TOKENS_PER_PAGE;
    const end = start + TOKENS_PER_PAGE;
    const currentPageAddresses = allTokenAddresses.slice(start, end);
    const currentPageBalances = currentPageAddresses
        .map((addr) => tokenBalancesMap.get(addr))
        .filter((balance): balance is TokenWithBalance => !!balance && !balance.loadError);

    const totalPages = Math.ceil(allTokenAddresses.length / TOKENS_PER_PAGE);

    // Loading state
    if (isInitializing) {
        return (
            <Column style={{ minHeight: 150 }} itemsCenter justifyCenter>
                <LoadingOutlined style={{ fontSize: 24, color: colors.main }} />
                <Text text="Loading tokens..." color="textDim" size="sm" style={{ marginTop: 8 }} />
            </Column>
        );
    }

    return (
        <div>
            {/* Action Buttons */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    width: 'calc(100% + 24px)',
                    borderBottom: `1px solid ${colors.headerBorder}`,
                    borderTop: `1px solid ${colors.headerBorder}`,
                    padding: `12px`,
                    margin: '0 -12px 12px -12px',
                    background: colors.headerBG
                }}>
                <button
                    style={tokenButtonStyle}
                    //onClick={() => setImportTokenBool(true)}
                    onClick={() => navigate(RouteTypes.ImportSelectionScreen)}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#212121')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#313131')}>
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 12 }} />
                    <span>Import</span>
                </button>

                <button
                    style={tokenButtonStyle}
                    onClick={async () => {
                        await browser.tabs.create({
                            url: browser.runtime.getURL('/index.html#/opnet/deploy-contract')
                        });
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#212121')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#313131')}>
                    <FontAwesomeIcon icon={faPencil} style={{ fontSize: 12 }} />
                    <span>Deploy</span>
                </button>

                <button
                    style={tokenRefreshButtonStyle}
                    onClick={refreshCurrentPage}
                    disabled={isLoading}
                    onMouseOver={(e) => {
                        if (!isLoading) e.currentTarget.style.background = '#212121';
                    }}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#313131')}>
                    <FontAwesomeIcon
                        icon={faRefresh}
                        spin={isLoading}
                        style={{
                            fontSize: 14,
                            color: isLoading ? colors.main : 'white'
                        }}
                    />
                </button>
            </div>

            {/* Token List */}
            {allTokenAddresses.length > 0 ? (
                <div>
                    {currentPageBalances.length === 0 && currentPageAddresses.length > 0 ? (
                        <Column style={{ padding: 30 }} itemsCenter justifyCenter>
                            <LoadingOutlined style={{ fontSize: 20, color: colors.main }} />
                            <Text text="Loading balances..." color="textDim" size="sm" style={{ marginTop: 8 }} />
                        </Column>
                    ) : (
                        <>
                            {currentPageBalances.map((data, index) => (
                                <div
                                    key={data.address}
                                    style={{ marginBottom: index < currentPageBalances.length - 1 ? '6px' : 0 }}>
                                    <OpNetBalanceCard
                                        tokenInfo={data}
                                        onClick={() => {
                                            navigate(RouteTypes.OpNetTokenScreen, {
                                                address: data.address
                                            });
                                        }}
                                        handleRemoveToken={(address) => {
                                            setModalToken(address);
                                            setShowModal(true);
                                        }}
                                    />
                                </div>
                            ))}
                        </>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginTop: '12px',
                                padding: '8px 4px'
                            }}>
                            <button
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: currentPage === 1 ? colors.textFaded : colors.text,
                                    background: 'transparent',
                                    border: `1px solid ${currentPage === 1 ? colors.containerBorder : colors.main}`,
                                    borderRadius: '8px',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: currentPage === 1 ? 0.5 : 1
                                }}
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1 || isLoading}>
                                Previous
                            </button>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    const isActive = page === currentPage;
                                    const showPage =
                                        page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;

                                    if (!showPage) {
                                        if (page === currentPage - 2 || page === currentPage + 2) {
                                            return (
                                                <span key={page} style={{ color: colors.textFaded, fontSize: '12px' }}>
                                                    •
                                                </span>
                                            );
                                        }
                                        return null;
                                    }

                                    return (
                                        <button
                                            key={page}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                fontSize: '12px',
                                                fontWeight: isActive ? 700 : 500,
                                                color: isActive ? colors.background : colors.text,
                                                background: isActive ? colors.main : 'transparent',
                                                border: `1px solid ${isActive ? colors.main : colors.containerBorder}`,
                                                borderRadius: '6px',
                                                cursor: isActive ? 'default' : 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onClick={() => !isActive && goToPage(page)}
                                            disabled={isActive || isLoading}>
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: currentPage === totalPages ? colors.textFaded : colors.text,
                                    background: 'transparent',
                                    border: `1px solid ${currentPage === totalPages ? colors.containerBorder : colors.main}`,
                                    borderRadius: '8px',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: currentPage === totalPages ? 0.5 : 1
                                }}
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages || isLoading}>
                                Next
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        padding: '40px 20px',
                        textAlign: 'center',
                        marginBottom: '12px'
                    }}>
                    <Text text="No tokens found" color="text" size="md" style={{ marginBottom: 8 }} />
                    <Text text="Import or deploy a token to get started" color="textDim" size="sm" />
                </div>
            )}

            {/* Hidden Tokens Button */}
            {hasHiddenTokens && (
                <button
                    style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: colors.main,
                        background: 'transparent',
                        border: `1px solid ${colors.main}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                    onClick={showHiddenTokens}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = `${colors.main}15`;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}>
                    <FontAwesomeIcon icon={faEye} />
                    Show Hidden Tokens
                </button>
            )}

            {/* Import Token Modal */}
            {/*importTokenBool && (
                <AddOpNetToken
                    currentPage={currentPage}
                    setImportTokenBool={setImportTokenBool}
                    fetchData={async () => {
                        const newAddresses = loadTokenAddresses();
                        setAllTokenAddresses(newAddresses);
                        await loadPageBalances(newAddresses, currentPage);
                    }}
                    onClose={() => setImportTokenBool(false)}
                />
            )*/}

            {/* Remove/Hide Modal */}
            <>
                {/* Add styles to override Ant Design */}
                <style>{`
            .custom-token-modal .ant-modal-content {
                background: ${colors.containerBg} !important;
                border: 1px solid ${colors.containerBorder} !important;
                border-radius: 14px !important;
            }
            
            .custom-token-modal .ant-modal-header {
                background: ${colors.containerBg} !important;
                border-bottom: 1px solid ${colors.containerBorder} !important;
                border-radius: 14px 14px 0 0 !important;
            }
            
            .custom-token-modal .ant-modal-title {
                color: ${colors.text} !important;
                font-weight: 600 !important;
                font-size: 18px !important;
            }
            
            .custom-token-modal .ant-modal-body {
                background: ${colors.containerBg} !important;
                color: ${colors.text} !important;
                padding: 8px !important;
            }
            
            .custom-token-modal .ant-modal-close {
                color: ${colors.textFaded} !important;
            }
            
            .custom-token-modal .ant-modal-close:hover {
                color: ${colors.text} !important;
                background: ${colors.buttonHoverBg} !important;
            }
            
            .custom-token-modal .ant-modal-mask {
                background: rgba(0, 0, 0, 0.6) !important;
                backdrop-filter: blur(4px) !important;
            }
        `}</style>

                {/* Updated Modal with className */}
                <Modal
                    open={showModal}
                    onCancel={() => {
                        setShowModal(false);
                        setModalToken(null);
                    }}
                    footer={null}
                    closeIcon={<CloseOutlined style={{ fontSize: '16px' }} />}
                    centered
                    className="custom-token-modal"
                    title="Token Options">
                    <div style={{ padding: '8px 0' }}>
                        <Text
                            text="What would you like to do with this token?"
                            color="textDim"
                            size="sm"
                            style={{ marginBottom: 24 }}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px',
                                    background: colors.buttonHoverBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => handleModalAction('hide')}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = colors.buttonBg;
                                    e.currentTarget.style.borderColor = colors.main;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                    e.currentTarget.style.borderColor = colors.containerBorder;
                                }}>
                                <FontAwesomeIcon icon={faEyeSlash} style={{ color: colors.main, fontSize: 16 }} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ color: colors.text, fontSize: '14px', fontWeight: 600 }}>
                                        Hide Token
                                    </div>
                                    <div style={{ color: colors.textFaded, fontSize: '11px', marginTop: '2px' }}>
                                        Temporarily hide from list (can be shown later)
                                    </div>
                                </div>
                            </button>

                            <button
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px',
                                    background: colors.buttonHoverBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => handleModalAction('remove')}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = `${colors.error}15`;
                                    e.currentTarget.style.borderColor = colors.error;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                    e.currentTarget.style.borderColor = colors.containerBorder;
                                }}>
                                <FontAwesomeIcon icon={faTrash} style={{ color: colors.error, fontSize: 16 }} />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ color: colors.text, fontSize: '14px', fontWeight: 600 }}>
                                        Remove Token
                                    </div>
                                    <div style={{ color: colors.textFaded, fontSize: '11px', marginTop: '2px' }}>
                                        Permanently delete (must re-import to add back)
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </Modal>
            </>
        </div>
    );
}
