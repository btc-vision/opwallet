import { openapiService } from '@/background/service';
import { ADDRESS_TYPES, AddressFlagType } from '@/shared/constant';
import { 
    Account, 
    AddressRecentHistory, 
    AddressSummary, 
    AddressType, 
    BitcoinBalance 
} from '@/shared/types';
import { getChainInfo } from '@/shared/utils';
import Web3API from '@/shared/web3/Web3API';
import { Address, AddressTypes, AddressVerificator } from '@btc-vision/transaction';
import { scriptPkToAddress } from '@btc-vision/wallet-sdk';

export class AddressManager {
    public async getAddressSummary(address: string): Promise<AddressSummary> {
        return openapiService.getAddressSummary(address);
    }

    public async findGroupAssets(
        groups: { type: number; address_arr: string[] }[]
    ): Promise<AddressSummary[]> {
        return openapiService.findGroupAssets(groups);
    }

    public getAddressHistory = async (address: string): Promise<AddressRecentHistory[]> => {
        const data = await openapiService.getAddressRecentHistory(address);
        return data.list;
    };

    public getValidAddressByInput = (input: string): string | null => {
        try {
            const address = Address.fromString(input);
            return address.toString();
        } catch {
            return null;
        }
    };

    public isValidAddress(address: string): boolean {
        try {
            Address.fromString(address);
            return true;
        } catch {
            return false;
        }
    }

    public checkAddressFlag = (address: string): AddressFlagType => {
        const chainInfo = getChainInfo();
        const validator = new AddressVerificator();

        try {
            const bitcoinAddress = Address.fromString(address);
            
            if (validator.detectAddressType(bitcoinAddress) === AddressTypes.P2PKH) {
                return ADDRESS_TYPES.P2PKH;
            } else if (validator.detectAddressType(bitcoinAddress) === AddressTypes.P2SH) {
                return ADDRESS_TYPES.P2SH;
            } else if (validator.detectAddressType(bitcoinAddress) === AddressTypes.P2WPKH) {
                return ADDRESS_TYPES.P2WPKH;
            } else if (validator.detectAddressType(bitcoinAddress) === AddressTypes.P2WSH) {
                return ADDRESS_TYPES.P2WSH;
            } else if (validator.detectAddressType(bitcoinAddress) === AddressTypes.P2TR) {
                return ADDRESS_TYPES.P2TR;
            }
        } catch (error) {
            console.warn('Invalid address:', address, error);
        }

        return ADDRESS_TYPES.UNKNOWN;
    };

    public formatAddressType = (type: AddressType): string => {
        switch (type) {
            case AddressType.P2PKH:
                return 'P2PKH (Legacy)';
            case AddressType.P2SH:
                return 'P2SH';
            case AddressType.P2WPKH:
                return 'P2WPKH (Native SegWit)';
            case AddressType.P2WSH:
                return 'P2WSH';
            case AddressType.P2TR:
                return 'P2TR (Taproot)';
            default:
                return 'Unknown';
        }
    };

    public scriptPkToAddress = (scriptPk: string, addressType: AddressType): string => {
        const chainInfo = getChainInfo();
        return scriptPkToAddress(scriptPk, addressType, chainInfo.network);
    };

    public addressToScriptPk = (address: string): string => {
        try {
            const bitcoinAddress = Address.fromString(address);
            return bitcoinAddress.getScriptPubKey().toString('hex');
        } catch (error) {
            throw new Error(`Invalid address: ${address}`);
        }
    };

    public getAddressFromScriptPk = (scriptPk: string, addressType: AddressType): string => {
        return this.scriptPkToAddress(scriptPk, addressType);
    };

    public getAddressUtxos = async (address: string): Promise<any[]> => {
        const data = await openapiService.getAddressUtxos(address);
        return data;
    };

    public getMultiAddressAssets = async (addresses: string): Promise<AddressSummary[]> => {
        return openapiService.getMultiAddressAssets(addresses);
    };

    public async getAddressBalance(address: string): Promise<BitcoinBalance> {
        const web3 = new Web3API();
        return web3.getBalance(address);
    }

    public getAddressType(address: string): AddressType {
        try {
            const bitcoinAddress = Address.fromString(address);
            const validator = new AddressVerificator();
            const detectedType = validator.detectAddressType(bitcoinAddress);
            
            switch (detectedType) {
                case AddressTypes.P2PKH:
                    return AddressType.P2PKH;
                case AddressTypes.P2SH:
                    return AddressType.P2SH;
                case AddressTypes.P2WPKH:
                    return AddressType.P2WPKH;
                case AddressTypes.P2WSH:
                    return AddressType.P2WSH;
                case AddressTypes.P2TR:
                    return AddressType.P2TR;
                default:
                    throw new Error('Unknown address type');
            }
        } catch (error) {
            throw new Error(`Cannot determine address type for: ${address}`);
        }
    }
}