import {
    CheckCircleOutlined,
    FileProtectOutlined,
    InfoCircleOutlined,
    LinkOutlined,
    LockOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { KEYRING_TYPE } from '@/shared/constant';
import Web3API from '@/shared/web3/Web3API';
import { Button, Card, Column, Content, Footer, Header, Input, Layout, OPNetLoader, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent/useTools';
import { useAccountPublicKey, useReloadAccounts } from '@/ui/state/accounts/hooks';
import { copyToClipboard, useWallet } from '@/ui/utils';
import { getMLDSAConfig, MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks } from '@btc-vision/bitcoin';
import { Address } from '@btc-vision/transaction';

// Get the expected MLDSA key size for LEVEL2
const MLDSA_CONFIG = getMLDSAConfig(MLDSASecurityLevel.LEVEL2, networks.bitcoin);
const EXPECTED_QUANTUM_KEY_BYTES = MLDSA_CONFIG.privateKeySize;
const EXPECTED_QUANTUM_KEY_HEX_CHARS = EXPECTED_QUANTUM_KEY_BYTES * 2;

const colors = {
    main: '#f37413',
    background: '#212121',
    containerBg: '#252525',
    containerBorder: '#303030',
    success: '#4ade80',
    warning: '#f37413',
    error: '#ef4444',
    purple: '#8B5CF6',
    purpleText: '#c4b5fd',
    textFaded: 'rgba(255, 255, 255, 0.6)',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.8)'
};

// Chaincode is 32 bytes = 64 hex chars
const CHAINCODE_HEX_CHARS = 64;

export default function QuantumMigrationScreen() {
    const wallet = useWallet();
    const tools = useTools();
    const address = useAccountPublicKey();
    const reloadAccounts = useReloadAccounts();

    const [loading, setLoading] = useState(true);
    const [isHdWallet, setIsHdWallet] = useState(false);
    const [hasQuantumKey, setHasQuantumKey] = useState(false);
    const [quantumPublicKeyHash, setQuantumPublicKeyHash] = useState<string>('');

    // On-chain linkage state
    const [onChainLinkedKey, setOnChainLinkedKey] = useState<string | null>(null);
    const [isLinkedOnChain, setIsLinkedOnChain] = useState(false);

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

                // Check on-chain linkage first
                try {
                    const pubKeyInfo = await Web3API.provider.getPublicKeysInfoRaw(address.pubkey);
                    const info = pubKeyInfo[address.pubkey];
                    if (info && !('error' in info) && info.mldsaHashedPublicKey) {
                        setOnChainLinkedKey(info.mldsaHashedPublicKey);
                        setIsLinkedOnChain(true);
                    }
                } catch (e) {
                    console.log('No on-chain MLDSA key found:', e);
                    setOnChainLinkedKey(null);
                    setIsLinkedOnChain(false);
                }

                // For HD wallets, quantum keys are auto-derived
                try {
                    const opnetWallet = await wallet.getWalletAddress();

                    const address2 = Address.fromString(opnetWallet[0], opnetWallet[1]);
                    const addressHex = address2.toHex();
                    if (addressHex) {
                        setHasQuantumKey(true);
                        setQuantumPublicKeyHash(addressHex.replace('0x', ''));
                    }
                } catch (e) {
                    setHasQuantumKey(false);
                }
            } catch (e) {
                console.error('Error checking quantum status:', e);
                tools.toastError('Failed to check quantum key status');
            } finally {
                setLoading(false);
            }
        };

        void checkStatus();
    }, [address.pubkey]);

    const handleImport = async () => {
        setError('');

        // Validate input - quantum private key should be hex characters with correct length
        const cleanKey = quantumKeyInput.replace('0x', '').trim();

        if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
            setError('Invalid hex format. Must contain only hexadecimal characters (0-9, a-f).');
            return;
        }

        // Check length - MLDSA LEVEL2 private key is 2560 bytes = 5120 hex chars
        // User can provide key only (5120 hex) or key + chaincode (5184 hex)
        const keyOnlyLength = EXPECTED_QUANTUM_KEY_HEX_CHARS;
        const keyWithChaincodeLength = EXPECTED_QUANTUM_KEY_HEX_CHARS + CHAINCODE_HEX_CHARS;

        if (cleanKey.length !== keyOnlyLength && cleanKey.length !== keyWithChaincodeLength) {
            setError(
                `Invalid quantum key length. Expected ${keyOnlyLength} hex characters (key only) or ${keyWithChaincodeLength} hex characters (key + chaincode), got ${cleanKey.length}.`
            );
            return;
        }

        setImporting(true);
        try {
            // Import quantum key for the current account
            // The SDK's importQuantumKey handles both key-only and key+chaincode formats
            await wallet.setQuantumKey(cleanKey);

            // Verify the imported key by getting the wallet address (will throw if no quantum key)
            const [mldsaHashPubKey, legacyPubKey] = await wallet.getWalletAddress();
            const importedKeyHash = mldsaHashPubKey;
            console.log('[QuantumMigration] Imported key hash:', importedKeyHash.slice(0, 16) + '...');

            // If there's an on-chain linked key, verify it matches
            if (onChainLinkedKey) {
                const onChainClean = onChainLinkedKey.replace('0x', '');
                if (importedKeyHash.toLowerCase() !== onChainClean.toLowerCase()) {
                    // Key doesn't match! We need to revert and show error
                    setError(
                        `Key mismatch! The imported key's hash (0x${importedKeyHash.slice(0, 8)}...) does not match the on-chain linked key (0x${onChainClean.slice(0, 8)}...). Please import the correct key that was previously linked to this wallet.`
                    );
                    setImporting(false);
                    return;
                }
            }

            tools.toastSuccess('Quantum key imported successfully');
            setHasQuantumKey(true);
            setQuantumPublicKeyHash(importedKeyHash);
            setImportMode(false);
            // Reload accounts to reflect the new key
            await reloadAccounts();
        } catch (e) {
            console.error('[QuantumMigration] Import error:', e);
            setError((e as Error).message);
        } finally {
            setImporting(false);
        }
    };

    const handleGenerateNew = async () => {
        // If there's an on-chain linked key, don't allow generating a new one
        if (onChainLinkedKey) {
            setError(
                'Cannot generate a new key. This wallet already has an MLDSA key linked on-chain. Please import the original key.'
            );
            return;
        }

        setImporting(true);
        try {
            // Generate new quantum key for the account
            await wallet.generateQuantumKey();
            tools.toastSuccess('New quantum key generated successfully');
            setHasQuantumKey(true);
            // Refresh status - getWalletAddress returns [mldsaHashPubKey, legacyPubKey]
            const [mldsaHashPubKey] = await wallet.getWalletAddress();
            setQuantumPublicKeyHash(mldsaHashPubKey);
            // Reload accounts to reflect the new key
            await reloadAccounts();
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
                    <OPNetLoader size={60} text="Checking status" />
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
                    <Card
                        style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.3)' }}
                    >
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

                    {isLinkedOnChain && (
                        <Card
                            style={{
                                marginTop: '12px',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                borderColor: 'rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            <Row itemsCenter gap="sm">
                                <LinkOutlined style={{ fontSize: 16, color: colors.purple }} />
                                <Text text="Linked on-chain" preset="sub" size="xs" color="white" />
                            </Row>
                        </Card>
                    )}

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
                                    fontSize: '12px',
                                    color: 'white'
                                }}
                            >
                                {quantumPublicKeyHash ? `0x${quantumPublicKeyHash}` : 'Loading...'}
                            </div>
                            <Button
                                text="Copy Public Key Hash"
                                preset="default"
                                onClick={() => {
                                    if (quantumPublicKeyHash) {
                                        copyToClipboard(`0x${quantumPublicKeyHash}`).then(() => {
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
        const keyMatchesOnChain = onChainLinkedKey
            ? quantumPublicKeyHash.toLowerCase() === onChainLinkedKey.replace('0x', '').toLowerCase()
            : true;

        return (
            <Layout>
                <Header title="Post-Quantum Keys" onBack={() => window.history.go(-1)} />
                <Content style={{ padding: '16px' }}>
                    <Card
                        style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.3)' }}
                    >
                        <Row itemsCenter gap="md">
                            <CheckCircleOutlined style={{ fontSize: 24, color: colors.success }} />
                            <Column gap="zero" style={{ flex: 1 }}>
                                <Text text="Quantum Key Active" preset="bold" color="green" />
                                <Text text="Your wallet has a quantum-resistant MLDSA key." preset="sub" size="xs" />
                            </Column>
                        </Row>
                    </Card>

                    {isLinkedOnChain && (
                        <Card
                            style={{
                                marginTop: '12px',
                                backgroundColor: keyMatchesOnChain
                                    ? 'rgba(139, 92, 246, 0.1)'
                                    : 'rgba(239, 68, 68, 0.1)',
                                borderColor: keyMatchesOnChain ? 'rgba(139, 92, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            <Row itemsCenter gap="sm">
                                <LinkOutlined
                                    style={{ fontSize: 16, color: keyMatchesOnChain ? colors.purple : colors.error }}
                                />
                                <Text
                                    text={keyMatchesOnChain ? 'Linked on-chain' : 'WARNING: Key mismatch with on-chain'}
                                    preset="sub"
                                    size="xs"
                                    color={keyMatchesOnChain ? 'white' : 'error'}
                                />
                            </Row>
                        </Card>
                    )}

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
                                    fontSize: '12px',
                                    color: 'white'
                                }}
                            >
                                {quantumPublicKeyHash ? `0x${quantumPublicKeyHash}` : 'Loading...'}
                            </div>
                            <Button
                                text="Copy Public Key Hash"
                                preset="default"
                                onClick={() => {
                                    if (quantumPublicKeyHash) {
                                        copyToClipboard(`0x${quantumPublicKeyHash}`).then(() => {
                                            tools.toastSuccess('Copied');
                                        });
                                    }
                                }}
                            />
                        </Column>
                    </Card>

                    <Card
                        style={{
                            marginTop: '16px',
                            backgroundColor: 'rgba(243, 116, 19, 0.1)',
                            borderColor: 'rgba(243, 116, 19, 0.3)'
                        }}
                    >
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
            <Content style={{ padding: '12px 16px 16px' }}>
                {/* Show on-chain linked key info if exists - hide when in import mode to avoid UI collision */}
                {!importMode && isLinkedOnChain && onChainLinkedKey && (
                    <Card
                        style={{
                            backgroundColor: colors.containerBg,
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            marginBottom: '12px'
                        }}
                    >
                        <Column fullX>
                            <Row itemsCenter gap="sm">
                                <LinkOutlined style={{ fontSize: 18, color: colors.purple, flexShrink: 0 }} />
                                <Column gap="zero" style={{ flex: 1 }}>
                                    <Text text="On-Chain Linked Key Detected" preset="bold" size="sm" />
                                    <Text
                                        text="This wallet has an MLDSA key linked on the blockchain:"
                                        preset="sub"
                                        size="xs"
                                    />
                                </Column>
                            </Row>
                            <div
                                style={{
                                    background: colors.background,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '8px',
                                    padding: '8px 10px',
                                    marginTop: '2px'
                                }}
                            >
                                <code
                                    style={{
                                        fontFamily: 'monospace',
                                        fontSize: 10,
                                        color: colors.purpleText,
                                        wordBreak: 'break-all',
                                        lineHeight: '16px'
                                    }}
                                >
                                    {onChainLinkedKey}
                                </code>
                            </div>
                            <Text
                                text="You must import the key matching this hash."
                                preset="sub"
                                size="xxs"
                                style={{ marginTop: '6px', opacity: 0.7, fontSize: '10px' }}
                            />
                        </Column>
                    </Card>
                )}

                {/* Migration Required */}
                <Card
                    style={{
                        background: 'linear-gradient(135deg, rgba(243,116,19,0.12) 0%, rgba(239,68,68,0.08) 100%)',
                        border: '1px solid rgba(243, 116, 19, 0.25)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        marginBottom: '12px'
                    }}
                >
                    <Row itemsCenter gap="sm">
                        <WarningOutlined style={{ fontSize: 18, color: colors.warning, flexShrink: 0 }} />
                        <Column gap="zero" style={{ flex: 1 }}>
                            <Text text="Migration Required" preset="bold" size="sm" color="warning" />
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
                        {/* Import Existing Key */}
                        <div
                            style={{
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.25)',
                                borderRadius: '12px',
                                padding: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onClick={() => setImportMode(true)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.18)';
                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.25)';
                            }}
                        >
                            <Row itemsCenter gap="md">
                                <div
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'rgba(139, 92, 246, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    <FileProtectOutlined style={{ fontSize: 18, color: colors.text }} />
                                </div>
                                <Column gap="zero" style={{ flex: 1 }}>
                                    <Text text="Import Existing MLDSA Key" preset="bold" size="sm" />
                                    <Text
                                        text={
                                            isLinkedOnChain
                                                ? 'Import the quantum key matching the on-chain hash'
                                                : 'Use your existing MLDSA quantum key'
                                        }
                                        preset="sub"
                                        size="xs"
                                    />
                                </Column>
                            </Row>

                            {/* Info note - only when linked on-chain */}
                            {isLinkedOnChain && (
                                <Row
                                    gap="sm"
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '8px',
                                        padding: '8px 10px',
                                        marginTop: 12,
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <InfoCircleOutlined
                                        style={{ fontSize: 12, color: colors.textFaded, flexShrink: 0, marginTop: 1 }}
                                    />
                                    <Text
                                        text="Generating a new key is disabled because this wallet already has a key linked on-chain."
                                        preset="sub"
                                        size="xs"
                                        style={{ opacity: 0.8 }}
                                    />
                                </Row>
                            )}
                        </div>

                        {/* Generate New Key - only when NOT linked on-chain */}
                        {!isLinkedOnChain && (
                            <div
                                style={{
                                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                                    border: '1px solid rgba(74, 222, 128, 0.25)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    marginTop: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onClick={handleGenerateNew}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(74, 222, 128, 0.18)';
                                    e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.25)';
                                }}
                            >
                                <Row itemsCenter gap="md">
                                    <div
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: 'rgba(74, 222, 128, 0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <LockOutlined style={{ fontSize: 18, color: colors.text }} />
                                    </div>
                                    <Column gap="zero" style={{ flex: 1 }}>
                                        <Text text="Generate New MLDSA Key" preset="bold" size="sm" />
                                        <Text
                                            text="Create a new quantum-resistant key for this wallet"
                                            preset="sub"
                                            size="xs"
                                        />
                                    </Column>
                                </Row>
                            </div>
                        )}
                    </>
                ) : (
                    /* Import Mode */
                    <Card
                        style={{
                            backgroundColor: colors.containerBg,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '12px',
                            padding: '12px'
                        }}
                    >
                        <Column fullX>
                            <Text text="Import Quantum Private Key" preset="bold" />
                            <Text
                                text={
                                    isLinkedOnChain
                                        ? 'Enter the quantum private key that matches the on-chain linked hash:'
                                        : 'Enter your MLDSA private key (hex format):'
                                }
                                preset="sub"
                                size="sm"
                                style={{ opacity: 0.8, marginTop: 4 }}
                            />

                            <Input
                                preset="text"
                                placeholder="Enter quantum private key..."
                                value={quantumKeyInput}
                                onChange={(e) => {
                                    setQuantumKeyInput(e.target.value);
                                    setError('');
                                }}
                                containerStyle={{ marginTop: 8 }}
                            />

                            <Text
                                text={`Expected: ${EXPECTED_QUANTUM_KEY_HEX_CHARS} hex chars (key only) or ${EXPECTED_QUANTUM_KEY_HEX_CHARS + CHAINCODE_HEX_CHARS} hex chars (with chaincode)`}
                                preset="sub"
                                size="xs"
                                style={{ opacity: 0.6, marginTop: 4 }}
                            />

                            {error && (
                                <Card
                                    style={{
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        marginTop: 8
                                    }}
                                >
                                    <Text text={error} color="error" size="sm" />
                                </Card>
                            )}
                        </Column>
                    </Card>
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
