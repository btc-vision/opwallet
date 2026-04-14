import { Action, Features, SwapParameters } from '@/shared/interfaces/RawTxParameters';
import { OPTokenInfo } from '@/shared/types';
import Web3API from '@/shared/web3/Web3API';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { Column, Content, Header, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { PriorityFeeBar } from '@/ui/components/PriorityFeeBar';
import { Select } from '@/ui/components/Select';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useWallet } from '@/ui/utils';
import { CloseCircleOutlined, LoadingOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import BigNumber from 'bignumber.js';
import {
    AddressesInfo,
    BitcoinUtils,
    getContract,
    IMotoswapRouterContract,
    IOP20Contract,
    MOTOSWAP_ROUTER_ABI,
    OP_20_ABI
} from 'opnet';
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { RouteTypes, useNavigate } from '../routeTypes';

BigNumber.config({ EXPONENTIAL_AT: 256 });

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    gold: '#ee771b'
};

interface StoredToken {
    address: string;
    hidden: boolean;
}

export default function SwapToken() {
    const navigate = useNavigate();
    const wallet = useWallet();
    const currentAccount = useCurrentAccount();
    const tools = useTools();

    const [loading, setLoading] = useState(true);
    const [tokens, setTokens] = useState<OPTokenInfo[]>([]);
    const [selectedInput, setSelectedInput] = useState<OPTokenInfo | null>(null);
    const [selectedOutput, setSelectedOutput] = useState<OPTokenInfo | null>(null);
    const [intermediateTokens, setIntermediateTokens] = useState<(OPTokenInfo | null)[]>([]);
    const [inputAmount, setInputAmount] = useState('');
    const [outputAmount, setOutputAmount] = useState('');
    const [outputAmountRaw, setOutputAmountRaw] = useState<bigint>(0n);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [slippageTolerance, setSlippageTolerance] = useState('5');
    const [feeRate, setFeeRate] = useState(5);
    const [priorityFee, setPriorityFee] = useState(0);
    const [error, setError] = useState('');
    const [routerAvailable, setRouterAvailable] = useState(false);
    const [rate, setRate] = useState('');

    const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Build the full path from input -> intermediates -> output
    const buildPath = useCallback(
        (
            tokenIn: OPTokenInfo | null,
            tokenOut: OPTokenInfo | null,
            intermediates: (OPTokenInfo | null)[]
        ): OPTokenInfo[] | null => {
            if (!tokenIn || !tokenOut) return null;
            const path: OPTokenInfo[] = [tokenIn];
            for (const t of intermediates) {
                if (!t) return null;
                path.push(t);
            }
            path.push(tokenOut);
            return path;
        },
        []
    );

    // Load tokens on mount
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const chainType = await wallet.getChainType();
                await Web3API.setNetwork(chainType);

                if (!Web3API.routerAddress) {
                    setRouterAvailable(false);
                    setLoading(false);
                    return;
                }
                setRouterAvailable(true);

                const [mldsaHashPubKey, legacyPubKey] = await wallet.getWalletAddress();
                const userAddress = Address.fromString(mldsaHashPubKey, legacyPubKey);

                const storageKey = `opnetTokens_${chainType}_${currentAccount.pubkey}`;
                const raw = localStorage.getItem(storageKey);
                const parsed: (StoredToken | string)[] = raw
                    ? (JSON.parse(raw) as (StoredToken | string)[])
                    : [];

                const addresses: string[] = [];
                const seen = new Set<string>();
                for (const t of parsed) {
                    const addr = typeof t === 'object' ? (t.hidden ? null : t.address) : t;
                    if (addr && !seen.has(addr)) {
                        addresses.push(addr);
                        seen.add(addr);
                    }
                }

                const tokenList: OPTokenInfo[] = [];
                for (const addr of addresses) {
                    try {
                        const info: ContractInformation | false | undefined =
                            await Web3API.queryContractInformation(addr);
                        if (!info) continue;

                        const contract = getContract<IOP20Contract>(
                            addr,
                            OP_20_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userAddress
                        );
                        const bal = await contract.balanceOf(userAddress);
                        tokenList.push({
                            address: addr,
                            name: info.name ?? '',
                            amount: bal.properties.balance,
                            divisibility: info.decimals ?? 8,
                            symbol: info.symbol ?? '',
                            logo: info.logo
                        });
                    } catch (e) {
                        console.error(`Failed to load token ${addr}:`, e);
                    }
                }

                setTokens(tokenList);
            } catch (err) {
                console.error('Failed to load swap tokens:', err);
                tools.toastError('Failed to load tokens');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [wallet, currentAccount, tools]);

    // Debounced quote fetching — uses full path
    const fetchQuote = useCallback(
        async (amount: string, path: OPTokenInfo[]) => {
            if (!amount || amount === '0' || amount === '.' || !Web3API.routerAddress || path.length < 2) {
                setOutputAmount('');
                setOutputAmountRaw(0n);
                setRate('');
                return;
            }

            const numericAmount = new BigNumber(amount);
            if (numericAmount.isNaN() || numericAmount.lte(0)) {
                setOutputAmount('');
                setOutputAmountRaw(0n);
                setRate('');
                return;
            }

            setQuoteLoading(true);
            setError('');

            try {
                const tokenIn = path[0];
                const tokenOut = path[path.length - 1];

                const amountInRaw = BigInt(
                    numericAmount.multipliedBy(new BigNumber(10).pow(tokenIn.divisibility)).toFixed(0)
                );

                const router = getContract<IMotoswapRouterContract>(
                    Web3API.routerAddress,
                    MOTOSWAP_ROUTER_ABI,
                    Web3API.provider,
                    Web3API.network
                );

                const allAddresses = path.map((t) => t.address);
                const pubKeys: AddressesInfo = await Web3API.provider.getPublicKeysInfo(allAddresses, true);
                const resolvedPath: Address[] = allAddresses.map((addr) => pubKeys[addr]);

                const result = await router.getAmountsOut(amountInRaw, resolvedPath);
                const amountOut = result.properties.amountsOut[path.length - 1];

                setOutputAmountRaw(amountOut);
                setOutputAmount(BitcoinUtils.formatUnits(amountOut, tokenOut.divisibility));

                const rateVal = new BigNumber(BitcoinUtils.formatUnits(amountOut, tokenOut.divisibility)).dividedBy(
                    numericAmount
                );
                setRate(`1 ${tokenIn.symbol} = ${rateVal.toFixed(6)} ${tokenOut.symbol}`);
            } catch (e) {
                console.error('Quote fetch failed:', e);
                setOutputAmount('');
                setOutputAmountRaw(0n);
                setRate('');
                setError('No liquidity available for this route');
            } finally {
                setQuoteLoading(false);
            }
        },
        []
    );

    const triggerQuote = useCallback(
        (amount: string, tokenIn: OPTokenInfo | null, tokenOut: OPTokenInfo | null, intermediates: (OPTokenInfo | null)[]) => {
            if (quoteTimer.current) clearTimeout(quoteTimer.current);
            const path = buildPath(tokenIn, tokenOut, intermediates);
            if (!path) return;
            quoteTimer.current = setTimeout(() => {
                void fetchQuote(amount, path);
            }, 400);
        },
        [fetchQuote, buildPath]
    );

    const clearQuote = () => {
        setOutputAmount('');
        setOutputAmountRaw(0n);
        setRate('');
        setError('');
    };

    const handleInputChange = (value: string) => {
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

        if (selectedInput && value) {
            const maxBalance = new BigNumber(BitcoinUtils.formatUnits(selectedInput.amount, selectedInput.divisibility));
            const numVal = new BigNumber(value);
            if (!numVal.isNaN() && numVal.gt(maxBalance)) {
                value = maxBalance.toString();
            }
        }

        setInputAmount(value);
        triggerQuote(value, selectedInput, selectedOutput, intermediateTokens);
    };

    const handleSelectInput = (option: OPTokenInfo) => {
        if (option.address === selectedOutput?.address) {
            setSelectedOutput(selectedInput);
            setSelectedInput(option);
            setInputAmount('');
            clearQuote();
            return;
        }
        setSelectedInput(option);
        triggerQuote(inputAmount, option, selectedOutput, intermediateTokens);
    };

    const handleSelectOutput = (option: OPTokenInfo) => {
        if (option.address === selectedInput?.address) {
            setSelectedInput(selectedOutput);
            setSelectedOutput(option);
            setInputAmount('');
            clearQuote();
            return;
        }
        setSelectedOutput(option);
        triggerQuote(inputAmount, selectedInput, option, intermediateTokens);
    };

    const handleSelectIntermediate = (index: number, option: OPTokenInfo) => {
        const updated = [...intermediateTokens];
        updated[index] = option;
        setIntermediateTokens(updated);
        triggerQuote(inputAmount, selectedInput, selectedOutput, updated);
    };

    const addIntermediateToken = () => {
        if (intermediateTokens.length >= 3) {
            tools.toastWarning('Maximum 3 intermediate tokens');
            return;
        }
        setIntermediateTokens([...intermediateTokens, null]);
        clearQuote();
    };

    const removeIntermediateToken = (index: number) => {
        const updated = intermediateTokens.filter((_, i) => i !== index);
        setIntermediateTokens(updated);
        triggerQuote(inputAmount, selectedInput, selectedOutput, updated);
    };

    const handleFlip = () => {
        const tempIn = selectedInput;
        setSelectedInput(selectedOutput);
        setSelectedOutput(tempIn);
        setIntermediateTokens([...intermediateTokens].reverse());
        setInputAmount('');
        clearQuote();
    };

    const setMax = () => {
        if (!selectedInput) return;
        const maxBal = new BigNumber(BitcoinUtils.formatUnits(selectedInput.amount, selectedInput.divisibility));
        const val = maxBal.toString();
        setInputAmount(val);
        triggerQuote(val, selectedInput, selectedOutput, intermediateTokens);
    };

    const fullPath = buildPath(selectedInput, selectedOutput, intermediateTokens);

    // Filter out tokens already used in the path to prevent duplicates like A -> A
    const getFilteredTokens = useCallback(
        (excludeIndex: 'input' | 'output' | number) => {
            const usedAddresses = new Set<string>();
            if (excludeIndex !== 'input' && selectedInput) usedAddresses.add(selectedInput.address);
            if (excludeIndex !== 'output' && selectedOutput) usedAddresses.add(selectedOutput.address);
            intermediateTokens.forEach((t, i) => {
                if (excludeIndex !== i && t) usedAddresses.add(t.address);
            });
            return tokens.filter((t) => !usedAddresses.has(t.address));
        },
        [tokens, selectedInput, selectedOutput, intermediateTokens]
    );

    const canSwap =
        !!fullPath &&
        fullPath.length >= 2 &&
        !!inputAmount &&
        inputAmount !== '0' &&
        outputAmountRaw > 0n &&
        !quoteLoading &&
        !error;

    const handleSwap = () => {
        if (!canSwap || !selectedInput || !selectedOutput || !fullPath || !Web3API.routerAddress) return;

        const amountIn = BigInt(
            new BigNumber(inputAmount)
                .multipliedBy(new BigNumber(10).pow(selectedInput.divisibility))
                .toFixed(0)
        );

        const slippageBps = BigInt(Math.floor(Number(slippageTolerance) * 100));
        const amountOutMin = outputAmountRaw - (outputAmountRaw * slippageBps) / 10000n;

        const params: SwapParameters = {
            action: Action.Swap,
            header: `Swap ${selectedInput.symbol} for ${selectedOutput.symbol}`,
            features: {
                [Features.rbf]: true,
                [Features.taproot]: true
            },
            tokens: fullPath,
            feeRate,
            priorityFee: BigInt(priorityFee),
            amountIn,
            amountOut: outputAmountRaw,
            amountOutMin,
            tokenIn: selectedInput.address,
            tokenOut: selectedOutput.address,
            path: fullPath.map((t) => t.address),
            slippageTolerance: Number(slippageTolerance),
            routerAddress: Web3API.routerAddress.toHex()
        };

        navigate(RouteTypes.TxOpnetConfirmScreen, { rawTxInfo: params });
    };

    // Styles
    const $card: CSSProperties = {
        backgroundColor: colors.containerBgFaded,
        borderRadius: 12,
        padding: '16px',
        border: `1px solid ${colors.containerBorder}`
    };

    const $amountInput: CSSProperties = {
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: colors.text,
        fontSize: 24,
        fontWeight: 600,
        width: '100%',
        padding: 0
    };

    const $flipButton: CSSProperties = {
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: colors.containerBg,
        border: `1px solid ${colors.containerBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        margin: '-8px auto'
    };

    const $infoRow: CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0'
    };

    const $routeChip: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 8,
        backgroundColor: colors.containerBg,
        border: `1px solid ${colors.containerBorder}`,
        fontSize: 12,
        color: colors.text
    };

    const $addRouteBtn: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 10,
        backgroundColor: 'transparent',
        border: `1px dashed ${colors.gold}`,
        color: colors.gold,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        transition: 'background-color 0.15s'
    };

    const $removeBtn: CSSProperties = {
        cursor: 'pointer',
        color: colors.error,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center'
    };

    if (loading) {
        return (
            <Layout>
                <Content itemsCenter justifyCenter>
                    <LoadingOutlined style={{ fontSize: 32, color: colors.gold }} />
                    <Text text="Loading tokens..." color="textDim" />
                </Content>
            </Layout>
        );
    }

    if (!routerAvailable) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} />
                <Content itemsCenter justifyCenter>
                    <Text text="Swap is not available on this network" color="textDim" />
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Swap" />
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    backgroundColor: '#212121'
                }}>
                {/* Input Token */}
                <div style={$card}>
                    <div style={$infoRow}>
                        <Text text="You Pay" size="xs" color="textDim" />
                        {selectedInput && (
                            <Row>
                                <Text
                                    text={`Balance: ${new BigNumber(
                                        BitcoinUtils.formatUnits(selectedInput.amount, selectedInput.divisibility)
                                    ).toFixed(4)}`}
                                    size="xxs"
                                    color="textDim"
                                />
                                <Text
                                    text="MAX"
                                    size="xxs"
                                    style={{ color: colors.gold, cursor: 'pointer', marginLeft: 4 }}
                                    onClick={setMax}
                                />
                            </Row>
                        )}
                    </div>
                    <Row style={{ marginTop: 8, alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="0"
                            value={inputAmount}
                            onChange={(e) => handleInputChange(e.target.value)}
                            style={$amountInput}
                        />
                        <Select
                            selectIndex={0}
                            options={getFilteredTokens('input')}
                            selectedoptionuse={selectedInput}
                            placeholder="Select"
                            onSelect={handleSelectInput}
                        />
                    </Row>
                </div>

                {/* Intermediate Route Tokens */}
                {intermediateTokens.map((token, index) => (
                    <div key={`route-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '-4px 0' }}>
                        <div style={{ flex: 1, borderTop: `1px dashed ${colors.containerBorder}` }} />
                        <div style={$routeChip}>
                            <Text text={`Route ${index + 1}`} size="xxs" color="textDim" />
                            <Select
                                selectIndex={10 + index}
                                options={getFilteredTokens(index)}
                                selectedoptionuse={token}
                                placeholder="Token"
                                onSelect={(opt) => handleSelectIntermediate(index, opt)}
                            />
                            <div style={$removeBtn} onClick={() => removeIntermediateToken(index)}>
                                <CloseCircleOutlined />
                            </div>
                        </div>
                        <div style={{ flex: 1, borderTop: `1px dashed ${colors.containerBorder}` }} />
                    </div>
                ))}

                {/* Flip Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <div style={$flipButton} onClick={handleFlip}>
                        <SwapOutlined style={{ color: colors.text, fontSize: 16 }} rotate={90} />
                    </div>
                </div>

                {/* Output Token */}
                <div style={{ ...$card, marginTop: -4 }}>
                    <div style={$infoRow}>
                        <Text text="You Receive" size="xs" color="textDim" />
                        {selectedOutput && (
                            <Text
                                text={`Balance: ${new BigNumber(
                                    BitcoinUtils.formatUnits(selectedOutput.amount, selectedOutput.divisibility)
                                ).toFixed(4)}`}
                                size="xxs"
                                color="textDim"
                            />
                        )}
                    </div>
                    <Row style={{ marginTop: 8, alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="0"
                            value={quoteLoading ? '...' : outputAmount}
                            disabled
                            style={{ ...$amountInput, opacity: 0.7 }}
                        />
                        <Select
                            selectIndex={1}
                            options={getFilteredTokens('output')}
                            selectedoptionuse={selectedOutput}
                            placeholder="Select"
                            onSelect={handleSelectOutput}
                        />
                    </Row>
                </div>

                {/* Route Path Visualization */}
                {fullPath && fullPath.length > 2 && (
                    <div style={{ ...$card, padding: '8px 16px' }}>
                        <Text text="Route" size="xxs" color="textDim" style={{ marginBottom: 4 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {fullPath.map((t, i) => (
                                <div key={t.address} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: i === 0 || i === fullPath.length - 1 ? colors.gold : colors.text
                                        }}>
                                        {t.symbol}
                                    </span>
                                    {i < fullPath.length - 1 && (
                                        <span style={{ color: colors.textFaded, fontSize: 10 }}>-&gt;</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add Route Button */}
                <div
                    style={$addRouteBtn}
                    onClick={addIntermediateToken}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${colors.gold}15`)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <PlusOutlined style={{ fontSize: 12 }} />
                    Add Route
                </div>

                {/* Quote Info */}
                {rate && !error && (
                    <div style={{ ...$card, padding: '10px 16px' }}>
                        <div style={$infoRow}>
                            <Text text="Rate" size="xxs" color="textDim" />
                            <Text text={rate} size="xxs" />
                        </div>
                        {outputAmountRaw > 0n && selectedOutput && (
                            <div style={$infoRow}>
                                <Text text="Min. Received" size="xxs" color="textDim" />
                                <Text
                                    text={`${BitcoinUtils.formatUnits(
                                        outputAmountRaw -
                                            (outputAmountRaw * BigInt(Math.floor(Number(slippageTolerance) * 100))) /
                                                10000n,
                                        selectedOutput.divisibility
                                    )} ${selectedOutput.symbol}`}
                                    size="xxs"
                                />
                            </div>
                        )}
                        <div style={$infoRow}>
                            <Text text="Slippage" size="xxs" color="textDim" />
                            <Text text={`${slippageTolerance}%`} size="xxs" />
                        </div>
                        {fullPath && fullPath.length > 2 && (
                            <div style={$infoRow}>
                                <Text text="Hops" size="xxs" color="textDim" />
                                <Text text={`${fullPath.length - 1}`} size="xxs" />
                            </div>
                        )}
                    </div>
                )}

                {error && <Text text={error} size="xs" style={{ color: colors.error, textAlign: 'center' }} />}

                {/* Slippage */}
                <Column gap="sm" style={{ marginTop: 4 }}>
                    <Text text="Slippage Tolerance (%)" size="xs" color="textDim" />
                    <Row gap="sm">
                        {['1', '3', '5', '10'].map((val) => (
                            <div
                                key={val}
                                onClick={() => setSlippageTolerance(val)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    backgroundColor: slippageTolerance === val ? colors.gold : colors.containerBg,
                                    color: slippageTolerance === val ? '#fff' : colors.text,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 500
                                }}>
                                {val}%
                            </div>
                        ))}
                        <input
                            type="text"
                            placeholder="Custom"
                            value={!['1', '3', '5', '10'].includes(slippageTolerance) ? slippageTolerance : ''}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                    const num = Number(v);
                                    if (v === '' || (!isNaN(num) && num >= 0 && num <= 100)) {
                                        setSlippageTolerance(v || '5');
                                    }
                                }
                            }}
                            style={{
                                width: 60,
                                background: colors.containerBg,
                                border: 'none',
                                borderRadius: 8,
                                padding: '6px 8px',
                                color: colors.text,
                                fontSize: 12,
                                outline: 'none',
                                textAlign: 'center'
                            }}
                        />
                    </Row>
                </Column>

                {/* Priority Fee */}
                <Column gap="sm">
                    <Text text="Priority Fee" size="xs" color="textDim" />
                    <PriorityFeeBar onChange={(val) => setPriorityFee(val)} />
                </Column>

                {/* Fee Rate */}
                <Column gap="sm">
                    <Text text="Network Fee" size="xs" color="textDim" />
                    <FeeRateBar onChange={(val) => setFeeRate(val)} />
                </Column>

                {/* Spacer so button doesn't overlap content */}
                <div style={{ height: 60 }} />
            </div>
            {/* Swap Button — fixed at bottom */}
            <div style={{ padding: '8px 16px 16px', backgroundColor: '#212121', flexShrink: 0 }}>
                <div
                    onClick={canSwap ? handleSwap : undefined}
                    style={{
                        height: 46,
                        borderRadius: 8,
                        backgroundColor: canSwap ? colors.gold : colors.containerBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: canSwap ? 'pointer' : 'not-allowed',
                        opacity: canSwap ? 1 : 0.5,
                        transition: 'background-color 0.15s',
                        fontWeight: 600,
                        fontSize: 14,
                        color: canSwap ? '#fff' : colors.textFaded
                    }}>
                    {quoteLoading ? 'Fetching Quote...' : 'Swap'}
                </div>
            </div>
        </Layout>
    );
}
