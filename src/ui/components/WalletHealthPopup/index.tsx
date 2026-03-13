import { CloseOutlined, SettingOutlined, WalletOutlined, WarningOutlined } from '@ant-design/icons';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';

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
    error: '#ef4444',
    warning: '#fbbf24'
};

interface LowBalancePopupProps {
    onClose: () => void;
}

export const LowBalancePopup = ({ onClose }: LowBalancePopupProps) => {
    return (
        <>
            {/* Backdrop - no dismiss on click, user must press OK */}
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
                    animation: 'walletHealthFadeIn 0.2s ease'
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
                    maxWidth: '340px',
                    maxHeight: 'calc(100vh - 80px)',
                    overflow: 'hidden',
                    border: `1px solid ${colors.containerBorder}`,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    animation: 'walletHealthSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                {/* Header */}
                <div
                    style={{
                        padding: '20px 20px 0',
                        background: `linear-gradient(135deg, ${colors.warning}15 0%, transparent 100%)`,
                        borderRadius: '16px 16px 0 0'
                    }}>
                    {/* Icon */}
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
                        <WalletOutlined
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

                    <h3
                        style={{
                            fontSize: '20px',
                            fontWeight: 600,
                            color: colors.text,
                            textAlign: 'center',
                            margin: '0 0 8px 0',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Low Primary Wallet Balance
                    </h3>

                    <p
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            textAlign: 'center',
                            margin: '0 0 20px 0',
                            lineHeight: '1.5'
                        }}>
                        Your primary wallet balance is critically low. You may not have enough funds to cover network fees
                        for transactions.
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '0 20px 20px' }}>
                    {/* Warning */}
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
                        <WarningOutlined
                            style={{
                                color: colors.warning,
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
                            Please deposit more funds to your primary wallet address to ensure you can send transactions
                            and interact with smart contracts.
                        </p>
                    </div>

                    {/* OK Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: colors.main,
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: 'Inter-Regular, serif'
                        }}
                        onClick={onClose}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        OK
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes walletHealthFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes walletHealthSlideUp {
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

interface LowUtxoPopupProps {
    onClose: () => void;
}

export const LowUtxoPopup = ({ onClose }: LowUtxoPopupProps) => {
    const navigate = useNavigate();

    const handleOptimize = () => {
        onClose();
        navigate(RouteTypes.UTXOOptimizeScreen);
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
                    animation: 'walletHealthFadeIn 0.2s ease'
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
                    maxWidth: '340px',
                    maxHeight: 'calc(100vh - 80px)',
                    overflow: 'hidden',
                    border: `1px solid ${colors.containerBorder}`,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    animation: 'walletHealthSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                {/* Close X button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.buttonHoverBg;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                    }}>
                    <CloseOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                </button>

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
                            margin: '0 auto 16px',
                            position: 'relative'
                        }}>
                        <SettingOutlined
                            style={{
                                fontSize: 28,
                                color: colors.main
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                inset: '-1px',
                                borderRadius: '14px',
                                padding: '1px',
                                background: `linear-gradient(135deg, ${colors.main}40 0%, transparent 100%)`,
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>

                    <h3
                        style={{
                            fontSize: '20px',
                            fontWeight: 600,
                            color: colors.text,
                            textAlign: 'center',
                            margin: '0 0 8px 0',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        UTXO Optimization Recommended
                    </h3>

                    <p
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            textAlign: 'center',
                            margin: '0 0 20px 0',
                            lineHeight: '1.5'
                        }}>
                        To be able to complete multiple concurrent transactions, we highly recommend having at least 5
                        UTXOs in your wallet at all times.
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '0 20px 20px' }}>
                    {/* Info card */}
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
                                    background: `${colors.warning}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                <WarningOutlined
                                    style={{
                                        fontSize: 18,
                                        color: colors.warning
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
                                    Why does this matter?
                                </div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: colors.textFaded,
                                        lineHeight: '1.4'
                                    }}>
                                    Each Bitcoin transaction requires at least one UTXO as input. With fewer than 5 UTXOs,
                                    you must wait for previous transactions to confirm before sending new ones.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Optimize Now Button */}
                    <button
                        style={{
                            width: '100%',
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
                        onClick={handleOptimize}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.main}40`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        Optimize Now
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes walletHealthFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes walletHealthSlideUp {
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
