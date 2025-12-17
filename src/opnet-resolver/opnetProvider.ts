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

    // Public API methods
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

    async getNetwork(): Promise<string> {
        return this._request({ method: 'getNetwork' }) as Promise<string>;
    }

    async getChain(): Promise<string> {
        return this._request({ method: 'getChain' }) as Promise<string>;
    }

    async getPublicKey(): Promise<string> {
        return this._request({ method: 'getPublicKey' }) as Promise<string>;
    }

    async getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }> {
        return this._request({ method: 'getBalance' }) as Promise<{
            confirmed: number;
            unconfirmed: number;
            total: number;
        }>;
    }

    async signMessage(message: string, type?: string): Promise<string> {
        return this._request({
            method: 'signMessage',
            params: { message, type: type || 'ecdsa' }
        }) as Promise<string>;
    }

    async signPsbt(psbtHex: string, options?: unknown): Promise<string> {
        return this._request({
            method: 'signPsbt',
            params: { psbtHex, options }
        }) as Promise<string>;
    }

    async sendBitcoin(
        toAddress: string,
        satoshis: number,
        options?: { feeRate?: number }
    ): Promise<string> {
        return this._request({
            method: 'sendBitcoin',
            params: {
                sendBitcoinParams: { toAddress, satoshis, feeRate: options?.feeRate }
            }
        }) as Promise<string>;
    }

    async getVersion(): Promise<string> {
        return this._request({ method: 'getVersion' }) as Promise<string>;
    }

    async disconnect(): Promise<void> {
        await this._request({ method: 'disconnect' });
        this._isConnected = false;
        this._selectedAddress = null;
    }
}

// Create and expose the provider
const provider = new OpnetResolverProvider();

// Expose on window
declare global {
    interface Window {
        opnet: OpnetResolverProvider;
    }
}

Object.defineProperty(window, 'opnet', {
    value: provider,
    writable: false,
    configurable: false
});

// Dispatch initialization event
window.dispatchEvent(new Event('opnet#initialized'));

export { OpnetResolverProvider };
