import { Image } from '../Image';
import { Row } from '../Row';

export function Logo(props: { preset?: 'large' | 'small' | 'onlyLogo' }) {
    const { preset } = props;
    if (preset === 'large') {
        return (
            <Row justifyCenter itemsCenter>
                <Image src="./images/logo/opwallet_logo_dark.svg" width={150} height={80} />
            </Row>
        );
    } else if (preset === 'small') {
        return (
            <Row justifyCenter itemsCenter>
                <Image src="./images/logo/opwallet_logo_dark.svg" height={30} width={100} />
            </Row>
        );
    } else {
        return (
            <Row justifyCenter itemsCenter>
                <Image src="./images/logo/opwallet_onlylogo.svg" height={25} width={90} />
            </Row>
        );
    }
}
