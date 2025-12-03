import { Row } from '../Row';
import { Text } from '../Text';

export interface AssetTagProps {
    type: 'Unconfirmed';
    small?: boolean;
}

const colors = {
    Unconfirmed: '#BC9238'
};

export default function AssetTag(props: AssetTagProps) {
    const { type, small } = props;
    return (
        <Row
            style={{ backgroundColor: colors[type], borderRadius: small ? 4 : 5 }}
            px={small ? 'sm' : 'md'}
            py={small ? 'zero' : 'xs'}
            itemsCenter>
            <Text text={type} size={small ? 'xxs' : 'xs'} />
        </Row>
    );
}
