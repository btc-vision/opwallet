import BigNumber from 'bignumber.js';
import {
    BaseContractProperty,
    BitcoinAbiTypes,
    BitcoinInterfaceAbi,
    getContract,
    IMotoswapRouterContract,
    IOP_20Contract,
    IWBTCContract,
    MOTOSWAP_ROUTER_ABI,
    OP_20_ABI,
    WBTC_ABI
} from 'opnet';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';

import { Account } from '@/shared/types';
import { expandToDecimals } from '@/shared/utils';
import Web3API, { bigIntToDecimal, getOPNetChainType } from '@/shared/web3/Web3API';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import { ContextType, useTools } from '@/ui/components/ActionComponent';
import { BottomModal } from '@/ui/components/BottomModal';
import RunesPreviewCard from '@/ui/components/RunesPreviewCard';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useLocationState, useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';
import { ABIDataTypes, Address, BinaryWriter } from '@btc-vision/bsi-binary';
import {
    AddressVerificator,
    currentConsensusConfig,
    DeploymentResult,
    IDeploymentParameters,
    IFundingTransactionParameters,
    IInteractionParameters,
    IUnwrapParameters,
    IWrapParameters,
    UnwrapResult,
    UTXO,
    Wallet
} from '@btc-vision/transaction';

import { useNavigate } from '../MainRoute';
import { ConfirmUnWrap } from './ConfirmUnWrap';

BigNumber.config({ EXPONENTIAL_AT: 256 });

interface LocationState {
    rawTxInfo: any;
}

