import { CheckCircleOutlined, FileTextOutlined, KeyOutlined, SafetyOutlined, WarningOutlined } from '@ant-design/icons';

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
    warning: '#fbbf24',
    purple: '#8B5CF6'
};

interface WalletSetupGuideModalProps {
    open: boolean;
    onSelectHD: () => void;
    onSelectWIF: () => void;
    onClose: () => void;
}

export const WalletSetupGuideModal = ({ open, onSelectHD, onSelectWIF, onClose }: WalletSetupGuideModalProps) => {
    if (!open) return null;

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
                onClick={onClose}
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
                    border: `1px solid ${colors.containerBorder}`,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                {/* Header */}
                <div
                    style={{
                        padding: '20px 20px 0',
                        background: `linear-gradient(135deg, ${colors.main}15 0%, transparent 100%)`,
                        borderRadius: '16px 16px 0 0'
                    }}>
                    {/* Icon */}
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}10 100%)`,
                            border: `1px solid ${colors.main}30`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                        <SafetyOutlined style={{ fontSize: 28, color: colors.main }} />
                    </div>

                    {/* Title */}
                    <h3
                        style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: colors.text,
                            textAlign: 'center',
                            margin: '0 0 8px 0',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Quick Setup Guide
                    </h3>

                    <p
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            textAlign: 'center',
                            margin: '0 0 20px 0',
                            lineHeight: '1.5'
                        }}>
                        Choose how you want to create or import your wallet
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '0 20px 20px' }}>
                    {/* Recommended: Seed Phrase Option */}
                    <button
                        onClick={onSelectHD}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: `${colors.success}10`,
                            border: `2px solid ${colors.success}40`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginBottom: '12px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = colors.success;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = `${colors.success}40`;
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: `${colors.success}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                <FileTextOutlined style={{ fontSize: 20, color: colors.success }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '4px'
                                    }}>
                                    <span style={{ fontSize: '15px', fontWeight: 600, color: colors.text }}>
                                        Seed Phrase (HD Wallet)
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            background: colors.success,
                                            color: '#fff',
                                            borderRadius: '4px',
                                            fontWeight: 700
                                        }}>
                                        RECOMMENDED
                                    </span>
                                </div>
                                <ul
                                    style={{
                                        margin: '8px 0 0 0',
                                        padding: '0 0 0 16px',
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        lineHeight: '1.6'
                                    }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircleOutlined style={{ color: colors.success, fontSize: 12 }} />
                                        MLDSA keys automatically derived
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircleOutlined style={{ color: colors.success, fontSize: 12 }} />
                                        Single backup covers everything
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircleOutlined style={{ color: colors.success, fontSize: 12 }} />
                                        Simplest recovery process
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </button>

                    {/* Private Key Option */}
                    <button
                        onClick={onSelectWIF}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: colors.containerBgFaded,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginBottom: '16px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = colors.warning;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = colors.containerBorder;
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: `${colors.warning}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                <KeyOutlined style={{ fontSize: 20, color: colors.warning }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '4px'
                                    }}>
                                    <span style={{ fontSize: '15px', fontWeight: 600, color: colors.text }}>
                                        Private Key (WIF)
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            background: `${colors.warning}20`,
                                            color: colors.warning,
                                            borderRadius: '4px',
                                            fontWeight: 600
                                        }}>
                                        ADVANCED
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '8px' }}>
                                    <WarningOutlined
                                        style={{ color: colors.warning, fontSize: 12, marginTop: '2px', flexShrink: 0 }}
                                    />
                                    <span style={{ fontSize: '12px', color: colors.textFaded, lineHeight: '1.4' }}>
                                        Requires separate MLDSA key backup. Not recommended for new users.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Info Note */}
                    <div
                        style={{
                            padding: '10px 12px',
                            background: `${colors.purple}10`,
                            border: `1px solid ${colors.purple}25`,
                            borderRadius: '8px'
                        }}>
                        <p style={{ fontSize: '11px', color: colors.textFaded, margin: 0, lineHeight: '1.4' }}>
                            <strong style={{ color: colors.purple }}>Why Seed Phrase?</strong> HD wallets automatically
                            derive your MLDSA (post-quantum) key from the mnemonic, making recovery simple and secure.
                        </p>
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
