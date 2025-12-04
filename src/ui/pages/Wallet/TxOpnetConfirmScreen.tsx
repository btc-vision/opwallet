import { ParsedTransaction, ParsedTxOutput, PRESIGNED_DATA_EXPIRATION_MS, PreSignedTransactionData } from '@/background/service/notification';
import {
    Action,
    AirdropParameters,
    DeployContractParameters,
    MintParameters,
    RawTxInfo,
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
    CopyOutlined,
    DollarOutlined,
    FileTextOutlined,
    GiftOutlined,
    LoadingOutlined,
    PictureOutlined,
    RocketOutlined,
    SafetyCertificateOutlined,
    SafetyOutlined,
    ThunderboltOutlined,
    WarningOutlined
} from '@ant-design/icons';
import {
    ABIDataTypes,
    Address,
    AddressMap,
    AddressTypes,
    AddressVerificator,
    DeploymentResult,
    IDeploymentParameters,
    IFundingTransactionParameters,
    MLDSASecurityLevel,
    UTXO,
    Wallet
} from '@btc-vision/transaction';
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
    TransactionParameters
} from 'opnet';
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteTypes, useNavigate } from '../MainRoute';

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

    useEffect(() => {
        const setWallet = async () => {
            await Web3API.setNetwork(await wallet.getChainType());
        };
        void setWallet();
    });

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
        // Only pre-sign for OPNet interactions (Transfer, Mint, Airdrop, SendNFT)
        const supportedActions = [Action.Transfer, Action.Mint, Action.Airdrop, Action.SendNFT];
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

                const interactionParameters: TransactionParameters = {
                    signer: userWallet.keypair,
                    mldsaSigner: userWallet.mldsaKeypair,
                    refundTo: currentWalletAddress.address,
                    maximumAllowedSatToSpend: rawTxInfo.priorityFee,
                    feeRate: rawTxInfo.feeRate,
                    network: Web3API.network,
                    priorityFee: rawTxInfo.priorityFee,
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
                        simulation = await contract.safeTransfer(address, rawTxInfo.inputAmount, new Uint8Array());
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
                        simulation = await contract.safeTransferFrom(
                            userWallet.address,
                            recipientAddress,
                            rawTxInfo.tokenId,
                            new Uint8Array()
                        );
                        symbol = rawTxInfo.collectionName;
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
                    decodedData = decodeSignedInteractionReceipt(
                        signedTx.fundingTransactionRaw,
                        signedTx.interactionTransactionRaw,
                        signedTx.fundingUTXOs,
                        signedTx.nextUTXOs,
                        Web3API.network
                    );

                    // Build PreSignedTransactionData for OPNetTxFlowPreview
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
                            BitcoinUtils.expandToDecimals(parameters.inputAmount, 8) + feeMin,
                            75n,
                            parameters.optimize
                        );
                    } else if (parameters.sourceType === SourceType.CSV1) {
                        const csv1Address = currentAddress.toCSV(1, Web3API.network);
                        fromAddress = csv1Address.address;
                        witnessScript = csv1Address.witnessScript;
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            [fromAddress],
                            BitcoinUtils.expandToDecimals(parameters.inputAmount, 8) + feeMin,
                            1n,
                            parameters.optimize
                        );
                    } else if (parameters.sourceType === SourceType.CSV2) {
                        const csv2Address = currentAddress.toCSV(2, Web3API.network);
                        fromAddress = csv2Address.address;
                        witnessScript = csv2Address.witnessScript;
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            [fromAddress],
                            BitcoinUtils.expandToDecimals(parameters.inputAmount, 8) + feeMin,
                            2n,
                            parameters.optimize
                        );
                    } else if (parameters.sourceType === SourceType.P2WDA) {
                        const p2wdaAddress = currentAddress.p2wda(Web3API.network);
                        fromAddress = p2wdaAddress.address;
                        witnessScript = p2wdaAddress.witnessScript;
                        utxos = await Web3API.getAllUTXOsForAddresses(
                            [fromAddress],
                            BitcoinUtils.expandToDecimals(parameters.inputAmount, 8) + feeMin,
                            undefined,
                            parameters.optimize
                        );
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
                        BitcoinUtils.expandToDecimals(parameters.inputAmount, 8) + feeMin,
                        undefined,
                        parameters.optimize
                    );
                }

                if (!utxos || utxos.length === 0) {
                    throw new Error('No UTXOs available for funding transaction');
                }

                const fundingParams: IFundingTransactionParameters = {
                    amount: BitcoinUtils.expandToDecimals(parameters.inputAmount, 8),
                    utxos: utxos,
                    signer: userWallet.keypair,
                    mldsaSigner: userWallet.mldsaKeypair,
                    network: Web3API.network,
                    feeRate: parameters.feeRate,
                    priorityFee: 0n,
                    gasSatFee: 0n,
                    to: parameters.to,
                    from: fromAddress,
                    note: parameters.note
                };

                // Create and sign the transaction (without broadcasting)
                const signedTx = await Web3API.transactionFactory.createBTCTransfer(fundingParams);

                // Decode the transaction to get actual fee data
                let decodedData: DecodedPreSignedData | null = null;
                let preSignedTxData: PreSignedTransactionData | null = null;

                try {
                    decodedData = decodeBitcoinTransfer(signedTx.tx, utxos, Web3API.network);

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
                    parameters.inputAmount,
                    parameters.tokens[0].divisibility
                )} ${symbol}`
            );

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.TOKEN_TRANSFER,
                from: currentWalletAddress.address,
                to: parameters.to,
                amount: parameters.inputAmount.toString(),
                amountDisplay: `${BitcoinUtils.formatUnits(parameters.inputAmount, parameters.tokens[0].divisibility)} ${symbol}`,
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

            const amountA = parameters.inputAmount.toLocaleString();
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
                amount: BitcoinUtils.expandToDecimals(parameters.inputAmount, 8).toString(),
                amountDisplay: `${parameters.inputAmount} BTC`,
                fee: Number(actualFee),
                feeRate: parameters.feeRate
            };
            void wallet.recordTransaction(txRecord);

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
                priorityFee: parameters.priorityFee ?? 0n,
                gasSatFee: parameters.gasSatFee ?? 10_000n,
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
            tools.toastSuccess(`You have successfully minted ${parameters.inputAmount} ${symbol}`);

            const value = BitcoinUtils.expandToDecimals(parameters.inputAmount, parameters.tokens[0].divisibility);

            // Record transaction in history
            const txRecord: RecordTransactionInput = {
                txid: sendTransaction.transactionId || '',
                type: TransactionType.OPNET_INTERACTION,
                from: currentWalletAddress.address,
                to: parameters.to,
                amount: value.toString(),
                amountDisplay: `${parameters.inputAmount} ${symbol}`,
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

                    {/* Transaction Flow Visualization - Only show when we have pre-signed data */}
                    {(cachedSignedTx?.preSignedTxData || cachedBtcTx?.preSignedTxData) && !isSigning && (
                        <div style={{ marginBottom: '12px' }}>
                            <OPNetTxFlowPreview
                                preSignedData={cachedSignedTx?.preSignedTxData || cachedBtcTx?.preSignedTxData || null}
                                isLoading={false}
                                width={340}
                                showTooltip={true}
                                compact={true}
                                title="Transaction Flow"
                            />
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
