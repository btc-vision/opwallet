import { useMemo, useState } from 'react';

import { WalletKeyring } from '@/shared/types';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { keyringsActions } from '@/ui/state/keyrings/reducer';
import { shortAddress, useWallet } from '@/ui/utils';
import { ExclamationCircleOutlined, WalletOutlined } from '@ant-design/icons';

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

export const RemoveWalletPopover = ({ keyring, onClose }: { keyring: WalletKeyring; onClose: () => void }) => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isDeleting, setIsDeleting] = useState(false);

    const displayAddress = useMemo(() => {
        if (!keyring.accounts[0]) {
            return 'Invalid';
        }
        const address = keyring.accounts[0].address;
        return shortAddress(address);
    }, [keyring]);

    const handleRemove = async () => {
        setIsDeleting(true);
        try {
            const nextKeyring = await wallet.removeKeyring(keyring);
            const keyrings = await wallet.getKeyrings();
            dispatch(keyringsActions.setKeyrings(keyrings));

            if (nextKeyring) {
                dispatch(accountActions.setCurrent(nextKeyring.accounts[0]));
                onClose();
                return;
            }

            if (keyrings[0]) {
                dispatch(keyringsActions.setCurrent(keyrings[0]));
                onClose();
                return;
            }

            navigate(RouteTypes.WelcomeScreen);
        } catch (error) {
            console.error('Failed to remove wallet:', error);
        } finally {
            setIsDeleting(false);
        }
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
                        background: `linear-gradient(135deg, ${colors.error}15 0%, transparent 100%)`,
                        borderRadius: '16px 16px 0 0'
                    }}>
                    {/* Warning Icon */}
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
                            margin: '0 auto 16px',
                            position: 'relative'
                        }}>
                        <ExclamationCircleOutlined
                            style={{
                                fontSize: 28,
                                color: colors.error
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                inset: '-1px',
                                borderRadius: '14px',
                                padding: '1px',
                                background: `linear-gradient(135deg, ${colors.error}40 0%, transparent 100%)`,
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
                        Remove Wallet
                    </h3>

                    <p
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            textAlign: 'center',
                            margin: '0 0 20px 0',
                            lineHeight: '1.5'
                        }}>
                        Are you sure you want to remove this wallet?
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '0 20px 20px' }}>
                    {/* Wallet Info Card */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            borderRadius: '12px',
                            padding: '14px',
                            marginBottom: '16px',
                            border: `1px solid ${colors.containerBorder}`
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: colors.buttonHoverBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <WalletOutlined
                                    style={{
                                        fontSize: 20,
                                        color: colors.textFaded
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: colors.text,
                                        marginBottom: '2px'
                                    }}>
                                    {keyring.alianName}
                                </div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        fontFamily: 'monospace'
                                    }}>
                                    {displayAddress}
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
                            background: `${colors.warning}10`,
                            border: `1px solid ${colors.warning}25`,
                            borderRadius: '10px',
                            marginBottom: '20px'
                        }}>
                        <span
                            style={{
                                color: colors.warning,
                                fontSize: '14px',
                                flexShrink: 0
                            }}>
                            ⚠️
                        </span>
                        <p
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded,
                                margin: 0,
                                lineHeight: '1.4'
                            }}>
                            This action cannot be undone. Make sure you have backed up your seed phrase or private key
                            before proceeding.
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
                            onClick={onClose}
                            disabled={isDeleting}
                            onMouseEnter={(e) => {
                                if (!isDeleting) {
                                    e.currentTarget.style.background = colors.buttonBg;
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
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
                                background: colors.error,
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                opacity: isDeleting ? 0.7 : 1,
                                transition: 'all 0.15s',
                                fontFamily: 'Inter-Regular, serif',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onClick={handleRemove}
                            disabled={isDeleting}
                            onMouseEnter={(e) => {
                                if (!isDeleting) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.error}40`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                            {isDeleting ? (
                                <>
                                    <span style={{ opacity: 0.7 }}>Removing</span>
                                    <span className="loading-dots">...</span>
                                </>
                            ) : (
                                'Remove Wallet'
                            )}
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

                .loading-dots {
                    display: inline-block;
                    animation: loadingDots 1.4s infinite;
                }

                @keyframes loadingDots {
                    0%, 60%, 100% {
                        opacity: 0.6;
                    }
                    30% {
                        opacity: 1;
                    }
                }
            `}</style>
        </>
    );
};
