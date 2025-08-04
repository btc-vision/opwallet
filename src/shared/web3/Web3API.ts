import BigNumber from 'bignumber.js';
import { CallResult, getContract, IOP20Contract, JSONRpcProvider, OP_20_ABI, UTXOs } from 'opnet';

import { CHAINS_MAP, ChainType } from '@/shared/constant';
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

BigNumber.config({ EXPONENTIAL_AT: 256 });

export function getOPNetChainType(chain: ChainType): ChainId {
    switch (chain) {
        case ChainType.FRACTAL_BITCOIN_MAINNET: {
            return ChainId.Fractal;
        }
        case ChainType.FRACTAL_BITCOIN_TESTNET: {
            return ChainId.Fractal;
        }
        default:
            return ChainId.Bitcoin;
    }
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

export function getBitcoinLibJSNetwork(network: NetworkType): Network {
    switch (network) {
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

    constructor() {
        this.setProviderFromUrl('https://api.opnet.org');
    }

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
        const network = this.getOPNetNetwork();

        switch (network) {
            case OPNetNetwork.Mainnet: {
                return null; // TODO: To be changed if needed
            }
            case OPNetNetwork.Testnet: {
                return Address.fromString('0x9e14fc4c4cfca73a89e25e1216ae3a22302a12a7c6e1e3a568e05e8cb824112b');
            }
            case OPNetNetwork.Regtest: {
                return null; // TODO: To be changed if needed
            }
            default:
                throw new Error('Invalid network');
        }
    }

    public get motoAddress(): Address | null {
        const network = this.getOPNetNetwork();

        switch (network) {
            case OPNetNetwork.Mainnet: {
                return null; // TODO: To be changed if needed
            }
            case OPNetNetwork.Testnet: {
                return Address.fromString('0xdb944e78cada1d705af892bb0560a4a9c4b9896d64ef23dfd3870ffd5004f4f2');
            }
            case OPNetNetwork.Regtest: {
                return Address.fromString('0x97493c8f728f484151a8d498d1f94108826dedadd0dc9c1845285a180b7a478f');
            }
            default:
                throw new Error('Invalid network');
        }
    }

    public get pillAddress(): Address | null {
        const network = this.getOPNetNetwork();

        switch (network) {
            case OPNetNetwork.Mainnet: {
                return null; // TODO: To be changed if needed
            }
            case OPNetNetwork.Testnet: {
                return Address.fromString('0x7a0b58be893a250638cb2c95bf993ebe00b60779a4597b7c1ef0e76552c823ce');
            }
            case OPNetNetwork.Regtest: {
                return Address.fromString('0x88d3642a7a7cb1be7cc49455084d08101fcebe56e9ea3c3c3c0d109796c9537f');
            }
            default:
                throw new Error('Invalid network');
        }
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
        switch (chainType) {
            case ChainType.BITCOIN_MAINNET:
                this.network = networks.bitcoin;
                break;
            case ChainType.BITCOIN_TESTNET:
                this.network = networks.testnet;
                break;
            case ChainType.BITCOIN_REGTEST:
                this.network = networks.regtest;
                break;
            case ChainType.FRACTAL_BITCOIN_MAINNET:
                this.network = networks.bitcoin;
                break;
            case ChainType.FRACTAL_BITCOIN_TESTNET:
                this.network = networks.bitcoin;
                break;
            default:
                this.network = networks.bitcoin;
                break;
        }

        if (chainType !== this.currentChain) {
            const chainId = getOPNetChainType(chainType);

            this.currentChain = chainType;
            this.chainId = chainId;

            try {
                this._metadata = OPNetMetadata.getAddresses(this.getOPNetNetwork(), chainId);
            } catch (e) {
                //
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
        const genericContract: IOP20Contract = getContract<IOP20Contract>(
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

            const genericContract: IOP20Contract = getContract<IOP20Contract>(
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
        const chainMetadata = CHAINS_MAP[chainType];
        if (!chainMetadata) {
            throw new Error(`Chain metadata not found for ${chainType}`);
        }

        if (!chainMetadata.opnetUrl) {
            throw new Error('OPNet RPC URL not set');
        }

        this.setProviderFromUrl(chainMetadata.opnetUrl);
    }
}

export default new Web3API();
