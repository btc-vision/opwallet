import { ParsedTransaction, ParsedTxOutput, PRESIGNED_DATA_EXPIRATION_MS, PreSignedTransactionData } from '@/background/service/notification';
import {
    AcceptDomainTransferParameters,
    Action,
    AirdropParameters,
    CancelDomainTransferParameters,
    DeployContractParameters,
    InitiateDomainTransferParameters,
    MintParameters,
    PublishDomainParameters,
    RawTxInfo,
    RegisterDomainParameters,
    SendBitcoinParameters,
    SendNFTParameters,
    SourceType,
    TransferParameters
} from '@/shared/interfaces/RawTxParameters';
import { RecordTransactionInput, TransactionType } from '@/shared/types/TransactionHistory';
import { decodeBitcoinTransfer, decodeSignedInteractionReceipt, DecodedPreSignedData } from '@/shared/utils/txDecoder';
import Web3API from '@/shared/web3/Web3API';
import { Column, Content, Footer, Header, Layout, OPNetTxFlowPreview, Text } from '@/ui/components';
import { ContextType, useTools } from '@/ui/components/ActionComponent';
import { BottomModal } from '@/ui/components/BottomModal';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useLocationState, useWallet } from '@/ui/utils';
import {
    ArrowRightOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    CloudUploadOutlined,
    CopyOutlined,
    DownOutlined,
    DollarOutlined,
    FileTextOutlined,
    GiftOutlined,
    GlobalOutlined,
    LoadingOutlined,
    PictureOutlined,
    RightOutlined,
    RocketOutlined,
    SafetyCertificateOutlined,
    SafetyOutlined,
    SwapOutlined,
    ThunderboltOutlined,
    WarningOutlined
} from '@ant-design/icons';
import {
    ABIDataTypes,
    Address,
    AddressMap,
    AddressTypes,
    AddressVerificator,
    createAddressRotation,
    DeploymentResult,
    IDeploymentParameters,
    IFundingTransactionParameters,
    MLDSASecurityLevel,
    UTXO,
    Wallet
} from '@btc-vision/transaction';
import { ECPairInterface } from 'ecpair';
import BigNumber from 'bignumber.js';
import {
    Airdrop,
    BitcoinAbiTypes,
    BitcoinInterfaceAbi,
    BitcoinUtils,
    CallResult,
    EXTENDED_OP721_ABI,
    getContract,
    IExtendedOP721,
    IOP20Contract,
    OP_20_ABI,
    SignedInteractionTransactionReceipt,
    StrippedTransactionOutput,
    TransactionOutputFlags,
    TransactionParameters
} from 'opnet';
import { BTC_NAME_RESOLVER_ABI } from '@/shared/web3/abi/BTC_NAME_RESOLVER_ABI';
import { IBtcNameResolverContract } from '@/shared/web3/interfaces/IBtcNameResolverContract';
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteTypes, useNavigate } from '../routeTypes';

BigNumber.config({ EXPONENTIAL_AT: 256 });

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

interface LocationState {
    rawTxInfo: RawTxInfo;
}

// Cached pre-signed transaction data for OPNet interactions
interface CachedSignedTransaction {
    simulation: CallResult;
    signedTx: SignedInteractionTransactionReceipt;
    createdAt: number;
    symbol?: string;
    // Decoded transaction data for display
    decodedData: DecodedPreSignedData | null;
    // Pre-signed data in the format expected by OPNetTxFlowPreview
    preSignedTxData: PreSignedTransactionData | null;
}

// Cached pre-signed Bitcoin transfer
interface CachedBitcoinTransfer {
    txHex: string;
    utxos: UTXO[];
    nextUtxos: UTXO[];
    createdAt: number;
    // Decoded transaction data
    decodedData: DecodedPreSignedData | null;
    preSignedTxData: PreSignedTransactionData | null;
    // Flag for cold storage withdrawal (to register change address after broadcast)
    isColdStorage?: boolean;
    // Flag for consolidation (to mark addresses as consolidated after broadcast)
    isConsolidation?: boolean;
}

