import { SendBitcoinApprovalParams } from '@/shared/types/Approval';
import { Button, Content, Footer, Layout, Row } from '@/ui/components';
import { BtcUsd } from '@/ui/components/BtcUsd';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { satoshisToAmount } from '@/ui/utils';
import { useApproval } from '@/ui/utils/hooks';
import { SendOutlined, WalletOutlined, WarningOutlined } from '@ant-design/icons';
import { OrdinalProtectionWarning } from './OrdinalProtectionWarning';

export interface Props {
    params: SendBitcoinApprovalParams;
}

const themeColors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    warning: '#fbbf24'
};

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

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
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
            <span style={{ fontSize: 12, color: themeColors.textFaded }}>{label}</span>
            <span
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: themeColors.text,
                    fontFamily: mono ? 'monospace' : 'inherit',
                    maxWidth: '60%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'right'
                }}>
                {value}
            </span>
        </div>
    );
}

export default function SendBitcoin(props: Props) {
    const {
        params: { data, session }
    } = props;

    const { resolveApproval, rejectApproval } = useApproval();
    const btcUnit = useBTCUnit();
    const currentAccount = useCurrentAccount();

    const handleReject = async () => {
        await rejectApproval('User rejected the request.');
    };

    const handleConfirm = async () => {
        await resolveApproval();
    };

    // SAFETY: data.amount may arrive as a string (bigint serialization through message passing).
    // Convert safely without precision loss for display purposes.
    const amountStr = String(data.amount ?? '0');
    const amountNum = Number(amountStr);
    const amountDisplay = satoshisToAmount(amountNum);

    const toAddress = data.to ?? '';
    const fromAddress = data.from ?? currentAccount.address;
    const feeRate = data.feeRate ?? 0;

    return (
        <Layout>
            <Content style={{ padding: 12, overflowY: 'auto' }}>
                {/* Ordinal Protection Warning */}
                <OrdinalProtectionWarning address={fromAddress} />

                {/* Site Header */}
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
                                background: themeColors.main,
                                display: session.icon ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                            <SendOutlined style={{ fontSize: 20, color: themeColors.background }} />
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
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                        Send Bitcoin
                    </div>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 12px',
                            borderRadius: 16,
                            backgroundColor: `${themeColors.main}20`,
                            border: `1px solid ${themeColors.main}40`
                        }}>
                        <SendOutlined style={{ fontSize: 11, color: themeColors.main }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: themeColors.main }}>BTC Transfer</span>
                    </div>
                </div>

                {/* Amount Section */}
                <div
                    style={{
                        background: themeColors.containerBgFaded,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 12
                    }}>
                    <SectionLabel
                        icon={<WalletOutlined style={{ fontSize: 10 }} />}
                        text="Amount"
                    />
                    <div
                        style={{
                            textAlign: 'center',
                            padding: 16,
                            background: themeColors.inputBg,
                            borderRadius: 8,
                            border: `1px solid ${themeColors.containerBorder}`
                        }}>
                        <div
                            style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: '#ffffff',
                                marginBottom: 4
                            }}>
                            {amountDisplay}{' '}
                            <span style={{ fontSize: 14, fontWeight: 600, color: themeColors.textFaded }}>
                                {btcUnit}
                            </span>
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: themeColors.textFaded,
                                fontFamily: 'monospace'
                            }}>
                            {amountStr} satoshis
                        </div>
                        <BtcUsd
                            sats={amountNum}
                            size="sm"
                            color="textDim"
                            style={{ marginTop: 4 }}
                        />
                    </div>
                </div>

                {/* Transaction Details Section */}
                <div
                    style={{
                        background: themeColors.containerBgFaded,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 12
                    }}>
                    <SectionLabel
                        icon={<SendOutlined style={{ fontSize: 10 }} />}
                        text="Transaction Details"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <DetailRow label="From" value={fromAddress} mono />
                        <DetailRow label="To" value={toAddress} mono />
                        {feeRate > 0 ? (
                            <DetailRow label="Fee Rate" value={`${feeRate} sat/vB`} />
                        ) : null}
                    </div>
                </div>

                {/* Note Section */}
                {data.note && typeof data.note === 'string' ? (
                    <div
                        style={{
                            background: themeColors.containerBgFaded,
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 12
                        }}>
                        <SectionLabel
                            icon={<SendOutlined style={{ fontSize: 10 }} />}
                            text="Note"
                        />
                        <div
                            style={{
                                userSelect: 'text',
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
                            {data.note}
                        </div>
                    </div>
                ) : null}

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
                            Only confirm if you trust this site. This will send Bitcoin from your wallet and cannot be
                            reversed.
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
                        text="Confirm Send"
                        full
                        preset="primary"
                        onClick={handleConfirm}
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
