/**
 * OPNet Provider for Resolver Page
 *
 * Simplified opnet provider that works within extension pages.
 * Exposes window.opnet for dApps loaded in the resolver iframe.
 */

import browser from 'webextension-polyfill';
import { EventEmitter } from 'events';

interface RequestParams {
    method: string;
    params?: unknown;
}

class OpnetResolverProvider extends EventEmitter {
    private _isConnected = false;
    private _selectedAddress: string | null = null;
    private _network: string | null = null;

    constructor() {
        super();
        this.setMaxListeners(100);
        void this._initialize();
    }

    get isOPWallet(): boolean {
        return true;
    }

    private async _initialize(): Promise<void> {
        try {
            const state = await this._request({ method: 'getProviderState' });

            if (state && typeof state === 'object') {
                const typedState = state as {
                    network?: string;
                    accounts?: string[];
                    isUnlocked?: boolean;
                };

                if (typedState.accounts && typedState.accounts.length > 0) {
                    this._selectedAddress = typedState.accounts[0];
                    this._isConnected = true;
                }
                if (typedState.network) {
                    this._network = typedState.network;
                }
            }

            this.emit('connect', {});
            this.emit('_initialized');
        } catch (error) {
            // Silently handle - provider may not be fully ready
            this.emit('_initialized');
        }
    }

    private async _request(data: RequestParams): Promise<unknown> {
        return browser.runtime.sendMessage({
            type: data.method,
            params: data.params ? [data.params] : []
        });
    }

    // =========================================================================
    // Account Methods
    // =========================================================================

    async requestAccounts(): Promise<string[]> {
        const accounts = await this._request({ method: 'requestAccounts' }) as string[];
        if (accounts?.length > 0) {
            this._selectedAddress = accounts[0];
            this._isConnected = true;
        }
        return accounts;
    }

    async getAccounts(): Promise<string[]> {
        return this._request({ method: 'getAccounts' }) as Promise<string[]>;
    }

    async disconnect(): Promise<void> {
        await this._request({ method: 'disconnect' });
        this._isConnected = false;
        this._selectedAddress = null;
    }

    // =========================================================================
    // Network Methods
    // =========================================================================

    async getNetwork(): Promise<string> {
        return this._request({ method: 'getNetwork' }) as Promise<string>;
    }

    async switchNetwork(network: string): Promise<void> {
        return this._request({ method: 'switchNetwork', params: { network } }) as Promise<void>;
    }

    async getChain(): Promise<string> {
        return this._request({ method: 'getChain' }) as Promise<string>;
    }

    async switchChain(chain: string): Promise<void> {
        return this._request({ method: 'switchChain', params: { chain } }) as Promise<void>;
    }

    // =========================================================================
    // Key Methods
    // =========================================================================

    async getPublicKey(): Promise<string> {
        return this._request({ method: 'getPublicKey' }) as Promise<string>;
    }

    async getMLDSAPublicKey(): Promise<string> {
        return this._request({ method: 'getMLDSAPublicKey' }) as Promise<string>;
    }

    // =========================================================================
    // Balance & UTXOs
    // =========================================================================

    async getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }> {
        return this._request({ method: 'getBalance' }) as Promise<{
            confirmed: number;
            unconfirmed: number;
            total: number;
        }>;
    }

    async getBitcoinUtxos(cursor?: number, size?: number): Promise<unknown> {
        return this._request({ method: 'getBitcoinUtxos', params: { cursor, size } });
    }

    // =========================================================================
    // Signing Methods
    // =========================================================================

    async signMessage(message: string, type?: string): Promise<string> {
        return this._request({
            method: 'signMessage',
            params: { message, type: type || 'ecdsa' }
        }) as Promise<string>;
    }

    async signData(data: string, type: string): Promise<string> {
        return this._request({
            method: 'signData',
            params: { data, type }
        }) as Promise<string>;
    }

    async signMLDSAMessage(message: string): Promise<{
        signature: string;
        message: string;
        publicKey: string;
        securityLevel: number;
    }> {
        return this._request({
            method: 'signMLDSAMessage',
            params: { message }
        }) as Promise<{
            signature: string;
            message: string;
            publicKey: string;
            securityLevel: number;
        }>;
    }

    async verifyMLDSASignature(
        message: string,
        signature: string,
        publicKey: string,
        securityLevel: number
    ): Promise<boolean> {
        return this._request({
            method: 'verifyMLDSASignature',
            params: { message, signature, publicKey, securityLevel }
        }) as Promise<boolean>;
    }

    async verifyMessageOfBIP322Simple(
        address: string,
        message: string,
        signature: string,
        network?: number
    ): Promise<boolean> {
        return this._request({
            method: 'verifyMessageOfBIP322Simple',
            params: { address, message, signature, network }
        }) as Promise<boolean>;
    }

    // =========================================================================
    // PSBT Methods
    // =========================================================================

    async signPsbt(psbtHex: string, options?: unknown): Promise<string> {
        return this._request({
            method: 'signPsbt',
            params: { psbtHex, options }
        }) as Promise<string>;
    }

    async signPsbts(psbtHexs: string[], options?: unknown[]): Promise<string[]> {
        return this._request({
            method: 'signPsbts',
            params: { psbtHexs, options }
        }) as Promise<string[]>;
    }

    async pushPsbt(psbtHex: string): Promise<string> {
        return this._request({
            method: 'pushPsbt',
            params: { psbtHex }
        }) as Promise<string>;
    }

    // =========================================================================
    // Transaction Methods
    // =========================================================================

    async sendBitcoin(
        toAddress: string,
        satoshis: number,
        options?: { feeRate?: number; memo?: string; memos?: string[] }
    ): Promise<string> {
        return this._request({
            method: 'sendBitcoin',
            params: {
                sendBitcoinParams: {
                    toAddress,
                    satoshis,
                    feeRate: options?.feeRate,
                    memo: options?.memo,
                    memos: options?.memos
                }
            }
        }) as Promise<string>;
    }

    async pushTx(rawtx: string): Promise<string> {
        return this._request({
            method: 'pushTx',
            params: { rawtx }
        }) as Promise<string>;
    }

    // =========================================================================
    // OPNet/Web3 Methods
    // =========================================================================

    async signInteraction(interactionParameters: unknown): Promise<unknown> {
        return this._request({
            method: 'signInteraction',
            params: interactionParameters
        });
    }

    async signAndBroadcastInteraction(interactionParameters: unknown): Promise<unknown> {
        return this._request({
            method: 'signAndBroadcastInteraction',
            params: interactionParameters
        });
    }

    async deployContract(params: unknown): Promise<unknown> {
        return this._request({
            method: 'deployContract',
            params
        });
    }

    async cancelTransaction(params: unknown): Promise<unknown> {
        return this._request({
            method: 'cancelTransaction',
            params
        });
    }

    async broadcast(transactions: unknown[]): Promise<unknown[]> {
        return this._request({
            method: 'broadcast',
            params: transactions
        }) as Promise<unknown[]>;
    }

    // =========================================================================
    // Utility
    // =========================================================================

    async getVersion(): Promise<string> {
        return this._request({ method: 'getVersion' }) as Promise<string>;
    }
}

// Create and expose the provider
const provider = new OpnetResolverProvider();

// Expose on window (type assertion to avoid conflict with @btc-vision/transaction types)
Object.defineProperty(window, 'opnet', {
    value: provider,
    writable: false,
    configurable: false
});

// Dispatch initialization event
window.dispatchEvent(new Event('opnet#initialized'));

export { OpnetResolverProvider };
