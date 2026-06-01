import BigNumber from 'bignumber.js';
import { Decoded, DecodedDecreaseAllowance, DecodedIncreaseAllowance } from './DecodedTypes';
import { Address } from '@btc-vision/transaction';

export const MAX_UINT256 = new BigNumber('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

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

export interface DepositDecoded extends Decoded {
    readonly poolId: bigint;
    readonly amount: bigint;
    readonly to: Address;
}

export interface HarvestDecoded extends Decoded {
    readonly poolId: bigint;
    readonly to: Address;
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

export interface StakeBTCDecoded extends Decoded {
    readonly amount: bigint;
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

export interface WithdrawDecoded extends Decoded {
    readonly poolId: bigint;
    readonly amount: bigint;
    readonly to: Address;
}


