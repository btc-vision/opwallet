import { ChainType } from '@/shared/constant';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import Web3API from '@/shared/web3/Web3API';
import {
    InteractionMotoChef,
    InteractionMotoswap,
    InteractionOP20,
    InteractionTypeNativeSwap,
    isInteractionType
} from '@/ui/pages/OpNet/decoded/InteractionType';
import {
    AddLiquidityDecoded,
    AddLiquidityDecodedInfo
} from '@/ui/pages/OpNet/decoded/motoswap/AddLiquidityDecodedInfo';
import {
    AddLiquidityDecodedInfoNative,
    CancelListingDecodedInfo,
    CreatePoolDecodedInfo,
    CreatePoolWithSignatureDecodedInfo,
    ListLiquidityDecodedInfo,
    RemoveLiquidityDecodedInfo,
    ReserveDecodedInfo,
    SetFeesDecodedInfo,
    SwapDecodedInfo
} from '@/ui/pages/OpNet/decoded/native-swap/NativeSwapComponents';
import { ApproveDecodedInfo } from '@/ui/pages/OpNet/decoded/op20/ApproveDecodedInfo';
import { TransferDecodedInfo } from '@/ui/pages/OpNet/decoded/op20/TransferDecodedInfo';
import {
    Decoded,
    DecodedAddLiquidityNative,
    DecodedAirdrop,
    DecodedAirdropWithAmount,
    DecodedApprove,
    DecodedApproveFrom,
    DecodedBurn,
    DecodedCancelListing,
    DecodedCreatePool,
    DecodedCreatePoolWithSignature,
    DecodedListLiquidity,
    DecodedMint,
    DecodedRemoveLiquidity,
    DecodedReserve,
    DecodedSetFees,
    DecodedSwap,
    DecodedTransfer,
    DecodedTransferFrom
} from './DecodedTypes';
import { DepositDecoded, DepositDecodedInfo } from './motochef/DepositDecodedInfo';
import { HarvestDecoded, HarvestDecodedInfo } from './motochef/HarvestDecodedInfo';
import { StakeBTCDecoded, StakeBTCDecodedInfo } from './motochef/StakeBTCDecodedInfo';
import { UnstakeBTCDecodedInfo } from './motochef/UnstakeBTCDecodedInfo';
import { WithdrawDecoded, WithdrawDecodedInfo } from './motochef/WithdrawDecodedInfo';
import { ClaimRewardsDecodedInfo } from './motoswap/ClaimRewardsDecodedInfo';
import {
    RemoveLiquidityMotoswapDecoded,
    RemoveLiquidityMotoswapDecodedInfo
} from './motoswap/RemoveLiquidityMotoSwapDecodedInfo';
import { StakeDecoded, StakeDecodedInfo } from './motoswap/StakeDecodedInfo';
import { SwapTokensDecoded, SwapTokensDecodedInfo } from './motoswap/SwapTokensDecodedInfo';
import { UnstakeDecodedInfo } from './motoswap/UnstakeDecodedInfo';
import {
    AirdropDecodedInfo,
    AirdropWithAmountDecodedInfo,
    ApproveFromDecodedInfo,
    BurnDecodedInfo,
    MintDecodedInfo,
    TransferFromDecodedInfo
} from './op20/OP20';

interface DecodedProps {
    readonly decoded: Decoded;
    readonly contractInfo: false | ContractInformation | undefined;
    readonly interactionType: string;
    readonly chain: ChainType;
}

