import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WarningOutlined, SafetyOutlined } from '@ant-design/icons';

import { KEYRING_TYPE } from '@/shared/constant';
import { Account } from '@/shared/types';
import { isWalletError } from '@/shared/utils/errors';
import { Button, Card, Column, Content, Header, Icon, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { copyToClipboard, useLocationState, useWallet } from '@/ui/utils';

type Status = '' | 'error' | 'warning' | undefined;

interface LocationState {
    account: Account;
}

export default function ExportPrivateKeyScreen() {
    const { t } = useTranslation();

    const { account } = useLocationState<LocationState>();

    const [password, setPassword] = useState('');
    const [disabled, setDisabled] = useState(true);

    const [privateKey, setPrivateKey] = useState({ hex: '', wif: '' });
    const [quantumPrivateKey, setQuantumPrivateKey] = useState('');
    const [isSimpleKeyring, setIsSimpleKeyring] = useState(false);
    const [status, setStatus] = useState<Status>('');
    const [error, setError] = useState('');
    const wallet = useWallet();
    const tools = useTools();

    useEffect(() => {
        // Check if this is a Simple Keyring (WIF/private key import)
        const checkKeyringType = async () => {
            try {
                const keyring = await wallet.getCurrentKeyring();
                setIsSimpleKeyring(keyring.type === KEYRING_TYPE.SimpleKeyring);
            } catch {
                setIsSimpleKeyring(false);
            }
        };
        void checkKeyringType();
    }, [wallet]);

    const btnClick = async () => {
        try {
            const _res = await wallet.getPrivateKey(password, account);
            if (!_res) {
                setStatus('error');
                setError('Password is incorrect');
                return;
            }

            setPrivateKey(_res);

            // For Simple Keyrings, also try to get the quantum private key
            if (isSimpleKeyring) {
                try {
                    const opnetWallet = await wallet.getOPNetWallet();
                    if (opnetWallet.quantumPrivateKeyHex) {
                        setQuantumPrivateKey(opnetWallet.quantumPrivateKeyHex);
                    }
                } catch (e) {
                    console.error('Could not retrieve quantum private key:', e);
                }
            }
        } catch (e) {
            setStatus('error');
            if (isWalletError(e)) {
                setError(e.message);
            } else {
                setError('An unexpected error occurred.');
                console.error('Non-WalletError caught: ', e);
            }
        }
    };

    const handleOnKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ('Enter' == e.key) {
            void btnClick();
        }
    };

    useEffect(() => {
        setDisabled(true);
        if (password) {
            setDisabled(false);
            setStatus('');
            setError('');
        }
    }, [password]);

    function copy(str: string) {
        void copyToClipboard(str);
        tools.toastSuccess('Copied');
    }

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Export Private Key"
            />
            <Content>
                {privateKey.wif == '' ? (
                    <Column gap="lg">
                        <Card>
                            <Column gap="lg">
                                <Text
                                    text="If you lose your Private Key, your assets will be gone!"
                                    preset="title-bold"
                                    color="red"
                                />

                                <Text
                                    text="If you share the Private Key to others, your assets will be stolen!"
                                    preset="title-bold"
                                    color="red"
                                />

                                <Text
                                    text="Private Key is only stored in your browser, it is your responsibilities to keep the Private Key safe!"
                                    preset="title-bold"
                                    color="red"
                                />
                            </Column>
                        </Card>

                        {isSimpleKeyring && (
                            <Card style={{ backgroundColor: 'rgba(243, 116, 19, 0.1)', borderColor: 'rgba(243, 116, 19, 0.3)' }}>
                                <Row itemsCenter gap="sm">
                                    <WarningOutlined style={{ fontSize: 18, color: '#f37413' }} />
                                    <Column gap="xs" style={{ flex: 1 }}>
                                        <Text text="IMPORTANT: Export BOTH Keys" preset="bold" size="sm" color="warning" />
                                        <Text
                                            text="For OPNet compatibility, you must backup both your classical and quantum private keys."
                                            preset="sub"
                                            size="xs"
                                        />
                                    </Column>
                                </Row>
                            </Card>
                        )}

                        <Text
                            text=" Please make sure you have read the security tips above before typing your password"
                            preset="title"
                            color="warning"
                            textCenter
                            my="xl"
                        />
                        <Input
                            preset="password"
                            onChange={(e) => {
                                setPassword(e.target.value);
                            }}
                            onKeyUp={(e) => handleOnKeyUp(e)}
                            autoFocus={true}
                        />
                        {error && <Text text={error} preset="regular" color="error" />}

                        <Button text="Show Private Key" preset="primary" disabled={disabled} onClick={btnClick} />
                    </Column>
                ) : (
                    <Column gap="lg">
                        <Text
                            text="If you ever change browsers or move computers, you will need these keys to access this account. Save them somewhere safe and secret."
                            preset="sub"
                            size="sm"
                            textCenter
                        />

                        {/* Classical Private Key Section */}
                        <Card style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                            <Column gap="md">
                                <Text text="Classical Private Key" preset="bold" size="sm" />

                                <Column gap="xs">
                                    <Text text="WIF Format" preset="sub" size="xs" style={{ opacity: 0.7 }} />
                                    <div
                                        onClick={() => copy(privateKey.wif)}
                                        style={{
                                            padding: '10px 12px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px'
                                        }}>
                                        <Icon icon="copy" color="textDim" size={14} />
                                        <Text
                                            text={privateKey.wif}
                                            color="textDim"
                                            size="xs"
                                            style={{ overflowWrap: 'anywhere', flex: 1 }}
                                        />
                                    </div>
                                </Column>

                                <Column gap="xs">
                                    <Text text="HEX Format" preset="sub" size="xs" style={{ opacity: 0.7 }} />
                                    <div
                                        onClick={() => copy(privateKey.hex)}
                                        style={{
                                            padding: '10px 12px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px'
                                        }}>
                                        <Icon icon="copy" color="textDim" size={14} />
                                        <Text
                                            text={privateKey.hex}
                                            color="textDim"
                                            size="xs"
                                            style={{ overflowWrap: 'anywhere', flex: 1 }}
                                        />
                                    </div>
                                </Column>
                            </Column>
                        </Card>

                        {/* Quantum Private Key Section - Only for Simple Keyrings */}
                        {isSimpleKeyring && quantumPrivateKey && (
                            <>
                                <Card style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                                    <Column gap="sm">
                                        <Row itemsCenter gap="sm">
                                            <WarningOutlined style={{ fontSize: 18, color: '#ef4444' }} />
                                            <Text text="CRITICAL: Import BOTH Keys" preset="bold" size="sm" color="red" />
                                        </Row>
                                        <Text
                                            text="When importing this wallet elsewhere, you MUST import BOTH the classical private key (WIF) AND the quantum private key below. If you only import the WIF key, you will NOT be able to use OPNet features!"
                                            preset="sub"
                                            size="xs"
                                            color="red"
                                        />
                                    </Column>
                                </Card>

                                <Card style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                                    <Column gap="md">
                                        <Row itemsCenter gap="sm">
                                            <SafetyOutlined style={{ fontSize: 16, color: '#8B5CF6' }} />
                                            <Text text="Post-Quantum Private Key (MLDSA)" preset="bold" size="sm" />
                                        </Row>

                                        <Text
                                            text="This key is required for all OPNet transactions. Store it securely alongside your classical key."
                                            preset="sub"
                                            size="xs"
                                            style={{ opacity: 0.7 }}
                                        />

                                        <div
                                            onClick={() => copy(quantumPrivateKey)}
                                            style={{
                                                padding: '10px 12px',
                                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '8px'
                                            }}>
                                            <Icon icon="copy" color="textDim" size={14} />
                                            <Text
                                                text={quantumPrivateKey}
                                                color="textDim"
                                                size="xs"
                                                style={{ overflowWrap: 'anywhere', flex: 1, fontFamily: 'monospace' }}
                                            />
                                        </div>
                                    </Column>
                                </Card>
                            </>
                        )}

                        {/* Note for HD wallets */}
                        {!isSimpleKeyring && (
                            <Card style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                                <Row itemsCenter gap="sm">
                                    <SafetyOutlined style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }} />
                                    <Text
                                        text="Quantum keys are automatically derived from your seed phrase. No additional backup needed."
                                        preset="sub"
                                        size="xs"
                                        style={{ opacity: 0.7 }}
                                    />
                                </Row>
                            </Card>
                        )}
                    </Column>
                )}
            </Content>
        </Layout>
    );
}
