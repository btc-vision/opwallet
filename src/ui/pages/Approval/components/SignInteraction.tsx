import { SignInteractionApprovalParams } from '@/shared/types/Approval';
import { selectorToString } from '@/shared/web3/decoder/CalldataDecoder';
import { Button, Card, Column, Content, Footer, Header, Image, Layout, Row, Text } from '@/ui/components';
import { svgRegistry } from '@/ui/components/Icon';
import WebsiteBar from '@/ui/components/WebsiteBar';
import InteractionHeader from '@/ui/pages/Approval/components/Headers/InteractionHeader';
import { decodeCallData } from '@/ui/pages/OpNet/decoded/decodeCallData';
import { DecodedCalldata } from '@/ui/pages/OpNet/decoded/DecodedCalldata';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useApproval } from '@/ui/utils/hooks';
import { EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Decoded } from '../../OpNet/decoded/DecodedTypes';
import { ChangeFeeRate } from './SignInteraction/ChangeFeeRate';
import { ChangePriorityFee } from './SignInteraction/ChangePriorityFee';

export interface Props {
    params: SignInteractionApprovalParams;
}

export default function SignInteraction(props: Props) {
    const {
        params: { data, session }
    } = props;

    const [_, resolveApproval, rejectApproval] = useApproval();
    const unitBtc = useBTCUnit();

    const [interactionParameters, setInteractionParameters] = useState(data.interactionParameters);
    const [isInteractionParametersChanged, setIsInteractionParametersChanged] = useState(false);
    const [isFeeRateModalOpen, setIsFeeRateModalOpen] = useState(false);
    const [isPriorityFeeModalOpen, setIsPriorityFeeModalOpen] = useState(false);

    const contractInfo = data.contractInfo;
    const to: string = data.interactionParameters.to;
    const interactionType = selectorToString(data.interactionParameters.calldata as unknown as string);
    const decoded: Decoded | null = decodeCallData(data.interactionParameters.calldata as unknown as string);
    const chain = data.network;
    const inputs = data.interactionParameters.utxos;
    const gasSatFee = data.interactionParameters.gasSatFee;
    const optionalOutputs = data.interactionParameters.optionalOutputs;
    const feeRate = data.interactionParameters.feeRate;
    const priorityFee = data.interactionParameters.priorityFee;

    const handleCancel = async () => {
        await rejectApproval('User rejected the request.');
    };

    const handleConfirm = async () => {
        await resolveApproval(undefined, isInteractionParametersChanged ? interactionParameters : undefined);
        if (isInteractionParametersChanged) {
            setInteractionParameters(data.interactionParameters);
            setIsInteractionParametersChanged(false);
        }
    };

    const setFeeRate = (newFeeRate: number) => {
        setInteractionParameters((prev) => ({
            ...prev,
            feeRate: newFeeRate
        }));
        setIsInteractionParametersChanged(true);
    };

    const setPriorityFee = (newPriorityFee: bigint) => {
        setInteractionParameters((prev) => ({
            ...prev,
            priorityFee: newPriorityFee
        }));
        setIsInteractionParametersChanged(true);
    };

    return (
        <Layout>
            {isFeeRateModalOpen && (
                <ChangeFeeRate
                    onClose={() => setIsFeeRateModalOpen(false)}
                    setSetting={setFeeRate}
                    setting={feeRate.toString()}
                />
            )}

            {isPriorityFeeModalOpen && (
                <ChangePriorityFee
                    onClose={() => setIsPriorityFeeModalOpen(false)}
                    setSetting={setPriorityFee}
                    setting={(Number(priorityFee) / 1e8).toFixed(8).replace(/\.?0+$/, '')}
                />
            )}

            <Content>
                <Header padding={8} height={'140px'}>
                    <Column>
                        <WebsiteBar session={session} />
                        <InteractionHeader session={session} contract={to} contractInfo={contractInfo} />
                    </Column>
                </Header>
                <Column>
                    <Text text="Interaction:" textCenter mt="lg" preset={'sub-bold'} />
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

                    {!decoded && (
                        <>
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
                        </>
                    )}

                    <Column mt="lg">
                        <Text text="Settings:" textCenter preset="sub-bold" />

                        <Card style={{ justifyContent: 'start' }}>
                            <Column style={{ gap: 20, width: '100%' }}>
                                <Row
                                    justifyBetween
                                    style={{
                                        alignItems: 'center'
                                    }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5
                                        }}>
                                        <Text text="Priority fee" style={{ fontFamily: 'monospace', fontSize: 14 }} />
                                        <div
                                            style={{
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setIsPriorityFeeModalOpen(true)}>
                                            <EditOutlined />
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3
                                        }}>
                                        <Text
                                            text={(Number(priorityFee) / 1e8).toFixed(8).replace(/\.?0+$/, '')}
                                            style={{ fontFamily: 'monospace', fontSize: 14 }}
                                        />

                                        <Image src={svgRegistry.btc} size={28} />
                                    </div>
                                </Row>

                                <Row
                                    justifyBetween
                                    style={{
                                        alignItems: 'center'
                                    }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5
                                        }}>
                                        <Text text="Fee rate" style={{ fontFamily: 'monospace', fontSize: 14 }} />
                                        <div
                                            style={{
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setIsFeeRateModalOpen(true)}>
                                            <EditOutlined />
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3
                                        }}>
                                        <Text
                                            text={`${feeRate} sat/vB`}
                                            style={{ fontFamily: 'monospace', fontSize: 14 }}
                                        />

                                        <Image src={svgRegistry.settings} size={18} />
                                    </div>
                                </Row>
                            </Column>
                        </Card>
                    </Column>

                    {inputs && inputs.length > 0 && (
                        <Column mt="lg">
                            <Text text="Inputs (UTXOs used):" textCenter preset="sub-bold" />

                            <Card style={{ justifyContent: 'start' }}>
                                <Column style={{ gap: 20, width: '100%' }}>
                                    {inputs.map((input, index) => (
                                        <Row key={index} justifyBetween style={{ alignItems: 'center' }}>
                                            <Text
                                                text={`${input.transactionId.slice(0, 6)}...${input.transactionId.slice(-6)}`}
                                                style={{ fontFamily: 'monospace', fontSize: 14 }}
                                            />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <Text
                                                    text={(Number(input.value) / 1e8).toFixed(8).replace(/\.?0+$/, '')}
                                                    style={{ fontFamily: 'monospace', fontSize: 14 }}
                                                />
                                                <Image src={svgRegistry.btc} size={28} />
                                            </div>
                                        </Row>
                                    ))}
                                </Column>
                            </Card>
                        </Column>
                    )}

                    <Column mt="lg">
                        <Text text="Outputs (Where funds go):" textCenter preset="sub-bold" />

                        <Card style={{ justifyContent: 'start' }}>
                            <Column style={{ gap: 20, width: '100%' }}>
                                <Row
                                    justifyBetween
                                    style={{
                                        alignItems: 'center'
                                    }}>
                                    <Text text="Execution gas fee" style={{ fontFamily: 'monospace', fontSize: 14 }} />

                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3
                                        }}>
                                        <Text
                                            text={(Number(gasSatFee) / 1e8).toFixed(8).replace(/\.?0+$/, '')}
                                            style={{ fontFamily: 'monospace', fontSize: 14 }}
                                        />

                                        <Image src={svgRegistry.btc} size={28} />
                                    </div>
                                </Row>

                                {optionalOutputs?.map((output, index) => {
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
                                            <Text text={address} style={{ fontFamily: 'monospace', fontSize: 14 }} />

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
                    <Button
                        text={`Sign (${(
                            (Number(gasSatFee) +
                                Number(priorityFee) +
                                (optionalOutputs ?? []).reduce((sum, output) => sum + Number(output.value), 0)) /
                            1e8
                        )
                            .toFixed(8)
                            .replace(/\.?0+$/, '')} ${unitBtc})`}
                        full
                        preset="primary"
                        onClick={handleConfirm}
                    />
                </Row>
            </Footer>
        </Layout>
    );
}
