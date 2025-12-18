/**
 * OPNetAPI - Clean API service for wallet.opnet.org endpoints
 */

import { CHAINS_MAP, CHANNEL, VERSION } from '@/shared/constant';
import { WalletConfig } from '@/shared/types';
import Web3API from '@/shared/web3/Web3API';
import randomstring from 'randomstring';
import browser from '../webapi/browser';
import preferenceService from './preference';

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
     * Get current BTC price
     * TODO: Implement real endpoint when available
     */
    async getBtcPrice(): Promise<number> {
        // Mock price for now - approximately $100k
        return 100_000;
    }
}

export default new OPNetAPI();
