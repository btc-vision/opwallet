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

    constructor() {
        this.loadFromStorage();
        this.rebuildChainsMap();
    }

    public getChainGroups(): TypeChainGroup[] {
        const groups: TypeChainGroup[] = [
            {
                type: 'single',
                chain: this.getChain(ChainType.BITCOIN_MAINNET) as ConcreteTypeChain
            },
            {
                type: 'list',
                label: 'Bitcoin Testnet',
                icon: './images/artifacts/bitcoin-testnet-all.svg',
                items: [
                    this.getChain(ChainType.BITCOIN_REGTEST),
                    this.getChain(ChainType.BITCOIN_TESTNET),
                    this.getChain(ChainType.BITCOIN_TESTNET4),
                    this.getChain(ChainType.BITCOIN_SIGNET)
                ].filter(Boolean) as ConcreteTypeChain[]
            },
            {
                type: 'list',
                label: 'Fractal',
                icon: './images/artifacts/fractal-mainnet.svg',
                items: [
                    this.getChain(ChainType.FRACTAL_BITCOIN_MAINNET),
                    this.getChain(ChainType.FRACTAL_BITCOIN_TESTNET)
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

        // Filter out groups that have no enabled items
        return groups.filter((group) => {
            if (group.type === 'single') {
                return group.chain && !group.chain.disable;
            } else {
                return group.items && group.items.some((item) => !item.disable);
            }
        });
    }

    public async testRpcConnection(url: string): Promise<boolean> {
        try {
            const response = await fetch(url, {
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
        networkType: NetworkType;
        chainId: ChainId;
        unit: string;
        opnetUrl: string;
        mempoolSpaceUrl: string;
        faucetUrl?: string;
        showPrice?: boolean;
    }): Promise<CustomNetwork> {
        const isValid = await this.testRpcConnection(params.opnetUrl);
        if (!isValid) {
            throw new Error('Failed to connect to RPC endpoint');
        }

        const chainType = this.getChainType(params.chainId, params.networkType);

        // Check if this combination already has a custom network
        const existing = Array.from(this.customNetworks.values()).find((n) => n.chainType === chainType);

        if (existing) {
            throw new Error('A custom network for this chain already exists. Please delete it first.');
        }

        const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const network: CustomNetwork = {
            id,
            name: params.name,
            networkType: params.networkType,
            chainId: params.chainId,
            chainType,
            icon: CHAIN_ICONS[params.chainId] || './images/artifacts/custom-network.svg',
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
        this.saveToStorage();
        this.rebuildChainsMap();

        return network;
    }

    public updateCustomNetwork(id: string, updates: Partial<CustomNetwork>): CustomNetwork | null {
        const network = this.customNetworks.get(id);
        if (!network) {
            return null;
        }

        const updated = { ...network, ...updates };
        this.customNetworks.set(id, updated);
        this.saveToStorage();
        this.rebuildChainsMap();

        return updated;
    }

    public deleteCustomNetwork(id: string): boolean {
        const network = this.customNetworks.get(id);
        if (!network) {
            return false;
        }

        const deleted = this.customNetworks.delete(id);
        if (deleted) {
            this.saveToStorage();
            this.rebuildChainsMap();
        }
        return deleted;
    }

    public getCustomNetwork(id: string): CustomNetwork | undefined {
        return this.customNetworks.get(id);
    }

    public getCustomNetworkByChainType(chainType: ChainType): CustomNetwork | undefined {
        return Array.from(this.customNetworks.values()).find((network) => network.chainType === chainType);
    }

    public getAllCustomNetworks(): CustomNetwork[] {
        return Array.from(this.customNetworks.values());
    }

    public getChainsMap(): { [key in ChainType]?: ConcreteTypeChain } {
        const map: { [key in ChainType]?: ConcreteTypeChain } = {};
        this.chainsMap.forEach((value, key) => {
            map[key] = value;
        });
        return map;
    }

    public getChain(chainType: ChainType): ConcreteTypeChain | undefined {
        return this.chainsMap.get(chainType);
    }

    public getAllChains(): ConcreteTypeChain[] {
        return Array.from(this.chainsMap.values());
    }

    public isCustomChain(chainType: ChainType): boolean {
        const customNetwork = this.getCustomNetworkByChainType(chainType);
        return !!customNetwork;
    }

    public isDefaultChain(chainType: ChainType): boolean {
        return !!DEFAULT_CHAINS_MAP[chainType];
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(CUSTOM_NETWORKS_STORAGE_KEY);

            if (stored) {
                const networks = JSON.parse(stored) as CustomNetwork[];
                networks.forEach((network) => {
                    this.customNetworks.set(network.id, network);
                });
            }
        } catch (error) {
            console.error('Failed to load custom networks:', error);
        }
    }

    private saveToStorage(): void {
        try {
            const networks = Array.from(this.customNetworks.values());
            localStorage.setItem(CUSTOM_NETWORKS_STORAGE_KEY, JSON.stringify(networks));
        } catch (error) {
            console.error('Failed to save custom networks:', error);
        }
    }

    private rebuildChainsMap(): void {
        this.chainsMap.clear();

        // Add all chains from CHAINS_MAP (includes defaults and disabled chains)
        Object.entries(CHAINS_MAP).forEach(([key, value]) => {
            if (value) {
                this.chainsMap.set(value.enum, value as ConcreteTypeChain);
            }
        });

        // Override with custom networks
        this.customNetworks.forEach((network) => {
            const chain: ConcreteTypeChain = {
                enum: network.chainType,
                label: network.name,
                icon: network.icon || CHAIN_ICONS[network.chainId] || './images/artifacts/custom-network.svg',
                unit: network.unit,
                networkType: network.networkType,
                endpoints: ['https://wallet.opnet.org'],
                opnetUrl: network.opnetUrl,
                mempoolSpaceUrl: network.mempoolSpaceUrl,
                faucetUrl: network.faucetUrl || '',
                okxExplorerUrl: '',
                isViewTxHistoryInternally: false,
                disable: false, // Custom networks are enabled
                showPrice: network.showPrice,
                defaultExplorer: 'mempool-space',
                isCustom: true,
                contractAddresses: {}
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

    private getChainType(chainId: ChainId, networkType: NetworkType): ChainType {
        const chainIdNames: Record<ChainId, string> = {
            [ChainId.Bitcoin]: 'BITCOIN',
            [ChainId.Fractal]: 'FRACTAL_BITCOIN',
            [ChainId.Dogecoin]: 'DOGECOIN',
            [ChainId.Litecoin]: 'LITECOIN',
            [ChainId.BitcoinCash]: 'BITCOINCASH',
            [ChainId.Dash]: 'DASH'
        };

        const networkTypeNames: Record<NetworkType, string> = {
            [NetworkType.MAINNET]: 'MAINNET',
            [NetworkType.TESTNET]: 'TESTNET',
            [NetworkType.REGTEST]: 'REGTEST'
        };

        const chainTypeName = `${chainIdNames[chainId]}_${networkTypeNames[networkType]}`;
        return chainTypeName as ChainType;
    }
}

export const customNetworksManager = new CustomNetworksManager();
