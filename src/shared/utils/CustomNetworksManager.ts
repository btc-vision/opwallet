import {
    CHAIN_ICONS,
    ChainId,
    CHAINS_MAP,
    ChainType,
    CustomNetwork,
    DEFAULT_CHAINS_MAP,
    TypeChain,
    TypeChainGroup
} from '@/shared/constant';
import { NetworkType } from '@/shared/types';

const CUSTOM_NETWORKS_STORAGE_KEY = 'custom_networks';

// Remove the generic type parameter and use ChainType directly
type ConcreteTypeChain = TypeChain<ChainType>;

class CustomNetworksManager {
    private customNetworks: Map<string, CustomNetwork> = new Map();
    private chainsMap: Map<ChainType, ConcreteTypeChain> = new Map();
    private readonly initialized: Promise<void>;

    constructor() {
        this.initialized = this.init();
    }

    public async reload(): Promise<void> {
        // Clear current data
        this.customNetworks.clear();
        this.chainsMap.clear();

        // Reload from storage
        await this.loadFromStorage();
        this.rebuildChainsMap();
    }

    public async ensureInitialized(): Promise<void> {
        await this.initialized;
    }

    public async getChainGroups(): Promise<TypeChainGroup[]> {
        await this.ensureInitialized();

        // Filter out groups that have no enabled items
        return [
            {
                type: 'single',
                chain: this.getChain(ChainType.BITCOIN_MAINNET) as ConcreteTypeChain
            },
            {
                type: 'list',
                label: 'Testnets',
                icon: './images/artifacts/bitcoin-testnet-all.svg',
                items: [
                    this.getChain(ChainType.OPNET_TESTNET),
                    this.getChain(ChainType.BITCOIN_TESTNET),
                    this.getChain(ChainType.BITCOIN_TESTNET4),
                    this.getChain(ChainType.BITCOIN_SIGNET),
                    this.getChain(ChainType.BITCOIN_REGTEST)
                ].filter(Boolean) as ConcreteTypeChain[]
            },
            {
                type: 'list',
                label: 'Dogecoin',
                icon: CHAIN_ICONS[ChainId.Dogecoin],
                items: [
                    this.getChain(ChainType.DOGECOIN_MAINNET),
                    this.getChain(ChainType.DOGECOIN_TESTNET),
                    this.getChain(ChainType.DOGECOIN_REGTEST)
                ].filter(Boolean) as ConcreteTypeChain[]
            },
            {
                type: 'list',
                label: 'Litecoin',
                icon: CHAIN_ICONS[ChainId.Litecoin],
                items: [
                    this.getChain(ChainType.LITECOIN_MAINNET),
                    this.getChain(ChainType.LITECOIN_TESTNET),
                    this.getChain(ChainType.LITECOIN_REGTEST)
                ].filter(Boolean) as ConcreteTypeChain[]
            },
            {
                type: 'list',
                label: 'Bitcoin Cash',
                icon: CHAIN_ICONS[ChainId.BitcoinCash],
                items: [
                    this.getChain(ChainType.BITCOINCASH_MAINNET),
                    this.getChain(ChainType.BITCOINCASH_TESTNET),
                    this.getChain(ChainType.BITCOINCASH_REGTEST)
                ].filter(Boolean) as ConcreteTypeChain[]
            },
            {
                type: 'list',
                label: 'Dash',
                icon: CHAIN_ICONS[ChainId.Dash],
                items: [
                    this.getChain(ChainType.DASH_MAINNET),
                    this.getChain(ChainType.DASH_TESTNET),
                    this.getChain(ChainType.DASH_REGTEST)
                ].filter(Boolean) as ConcreteTypeChain[]
            }
        ];
    }

