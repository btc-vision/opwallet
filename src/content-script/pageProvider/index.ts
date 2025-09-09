import { EventEmitter } from 'events';
import { BroadcastedTransaction } from 'opnet';

import { SignPsbtOptions, TxType } from '@/shared/types';
import { RequestParams } from '@/shared/types/Request.js';
import BroadcastChannelMessage from '@/shared/utils/message/broadcastChannelMessage';
import Web3API from '@/shared/web3/Web3API';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import {
    CancelledTransaction,
    DeploymentResult,
    ICancelTransactionParametersWithoutSigner,
    IDeploymentParametersWithoutSigner,
    InteractionParametersWithoutSigner,
    InteractionResponse,
    Unisat,
    UTXO,
    WindowWithWallets
} from '@btc-vision/transaction';

import { rpcErrors } from '@/shared/lib/bitcoin-rpc-errors/errors';
import { ProviderState } from '@/shared/types/Provider';
import { BroadcastTransactionOptions, Web3Provider } from './Web3Provider';
import PushEventHandlers from './pushEventHandlers';
import ReadyPromise from './readyPromise';
import { $, domReadyCall, isPushEventHandlerMethod } from './utils';

const log = (event: string, ...args: unknown[]) => {
    /*if (process && process.env.NODE_ENV !== 'production') {
        console.log(
            `%c [opnet] (${new Date().toTimeString().slice(0, 8)}) ${event}`,
            'font-weight: 600; background-color: #7d6ef9; color: white;',
            ...args
        );
    }*/
};

const getChannelName = (): string => {
    // From sessionStorage
    const stored = sessionStorage.getItem('__opnetChannel');
    if (stored) {
        sessionStorage.removeItem('__opnetChannel');
        return stored;
    }

    // From the script tag that loaded us
    const currentScript = document.currentScript as HTMLScriptElement;
    if (currentScript?.dataset.channel) {
        return currentScript.dataset.channel;
    }

    // Find our script tag by src
    const scripts = document.querySelectorAll('script[data-channel]');
    for (const script of scripts) {
        if ((script as HTMLScriptElement).src.includes('pageProvider.js')) {
            return (script as HTMLScriptElement).dataset.channel || '';
        }
    }

    throw new Error('OPNet: Channel name not found');
};

const channelName = getChannelName();

interface StateProvider {
    accounts: string[] | null;
    isConnected: boolean;
    isUnlocked: boolean;
    initialized: boolean;
    isPermanentlyDisconnected: boolean;
}

export interface OpnetProviderPrivate {
    _selectedAddress: string | null;
    _network: string | null;
    _isConnected: boolean;
    _initialized: boolean;
    _isUnlocked: boolean;

    _state: StateProvider;

    _pushEventHandlers: PushEventHandlers | null;
    _requestPromise: ReadyPromise;
    _bcm: BroadcastChannelMessage;
}

const opnetProviderPrivate: OpnetProviderPrivate = {
    _selectedAddress: null,
    _network: null,
    _isConnected: false,
    _initialized: false,
    _isUnlocked: false,

    _state: {
        accounts: null,
        isConnected: false,
        isUnlocked: false,
        initialized: false,
        isPermanentlyDisconnected: false
    },

    _pushEventHandlers: null,
    _requestPromise: new ReadyPromise(0),
    _bcm: new BroadcastChannelMessage(channelName)
};

export class OpnetProvider extends EventEmitter {
    public readonly web3: Web3Provider = new Web3Provider(this);

    constructor({ maxListeners = 100 } = {}) {
        super();
        this.setMaxListeners(maxListeners);
        void this.initialize();
        opnetProviderPrivate._pushEventHandlers = new PushEventHandlers(this, opnetProviderPrivate);
    }

    public get isOPWallet(): boolean {
        return true;
    }

