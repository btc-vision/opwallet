import { permissionService, sessionService } from '@/background/service';
import { CHAINS, CHAINS_MAP, ChainType, NETWORK_TYPES, VERSION } from '@/shared/constant';
import 'reflect-metadata';

import { Session } from '@/background/service/session';
import { IDeploymentParametersWithoutSigner } from '@/content-script/pageProvider/Web3Provider';
import { SessionEvent } from '@/shared/interfaces/SessionEvent';
import { providerErrors } from '@/shared/lib/bitcoin-rpc-errors/errors';
import { NetworkType } from '@/shared/types';
import { ApprovalType } from '@/shared/types/Approval';
import { ProviderControllerRequest } from '@/shared/types/Request.js';
import { getChainInfo } from '@/shared/utils';
import Web3API from '@/shared/web3/Web3API';
import { DetailedInteractionParameters } from '@/shared/web3/interfaces/DetailedInteractionParameters';
import { amountToSatoshis } from '@/ui/utils';
import { bitcoin } from '@btc-vision/wallet-sdk/lib/bitcoin-core';
import { verifyMessageOfBIP322Simple } from '@btc-vision/wallet-sdk/lib/message';
import { toPsbtNetwork } from '@btc-vision/wallet-sdk/lib/network';
import wallet from '../wallet';

function formatPsbtHex(psbtHex: string) {
    let formatData = '';
    try {
        if (!/^[0-9a-fA-F]+$/.test(psbtHex)) {
            formatData = bitcoin.Psbt.fromBase64(psbtHex).toHex();
        } else {
            bitcoin.Psbt.fromHex(psbtHex);
            formatData = psbtHex;
        }
    } catch (e) {
        throw new Error('invalid psbt');
    }
    return formatData;
}

// TODO (typing): check if we really need this function. We are passing buffer parameter and trying to return Uint8Array
// For now, the lint error is fixed by disabling it. If we no longer need this function, we can remove it completely.
function objToBuffer(obj: object): Uint8Array {
    const keys = Object.keys(obj);
    const values = Object.values(obj);

    const buffer = new Uint8Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        buffer[i] = values[i];
    }

    return buffer;
}

export class ProviderController {
    requestAccounts = async (params: { session: Session }) => {
        const origin = params.session.origin;
        if (!permissionService.hasPermission(origin)) {
            throw providerErrors.unauthorized();
        }

        const _account = await wallet.getCurrentAccount();
        const account = _account ? [_account.address] : [];
        sessionService.broadcastEvent(SessionEvent.accountsChanged, account);

        const connectSite = permissionService.getConnectedSite(origin);
        if (connectSite) {
            const network = wallet.getLegacyNetworkName();
            sessionService.broadcastEvent(
                SessionEvent.networkChanged,
                {
                    network,
                    chainType: wallet.getChainType()
                },
                origin
            );
        }
        return account;
    };

    disconnect = ({ session: { origin } }: { session: { origin: string } }) => {
        wallet.removeConnectedSite(origin);
    };

    @Reflect.metadata('SAFE', true)
    getAccounts = async ({ session: { origin } }: { session: { origin: string } }) => {
        if (!permissionService.hasPermission(origin)) {
            return [];
        }

        const _account = await wallet.getCurrentAccount();
        return _account ? [_account.address] : [];
    };

