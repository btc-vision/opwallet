import {
    Action,
    AirdropParameters,
    DeployContractParameters,
    MintParameters,
    RawTxInfo,
    SendBitcoinParameters,
    SwapParameters,
    TransferParameters
} from '@/shared/interfaces/RawTxParameters';
import Web3API from '@/shared/web3/Web3API';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import { ContextType, useTools } from '@/ui/components/ActionComponent';
import { BottomModal } from '@/ui/components/BottomModal';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useLocationState, useWallet } from '@/ui/utils';
import { CopyOutlined, LoadingOutlined } from '@ant-design/icons';
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
    IOP_20Contract,
    MOTOSWAP_ROUTER_ABI,
    OP_20_ABI,
    TransactionParameters
} from 'opnet';
import { AddressesInfo } from 'opnet/src/providers/interfaces/PublicKeyInfo';
import React, { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { RouteTypes, useNavigate } from '../MainRoute';

BigNumber.config({ EXPONENTIAL_AT: 256 });

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
        outputs: [
            {
                name: 'ok',
                type: ABIDataTypes.BOOL
            }
        ],
        type: BitcoinAbiTypes.Function
    }
];

export interface AirdropInterface extends IOP_20Contract {
    airdrop(tuple: AddressMap<bigint>): Promise<Airdrop>;
}

