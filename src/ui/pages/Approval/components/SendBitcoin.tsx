import { SendBitcoinApprovalParams } from '@/shared/types/Approval';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import { AddressText } from '@/ui/components/AddressText';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { satoshisToAmount } from '@/ui/utils';
import { useApproval } from '@/ui/utils/hooks';

export interface Props {
    params: SendBitcoinApprovalParams;
}

export default function SendBitcoin(props: Props) {
    const {
        params: { data, session }
    } = props;

    const { resolveApproval, rejectApproval } = useApproval();
    const btcUnit = useBTCUnit();
    const currentAccount = useCurrentAccount();

    const handleReject = async () => {
        await rejectApproval('User rejected the request.');
    };

    const handleConfirm = async () => {
        await resolveApproval();
    };

    // SAFETY: data.amount may arrive as a string (bigint serialization through message passing).
    // Convert safely without precision loss for display purposes.
    const amountStr = String(data.amount ?? '0');
    const amountNum = Number(amountStr);
    const amountDisplay = satoshisToAmount(amountNum);

    const toAddress = data.to ?? '';
    const fromAddress = data.from ?? currentAccount.address;
    const feeRate = data.feeRate ?? 0;

    return (
        <Layout>
            <Content>
                <Header padding={8} height={'140px'}>
                    <Column>
                        <WebsiteBar session={session} />
                        <Column>
                            <Text text={'Send Bitcoin'} textCenter preset="title-bold" mt="lg" />
                        </Column>
                    </Column>
                </Header>

                <Column gap="lg">
                    {/* Amount */}
                    <Card>
                        <Column gap="sm" itemsCenter>
                            <Text text="Amount" preset="sub" style={{ color: colors.textDim }} />
                            <Row itemsCenter gap="sm">
                                <Text
                                    text={amountDisplay}
                                    preset="title-bold"
                                    size="xxl"
                                    style={{ color: colors.white }}
                                />
                                <Text text={btcUnit} preset="bold" style={{ color: colors.textDim }} />
                            </Row>
                            <Text
                                text={`${amountStr} satoshis`}
                                preset="sub"
                                size="xs"
                                style={{ color: colors.textDim }}
                            />
                        </Column>
                    </Card>

                    {/* From */}
                    <Column gap="sm">
                        <Text text="From" preset="bold" />
                        <Card>
                            <Row itemsCenter gap="xs">
                                <Text
                                    text="(You)"
                                    style={{ color: colors.green }}
                                    size="xs"
                                    preset="bold"
                                />
                                <AddressText address={fromAddress} color="white" />
                            </Row>
                        </Card>
                    </Column>

                    {/* To */}
                    <Column gap="sm">
                        <Text text="To" preset="bold" />
                        <Card>
                            <AddressText address={toAddress} color="white" />
                        </Card>
                    </Column>

                    {/* Fee Rate */}
                    {feeRate > 0 ? (
                        <Column gap="sm">
                            <Text text="Fee Rate" preset="bold" />
                            <Card>
                                <Row justifyBetween>
                                    <Text text="Rate:" style={{ color: colors.textDim }} />
                                    <Text text={`${feeRate} sat/vB`} />
                                </Row>
                            </Card>
                        </Column>
                    ) : null}

                    {/* Note */}
                    {data.note && typeof data.note === 'string' ? (
                        <Column gap="sm">
                            <Text text="Note" preset="bold" />
                            <Card>
                                <Text
                                    text={data.note}
                                    preset="sub"
                                    style={{ wordBreak: 'break-word', fontSize: 12 }}
                                />
                            </Card>
                        </Column>
                    ) : null}

                    {/* Security Notice */}
                    <Card
                        style={{
                            borderColor: colors.warning,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            backgroundColor: 'rgba(243, 116, 19, 0.1)'
                        }}>
                        <Text
                            text="Only confirm if you trust this site. This will send Bitcoin from your wallet and cannot be reversed."
                            preset="sub"
                            textCenter
                        />
                    </Card>
                </Column>
            </Content>

            <Footer>
                <Row full gap="md">
                    <Button text="Reject" full preset="default" onClick={handleReject} style={{ flex: 1 }} />
                    <Button text="Confirm Send" full preset="primary" onClick={handleConfirm} style={{ flex: 1 }} />
                </Row>
            </Footer>
        </Layout>
    );
}
