export enum InteractionOP20 {
    SafeTransfer = 'f6688a68', // safeTransfer(address,uint256,bytes)
    SafeTransferFrom = '69712a94', // safeTransferFrom(address,address,uint256,bytes)
    IncreaseAllowance = '8d645723', // increaseAllowance(address,uint256)
    DecreaseAllowance = 'a600a1df', // decreaseAllowance(address,uint256)
    IncreaseAllowanceBySignature = 'cee069b8', // increaseAllowanceBySignature(address,address,uint256,uint64,bytes)
    DecreaseAllowanceBySignature = '7f50d7ed', // decreaseAllowanceBySignature(address,address,uint256,uint64,bytes)
    Burn = '308dce5f', // burn(uint256)
    Mint = '3950e061', // mint(address,uint256)
    Airdrop = '3a546b21',
    AirdropWithAmount = 'ca1a382d'
}

export enum InteractionMotoswap {
    // OP_20
    AddLiquidity = '4c2a940b', // addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint64)
    RemoveLiquidity = 'b82480d3', // removeLiquidity(address,address,uint256,uint256,uint256,address,uint64)
    swapExactTokensForTokensSupportingFeeOnTransferTokens = '713a012c', // swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint64)

    // Staking
    Stake = '0ccd8b3d', // stake(uint256)
    Unstake = '453c505b', // unstake()
    ClaimRewards = 'c76d0d0a' // claimRewards()
}

export enum InteractionMotoChef {
    StakeBTC = '09fd1691', // stakeBTC(uint256)
    UnstakeBTC = '8f2235ed', // unstakeBTC()
    Harvest = '77b7872f', // harvest(uint64,address)
    Deposit = '51eb2cd8', // deposit(uint64,uint256,address)
    Withdraw = 'f3813d86' // withdraw(uint64,uint256,address)
}

export enum InteractionTypeNativeSwap {
    Reserve = '073c2730', // reserve(address,uint256,uint256,bool,uint8)
    ListLiquidity = '2960f13b', // listLiquidity(address,string,uint256,bool)
    CancelListing = 'a48e507c', // cancelListing(address)
    CreatePool = 'ced27635', // createPool(address,uint256,uint256,string,uint32,uint256,uint32)
    CreatePoolWithSignature = '4203f335', // createPoolWithSignature(bytes,uint256,address,uint256,uint256,string,uint32,uint256,uint32)
    SetFees = 'b1a5f7c2', // setFees(uint256,uint256,uint256)
    AddLiquidity = '90d83548', // addLiquidity(address,string,uint256,bool)
    RemoveLiquidity = '70dccc7f', // removeLiquidity(address,uint256)
    Swap = 'dbed39e2' // swap(address)
}

export type InteractionType = InteractionOP20 | InteractionTypeNativeSwap | InteractionMotoswap | InteractionMotoChef;

const interactionTypes = [InteractionOP20, InteractionMotoswap, InteractionMotoChef, InteractionTypeNativeSwap];

export function isInteractionType(selector: string): selector is InteractionType {
    return interactionTypes.some((type) => Object.values(type).includes(selector));
}
