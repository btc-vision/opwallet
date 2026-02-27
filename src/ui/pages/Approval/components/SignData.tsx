import { useMemo } from 'react';

import { SignDataApprovalParams } from '@/shared/types/Approval';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { colors } from '@/ui/theme/colors';
import { useApproval } from '@/ui/utils';

export interface Props {
    params: SignDataApprovalParams;
}

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
        <Column gap="sm">
            {entries.map(([key, value]) => {
                const valueStr = typeof value === 'object' && value !== null
                    ? JSON.stringify(value, null, 2)
                    : String(value);

                return (
                    <Row key={key} style={{ gap: 8 }}>
                        <Text
                            text={`${key}:`}
                            preset="bold"
                            size="xs"
                            style={{ color: colors.primary, minWidth: 80, flexShrink: 0 }}
                        />
                        <Text
                            text={valueStr}
                            size="xs"
                            style={{
                                color: colors.white,
                                wordBreak: 'break-word',
                                fontFamily: typeof value === 'object' ? 'monospace' : 'inherit'
                            }}
                        />
                    </Row>
                );
            })}
        </Column>
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
    const hexData = data.data;

    // Parse originalMessage if present
    const parsedMessage = useMemo(() => {
        if (!data.originalMessage) return null;
        return tryParseJSON(data.originalMessage);
    }, [data.originalMessage]);

    // Truncated hex for display
    const hexPreview = hexData.length > 128
        ? `${hexData.slice(0, 64)}...${hexData.slice(-64)}`
        : hexData;

    return (
        <Layout>
            <Content>
                <Header padding={8} height={'100px'}>
                    <Column>
                        <WebsiteBar session={session} />
                        <Text
                            text="Sign Data"
                            textCenter
                            preset="title-bold"
                            mt="lg"
                        />
                    </Column>
                </Header>

                <Column gap="lg">
                    {/* Signature Type Badge */}
                    <Row justifyCenter>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 12px',
                                borderRadius: 16,
                                backgroundColor: sigType === 'schnorr'
                                    ? 'rgba(24, 114, 246, 0.15)'
                                    : 'rgba(65, 181, 48, 0.15)',
                                border: `1px solid ${sigType === 'schnorr'
                                    ? 'rgba(24, 114, 246, 0.4)'
                                    : 'rgba(65, 181, 48, 0.4)'}`
                            }}>
                            <Text
                                text={sigTypeLabel}
                                size="xs"
                                preset="bold"
                                style={{
                                    color: sigType === 'schnorr' ? colors.blue : colors.green
                                }}
                            />
                        </div>
                    </Row>

                    {/* Original Message (if provided and valid JSON) */}
                    {parsedMessage ? (
                        <Column gap="sm">
                            <Text text="Message Content" preset="bold" />
                            <Card
                                style={{
                                    backgroundColor: 'rgba(24, 114, 246, 0.06)',
                                    borderColor: 'rgba(24, 114, 246, 0.2)',
                                    borderWidth: 1,
                                    borderStyle: 'solid'
                                }}>
                                <JSONDisplay obj={parsedMessage} />
                            </Card>
                        </Column>
                    ) : data.originalMessage ? (
                        /* Original message provided but not valid JSON — show as text */
                        <Column gap="sm">
                            <Text text="Message Content" preset="bold" />
                            <Card>
                                <div
                                    style={{
                                        userSelect: 'text',
                                        maxHeight: 160,
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontSize: 12,
                                        color: colors.white,
                                        lineHeight: '1.5'
                                    }}>
                                    {data.originalMessage}
                                </div>
                            </Card>
                        </Column>
                    ) : null}

                    {/* Hex Data */}
                    <Column gap="sm">
                        <Row justifyBetween itemsCenter>
                            <Text text="Data to Sign" preset="bold" />
                            <Text
                                text={`${hexData.length / 2} bytes`}
                                size="xs"
                                style={{ color: colors.textDim }}
                            />
                        </Row>
                        <Card>
                            <div
                                style={{
                                    userSelect: 'text',
                                    maxHeight: parsedMessage ? 80 : 200,
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    padding: 8,
                                    backgroundColor: colors.black_dark,
                                    borderRadius: 4,
                                    color: colors.textDim,
                                    lineHeight: '1.6'
                                }}>
                                {hexPreview}
                            </div>
                            {hexData.length > 128 && (
                                <Text
                                    text={`Full data: ${hexData.length} hex characters`}
                                    preset="sub"
                                    size="xs"
                                    style={{ marginTop: 4 }}
                                />
                            )}
                        </Card>
                    </Column>

                    {/* Warning */}
                    <Card
                        style={{
                            borderColor: colors.warning,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            backgroundColor: 'rgba(243, 116, 19, 0.08)'
                        }}>
                        <Text
                            text="Only sign if you trust this site. Signing malicious data can compromise your wallet."
                            preset="sub"
                            textCenter
                            style={{ color: colors.warning }}
                        />
                    </Card>
                </Column>
            </Content>

            <Footer>
                <Row full gap="md">
                    <Button
                        text="Reject"
                        full
                        preset="default"
                        onClick={handleReject}
                        style={{ flex: 1 }}
                    />
                    <Button
                        text="Sign"
                        full
                        preset="primary"
                        onClick={handleSign}
                        style={{ flex: 1 }}
                    />
                </Row>
            </Footer>
        </Layout>
    );
}
