import { Card, Column, Text } from '@/ui/components';

interface ClaimRewardsProps {
    readonly interactionType: string;
}

export function ClaimRewardsDecodedInfo(props: ClaimRewardsProps) {
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
