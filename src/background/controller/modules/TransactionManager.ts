import { keyringService, openapiService } from '@/background/service';
import { KEYRING_TYPE, AddressType, NETWORK_TYPES } from '@/shared/constant';
import { 
    Account, 
    AddressUserToSignInput, 
    DecodedPsbt, 
    PublicKeyUserToSignInput, 
    SignPsbtOptions, 
    ToSignInput,
    NetworkType 
} from '@/shared/types';
import { getChainInfo } from '@/shared/utils';
import {
    Address,
    IDeploymentParameters,
    IInteractionParameters,
    InteractionParametersWithoutSigner,
    UTXO as TransactionUTXO,
    Wallet
} from '@btc-vision/transaction';
import { 
    Psbt, 
    Transaction,
    toXOnly,
    payments
} from '@btc-vision/bitcoin';
import { 
    KeystoneKeyring,
    toPsbtNetwork,
    signMessageOfBIP322Simple
} from '@btc-vision/wallet-sdk';
import { BroadcastTransactionOptions } from '@/content-script/pageProvider/Web3Provider.js';
import Web3API from '@/shared/web3/Web3API';

import { WalletControllerError } from './WalletControllerError';

export class TransactionManager {
    private accountManager: any;

    constructor(accountManager?: any) {
        this.accountManager = accountManager;
    }

    public async decodePsbt(psbtHex: string): Promise<DecodedPsbt> {
        return openapiService.decodePsbt(psbtHex);
    }

    public async signPsbt(
        psbt: Psbt, 
        toSignInputs?: ToSignInput[], 
        autoFinalized = true
    ): Promise<Psbt> {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }

        const keyring = await this.getCurrentKeyring();
        if (!keyring) throw new WalletControllerError('No current keyring');
        const __keyring = keyringService.keyrings[keyring.index];

        const networkType = this.getNetworkType();
        const psbtNetwork = toPsbtNetwork(networkType);

        if (!toSignInputs) {
            const formatted = this.formatOptionsToSignInputs(psbt);
            toSignInputs = formatted.toSignInputs;
            autoFinalized = formatted.autoFinalized;
        }

        // Attempt to fix missing tapInternalKey for P2TR inputs
        psbt.data.inputs.forEach((v) => {
            const isNotSigned = !(v.finalScriptSig ?? v.finalScriptWitness);
            const isP2TR = keyring.addressType === AddressType.P2TR || keyring.addressType === AddressType.M44_P2TR;
            const lostInternalPubkey = !v.tapInternalKey;

            if (isNotSigned && isP2TR && lostInternalPubkey) {
                const tapInternalKey = toXOnly(Buffer.from(account.pubkey, 'hex'));
                const { output } = payments.p2tr({
                    internalPubkey: tapInternalKey,
                    network: psbtNetwork
                });
                if (v.witnessUtxo?.script.toString('hex') === output?.toString('hex')) {
                    v.tapInternalKey = tapInternalKey;
                }
            }
        });

        // Keystone special handling
        if (keyring.type === KEYRING_TYPE.KeystoneKeyring) {
            const _keyring = __keyring as KeystoneKeyring;
            if (!_keyring.mfp) {
                throw new WalletControllerError('No master fingerprint found in Keystone keyring');
            }

            toSignInputs.forEach((input) => {
                const isP2TR = keyring.addressType === AddressType.P2TR || keyring.addressType === AddressType.M44_P2TR;
                const bip32Derivation = {
                    masterFingerprint: Buffer.from(_keyring.mfp, 'hex'),
                    path: `${keyring.hdPath}/${account.index}`,
                    pubkey: Buffer.from(account.pubkey, 'hex')
                };

                if (isP2TR) {
                    psbt.data.inputs[input.index].tapBip32Derivation = [
                        {
                            ...bip32Derivation,
                            pubkey: bip32Derivation.pubkey.subarray(1),
                            leafHashes: []
                        }
                    ];
                } else {
                    psbt.data.inputs[input.index].bip32Derivation = [bip32Derivation];
                }
            });
            return psbt;
        }