    public async testRpcConnection(url: string): Promise<boolean> {
        try {
            const response = await fetch(`${url}/api/v1/json-rpc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'btc_blockNumber',
                    params: [],
                    id: 1
                })
            });

            if (!response.ok) {
                return false;
            }

            const data = (await response.json()) as {
                jsonrpc: string;
                id: number;
                result?: string | null;
                error?: {
                    code: number;
                    message: string;
                };
            };

            return data.result !== undefined;
        } catch (error) {
            console.error('RPC test failed:', error);
            return false;
        }
    }

    public async addCustomNetwork(params: {
        name: string;
        chainType: ChainType;
        unit: string;
        opnetUrl: string;
        mempoolSpaceUrl: string;
        faucetUrl?: string;
        showPrice?: boolean;
    }): Promise<CustomNetwork> {
        await this.ensureInitialized();

        const isValid = await this.testRpcConnection(params.opnetUrl);
        if (!isValid) {
            throw new Error('Failed to connect to RPC endpoint');
        }

        const chainType = params.chainType;

        // Check if this combination already has a custom network
        const existing = Array.from(this.customNetworks.values()).find((n) => n.chainType === chainType);

        if (existing) {
            throw new Error('A custom network for this chain already exists. Please delete it first.');
        }

        // Derive chainId and networkType from the chain config
        const chainConfig = CHAINS_MAP[chainType];
        const networkType = chainConfig?.networkType ?? NetworkType.MAINNET;
        const chainId = this.getChainIdFromChainType(chainType);

        const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // Get icon from chain config
        const icon = chainConfig?.icon ?? './images/artifacts/custom-network.svg';

        const network: CustomNetwork = {
            id,
            name: params.name,
            networkType,
            chainId,
            chainType,
            icon,
            unit: params.unit,
            opnetUrl: params.opnetUrl,
            mempoolSpaceUrl: params.mempoolSpaceUrl,
            faucetUrl: params.faucetUrl,
            showPrice: params.showPrice || false,
            isCustom: true,
            createdAt: Date.now(),
            contractAddresses: {}
        };

        this.customNetworks.set(id, network);
        await this.saveToStorage();
        this.rebuildChainsMap();

        await this.reload();

        return network;
    }

    public async updateCustomNetwork(id: string, updates: Partial<CustomNetwork>): Promise<CustomNetwork | null> {
        await this.ensureInitialized();

        const network = this.customNetworks.get(id);
        if (!network) {
            return null;
        }

        const updated = { ...network, ...updates };
        this.customNetworks.set(id, updated);
        await this.saveToStorage();
        this.rebuildChainsMap();

        await this.reload();

        return updated;
    }

    public async deleteCustomNetwork(id: string): Promise<boolean> {
        await this.ensureInitialized();

        const network = this.customNetworks.get(id);
        if (!network) {
            return false;
        }

        const deleted = this.customNetworks.delete(id);
        if (deleted) {
            await this.saveToStorage();
            this.rebuildChainsMap();
        }

        await this.reload();

        return deleted;
    }

    public async getCustomNetwork(id: string): Promise<CustomNetwork | undefined> {
        await this.ensureInitialized();
        return this.customNetworks.get(id);
    }

    public async getCustomNetworkByChainType(chainType: ChainType): Promise<CustomNetwork | undefined> {
        await this.ensureInitialized();
        return Array.from(this.customNetworks.values()).find((network) => network.chainType === chainType);
    }

    public async getAllCustomNetworks(): Promise<CustomNetwork[]> {
        await this.ensureInitialized();
        return Array.from(this.customNetworks.values());
    }

    public async getChainsMap(): Promise<{ [key in ChainType]?: ConcreteTypeChain }> {
        await this.ensureInitialized();
        const map: { [key in ChainType]?: ConcreteTypeChain } = {};
        this.chainsMap.forEach((value, key) => {
            map[key] = value;
        });
        return map;
    }

    public getChain(chainType: ChainType): ConcreteTypeChain | undefined {
        return this.chainsMap.get(chainType);
    }

    public async getAllChains(): Promise<ConcreteTypeChain[]> {
        await this.ensureInitialized();
        return Array.from(this.chainsMap.values());
    }

    public async isCustomChain(chainType: ChainType): Promise<boolean> {
        await this.ensureInitialized();
        const customNetwork = await this.getCustomNetworkByChainType(chainType);
        return !!customNetwork;
    }

    public isDefaultChain(chainType: ChainType): boolean {
        return !!DEFAULT_CHAINS_MAP[chainType];
    }

    private async init(): Promise<void> {
        await this.loadFromStorage();
        this.rebuildChainsMap();
    }

    private async loadFromStorage(): Promise<void> {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await chrome.storage.local.get(CUSTOM_NETWORKS_STORAGE_KEY);
                const stored = result[CUSTOM_NETWORKS_STORAGE_KEY] as CustomNetwork[] | undefined;

                if (stored && Array.isArray(stored)) {
                    stored.forEach((network) => {
                        this.customNetworks.set(network.id, network);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load custom networks:', error);
        }
    }

    private async saveToStorage(): Promise<void> {
        try {
            const networks = Array.from(this.customNetworks.values());

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({
                    [CUSTOM_NETWORKS_STORAGE_KEY]: networks
                });
            }
        } catch (error) {
            console.error('Failed to save custom networks:', error);
        }
    }

    private rebuildChainsMap(): void {
        this.chainsMap.clear();

        // Add all chains from CHAINS_MAP (includes defaults and disabled chains)
        Object.entries(CHAINS_MAP).forEach(([_, value]) => {
            if (value) {
                this.chainsMap.set(value.enum, value as ConcreteTypeChain);
            }
        });

        // Override with custom networks
        this.customNetworks.forEach((network) => {
            const chain: ConcreteTypeChain = {
                enum: network.chainType,
                label: network.name,
                icon: network.icon,
                unit: network.unit,
                networkType: network.networkType,
                endpoints: ['https://wallet.opnet.org'],
                opnetUrl: network.opnetUrl,
                mempoolSpaceUrl: network.mempoolSpaceUrl,
                faucetUrl: network.faucetUrl || '',
                okxExplorerUrl: '',
                isViewTxHistoryInternally: false,
                disable: false,
                showPrice: network.showPrice,
                defaultExplorer: 'mempool-space',
                isCustom: true,
                contractAddresses: network.contractAddresses || {}
            };
            this.chainsMap.set(network.chainType, chain);
        });

        // Rebuild CHAINS_MAP completely
        // First, get all current keys
        const currentKeys = Object.keys(CHAINS_MAP) as ChainType[];

        // Build the new mapping
        const newMapping: Record<ChainType, ConcreteTypeChain> = {} as Record<ChainType, ConcreteTypeChain>;
        this.chainsMap.forEach((value, key) => {
            newMapping[key] = value;
        });

        // Clear existing entries by setting to undefined (avoids delete)
        currentKeys.forEach((key) => {
            // Use proper type assertion for the mutable CHAINS_MAP
            const mutableChainsMap = CHAINS_MAP as Record<ChainType, ConcreteTypeChain | undefined>;
            mutableChainsMap[key] = undefined;
        });

        // Add all entries from the new mapping
        (Object.keys(newMapping) as ChainType[]).forEach((key) => {
            // Use proper type assertion for the mutable CHAINS_MAP
            const mutableChainsMap = CHAINS_MAP as Record<ChainType, ConcreteTypeChain | undefined>;
            mutableChainsMap[key] = newMapping[key];
        });
    }

    private getChainIdFromChainType(chainType: ChainType): ChainId {
        const chainTypeStr = chainType as string;
        if (chainTypeStr.includes('FRACTAL')) return ChainId.Fractal;
        if (chainTypeStr.includes('DOGECOIN')) return ChainId.Dogecoin;
        if (chainTypeStr.includes('LITECOIN')) return ChainId.Litecoin;
        if (chainTypeStr.includes('BITCOINCASH')) return ChainId.BitcoinCash;
        if (chainTypeStr.includes('DASH')) return ChainId.Dash;
        return ChainId.Bitcoin;
    }
}

export const customNetworksManager = new CustomNetworksManager();
