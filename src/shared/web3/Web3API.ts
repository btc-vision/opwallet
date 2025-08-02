import BigNumber from 'bignumber.js';
import { CallResult, getContract, IOP_20Contract, JSONRpcProvider, OP_20_ABI, UTXOs } from 'opnet';

import { ChainId as WalletChainId, ChainType } from '@/shared/constant';
import { NetworkType } from '@/shared/types';
import { contractLogoManager } from '@/shared/web3/contracts-logo/ContractLogoManager';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { ContractNames } from '@/shared/web3/metadata/ContractNames';
import { networks } from '@btc-vision/bitcoin';
import { Network } from '@btc-vision/bitcoin/src/networks.js';
import {
    Address,
    AddressVerificator,
    ChainId,
    OPNetLimitedProvider,
    OPNetMetadata,
    OPNetNetwork,
    OPNetTokenMetadata,
    TransactionFactory,
    UTXO
} from '@btc-vision/transaction';
import { customNetworksManager } from '@/shared/utils/CustomNetworksManager';

BigNumber.config({ EXPONENTIAL_AT: 256 });

export function getOPNetChainType(chain: ChainType): ChainId {
    // Get the chain configuration
    const chainConfig = customNetworksManager.getChain(chain);

    if (chainConfig) {
        // Check if it's a fractal chain
        if (chainConfig.isFractal || chain.includes('FRACTAL')) {
            return ChainId.Fractal;
        }

        // For custom networks, try to determine from the chainId in the custom network data
        if (chainConfig.isCustom) {
            const customNetwork = customNetworksManager.getCustomNetworkByChainType(chain);
            if (customNetwork) {
                // Map the ChainId enum from constants to the OPNet ChainId
                switch (customNetwork.chainId) {
                    case WalletChainId.Bitcoin:
                        return ChainId.Bitcoin;
                    case WalletChainId.Fractal:
                        return ChainId.Fractal;
                    default: {
                        throw new Error(
                            `Unsupported custom network chainId: ${customNetwork.chainId} for chain ${chain}`
                        );
                    }
                }
            }
        }
    }

    // Fallback to checking the chain type name
    if (chain.includes('FRACTAL')) {
        return ChainId.Fractal;
    }

    // Default to Bitcoin for all other chains
    // This includes Dogecoin, Litecoin, Bitcoin Cash, Dash, etc.
    // until OPNet officially supports them
    return ChainId.Bitcoin;
}

export function getOPNetNetwork(network: NetworkType): OPNetNetwork {
    switch (network) {
        case NetworkType.MAINNET:
            return OPNetNetwork.Mainnet;
        case NetworkType.TESTNET:
            return OPNetNetwork.Testnet;
        case NetworkType.REGTEST:
            return OPNetNetwork.Regtest;
        default:
            throw new Error('Invalid network type');
    }
}

export function getBitcoinLibJSNetwork(networkType: NetworkType, chainType?: ChainType): Network {
    // If chainType is provided, check for special network configurations
    if (chainType) {
        const chainConfig = customNetworksManager.getChain(chainType);

        // Fractal chains use bitcoin network parameters even for testnet
        if (chainConfig?.isFractal || chainType.includes('FRACTAL')) {
            return networks.bitcoin;
        }

        // Add custom network configurations here if needed
        // For example, some chains might have their own network parameters
    }

    // Standard network type mapping
    switch (networkType) {
        case NetworkType.MAINNET:
            return networks.bitcoin;
        case NetworkType.TESTNET:
            return networks.testnet;
        case NetworkType.REGTEST:
            return networks.regtest;
        default:
            throw new Error('Invalid network type');
    }
}

export function bigIntToDecimal(amount: bigint, decimal: number): string {
    const number = new BigNumber(amount.toString()).dividedBy(new BigNumber(10).pow(decimal));

    return number.decimalPlaces(decimal).toPrecision();
}

