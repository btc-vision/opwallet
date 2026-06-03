import { Card, Column, Text } from '@/ui/components';
import { StakeBTCDecoded } from './decoders';

interface StakeBTCProps {
    readonly decoded: StakeBTCDecoded;
    readonly interactionType: string;
}

export function StakeBTCDecodedInfo(props: StakeBTCProps) {
    const interactionType = props.interactionType;
    const decoded = props.decoded;

    return (
        <Card>
            <Column>
                <Text
                    text={interactionType}
                    preset="sub"
                    textCenter
                    style={{ maxWidth: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                />
                <Text text={`Amount: ${decoded.amount}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}
