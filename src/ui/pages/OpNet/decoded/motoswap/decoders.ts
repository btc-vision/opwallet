import { Address, BinaryReader } from '@btc-vision/transaction';
import { Decoded } from '@/ui/pages/OpNet/decoded/DecodedTypes';

export interface AddLiquidityDecoded extends Decoded {
    readonly tokenA: Address;
    readonly tokenB: Address;

    readonly amountADesired: bigint;
    readonly amountBDesired: bigint;

    readonly amountAMin: bigint;
    readonly amountBMin: bigint;

    readonly to: Address;
    readonly deadline: bigint;
}

export interface RemoveLiquidityMotoswapDecoded extends Decoded {
    readonly tokenA: Address;
    readonly tokenB: Address;

    readonly liquidity: bigint;
    readonly amountAMin: bigint;
    readonly amountBMin: bigint;

    readonly to: Address;
    readonly deadline: bigint;
}

export interface StakeDecoded extends Decoded {
    readonly amount: bigint;
}

export interface SwapTokensDecoded extends Decoded {
    readonly amountIn: bigint;
    readonly amountOutMin: bigint;

    readonly path: Address[];

    readonly to: Address;
    readonly deadline: bigint;
}

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

export function decodeRemoveLiquidityMotoswap(
    selector: string,
    reader: BinaryReader
): RemoveLiquidityMotoswapDecoded {
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
