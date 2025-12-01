import { useState } from 'react';

import { SignDataApprovalParams } from '@/shared/types/Approval';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useApproval } from '@/ui/utils';

export interface Props {
    params: SignDataApprovalParams;
}

type SigningStep = 'review' | 'confirm';

export default function SignData({ params: { data, session } }: Props) {
    const { resolveApproval, rejectApproval } = useApproval();
    const [step, setStep] = useState<SigningStep>('review');

    const handleCancel = () => {
        void rejectApproval();
    };

    const handleReview = () => {
        setStep('confirm');
    };

    const handleBack = () => {
        setStep('review');
    };

    const handleConfirm = () => {
        void resolveApproval();
    };

    return (
        <Layout>
            <Content>
                <Header>
                    <WebsiteBar session={session} />
                </Header>

                <Column>
                    <Text text="Signature Request" preset="title-bold" textCenter mt="lg" />

                    {step === 'review' && (
                        <>
                            <Text text="Review the data you are signing:" textCenter mt="lg" />

                            <Card>
                                <div
                                    style={{
                                        userSelect: 'text',
                                        maxHeight: 384,
                                        overflow: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        flexWrap: 'wrap'
                                    }}>
                                    {data.data}
                                </div>
                            </Card>

                            <Text
                                preset="sub"
                                textCenter
                                mt="lg"
                                color="warning"
                                text="Carefully review the data above before signing. Malicious requests can compromise your wallet."
                            />
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            <Text text="Confirm your signature" textCenter mt="lg" />

                            <Card style={{ backgroundColor: 'rgba(243, 116, 19, 0.1)', borderColor: 'rgba(243, 116, 19, 0.3)' }}>
                                <Column gap="md">
                                    <Text
                                        text="You are about to sign this data with your wallet."
                                        textCenter
                                    />
                                    <Text
                                        preset="sub"
                                        textCenter
                                        color="warning"
                                        text="Only proceed if you trust the requesting site and understand what you are signing."
                                    />
                                </Column>
                            </Card>

                            <Text
                                preset="sub"
                                textCenter
                                mt="md"
                                text="Signature type: ecdsa"
                            />
                        </>
                    )}
                </Column>
            </Content>

            <Footer>
                {step === 'review' && (
                    <Row full>
                        <Button text="Reject" full preset="default" onClick={handleCancel} />
                        <Button text="Review Details" full preset="primary" onClick={handleReview} />
                    </Row>
                )}

                {step === 'confirm' && (
                    <Row full>
                        <Button text="Back" full preset="default" onClick={handleBack} />
                        <Button text="Confirm Signature" full preset="primary" onClick={handleConfirm} />
                    </Row>
                )}
            </Footer>
        </Layout>
    );
}