const waitForTransaction = async (
    txHash: string,
    setOpenLoading: Dispatch<SetStateAction<boolean>>,
    tools: ContextType
) => {
    let attempts = 0;
    const maxAttempts = 360; // 10 minutes max wait time
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
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 10 seconds
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

    const handleCancel = () => {
        window.history.go(-1);
    };

    const [routerAddress, setRouterAddress] = useState<Address | null>(null);

    useEffect(() => {
        const setWallet = async () => {
            await Web3API.setNetwork(await wallet.getChainType());

            setRouterAddress(Web3API.ROUTER_ADDRESS ? Web3API.ROUTER_ADDRESS : null);
        };

        void setWallet();
    });

    const wallet = useWallet();
    const tools = useTools();

    const getWallet = useCallback(async () => {
        const currentWalletAddress = await wallet.getCurrentAccount();
        const pubkey = currentWalletAddress.pubkey;

        const wifWallet = await wallet.getInternalPrivateKey({
            pubkey: pubkey,
            type: currentWalletAddress.type
        });

        return Wallet.fromWif(wifWallet.wif, Web3API.network);
    }, [wallet]);

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
        const contract: IOP_20Contract = getContract<IOP_20Contract>(
            parameters.contractAddress,
            OP_20_ABI,
            Web3API.provider,
            Web3API.network,
            userWallet.address
        );

        try {
            const address = await getPubKey(parameters.to);
            const transferSimulation = await contract.transfer(address, parameters.inputAmount);

            const interactionParameters: TransactionParameters = {
                signer: userWallet.keypair, // The keypair that will sign the transaction
                refundTo: currentWalletAddress.address, // Refund the rest of the funds to this address
                maximumAllowedSatToSpend: parameters.priorityFee, // The maximum we want to allocate to this transaction in satoshis
                feeRate: parameters.feeRate, // We need to provide a fee rate
                network: Web3API.network, // The network we are operating on
                priorityFee: parameters.priorityFee
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
            priorityFee: parameters.priorityFee
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
            priorityFee: swapParameters.priorityFee
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

            const utxos: UTXO[] = await Web3API.getUnspentUTXOsForAddresses(
                [currentWalletAddress.address],
                BitcoinUtils.expandToDecimals(parameters.inputAmount, 8) * 2n
            );

            const IFundingTransactionParameters: IFundingTransactionParameters = {
                amount: BitcoinUtils.expandToDecimals(parameters.inputAmount, 8),
                utxos: utxos,
                signer: userWallet.keypair,
                network: Web3API.network,
                feeRate: parameters.feeRate,
                priorityFee: 0n,
                gasSatFee: 0n,
                to: parameters.to,
                from: currentWalletAddress.address,
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
            tools.toastSuccess(`You have successfully transferred ${amountA} ${btcUnit}`);

            Web3API.provider.utxoManager.spentUTXO(currentWalletAddress.address, utxos, sendTransact.nextUTXOs);

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

            const contract = getContract<IOP_20Contract>(
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
                priorityFee: parameters.priorityFee
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
    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title={rawTxInfo.header}
            />
            <Content>
                <Column gap="xl">
                    <Section title="Network Fee Rate:">
                        <Text text={rawTxInfo.feeRate.toString()} />

                        <Text text="sat/vB" color="textDim" />
                    </Section>

                    <Section title="Opnet Gas Fee:">
                        <Text text={rawTxInfo.gasSatFee?.toString() || '0'} />

                        <Text text="sat" color="textDim" />
                    </Section>

                    <Section title="Priority Fee:">
                        <Text text={rawTxInfo.priorityFee.toString()} />

                        <Text text="sat" color="textDim" />
                    </Section>

                    <Section title="Features:">
                        <Row>
                            {rawTxInfo.features.rbf ? (
                                <Text
                                    text="RBF"
                                    color="white"
                                    style={{ backgroundColor: 'green', padding: 5, borderRadius: 5 }}
                                />
                            ) : (
                                <Text
                                    text="RBF"
                                    color="white"
                                    style={{
                                        backgroundColor: 'red',
                                        padding: 5,
                                        borderRadius: 5,
                                        textDecoration: 'line-through'
                                    }}
                                />
                            )}
                        </Row>
                    </Section>
                    {/*
                         <Column gap="xl">
                        <Column>
                            <Text text={`Data: (${rawTxInfo.inputInfos.length})`} preset="bold" />
                            <Card>
                                <Column full justifyCenter>
                                    <Row>
                                        <Column justifyCenter>
                                            <Text text={'TOKENS'} color={rawTxInfo.isToSign ? 'white' : 'textDim'} />
                                            <Row overflowX gap="lg" style={{ width: 280 }} pb="lg">
                                                {rawTxInfo.opneTokens.map((w, index) => (
                                                    <RunesPreviewCard
                                                        key={index}
                                                        balance={w}
                                                        price={{ curPrice: 0, changePercent: 0 }}
                                                    />
                                                ))}
                                            </Row>
                                        </Column>
                                    </Row>
                                </Column>
                            </Card>
                        </Column>
                    </Column>
                         */}
                </Column>
            </Content>

            <Footer>
                <Row full>
                    <Button preset="default" text="Reject" onClick={handleCancel} full />
                    <Button
                        preset="primary"
                        disabled={disabled}
                        icon={undefined}
                        text={'Sign'}
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
                        full
                    />
                </Row>
            </Footer>
            {openLoading && (
                <BottomModal
                    onClose={() => {
                        setDisabled(false);
                        setOpenLoading(false);
                    }}>
                    <Column
                        fullX
                        itemsCenter
                        style={{
                            padding: '24px 16px',
                            gap: 16
                        }}>
                        {/* loading message */}
                        <Text text={loadingMessage} textCenter size="lg" />

                        {/* deployment contract */}

                        {deploymentContract && (
                            <Row itemsCenter gap={'sm'}>
                                <Text
                                    text={`Contract Address: ${deploymentContract.contractAddress}`}
                                    size="xs"
                                    style={{ wordBreak: 'break-all' }}
                                />

                                {/* copy icon button */}
                                <CopyOutlined
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(
                                            deploymentContract.contractAddress.toString()
                                        );
                                        tools.toastSuccess('Contract address copied to clipboard');
                                    }}
                                    style={{
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        color: '#ffa640'
                                    }}
                                />
                            </Row>
                        )}

                        {/* spinner */}
                        <LoadingOutlined
                            spin
                            style={{
                                fontSize: 28,
                                color: '#ffa640',
                                filter: 'drop-shadow(0 0 4px rgba(255, 165, 64, 0.75))'
                            }}
                        />
                    </Column>
                </BottomModal>
            )}
        </Layout>
    );
}

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
    return (
        <Column>
            <Text text={title} preset="bold" />
            <Card>
                <Row full justifyBetween itemsCenter>
                    {children}
                </Row>
            </Card>
        </Column>
    );
}