    @Reflect.metadata('SAFE', true)
    getNetwork = () => {
        return wallet.getLegacyNetworkName();
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SwitchNetwork,
        (req: { data: { params: { network: string; networkType?: NetworkType } } }) => {
            const network = req.data.params.network;
            if (NETWORK_TYPES[NetworkType.MAINNET].validNames.includes(network)) {
                req.data.params.networkType = NetworkType.MAINNET;
            } else if (NETWORK_TYPES[NetworkType.TESTNET].validNames.includes(network)) {
                req.data.params.networkType = NetworkType.TESTNET;
            } else if (NETWORK_TYPES[NetworkType.REGTEST].validNames.includes(network)) {
                req.data.params.networkType = NetworkType.REGTEST;
            } else {
                throw new Error(
                    `the network is invalid, supported networks: ${NETWORK_TYPES.map((v) => v.name).join(',')}`
                );
            }

            if (req.data.params.networkType === wallet.getNetworkType()) {
                // skip approval
                return true;
            }
        }
    ])
    switchNetwork = async (req: {
        data: {
            params: {
                networkType: NetworkType;
            };
        };
    }) => {
        const {
            data: {
                params: { networkType }
            }
        }: {
            data: {
                params: {
                    networkType: NetworkType;
                };
            };
        } = req;

        await wallet.setNetworkType(networkType);
        return NETWORK_TYPES[networkType].name;
    };

    @Reflect.metadata('SAFE', true)
    getChain = () => {
        const chainType = wallet.getChainType();
        return getChainInfo(chainType);
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SwitchChain,
        (req: { data: { params: { chain: ChainType } } }) => {
            const chainType = req.data.params.chain;
            if (!CHAINS_MAP[chainType]) {
                throw new Error(`the chain is invalid, supported chains: ${CHAINS.map((v) => v.enum).join(',')}`);
            }

            if (chainType == wallet.getChainType()) {
                // skip approval
                return true;
            }
        }
    ])
    switchChain = async (req: {
        data: {
            params: {
                chain: string;
            };
        };
    }) => {
        const {
            data: {
                params: { chain }
            }
        }: {
            data: {
                params: {
                    chain: string;
                };
            };
        } = req;

        await wallet.setChainType(chain as ChainType);
        return getChainInfo(chain as ChainType);
    };

    @Reflect.metadata('SAFE', true)
    getPublicKey = async () => {
        const account = await wallet.getCurrentAccount();
        if (!account) return '';
        return account.pubkey;
    };

    @Reflect.metadata('SAFE', true)
    getBalance = async () => {
        const account = await wallet.getCurrentAccount();
        if (!account) return null;

        const balance = await wallet.getAddressBalance(account.address);
        return {
            confirmed: amountToSatoshis(balance.confirm_amount),
            unconfirmed: amountToSatoshis(balance.pending_amount),
            total: amountToSatoshis(balance.amount)
        };
    };

    @Reflect.metadata('SAFE', true)
    verifyMessageOfBIP322Simple = (req: {
        data: {
            params: {
                address: string;
                message: string;
                signature: string;
                network: NetworkType | undefined;
            };
        };
    }) => {
        const {
            data: { params }
        } = req;
        return verifyMessageOfBIP322Simple(params.address, params.message, params.signature, params.network) ? 1 : 0;
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SignPsbt,
        (_req: ProviderControllerRequest) => {
            //const { data: { params: { toAddress, satoshis } } } = req;
        }
    ])
    sendBitcoin = async ({ approvalRes: { psbtHex } }: { approvalRes: { psbtHex: string } }) => {
        const psbt = bitcoin.Psbt.fromHex(psbtHex);
        const tx = psbt.extractTransaction();
        const rawtx = tx.toHex();
        return await wallet.pushTx(rawtx);
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SignPsbt,
        (_req: ProviderControllerRequest) => {
            //const { data: { params: { toAddress, satoshis } } } = req;
        }
    ])
    sendInscription = async ({ approvalRes: { psbtHex } }: { approvalRes: { psbtHex: string } }) => {
        const psbt = bitcoin.Psbt.fromHex(psbtHex);
        const tx = psbt.extractTransaction();
        const rawtx = tx.toHex();
        return await wallet.pushTx(rawtx);
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SignInteraction,
        (_req: ProviderControllerRequest) => {
            const interactionParams = _req.data.params as DetailedInteractionParameters;
            if (!Web3API.isValidAddress(interactionParams.interactionParameters.to)) {
                throw new Error('Invalid contract address. Are you on the right network / are you using segwit?');
            }

            interactionParams.network = wallet.getChainType();
        }
    ])
    signAndBroadcastInteraction = async (request: {
        approvalRes: boolean;
        data: { params: DetailedInteractionParameters };
    }) => {
        return wallet.signAndBroadcastInteraction(request.data.params.interactionParameters);
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SignInteraction,
        (_req: ProviderControllerRequest) => {
            const interactionParams = _req.data.params as DetailedInteractionParameters;
            if (!Web3API.isValidAddress(interactionParams.interactionParameters.to)) {
                throw new Error('Invalid contract address. Are you on the right network / are you using segwit?');
            }

            interactionParams.network = wallet.getChainType();
        }
    ])
    signInteraction = async (request: { approvalRes: boolean; data: { params: DetailedInteractionParameters } }) => {
        const approvalInteractionParametersToUse = wallet.getApprovalInteractionParametersToUse();
        const interactionParameters = approvalInteractionParametersToUse ?? request.data.params.interactionParameters;

        const result = wallet.signInteraction(interactionParameters);

        if (approvalInteractionParametersToUse) wallet.clearApprovalInteractionParametersToUse(); // clear to avoid using them again

        return result;
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SignDeployment,
        (_req: ProviderControllerRequest) => {
            const interactionParams = _req.data.params as IDeploymentParametersWithoutSigner;
            if (!interactionParams.bytecode) {
                throw new Error('Invalid bytecode');
            }

            if (!interactionParams.utxos || !interactionParams.utxos.length) {
                throw new Error('No utxos');
            }

            if (!interactionParams.feeRate) {
                throw new Error('No feeRate');
            }

            // @ts-expect-error
            interactionParams.priorityFee = BigInt(interactionParams.priorityFee);

            // @ts-expect-error
            interactionParams.gasSatFee = BigInt(interactionParams.gasSatFee);

            // @ts-expect-error
            interactionParams.bytecode = objToBuffer(interactionParams.bytecode);

            // @ts-expect-error
            interactionParams.calldata = interactionParams.calldata
                ? objToBuffer(interactionParams.calldata)
                : Buffer.from([]);
        }
    ])
    deployContract = async (request: {
        approvalRes: boolean;
        data: { params: IDeploymentParametersWithoutSigner };
    }) => {
        const feeRate = await wallet.getFeeSummary();
        const rate = feeRate.list[2] || feeRate.list[1] || feeRate.list[0];

        if (Number(request.data.params.feeRate) < Number(rate.feeRate)) {
            // @ts-expect-error
            request.data.params.feeRate = Number(rate.feeRate);

            console.warn(
                'The fee rate is too low, the system will automatically adjust the fee rate to the minimum value'
            );
        }

        // @ts-expect-error
        request.data.params.bytecode = objToBuffer(request.data.params.bytecode);

        // @ts-expect-error
        request.data.params.priorityFee = BigInt(request.data.params.priorityFee);

        // @ts-expect-error
        request.data.params.gasSatFee = BigInt(request.data.params.gasSatFee);

        // @ts-expect-error
        request.data.params.calldata = objToBuffer(request.data.params.calldata);

        return wallet.deployContract(request.data.params);
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SignText,
        () => {
            // todo check text
        }
    ])
    signMessage = async ({
        data: {
            params: { text, type }
        },
        approvalRes
    }: {
        data: { params: { text: string; type: 'bip322-simple' | 'ecdsa' | 'schnorr' } };
        approvalRes: { signature: string };
    }) => {
        if (approvalRes?.signature) {
            return approvalRes.signature;
        }
        if (type === 'bip322-simple') {
            return wallet.signBIP322Simple(text);
        } else {
            return wallet.signMessage(text);
        }
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SignData,
        () => {
            // todo check text
        }
    ])
    signData = ({
        data: {
            params: { data, type }
        }
    }: {
        data: { params: { data: string; type: 'ecdsa' | 'schnorr' } };
    }) => {
        return wallet.signData(data, type);
    };

    @Reflect.metadata('SAFE', true)
    pushTx = async ({
        data: {
            params: { rawtx }
        }
    }: {
        data: { params: { rawtx: string } };
    }) => {
        return await wallet.pushTx(rawtx);
    };

    @Reflect.metadata('APPROVAL', [
        ApprovalType.SignPsbt,
        (req: { data: { params: { psbtHex: string } } }) => {
            const {
                data: {
                    params: { psbtHex }
                }
            } = req;
            req.data.params.psbtHex = formatPsbtHex(psbtHex);
        }
    ])
    signPsbt = async ({
        data: {
            params: { psbtHex, options }
        },
        approvalRes
    }: {
        data: {
            params: {
                psbtHex: string;
                options: { autoFinalized: boolean };
            };
        };
        approvalRes: { signed: boolean; psbtHex: string };
    }) => {
        if (approvalRes?.signed) {
            return approvalRes.psbtHex;
        }

        const networkType = wallet.getNetworkType();
        const psbtNetwork = toPsbtNetwork(networkType);
        const psbt = bitcoin.Psbt.fromHex(psbtHex, { network: psbtNetwork });
        const autoFinalized = !(options && !options.autoFinalized);
        const toSignInputs = await wallet.formatOptionsToSignInputs(psbtHex, options);
        await wallet.signPsbt(psbt, toSignInputs, autoFinalized);

        return psbt.toHex();
    };

    // The below handler is commented as it's not used for now and breaks the matching between approval types and approval components
    // @Reflect.metadata('APPROVAL', ['MultiSignPsbt', (req: {data: {params: {psbtHexs: string[]}}}) => {
    //     const { data: { params: { psbtHexs } } } = req;

    //     req.data.params.psbtHexs = psbtHexs.map(psbtHex => formatPsbtHex(psbtHex));
    // }])
    // multiSignPsbt = async ({ data: { params: { psbtHexs, options } } }: {
    //     data: {
    //         params: {
    //             psbtHexs: string[],
    //             options: { autoFinalized: boolean }[]
    //         }
    //     }
    // }) => {
    //     const account = await wallet.getCurrentAccount();
    //     if (!account) throw new Error('No account');
    //     const networkType = wallet.getNetworkType();
    //     const psbtNetwork = toPsbtNetwork(networkType);
    //     const result: string[] = [];
    //     for (let i = 0; i < psbtHexs.length; i++) {
    //         const psbt = bitcoin.Psbt.fromHex(psbtHexs[i], { network: psbtNetwork });
    //         const autoFinalized = options?.[i]?.autoFinalized ?? true;
    //         const toSignInputs = await wallet.formatOptionsToSignInputs(psbtHexs[i], options[i]);
    //         await wallet.signPsbt(psbt, toSignInputs, autoFinalized);
    //         result.push(psbt.toHex());
    //     }
    //     return result;
    // };

    @Reflect.metadata('SAFE', true)
    pushPsbt = async ({
        data: {
            params: { psbtHex }
        }
    }: {
        data: { params: { psbtHex: string } };
    }) => {
        const hexData = formatPsbtHex(psbtHex);
        const psbt = bitcoin.Psbt.fromHex(hexData);
        const tx = psbt.extractTransaction();
        const rawtx = tx.toHex();
        return await wallet.pushTx(rawtx);
    };

    @Reflect.metadata('SAFE', true)
    getVersion = () => {
        return VERSION;
    };

    @Reflect.metadata('SAFE', true)
    getBitcoinUtxos = async () => {
        try {
            const account = await wallet.getCurrentAccount();
            if (!account) return [];
            return await Web3API.getUTXOs([account.address]);
        } catch (e) {
            console.error(e);
            return [];
        }
    };
}

export default new ProviderController();
