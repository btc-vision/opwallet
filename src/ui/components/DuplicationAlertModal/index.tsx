import { ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';

import { DuplicationDetectionResult } from '@/shared/types/Duplication';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
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
            {/* Backdrop - Cannot be clicked to dismiss */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 999,
                    animation: 'fadeIn 0.2s ease'
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: colors.containerBg,
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: '360px',
                    border: `2px solid ${colors.error}`,
                    boxShadow: `0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px ${colors.error}30`,
                    zIndex: 1000,
                    animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                {/* Header with error gradient */}
                <div
                    style={{
                        padding: '24px 20px 0',
                        background: `linear-gradient(135deg, ${colors.error}20 0%, transparent 100%)`,
                        borderRadius: '14px 14px 0 0'
                    }}>
                    {/* Critical Icon */}
                    <div
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            background: `linear-gradient(135deg, ${colors.error}30 0%, ${colors.error}15 100%)`,
                            border: `1px solid ${colors.error}50`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            position: 'relative'
                        }}>
                        <ExclamationCircleOutlined
                            style={{
                                fontSize: 32,
                                color: colors.error
                            }}
                        />
                    </div>

                    {/* Title */}
                    <h3
                        style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: colors.error,
                            textAlign: 'center',
                            margin: '0 0 8px 0',
                            fontFamily: 'Inter-Regular, serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                        Critical Issue Detected
                    </h3>

                    <p
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            textAlign: 'center',
                            margin: '0 0 20px 0',
                            lineHeight: '1.5'
                        }}>
                        Your wallet has conflicts that must be resolved before continuing.
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '0 20px 20px' }}>
                    {/* Wallet Duplicates Alert */}
                    {hasWalletDupes && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '14px',
                                background: `${colors.error}15`,
                                border: `1px solid ${colors.error}40`,
                                borderRadius: '12px',
                                marginBottom: hasMldsaDupes ? '12px' : '16px'
                            }}>
                            <WarningOutlined
                                style={{
                                    color: colors.error,
                                    fontSize: '18px',
                                    flexShrink: 0,
                                    marginTop: '2px'
                                }}
                            />
                            <div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: colors.error,
                                        marginBottom: '4px'
                                    }}>
                                    DUPLICATED WALLET DETECTED!
                                </div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        lineHeight: '1.4'
                                    }}>
                                    {detection.walletDuplicates.length} wallet
                                    {detection.walletDuplicates.length > 1 ? 's have' : ' has'} been imported multiple
                                    times with different MLDSA keys.
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
                                gap: '12px',
                                padding: '14px',
                                background: `${colors.warning}15`,
                                border: `1px solid ${colors.warning}40`,
                                borderRadius: '12px',
                                marginBottom: '16px'
                            }}>
                            <WarningOutlined
                                style={{
                                    color: colors.warning,
                                    fontSize: '18px',
                                    flexShrink: 0,
                                    marginTop: '2px'
                                }}
                            />
                            <div>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: colors.warning,
                                        marginBottom: '4px'
                                    }}>
                                    DUPLICATED MLDSA WALLET FOUND
                                </div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        lineHeight: '1.4'
                                    }}>
                                    {detection.mldsaDuplicates.length} MLDSA key
                                    {detection.mldsaDuplicates.length > 1 ? 's are' : ' is'} assigned to multiple
                                    wallets.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Explanation */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '10px',
                            padding: '12px',
                            marginBottom: '20px',
                            border: `1px solid ${colors.containerBorder}`
                        }}>
                        <p
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                margin: 0,
                                lineHeight: '1.5',
                                textAlign: 'center'
                            }}>
                            You must resolve these conflicts to continue using your wallet. Only{' '}
                            <strong style={{ color: colors.text }}>one</strong> MLDSA key per Bitcoin address can be
                            valid on-chain.
                        </p>
                    </div>

                    {/* Resolve Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: colors.error,
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: 'Inter-Regular, serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                        onClick={onResolve}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 6px 20px ${colors.error}50`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        Resolve Now (Required)
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translate(-50%, calc(-50% + 20px));
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
            `}</style>
        </>
    );
};