export function DecodedCalldata(props: DecodedProps) {
    Web3API.setNetwork(props.chain);

    const contractInfo: Partial<ContractInformation> = props.contractInfo || {
        name: 'Unknown'
    };

    const decoded = props.decoded;
    const interactionType = props.interactionType;

    if (!isInteractionType(decoded.selector)) {
        return <></>;
    }

    switch (decoded.selector) {
        // -------------------------
        //          OP20
        // -------------------------
        case InteractionOP20.Transfer: {
            return (
                <TransferDecodedInfo
                    decoded={decoded as DecodedTransfer}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionOP20.TransferFrom: {
            return (
                <TransferFromDecodedInfo
                    decoded={decoded as DecodedTransferFrom}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionOP20.Approve: {
            return (
                <ApproveDecodedInfo
                    decoded={decoded as DecodedApprove}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionOP20.ApproveFrom: {
            return (
                <ApproveFromDecodedInfo
                    decoded={decoded as DecodedApproveFrom}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionOP20.Burn: {
            return (
                <BurnDecodedInfo
                    decoded={decoded as DecodedBurn}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionOP20.Mint: {
            return (
                <MintDecodedInfo
                    decoded={decoded as DecodedMint}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionOP20.Airdrop: {
            return (
                <AirdropDecodedInfo
                    decoded={decoded as DecodedAirdrop}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionOP20.AirdropWithAmount: {
            return (
                <AirdropWithAmountDecodedInfo
                    decoded={decoded as DecodedAirdropWithAmount}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }

        // -------------------------
        //      NativeSwap
        // -------------------------
        case InteractionTypeNativeSwap.AddLiquidity: {
            return (
                <AddLiquidityDecodedInfoNative
                    decoded={decoded as DecodedAddLiquidityNative}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionTypeNativeSwap.Reserve: {
            return (
                <ReserveDecodedInfo
                    decoded={decoded as DecodedReserve}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionTypeNativeSwap.ListLiquidity: {
            return (
                <ListLiquidityDecodedInfo
                    decoded={decoded as DecodedListLiquidity}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionTypeNativeSwap.CancelListing: {
            return (
                <CancelListingDecodedInfo
                    decoded={decoded as DecodedCancelListing}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionTypeNativeSwap.CreatePool: {
            return (
                <CreatePoolDecodedInfo
                    decoded={decoded as DecodedCreatePool}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionTypeNativeSwap.CreatePoolWithSignature: {
            return (
                <CreatePoolWithSignatureDecodedInfo
                    decoded={decoded as DecodedCreatePoolWithSignature}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionTypeNativeSwap.SetFees: {
            return (
                <SetFeesDecodedInfo
                    decoded={decoded as DecodedSetFees}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionTypeNativeSwap.RemoveLiquidity: {
            return (
                <RemoveLiquidityDecodedInfo
                    decoded={decoded as DecodedRemoveLiquidity}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionTypeNativeSwap.Swap: {
            return (
                <SwapDecodedInfo
                    decoded={decoded as DecodedSwap}
                    contractInfo={contractInfo}
                    interactionType={interactionType}
                />
            );
        }

        // -------------------------
        //     Motoswap - OP_20
        // -------------------------
        case InteractionMotoswap.AddLiquidity: {
            return (
                <AddLiquidityDecodedInfo decoded={decoded as AddLiquidityDecoded} interactionType={interactionType} />
            );
        }
        case InteractionMotoswap.RemoveLiquidity: {
            return (
                <RemoveLiquidityMotoswapDecodedInfo
                    decoded={decoded as RemoveLiquidityMotoswapDecoded}
                    interactionType={interactionType}
                />
            );
        }
        case InteractionMotoswap.swapExactTokensForTokensSupportingFeeOnTransferTokens: {
            return <SwapTokensDecodedInfo decoded={decoded as SwapTokensDecoded} interactionType={interactionType} />;
        }

        // -------------------------
        //    Motoswap - Staking
        // -------------------------
        case InteractionMotoswap.Stake: {
            return <StakeDecodedInfo decoded={decoded as StakeDecoded} interactionType={interactionType} />;
        }
        case InteractionMotoswap.Unstake: {
            return <UnstakeDecodedInfo interactionType={interactionType} />;
        }
        case InteractionMotoswap.ClaimRewards: {
            return <ClaimRewardsDecodedInfo interactionType={interactionType} />;
        }

        // -------------------------
        //        MotoChef
        // -------------------------
        case InteractionMotoChef.StakeBTC: {
            return <StakeBTCDecodedInfo decoded={decoded as StakeBTCDecoded} interactionType={interactionType} />;
        }
        case InteractionMotoChef.UnstakeBTC: {
            return <UnstakeBTCDecodedInfo interactionType={interactionType} />;
        }
        case InteractionMotoChef.Harvest: {
            return <HarvestDecodedInfo decoded={decoded as HarvestDecoded} interactionType={interactionType} />;
        }
        case InteractionMotoChef.Deposit: {
            return <DepositDecodedInfo decoded={decoded as DepositDecoded} interactionType={interactionType} />;
        }
        case InteractionMotoChef.Withdraw: {
            return <WithdrawDecodedInfo decoded={decoded as WithdrawDecoded} interactionType={interactionType} />;
        }

        default: {
            return <></>;
        }
    }
}
