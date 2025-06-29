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
import { useWallet } from '@/ui/utils';

import { faPencil, faRefresh, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { RouteTypes, useNavigate } from '../../MainRoute';
import { AddOpNetToken } from '../../Wallet/AddOpNetToken';

BigNumber.config({ EXPONENTIAL_AT: 256 });

/** Number of tokens shown per page. */
const TOKENS_PER_PAGE = 3;

/** Cache to avoid re-fetching the same token balances. */
const balanceCache = new Map<string, OPTokenInfo>();

/** Simple interface to represent tokens stored in localStorage. */
interface StoredToken {
    address: string;
    hidden: boolean;
}

export function OPNetList() {
    const navigate = useNavigate();
    const wallet = useWallet();
    const currentAccount = useCurrentAccount();
    const chainType = useChainType();
    const tools = useTools();

    // Main tokens + balances
    const [tokens, setTokens] = useState<string[] | null>(null);
    const [tokenBalances, setTokenBalances] = useState<OPTokenInfo[]>([]);
    const [total, setTotal] = useState(-1);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // For "Import Token" modal
    const [importTokenBool, setImportTokenBool] = useState(false);

    // For the normal "Remove/Hide" token modal
    const [isTokenHidden, setIsTokenHidden] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalToken, setModalToken] = useState<string | null>(null);

    // For tokens that fail to load
    const [failedTokens, setFailedTokens] = useState<string[]>([]);
    const [currentFailedToken, setCurrentFailedToken] = useState<string | null>(null);
    const [showFailedModal, setShowFailedModal] = useState(false);

    /**
     * This ref is used to track the last fetch version
     */
    const fetchVersionRef = useRef(0);

    const fetchTokensBalances = useCallback(
        async (page: number) => {
            tools.showLoading(true);
            const myVersion = ++fetchVersionRef.current;

            try {
                // 1) reset network & cache
                Web3API.setNetwork(chainType);

                // 2) re-derive the full token list
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
                const moto = Web3API.motoAddressP2OP;
                if (moto && !fullList.includes(moto)) fullList.unshift(moto);
                const pill = Web3API.pillAddressP2OP;
                if (pill && !fullList.includes(pill)) fullList.unshift(pill);

                // 3) commit total & optionally reset to page 1
                setTokens(fullList);
                setTotal(fullList.length);
                setCurrentPage(page);

                // 4) grab just the slice you need
                const start = (page - 1) * TOKENS_PER_PAGE;
                const pageList = fullList.slice(start, start + TOKENS_PER_PAGE);

                // 5) fetch balances for that page
                const infos = await Promise.all(
                    pageList.map(async (addr) => {
                        try {
                            const ci = balanceCache.get(addr) ?? (await Web3API.queryContractInformation(addr));
                            if (!ci || ci.name === 'Generic Contract') {
                                setFailedTokens((prev) => {
                                    if (!prev.includes(addr)) {
                                        return [...prev, addr];
                                    }
                                    // if already failed, don't add again
                                    return prev;
                                });
                                return null;
                            }
                            const c = getContract<IOP_20Contract>(addr, OP_20_ABI, Web3API.provider, Web3API.network);
                            const bal = await c.balanceOf(Address.fromString(currentAccount.pubkey));
                            const ti: OPTokenInfo = {
                                address: addr,
                                name: ci.name || '',
                                amount: bal.properties.balance,
                                divisibility: 'divisibility' in ci ? ci.divisibility : (ci.decimals ?? 8),
                                symbol: ci.symbol,
                                logo: ci.logo
                            };
                            balanceCache.set(addr, ti);
                            return ti;
                        } catch {
                            setFailedTokens((prev) => {
                                if (!prev.includes(addr)) {
                                    return [...prev, addr];
                                }
                                // if already failed, don't add again
                                return prev;
                            });
                            return null;
                        }
                    })
                );

                if (myVersion !== fetchVersionRef.current) return;
                setTokenBalances(infos.filter((x): x is OPTokenInfo => !!x));
            } catch (e) {
                tools.toastError(`Error loading tokens & balances: ${(e as Error).message}`);
            } finally {
                tools.showLoading(false);
            }
        },
        [chainType, currentAccount.pubkey, tools]
    );

    // When chainType or account changes, re-load tokens
    useEffect(() => {
        fetchTokensBalances(1).catch(console.error);
    }, [fetchTokensBalances]);

    // If new failures appear, display them one by one
    useEffect(() => {
        if (!currentFailedToken && failedTokens.length > 0) {
            const [firstFailed] = failedTokens;
            setCurrentFailedToken(firstFailed);
            setShowFailedModal(true);
        } else if (failedTokens.length === 0) {
            setCurrentFailedToken(null);
            setShowFailedModal(false);
        }
    }, [failedTokens, currentFailedToken]);

    /**
     * Handle removing or keeping a token that failed to load.
     */
    const handleRemoveFailedToken = (shouldRemove: boolean) => {
        if (!currentFailedToken) return;

        if (shouldRemove) {
            try {
                const storageKey = `opnetTokens_${chainType}_${currentAccount.pubkey}`;
                const storedTokens = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];
                const updatedStored = storedTokens.filter((t) =>
                    typeof t === 'object' ? t.address !== currentFailedToken : t !== currentFailedToken
                );
                localStorage.setItem(storageKey, JSON.stringify(updatedStored));
                balanceCache.delete(currentFailedToken);
                tools.toastSuccess(`Token ${currentFailedToken} removed successfully!`);
            } catch (err) {
                tools.toastError(`Failed to remove the token: ${(err as Error).message}`);
            }
        }

        // always re-fetch the first page after a decision
        setShowFailedModal(false);
        setCurrentFailedToken(null);
        fetchTokensBalances(1).catch(console.error);
    };

    /**
     * Open Remove/Hide modal
     */
    const handleRemoveToken = (address: string) => {
        setModalToken(address);
        setShowModal(true);
    };

    type ModalAction = 'remove' | 'hide';

    /**
     * Remove/Hide a token in localStorage
     */
    const handleModalAction = (action: ModalAction) => {
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
            // re-fetch page 1 to repopulate tokens & balances
            fetchTokensBalances(1).catch(console.error);
        }
    };

    /**
     * Show all hidden tokens again
     */
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

    useEffect(() => {
        function getHiddensToken() {
            const accountAddr = currentAccount.pubkey;
            const storageKey = `opnetTokens_${chainType}_${accountAddr}`;

            const storedTokens = JSON.parse(localStorage.getItem(storageKey) || '[]') as (StoredToken | string)[];

            const previouslyHidden = storedTokens.filter((t) => typeof t === 'object' && t.hidden) as StoredToken[];
            if (previouslyHidden.length) {
                setIsTokenHidden(true);
            } else {
                setIsTokenHidden(false);
            }
        }

        getHiddensToken();
    }, [currentAccount.pubkey, wallet, tokens, chainType]);

    const totalPages = Math.ceil(total / TOKENS_PER_PAGE);
    const handlePageChange = (direction: 'next' | 'prev') => {
        setCurrentPage((prev) => {
            const next = direction === 'next' ? prev + 1 : prev - 1;
            fetchTokensBalances(next).catch(console.error);
            return next;
        });
    };

    // If total === -1, we're still initializing.
    if (total === -1) {
        return (
            <Column style={{ minHeight: 150 }} itemsCenter justifyCenter>
                <LoadingOutlined />
            </Column>
        );
    }

    /** Styles */
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
            {/* Top Buttons */}
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
                            onClick={() => fetchTokensBalances(currentPage)}>
                            <div className="op_tokens_action_icon">
                                <FontAwesomeIcon icon={faRefresh} />
                            </div>
                        </button>
                    </div>
                </div>
            </BaseView>

            {/* Token List & Pagination */}
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

                    {/* Pagination Controls */}
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

            {/* Import Token Modal */}
            {importTokenBool && (
                <AddOpNetToken
                    currentPage={currentPage}
                    setImportTokenBool={setImportTokenBool}
                    fetchData={fetchTokensBalances}
                    onClose={() => setImportTokenBool(false)}
                />
            )}

            {/* Normal Remove/Hide Token Modal */}
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

            {/* Failed-to-Load Token Modal */}
            <Modal
                open={showFailedModal}
                onCancel={() => handleRemoveFailedToken(false)}
                footer={null}
                closeIcon={<CloseOutlined style={{ fontSize: '24px' } as CSSProperties} />}>
                <Row>
                    <Text text="Token Failed to Load" preset="title-bold" size="xxl" />
                </Row>
                <Row style={{ marginTop: '12px' }}>
                    <Text
                        text={`We couldn't fetch balance/contract info for: ${
                            currentFailedToken ?? ''
                        }.\nWould you like to remove it from your list?`}
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
                    <Button text="Yes, Remove" onClick={() => handleRemoveFailedToken(true)} />
                    <Button text="No, Keep" onClick={() => handleRemoveFailedToken(false)} />
                </Row>
            </Modal>
        </div>
    );
}
