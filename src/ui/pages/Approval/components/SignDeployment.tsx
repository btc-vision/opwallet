import { SignDeploymentApprovalParams } from '@/shared/types/Approval';
import Web3API from '@/shared/web3/Web3API';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import { AddressText } from '@/ui/components/AddressText';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { satoshisToAmount, useWallet } from '@/ui/utils';
import { useApproval } from '@/ui/utils/hooks';
import { Address } from '@btc-vision/transaction';
import { PsbtOutputExtended } from '@btc-vision/bitcoin';
import { useEffect, useState } from 'react';

export interface Props {
    params: SignDeploymentApprovalParams;
}

function toHex(buffer: Uint8Array | Buffer | number[]) {
    return Array.prototype.map.call(buffer, (x: number) => ('00' + x.toString(16)).slice(-2)).join('');
}

// TODO (typing): check if we really need this function. We are passing buffer parameter and trying to return Uint8Array
// For now, the lint error is fixed by disabling it. If we no longer need this function, we can remove it completely.
function objToBuffer(obj: object): Uint8Array {
    const keys = Object.keys(obj);
    const values = Object.values(obj);

    const buffer = new Uint8Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        buffer[i] = values[i];
    }

    return buffer;
}

export default function SignDeployment(props: Props) {
    const {
        params: { data, session }
    } = props;

    const { resolveApproval, rejectApproval } = useApproval();
    const wallet = useWallet();

    // State to hold all user addresses for accurate output detection
    const [userAddresses, setUserAddresses] = useState<Set<string>>(new Set());

    // Fetch all user addresses for accurate change/refund detection
    // Includes: main address, all CSV variants, p2wda, p2tr, p2wpkh, p2pkh, p2shp2wpkh
    useEffect(() => {
        const fetchUserAddresses = async () => {
            try {
                const account = await wallet.getCurrentAccount();
                const addresses = new Set<string>();

                // Add main address
                addresses.add(account.address.toLowerCase());

                // Derive all address types from pubkey
                if (account.pubkey) {
                    const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
                    const addressInst = Address.fromString(zeroHash, account.pubkey);

                    // Add CSV addresses
                    try {
                        addresses.add(addressInst.toCSV(75, Web3API.network).address.toLowerCase());
                    } catch { /* ignore if derivation fails */ }
                    try {
                        addresses.add(addressInst.toCSV(2, Web3API.network).address.toLowerCase());
                    } catch { /* ignore if derivation fails */ }
                    try {
                        addresses.add(addressInst.toCSV(1, Web3API.network).address.toLowerCase());
                    } catch { /* ignore if derivation fails */ }

                    // Add p2wda address
                    try {
                        addresses.add(addressInst.p2wda(Web3API.network).address.toLowerCase());
                    } catch { /* ignore if derivation fails */ }

                    // Add p2tr (taproot) address
                    try {
                        addresses.add(addressInst.p2tr(Web3API.network).toLowerCase());
                    } catch { /* ignore if derivation fails */ }

                    // Add p2wpkh (native segwit) address
                    try {
                        addresses.add(addressInst.p2wpkh(Web3API.network).toLowerCase());
                    } catch { /* ignore if derivation fails */ }

                    // Add p2pkh (legacy) address
                    try {
                        addresses.add(addressInst.p2pkh(Web3API.network).toLowerCase());
                    } catch { /* ignore if derivation fails */ }

                    // Add p2shp2wpkh (nested segwit) address
                    try {
                        addresses.add(addressInst.p2shp2wpkh(Web3API.network).toLowerCase());
                    } catch { /* ignore if derivation fails */ }
                }

                setUserAddresses(addresses);
            } catch (e) {
                console.error('Failed to fetch user addresses:', e);
            }
        };

        void fetchUserAddresses();
    }, [wallet]);

    const handleCancel = async () => {
        await rejectApproval('User rejected the request.');
    };

    const handleConfirm = async () => {
        await resolveApproval();
    };

    const bytecode: string = typeof data.bytecode === 'string' ? data.bytecode : toHex(objToBuffer(data.bytecode));
    const optionalOutputs: {
        address: string;
        value: number;
    }[] = (data.optionalOutputs ?? []).map((output: PsbtOutputExtended) => ({
        address: 'address' in output && output.address ? output.address : '',
        value: Number(output.value)
    }));

    const btcUnit = useBTCUnit();
    const currentAccount = useCurrentAccount();

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

                {optionalOutputs.length > 0 && (
                    <Column>
                        <Text text={`Outputs: (${optionalOutputs.length})`} preset="bold" />
                        <Card>
                            <Column full justifyCenter gap="lg">
                                {optionalOutputs.map((v, index) => {
                                    // Check against ALL user addresses (main, CSV variants, p2wda, p2tr, etc.)
                                    const isMyAddress = v.address
                                        ? userAddresses.has(v.address.toLowerCase())
                                        : false;

                                    return (
                                        <Column
                                            key={`output_${index}`}
                                            style={
                                                index === 0
                                                    ? {}
                                                    : {
                                                          borderColor: colors.border,
                                                          borderTopWidth: 1,
                                                          paddingTop: 10
                                                      }
                                            }>
                                            <Column>
                                                <Row justifyBetween>
                                                    <AddressText
                                                        address={v.address}
                                                        color={isMyAddress ? 'white' : 'textDim'}
                                                    />
                                                    <Row>
                                                        <Text
                                                            text={satoshisToAmount(v.value)}
                                                            color={isMyAddress ? 'white' : 'textDim'}
                                                        />
                                                        <Text text={btcUnit} color="textDim" />
                                                    </Row>
                                                </Row>
                                            </Column>
                                        </Column>
                                    );
                                })}
                            </Column>
                        </Card>
                    </Column>
                )}
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
