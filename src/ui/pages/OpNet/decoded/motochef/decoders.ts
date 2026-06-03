import { Address, BinaryReader } from '@btc-vision/transaction';
import { Decoded } from '@/ui/pages/OpNet/decoded/DecodedTypes';

export interface DepositDecoded extends Decoded {
    readonly poolId: bigint;
    readonly amount: bigint;
    readonly to: Address;
}

export interface HarvestDecoded extends Decoded {
    readonly poolId: bigint;
    readonly to: Address;
}

export interface StakeBTCDecoded extends Decoded {
    readonly amount: bigint;
}

export interface WithdrawDecoded extends Decoded {
    readonly poolId: bigint;
    readonly amount: bigint;
    readonly to: Address;
}

export function decodeDepositMotoChef(selector: string, reader: BinaryReader): DepositDecoded {
    const poolId: bigint = reader.readU64();
    const amount: bigint = reader.readU256();
    const to: Address = reader.readAddress();

    return {
        selector,
        poolId,
        amount,
        to
    };
}

export function decodeHarvestMotoChef(selector: string, reader: BinaryReader): HarvestDecoded {
    const poolId: bigint = reader.readU64();
    const to: Address = reader.readAddress();

    return {
        selector,
        poolId,
        to
    };
}

export function decodeStakeBTCMotoChef(selector: string, reader: BinaryReader): StakeBTCDecoded {
    const amount: bigint = reader.readU256();

    return {
        selector,
        amount
    };
}

export function decodeWithdrawMotoChef(selector: string, reader: BinaryReader): WithdrawDecoded {
    const poolId: bigint = reader.readU64();
    const amount: bigint = reader.readU256();
    const to: Address = reader.readAddress();

    return {
        selector,
        poolId,
        amount,
        to
    };
}
