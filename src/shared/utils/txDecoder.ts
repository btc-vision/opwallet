/**
 * Transaction Decoder Utility
 * Parses raw Bitcoin transaction hex to extract inputs, outputs, and calculate fees.
 * Uses @btc-vision/bitcoin for accurate parsing.
 */

import { Transaction, address, Network } from '@btc-vision/bitcoin';
import { ParsedTransaction, ParsedTxOutput } from '@/background/service/notification';
import { UTXO } from '@btc-vision/transaction';

/**
 * Decode a raw transaction hex string and extract inputs/outputs
 * @param txHex - Raw transaction hex
 * @param utxos - UTXOs used as inputs (to get input values)
 * @param network - Bitcoin network
 * @returns ParsedTransaction with inputs, outputs, and calculated fees
 */
export function decodeTransaction(
    txHex: string,
    utxos: UTXO[],
    network: Network
): ParsedTransaction {
    const tx = Transaction.fromHex(txHex);
    const txid = tx.getId();

    // Create a map of UTXOs by txid:vout for quick lookup
    const utxoMap = new Map<string, UTXO>();
    for (const utxo of utxos) {
        const key = `${utxo.transactionId}:${utxo.outputIndex}`;
        utxoMap.set(key, utxo);
    }

    // Parse inputs
    const inputs: ParsedTransaction['inputs'] = [];
    let totalInputValue = 0n;

    for (const input of tx.ins) {
        const txidHex = Buffer.from(input.hash).reverse().toString('hex');
        const vout = input.index;
        const key = `${txidHex}:${vout}`;
        const utxo = utxoMap.get(key);

        const value = utxo ? utxo.value : 0n;
        totalInputValue += value;

        inputs.push({
            txid: txidHex,
            vout,
            value
        });
    }

    // Parse outputs
    const outputs: ParsedTxOutput[] = [];
    let totalOutputValue = 0n;

    for (const output of tx.outs) {
        const value = BigInt(output.value);
        totalOutputValue += value;

        // Check if OP_RETURN
        const isOpReturn = output.script.length > 0 && output.script[0] === 0x6a;

        // Try to extract address from script
        let outputAddress: string | null = null;
        if (!isOpReturn) {
            try {
                outputAddress = address.fromOutputScript(output.script, network);
            } catch {
                // Script doesn't have a standard address
                outputAddress = null;
            }
        }

        outputs.push({
            address: outputAddress,
            value,
            script: output.script.toString('hex'),
            isOpReturn
        });
    }

    // Calculate mining fee = inputs - outputs
    const minerFee = totalInputValue - totalOutputValue;

    return {
        txid,
        hex: txHex,
        size: tx.byteLength(),
        vsize: tx.virtualSize(),
        inputs,
        outputs,
        totalInputValue,
        totalOutputValue,
        minerFee
    };
}

/**
 * Decode an interaction transaction and identify the OPNet Epoch Miner output
 * The first output of an interaction transaction is always the epoch miner (gas fee)
 * @param txHex - Raw interaction transaction hex
 * @param utxos - UTXOs used as inputs
 * @param network - Bitcoin network
 * @returns ParsedTransaction with epochMiner output identified
 */
export function decodeInteractionTransaction(
    txHex: string,
    utxos: UTXO[],
    network: Network
): { transaction: ParsedTransaction; epochMinerOutput: ParsedTxOutput | null } {
    const transaction = decodeTransaction(txHex, utxos, network);

    // First output is the OPNet Epoch Miner (gas fee recipient)
    const epochMinerOutput = transaction.outputs.length > 0 ? transaction.outputs[0] : null;

    return {
        transaction,
        epochMinerOutput
    };
}

/**
 * Decode a funding transaction
 * @param txHex - Raw funding transaction hex
 * @param utxos - UTXOs used as inputs
 * @param network - Bitcoin network
 * @returns ParsedTransaction
 */
export function decodeFundingTransaction(
    txHex: string,
    utxos: UTXO[],
    network: Network
): ParsedTransaction {
    return decodeTransaction(txHex, utxos, network);
}

/**
 * Parse a SignedInteractionTransactionReceipt into PreSignedTransactionData format
 */
export interface DecodedPreSignedData {
    transactions: ParsedTransaction[];
    totalMiningFee: bigint;
    opnetGasFee: bigint;
    epochMinerOutput: ParsedTxOutput | null;
}

export function decodeSignedInteractionReceipt(
    fundingTxHex: string | null,
    interactionTxHex: string,
    fundingUtxos: UTXO[],
    nextUtxos: UTXO[],
    network: Network
): DecodedPreSignedData {
    const transactions: ParsedTransaction[] = [];
    let totalMiningFee = 0n;

    // Decode funding transaction if present
    if (fundingTxHex) {
        const fundingTx = decodeTransaction(fundingTxHex, fundingUtxos, network);
        transactions.push(fundingTx);
        totalMiningFee += fundingTx.minerFee;
    }

    // For interaction transaction, we need to figure out which UTXOs it uses
    // If there's a funding tx, the interaction uses outputs from funding tx
    // Otherwise it uses the original fundingUtxos
    let interactionInputUtxos: UTXO[];

    if (fundingTxHex) {
        // Parse the funding tx to get its outputs as UTXOs for the interaction
        const fundingTx = Transaction.fromHex(fundingTxHex);
        const fundingTxid = fundingTx.getId();

        interactionInputUtxos = fundingTx.outs.map((out, index) => ({
            transactionId: fundingTxid,
            outputIndex: index,
            value: BigInt(out.value),
            scriptPubKey: {
                hex: out.script.toString('hex'),
                address: ''
            }
        }));
    } else {
        interactionInputUtxos = fundingUtxos;
    }

    // Decode interaction transaction
    const { transaction: interactionTx, epochMinerOutput } = decodeInteractionTransaction(
        interactionTxHex,
        interactionInputUtxos,
        network
    );
    transactions.push(interactionTx);
    totalMiningFee += interactionTx.minerFee;

    // OPNet gas fee is the value of the first output (epoch miner)
    const opnetGasFee = epochMinerOutput?.value ?? 0n;

    return {
        transactions,
        totalMiningFee,
        opnetGasFee,
        epochMinerOutput
    };
}

/**
 * Decode a Bitcoin transfer transaction
 */
export function decodeBitcoinTransfer(
    txHex: string,
    utxos: UTXO[],
    network: Network
): DecodedPreSignedData {
    const transaction = decodeTransaction(txHex, utxos, network);

    return {
        transactions: [transaction],
        totalMiningFee: transaction.minerFee,
        opnetGasFee: 0n,
        epochMinerOutput: null
    };
}
