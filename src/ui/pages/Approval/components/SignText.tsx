import { useMemo, useState } from 'react';

import { KEYRING_TYPE } from '@/shared/constant';
import { ParsedSignMsgUr } from '@/shared/types';
import { SignTextApprovalParams } from '@/shared/types/Approval';
import { Button, Content, Footer, Layout, Row } from '@/ui/components';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useApproval } from '@/ui/utils';
import { ExperimentOutlined, FileTextOutlined, LockOutlined, SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons';
import KeystoneSignScreen from '../../Wallet/KeystoneSignScreen';

export interface Props {
    params: SignTextApprovalParams;
}

type SigningStep = 'review' | 'confirm';

// Quantum purple palette
const quantum = {
    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    primaryDark: '#7C3AED',
    glow10: 'rgba(139, 92, 246, 0.10)',
    glow15: 'rgba(139, 92, 246, 0.15)',
    glow20: 'rgba(139, 92, 246, 0.20)',
    glow30: 'rgba(139, 92, 246, 0.30)',
    glow40: 'rgba(139, 92, 246, 0.40)',
    glow06: 'rgba(139, 92, 246, 0.06)'
};

// Standard theme (non-quantum)
const standard = {
    main: '#f37413',
    accent10: 'rgba(243, 116, 19, 0.10)',
    accent20: 'rgba(243, 116, 19, 0.20)',
    accent30: 'rgba(243, 116, 19, 0.30)'
};

const themeColors = {
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    warning: '#fbbf24'
};

/**
 * Try to parse a JSON string for display.
 */
function tryParseJSON(str: string): Record<string, unknown> | unknown[] | null {
    try {
        const parsed: unknown = JSON.parse(str);
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed as Record<string, unknown> | unknown[];
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Render JSON as styled key-value pairs.
 */
function JSONDisplay({ obj, accentColor }: { obj: Record<string, unknown> | unknown[]; accentColor: string }) {
    const entries = Array.isArray(obj) ? obj.map((v, i) => [String(i), v] as const) : Object.entries(obj);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entries.map(([key, value]) => {
                const valueStr =
                    typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value);
                return (
                    <div key={key} style={{ display: 'flex', gap: 8 }}>
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: accentColor,
                                minWidth: 80,
                                flexShrink: 0
                            }}>
                            {key}:
                        </span>
                        <span
                            style={{
                                fontSize: 12,
                                color: themeColors.text,
                                wordBreak: 'break-word',
                                fontFamily: typeof value === 'object' ? 'monospace' : 'inherit'
                            }}>
                            {valueStr}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Section label matching InteractionHeader style.
 */
function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div
            style={{
                fontSize: 11,
                fontWeight: 600,
                color: themeColors.textFaded,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}>
            {icon}
            {text}
        </div>
    );
}

export default function SignText({ params: { data, session } }: Props) {
    const { resolveApproval, rejectApproval } = useApproval();
    const account = useCurrentAccount();
    const [isKeystoneSigning, setIsKeystoneSigning] = useState(false);
    const [step, setStep] = useState<SigningStep>('review');

    const isQuantum = data.type === 'mldsa';
    const accent = isQuantum ? quantum.primary : standard.main;

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

    // Parse originalMessage if provided
    const parsedMessage = useMemo(() => {
        if (!data.originalMessage) return null;
        return tryParseJSON(data.originalMessage);
    }, [data.originalMessage]);

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
            <Content style={{ padding: 12, overflowY: 'auto' }}>
                {/* Site Header */}
                <div
                    style={{
                        background: isQuantum
                            ? `linear-gradient(135deg, ${quantum.glow15} 0%, ${quantum.glow06} 100%)`
                            : `linear-gradient(135deg, ${standard.main}10 0%, ${standard.main}05 100%)`,
                        border: `1px solid ${isQuantum ? quantum.glow30 : `${standard.main}20`}`,
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {session.icon ? (
                            <img
                                src={session.icon}
                                alt={session.name || session.origin}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    objectFit: 'cover'
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const fallback = (e.target as HTMLImageElement)
                                        .nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: accent,
                                display: session.icon ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                            <FileTextOutlined style={{ fontSize: 20, color: themeColors.background }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: themeColors.text,
                                    marginBottom: 2
                                }}>
                                {session.name || 'Unknown Site'}
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: themeColors.textFaded,
                                    fontFamily: 'monospace',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                {session.origin}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Title + Badge */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    {isQuantum ? (
                        <>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    marginBottom: 6
                                }}>
                                <ExperimentOutlined style={{ fontSize: 26, color: quantum.primary }} />
                                <span style={{ fontSize: 20, fontWeight: 700, color: quantum.primary }}>
                                    Quantum Proof Signature
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 12px',
                                    borderRadius: 16,
                                    backgroundColor: quantum.glow15,
                                    border: `1px solid ${quantum.glow40}`
                                }}>
                                <SafetyCertificateOutlined style={{ fontSize: 11, color: quantum.primaryLight }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: quantum.primaryLight }}>
                                    ML-DSA Post-Quantum
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                                Sign Message
                            </div>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 12px',
                                    borderRadius: 16,
                                    backgroundColor: `${standard.main}20`,
                                    border: `1px solid ${standard.main}40`
                                }}>
                                <LockOutlined style={{ fontSize: 11, color: standard.main }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: standard.main }}>
                                    {data.type || 'ecdsa'}
                                </span>
                            </div>
                        </>
                    )}
                    <div
                        style={{
                            fontSize: 12,
                            color: themeColors.textFaded,
                            marginTop: 8
                        }}>
                        {step === 'review' ? 'Review the message below' : 'Confirm your signature'}
                    </div>
                </div>

                {step === 'review' && (
                    <>
                        {/* Original Message (if provided) */}
                        {parsedMessage ? (
                            <div
                                style={{
                                    background: themeColors.containerBgFaded,
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 12
                                }}>
                                <SectionLabel
                                    icon={<FileTextOutlined style={{ fontSize: 10 }} />}
                                    text="Original Message"
                                />
                                <div
                                    style={{
                                        padding: 10,
                                        background: isQuantum ? quantum.glow06 : `${standard.main}08`,
                                        border: `1px solid ${isQuantum ? quantum.glow20 : `${standard.main}15`}`,
                                        borderRadius: 8
                                    }}>
                                    <JSONDisplay obj={parsedMessage} accentColor={accent} />
                                </div>
                            </div>
                        ) : data.originalMessage ? (
                            <div
                                style={{
                                    background: themeColors.containerBgFaded,
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 12
                                }}>
                                <SectionLabel
                                    icon={<FileTextOutlined style={{ fontSize: 10 }} />}
                                    text="Original Message"
                                />
                                <div
                                    style={{
                                        userSelect: 'text',
                                        maxHeight: 140,
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        padding: 10,
                                        background: themeColors.inputBg,
                                        borderRadius: 8,
                                        border: `1px solid ${themeColors.containerBorder}`,
                                        fontSize: 13,
                                        color: themeColors.text,
                                        lineHeight: '1.6'
                                    }}>
                                    {data.originalMessage}
                                </div>
                            </div>
                        ) : null}

                        {/* Message Content */}
                        <div
                            style={{
                                background: themeColors.containerBgFaded,
                                borderRadius: 12,
                                padding: 12,
                                marginBottom: 12
                            }}>
                            <SectionLabel
                                icon={<FileTextOutlined style={{ fontSize: 10 }} />}
                                text={data.originalMessage ? 'Signing Hash' : 'Message Content'}
                            />
                            <div
                                style={{
                                    userSelect: 'text',
                                    maxHeight: data.originalMessage ? 80 : 280,
                                    overflow: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    padding: 10,
                                    background: themeColors.inputBg,
                                    borderRadius: 8,
                                    border: `1px solid ${themeColors.containerBorder}`,
                                    fontFamily: 'monospace',
                                    fontSize: 13,
                                    lineHeight: '1.6',
                                    color: 'rgba(255, 255, 255, 0.9)'
                                }}>
                                {data.message}
                            </div>
                        </div>

                        {/* Warning */}
                        <div
                            style={{
                                padding: '10px 12px',
                                background: `${themeColors.warning}10`,
                                border: `1px solid ${themeColors.warning}30`,
                                borderRadius: 12,
                                marginBottom: 12
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <WarningOutlined
                                    style={{ fontSize: 14, color: themeColors.warning, flexShrink: 0 }}
                                />
                                <span style={{ fontSize: 12, color: themeColors.warning, lineHeight: '1.5' }}>
                                    Carefully review the message before proceeding.
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {step === 'confirm' && (
                    <>
                        {/* Confirmation Card */}
                        <div
                            style={{
                                background: isQuantum
                                    ? `linear-gradient(135deg, ${quantum.glow15} 0%, ${quantum.glow06} 100%)`
                                    : `linear-gradient(135deg, ${standard.accent10} 0%, ${standard.main}05 100%)`,
                                border: `1px solid ${isQuantum ? quantum.glow30 : standard.accent30}`,
                                borderRadius: 12,
                                padding: 20,
                                marginBottom: 12,
                                textAlign: 'center'
                            }}>
                            {isQuantum ? (
                                <ExperimentOutlined
                                    style={{ fontSize: 36, color: quantum.primary, marginBottom: 12, display: 'block' }}
                                />
                            ) : (
                                <LockOutlined
                                    style={{ fontSize: 32, color: standard.main, marginBottom: 12, display: 'block' }}
                                />
                            )}
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: themeColors.text,
                                    marginBottom: 8
                                }}>
                                {isQuantum
                                    ? 'You are about to create a quantum-safe signature.'
                                    : 'You are about to sign this message with your wallet.'}
                            </div>
                            <div style={{ fontSize: 12, color: isQuantum ? quantum.primaryLight : standard.main }}>
                                Only proceed if you trust this site and understand what you are signing.
                            </div>
                        </div>

                        {/* Signature Details */}
                        <div
                            style={{
                                background: themeColors.containerBgFaded,
                                borderRadius: 12,
                                padding: 12,
                                marginBottom: 12
                            }}>
                            <SectionLabel
                                icon={
                                    isQuantum ? (
                                        <ExperimentOutlined style={{ fontSize: 10 }} />
                                    ) : (
                                        <LockOutlined style={{ fontSize: 10 }} />
                                    )
                                }
                                text="Signature Details"
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 10,
                                    background: themeColors.inputBg,
                                    borderRadius: 8,
                                    border: `1px solid ${themeColors.containerBorder}`
                                }}>
                                <span style={{ fontSize: 12, color: themeColors.textFaded }}>Signature Type</span>
                                {isQuantum ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <ExperimentOutlined style={{ fontSize: 12, color: quantum.primary }} />
                                        <span style={{ fontSize: 12, fontWeight: 600, color: quantum.primary }}>
                                            ML-DSA Quantum Proof
                                        </span>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: 12, fontWeight: 600, color: standard.main }}>
                                        {data.type || 'ecdsa'}
                                    </span>
                                )}
                            </div>
                            {isQuantum && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: 10,
                                        background: themeColors.inputBg,
                                        borderRadius: 8,
                                        border: `1px solid ${themeColors.containerBorder}`,
                                        marginTop: 6
                                    }}>
                                    <span style={{ fontSize: 12, color: themeColors.textFaded }}>Security</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: quantum.primaryLight }}>
                                        Post-Quantum Resistant
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Spacer for fixed footer */}
                <div style={{ height: 70 }} />
            </Content>

            <Footer style={{ padding: 12 }}>
                <Row full style={{ gap: 8 }}>
                    {step === 'review' ? (
                        <>
                            <Button
                                text="Reject"
                                full
                                preset="default"
                                onClick={handleCancel}
                                style={{
                                    background: '#434343',
                                    border: `1px solid ${themeColors.containerBorder}`,
                                    color: themeColors.text
                                }}
                            />
                            <Button
                                text="Review Details"
                                full
                                preset="primary"
                                onClick={handleReview}
                                style={{
                                    background: accent,
                                    color: themeColors.background,
                                    fontWeight: 600
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <Button
                                text="Back"
                                full
                                preset="default"
                                onClick={handleBack}
                                style={{
                                    background: '#434343',
                                    border: `1px solid ${themeColors.containerBorder}`,
                                    color: themeColors.text
                                }}
                            />
                            <Button
                                text={isQuantum ? 'Sign Quantum Proof' : 'Confirm Signature'}
                                full
                                preset="primary"
                                onClick={handleConfirm}
                                style={{
                                    background: accent,
                                    color: themeColors.background,
                                    fontWeight: 600
                                }}
                            />
                        </>
                    )}
                </Row>
            </Footer>
        </Layout>
    );
}
