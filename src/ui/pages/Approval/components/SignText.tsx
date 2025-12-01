import { useState } from 'react';

import { KEYRING_TYPE } from '@/shared/constant';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useApproval } from '@/ui/utils';

import { ParsedSignMsgUr } from '@/shared/types';
import { SignTextApprovalParams } from '@/shared/types/Approval';
import KeystoneSignScreen from '../../Wallet/KeystoneSignScreen';

export interface Props {
    params: SignTextApprovalParams;
}

type SigningStep = 'review' | 'confirm';

export default function SignText({ params: { data, session } }: Props) {
    const { resolveApproval, rejectApproval } = useApproval();
    const account = useCurrentAccount();
    const [isKeystoneSigning, setIsKeystoneSigning] = useState(false);
    const [step, setStep] = useState<SigningStep>('review');

    const handleCancel = () => {
        rejectApproval();
    };

    const handleReview = () => {
        setStep('confirm');
    };

    const handleBack = () => {
        setStep('review');
    };

    const handleConfirm = () => {
        if (account.type === KEYRING_TYPE.KeystoneKeyring) {
            setIsKeystoneSigning(true);
            return;
        }
        resolveApproval();
    };

    if (isKeystoneSigning) {
        return (
            <KeystoneSignScreen
                type={data.type === 'bip322-simple' ? 'bip322-simple' : 'msg'}
                data={data.message}
                onSuccess={(result: ParsedSignMsgUr) => {
                    resolveApproval({ signature: result.signature });
                }}
                onBack={() => {
                    setIsKeystoneSigning(false);
                }}
            />
        );
    }

    return (
        <Layout>
            <Content>
                <Header>
                    <WebsiteBar session={session} />
                </Header>
                <Column gap="lg" style={{ padding: '0 16px' }}>
                    <Column gap="sm" mt="xl">
                        <Text text="Sign Message" preset="title-bold" textCenter />
                        <Text
                            text={step === 'review' ? 'Review the message below' : 'Confirm your signature'}
                            preset="sub"
                            textCenter
                            style={{ opacity: 0.7 }}
                        />
                    </Column>

                    {step === 'review' && (
                        <>
                            <Card
                                style={{
                                    marginTop: '8px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                <Column gap="sm">
                                    <Text
                                        text="Message Content"
                                        preset="bold"
                                        size="sm"
                                        style={{ opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                    />
                                    <div
                                        style={{
                                            userSelect: 'text',
                                            maxHeight: 320,
                                            overflow: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            padding: '12px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            fontFamily: 'monospace',
                                            fontSize: '14px',
                                            lineHeight: '1.6',
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        }}>
                                        {data.message}
                                    </div>
                                </Column>
                            </Card>

                            <Card
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                                    border: '1px solid rgba(255, 165, 0, 0.3)'
                                }}>
                                <Row itemsCenter gap="sm">
                                    <Text text="⚠️" size="lg" />
                                    <Text
                                        text="Carefully review the message before proceeding"
                                        preset="sub"
                                        size="sm"
                                        style={{ flex: 1 }}
                                    />
                                </Row>
                            </Card>
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            <Card
                                style={{
                                    marginTop: '8px',
                                    backgroundColor: 'rgba(243, 116, 19, 0.1)',
                                    border: '1px solid rgba(243, 116, 19, 0.3)'
                                }}>
                                <Column gap="md">
                                    <Text text="You are about to sign this message with your wallet." textCenter />
                                    <Text
                                        preset="sub"
                                        textCenter
                                        color="warning"
                                        text="Only proceed if you trust this site and understand what you are signing."
                                    />
                                </Column>
                            </Card>

                            <Card
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                <Column gap="sm">
                                    <Row justifyBetween>
                                        <Text text="Signature Type" preset="sub" size="sm" style={{ opacity: 0.6 }} />
                                        <Text text={data.type || 'ecdsa'} preset="bold" size="sm" />
                                    </Row>
                                </Column>
                            </Card>
                        </>
                    )}
                </Column>
            </Content>

            <Footer>
                {step === 'review' && (
                    <Row full gap="md" style={{ padding: '16px' }}>
                        <Button text="Reject" full preset="default" onClick={handleCancel} style={{ flex: 1 }} />
                        <Button
                            text="Review Details"
                            full
                            preset="primary"
                            onClick={handleReview}
                            style={{ flex: 1 }}
                        />
                    </Row>
                )}

                {step === 'confirm' && (
                    <Row full gap="md" style={{ padding: '16px' }}>
                        <Button text="Back" full preset="default" onClick={handleBack} style={{ flex: 1 }} />
                        <Button
                            text="Confirm Signature"
                            full
                            preset="primary"
                            onClick={handleConfirm}
                            style={{ flex: 1 }}
                        />
                    </Row>
                )}
            </Footer>
        </Layout>
    );
}
