import { Card, Column, Text } from '@/ui/components';

interface UnstakeProps {
    readonly interactionType: string;
}

export function UnstakeDecodedInfo(props: UnstakeProps) {
    const interactionType = props.interactionType;

    return (
        <Card>
            <Column>
                <Text
                    text={interactionType}
                    preset="sub"
                    textCenter
                    style={{ maxWidth: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                />
            </Column>
        </Card>
    );
}
