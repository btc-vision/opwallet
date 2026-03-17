import { CHAINS_MAP, CHANNEL, ChainType, VERSION } from '@/shared/constant';
import { WalletConfig } from '@/shared/types';
import Web3API from '@/shared/web3/Web3API';
import randomstring from 'randomstring';
import browser from '../webapi/browser';
import preferenceService from './preference';

interface MotoswapSyncResponse {
    watchlist: unknown[];
    lastSync: string;
    exchangeRates: {
        rates: {
            usd?: {
                name: string;
                unit: string;
                value: number;
                type: string;
            };
        };
    };
}

interface ApiResponse<T> {
    code: number;
    msg: string;
    data: T;
}

interface OPNetApiStore {
    deviceId: string;
}

class OPNetAPI {
    private store!: OPNetApiStore;
    private endpoint = '';
    private clientAddress = '';
    private addressFlag = 0;
    private cachedBtcPrice = 0;
    private priceInitialized = false;

    async init(): Promise<void> {
        // Load or create device ID
        const data = await browser.storage.local.get('opnetApi');
        const saved = data.opnetApi as OPNetApiStore | undefined;

        this.store = saved ?? { deviceId: randomstring.generate(12) };

        if (!this.store.deviceId) {
            this.store.deviceId = randomstring.generate(12);
        }

        // Set network from preferences
        const chainType = preferenceService.getChainType();
        await Web3API.setNetwork(chainType);

        // Get endpoint from chain config
        const chain = CHAINS_MAP[chainType];
        if (!chain) {
            throw new Error(`Chain ${chainType} not found in CHAINS_MAP`);
        }
        this.endpoint = chain.endpoints[0];

        // Fetch wallet config and potentially override endpoint
        try {
            const config = await this.getWalletConfig();
            if (config.endpoint && config.endpoint !== this.endpoint) {
                this.endpoint = config.endpoint;
            }
        } catch (e) {
            console.error('Failed to fetch wallet config:', e);
        }

        // Persist store if new
        if (!saved) {
            this.persist();
        }

        // Restore cached BTC price from storage
        const priceData = await browser.storage.local.get('cachedBtcPrice');
        if (typeof priceData.cachedBtcPrice === 'number' && priceData.cachedBtcPrice > 0) {
            this.cachedBtcPrice = priceData.cachedBtcPrice;
        }
        this.priceInitialized = true;
    }

    setClientAddress(address: string, flag: number): void {
        this.clientAddress = address;
        this.addressFlag = flag;
    }

    // =========================================================================
    // HTTP Infrastructure
    // =========================================================================

    private async getRespData<T>(res: Response): Promise<T> {
        if (!res) throw new Error('Network error: no response');
        if (res.status !== 200) throw new Error(`Network error: status ${res.status}`);

        let jsonRes: ApiResponse<T>;
        try {
            jsonRes = (await res.json()) as ApiResponse<T>;
        } catch {
            throw new Error('Network error: failed to parse JSON');
        }

        if (!jsonRes) throw new Error('Network error: no response data');
        if (jsonRes.code !== 0) throw new Error(jsonRes.msg);

        return jsonRes.data;
    }

    private getHeaders(): Headers {
        const headers = new Headers();
        headers.append('X-Client', 'OP_WALLET');
        headers.append('X-Version', VERSION);
        headers.append('x-address', this.clientAddress);
        headers.append('x-flag', `${this.addressFlag}`);
        headers.append('x-channel', CHANNEL);
        headers.append('x-udid', this.store.deviceId);
        return headers;
    }

