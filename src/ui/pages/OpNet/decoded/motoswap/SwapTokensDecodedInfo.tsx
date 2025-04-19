import { Card, Column, Text } from '@/ui/components';
import { Decoded } from '@/ui/pages/OpNet/decoded/DecodedTypes';
import { Address, BinaryReader } from '@btc-vision/transaction';
import { sliceAddress } from '../helpper';

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

export interface SwapTokensDecoded extends Decoded {
    readonly amountIn: bigint;
    readonly amountOutMin: bigint;

    readonly path: Address[];

    readonly to: Address;
    readonly deadline: bigint;
}

interface SwapTokensProps {
    readonly decoded: SwapTokensDecoded;
    readonly interactionType: string;
}

export function SwapTokensDecodedInfo(props: SwapTokensProps) {
    const interactionType = props.interactionType;
    const decoded = props.decoded;

    const slicedToAddress = sliceAddress(decoded.to.toHex());
    const slicedTokenA = sliceAddress(decoded.path[0].toHex());
    const slicedTokenB = sliceAddress(decoded.path[decoded.path.length - 1].toHex());

    return (
        <Card>
            <Column>
                <Text
                    text={interactionType}
                    preset="sub"
                    textCenter
                    style={{ maxWidth: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                />
                <Text text={`Amount In: ${decoded.amountIn}`} preset="sub" textCenter />
                <Text text={`Amount Out Min: ${decoded.amountOutMin}`} preset="sub" textCenter />

                <Text text={`Path: ${slicedTokenA} ➜ ${slicedTokenB}`} preset="sub" textCenter />

                <Text text={`To: ➜ ${slicedToAddress}`} preset="sub" textCenter />
                <Text text={`Deadline: ${decoded.deadline}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}
