export interface Decoded {
    readonly selector: string;
}

export interface DecodedSafeTransfer extends Decoded {
    recipient: string;
    amount: bigint;
    data: Uint8Array;
}

export interface DecodedSafeTransferFrom extends Decoded {
    sender: string;
    recipient: string;
    amount: bigint;
    data: Uint8Array;
}

export interface DecodedIncreaseAllowance extends Decoded {
    spender: string;
    amount: bigint;
}

export interface DecodedDecreaseAllowance extends Decoded {
    spender: string;
    amount: bigint;
}

export interface DecodedIncreaseAllowanceBySignature extends Decoded {
    owner: string;
    spender: string;
    amount: bigint;
    deadline: bigint;
    signature: Uint8Array;
}

export interface DecodedDecreaseAllowanceBySignature extends Decoded {
    owner: string;
    spender: string;
    amount: bigint;
    deadline: bigint;
    signature: Uint8Array;
}

export interface DecodedBurn extends Decoded {
    value: bigint;
}

export interface DecodedMint extends Decoded {
    address: string;
    value: bigint;
}

export interface DecodedAirdrop extends Decoded {
    addressMapData: unknown;
}

export interface DecodedAirdropWithAmount extends Decoded {
    amount: bigint;
    addresses: string[];
}

export interface DecodedReserve extends Decoded {
    token: string;
    maximumAmountIn: bigint;
    minimumAmountOut: bigint;
    forLP: boolean;
}

export interface DecodedListLiquidity extends Decoded {
    token: string;
    receiver: string;
    amountIn: bigint;
    priority: boolean;
}

export interface DecodedCancelListing extends Decoded {
    token: string;
}

export interface DecodedCreatePool extends Decoded {
    token: string;
    floorPrice: bigint;
    initialLiquidity: bigint;
    receiver: string;
    antiBotEnabledFor: number;
    antiBotMaximumTokensPerReservation: bigint;
    maxReservesIn5BlocksPercent: number;
}

export interface DecodedCreatePoolWithSignature extends Decoded {
    signature: Uint8Array;
    approveAmount: bigint;
    token: string;
    floorPrice: bigint;
    initialLiquidity: bigint;
    receiver: string;
    antiBotEnabledFor: number;
    antiBotMaximumTokensPerReservation: bigint;
    maxReservesIn5BlocksPercent: number;
}

export interface DecodedSetFees extends Decoded {
    reservationBaseFee: bigint;
    priorityQueueBaseFee: bigint;
    pricePerUserInPriorityQueueBTC: bigint;
}

export interface DecodedAddLiquidityNative extends Decoded {
    token: string;
    receiver: string;
}

export interface DecodedRemoveLiquidity extends Decoded {
    token: string;
    amount: bigint;
}

export interface DecodedSwap extends Decoded {
    token: string;
}