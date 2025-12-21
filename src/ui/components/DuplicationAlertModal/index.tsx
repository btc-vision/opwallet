import { ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';

import { DuplicationDetectionResult } from '@/shared/types/Duplication';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    error: '#ef4444',
    warning: '#fbbf24'
};

interface DuplicationAlertModalProps {
    detection: DuplicationDetectionResult;
    onResolve: () => void;
}

export const DuplicationAlertModal = ({ detection, onResolve }: DuplicationAlertModalProps) => {
    const hasWalletDupes = detection.walletDuplicates.length > 0;
    const hasMldsaDupes = detection.mldsaDuplicates.length > 0;

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 9999
                }}
            />

            {/* Modal - Compact for extension popup */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: colors.containerBg,
                    borderRadius: '12px',
                    width: 'calc(100% - 32px)',
                    maxWidth: '320px',
                    maxHeight: 'calc(100vh - 80px)',
                    border: `2px solid ${colors.error}`,
                    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5)`,
                    zIndex: 10000,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                {/* Header */}
                <div
                    style={{
                        padding: '16px 16px 12px',
                        background: `linear-gradient(135deg, ${colors.error}20 0%, transparent 100%)`,
                        textAlign: 'center',
                        flexShrink: 0
                    }}>
                    <ExclamationCircleOutlined
                        style={{
                            fontSize: 36,
                            color: colors.error,
                            marginBottom: 8
                        }}
                    />
                    <h3
                        style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: colors.error,
                            margin: '0 0 4px 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                        Critical Issue Detected
                    </h3>
                    <p
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded,
                            margin: 0,
                            lineHeight: '1.4'
                        }}>
                        Conflicts must be resolved before continuing.
                    </p>
                </div>

                {/* Content - Scrollable if needed */}
                <div
                    style={{
                        padding: '12px 16px 16px',
                        overflowY: 'auto',
                        flex: 1
                    }}>
                    {/* Wallet Duplicates Alert */}
                    {hasWalletDupes && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '10px',
                                background: `${colors.error}15`,
                                border: `1px solid ${colors.error}40`,
                                borderRadius: '8px',
                                marginBottom: hasMldsaDupes ? '8px' : '12px'
                            }}>
                            <WarningOutlined
                                style={{
                                    color: colors.error,
                                    fontSize: '14px',
                                    flexShrink: 0,
                                    marginTop: '1px'
                                }}
                            />
                            <div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: colors.error,
                                        marginBottom: '2px'
                                    }}>
                                    DUPLICATED WALLET
                                </div>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: colors.textFaded,
                                        lineHeight: '1.3'
                                    }}>
                                    {detection.walletDuplicates.length} conflict
                                    {detection.walletDuplicates.length > 1 ? 's' : ''} - same key, different MLDSA
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MLDSA Duplicates Alert */}
                    {hasMldsaDupes && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '10px',
                                background: `${colors.warning}15`,
                                border: `1px solid ${colors.warning}40`,
                                borderRadius: '8px',
                                marginBottom: '12px'
                            }}>
                            <WarningOutlined
                                style={{
                                    color: colors.warning,
                                    fontSize: '14px',
                                    flexShrink: 0,
                                    marginTop: '1px'
                                }}
                            />
                            <div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: colors.warning,
                                        marginBottom: '2px'
                                    }}>
                                    DUPLICATED MLDSA
                                </div>
                                <div
                                    style={{
                                        fontSize: '11px',
                                        color: colors.textFaded,
                                        lineHeight: '1.3'
                                    }}>
                                    {detection.mldsaDuplicates.length} conflict
                                    {detection.mldsaDuplicates.length > 1 ? 's' : ''} - same MLDSA on multiple wallets
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Brief explanation */}
                    <p
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded,
                            margin: '0 0 12px 0',
                            lineHeight: '1.4',
                            textAlign: 'center'
                        }}>
                        Only <strong style={{ color: colors.text }}>one</strong> MLDSA key per Bitcoin address is valid
                        on-chain.
                    </p>

                    {/* Resolve Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: colors.error,
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                        onClick={onResolve}>
                        Resolve Now
                    </button>
                </div>
            </div>
        </>
    );
};