export const AIRDROP_ABI: BitcoinInterfaceAbi = [
    ...OP_20_ABI,
    {
        name: 'airdrop',
        inputs: [
            {
                name: 'wallets',
                type: ABIDataTypes.ADDRESS_UINT256_TUPLE
            }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    }
];

export interface AirdropInterface extends IOP20Contract {
    airdrop(tuple: AddressMap<bigint>): Promise<Airdrop>;
}

const waitForTransaction = async (
    txHash: string,
    setOpenLoading: Dispatch<SetStateAction<boolean>>,
    tools: ContextType
) => {
    let attempts = 0;
    const maxAttempts = 360;
    setOpenLoading(true);

    while (attempts < maxAttempts) {
        try {
            const txResult = await Web3API.provider.getTransaction(txHash);
            if (txResult && !('error' in txResult)) {
                console.log('Transaction confirmed:', txResult);
                setOpenLoading(false);
                return txResult.hash;
            }
        } catch (error) {
            console.log('Error fetching transaction:', error);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
    }
    tools.toastError('Transaction not confirmed after 10 minutes');
};

const defaultMessage = 'Awaiting confirmation...';

export default function TxOpnetConfirmScreen() {
    const navigate = useNavigate();
    const [openLoading, setOpenLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>(defaultMessage);
    const [deploymentContract, setDeploymentContract] = useState<DeploymentResult | null>(null);
    const [disabled, setDisabled] = useState<boolean>(false);
    const { rawTxInfo } = useLocationState<LocationState>();
    const btcUnit = useBTCUnit();
    const wallet = useWallet();
    const tools = useTools();

    // Pre-signed transaction state
    const [isSigning, setIsSigning] = useState<boolean>(false);
    const [signingError, setSigningError] = useState<string | null>(null);
    const [cachedSignedTx, setCachedSignedTx] = useState<CachedSignedTransaction | null>(null);
    const [cachedBtcTx, setCachedBtcTx] = useState<CachedBitcoinTransfer | null>(null);
    const preSigningRef = useRef<boolean>(false);
    const [isTxFlowExpanded, setIsTxFlowExpanded] = useState<boolean>(false);
    const [btcPrice, setBtcPrice] = useState<number>(0);
    const [userAddresses, setUserAddresses] = useState<Set<string>>(new Set());

    useEffect(() => {
        const setWallet = async () => {
            await Web3API.setNetwork(await wallet.getChainType());
        };
        void setWallet();
    });

    // Fetch all user addresses for change detection
    useEffect(() => {
        const fetchUserAddresses = async () => {
            try {
                const account = await wallet.getCurrentAccount();
                const addresses = new Set<string>();
                addresses.add(account.address.toLowerCase());

                if (account.pubkey) {
                    const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
                    const addressInst = Address.fromString(zeroHash, account.pubkey);

                    try { addresses.add(addressInst.toCSV(75, Web3API.network).address.toLowerCase()); } catch { /* ignore */ }
                    try { addresses.add(addressInst.toCSV(2, Web3API.network).address.toLowerCase()); } catch { /* ignore */ }
                    try { addresses.add(addressInst.toCSV(1, Web3API.network).address.toLowerCase()); } catch { /* ignore */ }
                    try { addresses.add(addressInst.p2wda(Web3API.network).address.toLowerCase()); } catch { /* ignore */ }
                    try { addresses.add(addressInst.p2tr(Web3API.network).toLowerCase()); } catch { /* ignore */ }
                    try { addresses.add(addressInst.p2wpkh(Web3API.network).toLowerCase()); } catch { /* ignore */ }
                    try { addresses.add(addressInst.p2pkh(Web3API.network).toLowerCase()); } catch { /* ignore */ }
                    try { addresses.add(addressInst.p2shp2wpkh(Web3API.network).toLowerCase()); } catch { /* ignore */ }
                }
                setUserAddresses(addresses);
            } catch (e) {
                console.error('Failed to fetch user addresses:', e);
            }
        };
        void fetchUserAddresses();
    }, [wallet]);

    // Fetch BTC price for USD estimation
    useEffect(() => {
        wallet.getBtcPrice().then((price) => {
            if (price > 0) setBtcPrice(price);
        }).catch(() => {
            // Silently fail - USD will just not be shown
        });
    }, [wallet]);

    // Analyze outputs to calculate total cost and identify change/external outputs
    // Use nextUTXOs directly since they represent exactly what the user gets back
    const outputAnalysis = useMemo(() => {
        const decodedData = cachedSignedTx?.decodedData || cachedBtcTx?.decodedData;

        if (!decodedData) {
            // Fallback to estimate
            const miningFee = Number(rawTxInfo.priorityFee);
            const gasFee = Number(rawTxInfo.gasSatFee ?? 0);
            const domainPrice = rawTxInfo.action === Action.RegisterDomain ? Number((rawTxInfo as RegisterDomainParameters).price) : 0;
            return {
                totalCost: miningFee + gasFee + domainPrice,
                changeOutputs: [] as { address: string; value: bigint }[],
                externalOutputs: [] as { address: string; value: bigint }[],
                totalChange: 0n,
                totalExternal: 0n,
                isActual: false
            };
        }

        const transactions = decodedData.transactions;

        // Get funding tx (first) and interaction tx (last)
        // If only one tx, it's the interaction tx
        const fundingTx = transactions.length > 1 ? transactions[0] : null;
        const interactionTx = transactions[transactions.length - 1];

        // Total inputs from funding tx (what user is actually spending from their wallet)
        // If no funding tx, use interaction tx inputs
        const totalInputs = fundingTx ? fundingTx.totalInputValue : interactionTx.totalInputValue;

        // Calculate total change directly from nextUTXOs
        // nextUTXOs represents ALL UTXOs that will be available to the user after the transaction
        // This is the most reliable way to calculate change since it comes directly from the signed tx
        const nextUTXOs = cachedSignedTx?.signedTx?.nextUTXOs || cachedBtcTx?.nextUtxos || [];
        let totalChange = 0n;
        const changeOutputs: { address: string; value: bigint }[] = [];

        for (const utxo of nextUTXOs) {
            const value = BigInt(utxo.value);
            totalChange += value;
            const addr = utxo.scriptPubKey?.address || utxo.scriptPubKey?.addresses?.[0] || '';
            changeOutputs.push({ address: addr, value });
        }

        // Build user addresses set for external output detection
        const extendedUserAddresses = new Set(userAddresses);
        for (const utxo of nextUTXOs) {
            const addr = utxo.scriptPubKey?.address || utxo.scriptPubKey?.addresses?.[0];
            if (addr) {
                extendedUserAddresses.add(addr.toLowerCase());
            }
        }

        // Analyze interaction tx outputs for external payments (skip epoch miner at index 0)
        const externalOutputs: { address: string; value: bigint }[] = [];
        let totalExternal = 0n;
        const interactionOutputs = interactionTx.outputs.slice(1).filter((o: ParsedTxOutput) => !o.isOpReturn);

        for (const output of interactionOutputs) {
            const outputAddr = output.address?.toLowerCase();
            const isUserAddress = outputAddr ? extendedUserAddresses.has(outputAddr) : false;

            if (!isUserAddress && output.address) {
                externalOutputs.push({ address: output.address, value: output.value });
                totalExternal += output.value;
            }
        }

        // Total cost = inputs - all change going back to user
        const totalCost = Number(totalInputs - totalChange);

        return {
            totalCost,
            changeOutputs,
            externalOutputs,
            totalChange,
            totalExternal,
            isActual: true
        };
    }, [cachedSignedTx, cachedBtcTx, userAddresses, rawTxInfo]);

    const getOPNetWallet = useCallback(async () => {
        const data = await wallet.getOPNetWallet();

        return Wallet.fromWif(
            data[0],
            data[1],
            Web3API.network,
            MLDSASecurityLevel.LEVEL2,
            Buffer.from(data[2], 'hex')
        );
    }, [wallet]);

    // Check if pre-signed transaction is expired
    const isPreSignedExpired = useCallback(() => {
        if (!cachedSignedTx) return true;
        return Date.now() - cachedSignedTx.createdAt > PRESIGNED_DATA_EXPIRATION_MS;
    }, [cachedSignedTx]);

    // Pre-sign OPNet interaction transactions on mount
    useEffect(() => {
        // Only pre-sign for OPNet interactions (Transfer, Mint, Airdrop, SendNFT, RegisterDomain, PublishDomain, DomainTransfer actions)
        const supportedActions = [Action.Transfer, Action.Mint, Action.Airdrop, Action.SendNFT, Action.RegisterDomain, Action.PublishDomain, Action.InitiateDomainTransfer, Action.AcceptDomainTransfer, Action.CancelDomainTransfer];
        if (!supportedActions.includes(rawTxInfo.action)) return;
        if (preSigningRef.current) return;
        preSigningRef.current = true;

        const preSignTransaction = async () => {
            setIsSigning(true);
            setSigningError(null);

            try {
                await Web3API.setNetwork(await wallet.getChainType());
                const userWallet = await getOPNetWallet();
                const currentWalletAddress = await wallet.getCurrentAccount();

                // Ensure bigint values are properly converted (navigation state may serialize them as strings)
                const basePriorityFee = BigInt(rawTxInfo.priorityFee);

                // Create mutable interaction parameters - extraOutputs will be added for domain registration
                let interactionParameters: TransactionParameters = {
                    signer: userWallet.keypair,
                    mldsaSigner: userWallet.mldsaKeypair,
                    refundTo: currentWalletAddress.address,
                    maximumAllowedSatToSpend: basePriorityFee,
                    feeRate: rawTxInfo.feeRate,
                    network: Web3API.network,
                    priorityFee: basePriorityFee,
                    note: rawTxInfo.note
                };

                let simulation: CallResult;
                let symbol: string | undefined;

                switch (rawTxInfo.action) {
                    case Action.Transfer: {
                        const contract: IOP20Contract = getContract<IOP20Contract>(
                            rawTxInfo.contractAddress,
                            OP_20_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );
                        const address = await getPubKey(rawTxInfo.to);
                        // Ensure inputAmount is bigint (navigation state may serialize it as string)
                        const transferAmount = BigInt(rawTxInfo.inputAmount);
                        simulation = await contract.safeTransfer(address, transferAmount, new Uint8Array());
                        const symbolResult = await contract.symbol();
                        symbol = symbolResult.properties.symbol;
                        break;
                    }
                    case Action.Mint: {
                        const contract = getContract<IOP20Contract>(
                            rawTxInfo.contractAddress,
                            OP_20_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );
                        const value = BitcoinUtils.expandToDecimals(rawTxInfo.inputAmount, rawTxInfo.tokens[0].divisibility);
                        simulation = await contract.mint(Address.fromString(rawTxInfo.to), value);
                        symbol = rawTxInfo.tokens[0].symbol;
                        break;
                    }
                    case Action.Airdrop: {
                        const contract: AirdropInterface = getContract<AirdropInterface>(
                            rawTxInfo.contractAddress,
                            AIRDROP_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );
                        const addressMap = new AddressMap<bigint>();
                        for (const [pubKey, amount] of Object.entries(rawTxInfo.amounts)) {
                            addressMap.set(Address.fromString(pubKey), BigInt(amount));
                        }
                        simulation = await contract.airdrop(addressMap);
                        break;
                    }
                    case Action.SendNFT: {
                        const addy =
                            AddressVerificator.detectAddressType(rawTxInfo.collectionAddress, Web3API.network) ===
                            AddressTypes.P2OP
                                ? rawTxInfo.collectionAddress
                                : Address.fromString(rawTxInfo.collectionAddress);
                        const contract: IExtendedOP721 = getContract<IExtendedOP721>(
                            addy,
                            EXTENDED_OP721_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );
                        const recipientAddress = await getPubKey(rawTxInfo.to);
                        // Ensure tokenId is bigint (navigation state may serialize it as string)
                        const nftTokenId = BigInt(rawTxInfo.tokenId);
                        simulation = await contract.safeTransferFrom(
                            userWallet.address,
                            recipientAddress,
                            nftTokenId,
                            new Uint8Array()
                        );
                        symbol = rawTxInfo.collectionName;
                        break;
                    }
                    case Action.RegisterDomain: {
                        // Get the resolver contract address from Web3API
                        const resolverAddress = Web3API.btcResolverAddressP2OP;
                        if (!resolverAddress) {
                            throw new Error('Domain resolver not available on this network');
                        }
                        const contract: IBtcNameResolverContract = getContract<IBtcNameResolverContract>(
                            resolverAddress,
                            BTC_NAME_RESOLVER_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );

                        // Ensure price is bigint (may have been serialized as string via navigation state)
                        const domainPrice = BigInt(rawTxInfo.price);

                        // Set transaction details for simulation - contract needs to know about treasury payment
                        const outSimulation: StrippedTransactionOutput[] = [
                            {
                                index: 1,
                                to: rawTxInfo.treasuryAddress,
                                value: domainPrice,
                                flags: TransactionOutputFlags.hasTo,
                                scriptPubKey: undefined
                            }
                        ];
                        contract.setTransactionDetails({
                            inputs: [],
                            outputs: outSimulation
                        });

                        // Register the domain - payment to treasury is handled via extraOutputs
                        simulation = await contract.registerDomain(rawTxInfo.domainName);
                        symbol = `${rawTxInfo.domainName}.btc`;
                        interactionParameters = {
                            ...interactionParameters,
                            maximumAllowedSatToSpend: basePriorityFee + domainPrice,
                            extraOutputs: [
                                {
                                    address: rawTxInfo.treasuryAddress,
                                    value: Number(domainPrice)
                                }
                            ]
                        };
                        break;
                    }
                    case Action.PublishDomain: {
                        // Get the resolver contract address from Web3API
                        const resolverAddress = Web3API.btcResolverAddressP2OP;
                        if (!resolverAddress) {
                            throw new Error('Domain resolver not available on this network');
                        }
                        const contract: IBtcNameResolverContract = getContract<IBtcNameResolverContract>(
                            resolverAddress,
                            BTC_NAME_RESOLVER_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );
                        // Determine CID type and call appropriate method
                        const cid = rawTxInfo.cid;
                        if (cid.startsWith('Qm')) {
                            // CIDv0
                            simulation = await contract.setContenthashCIDv0(rawTxInfo.domainName, cid);
                        } else if (cid.startsWith('bafy') || cid.startsWith('bafk')) {
                            // CIDv1
                            simulation = await contract.setContenthashCIDv1(rawTxInfo.domainName, cid);
                        } else if (cid.startsWith('k') || cid.startsWith('12D3')) {
                            // IPNS
                            simulation = await contract.setContenthashIPNS(rawTxInfo.domainName, cid);
                        } else {
                            // Default to CIDv1
                            simulation = await contract.setContenthashCIDv1(rawTxInfo.domainName, cid);
                        }
                        symbol = `${rawTxInfo.domainName}.btc`;
                        break;
                    }
                    case Action.InitiateDomainTransfer: {
                        // Get the resolver contract address from Web3API
                        const resolverAddress = Web3API.btcResolverAddressP2OP;
                        if (!resolverAddress) {
                            throw new Error('Domain resolver not available on this network');
                        }
                        const contract: IBtcNameResolverContract = getContract<IBtcNameResolverContract>(
                            resolverAddress,
                            BTC_NAME_RESOLVER_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );
                        // Resolve recipient address (can be Bitcoin address or public key)
                        const newOwnerAddress = await getPubKey(rawTxInfo.newOwner);
                        simulation = await contract.initiateTransfer(rawTxInfo.domainName, newOwnerAddress);
                        symbol = `${rawTxInfo.domainName}.btc`;
                        break;
                    }
                    case Action.AcceptDomainTransfer: {
                        // Get the resolver contract address from Web3API
                        const resolverAddress = Web3API.btcResolverAddressP2OP;
                        if (!resolverAddress) {
                            throw new Error('Domain resolver not available on this network');
                        }
                        const contract: IBtcNameResolverContract = getContract<IBtcNameResolverContract>(
                            resolverAddress,
                            BTC_NAME_RESOLVER_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );
                        simulation = await contract.acceptTransfer(rawTxInfo.domainName);
                        symbol = `${rawTxInfo.domainName}.btc`;
                        break;
                    }
                    case Action.CancelDomainTransfer: {
                        // Get the resolver contract address from Web3API
                        const resolverAddress = Web3API.btcResolverAddressP2OP;
                        if (!resolverAddress) {
                            throw new Error('Domain resolver not available on this network');
                        }
                        const contract: IBtcNameResolverContract = getContract<IBtcNameResolverContract>(
                            resolverAddress,
                            BTC_NAME_RESOLVER_ABI,
                            Web3API.provider,
                            Web3API.network,
                            userWallet.address
                        );
                        simulation = await contract.cancelTransfer(rawTxInfo.domainName);
                        symbol = `${rawTxInfo.domainName}.btc`;
                        break;
                    }
                    default:
                        return;
                }

                // Sign the transaction (without broadcasting)
                const signedTx = await simulation.signTransaction(interactionParameters);

                // Decode the signed transaction to get accurate fee data
                let decodedData: DecodedPreSignedData | null = null;
                let preSignedTxData: PreSignedTransactionData | null = null;

                try {
                    // Use fundingInputUtxos for the funding tx inputs (actual UTXO values consumed)
                    // Use fundingUTXOs for the interaction tx inputs (outputs from funding tx)
                    decodedData = decodeSignedInteractionReceipt(
                        signedTx.fundingTransactionRaw,
                        signedTx.interactionTransactionRaw,
                        signedTx.fundingInputUtxos,  // Input UTXOs consumed by funding tx
                        signedTx.fundingUTXOs,       // Output UTXOs from funding tx (inputs for interaction)
                        Web3API.network
                    );

                    // Build PreSignedTransactionData for OPNetTxFlowPreview
                    // Note: domain_registration and domain_publish use 'interaction' as the base type
                    const txType = rawTxInfo.action === Action.Transfer ? 'token_transfer'
                        : rawTxInfo.action === Action.Mint ? 'mint'
                        : rawTxInfo.action === Action.Airdrop ? 'airdrop'
                        : rawTxInfo.action === Action.SendNFT ? 'nft_transfer'
                        : 'interaction';

                    preSignedTxData = {
                        type: txType,
                        createdAt: Date.now(),
                        transactions: decodedData.transactions,
                        totalMiningFee: decodedData.totalMiningFee,
                        opnetGasFee: decodedData.opnetGasFee,
                        opnetEpochMinerOutput: decodedData.epochMinerOutput,
                        rawData: {
                            fundingTxHex: signedTx.fundingTransactionRaw,
                            interactionTxHex: signedTx.interactionTransactionRaw,
                            deploymentTxs: null,
                            bitcoinTxHex: null,
                            nextUTXOs: signedTx.nextUTXOs
                        }
                    };
                } catch (decodeError) {
                    console.warn('Failed to decode signed transaction:', decodeError);
                    // Continue without decoded data - UI will show estimates as fallback
                }

                // Cache the signed transaction with timestamp
                setCachedSignedTx({
                    simulation,
                    signedTx,
                    createdAt: Date.now(),
                    symbol,
                    decodedData,
                    preSignedTxData
                });
            } catch (e) {
                const error = e as Error;
                console.error('Pre-signing failed:', error);
                setSigningError(error.message);
            } finally {
                setIsSigning(false);
            }
        };

        void preSignTransaction();
    }, [rawTxInfo, wallet, getOPNetWallet]);

    // Pre-sign Bitcoin transfer transactions on mount
    useEffect(() => {
        if (rawTxInfo.action !== Action.SendBitcoin) return;
        if (preSigningRef.current) return;
        preSigningRef.current = true;

        const preSignBitcoinTransfer = async () => {
            setIsSigning(true);
            setSigningError(null);

            try {
                await Web3API.setNetwork(await wallet.getChainType());
                const userWallet = await getOPNetWallet();
                const currentWalletAddress = await wallet.getCurrentAccount();
                // rawTxInfo is already narrowed to SendBitcoinParameters by the action check above
                const parameters = rawTxInfo;
                // Ensure inputAmount is a number (navigation state may serialize it as string)
                const btcInputAmount = Number(parameters.inputAmount);

                // Determine source address and get UTXOs
                let fromAddress = currentWalletAddress.address;
                let utxos: UTXO[] = [];
                let witnessScript: Buffer | undefined;
                const feeMin = 10_000n;

                // Handle CSV address sources
                if (parameters.from && parameters.sourceType && parameters.sourceType !== SourceType.CURRENT) {
                    const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
                    const currentAddress = currentWalletAddress.quantumPublicKeyHash
                        ? Address.fromString(currentWalletAddress.quantumPublicKeyHash, currentWalletAddress.pubkey)
                        : Address.fromString(zeroHash, currentWalletAddress.pubkey);

                    if (parameters.sourceType === SourceType.CSV75) {
                        const csv75Address = currentAddress.toCSV(75, Web3API.network);
                        fromAddress = csv75Address.address;
                        witnessScript = csv75Address.witnessScript;
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            [fromAddress],
                            BitcoinUtils.expandToDecimals(btcInputAmount, 8) + feeMin,
                            75n,
                            parameters.optimize
                        );
                    } else if (parameters.sourceType === SourceType.CSV1) {
                        const csv1Address = currentAddress.toCSV(1, Web3API.network);
                        fromAddress = csv1Address.address;
                        witnessScript = csv1Address.witnessScript;
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            [fromAddress],
                            BitcoinUtils.expandToDecimals(btcInputAmount, 8) + feeMin,
                            1n,
                            parameters.optimize
                        );
                    } else if (parameters.sourceType === SourceType.CSV2) {
                        const csv2Address = currentAddress.toCSV(2, Web3API.network);
                        fromAddress = csv2Address.address;
                        witnessScript = csv2Address.witnessScript;
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            [fromAddress],
                            BitcoinUtils.expandToDecimals(btcInputAmount, 8) + feeMin,
                            2n,
                            parameters.optimize
                        );
                    } else if (parameters.sourceType === SourceType.P2WDA) {
                        const p2wdaAddress = currentAddress.p2wda(Web3API.network);
                        fromAddress = p2wdaAddress.address;
                        witnessScript = p2wdaAddress.witnessScript;
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            [fromAddress],
                            BitcoinUtils.expandToDecimals(btcInputAmount, 8) + feeMin,
                            undefined,
                            parameters.optimize
                        );
                    } else if (parameters.sourceType === SourceType.COLD_STORAGE) {
                        // Cold storage withdrawal - use cold wallet keypair
                        const coldWalletData = await wallet.getColdStorageWallet();
                        const [coldWif, coldPubkey, coldMldsaPrivateKey] = coldWalletData;
                        const coldWallet = Wallet.fromWif(
                            coldWif,
                            coldPubkey,
                            Web3API.network,
                            MLDSASecurityLevel.LEVEL2,
                            coldMldsaPrivateKey ? Buffer.from(coldMldsaPrivateKey, 'hex') : undefined
                        );

                        fromAddress = parameters.from || '';
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            [fromAddress],
                            BitcoinUtils.expandToDecimals(btcInputAmount, 8) + feeMin,
                            undefined,
                            parameters.optimize
                        );

                        // Build and sign with cold wallet
                        if (!utxos || utxos.length === 0) {
                            throw new Error('No UTXOs available in cold storage');
                        }

                        const coldFundingParams: IFundingTransactionParameters = {
                            amount: BitcoinUtils.expandToDecimals(btcInputAmount, 8),
                            utxos: utxos,
                            signer: coldWallet.keypair,
                            mldsaSigner: coldWallet.mldsaKeypair,
                            network: Web3API.network,
                            feeRate: parameters.feeRate,
                            priorityFee: 0n,
                            gasSatFee: 0n,
                            to: parameters.to,
                            from: fromAddress,
                            note: parameters.note
                            // Note: Change goes back to cold wallet (from address).
                            // User can make additional withdrawals for remaining funds.
                        };

                        const coldSignedTx = await Web3API.transactionFactory.createBTCTransfer(coldFundingParams);

                        let decodedData: DecodedPreSignedData | null = null;
                        let preSignedTxData: PreSignedTransactionData | null = null;

                        try {
                            decodedData = decodeBitcoinTransfer(coldSignedTx.tx, coldSignedTx.inputUtxos, Web3API.network);
                            preSignedTxData = {
                                type: 'bitcoin_transfer',
                                createdAt: Date.now(),
                                transactions: decodedData.transactions,
                                totalMiningFee: decodedData.totalMiningFee,
                                opnetGasFee: 0n,
                                opnetEpochMinerOutput: null,
                                rawData: {
                                    fundingTxHex: null,
                                    interactionTxHex: null,
                                    deploymentTxs: null,
                                    bitcoinTxHex: coldSignedTx.tx,
                                    nextUTXOs: coldSignedTx.nextUTXOs
                                }
                            };
                        } catch (decodeError) {
                            console.warn('Failed to decode cold storage transfer:', decodeError);
                        }

                        setCachedBtcTx({
                            txHex: coldSignedTx.tx,
                            utxos: utxos,
                            nextUtxos: coldSignedTx.nextUTXOs,
                            createdAt: Date.now(),
                            decodedData,
                            preSignedTxData,
                            isColdStorage: true
                        });

                        setIsSigning(false);
                        return;
                    } else if (parameters.sourceType === SourceType.CONSOLIDATION) {
                        // Consolidation - gather UTXOs from multiple hot addresses to cold storage
                        if (!parameters.sourceAddresses || !parameters.sourcePubkeys) {
                            throw new Error('Consolidation requires source addresses and pubkeys');
                        }

                        // Fetch all UTXOs from source addresses
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            parameters.sourceAddresses,
                            undefined,
                            undefined,
                            true // optimize
                        );

                        if (!utxos || utxos.length === 0) {
                            throw new Error('No UTXOs available for consolidation');
                        }

                        // Calculate total input value
                        const totalInputValue = utxos.reduce((sum, u) => sum + u.value, 0n);

                        // Get wallet data for all source addresses
                        const walletDataArray = await wallet.getConsolidationWallets(parameters.sourcePubkeys);

                        // Build signer map and create wallets
                        const signerPairs: Array<readonly [string, ECPairInterface]> = [];
                        let primaryWallet: Wallet | null = null;

                        for (let i = 0; i < parameters.sourceAddresses.length; i++) {
                            const address = parameters.sourceAddresses[i];
                            const [wif, pubkey, mldsaPrivateKey] = walletDataArray[i];

                            const addrWallet = Wallet.fromWif(
                                wif,
                                pubkey,
                                Web3API.network,
                                MLDSASecurityLevel.LEVEL2,
                                mldsaPrivateKey ? Buffer.from(mldsaPrivateKey, 'hex') : undefined
                            );

                            signerPairs.push([address, addrWallet.keypair] as const);

                            if (!primaryWallet) {
                                primaryWallet = addrWallet;
                            }
                        }

                        if (!primaryWallet) {
                            throw new Error('No wallets available for consolidation');
                        }

                        // Create address rotation config
                        const addressRotation = createAddressRotation(signerPairs);

                        // Estimate fees: ~68 vbytes per P2TR input, ~43 vbytes for output, ~12 overhead
                        const estimatedVSize = BigInt(12 + utxos.length * 68 + 43);
                        const estimatedFee = estimatedVSize * BigInt(parameters.feeRate);

                        // Calculate output amount (total - estimated fees with buffer)
                        // Add 20% buffer to fee estimate to ensure tx succeeds
                        const feeBuffer = (estimatedFee * 120n) / 100n;
                        const outputAmount = totalInputValue - feeBuffer;

                        if (outputAmount <= 0n) {
                            throw new Error('Consolidation amount too small to cover fees');
                        }

                        // Build consolidation transaction
                        // Set 'from' to cold storage so any change also goes to cold storage
                        const consolidationParams: IFundingTransactionParameters = {
                            amount: outputAmount,
                            utxos: utxos,
                            signer: primaryWallet.keypair,
                            mldsaSigner: primaryWallet.mldsaKeypair,
                            network: Web3API.network,
                            feeRate: parameters.feeRate,
                            priorityFee: 0n,
                            gasSatFee: 0n,
                            to: parameters.to,
                            from: parameters.to, // Change also goes to cold storage
                            addressRotation: addressRotation
                        };

                        const consolidationTx = await Web3API.transactionFactory.createBTCTransfer(consolidationParams);

                        // Decode the transaction
                        let decodedData: DecodedPreSignedData | null = null;
                        let preSignedTxData: PreSignedTransactionData | null = null;

                        try {
                            decodedData = decodeBitcoinTransfer(consolidationTx.tx, consolidationTx.inputUtxos, Web3API.network);
                            preSignedTxData = {
                                type: 'bitcoin_transfer',
                                createdAt: Date.now(),
                                transactions: decodedData.transactions,
                                totalMiningFee: decodedData.totalMiningFee,
                                opnetGasFee: 0n,
                                opnetEpochMinerOutput: null,
                                rawData: {
                                    fundingTxHex: null,
                                    interactionTxHex: null,
                                    deploymentTxs: null,
                                    bitcoinTxHex: consolidationTx.tx,
                                    nextUTXOs: consolidationTx.nextUTXOs
                                }
                            };
                        } catch (decodeError) {
                            console.warn('Failed to decode consolidation transfer:', decodeError);
                        }

                        setCachedBtcTx({
                            txHex: consolidationTx.tx,
                            utxos: utxos,
                            nextUtxos: consolidationTx.nextUTXOs,
                            createdAt: Date.now(),
                            decodedData,
                            preSignedTxData,
                            isConsolidation: true
                        });

                        setIsSigning(false);
                        return;
                    }

                    if (witnessScript && utxos.length > 0) {
                        utxos = utxos.map((utxo) => ({
                            ...utxo,
                            witnessScript: witnessScript
                        }));
                    }
                } else {
                    utxos = await Web3API.getAllUTXOsForAddresses(
                        [fromAddress],
                        BitcoinUtils.expandToDecimals(btcInputAmount, 8) + feeMin,
                        undefined,
                        parameters.optimize
                    );
                }

                if (!utxos || utxos.length === 0) {
                    throw new Error('No UTXOs available for funding transaction');
                }

                const fundingParams: IFundingTransactionParameters = {
                    amount: BitcoinUtils.expandToDecimals(btcInputAmount, 8),
                    utxos: utxos,
                    signer: userWallet.keypair,
                    mldsaSigner: userWallet.mldsaKeypair,
                    network: Web3API.network,
                    feeRate: parameters.feeRate,
                    priorityFee: 0n,
                    gasSatFee: 0n,
                    to: parameters.to,
                    from: fromAddress,
                    note: parameters.note,
                    splitInputsInto: parameters.splitInputsInto
                };

                // Create and sign the transaction (without broadcasting)
                const signedTx = await Web3API.transactionFactory.createBTCTransfer(fundingParams);

                // Decode the transaction to get actual fee data
                // Use signedTx.inputUtxos - these contain the actual UTXO values consumed
                // DO NOT use the original utxos array - txid/vout lookup is broken
                let decodedData: DecodedPreSignedData | null = null;
                let preSignedTxData: PreSignedTransactionData | null = null;

                try {
                    decodedData = decodeBitcoinTransfer(signedTx.tx, signedTx.inputUtxos, Web3API.network);

                    preSignedTxData = {
                        type: 'bitcoin_transfer',
                        createdAt: Date.now(),
                        transactions: decodedData.transactions,
                        totalMiningFee: decodedData.totalMiningFee,
                        opnetGasFee: 0n,
                        opnetEpochMinerOutput: null,
                        rawData: {
                            fundingTxHex: null,
                            interactionTxHex: null,
                            deploymentTxs: null,
                            bitcoinTxHex: signedTx.tx,
                            nextUTXOs: signedTx.nextUTXOs
                        }
                    };
                } catch (decodeError) {
                    console.warn('Failed to decode Bitcoin transfer:', decodeError);
                }

                // Cache the signed transaction
                setCachedBtcTx({
                    txHex: signedTx.tx,
                    utxos: utxos,
                    nextUtxos: signedTx.nextUTXOs,
                    createdAt: Date.now(),
                    decodedData,
                    preSignedTxData
                });
            } catch (e) {
                const error = e as Error;
                console.error('Pre-signing Bitcoin transfer failed:', error);
                setSigningError(error.message);
            } finally {
                setIsSigning(false);
            }
        };

        void preSignBitcoinTransfer();
    }, [rawTxInfo, wallet, getOPNetWallet]);

    const handleCancel = () => {
        // Clear cached pre-signed transaction on cancel
        setCachedSignedTx(null);
        setCachedBtcTx(null);
        window.history.go(-1);
    };

    // Clean up cached transaction on unmount (e.g., closing wallet, navigating away)
    useEffect(() => {
        return () => {
            // Clear cache on component unmount
            setCachedSignedTx(null);
            setCachedBtcTx(null);
        };
    }, []);

    const getPubKey = async (to: string) => {
        let pubKey: Address;
        const pubKeyStr: string = to.replace('0x', '');

        // Allow 32-byte hex (MLDSA public key hash), 33-byte (compressed pubkey), or 65-byte (uncompressed pubkey)
        if (
            (pubKeyStr.length === 64 || pubKeyStr.length === 66 || pubKeyStr.length === 130) &&
            pubKeyStr.match(/^[0-9a-fA-F]+$/) !== null
        ) {
            pubKey = Address.fromString(pubKeyStr);
        } else {
            pubKey = await Web3API.provider.getPublicKeyInfo(to, false);
        }

        if (!pubKey) throw new Error('public key not found');

        // Check for zero address (user not found on-chain)
        const pubKeyHex = pubKey.toHex ? pubKey.toHex() : pubKey.toString();
        if (pubKeyHex === '0x' + '00'.repeat(32) || pubKeyHex === '00'.repeat(32)) {
            throw new Error('User not found on-chain. This wallet has not performed any OPNet transactions yet.');
        }

        return pubKey;
    };

    const transferToken = async (parameters: TransferParameters) => {
        const currentWalletAddress = await wallet.getCurrentAccount();
        // Ensure inputAmount is bigint (navigation state may serialize it as string)
        const tokenInputAmount = BigInt(parameters.inputAmount);

        try {
            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            const symbol = cachedSignedTx.symbol || '';

            tools.toastSuccess(
                `You have successfully transferred ${BitcoinUtils.formatUnits(
                    tokenInputAmount,
                    parameters.tokens[0].divisibility
                )} ${symbol}`
            );

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.TOKEN_TRANSFER,
                from: currentWalletAddress.address,
                to: parameters.to,
                amount: tokenInputAmount.toString(),
                amountDisplay: `${BitcoinUtils.formatUnits(tokenInputAmount, parameters.tokens[0].divisibility)} ${symbol}`,
                tokenSymbol: symbol,
                tokenDecimals: parameters.tokens[0].divisibility,
                tokenAddress: parameters.contractAddress,
                contractAddress: parameters.contractAddress,
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate
            };
            void wallet.recordTransaction(txRecord);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.transactionId });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            // Clear cached transaction on error
            setCachedSignedTx(null);
            if (error.message.toLowerCase().includes('public key not found')) {
                setDisabled(false);
                navigate(RouteTypes.TxFailScreen, { error: Web3API.INVALID_PUBKEY_ERROR });
            } else {
                setDisabled(false);
                navigate(RouteTypes.TxFailScreen, { error: (e as Error).message });
            }
        }
    };

    const airdrop = async (parameters: AirdropParameters) => {
        const contractAddress = parameters.contractAddress;
        const currentWalletAddress = await wallet.getCurrentAccount();

        try {
            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            if (!sendTransaction?.transactionId) {
                setOpenLoading(false);
                setDisabled(false);
                setCachedSignedTx(null);
                tools.toastError(`Could not send transaction`);
                return;
            }

            const addressCount = Object.keys(parameters.amounts).length;
            tools.toastSuccess(`You have successfully airdropped tokens to ${addressCount} addresses`);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.OPNET_INTERACTION,
                from: currentWalletAddress.address,
                contractAddress: contractAddress,
                contractMethod: 'airdrop',
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate,
                note: `Airdrop to ${addressCount} addresses`
            };
            void wallet.recordTransaction(txRecord);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.transactionId, contractAddress: contractAddress });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            setCachedSignedTx(null);
            setDisabled(false);
            navigate(RouteTypes.TxFailScreen, { error: error.message });
        }
    };

    const sendBTC = async (parameters: SendBitcoinParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();
            // Ensure inputAmount is a number (navigation state may serialize it as string)
            const btcInputAmount = Number(parameters.inputAmount);

            // Check if we have a cached pre-signed transaction
            if (!cachedBtcTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration (2 minutes)
            if (Date.now() - cachedBtcTx.createdAt > PRESIGNED_DATA_EXPIRATION_MS) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast the pre-signed transaction
            const sendTransaction = await Web3API.provider.sendRawTransaction(cachedBtcTx.txHex, false);
            if (!sendTransaction.success) {
                setCachedBtcTx(null);
                setDisabled(false);
                tools.toastError(sendTransaction.error ?? 'Could not broadcast transaction');
                return;
            }

            const amountA = btcInputAmount.toLocaleString();
            const sourceLabel =
                parameters.sourceType === SourceType.CSV75
                    ? ' from CSV-75'
                    : parameters.sourceType === SourceType.CSV1
                      ? ' from CSV-1'
                      : parameters.sourceType === SourceType.CSV2
                        ? ' from CSV-2'
                        : '';
            tools.toastSuccess(`You have successfully transferred ${amountA} ${btcUnit}${sourceLabel}`);

            // Determine the from address for UTXO management
            let fromAddress = currentWalletAddress.address;
            if (parameters.from && parameters.sourceType && parameters.sourceType !== SourceType.CURRENT) {
                fromAddress = parameters.from;
            }

            // Update UTXO manager for the correct address
            Web3API.provider.utxoManager.spentUTXO(fromAddress, cachedBtcTx.utxos, cachedBtcTx.nextUtxos);

            // Record transaction in history with actual fee from decoded data
            const actualFee = cachedBtcTx.decodedData?.totalMiningFee ?? 0n;
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.result || '',
                type: TransactionType.BTC_TRANSFER,
                from: fromAddress,
                to: parameters.to,
                amount: BitcoinUtils.expandToDecimals(btcInputAmount, 8).toString(),
                amountDisplay: `${btcInputAmount} BTC`,
                fee: Number(actualFee),
                feeRate: parameters.feeRate
            };
            void wallet.recordTransaction(txRecord);

            // Register change address for cold storage withdrawal
            if (cachedBtcTx.isColdStorage) {
                try {
                    await wallet.registerColdStorageChangeAddress();
                } catch (err) {
                    console.warn('Failed to register cold storage change address:', err);
                }
            }

            // Mark addresses as consolidated after successful consolidation
            if (cachedBtcTx.isConsolidation && parameters.sourceAddresses) {
                try {
                    // Get consolidated amount from the actual transaction output
                    let consolidatedAmount = '0';
                    if (cachedBtcTx.decodedData?.transactions?.[0]) {
                        // Total output value is what was actually sent to cold storage
                        consolidatedAmount = cachedBtcTx.decodedData.transactions[0].totalOutputValue.toString();
                    }
                    await wallet.markAddressesConsolidated(parameters.sourceAddresses, consolidatedAmount);
                } catch (err) {
                    console.warn('Failed to mark addresses as consolidated:', err);
                }
            }

            // Clear cached transaction
            setCachedBtcTx(null);

            navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.result });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            setCachedBtcTx(null);
            setDisabled(false);
            navigate(RouteTypes.TxFailScreen, { error: error.message });
        }
    };

    const deployContract = async (parameters: DeployContractParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();
            const userWallet = await getOPNetWallet();
            // Ensure bigint values are properly converted (navigation state may serialize them as strings)
            const deployPriorityFee = BigInt(parameters.priorityFee ?? 0);
            const deployGasSatFee = BigInt(parameters.gasSatFee ?? 10_000);

            const utxos: UTXO[] = await Web3API.getAllUTXOsForAddresses([currentWalletAddress.address], 1_000_000n); // maximum fee a contract can pay

            const arrayBuffer = await parameters.file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const challenge = await Web3API.provider.getChallenge();
            const calldata = parameters.calldataHex ? Buffer.from(parameters.calldataHex, 'hex') : Buffer.from([]);

            // TODO: Add calldata support
            const deploymentParameters: IDeploymentParameters = {
                challenge,
                utxos: utxos,
                signer: userWallet.keypair,
                mldsaSigner: userWallet.mldsaKeypair,
                network: Web3API.network,
                feeRate: parameters.feeRate,
                priorityFee: deployPriorityFee,
                gasSatFee: deployGasSatFee,
                from: currentWalletAddress.address,
                bytecode: Buffer.from(uint8Array),
                calldata: calldata,
                optionalInputs: [],
                optionalOutputs: [],
                note: parameters.note,
                linkMLDSAPublicKeyToAddress: true
            };

            const sendTransact: DeploymentResult =
                await Web3API.transactionFactory.signDeployment(deploymentParameters);

            const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact.transaction[0], false);
            if (!firstTransaction.success) {
                setDisabled(false);
                tools.toastError(firstTransaction.error ?? 'Could not broadcast first transaction');
                return;
            }

            setLoadingMessage(`Deployment in progress.. This might take a while.`);
            setDeploymentContract(sendTransact);

            // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
            const secondTransaction = await Web3API.provider.sendRawTransaction(sendTransact.transaction[1], false);
            if (secondTransaction.result && !secondTransaction.error && secondTransaction.success) {
                Web3API.provider.utxoManager.spentUTXO(currentWalletAddress.address, utxos, sendTransact.utxos);

                await waitForTransaction(secondTransaction.result, setOpenLoading, tools);

                const getChain = await wallet.getChainType();
                const key = `opnetTokens_${getChain}_${currentWalletAddress.pubkey}`;
                const tokensImported = localStorage.getItem(key);
                let updatedTokens: string[] = tokensImported ? (JSON.parse(tokensImported) as string[]) : [];
                if (tokensImported) {
                    updatedTokens = JSON.parse(tokensImported) as string[];
                }

                if (!updatedTokens.includes(sendTransact.contractAddress)) {
                    updatedTokens.push(sendTransact.contractAddress);
                    localStorage.setItem(key, JSON.stringify(updatedTokens));
                }

                tools.toastSuccess(`You have successfully deployed ${sendTransact.contractAddress}`);

                // Record transaction in history
                const txRecord: RecordTransactionInput = {
                    txid: secondTransaction.result || '',
                    fundingTxid: firstTransaction.result,
                    type: TransactionType.CONTRACT_DEPLOYMENT,
                    from: currentWalletAddress.address,
                    contractAddress: sendTransact.contractAddress,
                    fee: Number(parameters.priorityFee || 0),
                    feeRate: parameters.feeRate
                };
                void wallet.recordTransaction(txRecord);

                navigate(RouteTypes.TxSuccessScreen, {
                    txid: secondTransaction.result,
                    contractAddress: sendTransact.contractAddress
                });
            } else {
                tools.toastError(secondTransaction.error ?? 'Could not broadcast second transaction');

                setOpenLoading(false);
                setDisabled(false);
            }
        } catch (e) {
            console.log(e);
            tools.toastError(`Error: ${e}`);
            setDisabled(false);
        } finally {
            setLoadingMessage(defaultMessage);
        }
    };

    const mint = async (parameters: MintParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();
            // Ensure inputAmount is a number (navigation state may serialize it as string)
            const mintInputAmount = Number(parameters.inputAmount);

            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            if (!sendTransaction.transactionId) {
                setCachedSignedTx(null);
                tools.toastError(`Could not send transaction`);
                return;
            }

            const symbol = cachedSignedTx.symbol || parameters.tokens[0].symbol;
            tools.toastSuccess(`You have successfully minted ${mintInputAmount} ${symbol}`);

            const value = BitcoinUtils.expandToDecimals(mintInputAmount, parameters.tokens[0].divisibility);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.OPNET_INTERACTION,
                from: currentWalletAddress.address,
                to: parameters.to,
                amount: value.toString(),
                amountDisplay: `${mintInputAmount} ${symbol}`,
                tokenSymbol: symbol,
                tokenDecimals: parameters.tokens[0].divisibility,
                contractAddress: parameters.contractAddress,
                contractMethod: 'mint',
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate
            };
            void wallet.recordTransaction(txRecord);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.transactionId });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            setCachedSignedTx(null);
            setDisabled(false);
            navigate(RouteTypes.TxFailScreen, { error: error.message });
        }
    };

    const sendNFT = async (parameters: SendNFTParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();

            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            if (!sendTransaction?.transactionId) {
                setOpenLoading(false);
                setDisabled(false);
                setCachedSignedTx(null);
                tools.toastError('Could not send NFT transaction');
                return;
            }

            tools.toastSuccess(`Successfully transferred NFT #${parameters.tokenId} from ${parameters.collectionName}`);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.TOKEN_TRANSFER,
                from: currentWalletAddress.address,
                to: parameters.to,
                amount: '1',
                amountDisplay: `NFT #${parameters.tokenId}`,
                tokenSymbol: parameters.collectionName,
                contractAddress: parameters.collectionAddress,
                contractMethod: 'safeTransferFrom',
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate,
                note: `NFT #${parameters.tokenId} from ${parameters.collectionName}`
            };
            void wallet.recordTransaction(txRecord);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, {
                txid: sendTransaction.transactionId,
                nftTransfer: true,
                tokenId: parameters.tokenId.toString(),
                collectionName: parameters.collectionName
            });
        } catch (e) {
            const error = e as Error;
            setOpenLoading(false);
            console.error(e);
            setCachedSignedTx(null);
            if (error.message.toLowerCase().includes('public key not found')) {
                setDisabled(false);
                navigate(RouteTypes.TxFailScreen, { error: Web3API.INVALID_PUBKEY_ERROR });
            } else {
                setDisabled(false);
                navigate(RouteTypes.TxFailScreen, { error: error.message });
            }
        }
    };

    const registerDomain = async (parameters: RegisterDomainParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();

            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            if (!sendTransaction?.transactionId) {
                setOpenLoading(false);
                setDisabled(false);
                setCachedSignedTx(null);
                tools.toastError('Could not register domain');
                return;
            }

            tools.toastSuccess(`Successfully registered ${parameters.domainName}.btc!`);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.OPNET_INTERACTION,
                from: currentWalletAddress.address,
                contractMethod: 'registerDomain',
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate,
                note: `Register domain ${parameters.domainName}.btc`
            };
            void wallet.recordTransaction(txRecord);

            // Add domain to tracked domains
            void wallet.addTrackedDomain(parameters.domainName);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, {
                txid: sendTransaction.transactionId,
                domainRegistered: parameters.domainName
            });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            setCachedSignedTx(null);
            setDisabled(false);
            navigate(RouteTypes.TxFailScreen, { error: error.message });
        }
    };

    const publishDomainWebsite = async (parameters: PublishDomainParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();

            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            if (!sendTransaction?.transactionId) {
                setOpenLoading(false);
                setDisabled(false);
                setCachedSignedTx(null);
                tools.toastError('Could not publish website');
                return;
            }

            tools.toastSuccess(`Successfully published website to ${parameters.domainName}.btc!`);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.OPNET_INTERACTION,
                from: currentWalletAddress.address,
                contractMethod: 'setContenthash',
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate,
                note: `Publish to ${parameters.domainName}.btc: ${parameters.cid.slice(0, 20)}...`
            };
            void wallet.recordTransaction(txRecord);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, {
                txid: sendTransaction.transactionId,
                domainPublished: parameters.domainName
            });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            setCachedSignedTx(null);
            setDisabled(false);
            navigate(RouteTypes.TxFailScreen, { error: error.message });
        }
    };

    const initiateDomainTransfer = async (parameters: InitiateDomainTransferParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();

            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            if (!sendTransaction?.transactionId) {
                setOpenLoading(false);
                setDisabled(false);
                setCachedSignedTx(null);
                tools.toastError('Could not initiate domain transfer');
                return;
            }

            tools.toastSuccess(`Transfer initiated for ${parameters.domainName}.btc! Awaiting recipient to accept.`);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.OPNET_INTERACTION,
                from: currentWalletAddress.address,
                contractMethod: 'initiateTransfer',
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate,
                note: `Initiate transfer of ${parameters.domainName}.btc to ${parameters.newOwner.slice(0, 10)}...`
            };
            void wallet.recordTransaction(txRecord);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, {
                txid: sendTransaction.transactionId,
                domainTransferInitiated: parameters.domainName
            });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            setCachedSignedTx(null);
            setDisabled(false);
            navigate(RouteTypes.TxFailScreen, { error: error.message });
        }
    };

    const acceptDomainTransfer = async (parameters: AcceptDomainTransferParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();

            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            if (!sendTransaction?.transactionId) {
                setOpenLoading(false);
                setDisabled(false);
                setCachedSignedTx(null);
                tools.toastError('Could not accept domain transfer');
                return;
            }

            tools.toastSuccess(`Successfully accepted ${parameters.domainName}.btc! You are now the owner.`);

            // Add domain to tracked domains
            void wallet.addTrackedDomain(parameters.domainName);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.OPNET_INTERACTION,
                from: currentWalletAddress.address,
                contractMethod: 'acceptTransfer',
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate,
                note: `Accept transfer of ${parameters.domainName}.btc`
            };
            void wallet.recordTransaction(txRecord);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, {
                txid: sendTransaction.transactionId,
                domainTransferAccepted: parameters.domainName
            });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            setCachedSignedTx(null);
            setDisabled(false);
            navigate(RouteTypes.TxFailScreen, { error: error.message });
        }
    };

    const cancelDomainTransfer = async (parameters: CancelDomainTransferParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();

            // Check if we have a cached pre-signed transaction
            if (!cachedSignedTx) {
                throw new Error('No pre-signed transaction available. Please try again.');
            }

            // Check expiration
            if (isPreSignedExpired()) {
                throw new Error('Pre-signed transaction expired. Please go back and try again.');
            }

            // Broadcast using the cached pre-signed transaction
            const sendTransaction = await cachedSignedTx.simulation.sendPresignedTransaction(cachedSignedTx.signedTx);
            if (!sendTransaction?.transactionId) {
                setOpenLoading(false);
                setDisabled(false);
                setCachedSignedTx(null);
                tools.toastError('Could not cancel domain transfer');
                return;
            }

            tools.toastSuccess(`Transfer cancelled for ${parameters.domainName}.btc`);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.OPNET_INTERACTION,
                from: currentWalletAddress.address,
                contractMethod: 'cancelTransfer',
                fee: Number(parameters.priorityFee || 0),
                feeRate: parameters.feeRate,
                note: `Cancel transfer of ${parameters.domainName}.btc`
            };
            void wallet.recordTransaction(txRecord);

            // Clear cached transaction
            setCachedSignedTx(null);

            navigate(RouteTypes.TxSuccessScreen, {
                txid: sendTransaction.transactionId,
                domainTransferCancelled: parameters.domainName
            });
        } catch (e) {
            const error = e as Error;
            console.error(e);
            setCachedSignedTx(null);
            setDisabled(false);
            navigate(RouteTypes.TxFailScreen, { error: error.message });
        }
    };

    // Get action label
    const getActionLabel = () => {
        switch (rawTxInfo.action) {
            case Action.SendBitcoin:
                return 'Send Bitcoin';
            case Action.DeployContract:
                return 'Deploy Contract';
            case Action.SendNFT:
                return 'Send NFT';
            case Action.Mint:
                return 'Mint Tokens';
            case Action.Airdrop:
                return 'Airdrop Tokens';
            case Action.Transfer:
                return 'Token Transfer';
            case Action.RegisterDomain:
                return 'Register Domain';
            case Action.PublishDomain:
                return 'Publish Website';
            case Action.InitiateDomainTransfer:
                return 'Transfer Domain';
            case Action.AcceptDomainTransfer:
                return 'Accept Domain Transfer';
            case Action.CancelDomainTransfer:
                return 'Cancel Domain Transfer';
            default:
                return 'Transaction';
        }
    };

    const getActionIcon = () => {
        const iconStyle = { fontSize: '20px', color: colors.text };
        switch (rawTxInfo.action) {
            case Action.SendBitcoin:
                return <DollarOutlined style={iconStyle} />;
            case Action.DeployContract:
                return <RocketOutlined style={iconStyle} />;
            case Action.Mint:
                return <DollarOutlined style={iconStyle} />;
            case Action.Airdrop:
                return <GiftOutlined style={iconStyle} />;
            case Action.Transfer:
                return <ArrowRightOutlined style={iconStyle} />;
            case Action.SendNFT:
                return <PictureOutlined style={iconStyle} />;
            case Action.RegisterDomain:
                return <GlobalOutlined style={iconStyle} />;
            case Action.PublishDomain:
                return <CloudUploadOutlined style={iconStyle} />;
            case Action.InitiateDomainTransfer:
                return <SwapOutlined style={iconStyle} />;
            case Action.AcceptDomainTransfer:
                return <CheckCircleOutlined style={iconStyle} />;
            case Action.CancelDomainTransfer:
                return <CloseCircleOutlined style={iconStyle} />;
            default:
                return <FileTextOutlined style={iconStyle} />;
        }
    };

    return (
        <Layout>
            <Header onBack={handleCancel} title={`Confirm ${getActionLabel()}`} />

            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* Signing in Progress Indicator */}
                    {isSigning && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '24px',
                                background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                                border: `1px solid ${colors.main}30`,
                                borderRadius: '12px',
                                marginBottom: '12px'
                            }}>
                            <LoadingOutlined
                                spin
                                style={{
                                    fontSize: 32,
                                    color: colors.main,
                                    marginBottom: '12px'
                                }}
                            />
                            <Text text="Building transaction..." size="md" style={{ color: colors.text }} />
                            <Text
                                text="Please wait while we prepare your transaction for preview"
                                size="sm"
                                style={{ color: colors.textFaded, marginTop: '4px', textAlign: 'center' }}
                            />
                            {/* Safety Message */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginTop: '12px',
                                    padding: '8px 12px',
                                    background: `${colors.success}15`,
                                    border: `1px solid ${colors.success}30`,
                                    borderRadius: '8px'
                                }}>
                                <SafetyCertificateOutlined
                                    style={{
                                        fontSize: 14,
                                        color: colors.success
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: colors.success,
                                        fontWeight: 500
                                    }}>
                                    Safe - will not broadcast until you confirm
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Signing Error */}
                    {signingError && (
                        <div
                            style={{
                                display: 'flex',
                                gap: '10px',
                                padding: '14px',
                                background: `${colors.error}15`,
                                border: `1px solid ${colors.error}40`,
                                borderRadius: '12px',
                                marginBottom: '12px'
                            }}>
                            <WarningOutlined
                                style={{
                                    fontSize: 18,
                                    color: colors.error,
                                    flexShrink: 0,
                                    marginTop: '2px'
                                }}
                            />
                            <div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        color: colors.error,
                                        fontWeight: 600,
                                        marginBottom: '4px'
                                    }}>
                                    Signing Failed
                                </div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        lineHeight: '1.4'
                                    }}>
                                    {signingError}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transaction Type Card - Compact */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                            border: `1px solid ${colors.main}30`,
                            borderRadius: '10px',
                            padding: '10px 12px',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                        <div
                            style={{
                                fontSize: '20px',
                                color: colors.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                            {getActionIcon()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: colors.text
                                }}>
                                {getActionLabel()}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded
                                }}>
                                {isSigning ? 'Preparing...' : signingError ? 'Signing failed' : 'Review details below'}
                            </div>
                        </div>
                    </div>

                    {/* Transaction Flow Visualization - Collapsible */}
                    {(cachedSignedTx?.preSignedTxData || cachedBtcTx?.preSignedTxData) && !isSigning && (
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                borderRadius: '10px',
                                marginBottom: '12px',
                                overflow: 'hidden'
                            }}>
                            {/* Collapsible Header */}
                            <div
                                onClick={() => setIsTxFlowExpanded(!isTxFlowExpanded)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isTxFlowExpanded ? (
                                        <DownOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                                    ) : (
                                        <RightOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                                    )}
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                                        Transaction Flow
                                    </span>
                                </div>
                                <span style={{ fontSize: '10px', color: colors.textFaded }}>
                                    {isTxFlowExpanded ? 'Collapse' : 'Expand'}
                                </span>
                            </div>
                            {/* Collapsible Content */}
                            {isTxFlowExpanded && (
                                <div style={{ padding: '0 12px 12px 12px' }}>
                                    <OPNetTxFlowPreview
                                        preSignedData={cachedSignedTx?.preSignedTxData || cachedBtcTx?.preSignedTxData || null}
                                        isLoading={false}
                                        width={316}
                                        showTooltip={true}
                                        compact={true}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fee Details - Show actual values if pre-signed, otherwise estimates */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '12px'
                        }}>
                        <div
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <DollarOutlined style={{ fontSize: 14, color: colors.main }} />
                                Fee Breakdown
                            </div>
                            {(cachedSignedTx?.decodedData || cachedBtcTx?.decodedData) ? (
                                <span style={{ fontSize: '9px', color: colors.success, fontWeight: 500 }}>
                                    ACTUAL
                                </span>
                            ) : (
                                <span style={{ fontSize: '9px', color: colors.warning, fontWeight: 500 }}>
                                    {isSigning ? 'CALCULATING...' : 'ESTIMATE'}
                                </span>
                            )}
                        </div>

                        {/* Mining Fee (inputs - outputs) - Actual value when available */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px',
                                background: colors.inputBg,
                                borderRadius: '8px',
                                marginBottom: '8px'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ThunderboltOutlined style={{ fontSize: 14, color: colors.warning }} />
                                <div>
                                    <span style={{ fontSize: '13px', color: colors.text }}>Mining Fee</span>
                                    <div style={{ fontSize: '9px', color: colors.textFaded }}>
                                        Paid to Bitcoin miners
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div>
                                    <span
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: (cachedSignedTx?.decodedData || cachedBtcTx?.decodedData) ? colors.success : colors.text
                                        }}>
                                        {cachedSignedTx?.decodedData
                                            ? cachedSignedTx.decodedData.totalMiningFee.toString()
                                            : cachedBtcTx?.decodedData
                                              ? cachedBtcTx.decodedData.totalMiningFee.toString()
                                              : rawTxInfo.priorityFee.toString()}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.textFaded,
                                            marginLeft: '4px'
                                        }}>
                                        sat
                                    </span>
                                </div>
                                {btcPrice > 0 && (
                                    <div style={{ fontSize: '10px', color: colors.textFaded }}>
                                        ${(Number(cachedSignedTx?.decodedData?.totalMiningFee ?? cachedBtcTx?.decodedData?.totalMiningFee ?? rawTxInfo.priorityFee) / 1e8 * btcPrice).toFixed(2)} USD
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* OPNet Gas Fee (First output of interaction TX) - Actual value when available */}
                        {(cachedSignedTx?.decodedData?.opnetGasFee || rawTxInfo.gasSatFee) && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px',
                                    background: colors.inputBg,
                                    borderRadius: '8px',
                                    marginBottom: '8px'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RocketOutlined style={{ fontSize: 14, color: '#ff6b6b' }} />
                                    <div>
                                        <span style={{ fontSize: '13px', color: colors.text }}>OPNet Gas Fee</span>
                                        <div style={{ fontSize: '9px', color: colors.textFaded }}>
                                            Paid to Epoch Miner
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div>
                                        <span
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: cachedSignedTx?.decodedData ? colors.success : colors.text
                                            }}>
                                            {cachedSignedTx?.decodedData
                                                ? cachedSignedTx.decodedData.opnetGasFee.toString()
                                                : rawTxInfo.gasSatFee?.toString() ?? '0'}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                color: colors.textFaded,
                                                marginLeft: '4px'
                                            }}>
                                            sat
                                        </span>
                                    </div>
                                    {btcPrice > 0 && (
                                        <div style={{ fontSize: '10px', color: colors.textFaded }}>
                                            ${(Number(cachedSignedTx?.decodedData?.opnetGasFee ?? rawTxInfo.gasSatFee ?? 0) / 1e8 * btcPrice).toFixed(2)} USD
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fee Rate */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px',
                                background: colors.inputBg,
                                borderRadius: '8px'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', color: colors.textFaded }}>Fee Rate</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: colors.text
                                    }}>
                                    {rawTxInfo.feeRate}
                                </span>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: colors.textFaded,
                                        marginLeft: '4px'
                                    }}>
                                    sat/vB
                                </span>
                            </div>
                        </div>

                        {/* Total Transaction Cost */}
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '12px',
                                background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                                border: `1px solid ${colors.main}30`,
                                borderRadius: '8px'
                            }}>
                            <div style={{ textAlign: 'center', marginBottom: outputAnalysis.changeOutputs.length > 0 || outputAnalysis.externalOutputs.length > 0 ? '10px' : '0' }}>
                                <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    Total Transaction Cost
                                    {outputAnalysis.isActual ? (
                                        <span style={{ fontSize: '9px', color: colors.success, fontWeight: 600 }}>ACTUAL</span>
                                    ) : (
                                        <span style={{ fontSize: '9px', color: colors.warning, fontWeight: 600 }}>~EST</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: colors.main }}>
                                    {(outputAnalysis.totalCost / 1e8).toFixed(8).replace(/\.?0+$/, '')} {btcUnit}
                                    {btcPrice > 0 && (
                                        <span style={{ fontSize: '12px', color: colors.textFaded, marginLeft: '8px', fontWeight: 500 }}>
                                            (${(outputAnalysis.totalCost / 1e8 * btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Refund Info */}
                            {outputAnalysis.changeOutputs.length > 0 && (
                                <div
                                    style={{
                                        padding: '8px 10px',
                                        background: `${colors.success}10`,
                                        border: `1px solid ${colors.success}25`,
                                        borderRadius: '8px',
                                        marginBottom: outputAnalysis.externalOutputs.length > 0 ? '8px' : '0'
                                    }}>
                                    <div style={{ fontSize: '10px', color: colors.textFaded, marginBottom: '4px' }}>
                                        Refund to your address{outputAnalysis.changeOutputs.length > 1 ? 'es' : ''}
                                    </div>
                                    {outputAnalysis.changeOutputs.map((output, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginTop: idx > 0 ? '4px' : '0'
                                            }}>
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    color: colors.success,
                                                    fontFamily: 'monospace',
                                                    fontWeight: 500
                                                }}
                                                title={output.address}>
                                                {output.address.length > 16 ? `${output.address.slice(0, 8)}...${output.address.slice(-8)}` : output.address}
                                            </span>
                                            <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>
                                                +{(Number(output.value) / 1e8).toFixed(8).replace(/\.?0+$/, '')} {btcUnit}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* External Outputs (e.g., domain treasury payment) */}
                            {outputAnalysis.externalOutputs.length > 0 && (
                                <div
                                    style={{
                                        padding: '8px 10px',
                                        background: '#fbbf2415',
                                        border: '1px solid #fbbf2430',
                                        borderRadius: '8px'
                                    }}>
                                    <div
                                        style={{
                                            fontSize: '10px',
                                            color: '#fbbf24',
                                            marginBottom: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                        <WarningOutlined style={{ fontSize: 10 }} />
                                        External output{outputAnalysis.externalOutputs.length > 1 ? 's' : ''} (not your address)
                                    </div>
                                    {outputAnalysis.externalOutputs.map((output, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginTop: idx > 0 ? '4px' : '0'
                                            }}>
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    color: '#fbbf24',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 500
                                                }}
                                                title={output.address}>
                                                {output.address.length > 16 ? `${output.address.slice(0, 8)}...${output.address.slice(-8)}` : output.address}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
                                                -{(Number(output.value) / 1e8).toFixed(8).replace(/\.?0+$/, '')} {btcUnit}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Features */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '12px'
                        }}>
                        <div
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <SafetyOutlined style={{ fontSize: 14, color: colors.main }} />
                            Transaction Features
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {rawTxInfo.features.rbf && (
                                <div
                                    style={{
                                        padding: '6px 12px',
                                        background: `${colors.success}20`,
                                        border: `1px solid ${colors.success}40`,
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                    <CheckCircleOutlined style={{ fontSize: 12, color: colors.success }} />
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            color: colors.success,
                                            fontWeight: 600
                                        }}>
                                        RBF Enabled
                                    </span>
                                </div>
                            )}

                            {rawTxInfo.features.taproot && (
                                <div
                                    style={{
                                        padding: '6px 12px',
                                        background: `${colors.main}20`,
                                        border: `1px solid ${colors.main}40`,
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                    <CheckCircleOutlined style={{ fontSize: 12, color: colors.main }} />
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            color: colors.main,
                                            fontWeight: 600
                                        }}>
                                        Taproot
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Spacer for fixed footer */}
                    <div style={{ height: '70px' }} />
                </Column>
            </Content>

            {/* Fixed Footer */}
            <Footer
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px',
                    background: colors.background,
                    borderTop: `1px solid ${colors.containerBorder}`
                }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: colors.buttonHoverBg,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '10px',
                            color: colors.text,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={handleCancel}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}>
                        Reject
                    </button>
                    <button
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: disabled || isSigning || signingError ? colors.buttonBg : colors.main,
                            border: 'none',
                            borderRadius: '10px',
                            color: disabled || isSigning || signingError ? colors.textFaded : colors.background,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: disabled || isSigning || signingError ? 'not-allowed' : 'pointer',
                            opacity: disabled || isSigning || signingError ? 0.5 : 1,
                            transition: 'all 0.15s'
                        }}
                        disabled={disabled || isSigning || !!signingError || (rawTxInfo.action === Action.SendBitcoin && !cachedBtcTx)}
                        onClick={async () => {
                            setDisabled(true);
                            switch (rawTxInfo.action) {
                                case Action.SendBitcoin:
                                    await sendBTC(rawTxInfo);
                                    break;
                                case Action.DeployContract:
                                    await deployContract(rawTxInfo);
                                    break;
                                case Action.SendNFT:
                                    await sendNFT(rawTxInfo);
                                    break;
                                case Action.Mint:
                                    await mint(rawTxInfo);
                                    break;
                                case Action.Airdrop:
                                    if (!('amounts' in rawTxInfo)) {
                                        throw new Error('Amounts not found');
                                    }

                                    await airdrop(rawTxInfo);
                                    break;
                                case Action.Transfer: {
                                    if (!('contractAddress' in rawTxInfo)) {
                                        tools.toastError('Contract address not found');
                                        return;
                                    }

                                    if (!('to' in rawTxInfo)) {
                                        tools.toastError('Destination address not found');
                                        return;
                                    }

                                    await transferToken(rawTxInfo);
                                    break;
                                }
                                case Action.RegisterDomain:
                                    await registerDomain(rawTxInfo);
                                    break;
                                case Action.PublishDomain:
                                    await publishDomainWebsite(rawTxInfo);
                                    break;
                                case Action.InitiateDomainTransfer:
                                    await initiateDomainTransfer(rawTxInfo);
                                    break;
                                case Action.AcceptDomainTransfer:
                                    await acceptDomainTransfer(rawTxInfo);
                                    break;
                                case Action.CancelDomainTransfer:
                                    await cancelDomainTransfer(rawTxInfo);
                                    break;
                            }
                        }}
                        onMouseEnter={(e) => {
                            if (!disabled && !isSigning && !signingError) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        {isSigning ? 'Signing...' : 'Confirm & Send'}
                    </button>
                </div>
            </Footer>

            {/* Loading Modal */}
            {openLoading && (
                <BottomModal
                    onClose={() => {
                        setDisabled(false);
                        setOpenLoading(false);
                    }}>
                    <Column
                        style={{
                            padding: '24px',
                            alignItems: 'center',
                            textAlign: 'center'
                        }}>
                        <LoadingOutlined
                            spin
                            style={{
                                fontSize: 32,
                                color: colors.main,
                                marginBottom: '16px'
                            }}
                        />

                        <Text text={loadingMessage} size="md" style={{ marginBottom: '16px' }} />

                        {deploymentContract && (
                            <div
                                style={{
                                    padding: '12px',
                                    background: colors.containerBgFaded,
                                    borderRadius: '10px',
                                    width: '100%',
                                    marginTop: '12px'
                                }}>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: colors.textFaded,
                                        marginBottom: '6px'
                                    }}>
                                    Contract Address
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            color: colors.text,
                                            fontFamily: 'monospace',
                                            wordBreak: 'break-all',
                                            flex: 1
                                        }}>
                                        {deploymentContract.contractAddress}
                                    </span>
                                    <CopyOutlined
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(deploymentContract.contractAddress);
                                            tools.toastSuccess('Copied!');
                                        }}
                                        style={{
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            color: colors.main
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </Column>
                </BottomModal>
            )}
        </Layout>
    );
}