class Web3API {
    public readonly INVALID_PUBKEY_ERROR: string =
        'Please use the recipient token deposit address (aka "public key").\nOP_NET was unable to automatically find the public key associated with the address you are trying to send to because this address never spent an UTXO before.';

    public network: Network = networks.bitcoin;
    public chainId: ChainId = ChainId.Bitcoin;

    public transactionFactory: TransactionFactory = new TransactionFactory();

    private currentChain?: ChainType;

    //constructor() {
    // Initialize with default, will be set properly when setNetwork is called
    // }

    private _limitedProvider: OPNetLimitedProvider | undefined;

    public get limitedProvider(): OPNetLimitedProvider {
        if (!this._limitedProvider) {
            throw new Error('Limited provider not set');
        }

        return this._limitedProvider;
    }

    private _provider: JSONRpcProvider | undefined;

    public get provider(): JSONRpcProvider {
        if (!this._provider) {
            throw new Error('Provider not set');
        }

        return this._provider;
    }

    public get ROUTER_ADDRESS(): Address | null {
        if (!this.currentChain) return null;

        const chainConfig = customNetworksManager.getChain(this.currentChain);
        if (!chainConfig?.contractAddresses?.router) return null;

        return Address.fromString(chainConfig.contractAddresses.router);
    }

    public get motoAddress(): Address | null {
        if (!this.currentChain) return null;

        const chainConfig = customNetworksManager.getChain(this.currentChain);
        if (!chainConfig?.contractAddresses?.moto) return null;

        return Address.fromString(chainConfig.contractAddresses.moto);
    }

    public get pillAddress(): Address | null {
        if (!this.currentChain) return null;

        const chainConfig = customNetworksManager.getChain(this.currentChain);
        if (!chainConfig?.contractAddresses?.pill) return null;

        return Address.fromString(chainConfig.contractAddresses.pill);
    }

    public get motoAddressP2OP(): string | null {
        return this.motoAddress?.p2op(this.network) || null;
    }

    public get pillAddressP2OP(): string | null {
        return this.pillAddress?.p2op(this.network) || null;
    }

    public get chain(): ChainType {
        if (!this.currentChain) {
            throw new Error('Chain not set');
        }

        return this.currentChain;
    }

    private _metadata?: OPNetTokenMetadata;

    private get metadata(): OPNetTokenMetadata | null {
        if (!this._metadata) return null;

        return this._metadata;
    }

    public setNetwork(chainType: ChainType): void {
        // Get chain configuration from customNetworksManager
        const chainConfig = customNetworksManager.getChain(chainType);

        if (!chainConfig) {
            throw new Error(`Chain configuration not found for ${chainType}`);
        }

        if (chainConfig.disable) {
            throw new Error(`Chain ${chainType} is disabled`);
        }

        // Set the Bitcoin network based on the chain's network type and chain type
        this.network = getBitcoinLibJSNetwork(chainConfig.networkType, chainType);

        if (chainType !== this.currentChain) {
            const chainId = getOPNetChainType(chainType);

            this.currentChain = chainType;
            this.chainId = chainId;

            try {
                this._metadata = OPNetMetadata.getAddresses(this.getOPNetNetwork(), chainId);
            } catch (e) {
                // Metadata might not be available for custom networks
                console.warn(`Metadata not available for chain ${chainType}:`, e);
            }

            this.setProvider(chainType);
        }
    }

    public getOPNetNetwork(): OPNetNetwork {
        switch (this.network) {
            case networks.bitcoin:
                return OPNetNetwork.Mainnet;
            case networks.testnet:
                return OPNetNetwork.Testnet;
            case networks.regtest:
                return OPNetNetwork.Regtest;
            default:
                throw new Error(`Invalid network ${this.network.bech32}`);
        }
    }

    public setProviderFromUrl(url: string): void {
        this._provider = new JSONRpcProvider(url, this.network, 6000);
        this._limitedProvider = new OPNetLimitedProvider(url);
    }

    public isValidAddress(address: string): boolean {
        if (!this.network) {
            throw new Error('Network not set');
        }

        return !!AddressVerificator.detectAddressType(address, this.network);
    }

