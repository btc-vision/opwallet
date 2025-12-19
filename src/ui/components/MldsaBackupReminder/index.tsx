import { useState } from 'react';

import { Account } from '@/shared/types';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useWallet } from '@/ui/utils';
import { KeyOutlined, SafetyOutlined, WarningOutlined } from '@ant-design/icons';

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

interface MldsaBackupReminderProps {
    account: Account;
    onClose: () => void;
}

// This component is only shown for Simple Keyrings (WIF imports)
// HD wallets derive MLDSA from the seed phrase, so no separate backup is needed
export const MldsaBackupReminder = ({ account, onClose }: MldsaBackupReminderProps) => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const [isDismissing, setIsDismissing] = useState(false);

    const handleDismiss = async () => {
        setIsDismissing(true);
        try {
            await wallet.setMldsaBackupDismissed(account.pubkey, true);
            onClose();
        } catch (error) {
            console.error('Failed to dismiss MLDSA backup reminder:', error);
        } finally {
            setIsDismissing(false);
        }
    };

    const handleBackupNow = () => {
        onClose();
        navigate(RouteTypes.ExportPrivateKeyScreen, { account });
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
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999,
                    animation: 'fadeIn 0.2s ease'
                }}
                onClick={handleDismiss}
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
                    maxWidth: '340px',
                    border: `1px solid ${colors.containerBorder}`,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                {/* Header with gradient */}
                <div
                    style={{
                        padding: '20px 20px 0',
                        background: `linear-gradient(135deg, ${colors.warning}15 0%, transparent 100%)`,
                        borderRadius: '16px 16px 0 0'
                    }}>
                    {/* Warning Icon */}
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: `linear-gradient(135deg, ${colors.warning}20 0%, ${colors.warning}10 100%)`,
                            border: `1px solid ${colors.warning}30`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            position: 'relative'
                        }}>
                        <SafetyOutlined
                            style={{
                                fontSize: 28,
                                color: colors.warning
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                inset: '-1px',
                                borderRadius: '14px',
                                padding: '1px',
                                background: `linear-gradient(135deg, ${colors.warning}40 0%, transparent 100%)`,
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>

                    {/* Title */}
                    <h3
                        style={{
                            fontSize: '20px',
                            fontWeight: 600,
                            color: colors.text,
                            textAlign: 'center',
                            margin: '0 0 8px 0',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Backup Your MLDSA Key
                    </h3>

                    <p
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            textAlign: 'center',
                            margin: '0 0 20px 0',
                            lineHeight: '1.5'
                        }}>
                        Your wallet uses a quantum-resistant MLDSA key that must be backed up separately.
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '0 20px 20px' }}>
                    {/* Info Card */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '16px',
                            border: `1px solid ${colors.containerBorder}`
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: `${colors.main}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                <KeyOutlined
                                    style={{
                                        fontSize: 18,
                                        color: colors.main
                                    }}
                                />
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: colors.text,
                                        marginBottom: '4px'
                                    }}>
                                    What is the MLDSA Key?
                                </div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        lineHeight: '1.4'
                                    }}>
                                    The MLDSA key is a post-quantum cryptographic key used for secure transactions on
                                    OP_NET. It&apos;s separate from your WIF/private key and must be backed up
                                    independently.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning Message */}
                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            padding: '10px',
                            background: `${colors.error}10`,
                            border: `1px solid ${colors.error}25`,
                            borderRadius: '10px',
                            marginBottom: '20px'
                        }}>
                        <WarningOutlined
                            style={{
                                color: colors.error,
                                fontSize: '14px',
                                flexShrink: 0,
                                marginTop: '2px'
                            }}
                        />
                        <p
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                margin: 0,
                                lineHeight: '1.4'
                            }}>
                            <strong style={{ color: colors.text }}>Important:</strong> If you only backup your
                            WIF/private key without the MLDSA key, you will{' '}
                            <strong style={{ color: colors.error }}>lose access</strong> to your OP_NET identity and
                            linked assets when restoring your wallet.
                        </p>
                    </div>

                    {/* Action Buttons */}
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
                            onClick={handleDismiss}
                            disabled={isDismissing}
                            onMouseEnter={(e) => {
                                if (!isDismissing) {
                                    e.currentTarget.style.background = colors.buttonBg;
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                            Later
                        </button>
                        <button
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: colors.main,
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                fontFamily: 'Inter-Regular, serif',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onClick={handleBackupNow}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                            Backup Now
                        </button>
                    </div>
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
