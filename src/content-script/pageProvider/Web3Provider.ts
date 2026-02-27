import { BroadcastedTransaction } from 'opnet';

import { OpnetProvider } from '@/content-script/pageProvider/index.js';
import {
    BitcoinTransferBase,
    CancelledTransaction,
    DeploymentResult,
    ICancelTransactionParametersWithoutSigner,
    IDeploymentParametersWithoutSigner,
    IFundingTransactionParametersWithoutSigner,
    InteractionParametersWithoutSigner,
    InteractionResponse,
    UTXO
} from '@btc-vision/transaction';

export interface BroadcastTransactionOptions {
    raw: string;
    psbt: boolean;
}

export class Web3Provider {
    protected readonly provider: OpnetProvider;

    constructor(provider: OpnetProvider) {
        this.provider = provider;
    }

    /**
     * Build, sign, and broadcast a BTC funding transaction.
     * The wallet provides signer, network, and MLDSA internally.
     */
    public async sendBitcoin(
        params: IFundingTransactionParametersWithoutSigner
    ): Promise<BitcoinTransferBase> {
        if ('signer' in params) {
            console.warn('signer is not allowed in funding parameters');
            (params as Record<string, unknown>).signer = undefined;
        }

        return this.provider._request({
            method: 'sendBitcoin',
            params
        }) as Promise<BitcoinTransferBase>;
    }

    /**
     * Sign a PSBT (Partially Signed Bitcoin Transaction).
     *
     * NOT IMPLEMENTED YET.
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async signPsbt(_psbtHex: string, _options?: object): Promise<string> {
        throw new Error(
            'signPsbt is not implemented yet in the Web3Provider. Use signInteraction for contract calls.'
        );
    }

    public async signAndBroadcastInteraction(
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<[BroadcastedTransaction, BroadcastedTransaction, UTXO[], string]> {
        if ('signer' in interactionParameters) {
            console.warn('signer is not allowed in interaction parameters');
            interactionParameters.signer = undefined;
        }

        return this.provider.signAndBroadcastInteraction(interactionParameters);
    }

    public async signInteraction(
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<InteractionResponse> {
        if ('signer' in interactionParameters) {
            console.warn('signer is not allowed in interaction parameters');
            interactionParameters.signer = undefined;
        }

        return this.provider.signInteraction(interactionParameters);
    }

    public async deployContract(params: IDeploymentParametersWithoutSigner): Promise<DeploymentResult> {
        return this.provider.deployContract(params);
    }

    public async cancelTransaction(
        params: ICancelTransactionParametersWithoutSigner
    ): Promise<CancelledTransaction> {
        return this.provider.cancelTransaction(params);
    }

    public async broadcast(transactions: BroadcastTransactionOptions[]): Promise<BroadcastedTransaction[]> {
        return this.provider.broadcast(transactions);
    }

    /**
     * Sign arbitrary data with ECDSA or Schnorr.
     * @param data - Hexadecimal string of data to sign
     * @param type - Signature algorithm: 'ecdsa' or 'schnorr'
     * @param originalMessage - Optional original message (JSON) for display in approval UI. If provided,
     *                          the approval UI will display the parsed JSON alongside the hex data,
     *                          allowing the user to verify what they are signing.
     * @returns The signature in hex format
     */
    public async signData(
        data: string,
        type: 'ecdsa' | 'schnorr' = 'schnorr',
        originalMessage?: string
    ): Promise<string> {
        return this.provider.signData(data, type, originalMessage) as Promise<string>;
    }

    /**
     * Sign a message using Schnorr signature.
     * Convenience wrapper for signData with type='schnorr'.
     * @param message - Hexadecimal string message to sign
     * @returns The Schnorr signature in hex format
     */
    public async signSchnorr(message: string): Promise<string> {
        return this.provider.signData(message, 'schnorr') as Promise<string>;
    }

    public async getMLDSAPublicKey(): Promise<string> {
        return this.provider.getMLDSAPublicKey();
    }

    public async signMLDSAMessage(message: string): Promise<{
        signature: string;
        message: string;
        publicKey: string;
        securityLevel: number;
    }> {
        return this.provider.signMLDSAMessage(message);
    }

    public async verifyMLDSASignature(
        message: string,
        signature: string,
        publicKey: string,
        securityLevel: number
    ): Promise<boolean> {
        return this.provider.verifyMLDSASignature(message, signature, publicKey, securityLevel);
    }
}