    public async queryDecimal(address: string): Promise<number> {
        const genericContract: IOP_20Contract = getContract<IOP_20Contract>(
            address,
            OP_20_ABI,
            this.provider,
            this.network
        );

        try {
            const decimals = await genericContract.decimals();
            return decimals.properties.decimals;
        } catch {
            return 0;
        }
    }

    public async queryContractInformation(address: string): Promise<ContractInformation | undefined | false> {
        try {
            let addressP2OP: string = address;
            if (address.startsWith('0x')) {
                addressP2OP = Address.fromString(address).p2op(this.network);
            }

            const genericContract: IOP_20Contract = getContract<IOP_20Contract>(
                addressP2OP,
                OP_20_ABI,
                this.provider,
                this.network
            );

            const promises: [
                Promise<CallResult<{ name: string }>>,
                Promise<
                    CallResult<{
                        symbol: string;
                    }>
                >,
                Promise<CallResult<{ decimals: number }>>,
                Promise<string>
            ] = [
                genericContract.name(),
                genericContract.symbol(),
                genericContract.decimals(),
                contractLogoManager.getContractLogo(addressP2OP)
            ];

            const results = await Promise.all(promises);
            const name = results[0].properties.name ?? this.getContractName(addressP2OP);
            const symbol = results[1].properties.symbol;
            const decimals = results[2].properties.decimals;

            const logo = results[3];
            return {
                name,
                symbol,
                decimals,
                logo
            };
        } catch (e) {
            console.warn(`Couldn't query name/symbol/decimals/logo for contract ${address}:`, e);
            if ((e as Error).message.includes('not found')) {
                return false;
            }
            return;
        }
    }

    public async getUnspentUTXOsForAddresses(addresses: string[], requiredAmount?: bigint): Promise<UTXO[]> {
        let finalUTXOs: UTXOs = [];

        for (const address of addresses) {
            let utxos: UTXOs = [];

            try {
                if (!requiredAmount) {
                    utxos = await this.provider.utxoManager.getUTXOs({
                        address,
                        optimize: false,
                        mergePendingUTXOs: false,
                        filterSpentUTXOs: true
                    });
                } else {
                    utxos = await this.provider.utxoManager.getUTXOsForAmount({
                        address,
                        amount: requiredAmount,
                        optimize: false,
                        mergePendingUTXOs: false,
                        filterSpentUTXOs: true
                    });
                }
            } catch {
                //
            }

            finalUTXOs = finalUTXOs.concat(utxos);
        }

        return finalUTXOs;
    }

    public async getAllUTXOsForAddresses(addresses: string[], requiredAmount?: bigint): Promise<UTXO[]> {
        let finalUTXOs: UTXOs = [];

        for (const address of addresses) {
            let utxos: UTXOs = [];

            try {
                if (!requiredAmount) {
                    utxos = await this.provider.utxoManager.getUTXOs({
                        address,
                        optimize: false,
                        mergePendingUTXOs: true,
                        filterSpentUTXOs: true
                    });
                } else {
                    utxos = await this.provider.utxoManager.getUTXOsForAmount({
                        address,
                        amount: requiredAmount,
                        optimize: false,
                        mergePendingUTXOs: true,
                        filterSpentUTXOs: true
                    });
                }
            } catch {
                //
            }

            finalUTXOs = finalUTXOs.concat(utxos);
        }

        return finalUTXOs;
    }

    private getContractName(address: string): string | undefined {
        return ContractNames[address] ?? 'Generic Contract';
    }

    private setProvider(chainType: ChainType): void {
        const chainMetadata = customNetworksManager.getChain(chainType);

        if (!chainMetadata) {
            throw new Error(`Chain metadata not found for ${chainType}`);
        }

        if (!chainMetadata.opnetUrl) {
            throw new Error(`OPNet RPC URL not set for ${chainType}`);
        }

        this.setProviderFromUrl(chainMetadata.opnetUrl);
    }
}

export default new Web3API();
