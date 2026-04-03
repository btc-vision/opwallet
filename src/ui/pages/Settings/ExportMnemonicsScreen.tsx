import {
    CopyOutlined,
    ExclamationCircleOutlined,
    EyeOutlined,
    ForkOutlined,
    LockOutlined,
    SafetyOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { useState } from 'react';

import { ADDRESS_TYPES } from '@/shared/constant';
import { WalletKeyring } from '@/shared/types';
import { isWalletError } from '@/shared/utils/errors';
import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
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
    warning: '#fbbf24'
};

export default function ExportMnemonicsScreen() {
    const { keyring } = useLocationState<{ keyring: WalletKeyring }>();

    const [password, setPassword] = useState('');
    const [mnemonic, setMnemonic] = useState('');
    const [error, setError] = useState('');
    const wallet = useWallet();
    const tools = useTools();
    const [passphrase, setPassphrase] = useState('');
    const [copyHover, setCopyHover] = useState(false);

    const btnClick = async () => {
        try {
            const data = await wallet.getMnemonics(password, keyring);
            if (!data) {
                setError('Password is incorrect');
                return;
            }

            const { mnemonic, passphrase } = data;
            if (!mnemonic) {
                setError('Mnemonic not found');
                return;
            }

            setMnemonic(mnemonic);

            if (passphrase) {
                setPassphrase(passphrase);
            }
        } catch (e) {
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

    // Error is cleared inline in the onChange handler below

    function copy(str: string) {
        copyToClipboard(str);
        tools.toastSuccess('Copied');
    }

    const words = mnemonic.split(' ');
    const pathName = ADDRESS_TYPES.find((v) => v.hdPath === keyring.hdPath)?.name ?? 'custom';

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Secret Recovery Phrase"
            />

            <Content>
                <div style={{ padding: '4px 0' }}>
                    {mnemonic === '' ? (
                        /* ─── Password Entry Phase ─── */
                        <div>
                            {/* Shield Icon */}
                            <div
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '14px',
                                    background: `linear-gradient(135deg, ${colors.error}20 0%, ${colors.error}10 100%)`,
                                    border: `1px solid ${colors.error}30`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px'
                                }}>
                                <SafetyOutlined style={{ fontSize: 26, color: colors.error }} />
                            </div>

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
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '10px'
                                    }}>
                                    <WarningOutlined style={{ fontSize: 16, color: colors.error }} />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: colors.error }}>
                                        Security Warning
                                    </span>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                    {[
                                        'If you lose your Secret Recovery Phrase, your assets will be gone forever.',
                                        'If you share the phrase with others, your assets can be stolen.',
                                        'The phrase is only stored in your browser, you are responsible for keeping it safe.'
                                    ].map((msg, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '8px'
                                            }}>
                                            <ExclamationCircleOutlined
                                                style={{
                                                    fontSize: 12,
                                                    color: colors.error,
                                                    marginTop: '2px',
                                                    flexShrink: 0,
                                                    opacity: 0.8
                                                }}
                                            />
                                            <span
                                                style={{
                                                    fontSize: '12px',
                                                    color: colors.textFaded,
                                                    lineHeight: '1.5'
                                                }}>
                                                {msg}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Confirmation notice */}
                            <div
                                style={{
                                    background: `${colors.warning}10`,
                                    border: `1px solid ${colors.warning}25`,
                                    borderRadius: '10px',
                                    padding: '10px 12px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                <LockOutlined style={{ fontSize: 14, color: colors.warning, flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', color: colors.textFaded, lineHeight: '1.4' }}>
                                    Please read the warnings above before entering your password.
                                </span>
                            </div>

                            {/* Password Input */}
                            <div style={{ marginBottom: '16px' }}>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        marginBottom: '8px',
                                        fontWeight: 500
                                    }}>
                                    Enter your password to reveal phrase
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                    onKeyUp={(e) => handleOnKeyUp(e)}
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

                            {/* Submit Button */}
                            <button
                                disabled={!password}
                                onClick={() => void btnClick()}
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
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}>
                                <EyeOutlined style={{ fontSize: 16 }} />
                                Show Secret Recovery Phrase
                            </button>
                        </div>
                    ) : (
                        /* ─── Mnemonic Display Phase ─── */
                        <div>
                            {/* Info banner */}
                            <div
                                style={{
                                    background: `${colors.warning}10`,
                                    border: `1px solid ${colors.warning}25`,
                                    borderRadius: '10px',
                                    padding: '10px 12px',
                                    marginBottom: '14px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px'
                                }}>
                                <WarningOutlined
                                    style={{
                                        fontSize: 14,
                                        color: colors.warning,
                                        marginTop: '1px',
                                        flexShrink: 0
                                    }}
                                />
                                <span style={{ fontSize: '12px', color: colors.textFaded, lineHeight: '1.5' }}>
                                    This phrase is the <strong style={{ color: colors.warning }}>ONLY</strong> way to
                                    recover your wallet. Do NOT share it with anyone!
                                </span>
                            </div>

                            {/* Copy button */}
                            <div
                                onClick={() => copy(mnemonic)}
                                onMouseEnter={() => setCopyHover(true)}
                                onMouseLeave={() => setCopyHover(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '10px',
                                    background: copyHover ? `${colors.main}15` : 'transparent',
                                    border: `1px solid ${copyHover ? colors.main + '40' : colors.containerBorder}`,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginBottom: '14px'
                                }}>
                                <CopyOutlined
                                    style={{ fontSize: 14, color: copyHover ? colors.main : colors.textFaded }}
                                />
                                <span
                                    style={{
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: copyHover ? colors.main : colors.textFaded,
                                        transition: 'color 0.2s'
                                    }}>
                                    Copy to clipboard
                                </span>
                            </div>

                            {/* Word Grid */}
                            <div
                                style={{
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px',
                                    padding: '14px',
                                    border: `1px solid ${colors.containerBorder}`,
                                    marginBottom: '14px'
                                }}>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '8px'
                                    }}>
                                    {words.map((word, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 10px',
                                                background: colors.inputBg,
                                                borderRadius: '8px',
                                                border: `1px solid ${colors.containerBorder}`
                                            }}>
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: colors.main,
                                                    minWidth: '20px',
                                                    opacity: 0.8
                                                }}>
                                                {index + 1}.
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: colors.text,
                                                    fontFamily: 'monospace',
                                                    userSelect: 'text'
                                                }}>
                                                {word}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced Options */}
                            <div
                                style={{
                                    background: colors.containerBgFaded,
                                    borderRadius: '12px',
                                    padding: '14px',
                                    border: `1px solid ${colors.containerBorder}`
                                }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '10px'
                                    }}>
                                    <ForkOutlined style={{ fontSize: 14, color: colors.main }} />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                                        Advanced Options
                                    </span>
                                </div>

                                {/* Derivation Path */}
                                <div
                                    onClick={() => copy(keyring.hdPath)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        background: colors.inputBg,
                                        borderRadius: '8px',
                                        border: `1px solid ${colors.containerBorder}`,
                                        cursor: 'pointer',
                                        transition: 'border-color 0.15s',
                                        marginBottom: passphrase ? '8px' : '0'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = colors.main;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = colors.containerBorder;
                                    }}>
                                    <CopyOutlined style={{ fontSize: 12, color: colors.textFaded, flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                fontSize: '10px',
                                                color: colors.textFaded,
                                                marginBottom: '2px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                fontWeight: 600
                                            }}>
                                            Derivation Path
                                        </div>
                                        <span
                                            style={{
                                                fontSize: '12px',
                                                color: colors.text,
                                                fontFamily: 'monospace'
                                            }}>
                                            {keyring.hdPath}/0 ({pathName})
                                        </span>
                                    </div>
                                </div>

                                {/* Passphrase */}
                                {passphrase && (
                                    <div
                                        onClick={() => copy(passphrase)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 10px',
                                            background: colors.inputBg,
                                            borderRadius: '8px',
                                            border: `1px solid ${colors.containerBorder}`,
                                            cursor: 'pointer',
                                            transition: 'border-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = colors.main;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = colors.containerBorder;
                                        }}>
                                        <CopyOutlined
                                            style={{ fontSize: 12, color: colors.textFaded, flexShrink: 0 }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: '10px',
                                                    color: colors.textFaded,
                                                    marginBottom: '2px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    fontWeight: 600
                                                }}>
                                                Passphrase
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: '12px',
                                                    color: colors.text,
                                                    fontFamily: 'monospace'
                                                }}>
                                                {passphrase}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
