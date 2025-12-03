import { BroadcastedTransaction } from 'opnet';

import { OpnetProvider } from '@/content-script/pageProvider/index.js';
import {
    CancelledTransaction,
    DeploymentResult,
    ICancelTransactionParametersWithoutSigner,
    IDeploymentParametersWithoutSigner,
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

    public async signAndBroadcastInteraction(
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<[BroadcastedTransaction, BroadcastedTransaction, UTXO[], string]> {
        if ('signer' in interactionParameters) {
            console.warn(`signer is not allowed in interaction parameters`);

            interactionParameters.signer = undefined;
        }

        return this.provider.signAndBroadcastInteraction(interactionParameters);
    }

    public async signInteraction(
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<InteractionResponse> {
        if ('signer' in interactionParameters) {
            console.warn(`signer is not allowed in interaction parameters`);

            interactionParameters.signer = undefined;
        }

        return this.provider.signInteraction(interactionParameters);
    }

    public async deployContract(params: IDeploymentParametersWithoutSigner): Promise<DeploymentResult> {
        return this.provider.deployContract(params);
    }

    public async cancelTransaction(params: ICancelTransactionParametersWithoutSigner): Promise<CancelledTransaction> {
        return this.provider.cancelTransaction(params);
    }

    public async broadcast(transactions: BroadcastTransactionOptions[]): Promise<BroadcastedTransaction[]> {
        return this.provider.broadcast(transactions);
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
