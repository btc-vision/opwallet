import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import BigNumber from 'bignumber.js';
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import browser from 'webextension-polyfill';

import Web3API from '@/shared/web3/Web3API';
import { getContract, IOP_20Contract, OP_20_ABI } from 'opnet';

import { OPTokenInfo } from '@/shared/types';
import { Address } from '@btc-vision/transaction';

import { Button, Column, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { BaseView } from '@/ui/components/BaseView';
import OpNetBalanceCard from '@/ui/components/OpNetBalanceCard';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChainType } from '@/ui/state/settings/hooks';

import { faPencil, faRefresh, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { RouteTypes, useNavigate } from '../../MainRoute';
import { AddOpNetToken } from '../../Wallet/AddOpNetToken';

BigNumber.config({ EXPONENTIAL_AT: 256 });

const TOKENS_PER_PAGE = 3;
const balanceCache = new Map<string, OPTokenInfo>();

interface StoredToken {
    address: string;
    hidden: boolean;
}

// Session-only failure tracking to avoid permanent false positives
const sessionFailureTracker = new Map<string, number>();

export function OPNetList() {
    const navigate = useNavigate();
    const currentAccount = useCurrentAccount();
    const chainType = useChainType();
    const tools = useTools();

    const [tokens, setTokens] = useState<string[] | null>(null);
    const [tokenBalances, setTokenBalances] = useState<OPTokenInfo[]>([]);
    const [total, setTotal] = useState(-1);
    const [currentPage, setCurrentPage] = useState(1);
    const [importTokenBool, setImportTokenBool] = useState(false);
    const [isTokenHidden, setIsTokenHidden] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalToken, setModalToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Track if default tokens have been checked this session
    const defaultTokensCheckedRef = useRef(false);
    const fetchVersionRef = useRef(0);

    const fetchTokensBalances = useCallback(
        async (page: number) => {
            setIsLoading(true);
            const myVersion = ++fetchVersionRef.current;

            try {
                Web3API.setNetwork(chainType);

                // Get stored tokens
                const key = `opnetTokens_${chainType}_${currentAccount.pubkey}`;
                const raw = localStorage.getItem(key) ?? '[]';
                const parsed = JSON.parse(raw) as (StoredToken | string)[];
                const dead = Address.dead().p2op(Web3API.network);

                let fullList = parsed
                    .filter((t) => (typeof t === 'string' ? t !== dead : t.address !== dead))
                    .filter((t) => typeof t === 'string' || !t.hidden)
                    .map((t) => (typeof t === 'string' ? t : t.address))
                    .reverse();

                fullList = Array.from(new Set(fullList));

                // Only add default tokens once per session and only if they haven't failed multiple times
                if (!defaultTokensCheckedRef.current) {
                    defaultTokensCheckedRef.current = true;

                    const moto = Web3API.motoAddressP2OP;
                    const pill = Web3API.pillAddressP2OP;

                    // Check session failure count before adding
                    const motoFailures = sessionFailureTracker.get(moto || '') || 0;
                    const pillFailures = sessionFailureTracker.get(pill || '') || 0;

                    if (moto && !fullList.includes(moto) && motoFailures < 3) {
                        fullList.unshift(moto);
                    }
                    if (pill && !fullList.includes(pill) && pillFailures < 3) {
                        fullList.unshift(pill);
                    }
                }

                setTokens(fullList);
                setTotal(fullList.length);
                setCurrentPage(page);

                const start = (page - 1) * TOKENS_PER_PAGE;
                const pageList = fullList.slice(start, start + TOKENS_PER_PAGE);

                const infos = await Promise.all(
                    pageList.map(async (addr) => {
                        try {
                            // Check cache first
                            const cached = balanceCache.get(addr);
                            if (cached) {
                                return cached;
                            }

                            const ci = await Web3API.queryContractInformation(addr);
                            if (!ci || ci.name === 'Generic Contract') {
                                // Increment session failure count
                                const currentFailures = sessionFailureTracker.get(addr) || 0;
                                sessionFailureTracker.set(addr, currentFailures + 1);
                                return null;
                            }

                            const c = getContract<IOP_20Contract>(addr, OP_20_ABI, Web3API.provider, Web3API.network);
                            const bal = await c.balanceOf(Address.fromString(currentAccount.pubkey));

                            const ti: OPTokenInfo = {
                                address: addr,
                                name: ci.name || '',
                                amount: bal.properties.balance,
                                divisibility: 'divisibility' in ci ? (ci.divisibility as number) : (ci.decimals ?? 8),
                                symbol: ci.symbol,
                                logo: ci.logo
                            };

                            // Cache successful result and reset failure count
                            balanceCache.set(addr, ti);
                            sessionFailureTracker.delete(addr);

                            return ti;
                        } catch (error) {
                            console.error(`Failed to load token ${addr}:`, error);

                            // Increment session failure count
                            const currentFailures = sessionFailureTracker.get(addr) || 0;
                            sessionFailureTracker.set(addr, currentFailures + 1);

                            return null;
                        }
                    })
                );

                if (myVersion !== fetchVersionRef.current) return;

                const validInfos = infos.filter((x): x is OPTokenInfo => !!x);
                setTokenBalances(validInfos);

                // Auto-remove tokens that have failed too many times this session
                const failedTokens = pageList.filter((addr) => {
                    const failures = sessionFailureTracker.get(addr) || 0;
                    return failures >= 3;
                });

                if (failedTokens.length > 0) {
                    // Remove failed tokens from storage
                    const updatedStored = parsed.filter((t) => {
                        const address = typeof t === 'string' ? t : t.address;
                        return !failedTokens.includes(address);
                    });

                    localStorage.setItem(key, JSON.stringify(updatedStored));

                    // Clear them from cache
                    failedTokens.forEach((addr) => {
                        balanceCache.delete(addr);
                    });

                    tools.toastError(
                        `${failedTokens.length} token(s) failed to load and were removed. You can re-add them later if needed.`
                    );

                    // Refresh the list if we removed tokens
                    if (myVersion === fetchVersionRef.current) {
                        setTimeout(() => fetchTokensBalances(1), 100);
                    }
                }
            } catch (e) {
                tools.toastError(`Error loading tokens: ${(e as Error).message}`);
            } finally {
                setIsLoading(false);
            }
        },
        [chainType, currentAccount.pubkey, tools]
    );

    // Reset default tokens check when chain or account changes
    useEffect(() => {
        defaultTokensCheckedRef.current = false;
        sessionFailureTracker.clear();
        fetchTokensBalances(1).catch(console.error);
    }, [fetchTokensBalances, chainType, currentAccount.pubkey]);

    useEffect(() => {
        function checkHiddenTokens() {
            const storageKey = `opnetTokens_${chainType}_${currentAccount.pubkey}`;
            const storedTokens = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];
            const hasHidden = storedTokens.some((t) => typeof t === 'object' && t.hidden);
            setIsTokenHidden(hasHidden);
        }

        checkHiddenTokens();
    }, [currentAccount.pubkey, chainType, tokens]);

    const handleRemoveToken = (address: string) => {
        setModalToken(address);
        setShowModal(true);
    };

    const handleModalAction = (action: 'remove' | 'hide') => {
        if (!modalToken) return;

        try {
            const storageKey = `opnetTokens_${chainType}_${currentAccount.pubkey}`;
            const storedTokens = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];

            let updatedTokens: (StoredToken | string)[];
            if (action === 'remove') {
                updatedTokens = storedTokens.filter((t) =>
                    typeof t === 'object' ? t.address !== modalToken : t !== modalToken
                );
                balanceCache.delete(modalToken);
                sessionFailureTracker.delete(modalToken);
            } else {
                updatedTokens = storedTokens.map((t) => {
                    if (
                        (typeof t === 'object' && t.address === modalToken) ||
                        (typeof t === 'string' && t === modalToken)
                    ) {
                        return { address: modalToken, hidden: true };
                    }
                    return t;
                });
            }

            localStorage.setItem(storageKey, JSON.stringify(updatedTokens));
            tools.toastSuccess(`Token ${action === 'remove' ? 'removed' : 'hidden'} successfully!`);
        } catch (err) {
            tools.toastError(`Failed to ${action} the token.`);
        } finally {
            setShowModal(false);
            setModalToken(null);
            fetchTokensBalances(1).catch(console.error);
        }
    };

    const showHiddenTokens = () => {
        try {
            const storageKey = `opnetTokens_${chainType}_${currentAccount.pubkey}`;
            const storedTokens = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];
            const hasHidden = storedTokens.some((t) => typeof t === 'object' && t.hidden);
            if (!hasHidden) {
                tools.toastSuccess('No hidden tokens');
                return;
            }
            const unhidden = storedTokens.map((t) => (typeof t === 'object' && t.hidden ? { ...t, hidden: false } : t));
            localStorage.setItem(storageKey, JSON.stringify(unhidden));
            tools.toastSuccess('Hidden tokens are now visible!');
            fetchTokensBalances(1).catch(console.error);
        } catch (err) {
            tools.toastError('Failed to show hidden tokens');
        }
    };

    const totalPages = Math.ceil(total / TOKENS_PER_PAGE);
    const handlePageChange = (direction: 'next' | 'prev') => {
        setCurrentPage((prev) => {
            const next = direction === 'next' ? prev + 1 : prev - 1;
            fetchTokensBalances(next).catch(console.error);
            return next;
        });
    };

    if (total === -1) {
        return (
            <Column style={{ minHeight: 150 }} itemsCenter justifyCenter>
                <LoadingOutlined />
            </Column>
        );
    }

    const $footerBaseStyle: CSSProperties = {
        display: 'block',
        minHeight: 20,
        paddingBottom: 10,
        fontSize: 12,
        cursor: 'pointer'
    };

    const $opnet: CSSProperties = {
        display: 'block',
        marginBottom: 10
    };

    return (
        <div>
            <BaseView style={$footerBaseStyle}>
                <div className="op_tokens_action_buttons_container">
                    <div className="op_tokens_action_buttons">
                        <button className="op_tokens_action_button" onClick={() => setImportTokenBool(true)}>
                            <div className="op_token_action_icon">
                                <FontAwesomeIcon icon={faUpload} />
                            </div>
                            <span>Import Token</span>
                        </button>
                        <button
                            className="op_tokens_action_button"
                            onClick={async () => {
                                await browser.tabs.create({
                                    url: browser.runtime.getURL('/index.html#/opnet/deploy-contract')
                                });
                            }}>
                            <div className="op_tokens_action_icon">
                                <FontAwesomeIcon icon={faPencil} />
                            </div>
                            <span>Deploy</span>
                        </button>
                    </div>
                    <div className="op_tokens_action_buttons">
                        <button
                            className="op_tokens_action_button icon"
                            onClick={() => fetchTokensBalances(currentPage)}
                            disabled={isLoading}>
                            <div className="op_tokens_action_icon">
                                <FontAwesomeIcon icon={faRefresh} spin={isLoading} />
                            </div>
                        </button>
                    </div>
                </div>
            </BaseView>

            {total > 0 && (
                <BaseView style={$opnet}>
                    {tokenBalances.map((data) => (
                        <OpNetBalanceCard
                            key={data.address}
                            tokenInfo={data}
                            onClick={() => {
                                navigate(RouteTypes.OpNetTokenScreen, {
                                    address: data.address
                                });
                            }}
                            handleRemoveToken={handleRemoveToken}
                        />
                    ))}

                    {totalPages > 1 && (
                        <div className="op_pagination_controls">
                            <button
                                className="op_pagination_next"
                                onClick={() => handlePageChange('prev')}
                                disabled={currentPage === 1}>
                                Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, idx) => {
                                const pageNumber = idx + 1;
                                const shouldShow =
                                    pageNumber === 1 ||
                                    pageNumber === totalPages ||
                                    (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2);
                                if (shouldShow) {
                                    return (
                                        <button
                                            onClick={() => {
                                                fetchTokensBalances(pageNumber).catch(console.error);
                                                setCurrentPage(pageNumber);
                                            }}
                                            className="op_pagination_button"
                                            key={pageNumber}
                                            style={
                                                currentPage === pageNumber ? { fontWeight: 'bold', scale: 1.15 } : {}
                                            }>
                                            {pageNumber.toString()}
                                        </button>
                                    );
                                }
                                if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                                    return (
                                        <span key={pageNumber} style={{ padding: '5px' }}>
                                            ...
                                        </span>
                                    );
                                }
                                return null;
                            })}
                            <button
                                className="op_pagination_next"
                                onClick={() => handlePageChange('next')}
                                disabled={currentPage === totalPages}>
                                Next
                            </button>
                        </div>
                    )}
                </BaseView>
            )}

            {isTokenHidden && (
                <BaseView style={$opnet}>
                    <Row style={{ marginTop: '12px' }}>
                        <Button
                            style={{ width: '100%', fontSize: '10px' }}
                            text="Show Hidden Tokens"
                            preset="fontsmall"
                            onClick={showHiddenTokens}
                        />
                    </Row>
                </BaseView>
            )}

            {importTokenBool && (
                <AddOpNetToken
                    currentPage={currentPage}
                    setImportTokenBool={setImportTokenBool}
                    fetchData={fetchTokensBalances}
                    onClose={() => setImportTokenBool(false)}
                />
            )}

            <Modal
                open={showModal}
                onCancel={() => setShowModal(false)}
                footer={null}
                closeIcon={<CloseOutlined style={{ fontSize: '24px' } as CSSProperties} />}>
                <Row>
                    <Text text="Remove or Hide Token" preset="title-bold" size="xxl" />
                </Row>
                <Row style={{ marginTop: '12px' }}>
                    <Text
                        text="You can either remove or hide this token. Removing the token will permanently delete it from the list (you will need to manually import it in the future). Hiding the token only temporarily removes it from the list, but you can bring it back by clicking 'Show Hidden Tokens' later."
                        size="md"
                    />
                </Row>
                <Row
                    style={{
                        display: 'flex',
                        gap: '10px',
                        justifyContent: 'center',
                        marginTop: '20px'
                    }}>
                    <Button text="Hide" onClick={() => handleModalAction('hide')} />
                    <Button text="Remove" onClick={() => handleModalAction('remove')} />
                </Row>
            </Modal>
        </div>
    );
}
