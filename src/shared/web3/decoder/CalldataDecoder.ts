import {
    InteractionMotoChef,
    InteractionMotoswap,
    InteractionOP20,
    InteractionTypeNativeSwap,
    isInteractionType
} from '@/shared/types/InteractionType';

export function selectorToString(calldata: string): string {
    if (calldata.length < 4) {
        return 'Unknown Interaction';
    }

    const data = Buffer.from(calldata, 'hex');
    const selector = data.subarray(0, 4).toString('hex');

    if (!isInteractionType(selector)) {
        return `Unknown Interaction : 0x${selector}`;
    }

    switch (selector) {
        // OP20
        case InteractionOP20.SafeTransfer:
            return 'safeTransfer(address,uint256,bytes)';
        case InteractionOP20.SafeTransferFrom:
            return 'safeTransferFrom(address,address,uint256,bytes)';
        case InteractionOP20.IncreaseAllowance:
            return 'increaseAllowance(address,uint256)';
        case InteractionOP20.DecreaseAllowance:
            return 'decreaseAllowance(address,uint256)';
        case InteractionOP20.IncreaseAllowanceBySignature:
            return 'increaseAllowanceBySignature(address,address,uint256,uint64,bytes)';
        case InteractionOP20.DecreaseAllowanceBySignature:
            return 'decreaseAllowanceBySignature(address,address,uint256,uint64,bytes)';

        // NativeSwap
        case InteractionTypeNativeSwap.AddLiquidity:
            return 'addLiquidity(address,string)';
        case InteractionTypeNativeSwap.Reserve:
            return 'reserve(address,uint256,uint256,bool,uint8)';
        case InteractionTypeNativeSwap.ListLiquidity:
            return 'listLiquidity(address,string,uint256,bool)';
        case InteractionTypeNativeSwap.CancelListing:
            return 'cancelListing(address)';
        case InteractionTypeNativeSwap.CreatePool:
            return 'createPool(address,uint256,uint256,...)';
        case InteractionTypeNativeSwap.CreatePoolWithSignature:
            return 'createPoolWithSignature(bytes,uint256,address,...)';
        case InteractionTypeNativeSwap.SetFees:
            return 'setFees(uint256,uint256,uint256)';
        case InteractionTypeNativeSwap.RemoveLiquidity:
            return 'removeLiquidity(address,uint256)';
        case InteractionTypeNativeSwap.Swap:
            return 'swap(address)';

        // Motoswap - OP_20
        case InteractionMotoswap.AddLiquidity:
            return 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint64)';
        case InteractionMotoswap.RemoveLiquidity:
            return 'removeLiquidity(address,address,uint256,uint256,uint256,address,uint64)';
        case InteractionMotoswap.swapExactTokensForTokensSupportingFeeOnTransferTokens:
            return 'swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint64)';

        // Motoswap - Staking
        case InteractionMotoswap.Stake:
            return 'stake(uint256)';
        case InteractionMotoswap.Unstake:
            return 'unstake()';
        case InteractionMotoswap.ClaimRewards:
            return 'claimRewards()';

        // MotoChef
        case InteractionMotoChef.StakeBTC:
            return 'stakeBTC(uint256)';
        case InteractionMotoChef.UnstakeBTC:
            return 'unstakeBTC()';
        case InteractionMotoChef.Harvest:
            return 'harvest(uint64,address)';
        case InteractionMotoChef.Deposit:
            return 'deposit(uint64,uint256,address)';
        case InteractionMotoChef.Withdraw:
            return 'withdraw(uint64,uint256,address)';

        default:
            return `Unknown Interaction : 0x${selector}`;
    }
}