        // Normal keyring
        const signedPsbt = keyringService.signTransaction(__keyring, psbt, toSignInputs);
        if (autoFinalized) {
            toSignInputs.forEach((input) => {
                signedPsbt.finalizeInput(input.index);
            });
        }
        return signedPsbt;
    }

    public async signPsbtWithHex(
        psbtHex: string,
        toSignInputs: ToSignInput[],
        autoFinalized: boolean
    ): Promise<string> {
        const psbt = Psbt.fromHex(psbtHex);
        await this.signPsbt(psbt, toSignInputs, autoFinalized);
        return psbt.toHex();
    }

    public async signPsbts(
        psbtHexs: string[], 
        options?: SignPsbtOptions[], 
        type?: string
    ): Promise<string[]> {
        const results: string[] = [];
        
        for (let i = 0; i < psbtHexs.length; i++) {
            const psbtHex = psbtHexs[i];
            const option = options?.[i];
            
            const psbt = Psbt.fromHex(psbtHex);
            let toSignInputs: ToSignInput[] = [];
            let autoFinalized = true;

            if (option) {
                const formatted = this.formatOptionsToSignInputs(psbt, option);
                toSignInputs = formatted.toSignInputs;
                autoFinalized = formatted.autoFinalized;
            }

            const signedPsbt = await this.signPsbt(psbt, toSignInputs, autoFinalized);
            results.push(signedPsbt.toHex());
        }

        return results;
    }

    public async signMessage(message: string | Buffer): Promise<string> {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }
        return keyringService.signMessage(account.pubkey, account.type, message);
    }

    public async signInteraction(
        params: InteractionParametersWithoutSigner
    ): Promise<IInteractionParameters> {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }

        const keyring = await this.getCurrentKeyring();
        if (!keyring) {
            throw new WalletControllerError('No current keyring');
        }

        const __keyring = keyringService.keyrings[keyring.index];
        const privateKey = __keyring.exportAccount(account.pubkey);

        const wallet = new Wallet(privateKey);
        
        // InteractionParametersWithoutSigner needs signer added to become IInteractionParameters
        const interactionParams: IInteractionParameters = {
            ...params,
            signer: wallet
        };
        
        return Web3API.transactionFactory.signInteraction(interactionParams);
    }

    public async signDeployment(
        params: IDeploymentParameters
    ): Promise<IDeploymentParameters> {
        const account = await this.getCurrentAccount();
        if (!account) {
            throw new WalletControllerError('No current account');
        }

        const keyring = await this.getCurrentKeyring();
        if (!keyring) {
            throw new WalletControllerError('No current keyring');
        }

        const __keyring = keyringService.keyrings[keyring.index];
        const privateKey = __keyring.exportAccount(account.pubkey);

        const wallet = new Wallet(privateKey);
        
        // IDeploymentParameters already includes signer field
        const deploymentParams: IDeploymentParameters = {
            ...params,
            signer: wallet
        };
        
        return Web3API.transactionFactory.signDeployment(deploymentParams);
    }

    public async pushTx(rawTx: string): Promise<string> {
        return openapiService.pushTx(rawTx);
    }

    public async pushPsbt(psbtHex: string): Promise<string> {
        return openapiService.pushPsbt(psbtHex);
    }

    public async broadcastTransaction(
        transaction: Transaction, 
        options?: BroadcastTransactionOptions
    ): Promise<string> {
        const rawTx = transaction.toHex();
        return this.pushTx(rawTx);
    }

    public formatOptionsToSignInputs(
        psbt: Psbt,
        options?: SignPsbtOptions
    ): {
        toSignInputs: ToSignInput[];
        autoFinalized: boolean;
    } {
        let toSignInputs: ToSignInput[] = [];
        let autoFinalized = true;

        if (options && options.toSignInputs) {
            const validateInputs = (inputs: any[]): inputs is (AddressUserToSignInput | PublicKeyUserToSignInput)[] => {
                return inputs.every(input => 
                    input && (
                        ('address' in input && typeof input.address === 'string') ||
                        ('publicKey' in input && typeof input.publicKey === 'string')
                    )
                );
            };

            if (!validateInputs(options.toSignInputs)) {
                throw new WalletControllerError('Invalid toSignInputs format');
            }

            toSignInputs = options.toSignInputs.map(input => {
                if ('address' in input) {
                    return {
                        index: input.index,
                        address: input.address,
                        sighashTypes: input.sighashTypes,
                        disableTweakSigner: input.disableTweakSigner
                    };
                } else {
                    return {
                        index: input.index,
                        publicKey: input.publicKey,
                        sighashTypes: input.sighashTypes,
                        disableTweakSigner: input.disableTweakSigner
                    };
                }
            });

            if (options.autoFinalized !== undefined) {
                autoFinalized = options.autoFinalized;
            }
        } else {
            // Auto-detect all inputs
            const inputCount = psbt.data.inputs.length;
            for (let i = 0; i < inputCount; i++) {
                toSignInputs.push({ index: i });
            }
            autoFinalized = true;
        }

        return {
            toSignInputs,
            autoFinalized
        };
    }

    private async getCurrentAccount(): Promise<Account | null> {
        if (this.accountManager) {
            return this.accountManager.getCurrentAccount();
        }
        return keyringService.getCurrentAccount();
    }

    private async getCurrentKeyring(): Promise<any> {
        if (this.accountManager) {
            return this.accountManager.getEditingKeyring();
        }
        return keyringService.getEditingKeyring();
    }

    private getNetworkType(): NetworkType {
        const chainInfo = getChainInfo();
        return chainInfo.networkType || NETWORK_TYPES.MAINNET;
    }
}