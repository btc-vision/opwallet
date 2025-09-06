export enum InteractionOP20 {
    SafeTransfer = 'f6688a68',
    SafeTransferFrom = '69712a94',
    IncreaseAllowance = '8d645723',
    DecreaseAllowance = 'a600a1df',
    IncreaseAllowanceBySignature = 'cee069b8',
    DecreaseAllowanceBySignature = '7f50d7ed',
    Burn = '308dce5f',
    Mint = '3950e061',
    Airdrop = '3a546b21',
    AirdropWithAmount = 'ca1a382d'
}

export enum InteractionMotoswap {
    AddLiquidity = '4c2a940b',
    RemoveLiquidity = 'b82480d3',
    swapExactTokensForTokensSupportingFeeOnTransferTokens = '713a012c',
    Stake = '0ccd8b3d',
    Unstake = '453c505b',
    ClaimRewards = 'c76d0d0a'
}

export enum InteractionMotoChef {
    StakeBTC = '09fd1691',
    UnstakeBTC = '8f2235ed',
    Harvest = '77b7872f',
    Deposit = '51eb2cd8',
    Withdraw = 'f3813d86'
}

export enum InteractionTypeNativeSwap {
    Reserve = '073c2730',
    ListLiquidity = '2960f13b',
    CancelListing = 'a48e507c',
    CreatePool = 'ced27635',
    CreatePoolWithSignature = '4203f335',
    SetFees = 'b1a5f7c2',
    AddLiquidity = '90d83548',
    RemoveLiquidity = '70dccc7f',
    Swap = 'dbed39e2'
}

export type InteractionType = InteractionOP20 | InteractionTypeNativeSwap | InteractionMotoswap | InteractionMotoChef;

const interactionTypes = [InteractionOP20, InteractionMotoswap, InteractionMotoChef, InteractionTypeNativeSwap];

export function isInteractionType(selector: string): selector is InteractionType {
    return interactionTypes.some((type) => Object.values(type).includes(selector));
}