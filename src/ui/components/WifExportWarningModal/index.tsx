import { useState } from 'react';

import { ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';

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

interface WifExportWarningModalProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const WifExportWarningModal = ({ open, onConfirm, onCancel }: WifExportWarningModalProps) => {
    const [acknowledged, setAcknowledged] = useState(false);

    if (!open) return null;

    const handleConfirm = () => {
        if (acknowledged) {
            setAcknowledged(false); // Reset for next time
            onConfirm();
        }
    };

    const handleCancel = () => {
        setAcknowledged(false); // Reset for next time
        onCancel();
    };

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
                    backdropFilter: 'blur(4px)',
                    zIndex: 999,
                    animation: 'fadeIn 0.2s ease'
                }}
                onClick={handleCancel}
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
                    border: `2px solid ${colors.warning}`,
                    boxShadow: `0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px ${colors.warning}20`,
                    zIndex: 1000,
                    animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                {/* Header */}
                <div
                    style={{
                        padding: '20px 20px 0',
                        background: `linear-gradient(135deg, ${colors.warning}15 0%, transparent 100%)`,
                        borderRadius: '14px 14px 0 0'
                    }}>
                    {/* Warning Icon */}
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: `linear-gradient(135deg, ${colors.warning}25 0%, ${colors.warning}10 100%)`,
                            border: `1px solid ${colors.warning}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                        <ExclamationCircleOutlined style={{ fontSize: 28, color: colors.warning }} />
                    </div>

                    {/* Title */}
                    <h3
                        style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: colors.warning,
                            textAlign: 'center',
                            margin: '0 0 8px 0',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Important Notice
                    </h3>

                    <p
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            textAlign: 'center',
                            margin: '0 0 20px 0',
                            lineHeight: '1.5'
                        }}>
                        Please read this carefully before proceeding
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '0 20px 20px' }}>
                    {/* Warning Message */}
                    <div
                        style={{
                            padding: '14px',
                            background: `${colors.error}10`,
                            border: `1px solid ${colors.error}30`,
                            borderRadius: '12px',
                            marginBottom: '16px'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <WarningOutlined
                                style={{
                                    color: colors.error,
                                    fontSize: 16,
                                    marginTop: '2px',
                                    flexShrink: 0
                                }}
                            />
                            <p
                                style={{
                                    fontSize: '13px',
                                    color: colors.text,
                                    margin: 0,
                                    lineHeight: '1.5'
                                }}>
                                You are about to export a mnemonic-based wallet to WIF format. This will make it{' '}
                                <strong style={{ color: colors.error }}>impossible</strong> to automatically recover
                                the proper MLDSA key without the mnemonic.
                            </p>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div
                        style={{
                            padding: '12px',
                            background: colors.containerBgFaded,
                            borderRadius: '10px',
                            marginBottom: '16px',
                            border: `1px solid ${colors.containerBorder}`
                        }}>
                        <p
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                margin: 0,
                                lineHeight: '1.5'
                            }}>
                            If you import this wallet elsewhere using only the WIF key, you will need to manually
                            import the MLDSA key separately or generate a new one (which will be different from your
                            original).
                        </p>
                    </div>

                    {/* Acknowledgment Checkbox */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '12px',
                            background: `${colors.warning}10`,
                            border: `1px solid ${colors.warning}25`,
                            borderRadius: '10px',
                            marginBottom: '20px',
                            cursor: 'pointer'
                        }}
                        onClick={() => setAcknowledged(!acknowledged)}>
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(e) => setAcknowledged(e.target.checked)}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: colors.warning,
                                marginTop: '2px'
                            }}
                        />
                        <label style={{ cursor: 'pointer', flex: 1 }}>
                            <span style={{ fontSize: '12px', color: colors.text, lineHeight: '1.4' }}>
                                I understand and accept that exporting as WIF will require separate MLDSA key backup
                                for full OPNet functionality
                            </span>
                        </label>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: colors.buttonHoverBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '10px',
                                color: colors.text,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                fontFamily: 'Inter-Regular, serif'
                            }}
                            onClick={handleCancel}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = colors.buttonBg;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            Cancel
                        </button>
                        <button
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: acknowledged ? colors.warning : colors.buttonBg,
                                border: 'none',
                                borderRadius: '10px',
                                color: acknowledged ? '#000' : colors.textFaded,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: acknowledged ? 'pointer' : 'not-allowed',
                                transition: 'all 0.15s',
                                fontFamily: 'Inter-Regular, serif',
                                opacity: acknowledged ? 1 : 0.6
                            }}
                            onClick={handleConfirm}
                            disabled={!acknowledged}
                            onMouseEnter={(e) => {
                                if (acknowledged) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.warning}40`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                            Export Anyway
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
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
