import { Card, Column, Text } from '@/ui/components';
import { sliceAddress } from '../helpper';
import { SwapTokensDecoded } from './decoders';

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