    initialize = async () => {
        document.addEventListener('visibilitychange', this._requestPromiseCheckVisibility);

        opnetProviderPrivate._bcm.connect().on('message', this._handleBackgroundMessage);
        domReadyCall(async () => {
            const origin = window.top?.location.origin || '';

            const iconElement = $('head > link[rel~="icon"]');
            let icon = iconElement instanceof HTMLLinkElement ? iconElement.href : '';
            const metaImageElement = $('head > meta[itemprop="image"]');
            const iconFallback = metaImageElement instanceof HTMLMetaElement ? metaImageElement.content : '';
            icon = icon || iconFallback;

            const metaTitleElement = $('head > meta[name="title"]');
            const name =
                document.title || (metaTitleElement instanceof HTMLMetaElement ? metaTitleElement.content : origin);

            await opnetProviderPrivate._bcm.request({
                method: 'tabCheckin',
                params: { icon, name, origin }
            });

            // Do not force to tabCheckin
            // this._requestPromise.check(2);
        });

        try {
            const { network, chain, accounts, isUnlocked }: ProviderState = (await this._request({
                method: 'getProviderState'
            })) as ProviderState;

            if (isUnlocked) {
                opnetProviderPrivate._isUnlocked = true;
                opnetProviderPrivate._state.isUnlocked = true;
            }
            this.emit('connect', {});
            await opnetProviderPrivate._pushEventHandlers?.networkChanged({
                network,
                chainType: chain
            });

            opnetProviderPrivate._pushEventHandlers?.accountsChanged(accounts);
        } catch {
            //
        } finally {
            opnetProviderPrivate._initialized = true;
            opnetProviderPrivate._state.initialized = true;
            this.emit('_initialized');
        }

        void this.keepAlive();
    };

    _request = async (data: RequestParams) => {
        if (!data) {
            throw rpcErrors.invalidRequest();
        }

        this._requestPromiseCheckVisibility();

        return opnetProviderPrivate._requestPromise
            .call(async () => {
                log('[request]', JSON.stringify(data, null, 2));

                const res = await opnetProviderPrivate._bcm.request(data).catch((err: unknown) => {
                    // TODO (typing): Check if sending error without serialization cause any issues on the dApp side.
                    log('[request: error]', data.method, err);
                    throw err;
                });

                log('[request: success]', data.method, res);

                return res;
            })
            .catch((err: unknown) => {
                console.log(err);
                throw err;
            });
    };

    // public methods
    requestAccounts = async () => {
        return this._request({
            method: 'requestAccounts'
        });
    };
    // TODO: support multi request!
    // request = async (data) => {
    //   return this._request(data);
    // };

    disconnect = async () => {
        return this._request({
            method: 'disconnect'
        });
    };

    getNetwork = async () => {
        return this._request({
            method: 'getNetwork'
        });
    };

    switchNetwork = async (network: string) => {
        return this._request({
            method: 'switchNetwork',
            params: {
                network
            }
        });
    };

    getChain = async () => {
        return this._request({
            method: 'getChain'
        });
    };

    switchChain = async (chain: string) => {
        return this._request({
            method: 'switchChain',
            params: {
                chain
            }
        });
    };

    getAccounts = async () => {
        return this._request({
            method: 'getAccounts'
        });
    };

    getPublicKey = async () => {
        return this._request({
            method: 'getPublicKey'
        });
    };

    getBalance = async () => {
        return this._request({
            method: 'getBalance'
        });
    };

    getInscriptions = async (cursor = 0, size = 20) => {
        return this._request({
            method: 'getInscriptions',
            params: {
                cursor,
                size
            }
        });
    };

    signMessage = async (message: string | Buffer, type: string) => {
        return this._request({
            method: 'signMessage',
            params: {
                message,
                type
            }
        });
    };

    verifyMessageOfBIP322Simple = async (address: string, message: string, signature: string, network?: number) => {
        return this._request({
            method: 'verifyMessageOfBIP322Simple',
            params: {
                address,
                message,
                signature,
                network
            }
        });
    };

    signData = async (data: string, type: string) => {
        return this._request({
            method: 'signData',
            params: {
                data,
                type
            }
        });
    };

    sendBitcoin = async (
        toAddress: string,
        satoshis: number,
        options?: { feeRate: number; memo?: string; memos?: string[] }
    ): Promise<string> => {
        return (await this._request({
            method: 'sendBitcoin',
            params: {
                sendBitcoinParams: {
                    toAddress,
                    satoshis,
                    feeRate: options?.feeRate,
                    memo: options?.memo,
                    memos: options?.memos
                },
                type: TxType.SEND_BITCOIN
            }
        })) as Promise<string>;
    };

    deployContract = async (params: IDeploymentParametersWithoutSigner): Promise<DeploymentResult> => {
        return (await this._request({
            method: 'deployContract',
            params: params
        })) as Promise<DeploymentResult>;
    };