function absBigInt(value: bigint): bigint {
    return value < 0n ? -value : value;
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
    airdrop(to: Map<Address, bigint>): Promise<BaseContractProperty>;
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

export default function TxOpnetConfirmScreen() {
    const navigate = useNavigate();
    const [finalUnwrapTx, setfinalUnwrapTx] = useState<UnwrapResult>();
    const [useNextUTXO, setUseNextUTXO] = useState<boolean>(false);
    const [acceptWrap, setAcceptWrap] = useState<boolean>(false);
    const [acceptWrapMessage, setAcceptWrapMessage] = useState<string>('false');
    const [openAcceptbar, setAcceptBar] = useState<boolean>(false);
    const [openLoading, setOpenLoading] = useState<boolean>(false);
    const [disabled, setDisabled] = useState<boolean>(false);
    const [_unwrapUseAmount, setUnWrapAmount] = useState<bigint>(0n);
    const { rawTxInfo } = useLocationState<LocationState>();

    const btcUnit = useBTCUnit();

    const handleCancel = () => {
        window.history.go(-1);
    };

    const [routerAddress, setRouterAddress] = useState<string>('');
    useEffect(() => {
        const setWallet = async () => {
            Web3API.setNetwork(await wallet.getChainType());

            setRouterAddress(Web3API.ROUTER_ADDRESS);
        };

        void setWallet();
    });

    useEffect(() => {
        if (acceptWrap && finalUnwrapTx) {
            const completeUnwrap = async () => {
                setAcceptBar(false);
                // If this transaction is missing, opnet will deny the unwrapping request.
                const fundingTransaction = await Web3API.provider.sendRawTransaction(
                    finalUnwrapTx.fundingTransaction,
                    false
                );
                if (!fundingTransaction || !fundingTransaction.success) {
                    console.log(fundingTransaction);
                    tools.toastError('Error. Please Try again');
                    return;
                }

                // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
                const unwrapTransaction = await Web3API.provider.sendRawTransaction(finalUnwrapTx.psbt, true);
                if (!unwrapTransaction || !unwrapTransaction.success) {
                    console.log(fundingTransaction);
                    tools.toastError('Error. Please Try again');
                    return;
                }

                const nextUTXO = finalUnwrapTx.utxos;
                localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
                tools.toastSuccess(`You have successfully un-wrapped your wBTC`);
                navigate('TxSuccessScreen', { txid: unwrapTransaction.result });
            };
            void completeUnwrap();
        }
    }, [acceptWrap]);

    const wallet = useWallet();
    const tools = useTools();

    const handleConfirm = async () => {
        const currentWalletAddress = await wallet.getCurrentAccount();
        if (!AddressVerificator.isValidP2TRAddress(currentWalletAddress.address, Web3API.network)) {
            tools.toastError('Please use a taproot wallet.');
            return;
        }

        const foundObject = rawTxInfo.items.find(
            (obj) => obj.account && obj.account.address === rawTxInfo.account.address
        );
        const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
        const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);
        const transferSelector = Number('0x' + Web3API.abiCoder.encodeSelector('transfer'));

        function getTransferToCalldata(to: string, amount: bigint): Buffer {
            const addCalldata: BinaryWriter = new BinaryWriter();
            addCalldata.writeSelector(transferSelector);
            addCalldata.writeAddress(to);
            addCalldata.writeU256(amount);

            return Buffer.from(addCalldata.getBuffer());
        }

        try {
            const result = 10 ** rawTxInfo.opneTokens[0].divisibility;
            const amountToSend = BigInt(rawTxInfo.inputAmount * result); // Amount to send

            const calldata = getTransferToCalldata(rawTxInfo.address, amountToSend);
            const utxos = await Web3API.getUTXOs(walletGet.addresses, amountToSend);

            const interactionParameters: IInteractionParameters = {
                from: walletGet.p2tr, // From address
                to: rawTxInfo.contractAddress, // To address
                utxos: utxos, // UTXOs
                signer: walletGet.keypair, // Signer
                network: Web3API.network, // Network
                feeRate: rawTxInfo.feeRate,
                priorityFee: rawTxInfo.priorityFee, // Priority fee (opnet)
                calldata: calldata // Calldata
            };

            const finalTx = await Web3API.transactionFactory.signInteraction(interactionParameters);
            const firstTxBroadcast = await Web3API.provider.sendRawTransaction(finalTx[0], false);
            console.log(`First transaction broadcasted: ${firstTxBroadcast.result}`);

            if (!firstTxBroadcast.success) {
                tools.toastError('Error,Please Try again');
                setUseNextUTXO(true);
                setDisabled(false);
                tools.toastError('Could not broadcast first transaction');
            }

            const secondTxBroadcast = await Web3API.provider.sendRawTransaction(finalTx[1], false);
            console.log(`Second transaction broadcasted: ${secondTxBroadcast.result}`);

            if (!secondTxBroadcast.success) {
                tools.toastError('Could not broadcast second transaction');
            }

            tools.toastSuccess(`You have successfully transferred ${amountToSend} ${btcUnit}`);
            // Store the next UTXO in localStorage
            const nextUTXO = finalTx[2];
            localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
            navigate('TxSuccessScreen', { txid: secondTxBroadcast.result });
        } catch (e) {
            tools.toastError('Error,Please Try again');
            setUseNextUTXO(true);
            setDisabled(false);

            console.log(e);
        }
    };

    function getErrorMessage(err: Error): string {
        let message = `Something went wrong: ${err.message}`;
        if (err.message.includes(`Outputs are spending`)) {
            message = `Not enough funds to send transaction including bitcoin mining fee.`;
        } else if (err.message.includes(`Not finalized`)) {
            message = `Please use a taproot wallet.`;
        }

        return message;
    }

    const handleWrapConfirm = async () => {
        const currentWalletAddress = await wallet.getCurrentAccount();
        const walletAddress = currentWalletAddress.address;
        if (!AddressVerificator.isValidP2TRAddress(walletAddress, Web3API.network)) {
            tools.toastError('Please use a taproot wallet to wrap.');
            return;
        }

        const foundObject = rawTxInfo.items.find(
            (obj) => obj.account && obj.account.address === rawTxInfo.account.address
        );

        const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
        const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);

        const wrapAmount = expandToDecimals(rawTxInfo.inputAmount, 8);
        let utxos: UTXO[];

        const amountRequired = wrapAmount + currentConsensusConfig.UNWRAP_CONSOLIDATION_PREPAID_FEES + 50_000n; // add fee
        if (!useNextUTXO) {
            utxos = await Web3API.getUTXOs(walletGet.addresses, amountRequired + 1_000_000n);
        } else {
            const storedUTXO = localStorage.getItem('nextUTXO');
            utxos = storedUTXO
                ? JSON.parse(storedUTXO).map((utxo) => ({
                      ...utxo,
                      value: BigInt(utxo.value)
                  }))
                : [];
        }

        if (utxos.length !== 0) {
            // verify if have enough

            const totalAmount = utxos.reduce((acc, utxo) => acc + utxo.value, 0n);
            console.log('amount', totalAmount, amountRequired, utxos);
            if (totalAmount < amountRequired) {
                tools.toastError(`Not enough funds to wrap. You need at least ${amountRequired} sat.`);
                return;
            }
        } else {
            tools.toastError('No UTXOs found');
            return;
        }

        const generationParameters = await Web3API.limitedProvider.fetchWrapParameters(wrapAmount);
        if (!generationParameters) {
            tools.toastError('No generation parameters found');
            return;
        }

        const getChain = await wallet.getChainType();
        const wrapParameters: IWrapParameters = {
            from: walletAddress,
            to: Web3API.WBTC,
            chainId: getOPNetChainType(getChain),
            utxos: utxos,
            signer: walletGet.keypair,
            network: Web3API.network,
            feeRate: rawTxInfo.feeRate,
            priorityFee: rawTxInfo.priorityFee,
            amount: wrapAmount,
            generationParameters: generationParameters
        };

        try {
            const finalTx = await Web3API.transactionFactory.wrap(wrapParameters);
            const firstTxBroadcast = await Web3API.provider.sendRawTransaction(finalTx.transaction[0], false);

            if (!firstTxBroadcast.success) {
                tools.toastError('Error,Please Try again');
                setUseNextUTXO(true);
                setDisabled(false);
                tools.toastError('Could not broadcast first transaction');
            }

            const secondTxBroadcast = await Web3API.provider.sendRawTransaction(finalTx.transaction[1], false);
            if (!secondTxBroadcast.success) {
                tools.toastError('Error,Please Try again');
                setDisabled(false);
                tools.toastError('Could not broadcast first transaction');
            }

            const nextUTXO = finalTx.utxos;
            localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
            const wrappedAmount = bigIntToDecimal(wrapAmount, 8).toString();
            tools.toastSuccess(`You have successfully wrapped ${wrappedAmount} ${btcUnit}`);
            navigate('TxSuccessScreen', { txid: secondTxBroadcast.result });
        } catch (e) {
            const msg = getErrorMessage(e as Error);
            console.warn(e);

            tools.toastWarning(msg);
        }
    };

    const handleUnWrapConfirm = async () => {
        try {
            const currentWalletAddress = await wallet.getCurrentAccount();
            const walletAddress = currentWalletAddress.address;
            if (!AddressVerificator.isValidP2TRAddress(walletAddress, Web3API.network)) {
                tools.toastError('Please use a taproot wallet to unwrap.');
                return;
            }

            const foundObject = rawTxInfo.items.find(
                (obj) => obj.account && obj.account.address === rawTxInfo.account.address
            );

            const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
            const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);
            const unwrapAmount = expandToDecimals(rawTxInfo.inputAmount, 8); // Minimum amount to unwrap

            let utxos: UTXO[] = [];
            if (!useNextUTXO) {
                utxos = await Web3API.getUTXOs(walletGet.addresses, unwrapAmount);
            } else {
                const storedUTXO = localStorage.getItem('nextUTXO');
                utxos = storedUTXO
                    ? JSON.parse(storedUTXO).map((utxo) => ({
                          ...utxo,
                          value: BigInt(utxo.value)
                      }))
                    : [];
            }

            const contract: IWBTCContract = getContract<IWBTCContract>(
                Web3API.WBTC,
                WBTC_ABI,
                Web3API.provider,
                walletAddress
            );

            const wbtcBalanceSimulation = await contract.balanceOf(walletGet.p2tr);
            if ('error' in wbtcBalanceSimulation) {
                tools.toastError(
                    `Something went wrong while simulating the check withdraw balance: ${wbtcBalanceSimulation.error}`
                );
                return;
            }

            const wbtcBalance = wbtcBalanceSimulation.decoded[0] as bigint;
            const checkWithdrawalRequest = await contract.withdrawableBalanceOf(walletGet.p2tr);
            if ('error' in checkWithdrawalRequest) {
                tools.toastError(
                    `Something went wrong while simulating the check withdraw balance: ${checkWithdrawalRequest.error}`
                );
                return;
            }

            if (wbtcBalance + (checkWithdrawalRequest.decoded[0] as bigint) < unwrapAmount) {
                // todo convert to human readable base decimals
                tools.toastError('You can only withdraw a maximum of' + wbtcBalance);
                return;
            }

            const alreadyWithdrawal = checkWithdrawalRequest.decoded[0] as bigint;
            const requiredAmountDifference: bigint = alreadyWithdrawal - unwrapAmount;

            let utxosForUnwrap: UTXO[] = utxos;
            if (requiredAmountDifference < 0n) {
                const diff = absBigInt(requiredAmountDifference);

                const withdrawalRequest = await contract.requestWithdrawal(diff);
                if ('error' in withdrawalRequest) {
                    tools.toastError(
                        `Something went wrong while simulating the withdraw request: ${withdrawalRequest}`
                    );
                    return;
                }

                const getChain = await wallet.getChainType();
                const interactionParameters: IInteractionParameters = {
                    from: walletAddress,
                    to: contract.address.toString(),
                    chainId: getOPNetChainType(getChain),
                    utxos: utxos,
                    signer: walletGet.keypair,
                    network: Web3API.network,
                    feeRate: rawTxInfo.feeRate,
                    priorityFee: rawTxInfo.priorityFee > 1000n ? rawTxInfo.priorityFee : 1000n,
                    calldata: withdrawalRequest.calldata as Buffer
                };

                const sendTransaction = await Web3API.transactionFactory.signInteraction(interactionParameters);

                // If this transaction is missing, opnet will deny the unwrapping request.
                const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransaction[0], false);
                if (!firstTransaction || !firstTransaction.success) {
                    tools.toastError('Error,Please Try again');
                    setUseNextUTXO(true);
                    setDisabled(false);
                    return;
                }

                // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
                const secondTransaction = await Web3API.provider.sendRawTransaction(sendTransaction[1], false);
                if (!secondTransaction || !secondTransaction.success) {
                    tools.toastError('Error: Could not broadcast second transaction');
                    setDisabled(false);
                    return;
                }

                utxosForUnwrap = sendTransaction[2];

                if (!secondTransaction.result) {
                    setOpenLoading(false);
                    setDisabled(false);

                    tools.toastError(`Transaction failed: ${secondTransaction.error}`);
                    return;
                }

                tools.showLoading(true, 'Waiting for transaction confirmation...');
                await waitForTransaction(secondTransaction.result, setOpenLoading, tools);

                tools.showLoading(false);
            }

            const unwrapUtxos = await Web3API.limitedProvider.fetchUnWrapParameters(unwrapAmount, walletGet.p2tr);
            if (!unwrapUtxos) {
                tools.toastError('No vault UTXOs or something went wrong. Please try again.');
                return;
            }

            const chainId = getOPNetChainType(await wallet.getChainType());

            // TODO: Verify that the UTXOs have enough money in them to process to the transaction, if not, we have to fetch more UTXOs.
            const unwrapParameters: IUnwrapParameters = {
                from: walletAddress, // Address to unwrap
                utxos: utxosForUnwrap, // Use the UTXO generated from the withdrawal request
                chainId: chainId,
                unwrapUTXOs: unwrapUtxos.vaultUTXOs, // Vault UTXOs to unwrap
                signer: walletGet.keypair, // Signer
                network: Web3API.network, // Bitcoin network
                feeRate: rawTxInfo.feeRate, // Fee rate in satoshis per byte (bitcoin fee)
                priorityFee: rawTxInfo.priorityFee, // OPNet priority fee (incl gas.)
                amount: unwrapAmount
            };

            try {
                const finalTx = await Web3API.transactionFactory.unwrap(unwrapParameters);
                setfinalUnwrapTx(finalTx);
                setAcceptBar(true);
                setAcceptWrapMessage(
                    `Due to bitcoin fees, you will only get ${
                        unwrapAmount + finalTx.feeRefundOrLoss
                    } satoshis by unwrapping. Do you want to proceed?`
                );
                setUnWrapAmount(unwrapAmount);
            } catch (e) {
                console.log('Something went wrong while building the unwrap transaction', e);
                tools.toastError('Something went wrong while building the unwrap request. Please try again later.');
                setDisabled(false);
            }
        } catch (e) {
            const msg = getErrorMessage(e as Error);
            console.warn(e);

            tools.toastWarning(msg);
        }
    };

    const stake = async () => {
        const foundObject = rawTxInfo.items.find(
            (obj) => obj.account && obj.account.address === rawTxInfo.account.address
        );
        const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
        const amountToSend = expandToDecimals(rawTxInfo.inputAmount, rawTxInfo.opneTokens[0].divisibility);
        const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);

        const contract: IWBTCContract = getContract<IWBTCContract>(
            Web3API.WBTC,
            WBTC_ABI,
            Web3API.provider,
            walletGet.p2tr
        );

        const stakeData = (await contract.stake(amountToSend)) as unknown as { calldata: Buffer };
        if ('error' in stakeData) {
            tools.toastError('Invalid calldata in stakeData');
            return;
        }
        let utxos: UTXO[];
        if (!useNextUTXO) {
            utxos = await Web3API.getUTXOs(walletGet.addresses, amountToSend);
        } else {
            const storedUTXO = localStorage.getItem('nextUTXO');
            utxos = storedUTXO
                ? JSON.parse(storedUTXO).map((utxo) => ({
                      ...utxo,
                      value: BigInt(utxo.value)
                  }))
                : [];
        }

        const interactionParameters: IInteractionParameters = {
            from: walletGet.p2tr,
            to: contract.address.toString(),
            utxos: utxos,
            signer: walletGet.keypair,
            network: Web3API.network,
            feeRate: rawTxInfo.feeRate,
            priorityFee: rawTxInfo.priorityFee,
            calldata: stakeData?.calldata as Buffer
        };

        const sendTransact = await Web3API.transactionFactory.signInteraction(interactionParameters);

        // If this transaction is missing, opnet will deny the unwrapping request.
        const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact[0], false);
        if (!firstTransaction.success) {
            tools.toastError('Error,Please Try again');
            setUseNextUTXO(true);
            setDisabled(false);
            return;
        }

        // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
        const secondTransaction = await Web3API.provider.sendRawTransaction(sendTransact[1], false);
        if (!secondTransaction.success) {
            tools.toastError('Error,Please Try again');
            return;
        }

        const stakeAmount = bigIntToDecimal(amountToSend, 8).toString();
        tools.toastSuccess(`You have successfully staked ${stakeAmount} wBTC`);
        const nextUTXO = sendTransact[2];
        localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
        navigate('TxSuccessScreen', { txid: secondTransaction.result });
    };
    const unstake = async () => {
        const foundObject = rawTxInfo.items.find(
            (obj) => obj.account && obj.account.address === rawTxInfo.account.address
        );
        const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
        const amountToSend = expandToDecimals(rawTxInfo.inputAmount, rawTxInfo.opneTokens[0].divisibility);
        const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);

        const contract: IWBTCContract = getContract<IWBTCContract>(
            Web3API.WBTC,
            WBTC_ABI,
            Web3API.provider,
            walletGet.p2tr
        );

        const stakeData = (await contract.unstake()) as unknown as { calldata: Buffer };
        if ('error' in stakeData) {
            tools.toastError('Invalid calldata in stakeData');
            tools.toastError(stakeData.error as string);
            return;
        }

        let utxos: UTXO[] = [];
        if (!useNextUTXO) {
            utxos = await Web3API.getUTXOs(walletGet.addresses, amountToSend);
        } else {
            const storedUTXO = localStorage.getItem('nextUTXO');
            utxos = storedUTXO
                ? JSON.parse(storedUTXO).map((utxo) => ({
                      ...utxo,
                      value: BigInt(utxo.value)
                  }))
                : [];
        }

        const interactionParameters: IInteractionParameters = {
            from: walletGet.p2tr,
            to: contract.address.toString(),
            utxos: utxos,
            signer: walletGet.keypair,
            network: Web3API.network,
            feeRate: rawTxInfo.feeRate,
            priorityFee: rawTxInfo.priorityFee,
            calldata: stakeData?.calldata as Buffer
        };

        const sendTransact = await Web3API.transactionFactory.signInteraction(interactionParameters);

        // If this transaction is missing, opnet will deny the unwrapping request.
        const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact[0], false);
        if (!firstTransaction.success) {
            tools.toastError('Error,Please Try again');
            setUseNextUTXO(true);
            setDisabled(false);
            return;
        }

        // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
        const seconfTransaction = await Web3API.provider.sendRawTransaction(sendTransact[1], false);
        if (!seconfTransaction.success) {
            setDisabled(false);
            return;
        }

        const unstakeAmount = bigIntToDecimal(amountToSend, 8).toString();
        tools.toastSuccess(`You have successfully un-staked ${unstakeAmount} wBTC`);

        const nextUTXO = sendTransact[2];
        localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
        navigate('TxSuccessScreen', { txid: seconfTransaction.result });
    };
    const airdropOwner = async (contractAddress: Address, amounts: Map<Address, bigint>, utxos: UTXO[]) => {
        const foundObject = rawTxInfo.items.find(
            (obj) => obj.account && obj.account.address === rawTxInfo.account.address
        );
        const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
        const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);

        const contract: AirdropInterface = getContract<AirdropInterface>(
            contractAddress,
            AIRDROP_ABI,
            Web3API.provider,
            walletGet.p2tr
        );

        const calldata = contract.encodeCalldata('airdrop', [amounts]);

        const interactionParameters: IInteractionParameters = {
            from: walletGet.p2tr,
            to: contract.address.toString(),
            utxos: utxos,
            signer: walletGet.keypair,
            network: Web3API.network,
            feeRate: rawTxInfo.feeRate,
            priorityFee: rawTxInfo.priorityFee,
            calldata: calldata
        };

        console.log(interactionParameters);

        const sendTransact = await Web3API.transactionFactory.signInteraction(interactionParameters);

        // If this transaction is missing, opnet will deny the unwrapping request.
        const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact[0], false);
        if (!firstTransaction.success) {
            console.log('Broadcasted:', false);
            return;
        } else {
            console.log('Broadcasted:', firstTransaction);
        }

        // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
        const seconfTransaction = await Web3API.provider.sendRawTransaction(sendTransact[1], false);
        if (!seconfTransaction.success) {
            console.log('Broadcasted:', false);
            return;
        } else {
            // Add contractAddress to tokensImported in localStorage
            const getChain = await wallet.getChainType();

            const tokensImported = localStorage.getItem('tokensImported_' + getChain);
            let updatedTokens: string[] = tokensImported ? JSON.parse(tokensImported) : [];
            if (tokensImported) {
                updatedTokens = JSON.parse(tokensImported);
            }
            if (!updatedTokens.includes(contractAddress.toString())) {
                updatedTokens.push(contractAddress.toString());
                localStorage.setItem('tokensImported_' + getChain, JSON.stringify(updatedTokens));
            }
            console.log('Broadcasted:', seconfTransaction);
            tools.toastSuccess(`You have successfully deployed ${contractAddress}`);
            navigate('TxSuccessScreen', { txid: seconfTransaction.result, contractAddress: contractAddress });
        }
    };
    const airdrop = async () => {
        const contractAddress = rawTxInfo.address;
        const amounts = rawTxInfo.amounts;
        const foundObject = rawTxInfo.items.find(
            (obj) => obj.account && obj.account.address === rawTxInfo.account.address
        );
        const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
        const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);
        const utxos: UTXO[] = await Web3API.getUTXOs(walletGet.addresses, 100_000n);

        const contract: AirdropInterface = getContract<AirdropInterface>(
            contractAddress,
            AIRDROP_ABI,
            Web3API.provider,
            walletGet.p2tr
        );

        const calldata = contract.encodeCalldata('airdrop', [amounts]);

        const interactionParameters: IInteractionParameters = {
            from: walletGet.p2tr,
            to: contract.address.toString(),
            utxos: utxos,
            signer: walletGet.keypair,
            network: Web3API.network,
            feeRate: rawTxInfo.feeRate,
            priorityFee: rawTxInfo.priorityFee,
            calldata: calldata
        };

        console.log(interactionParameters);

        const sendTransact = await Web3API.transactionFactory.signInteraction(interactionParameters);

        // If this transaction is missing, opnet will deny the unwrapping request.
        const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact[0], false);
        if (!firstTransaction.success) {
            console.log('Broadcasted:', false);
            return;
        } else {
            console.log('Broadcasted:', firstTransaction);
        }

        // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
        const seconfTransaction = await Web3API.provider.sendRawTransaction(sendTransact[1], false);
        if (!seconfTransaction.success) {
            console.log('Broadcasted:', false);
            return;
        } else {
            // Add contractAddress to tokensImported in localStorage
            const getChain = await wallet.getChainType();

            const tokensImported = localStorage.getItem('tokensImported_' + getChain);
            let updatedTokens: string[] = tokensImported ? JSON.parse(tokensImported) : [];
            if (tokensImported) {
                updatedTokens = JSON.parse(tokensImported);
            }
            if (!updatedTokens.includes(contractAddress.toString())) {
                updatedTokens.push(contractAddress.toString());
                localStorage.setItem('tokensImported_' + getChain, JSON.stringify(updatedTokens));
            }
            console.log('Broadcasted:', seconfTransaction);
            tools.toastSuccess(`You have successfully deployed ${contractAddress}`);
            navigate('TxSuccessScreen', { txid: seconfTransaction.result, contractAddress: contractAddress });
        }
    };
    const claim = async () => {
        const foundObject = rawTxInfo.items.find(
            (obj) => obj.account && obj.account.address === rawTxInfo.account.address
        );
        const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
        const amountToSend = expandToDecimals(rawTxInfo.inputAmount, rawTxInfo.opneTokens[0].divisibility);
        const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);

        const contract: IWBTCContract = getContract<IWBTCContract>(
            Web3API.WBTC,
            WBTC_ABI,
            Web3API.provider,
            walletGet.p2tr
        );

        const stakeData = (await contract.claim()) as unknown as { calldata: Buffer };
        if ('error' in stakeData) {
            tools.toastError('Invalid calldata in stakeData');
            console.error('stakeDatas:', stakeData);
            tools.toastError('Claim failed, Try again later' as string);

            return;
        }

        let utxos: UTXO[];
        if (!useNextUTXO) {
            utxos = await Web3API.getUTXOs(walletGet.addresses, amountToSend);
        } else {
            const storedUTXO = localStorage.getItem('nextUTXO');
            utxos = storedUTXO
                ? JSON.parse(storedUTXO).map((utxo) => ({
                      ...utxo,
                      value: BigInt(utxo.value)
                  }))
                : [];
        }
        const interactionParameters: IInteractionParameters = {
            from: walletGet.p2tr,
            to: contract.address.toString(),
            utxos: utxos,
            signer: walletGet.keypair,
            network: Web3API.network,
            feeRate: rawTxInfo.feeRate,
            priorityFee: rawTxInfo.priorityFee,
            calldata: stakeData?.calldata as Buffer
        };

        const sendTransact = await Web3API.transactionFactory.signInteraction(interactionParameters);

        // If this transaction is missing, opnet will deny the unwrapping request.
        const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact[0], false);
        if (!firstTransaction.success) {
            console.log('Broadcasted:', false);
            tools.toastError('Error,Please Try again');
            setUseNextUTXO(true);
            setDisabled(false);
            return;
        }

        // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
        const seconfTransaction = await Web3API.provider.sendRawTransaction(sendTransact[1], false);
        if (!seconfTransaction.success) {
            console.log('Broadcasted:', false);
            return;
        }

        const claimAmount = bigIntToDecimal(amountToSend, 8).toString();

        tools.toastSuccess(`You have successfully claimed ${claimAmount} wBTC`);
        const nextUTXO = sendTransact[2];
        localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
        navigate('TxSuccessScreen', { txid: seconfTransaction.result });
    };

    const swap = async () => {
        const foundObject = rawTxInfo.items.find(
            (obj) => obj.account && obj.account.address === rawTxInfo.account.address
        );

        const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
        const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);
        const getSwap: IMotoswapRouterContract = getContract<IMotoswapRouterContract>(
            routerAddress,
            MOTOSWAP_ROUTER_ABI,
            Web3API.provider,
            walletGet.p2tr
        );

        const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        const inputAmountBigInt = expandToDecimals(rawTxInfo.inputAmount[0], rawTxInfo.opneTokens[0].divisibility);
        const storedUTXO = localStorage.getItem('nextUTXO');
        let utxos: UTXO[] = [];

        if (!useNextUTXO) {
            utxos = await Web3API.getUTXOs(walletGet.addresses, maxUint256);
            console.log(utxos);
        } else {
            utxos = storedUTXO
                ? JSON.parse(storedUTXO).map((utxo) => ({
                      ...utxo,
                      value: BigInt(utxo.value)
                  }))
                : [];
        }
        const getData = await approveToken(inputAmountBigInt, walletGet, rawTxInfo.contractAddress[0], utxos);
        const getnextUtxo = await approveToken(inputAmountBigInt, walletGet, rawTxInfo.contractAddress[1], getData);
        const sliipageAmount = Number(rawTxInfo.inputAmount[1]) * Number(rawTxInfo.slippageTolerance / 100);
        const outPutAmountBigInt = expandToDecimals(
            rawTxInfo.inputAmount[1] - sliipageAmount,
            rawTxInfo.opneTokens[1].divisibility
        );

        const block = await Web3API.provider.getBlockNumber();

        const contractResult = getSwap.encodeCalldata('swapExactTokensForTokensSupportingFeeOnTransferTokens', [
            inputAmountBigInt,
            outPutAmountBigInt,
            [rawTxInfo.contractAddress[0], rawTxInfo.contractAddress[1]],
            walletGet.p2tr,
            block + 10000n
        ]);

        const interactionParameters: IInteractionParameters = {
            from: walletGet.p2tr,
            to: routerAddress,
            utxos: getnextUtxo,
            signer: walletGet.keypair,
            network: Web3API.network,
            feeRate: rawTxInfo.feeRate,
            priorityFee: rawTxInfo.priorityFee,
            calldata: contractResult as Buffer
        };
        const sendTransact = await Web3API.transactionFactory.signInteraction(interactionParameters);

        // If this transaction is missing, opnet will deny the unwrapping request.
        const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact[0], false);
        if (!firstTransaction || !firstTransaction.success) {
            // tools.toastError('Error,Please Try again');
            tools.toastError('Error,Please Try again');
            setUseNextUTXO(true);
            setDisabled(false);
            console.log(firstTransaction);
            tools.toastError('Could not broadcast first transaction');
        }

        // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
        const secondTransaction = await Web3API.provider.sendRawTransaction(sendTransact[1], false);
        if (!secondTransaction || !secondTransaction.success) {
            // tools.toastError('Error,Please Try again');
            tools.toastError('Could not broadcast first transaction');
            return;
        } else {
            console.log(rawTxInfo.inputAmount);
            const amountA = Number(rawTxInfo.inputAmount[0]).toLocaleString();
            const amountB = Number(rawTxInfo.inputAmount[1]).toLocaleString();
            tools.toastSuccess(
                `You have successfully swapped ${amountA} ${rawTxInfo.opneTokens[0].symbol} for ${amountB}  ${rawTxInfo.opneTokens[1].symbol}`
            );
            const nextUTXO = sendTransact[2];
            localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
            navigate('TxSuccessScreen', { txid: secondTransaction.result });
        }
    };
    const approveToken = async (inputAmountBigInt: bigint, walletGet: Wallet, tokenAddress: string, utxos: UTXO[]) => {
        try {
            const contract = getContract<IOP_20Contract>(tokenAddress, OP_20_ABI, Web3API.provider, walletGet.p2tr);
            const getRemaining = await contract.allowance(walletGet.p2tr, routerAddress);
            if ('error' in getRemaining) {
                tools.toastError(getRemaining.error);
                throw new Error(getRemaining.error);
            }
            if ((getRemaining.decoded[0] as bigint) > inputAmountBigInt) {
                return utxos;
            }
            const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
            const contractApprove: BaseContractProperty = await contract.approve(routerAddress, maxUint256);
            if ('error' in contractApprove) {
                tools.toastError(contractApprove.error);
                throw new Error(contractApprove.error);
            }
            const interactionParameters: IInteractionParameters = {
                from: walletGet.p2tr,
                to: contract.address.toString(),
                utxos: utxos,
                signer: walletGet.keypair,
                network: Web3API.network,
                feeRate: rawTxInfo.feeRate,
                priorityFee: rawTxInfo.priorityFee,
                calldata: contractApprove.calldata as Buffer
            };

            const sendTransact = await Web3API.transactionFactory.signInteraction(interactionParameters);

            // If this transaction is missing, opnet will deny the unwrapping request.
            const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact[0], false);
            if (!firstTransaction || !firstTransaction.success) {
                // tools.toastError('Error,Please Try again');
                console.log(firstTransaction);
                tools.toastError('Could not broadcast first transaction');
            }

            // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
            const secondTransaction = await Web3API.provider.sendRawTransaction(sendTransact[1], false);
            if (!secondTransaction || !secondTransaction.success) {
                // tools.toastError('Error,Please Try again');
                tools.toastError('Could not broadcast first transaction');
            } else {
                console.log(secondTransaction);
            }
            return sendTransact[2];
        } catch (e) {
            console.log(e);
            setDisabled(false);
            return utxos;
        }
    };

    const sendBTC = async () => {
        try {
            const account = await wallet.getCurrentAccount();

            const currentNetwork = await wallet.getChainType();
            Web3API.setNetwork(currentNetwork);

            const foundObject = rawTxInfo.items.find(
                (obj) => obj.account && obj.account.address === rawTxInfo.account.address
            );

            const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
            const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);

            const storedUTXO = localStorage.getItem('nextUTXO');
            let utxos: UTXO[] = storedUTXO
                ? JSON.parse(storedUTXO).map((utxo) => ({
                      ...utxo,
                      value: BigInt(utxo.value)
                  }))
                : [];

            if (!utxos || (utxos && utxos.length === 0) || useNextUTXO) {
                utxos = await Web3API.getUTXOs([account.address], expandToDecimals(rawTxInfo.inputAmount, 8) * 2n);
            }

            const IFundingTransactionParameters: IFundingTransactionParameters = {
                amount: expandToDecimals(rawTxInfo.inputAmount, 8) - 330n,
                utxos: utxos,
                signer: walletGet.keypair,
                network: Web3API.network,
                feeRate: rawTxInfo.feeRate,
                priorityFee: rawTxInfo.priorityFee,
                to: rawTxInfo.address,
                from: walletGet.p2tr
            };

            const sendTransact = await Web3API.transactionFactory.createBTCTransfer(IFundingTransactionParameters);
            const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact.tx, false);
            if (!firstTransaction || !firstTransaction.success) {
                setUseNextUTXO(true);
                setDisabled(false);
                tools.toastError('Error: Could not broadcast first transaction');
                return;
            }

            const amountA = Number(rawTxInfo.inputAmount).toLocaleString();
            tools.toastSuccess(`You have successfully transferred ${amountA} ${rawTxInfo.opneTokens[0].symbol}`);

            localStorage.setItem('nextUTXO', JSON.stringify(sendTransact.nextUTXOs));
            navigate('TxSuccessScreen', { txid: firstTransaction.result });

            setUseNextUTXO(false);
        } catch (e) {
            localStorage.removeItem('nextUTXO');

            tools.toastError(`Error: ${e}`);
            setUseNextUTXO(true);
            setDisabled(false);
            throw e;
        }
    };
    const deployContract = async () => {
        try {
            const foundObject = rawTxInfo.items.find(
                (obj) => obj.account && obj.account.address === rawTxInfo.account.address
            );

            const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
            const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);

            let utxos: UTXO[] = [];
            if (!useNextUTXO) {
                utxos = await Web3API.getUTXOs(walletGet.addresses, expandToDecimals(0.08, 8));
            } else {
                const storedUTXO = localStorage.getItem('nextUTXO');
                utxos = storedUTXO
                    ? JSON.parse(storedUTXO).map((utxo) => ({
                          ...utxo,
                          value: BigInt(utxo.value)
                      }))
                    : [];
            }

            const arrayBuffer = await rawTxInfo.file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const deploymentParameters: IDeploymentParameters = {
                utxos: utxos,
                signer: walletGet.keypair,
                network: Web3API.network,
                feeRate: rawTxInfo.feeRate,
                priorityFee: rawTxInfo.priorityFee,
                from: walletGet.p2tr,
                bytecode: Buffer.from(uint8Array)
            };

            const sendTransact: DeploymentResult = await Web3API.transactionFactory.signDeployment(
                deploymentParameters
            );

            const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact.transaction[0], false);
            if (!firstTransaction || !firstTransaction.success || firstTransaction.error) {
                setUseNextUTXO(true);
                setDisabled(false);
                tools.toastError('Could not broadcast first transaction');

                return;
            }

            // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
            const secondTransaction = await Web3API.provider.sendRawTransaction(sendTransact.transaction[1], false);
            if (secondTransaction.result && !secondTransaction.error && secondTransaction.success) {
                await waitForTransaction(secondTransaction.result, setOpenLoading, tools);

                const getChain = await wallet.getChainType();
                const tokensImported = localStorage.getItem('tokensImported_' + getChain);
                let updatedTokens: string[] = tokensImported ? JSON.parse(tokensImported) : [];
                if (tokensImported) {
                    updatedTokens = JSON.parse(tokensImported);
                }

                if (!updatedTokens.includes(sendTransact.contractAddress.toString())) {
                    updatedTokens.push(sendTransact.contractAddress.toString());
                    localStorage.setItem('tokensImported_' + getChain, JSON.stringify(updatedTokens));
                }

                tools.toastSuccess(`You have successfully deployed ${sendTransact.contractAddress}`);

                const nextUTXO = sendTransact.utxos;
                localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
                navigate('TxSuccessScreen', {
                    txid: secondTransaction.result,
                    contractAddress: sendTransact.contractAddress
                });
            } else {
                tools.toastError(`Error: ${secondTransaction.error}`);

                setOpenLoading(false);
                setDisabled(false);
            }
        } catch (e) {
            console.log(e);
            setDisabled(false);
            setDisabled(false);
        }
    };
    const mint = async () => {
        try {
            const foundObject = rawTxInfo.items.find(
                (obj) => obj.account && obj.account.address === rawTxInfo.account.address
            );
            const wifWallet = await wallet.getInternalPrivateKey(foundObject?.account as Account);
            const walletGet: Wallet = Wallet.fromWif(wifWallet.wif, Web3API.network);

            let utxos: UTXO[] = [];
            if (!useNextUTXO) {
                utxos = await Web3API.getUTXOs(walletGet.addresses, expandToDecimals(0.08, 8));
            } else {
                const storedUTXO = localStorage.getItem('nextUTXO');
                utxos = storedUTXO
                    ? JSON.parse(storedUTXO).map((utxo) => ({
                          ...utxo,
                          value: BigInt(utxo.value)
                      }))
                    : [];
            }
            const contract = getContract<IOP_20Contract>(
                rawTxInfo.contractAddress,
                OP_20_ABI,
                Web3API.provider,
                walletGet.p2tr
            );
            const mintData = await contract.mint(walletGet.p2tr, rawTxInfo.inputAmount);
            if ('error' in mintData) {
                console.log(mintData);
                tools.toastError('Error');
                return;
            }
            const interactionParameters: IInteractionParameters = {
                from: walletGet.p2tr,
                to: contract.address.toString(),
                utxos: utxos,
                signer: walletGet.keypair,
                network: Web3API.network,
                feeRate: rawTxInfo.feeRate,
                priorityFee: rawTxInfo.priorityFee,
                calldata: mintData.calldata as Buffer
            };

            const sendTransact = await Web3API.transactionFactory.signInteraction(interactionParameters);
            const firstTransaction = await Web3API.provider.sendRawTransaction(sendTransact[0], false);
            if (!firstTransaction || !firstTransaction.success) {
                // tools.toastError('Error,Please Try again');
                console.log(firstTransaction);
                tools.toastError('Error,Please Try again');
                setUseNextUTXO(true);
                setDisabled(false);
                tools.toastError('Could not broadcast first transaction');
            }

            // This transaction is partially signed. You can not submit it to the Bitcoin network. It must pass via the OPNet network.
            const secondTransaction = await Web3API.provider.sendRawTransaction(sendTransact[1], false);
            if (!secondTransaction || !secondTransaction.success) {
                // tools.toastError('Error,Please Try again');
                tools.toastError('Could not broadcast first transaction');
            }

            tools.toastSuccess(`You have successfully minted ${rawTxInfo.inputAmount} `);
            const nextUTXO = sendTransact[2];
            localStorage.setItem('nextUTXO', JSON.stringify(nextUTXO));
            navigate('TxSuccessScreen', { txid: secondTransaction.result });
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

                    <Section title="Opnet Fee Rate:">
                        <Text text={rawTxInfo.priorityFee.toString()} />

                        <Text text="sat/vB" color="textDim" />
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
                                case 'wrap':
                                    await handleWrapConfirm();
                                    break;
                                case 'unwrap':
                                    await handleUnWrapConfirm();
                                    break;
                                case 'stake':
                                    await stake();
                                    break;
                                case 'unstake':
                                    await unstake();
                                    break;
                                case 'claim':
                                    await claim();
                                    break;
                                case 'swap':
                                    await swap();
                                    break;
                                case 'sendBTC':
                                    await sendBTC();
                                    break;
                                case 'deploy':
                                    await deployContract();
                                    break;
                                case 'mint':
                                    await mint();
                                    break;
                                case 'airdrop':
                                    await airdrop();
                                    break;
                                default:
                                    await handleConfirm();
                            }
                        }}
                        full
                    />
                </Row>
            </Footer>
            {openAcceptbar && (
                <ConfirmUnWrap
                    onClose={() => {
                        setDisabled(false);
                        setAcceptBar(false);
                    }}
                    acceptWrapMessage={acceptWrapMessage}
                    setAcceptWrap={setAcceptWrap}
                />
            )}
            {openLoading && (
                <BottomModal
                    onClose={() => {
                        setDisabled(false);
                        setOpenLoading(false);
                    }}>
                    <Column style={{ minHeight: 150 }} itemsCenter justifyCenter>
                        <LoadingOutlined />
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
