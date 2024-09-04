import React from 'react';

import { IDeploymentParametersWithoutSigner } from '@/content-script/pageProvider/Web3Provider';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useApproval } from '@/ui/utils/hooks';

interface Props {
    params: {
        data: IDeploymentParametersWithoutSigner;
        session: {
            origin: string;
            icon: string;
            name: string;
        };
    };
}

function toHex(buffer: Uint8Array | Buffer | Array<number>) {
    return Array.prototype.map.call(buffer, (x) => ('00' + x.toString(16)).slice(-2)).join('');
}

function objToBuffer(obj: object): Uint8Array {
    const keys = Object.keys(obj);
    const values = Object.values(obj);

    const buffer = new Uint8Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
        buffer[i] = values[i];
    }

    return buffer;
}

export default function SignDeployment(props: Props) {
    const {
        params: { data, session }
    } = props;

    const [_, resolveApproval, rejectApproval] = useApproval();
    const handleCancel = async () => {
        await rejectApproval('User rejected the request.');
    };

    const handleConfirm = async () => {
        await resolveApproval();
    };

    const bytecode: string = typeof data.bytecode === 'string' ? data.bytecode : toHex(objToBuffer(data.bytecode));

    return (
        <Layout>
            <Content>
                <Header padding={8} height={'140px'}>
                    <Column>
                        <WebsiteBar session={session} />
                        <Column>
                            <Text text={'Deploy contract'} textCenter preset="title-bold" mt="lg" />
                        </Column>
                    </Column>
                </Header>
                <Column>
                    <Text
                        text="You are about to deploy a contract with the following bytecode:"
                        textCenter
                        mt="lg"
                        preset={'sub-bold'}
                    />
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
                            {`0x${bytecode}`}
                        </div>
                    </Card>
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