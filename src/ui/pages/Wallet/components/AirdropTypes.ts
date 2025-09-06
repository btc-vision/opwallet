import { ABIDataTypes, BitcoinAbiTypes, BitcoinInterfaceAbi, AddressMap } from '@btc-vision/transaction';
import { Airdrop, IOP20Contract, OP_20_ABI } from 'opnet';

export const AIRDROP_ABI: BitcoinInterfaceAbi = [
    ...OP_20_ABI,
    {
        name: 'airdrop',
        inputs: [
            {
                name: 'wallets',
                type: ABIDataTypes.ADDRESS_UINT256_TUPLE
            }
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function
    }
];

export interface AirdropInterface extends IOP20Contract {
    airdrop(tuple: AddressMap<bigint>): Promise<Airdrop>;
}