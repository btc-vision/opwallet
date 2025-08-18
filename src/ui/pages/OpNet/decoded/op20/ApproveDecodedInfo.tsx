import BigNumber from 'bignumber.js';

import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { Card, Column, Image, Row, Text } from '@/ui/components';
import { DecodedDecreaseAllowance, DecodedIncreaseAllowance } from '@/ui/pages/OpNet/decoded/DecodedTypes';
import { sliceAddress } from '@/ui/pages/OpNet/decoded/helpper';
import { fontSizes } from '@/ui/theme/font';

export const MAX_UINT256 = new BigNumber('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

interface DecodedApproveProps {
    readonly decoded: DecodedIncreaseAllowance | DecodedDecreaseAllowance;
    readonly contractInfo: Partial<ContractInformation>;
    readonly interactionType: string;
}

export function ApproveDecodedInfo(props: DecodedApproveProps) {
    const { contractInfo } = props;
    const interactionType = props.interactionType;
    const decoded = props.decoded;

    const amount = new BigNumber(decoded.amount.toString()).div(new BigNumber(10).pow(contractInfo.decimals || 8));
    const balanceFormatted = amount.toFormat(6).toString();

    const slicedAddress = sliceAddress(decoded.spender);

    const isUnlimitedApproval = new BigNumber(decoded.amount.toString()).isGreaterThanOrEqualTo(MAX_UINT256);

    return (
        <Card>
            <Column>
                <Text text={interactionType} preset="sub" textCenter />
                <Row>
                    <Image src={contractInfo.logo} size={fontSizes.logo} />
                    <Text
                        text={
                            isUnlimitedApproval
                                ? `Unlimited ${(contractInfo.symbol || '').toUpperCase()}`
                                : `${balanceFormatted} ${(contractInfo.symbol || '').toUpperCase()}`
                        }
                        preset="large"
                        textCenter
                        style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                        }}
                    />
                </Row>
                <Text text={`spender: ✓ ${slicedAddress}`} preset="sub" textCenter />
            </Column>
        </Card>
    );
}
