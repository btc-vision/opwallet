import { useMemo } from 'react';

import { SignDataApprovalParams } from '@/shared/types/Approval';
import { Button, Content, Footer, Layout, Row } from '@/ui/components';
import { useApproval } from '@/ui/utils';
import { FileTextOutlined, KeyOutlined, WarningOutlined } from '@ant-design/icons';

export interface Props {
    params: SignDataApprovalParams;
}

const themeColors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    blue: '#1872F6',
    green: '#41B530',
    warning: '#fbbf24'
};

/**
 * Try to parse a JSON string into a formatted display.
 * Returns null if parsing fails.
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
 * Render a JSON value as a styled key-value pair list.
 */
function JSONDisplay({ obj }: { obj: Record<string, unknown> | unknown[] }) {
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
                                color: themeColors.main,
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
 * Section label component matching InteractionHeader style.
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

export default function SignData({ params: { data, session } }: Props) {
    const { resolveApproval, rejectApproval } = useApproval();

    const handleReject = () => {
        void rejectApproval();
    };

    const handleSign = () => {
        void resolveApproval();
    };

    const sigType = data.type ?? 'schnorr';
    const sigTypeLabel = sigType === 'schnorr' ? 'Schnorr' : 'ECDSA';
    const sigColor = sigType === 'schnorr' ? themeColors.blue : themeColors.green;
    const hexData = data.data;

    // Parse originalMessage if present
    const parsedMessage = useMemo(() => {
        if (!data.originalMessage) return null;
        return tryParseJSON(data.originalMessage);
    }, [data.originalMessage]);

    // Truncated hex for display
    const hexPreview = hexData.length > 128 ? `${hexData.slice(0, 64)}...${hexData.slice(-64)}` : hexData;

    return (
        <Layout>
            <Content style={{ padding: 12, overflowY: 'auto' }}>
                {/* Site Header — matches InteractionHeader pattern */}
                <div
                    style={{
                        background: `linear-gradient(135deg, ${themeColors.main}10 0%, ${themeColors.main}05 100%)`,
                        border: `1px solid ${themeColors.main}20`,
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
                                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: themeColors.main,
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

                {/* Title + Signature Type */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                        Sign Data Request
                    </div>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 12px',
                            borderRadius: 16,
                            backgroundColor: `${sigColor}20`,
                            border: `1px solid ${sigColor}40`
                        }}>
                        <KeyOutlined style={{ fontSize: 11, color: sigColor }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: sigColor }}>{sigTypeLabel}</span>
                    </div>
                </div>

                {/* Message Content Section */}
                {parsedMessage ? (
                    <div
                        style={{
                            background: themeColors.containerBgFaded,
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 12
                        }}>
                        <SectionLabel icon={<FileTextOutlined style={{ fontSize: 10 }} />} text="Message Content" />
                        <div
                            style={{
                                padding: 10,
                                background: `${themeColors.blue}10`,
                                border: `1px solid ${themeColors.blue}20`,
                                borderRadius: 8
                            }}>
                            <JSONDisplay obj={parsedMessage} />
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
                        <SectionLabel icon={<FileTextOutlined style={{ fontSize: 10 }} />} text="Message Content" />
                        <div
                            style={{
                                userSelect: 'text',
                                maxHeight: 160,
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

                {/* Hex Data Section */}
                <div
                    style={{
                        background: themeColors.containerBgFaded,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 12
                    }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8
                        }}>
                        <SectionLabel icon={<FileTextOutlined style={{ fontSize: 10 }} />} text="Data to Sign" />
                        <span
                            style={{
                                fontSize: 11,
                                color: themeColors.textFaded,
                                fontFamily: 'monospace',
                                fontWeight: 500
                            }}>
                            {Math.floor(hexData.length / 2)} bytes
                        </span>
                    </div>
                    <div
                        style={{
                            userSelect: 'text',
                            maxHeight: parsedMessage ? 80 : 180,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            fontSize: 11,
                            fontFamily: 'monospace',
                            padding: 10,
                            background: themeColors.inputBg,
                            borderRadius: 8,
                            border: `1px solid ${themeColors.containerBorder}`,
                            color: themeColors.textFaded,
                            lineHeight: '1.6'
                        }}>
                        {hexPreview}
                    </div>
                    {hexData.length > 128 && (
                        <div style={{ fontSize: 10, color: themeColors.textFaded, marginTop: 6, textAlign: 'right' }}>
                            Showing preview &middot; {hexData.length} hex characters total
                        </div>
                    )}
                </div>

                {/* Warning Section */}
                <div
                    style={{
                        padding: '10px 12px',
                        background: `${themeColors.warning}10`,
                        border: `1px solid ${themeColors.warning}30`,
                        borderRadius: 12,
                        marginBottom: 12
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <WarningOutlined style={{ fontSize: 14, color: themeColors.warning, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: themeColors.warning, lineHeight: '1.5' }}>
                            Only sign if you trust this site. Signing malicious data can compromise your wallet.
                        </span>
                    </div>
                </div>

                {/* Spacer for fixed footer */}
                <div style={{ height: 70 }} />
            </Content>

            <Footer style={{ padding: 12 }}>
                <Row full style={{ gap: 8 }}>
                    <Button
                        text="Reject"
                        full
                        preset="default"
                        onClick={handleReject}
                        style={{
                            background: '#434343',
                            border: `1px solid ${themeColors.containerBorder}`,
                            color: themeColors.text
                        }}
                    />
                    <Button
                        text="Sign"
                        full
                        preset="primary"
                        onClick={handleSign}
                        style={{
                            background: themeColors.main,
                            color: themeColors.background,
                            fontWeight: 600
                        }}
                    />
                </Row>
            </Footer>
        </Layout>
    );
}
