import {
    CopyOutlined,
    KeyOutlined,
    SafetyOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { KEYRING_TYPE } from '@/shared/constant';
import { Account } from '@/shared/types';
import { isWalletError } from '@/shared/utils/errors';
import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent/useTools';
import { WifExportWarningModal } from '@/ui/components/WifExportWarningModal';
import { copyToClipboard, useLocationState, useWallet } from '@/ui/utils';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    buttonBg: '#434343',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    purple: '#8B5CF6'
};

interface LocationState {
    account: Account;
}

function CopyableKey({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
    return (
        <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px', fontWeight: 500 }}>
                {label}
            </div>
            <div
                onClick={() => onCopy(value)}
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 12px',
                    background: colors.inputBg,
                    borderRadius: '8px',
                    border: `1px solid ${colors.containerBorder}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.main; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.containerBorder; }}>
                <CopyOutlined style={{ fontSize: 13, color: colors.textFaded, marginTop: '2px', flexShrink: 0 }} />
                <span
                    style={{
                        fontSize: '11px',
                        color: colors.textFaded,
                        fontFamily: 'monospace',
                        overflowWrap: 'anywhere',
                        flex: 1,
                        lineHeight: '1.5',
                        userSelect: 'text'
                    }}>
                    {value}
                </span>
            </div>
        </div>
    );
}

export default function ExportPrivateKeyScreen() {
    const { account } = useLocationState<LocationState>();

    const [password, setPassword] = useState('');
    const [privateKey, setPrivateKey] = useState({ hex: '', wif: '' });
    const [quantumPrivateKey, setQuantumPrivateKey] = useState('');
    const [isSimpleKeyring, setIsSimpleKeyring] = useState(false);
    const [error, setError] = useState('');
    const [showWifWarning, setShowWifWarning] = useState(false);
    const [pendingExport, setPendingExport] = useState(false);
    const wallet = useWallet();
    const tools = useTools();

    useEffect(() => {
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


    const handleExport = async () => {
        setPendingExport(false);
        try {
            const _res = await wallet.getPrivateKey(password, account);
            if (!_res) {
                setError('Password is incorrect');
                return;
            }
            setPrivateKey(_res);
            setPendingExport(true);
            setShowWifWarning(!isSimpleKeyring);

            try {
                const opnetWallet = await wallet.getOPNetWallet(account);
                setQuantumPrivateKey(opnetWallet[1]);
            } catch (e) {
                console.error('Could not retrieve quantum private key:', e);
            }
        } catch (e) {
            if (isWalletError(e)) {
                setError(e.message);
            } else {
                setError('An unexpected error occurred.');
            }
        }
    };

    const copy = (str: string) => {
        void copyToClipboard(str);
        tools.toastSuccess('Copied');
    };

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Export Private Key" />
            <Content>
                <div style={{ padding: '4px 0' }}>
                    {!pendingExport || privateKey.wif === '' ? (
                        /* ─── Password Entry Phase ─── */
                        <div>
                            {/* Warning Card */}
                            <div
                                style={{
                                    background: `${colors.error}10`,
                                    border: `1px solid ${colors.error}30`,
                                    borderRadius: '12px',
                                    padding: '14px',
                                    marginBottom: '16px'
                                }}>
                                <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <WarningOutlined style={{ fontSize: 16, color: colors.error }} />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: colors.error }}>
                                        Security Warning
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: colors.textFaded, lineHeight: '1.6' }}>
                                    Your private key gives full access to your wallet. Never share it with anyone. If
                                    you lose it, your assets cannot be recovered.
                                </div>
                            </div>

                            {isSimpleKeyring && (
                                <div
                                    style={{
                                        background: `${colors.main}10`,
                                        border: `1px solid ${colors.main}30`,
                                        borderRadius: '12px',
                                        padding: '14px',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px'
                                    }}>
                                    <WarningOutlined
                                        style={{ fontSize: 16, color: colors.main, marginTop: '1px', flexShrink: 0 }}
                                    />
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: colors.main,
                                                marginBottom: '4px'
                                            }}>
                                            Export BOTH Keys
                                        </div>
                                        <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                                            For OPNet compatibility, you must backup both your classical and quantum
                                            private keys.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Password Input */}
                            <div style={{ marginBottom: '16px' }}>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        marginBottom: '8px',
                                        fontWeight: 500
                                    }}>
                                    Enter your password to reveal keys
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    onKeyUp={(e) => {
                                        if (e.key === 'Enter') void handleExport();
                                    }}
                                    autoFocus
                                    placeholder="Password"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: colors.inputBg,
                                        border: `1px solid ${error ? colors.error : colors.containerBorder}`,
                                        borderRadius: '10px',
                                        color: colors.text,
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = colors.main;
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = error
                                            ? colors.error
                                            : colors.containerBorder;
                                    }}
                                />
                                {error && (
                                    <div style={{ fontSize: '12px', color: colors.error, marginTop: '6px' }}>
                                        {error}
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={!password}
                                onClick={() => void handleExport()}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: !password ? colors.buttonBg : colors.main,
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: !password ? colors.textFaded : colors.background,
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: !password ? 'not-allowed' : 'pointer',
                                    opacity: !password ? 0.5 : 1,
                                    transition: 'all 0.2s'
                                }}>
                                Show Private Key
                            </button>
                        </div>
                    ) : (
                        /* ─── Key Display Phase ─── */
                        <div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.textFaded,
                                    textAlign: 'center',
                                    marginBottom: '16px',
                                    lineHeight: '1.5'
                                }}>
                                Save these keys somewhere safe and secret. You will need them to recover this account.
                            </div>

                            {/* Classical Private Key */}
                            <div
                                style={{
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px',
                                    padding: '14px',
                                    border: `1px solid ${colors.containerBorder}`,
                                    marginBottom: '12px'
                                }}>
                                <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <KeyOutlined style={{ fontSize: 15, color: colors.main }} />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                                        Classical Private Key
                                    </span>
                                </div>
                                <CopyableKey label="WIF Format" value={privateKey.wif} onCopy={copy} />
                                <CopyableKey label="HEX Format" value={privateKey.hex} onCopy={copy} />
                            </div>

                            {/* Quantum Private Key */}
                            {quantumPrivateKey && (
                                <>
                                    {/* Warning */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            padding: '10px 12px',
                                            background: isSimpleKeyring ? `${colors.error}10` : `${colors.main}10`,
                                            border: `1px solid ${isSimpleKeyring ? colors.error + '30' : colors.main + '30'}`,
                                            borderRadius: '10px',
                                            marginBottom: '12px'
                                        }}>
                                        <WarningOutlined
                                            style={{
                                                fontSize: 14,
                                                color: isSimpleKeyring ? colors.error : colors.main,
                                                marginTop: '1px',
                                                flexShrink: 0
                                            }}
                                        />
                                        <span style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                                            {isSimpleKeyring
                                                ? 'You MUST import BOTH the classical and quantum private keys. Without both, OPNet features will not work.'
                                                : 'If importing via private key instead of seed phrase, you need both keys for full OPNet functionality.'}
                                        </span>
                                    </div>

                                    {/* Quantum Key Card */}
                                    <div
                                        style={{
                                            background: colors.containerBgFaded,
                                            borderRadius: '12px',
                                            padding: '14px',
                                            border: `1px solid ${colors.purple}30`
                                        }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '6px'
                                            }}>
                                            <SafetyOutlined style={{ fontSize: 15, color: colors.purple }} />
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                                                Post-Quantum Private Key (MLDSA)
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: colors.textFaded,
                                                marginBottom: '12px',
                                                lineHeight: '1.4'
                                            }}>
                                            {isSimpleKeyring
                                                ? 'Required for all OPNet transactions. Store securely alongside your classical key.'
                                                : 'Can also be derived from your seed phrase.'}
                                        </div>
                                        <CopyableKey
                                            label="MLDSA Private Key"
                                            value={quantumPrivateKey}
                                            onCopy={copy}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </Content>

            <WifExportWarningModal
                open={showWifWarning && pendingExport}
                onConfirm={() => {
                    setShowWifWarning(false);
                }}
                onCancel={() => {
                    setShowWifWarning(false);
                    setPendingExport(false);
                }}
            />
        </Layout>
    );
}
