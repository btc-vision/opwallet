import {
    Action,
    AirdropParameters,
    DeployContractParameters,
    MintParameters,
    RawTxInfo,
    SendBitcoinParameters,
    SourceType,
    SwapParameters,
    TransferParameters
} from '@/shared/interfaces/RawTxParameters';
import Web3API from '@/shared/web3/Web3API';
import { Column, Content, Footer, Header, Layout, Text } from '@/ui/components';
import { ContextType, useTools } from '@/ui/components/ActionComponent';
import { BottomModal } from '@/ui/components/BottomModal';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useLocationState, useWallet } from '@/ui/utils';
import {
    CheckCircleOutlined,
    CopyOutlined,
    DollarOutlined,
    LoadingOutlined,
    RocketOutlined,
    SafetyOutlined,
    ThunderboltOutlined,
    WarningOutlined
} from '@ant-design/icons';
import {
    ABIDataTypes,
    Address,
    AddressMap,
    DeploymentResult,
    IDeploymentParameters,
    IFundingTransactionParameters,
    UTXO,
    Wallet
} from '@btc-vision/transaction';
import BigNumber from 'bignumber.js';
import {
    Airdrop,
    BitcoinAbiTypes,
    BitcoinInterfaceAbi,
    BitcoinUtils,
    getContract,
    IMotoswapRouterContract,
    IOP20Contract,
    MOTOSWAP_ROUTER_ABI,
    OP_20_ABI,
    TransactionParameters
} from 'opnet';
import { AddressesInfo } from 'opnet/src/providers/interfaces/PublicKeyInfo';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
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
    const [routerAddress, setRouterAddress] = useState<Address | null>(null);

    useEffect(() => {
        const setWallet = async () => {
            await Web3API.setNetwork(await wallet.getChainType());
            setRouterAddress(Web3API.ROUTER_ADDRESS ? Web3API.ROUTER_ADDRESS : null);
        };
        void setWallet();
    });

    const getWallet = useCallback(async () => {
        const currentWalletAddress = await wallet.getCurrentAccount();
        const pubkey = currentWalletAddress.pubkey;
        const wifWallet = await wallet.getInternalPrivateKey({
            pubkey: pubkey,
            type: currentWalletAddress.type
        });
        return Wallet.fromWif(wifWallet.wif, Web3API.network);
    }, [wallet]);

    const handleCancel = () => {
        window.history.go(-1);
    };

    const getPubKey = async (to: string) => {
        let pubKey: Address;
        const pubKeyStr: string = to.replace('0x', '');
        if (
            (pubKeyStr.length === 64 || pubKeyStr.length === 66 || pubKeyStr.length === 130) &&
            pubKeyStr.match(/^[0-9a-fA-F]+$/) !== null
        ) {
            pubKey = Address.fromString(pubKeyStr);
        } else {
            pubKey = await Web3API.provider.getPublicKeyInfo(to);
        }

        return pubKey;
    };

    const transferToken = async (parameters: TransferParameters) => {
        const userWallet = await getWallet();
        const currentWalletAddress = await wallet.getCurrentAccount();
        const contract: IOP20Contract = getContract<IOP20Contract>(
            parameters.contractAddress,
            OP_20_ABI,
            Web3API.provider,
            Web3API.network,
            userWallet.address
        );

        try {
            const address = await getPubKey(parameters.to);
            const transferSimulation = await contract.safeTransfer(address, parameters.inputAmount, new Uint8Array());

            const interactionParameters: TransactionParameters = {
                signer: userWallet.keypair, // The keypair that will sign the transaction
                refundTo: currentWalletAddress.address, // Refund the rest of the funds to this address
                maximumAllowedSatToSpend: parameters.priorityFee, // The maximum we want to allocate to this transaction in satoshis
                feeRate: parameters.feeRate, // We need to provide a fee rate
                network: Web3API.network, // The network we are operating on
                priorityFee: parameters.priorityFee,
                note: parameters.note
            };

            const symbol = await contract.symbol();
            const sendTransaction = await transferSimulation.sendTransaction(interactionParameters);
            tools.toastSuccess(
                `You have successfully transferred ${BitcoinUtils.formatUnits(
                    parameters.inputAmount,
                    parameters.tokens[0].divisibility
                )} ${symbol.properties.symbol}`
            );

            // Store the next UTXO in localStorage
            navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.transactionId });
        } catch (e) {
            const error = e as Error;
            if (error.message.toLowerCase().includes('public key')) {
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
        const userWallet = await getWallet();

        const contract: AirdropInterface = getContract<AirdropInterface>(
            contractAddress,
            AIRDROP_ABI,
            Web3API.provider,
            Web3API.network,
            userWallet.address
        );

        const addressMap = new AddressMap<bigint>();
        for (const [pubKey, amount] of Object.entries(parameters.amounts)) {
            addressMap.set(Address.fromString(pubKey), BigInt(amount));
        }

        const airdropData = await contract.airdrop(addressMap);
        const interactionParameters: TransactionParameters = {
            signer: userWallet.keypair, // The keypair that will sign the transaction
            refundTo: currentWalletAddress.address, // Refund the rest of the funds to this address
            maximumAllowedSatToSpend: parameters.priorityFee, // The maximum we want to allocate to this transaction in satoshis
            feeRate: parameters.feeRate, // We need to provide a fee rate
            network: Web3API.network, // The network we are operating on
            priorityFee: parameters.priorityFee,
            note: parameters.note
        };

        const sendTransaction = await airdropData.sendTransaction(interactionParameters);
        if (!sendTransaction?.transactionId) {
            setOpenLoading(false);
            setDisabled(false);

            tools.toastError(`Could not send transaction`);
            return;
        }

        tools.toastSuccess(`You have successfully airdropped tokens to ${addressMap.size} addresses`);
        navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.transactionId, contractAddress: contractAddress });
    };

    const swap = async (swapParameters: SwapParameters) => {
        if (!routerAddress) {
            tools.toastError('Router address not found');
            return;
        }

        const currentWalletAddress = await wallet.getCurrentAccount();
        const userWallet = await getWallet();

        const getSwap: IMotoswapRouterContract = getContract<IMotoswapRouterContract>(
            routerAddress,
            MOTOSWAP_ROUTER_ABI,
            Web3API.provider,
            Web3API.network,
            userWallet.address
        );

        const inputAmountBigInt = BitcoinUtils.expandToDecimals(
            swapParameters.amountIn,
            swapParameters.tokens[0].divisibility
        );
        const slippageAmount = Number(swapParameters.amountOut) * Number(swapParameters.slippageTolerance / 100);
        const outPutAmountBigInt = BitcoinUtils.expandToDecimals(
            swapParameters.amountOut - slippageAmount,
            swapParameters.tokens[1].divisibility
        );

        const addressOfContract = (await Web3API.provider.getPublicKeysInfo([
            swapParameters.tokenIn,
            swapParameters.tokenOut
        ])) as AddressesInfo;

        const block = await Web3API.provider.getBlockNumber();
        const contractData = await getSwap.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            inputAmountBigInt,
            outPutAmountBigInt,
            [addressOfContract[swapParameters.tokenIn], addressOfContract[swapParameters.tokenOut]],
            userWallet.address,
            BigInt(swapParameters.deadline) + block
        );

        const interactionParameters: TransactionParameters = {
            signer: userWallet.keypair, // The keypair that will sign the transaction
            refundTo: currentWalletAddress.address, // Refund the rest of the funds to this address
            maximumAllowedSatToSpend: swapParameters.priorityFee, // The maximum we want to allocate to this transaction in satoshis
            feeRate: swapParameters.feeRate, // We need to provide a fee rate
            network: Web3API.network, // The network we are operating on
            priorityFee: swapParameters.priorityFee,
            note: swapParameters.note
        };

        const sendTransaction = await contractData.sendTransaction(interactionParameters);

        if (!sendTransaction?.transactionId) {
            setOpenLoading(false);
            setDisabled(false);

            tools.toastError(`Could not send transaction`);
            return;
        }

        const amountA = Number(swapParameters.amountIn).toLocaleString();
        const amountB = Number(swapParameters.amountOut).toLocaleString();
        tools.toastSuccess(
            `You have successfully swapped ${amountA} ${swapParameters.tokens[0].symbol} for ${amountB} ${swapParameters.tokens[1].symbol}`
        );

        navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.transactionId });
    };

    const sendBTC = async (parameters: SendBitcoinParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();
            const userWallet = await getWallet();

            // Determine which address to send from and get UTXOs
            let fromAddress = currentWalletAddress.address;
            let utxos: UTXO[] = [];
            let witnessScript: Buffer | undefined;

            // Check if sending from a CSV address
            if (parameters.from && parameters.sourceType && parameters.sourceType !== SourceType.CURRENT) {
                const currentAddress = Address.fromString(currentWalletAddress.pubkey);

                if (parameters.sourceType === SourceType.CSV75) {
                    const csv75Address = currentAddress.toCSV(75, Web3API.network);
                    fromAddress = csv75Address.address;
                    witnessScript = csv75Address.witnessScript;

                    utxos = await Web3API.getUnspentUTXOsForAddresses(
                        [fromAddress],
                        BitcoinUtils.expandToDecimals(parameters.inputAmount, 8),
                        75n
                    );
                } else if (parameters.sourceType === SourceType.CSV1) {
                    const csv1Address = currentAddress.toCSV(1, Web3API.network);
                    fromAddress = csv1Address.address;
                    witnessScript = csv1Address.witnessScript;

                    utxos = await Web3API.getUnspentUTXOsForAddresses(
                        [fromAddress],
                        BitcoinUtils.expandToDecimals(parameters.inputAmount, 8),
                        1n
                    );
                }

                if (witnessScript && utxos.length > 0) {
                    utxos = utxos.map((utxo) => ({
                        ...utxo,
                        witnessScript: witnessScript // Add the witness script to each UTXO
                    }));
                }
            } else {
                utxos = await Web3API.getUnspentUTXOsForAddresses(
                    [fromAddress],
                    BitcoinUtils.expandToDecimals(parameters.inputAmount, 8)
                );
            }

            if (!utxos || utxos.length === 0) {
                tools.toastError(`No UTXOs available for funding transaction`);
                setDisabled(false);
                return;
            }

            const IFundingTransactionParameters: IFundingTransactionParameters = {
                amount: BitcoinUtils.expandToDecimals(parameters.inputAmount, 8),
                utxos: utxos,
                signer: userWallet.keypair,
                network: Web3API.network,
                feeRate: parameters.feeRate,
                priorityFee: 0n,
                gasSatFee: 0n,
                to: parameters.to,
                from: fromAddress,
                note: parameters.note
            };

            const sendTransact = await Web3API.transactionFactory.createBTCTransfer(IFundingTransactionParameters);

            const sendTransaction = await Web3API.provider.sendRawTransaction(sendTransact.tx, false);
            if (!sendTransaction.success) {
                setDisabled(false);
                tools.toastError(sendTransaction.error ?? 'Could not broadcast transaction');
                return;
            }

            const amountA = Number(parameters.inputAmount).toLocaleString();
            const sourceLabel =
                parameters.sourceType === SourceType.CSV75
                    ? ' from CSV-75'
                    : parameters.sourceType === SourceType.CSV1
                      ? ' from CSV-1'
                      : '';
            tools.toastSuccess(`You have successfully transferred ${amountA} ${btcUnit}${sourceLabel}`);

            // Update UTXO manager for the correct address
            Web3API.provider.utxoManager.spentUTXO(fromAddress, utxos, sendTransact.nextUTXOs);

            navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.result });
        } catch (e) {
            tools.toastError(`Error: ${(e as Error).message}`);
            setDisabled(false);
            throw e;
        }
    };

    const deployContract = async (parameters: DeployContractParameters) => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();
            const userWallet = await getWallet();

            const utxos: UTXO[] = await Web3API.getUnspentUTXOsForAddresses([currentWalletAddress.address], 1_000_000n); // maximum fee a contract can pay

            const arrayBuffer = await parameters.file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const challenge = await Web3API.provider.getChallenge();
            const calldata = parameters.calldataHex ? Buffer.from(parameters.calldataHex, 'hex') : Buffer.from([]);

            // TODO: Add calldata support
            const deploymentParameters: IDeploymentParameters = {
                challenge,
                utxos: utxos,
                signer: userWallet.keypair,
                network: Web3API.network,
                feeRate: parameters.feeRate,
                priorityFee: parameters.priorityFee ?? 0n,
                gasSatFee: parameters.gasSatFee ?? 10_000n,
                from: currentWalletAddress.address,
                bytecode: Buffer.from(uint8Array),
                calldata: calldata,
                optionalInputs: [],
                optionalOutputs: [],
                note: parameters.note
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

                if (!updatedTokens.includes(sendTransact.contractAddress.toString())) {
                    updatedTokens.push(sendTransact.contractAddress.toString());
                    localStorage.setItem(key, JSON.stringify(updatedTokens));
                }

                tools.toastSuccess(`You have successfully deployed ${sendTransact.contractAddress}`);

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
            const userWallet = await getWallet();

            const contract = getContract<IOP20Contract>(
                parameters.contractAddress,
                OP_20_ABI,
                Web3API.provider,
                Web3API.network,
                userWallet.address
            );

            const value = BitcoinUtils.expandToDecimals(parameters.inputAmount, parameters.tokens[0].divisibility);
            const mintData = await contract.mint(Address.fromString(parameters.to), BigInt(value));

            const interactionParameters: TransactionParameters = {
                signer: userWallet.keypair, // The keypair that will sign the transaction
                refundTo: currentWalletAddress.address, // Refund the rest of the funds to this address
                maximumAllowedSatToSpend: parameters.priorityFee, // The maximum we want to allocate to this transaction in satoshis
                feeRate: parameters.feeRate, // We need to provide a fee rate
                network: Web3API.network, // The network we are operating on
                priorityFee: parameters.priorityFee,
                note: parameters.note
            };

            const sendTransaction = await mintData.sendTransaction(interactionParameters);
            if (!sendTransaction.transactionId) {
                tools.toastError(`Could not send transaction`);
                return;
            }

            tools.toastSuccess(`You have successfully minted ${parameters.inputAmount} ${parameters.tokens[0].symbol}`);
            navigate(RouteTypes.TxSuccessScreen, { txid: sendTransaction.transactionId });
        } catch (e) {
            setDisabled(false);
            console.log(e);
        }
    };

    // Get action label
    const getActionLabel = () => {
        switch (rawTxInfo.action) {
            case Action.Swap:
                return 'Token Swap';
            case Action.SendBitcoin:
                return 'Send Bitcoin';
            case Action.DeployContract:
                return 'Deploy Contract';
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
        switch (rawTxInfo.action) {
            case Action.Swap:
                return '🔄';
            case Action.SendBitcoin:
                return '₿';
            case Action.DeployContract:
                return '🚀';
            case Action.Mint:
                return '🪙';
            case Action.Airdrop:
                return '🎁';
            case Action.Transfer:
                return '➡️';
            default:
                return '📝';
        }
    };

    return (
        <Layout>
            <Header onBack={handleCancel} title={`Confirm ${getActionLabel()}`} />

            <Content style={{ padding: '12px' }}>
                <Column>
                    {/* Transaction Type Card */}
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                            border: `1px solid ${colors.main}30`,
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '12px',
                            textAlign: 'center'
                        }}>
                        <div
                            style={{
                                fontSize: '40px',
                                marginBottom: '8px'
                            }}>
                            {getActionIcon()}
                        </div>
                        <div
                            style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: colors.text,
                                marginBottom: '4px'
                            }}>
                            {getActionLabel()}
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded
                            }}>
                            Review transaction details below
                        </div>
                    </div>

                    {/* Fee Details */}
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
                            <DollarOutlined style={{ fontSize: 14, color: colors.main }} />
                            Fee Details
                        </div>

                        {/* Network Fee */}
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
                                <span style={{ fontSize: '13px', color: colors.text }}>Network Fee Rate</span>
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

                        {/* OP_NET Gas Fee */}
                        {rawTxInfo.gasSatFee && (
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
                                    <RocketOutlined style={{ fontSize: 14, color: colors.main }} />
                                    <span style={{ fontSize: '13px', color: colors.text }}>OP_NET Gas Fee</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: colors.text
                                        }}>
                                        {rawTxInfo.gasSatFee.toString()}
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

                        {/* Priority Fee */}
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
                                <RocketOutlined style={{ fontSize: 14, color: colors.success }} />
                                <span style={{ fontSize: '13px', color: colors.text }}>Priority Fee</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: colors.text
                                    }}>
                                    {rawTxInfo.priorityFee.toString()}
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

                    {/* Security Notice */}
                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            padding: '10px',
                            background: `${colors.warning}10`,
                            border: `1px solid ${colors.warning}25`,
                            borderRadius: '10px',
                            marginBottom: '80px'
                        }}>
                        <WarningOutlined
                            style={{
                                fontSize: 14,
                                color: colors.warning,
                                flexShrink: 0,
                                marginTop: '2px'
                            }}
                        />
                        <div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.warning,
                                    fontWeight: 600,
                                    marginBottom: '4px'
                                }}>
                                Security Check
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    lineHeight: '1.4'
                                }}>
                                Verify all transaction details before signing. This action cannot be undone.
                            </div>
                        </div>
                    </div>
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
                            background: disabled ? colors.buttonBg : colors.main,
                            border: 'none',
                            borderRadius: '10px',
                            color: disabled ? colors.textFaded : colors.background,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                            transition: 'all 0.15s'
                        }}
                        disabled={disabled}
                        onClick={async () => {
                            setDisabled(true);
                            switch (rawTxInfo.action) {
                                case Action.Swap:
                                    console.log('Swap parameters:', rawTxInfo);
                                    if (!('amountIn' in rawTxInfo)) {
                                        throw new Error('Invalid swap parameters');
                                    }

                                    await swap(rawTxInfo);
                                    break;
                                case Action.SendBitcoin:
                                    await sendBTC(rawTxInfo);
                                    break;
                                case Action.DeployContract:
                                    await deployContract(rawTxInfo);
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
                            if (!disabled) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        Sign & Send
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
                                        {deploymentContract.contractAddress.toString()}
                                    </span>
                                    <CopyOutlined
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(
                                                deploymentContract.contractAddress.toString()
                                            );
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
