import { Decoded } from './DecodedTypes';
import { Address, BinaryReader } from '@btc-vision/transaction';
import {
    AddLiquidityDecoded,
    DepositDecoded,
    HarvestDecoded,
    RemoveLiquidityMotoswapDecoded,
    StakeBTCDecoded,
    StakeDecoded,
    SwapTokensDecoded,
    WithdrawDecoded
} from '@/ui/pages/OpNet/decoded/types';

export function decodeAddLiquidityMotoswap(selector: string, reader: BinaryReader): AddLiquidityDecoded {
    const tokenA: Address = reader.readAddress();
    const tokenB: Address = reader.readAddress();

    const amountADesired: bigint = reader.readU256();
    const amountBDesired: bigint = reader.readU256();

    const amountAMin: bigint = reader.readU256();
    const amountBMin: bigint = reader.readU256();

    const to: Address = reader.readAddress();
    const deadline: bigint = reader.readU64();

    return {
        selector,
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        to,
        deadline
    };
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

export function decodeRemoveLiquidityMotoswap(selector: string, reader: BinaryReader): RemoveLiquidityMotoswapDecoded {
    const tokenA: Address = reader.readAddress();
    const tokenB: Address = reader.readAddress();

    const liquidity: bigint = reader.readU256();
    const amountAMin: bigint = reader.readU256();
    const amountBMin: bigint = reader.readU256();

    const to: Address = reader.readAddress();
    const deadline: bigint = reader.readU64();

    return {
        selector,
        tokenA,
        tokenB,
        liquidity,
        amountAMin,
        amountBMin,
        to,
        deadline
    };
}

export function decodeStakeBTCMotoChef(selector: string, reader: BinaryReader): StakeBTCDecoded {
    const amount: bigint = reader.readU256();

    return {
        selector,
        amount
    };
}

export function decodeStakeMotoswap(selector: string, reader: BinaryReader): StakeDecoded {
    const amount = reader.readU256();

    return {
        selector,
        amount
    };
}

export function decodeSwapTokensMotoswap(selector: string, reader: BinaryReader): SwapTokensDecoded {
    const amountIn: bigint = reader.readU256();
    const amountOutMin: bigint = reader.readU256();

    const path: Address[] = reader.readAddressArray();

    const to: Address = reader.readAddress();
    const deadline: bigint = reader.readU64();

    return {
        selector,
        amountIn,
        amountOutMin,
        path,
        to,
        deadline
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


