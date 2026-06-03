import { Card, Column, Text } from '@/ui/components';
import { sliceAddress } from '../helpper';
import { AddLiquidityDecoded } from './decoders';

interface AddLiquidityProps {
    readonly decoded: AddLiquidityDecoded;
    readonly interactionType: string;
}

export function AddLiquidityDecodedInfo(props: AddLiquidityProps) {
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

                <Text text={`Amount A Desired: ${decoded.amountADesired}`} preset="sub" textCenter />
                <Text text={`Amount B Desired: ${decoded.amountBDesired}`} preset="sub" textCenter />

                <Text text={`Amount A Min: ${decoded.amountAMin}`} preset="sub" textCenter />
                <Text text={`Amount B Min: ${decoded.amountBMin}`} preset="sub" textCenter />

                <Text text={`To: ➜ ${slicedToAddress}`} preset="sub" textCenter />
                <Text text={`Deadline: ${decoded.deadline}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}
