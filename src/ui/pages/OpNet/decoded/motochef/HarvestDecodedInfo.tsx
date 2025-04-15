import { Card, Column, Text } from '@/ui/components';
import { Decoded } from '@/ui/pages/OpNet/decoded/DecodedTypes';
import { Address, BinaryReader } from '@btc-vision/transaction';
import { sliceAddress } from '../helpper';

export function decodeHarvestMotoChef(selector: string, reader: BinaryReader): HarvestDecoded {
    const poolId: bigint = reader.readU64();
    const to: Address = reader.readAddress();

    return {
        selector,
        poolId,
        to
    };
}

export interface HarvestDecoded extends Decoded {
    readonly poolId: bigint;
    readonly to: Address;
}

interface HarvestProps {
    readonly decoded: HarvestDecoded;
    readonly interactionType: string;
}

export function HarvestDecodedInfo(props: HarvestProps) {
    const interactionType = props.interactionType;
    const decoded = props.decoded;

    const slicedToAddress = sliceAddress(decoded.to.toHex());

    return (
        <Card>
            <Column>
                <Text
                    text={interactionType}
                    preset="sub"
                    textCenter
                    style={{ maxWidth: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                />
                <Text text={`Pool ID: ${decoded.poolId}`} preset="sub" textCenter />

                <Text text={`To: ➜ ${slicedToAddress}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}
