import { BinaryReader } from '@btc-vision/transaction';
import { Buffer } from 'buffer';
import { Decoded } from './DecodedTypes';
import {
    InteractionMotoChef,
    InteractionMotoswap,
    InteractionOP20,
    InteractionTypeNativeSwap,
    isInteractionType
} from './InteractionType';

// ---- Import all decode methods from the step above
import { decodeAddLiquidityMotoswap } from '@/ui/pages/OpNet/decoded/motoswap/AddLiquidityDecodedInfo';
import {
    decodeAddLiquidity,
    decodeAirdrop,
    decodeAirdropWithAmount,
    decodeApprove,
    decodeApproveFrom,
    decodeBurn,
    decodeCancelListing,
    decodeCreatePool,
    decodeCreatePoolWithSignature,
    decodeListLiquidity,
    decodeMint,
    decodeRemoveLiquidity,
    decodeReserve,
    decodeSetFees,
    decodeSwap,
    decodeTransfer,
    decodeTransferFrom
} from './decodeMethods';
import { decodeDepositMotoChef } from './motochef/DepositDecodedInfo';
import { decodeHarvestMotoChef } from './motochef/HarvestDecodedInfo';
import { decodeStakeBTCMotoChef } from './motochef/StakeBTCDecodedInfo';
import { decodeWithdrawMotoChef } from './motochef/WithdrawDecodedInfo';
import { decodeStakeMotoswap } from './motoswap/StakeDecodedInfo';

/**
 * Reads the first 4 bytes to get the selector, then dispatches to the correct decode method.
 */
export function decodeCallData(calldata: string): Decoded | null {
    const data = Buffer.from(calldata.replace(/^0x/, ''), 'hex');
    if (data.length < 4) {
        return null;
    }

    const selector = data.subarray(0, 4).toString('hex');
    if (!isInteractionType(selector)) {
        return null;
    }

    const reader = new BinaryReader(data);
    // Skip selector
    reader.setOffset(4);

    // Switch: OP_20 + NativeSwap
    switch (selector) {
        // OP_20
        case InteractionOP20.Transfer:
            return decodeTransfer(selector, reader);
        case InteractionOP20.TransferFrom:
            return decodeTransferFrom(selector, reader);
        case InteractionOP20.Approve:
            return decodeApprove(selector, reader);
        case InteractionOP20.ApproveFrom:
            return decodeApproveFrom(selector, reader);
        case InteractionOP20.Burn:
            return decodeBurn(selector, reader);
        case InteractionOP20.Mint:
            return decodeMint(selector, reader);
        case InteractionOP20.Airdrop:
            return decodeAirdrop(selector, reader);
        case InteractionOP20.AirdropWithAmount:
            return decodeAirdropWithAmount(selector, reader);

        // NativeSwap
        case InteractionTypeNativeSwap.Reserve:
            return decodeReserve(selector, reader);
        case InteractionTypeNativeSwap.ListLiquidity:
            return decodeListLiquidity(selector, reader);
        case InteractionTypeNativeSwap.CancelListing:
            return decodeCancelListing(selector, reader);
        case InteractionTypeNativeSwap.CreatePool:
            return decodeCreatePool(selector, reader);
        case InteractionTypeNativeSwap.CreatePoolWithSignature:
            return decodeCreatePoolWithSignature(selector, reader);
        case InteractionTypeNativeSwap.SetFees:
            return decodeSetFees(selector, reader);
        case InteractionTypeNativeSwap.AddLiquidity:
            return decodeAddLiquidity(selector, reader);
        case InteractionTypeNativeSwap.RemoveLiquidity:
            return decodeRemoveLiquidity(selector, reader);
        case InteractionTypeNativeSwap.Swap:
            return decodeSwap(selector, reader);

        // MotoSwap - OP_20
        case InteractionMotoswap.AddLiquidity: {
            return decodeAddLiquidityMotoswap(selector, reader);
        }

        // MotoSwap - Staking
        case InteractionMotoswap.Stake: {
            return decodeStakeMotoswap(selector, reader);
        }
        case InteractionMotoswap.Unstake: {
            return {
                selector
            };
        }
        case InteractionMotoswap.ClaimRewards: {
            return {
                selector
            };
        }

        // MotoChef
        case InteractionMotoChef.StakeBTC: {
            return decodeStakeBTCMotoChef(selector, reader);
        }
        case InteractionMotoChef.UnstakeBTC: {
            return {
                selector
            };
        }
        case InteractionMotoChef.Harvest: {
            return decodeHarvestMotoChef(selector, reader);
        }
        case InteractionMotoChef.Deposit: {
            return decodeDepositMotoChef(selector, reader);
        }
        case InteractionMotoChef.Withdraw: {
            return decodeWithdrawMotoChef(selector, reader);
        }

        default:
            return null;
    }
}
