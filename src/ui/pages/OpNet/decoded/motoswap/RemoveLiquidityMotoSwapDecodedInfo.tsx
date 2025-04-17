import { Card, Column, Text } from '@/ui/components';
import { Decoded } from '@/ui/pages/OpNet/decoded/DecodedTypes';
import { Address, BinaryReader } from '@btc-vision/transaction';
import { sliceAddress } from '../helpper';

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

export interface RemoveLiquidityMotoswapDecoded extends Decoded {
    readonly tokenA: Address;
    readonly tokenB: Address;

    readonly liquidity: bigint;
    readonly amountAMin: bigint;
    readonly amountBMin: bigint;

    readonly to: Address;
    readonly deadline: bigint;
}

interface RemoveLiquidityMotoswapProps {
    readonly decoded: RemoveLiquidityMotoswapDecoded;
    readonly interactionType: string;
}

export function RemoveLiquidityMotoswapDecodedInfo(props: RemoveLiquidityMotoswapProps) {
    const interactionType = props.interactionType;
    const decoded = props.decoded;

    const slicedToAddress = sliceAddress(decoded.to.toHex());
    const slicedTokenA = sliceAddress(decoded.tokenA.toHex());
    const slicedTokenB = sliceAddress(decoded.tokenB.toHex());

    return (
        <Card>
            <Column>
                <Text
                    text={interactionType}
                    preset="sub"
                    textCenter
                    style={{ maxWidth: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                />
                <Text text={`Token A: ➜ ${slicedTokenA}`} preset="sub" textCenter />
                <Text text={`Token B: ➜ ${slicedTokenB}`} preset="sub" textCenter />

                <Text text={`Liquidity: ${decoded.liquidity}`} preset="sub" textCenter />
                <Text text={`Amount A Min: ${decoded.amountAMin}`} preset="sub" textCenter />
                <Text text={`Amount B Min: ${decoded.amountBMin}`} preset="sub" textCenter />

                <Text text={`To: ➜ ${slicedToAddress}`} preset="sub" textCenter />
                <Text text={`Deadline: ${decoded.deadline}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}
