import { useEffect, useState } from 'react';
import { CheckCircleOutlined, InfoCircleOutlined, WarningOutlined, LoadingOutlined } from '@ant-design/icons';

import { KEYRING_TYPE } from '@/shared/constant';
import { QuantumKeyStatus } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { copyToClipboard, useWallet } from '@/ui/utils';

const colors = {
    main: '#f37413',
    background: '#212121',
    success: '#4ade80',
    warning: '#f37413',
    error: '#ef4444',
    textFaded: 'rgba(255, 255, 255, 0.6)'
};

export default function QuantumMigrationScreen() {
    const wallet = useWallet();
    const tools = useTools();
    const account = useCurrentAccount();

    const [loading, setLoading] = useState(true);
    const [isHdWallet, setIsHdWallet] = useState(false);
    const [hasQuantumKey, setHasQuantumKey] = useState(false);
    const [quantumPublicKey, setQuantumPublicKey] = useState<string>('');
    const [importMode, setImportMode] = useState(false);
    const [quantumKeyInput, setQuantumKeyInput] = useState('');
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkStatus = async () => {
            setLoading(true);
            try {
                // Check if this is an HD wallet (mnemonic-based)
                const keyring = await wallet.getCurrentKeyring();
                const isHd = keyring.type === KEYRING_TYPE.HdKeyring;
                setIsHdWallet(isHd);

                // For HD wallets, quantum keys are auto-derived
                if (isHd) {
                    setHasQuantumKey(true);
                    // Get quantum public key
                    const opnetWallet = await wallet.getOPNetWallet();
                    if (opnetWallet.mldsaKeypair) {
                        // Get the hashed public key from the address
                        const addressHex = opnetWallet.address.toHex();
                        if (addressHex) {
                            setQuantumPublicKey(addressHex.replace('0x', ''));
                        }
                    }
                } else {
                    // For Simple keyrings, check if quantum key exists
                    try {
                        const opnetWallet = await wallet.getOPNetWallet();
                        if (opnetWallet.mldsaKeypair) {
                            setHasQuantumKey(true);
                            const addressHex = opnetWallet.address.toHex();
                            if (addressHex) {
                                setQuantumPublicKey(addressHex.replace('0x', ''));
                            }
                        }
                    } catch {
                        setHasQuantumKey(false);
                    }
                }
            } catch (e) {
                console.error('Error checking quantum status:', e);
                tools.toastError('Failed to check quantum key status');
            } finally {
                setLoading(false);
            }
        };

        void checkStatus();
    }, [wallet, tools]);

    const handleImport = async () => {
        setError('');

        // Validate input - quantum private key should be hex characters (length varies by security level)
        const cleanKey = quantumKeyInput.replace('0x', '').trim();
        if (!/^[0-9a-fA-F]+$/.test(cleanKey) || cleanKey.length < 64) {
            setError('Invalid quantum key. Must be a valid hexadecimal private key.');
            return;
        }

        setImporting(true);
        try {
            // Import quantum key for the current account
            await wallet.setQuantumKey(cleanKey);
            tools.toastSuccess('Quantum key imported successfully');
            setHasQuantumKey(true);
            setImportMode(false);
            // Refresh status
            const opnetWallet = await wallet.getOPNetWallet();
            if (opnetWallet.mldsaKeypair) {
                const addressHex = opnetWallet.address.toHex();
                if (addressHex) {
                    setQuantumPublicKey(addressHex.replace('0x', ''));
                }
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setImporting(false);
        }
    };

    const handleGenerateNew = async () => {
        setImporting(true);
        try {
            // Generate new quantum key for the account
            await wallet.generateQuantumKey();
            tools.toastSuccess('New quantum key generated successfully');
            setHasQuantumKey(true);
            // Refresh status
            const opnetWallet = await wallet.getOPNetWallet();
            if (opnetWallet.mldsaKeypair) {
                const addressHex = opnetWallet.address.toHex();
                if (addressHex) {
                    setQuantumPublicKey(addressHex.replace('0x', ''));
                }
            }
        } catch (e) {
            tools.toastError((e as Error).message);
        } finally {
            setImporting(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <Header title="Post-Quantum Migration" onBack={() => window.history.go(-1)} />
                <Content itemsCenter justifyCenter>
                    <LoadingOutlined style={{ fontSize: 32, color: colors.main }} />
                    <Text text="Checking quantum key status..." mt="md" />
                </Content>
            </Layout>
        );
    }

    // HD wallet - no migration needed
    if (isHdWallet) {
        return (
            <Layout>
                <Header title="Post-Quantum Keys" onBack={() => window.history.go(-1)} />
                <Content style={{ padding: '16px' }}>
                    <Card style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.3)' }}>
                        <Row itemsCenter gap="md">
                            <CheckCircleOutlined style={{ fontSize: 24, color: colors.success }} />
                            <Column gap="zero" style={{ flex: 1 }}>
                                <Text text="Quantum Keys Active" preset="bold" color="green" />
                                <Text
                                    text="Your HD wallet automatically derives quantum keys from your mnemonic."
                                    preset="sub"
                                    size="xs"
                                />
                            </Column>
                        </Row>
                    </Card>

                    <Card style={{ marginTop: '16px' }}>
                        <Column gap="md">
                            <Text text="MLDSA Public Key Hash (SHA256)" preset="bold" size="sm" />
                            <div
                                style={{
                                    padding: '12px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '8px',
                                    wordBreak: 'break-all',
                                    fontFamily: 'monospace',
                                    fontSize: '12px'
                                }}>
                                {quantumPublicKey ? `0x${quantumPublicKey}` : 'Loading...'}
                            </div>
                            <Button
                                text="Copy Public Key Hash"
                                preset="default"
                                onClick={() => {
                                    if (quantumPublicKey) {
                                        copyToClipboard(`0x${quantumPublicKey}`).then(() => {
                                            tools.toastSuccess('Copied');
                                        });
                                    }
                                }}
                            />
                        </Column>
                    </Card>

                    <Card style={{ marginTop: '16px', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                        <Row itemsCenter gap="sm">
                            <InfoCircleOutlined style={{ fontSize: 16, color: colors.textFaded }} />
                            <Text
                                text="No action required. Your quantum keys are automatically derived from your seed phrase."
                                preset="sub"
                                size="xs"
                            />
                        </Row>
                    </Card>
                </Content>
            </Layout>
        );
    }

    // Simple keyring with quantum key
    if (hasQuantumKey) {
        return (
            <Layout>
                <Header title="Post-Quantum Keys" onBack={() => window.history.go(-1)} />
                <Content style={{ padding: '16px' }}>
                    <Card style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.3)' }}>
                        <Row itemsCenter gap="md">
                            <CheckCircleOutlined style={{ fontSize: 24, color: colors.success }} />
                            <Column gap="zero" style={{ flex: 1 }}>
                                <Text text="Quantum Key Active" preset="bold" color="green" />
                                <Text
                                    text="Your wallet has a quantum-resistant MLDSA key."
                                    preset="sub"
                                    size="xs"
                                />
                            </Column>
                        </Row>
                    </Card>

                    <Card style={{ marginTop: '16px' }}>
                        <Column gap="md">
                            <Text text="MLDSA Public Key Hash (SHA256)" preset="bold" size="sm" />
                            <div
                                style={{
                                    padding: '12px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '8px',
                                    wordBreak: 'break-all',
                                    fontFamily: 'monospace',
                                    fontSize: '12px'
                                }}>
                                {quantumPublicKey ? `0x${quantumPublicKey}` : 'Loading...'}
                            </div>
                            <Button
                                text="Copy Public Key Hash"
                                preset="default"
                                onClick={() => {
                                    if (quantumPublicKey) {
                                        copyToClipboard(`0x${quantumPublicKey}`).then(() => {
                                            tools.toastSuccess('Copied');
                                        });
                                    }
                                }}
                            />
                        </Column>
                    </Card>

                    <Card style={{ marginTop: '16px', backgroundColor: 'rgba(243, 116, 19, 0.1)', borderColor: 'rgba(243, 116, 19, 0.3)' }}>
                        <Row itemsCenter gap="sm">
                            <WarningOutlined style={{ fontSize: 16, color: colors.warning }} />
                            <Text
                                text="Remember to backup both your classical and quantum private keys when exporting."
                                preset="sub"
                                size="xs"
                            />
                        </Row>
                    </Card>
                </Content>
            </Layout>
        );
    }

    // Simple keyring without quantum key - needs migration
    return (
        <Layout>
            <Header title="Post-Quantum Migration" onBack={() => window.history.go(-1)} />
            <Content style={{ padding: '16px' }}>
                <Card style={{ backgroundColor: 'rgba(243, 116, 19, 0.1)', borderColor: 'rgba(243, 116, 19, 0.3)' }}>
                    <Row itemsCenter gap="md">
                        <WarningOutlined style={{ fontSize: 24, color: colors.warning }} />
                        <Column gap="zero" style={{ flex: 1 }}>
                            <Text text="Migration Required" preset="bold" color="warning" />
                            <Text
                                text="Your wallet needs a quantum-resistant MLDSA key for OPNet transactions."
                                preset="sub"
                                size="xs"
                            />
                        </Column>
                    </Row>
                </Card>

                {!importMode ? (
                    <>
                        <Text text="Choose how to set up your quantum key:" mt="lg" mb="md" />

                        <Card
                            style={{ marginTop: '8px', cursor: 'pointer' }}
                            onClick={() => setImportMode(true)}>
                            <Column gap="sm">
                                <Text text="Import Existing MLDSA Key" preset="bold" />
                                <Text
                                    text="If you have previously exported a quantum key from another wallet, import it here."
                                    preset="sub"
                                    size="xs"
                                />
                            </Column>
                        </Card>

                        <Card
                            style={{ marginTop: '12px', cursor: 'pointer' }}
                            onClick={handleGenerateNew}>
                            <Column gap="sm">
                                <Text text="Generate New MLDSA Key" preset="bold" />
                                <Text
                                    text="Create a new quantum-resistant key. Make sure to backup this key after generation."
                                    preset="sub"
                                    size="xs"
                                />
                            </Column>
                        </Card>
                    </>
                ) : (
                    <>
                        <Text text="Import Quantum Private Key" mt="lg" mb="md" preset="bold" />
                        <Text
                            text="Enter your 128-character hex MLDSA private key (64 bytes):"
                            preset="sub"
                            size="sm"
                            mb="md"
                        />

                        <Input
                            preset="text"
                            placeholder="Enter quantum private key..."
                            value={quantumKeyInput}
                            onChange={(e) => {
                                setQuantumKeyInput(e.target.value);
                                setError('');
                            }}
                            containerStyle={{ marginBottom: '8px' }}
                        />

                        {error && <Text text={error} color="error" size="sm" />}

                        <Card style={{ marginTop: '16px', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                            <Row itemsCenter gap="sm">
                                <InfoCircleOutlined style={{ fontSize: 16, color: colors.textFaded }} />
                                <Text
                                    text="If your key was linked on-chain, ensure the imported key's SHA256 hash matches."
                                    preset="sub"
                                    size="xs"
                                />
                            </Row>
                        </Card>
                    </>
                )}
            </Content>

            <Footer>
                {!importMode ? (
                    <Button text="Cancel" full preset="default" onClick={() => window.history.go(-1)} />
                ) : (
                    <Row full gap="md">
                        <Button text="Back" full preset="default" onClick={() => setImportMode(false)} />
                        <Button
                            text={importing ? 'Importing...' : 'Import Key'}
                            full
                            preset="primary"
                            onClick={handleImport}
                            disabled={importing || !quantumKeyInput.trim()}
                        />
                    </Row>
                )}
            </Footer>
        </Layout>
    );
}