    cancelTransaction = async (params: ICancelTransactionParametersWithoutSigner): Promise<CancelledTransaction> => {
        return (await this._request({
            method: 'cancelTransaction',
            params: params
        })) as Promise<CancelledTransaction>;
    };

    signInteraction = async (
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<InteractionResponse> => {
        const contractInfo: ContractInformation | false | undefined = await Web3API.queryContractInformation(
            interactionParameters.to
        );

        return (await this._request({
            method: 'signInteraction',
            params: {
                interactionParameters: {
                    ...interactionParameters,
                    calldata: interactionParameters.calldata.toString('hex')
                },
                network: Web3API.chain,
                contractInfo: contractInfo
            }
        })) as Promise<InteractionResponse>;
    };

    signAndBroadcastInteraction = async (
        interactionParameters: InteractionParametersWithoutSigner
    ): Promise<[BroadcastedTransaction, BroadcastedTransaction, UTXO[], string]> => {
        const contractInfo: ContractInformation | false | undefined = await Web3API.queryContractInformation(
            interactionParameters.to
        );

        return (await this._request({
            method: 'signAndBroadcastInteraction',
            params: {
                interactionParameters: {
                    ...interactionParameters,
                    calldata: interactionParameters.calldata.toString('hex')
                },
                network: Web3API.chain,
                contractInfo: contractInfo
            }
        })) as Promise<[BroadcastedTransaction, BroadcastedTransaction, UTXO[], string]>;
    };

    broadcast = async (transactions: BroadcastTransactionOptions[]): Promise<BroadcastedTransaction[]> => {
        return (await this._request({
            method: 'broadcast',
            params: transactions
        })) as Promise<[BroadcastedTransaction, BroadcastedTransaction]>;
    };

    /**
     * push transaction
     */
    pushTx = async (rawtx: string) => {
        return this._request({
            method: 'pushTx',
            params: {
                rawtx
            }
        });
    };

    signPsbt = async (psbtHex: string, options?: SignPsbtOptions) => {
        return this._request({
            method: 'signPsbt',
            params: {
                psbtHex,
                type: TxType.SIGN_TX,
                options
            }
        });
    };

    signPsbts = async (psbtHexs: string[], options?: SignPsbtOptions[]) => {
        return this._request({
            method: 'multiSignPsbt',
            params: {
                psbtHexs,
                options
            }
        });
    };

    pushPsbt = async (psbtHex: string) => {
        return this._request({
            method: 'pushPsbt',
            params: {
                psbtHex
            }
        });
    };

    getVersion = async () => {
        return this._request({
            method: 'getVersion'
        });
    };

    getBitcoinUtxos = async (cursor = 0, size = 20) => {
        return this._request({
            method: 'getBitcoinUtxos',
            params: {
                cursor,
                size
            }
        });
    };

    private _requestPromiseCheckVisibility = () => {
        if (document.visibilityState === 'visible') {
            opnetProviderPrivate._requestPromise.check(1);
        } else {
            opnetProviderPrivate._requestPromise.uncheck(1);
        }
    };

    private _handleBackgroundMessage = (params: { event: string; data: unknown }) => {
        log('[push event]', params.event, params.data);

        // TODO (typing): Ideally this is not the type-safe solution but in the _handleBackgroundMessage
        // function, we are directly passing the data as unknown and all of the pushEventHandler's methods
        // have either one argument or none. So, it should be safe to cast it as below.
        if (
            opnetProviderPrivate._pushEventHandlers &&
            isPushEventHandlerMethod(opnetProviderPrivate._pushEventHandlers, params.event)
        ) {
            return (opnetProviderPrivate._pushEventHandlers[params.event] as (data: unknown) => unknown)(params.data);
        }

        this.emit(params.event, params.data);
    };

    /**
     * Sending a message to the extension to receive will keep the service worker alive.
     */
    private keepAlive = async () => {
        try {
            await this._request({
                method: 'keepAlive',
                params: {}
            });
        } catch (e) {
            log('[keepAlive: error]', e);
        }

        setTimeout(async () => {
            await this.keepAlive();
        }, 1000);
    };
}

const provider = new OpnetProvider();
(window as WindowWithWallets).opnet = new Proxy(provider, {
    deleteProperty: () => true
}) as unknown as Unisat;

Object.defineProperty(window, 'opnet', {
    value: new Proxy(provider, {
        deleteProperty: () => true
    }),
    writable: false
});

window.dispatchEvent(new Event('opnet#initialized'));
