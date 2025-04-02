import { SignInteractionApprovalParams } from '@/shared/types/Approval';
import { selectorToString } from '@/shared/web3/decoder/CalldataDecoder';
import { Button, Card, Column, Content, Footer, Header, Image, Layout, Row, Text } from '@/ui/components';
import { svgRegistry } from '@/ui/components/Icon';
import WebsiteBar from '@/ui/components/WebsiteBar';
import InteractionHeader from '@/ui/pages/Approval/components/Headers/InteractionHeader';
import { decodeCallData } from '@/ui/pages/OpNet/decoded/decodeCallData';
import { DecodedCalldata } from '@/ui/pages/OpNet/decoded/DecodedCalldata';
import { useApproval } from '@/ui/utils/hooks';
import { Decoded } from '../../OpNet/decoded/DecodedTypes';

export interface Props {
    params: SignInteractionApprovalParams;
}

export default function SignText(props: Props) {
    const {
        params: { data, session }
    } = props;

    const to: string = data.interactionParameters.to;
    const [_, resolveApproval, rejectApproval] = useApproval();

    const handleCancel = async () => {
        await rejectApproval('User rejected the request.');
    };

    const handleConfirm = async () => {
        await resolveApproval();
    };

    const contractInfo = data.contractInfo;
    const interactionType = selectorToString(data.interactionParameters.calldata as unknown as string);
    const decoded: Decoded | null = decodeCallData(data.interactionParameters.calldata as unknown as string);
    const chain = data.network;

    const optionalOutputs = data.interactionParameters.optionalOutputs;

    return (
        <Layout>
            <Content>
                <Header padding={8} height={'140px'}>
                    <Column>
                        <WebsiteBar session={session} />
                        <InteractionHeader session={session} contract={to} contractInfo={data.contractInfo} />
                    </Column>
                </Header>
                <Column>
                    <Text text="Decoded:" textCenter mt="lg" preset={'sub-bold'} />
                    {decoded ? (
                        <DecodedCalldata
                            decoded={decoded}
                            contractInfo={contractInfo}
                            interactionType={interactionType}
                            chain={chain}></DecodedCalldata>
                    ) : (
                        <Card>
                            <Text
                                text={interactionType}
                                style={{
                                    maxWidth: 254,
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis'
                                }}
                                textCenter
                                mt="lg"
                            />
                        </Card>
                    )}
                    <Text text="Calldata:" textCenter mt="lg" preset={'sub-bold'} />
                    <Card>
                        <div
                            style={{
                                userSelect: 'text',
                                maxHeight: 384,
                                overflow: 'hidden',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                flexWrap: 'wrap',
                                fontSize: 12
                            }}>
                            {`0x${data.interactionParameters.calldata}`}
                        </div>
                    </Card>

                    {optionalOutputs && optionalOutputs.length > 0 && (
                        <Column mt="lg">
                            <Text text="Outputs (Where some funds go):" textCenter preset="sub-bold" />

                            <Card style={{ justifyContent: 'start' }}>
                                <Column style={{ gap: 20, width: '100%' }}>
                                    {optionalOutputs.map((output, index) => {
                                        const valueBTC = (output.value / 1e8).toFixed(8).replace(/\.?0+$/, '');

                                        const address =
                                            'address' in output
                                                ? `${output.address.slice(0, 6)}...${output.address.slice(-6)}`
                                                : output.script.toString('hex').slice(0, 10) + '...';

                                        return (
                                            <Row
                                                key={index}
                                                justifyBetween
                                                style={{
                                                    alignItems: 'center'
                                                }}>
                                                <Text
                                                    text={address}
                                                    style={{ fontFamily: 'monospace', fontSize: 14 }}
                                                />

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 3
                                                    }}>
                                                    <Text
                                                        text={valueBTC}
                                                        style={{ fontFamily: 'monospace', fontSize: 14 }}
                                                    />

                                                    <Image src={svgRegistry.btc} size={28} />
                                                </div>
                                            </Row>
                                        );
                                    })}
                                </Column>
                            </Card>
                        </Column>
                    )}

                    <Text
                        text="Only sign this transaction if you fully understand the content and trust the requesting site."
                        preset="sub"
                        textCenter
                        mt="lg"
                    />
                </Column>
            </Content>

            <Footer>
                <Row full>
                    <Button text="Reject" full preset="default" onClick={handleCancel} />
                    <Button text="Sign" full preset="primary" onClick={handleConfirm} />
                </Row>
            </Footer>
        </Layout>
    );
}