    private async httpGet<T>(
        route: string,
        params: Record<string, string | number | boolean | undefined>,
        endpoint?: string
    ): Promise<T> {
        const baseUrl = endpoint ?? this.endpoint;
        const url = new URL(route, baseUrl);

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) {
                url.searchParams.append(key, String(value));
            }
        }

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: this.getHeaders(),
            mode: 'cors',
            cache: 'default'
        });

        return this.getRespData<T>(res);
    }

    private persist(): void {
        browser.storage.local.set({ opnetApi: this.store });
    }

    // =========================================================================
    // API Methods
    // =========================================================================

    /**
     * Get wallet configuration from OPNet backend
     * This is the only active endpoint: https://wallet.opnet.org/v5/default/config
     */
    async getWalletConfig(): Promise<WalletConfig> {
        return this.httpGet<WalletConfig>('/v5/default/config', {}, 'https://wallet.opnet.org');
    }

    /**
     * Fetch with a timeout to prevent hanging requests.
     */
    private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Update the cached BTC price and persist to storage.
     */
    private updateCachedPrice(price: number): void {
        this.cachedBtcPrice = price;
        browser.storage.local.set({ cachedBtcPrice: price });
    }

    /**
     * Get current BTC price with fallback chain:
     * 1. Motoswap sync API (user-specific)
     * 2. CoinGecko public API
     * 3. Blockchain.info ticker
     * 4. Cached/persisted price
     */
    async getBtcPrice(): Promise<number> {
        // Try Motoswap first
        const motoswapPrice = await this.fetchPriceFromMotoswap();
        if (motoswapPrice > 0) return motoswapPrice;

        // Fallback to public APIs
        const publicPrice = await this.fetchPriceFromPublicAPIs();
        if (publicPrice > 0) return publicPrice;

        return this.cachedBtcPrice;
    }

    private async fetchPriceFromMotoswap(): Promise<number> {
        try {
            const chainType = preferenceService.getChainType();
            const currentAccount = preferenceService.getCurrentAccount();

            if (!currentAccount?.quantumPublicKeyHash) {
                return 0;
            }

            const { chain, network } = this.getChainAndNetwork(chainType);
            const mldsaKey = currentAccount.quantumPublicKeyHash.startsWith('0x')
                ? currentAccount.quantumPublicKeyHash
                : `0x${currentAccount.quantumPublicKeyHash}`;

            const url = `https://api.motoswap.org/api/v1/${chain}/${network}/${mldsaKey}/sync`;

            const response = await this.fetchWithTimeout(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'X-App-Platform': 'web' }
            });

            if (!response.ok) {
                return 0;
            }

            const data = (await response.json()) as MotoswapSyncResponse;
            const usdRate = data.exchangeRates?.rates?.usd?.value;

            if (typeof usdRate === 'number' && usdRate > 0) {
                this.updateCachedPrice(usdRate);
                return usdRate;
            }

            return 0;
        } catch {
            return 0;
        }
    }

    private async fetchPriceFromPublicAPIs(): Promise<number> {
        // Try CoinGecko
        try {
            const response = await this.fetchWithTimeout(
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
                { method: 'GET' },
                5000
            );
            if (response.ok) {
                const data = (await response.json()) as { bitcoin?: { usd?: number } };
                const price = data?.bitcoin?.usd;
                if (typeof price === 'number' && price > 0) {
                    this.updateCachedPrice(price);
                    return price;
                }
            }
        } catch {
            // Fall through to next provider
        }

        // Try Blockchain.info
        try {
            const response = await this.fetchWithTimeout(
                'https://blockchain.info/ticker',
                { method: 'GET' },
                5000
            );
            if (response.ok) {
                const data = (await response.json()) as { USD?: { last?: number } };
                const price = data?.USD?.last;
                if (typeof price === 'number' && price > 0) {
                    this.updateCachedPrice(price);
                    return price;
                }
            }
        } catch {
            // Fall through to cached
        }

        return 0;
    }

    /**
     * Map ChainType to chain and network strings for Motoswap API
     */
    private getChainAndNetwork(chainType: ChainType): { chain: string; network: string } {
        const chainMap: Record<string, { chain: string; network: string }> = {
            [ChainType.BITCOIN_MAINNET]: { chain: 'bitcoin', network: 'mainnet' },
            [ChainType.OPNET_TESTNET]: { chain: 'bitcoin', network: 'testnet' },
            [ChainType.BITCOIN_TESTNET]: { chain: 'bitcoin', network: 'testnet' },
            [ChainType.BITCOIN_TESTNET4]: { chain: 'bitcoin', network: 'testnet4' },
            [ChainType.BITCOIN_REGTEST]: { chain: 'bitcoin', network: 'regtest' },
            [ChainType.BITCOIN_SIGNET]: { chain: 'bitcoin', network: 'signet' },
            [ChainType.FRACTAL_BITCOIN_MAINNET]: { chain: 'fractal', network: 'mainnet' },
            [ChainType.FRACTAL_BITCOIN_TESTNET]: { chain: 'fractal', network: 'testnet' },
            [ChainType.DOGECOIN_MAINNET]: { chain: 'dogecoin', network: 'mainnet' },
            [ChainType.DOGECOIN_TESTNET]: { chain: 'dogecoin', network: 'testnet' },
            [ChainType.DOGECOIN_REGTEST]: { chain: 'dogecoin', network: 'regtest' },
            [ChainType.LITECOIN_MAINNET]: { chain: 'litecoin', network: 'mainnet' },
            [ChainType.LITECOIN_TESTNET]: { chain: 'litecoin', network: 'testnet' },
            [ChainType.LITECOIN_REGTEST]: { chain: 'litecoin', network: 'regtest' },
            [ChainType.BITCOINCASH_MAINNET]: { chain: 'bitcoincash', network: 'mainnet' },
            [ChainType.BITCOINCASH_TESTNET]: { chain: 'bitcoincash', network: 'testnet' },
            [ChainType.BITCOINCASH_REGTEST]: { chain: 'bitcoincash', network: 'regtest' },
            [ChainType.DASH_MAINNET]: { chain: 'dash', network: 'mainnet' },
            [ChainType.DASH_TESTNET]: { chain: 'dash', network: 'testnet' },
            [ChainType.DASH_REGTEST]: { chain: 'dash', network: 'regtest' }
        };

        return chainMap[chainType] ?? { chain: 'bitcoin', network: 'mainnet' };
    }
}

export default new OPNetAPI();
