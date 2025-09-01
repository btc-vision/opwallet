import { CancelApprovalParams } from '@/shared/types/Approval';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import { AddressText } from '@/ui/components/AddressText';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { satoshisToAmount } from '@/ui/utils';
import { useApproval } from '@/ui/utils/hooks';
import { PsbtOutputExtended } from '@btc-vision/bitcoin';
import { useMemo } from 'react';

export interface Props {
    params: CancelApprovalParams;
}

function toHex(buffer: Uint8Array | Buffer | number[]): string {
    return Array.prototype.map.call(buffer, (x: number) => ('00' + x.toString(16)).slice(-2)).join('');
}

function formatHexString(hex: string, showFull: boolean = false): string {
    if (showFull || hex.length <= 64) {
        return hex;
    }
    return `${hex.slice(0, 32)}...${hex.slice(-32)}`;
}

export default function CancelTransaction(props: Props) {
    const {
        params: { data, session }
    } = props;

    const { resolveApproval, rejectApproval } = useApproval();
    const btcUnit = useBTCUnit();
    const currentAccount = useCurrentAccount();

    const handleReject = async () => {
        await rejectApproval('User rejected the cancellation request.');
    };

    const handleConfirm = async () => {
        await resolveApproval();
    };

    // Process the compiled target script
    const targetScript = useMemo(() => {
        if (!data.compiledTargetScript) return '';

        if (typeof data.compiledTargetScript === 'string') {
            return data.compiledTargetScript.startsWith('0x')
                ? data.compiledTargetScript.slice(2)
                : data.compiledTargetScript;
        }

        return toHex(data.compiledTargetScript);
    }, [data.compiledTargetScript]);

    // Process optional outputs
    const optionalOutputs = useMemo(() => {
        if (!data.optionalOutputs || !Array.isArray(data.optionalOutputs)) {
            return [];
        }

        return data.optionalOutputs.map((output: PsbtOutputExtended) => ({
            address: 'address' in output && output.address ? output.address : '',
            value: output.value || 0
        }));
    }, [data.optionalOutputs]);

    // Calculate total output value
    const totalOutputValue = useMemo(() => {
        return optionalOutputs.reduce((sum, output) => sum + output.value, 0);
    }, [optionalOutputs]);

    // Format fee information
    const feeInfo = useMemo(() => {
        const feeRate = data.feeRate || 0;
        const estimatedFees = data.estimatedFees ? Number(data.estimatedFees) : 0;

        return {
            rate: feeRate,
            estimated: estimatedFees,
            formatted: satoshisToAmount(estimatedFees)
        };
    }, [data.feeRate, data.estimatedFees]);

    return (
        <Layout>
            <Content>
                <Header padding={8} height={'140px'}>
                    <Column>
                        <WebsiteBar session={session} />
                        <Column>
                            <Text
                                text={'Cancel Transaction'}
                                textCenter
                                preset="title-bold"
                                mt="lg"
                                style={{ color: colors.warning }}
                            />
                        </Column>
                    </Column>
                </Header>

                <Column gap="lg">
                    {/* Warning Section */}
                    <Card
                        style={{
                            borderColor: colors.warning,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            backgroundColor: 'rgba(243, 116, 19, 0.1)' // orange with low opacity
                        }}>
                        <Column gap="sm">
                            <Row itemsCenter gap="sm">
                                <Text text="⚠️" size="xl" />
                                <Text text="Transaction Cancellation" preset="bold" style={{ color: colors.warning }} />
                            </Row>
                            <Text
                                text="You are about to cancel a pending transaction. This will create a new transaction with a higher fee to replace the original one."
                                preset="sub"
                            />
                        </Column>
                    </Card>

                    {/* Target Script Section */}
                    <Column gap="sm">
                        <Text text="Target Script" preset="bold" />
                        <Card>
                            <Column gap="sm">
                                <div
                                    style={{
                                        userSelect: 'text',
                                        maxHeight: 120,
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        fontSize: 12,
                                        fontFamily: 'monospace',
                                        padding: 8,
                                        backgroundColor: colors.black,
                                        borderRadius: 4,
                                        color: colors.text
                                    }}>
                                    {`0x${formatHexString(targetScript)}`}
                                </div>
                                {targetScript.length > 64 && (
                                    <Text
                                        text={`Full script: ${targetScript.length / 2} bytes`}
                                        preset="sub"
                                        size="xs"
                                    />
                                )}
                            </Column>
                        </Card>
                    </Column>

                    {/* Fee Information */}
                    <Column gap="sm">
                        <Text text="Cancellation Fee" preset="bold" />
                        <Card>
                            <Column gap="sm">
                                <Row justifyBetween>
                                    <Text text="Fee Rate:" style={{ color: colors.textDim }} />
                                    <Text text={`${feeInfo.rate} sat/vB`} />
                                </Row>
                                <Text
                                    text="Note: This fee must be higher than the original transaction to ensure cancellation."
                                    preset="sub"
                                    size="xs"
                                    style={{ marginTop: 4 }}
                                />
                            </Column>
                        </Card>
                    </Column>

                    {/* Refund Outputs Section */}
                    {optionalOutputs.length > 0 && (
                        <Column gap="sm">
                            <Row justifyBetween>
                                <Text text="Refund To" preset="bold" />
                                <Row gap="xs">
                                    <Text text="Amount:" style={{ color: colors.textDim }} size="sm" />
                                    <Text text={satoshisToAmount(totalOutputValue)} size="sm" />
                                    <Text text={btcUnit} style={{ color: colors.textDim }} size="sm" />
                                </Row>
                            </Row>
                            <Card>
                                <Column full gap="md">
                                    {optionalOutputs.map((output, index) => {
                                        const isMyAddress = output.address === currentAccount.address;
                                        const isLastItem = index === optionalOutputs.length - 1;

                                        return (
                                            <Column
                                                key={`output_${index}`}
                                                style={
                                                    !isLastItem
                                                        ? {
                                                              borderBottom: `1px solid ${colors.border}`,
                                                              paddingBottom: 10
                                                          }
                                                        : {}
                                                }>
                                                <Row justifyBetween itemsCenter>
                                                    <Column style={{ flex: 1, minWidth: 0 }}>
                                                        <Row itemsCenter gap="xs">
                                                            {isMyAddress && (
                                                                <Text
                                                                    text="(You)"
                                                                    style={{ color: colors.green }}
                                                                    size="xs"
                                                                    preset="bold"
                                                                />
                                                            )}
                                                        </Row>
                                                        <AddressText
                                                            address={output.address}
                                                            color={isMyAddress ? 'white' : 'textDim'}
                                                        />
                                                    </Column>
                                                    <Row gap="xs" style={{ flexShrink: 0 }}>
                                                        <Text
                                                            text={satoshisToAmount(output.value)}
                                                            style={{
                                                                color: isMyAddress ? colors.white : colors.textDim
                                                            }}
                                                            preset="bold"
                                                        />
                                                        <Text text={btcUnit} style={{ color: colors.textDim }} />
                                                    </Row>
                                                </Row>
                                            </Column>
                                        );
                                    })}
                                </Column>
                            </Card>
                        </Column>
                    )}

                    {/* Note Section */}
                    {data.note && (
                        <Column gap="sm">
                            <Text text="Note" preset="bold" />
                            <Card>
                                <Text
                                    text={typeof data.note === 'string' ? data.note : toHex(data.note)}
                                    preset="sub"
                                    style={{
                                        wordBreak: 'break-word',
                                        fontSize: 12
                                    }}
                                />
                            </Card>
                        </Column>
                    )}

                    {/* Security Notice */}
                    <Text
                        text="Only confirm this cancellation if you initiated it and understand the implications. The cancellation fee will be deducted from your wallet."
                        preset="sub"
                        textCenter
                        style={{ marginTop: 8 }}
                    />
                </Column>
            </Content>

            <Footer>
                <Row full gap="md">
                    <Button text="Reject" full preset="default" onClick={handleReject} style={{ flex: 1 }} />
                    <Button
                        text="Cancel Transaction"
                        full
                        preset="primary"
                        onClick={handleConfirm}
                        style={{
                            flex: 1,
                            backgroundColor: colors.warning
                        }}
                    />
                </Row>
            </Footer>
        </Layout>
    );
}
