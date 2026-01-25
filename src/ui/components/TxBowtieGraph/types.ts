// Types for transaction inputs/outputs
export interface TxInput {
    txid?: string;
    vout?: number;
    address: string;
    value: number; // in satoshis
    isToSign?: boolean;
    isCoinbase?: boolean;
}

export interface TxOutput {
    address: string;
    value: number; // in satoshis
    isChange?: boolean;
    isFee?: boolean;
    isEpochMiner?: boolean; // OPNet epoch miner output (gas fee)
}
