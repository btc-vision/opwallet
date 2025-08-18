import Web3API from '@/shared/web3/Web3API';
import { useAccountPublicKey } from '@/ui/state/accounts/hooks';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import {
    CheckOutlined,
    CloseOutlined,
    CopyOutlined,
    HistoryOutlined,
    InfoCircleOutlined,
    LockOutlined,
    UnlockOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import { useState } from 'react';
import { useTools } from '../ActionComponent';

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
    inputBg: '#292828',
    success: '#4ade80',
    warning: '#fbbf24'
};

export function AddressBar({
    csv75_total_amount,
    csv75_unlocked_amount,
    csv75_locked_amount,
    csv1_total_amount,
    csv1_unlocked_amount,
    csv1_locked_amount
}: {
    csv75_total_amount: string | undefined;
    csv75_unlocked_amount: string | undefined;
    csv75_locked_amount: string | undefined;
    csv1_total_amount: string | undefined;
    csv1_unlocked_amount: string | undefined;
    csv1_locked_amount: string | undefined;
}) {
    const tools = useTools();
    const untweakedPublicKey = useAccountPublicKey();

    const address = Address.fromString(untweakedPublicKey);
    const tweakedPublicKey = address.toHex();
    const explorerUrl = `https://opscan.org/accounts/${tweakedPublicKey}`;
    const csv75Address = address.toCSV(75, Web3API.network).address;
    const csv1Address = address.toCSV(1, Web3API.network).address;

    const [showModal, setShowModal] = useState(false);
    const [copiedMain, setCopiedMain] = useState(false);
    const [copiedOther, setCopiedOther] = useState<string | null>(null);

    const handleCopy = (address: string, isMain = false) => {
        copyToClipboard(address).then(() => {
            if (isMain) {
                setCopiedMain(true);
                setTimeout(() => setCopiedMain(false), 2000);
            } else {
                setCopiedOther(address);
                setTimeout(() => setCopiedOther(null), 2000);
            }
            tools.toastSuccess('Copied');
        });
    };

    const formatAmount = (amount: string | undefined) => {
        if (!amount || amount === '0') return '0';
        const num = parseFloat(amount);
        if (num < 0.00001) return '< 0.00001';
        return num.toFixed(5);
    };

    const otherAddresses = [
        {
            label: 'Untweaked Public Key',
            value: untweakedPublicKey,
            showBalance: false
        },
        {
            label: 'CSV 75',
            value: csv75Address,
            info: 'Address used for SHA1 Mining reward payouts on OP_NET.',
            showBalance: true,
            total: csv75_total_amount,
            unlocked: csv75_unlocked_amount,
            locked: csv75_locked_amount
        },
        {
            label: 'CSV 1',
            value: csv1Address,
            info: 'Address for anti-pinning protection, used by contracts such as NativeSwap.',
            showBalance: true,
            total: csv1_total_amount,
            unlocked: csv1_unlocked_amount,
            locked: csv1_locked_amount
        }
    ];

    return (
        <div style={{ width: '100%', marginTop: '8px' }}>
            {/* Main Public Key Display */}
            <div
                style={{
                    width: '100%',
                    padding: '14px',
                    background: colors.buttonHoverBg,
                    borderRadius: '17px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.3s',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={() => handleCopy(tweakedPublicKey, true)}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = colors.buttonBg;
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = colors.buttonHoverBg;
                }}>
                {/* Subtle shimmer effect */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '200%',
                        height: '100%',
                        background: `linear-gradient(90deg, transparent, rgba(243, 116, 19, 0.03), transparent)`,
                        animation: 'shimmer 4s infinite'
                    }}
                />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'relative',
                        zIndex: 1
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: colors.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                            <WalletOutlined style={{ color: colors.background, fontSize: 18 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: colors.textFaded,
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Primary Address
                            </div>
                            <div
                                style={{
                                    fontSize: '14px',
                                    color: colors.text,
                                    fontWeight: 500,
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.3px'
                                }}>
                                {shortAddress(tweakedPublicKey, 6)}
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: copiedMain ? `${colors.success}20` : colors.containerBgFaded,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s'
                        }}>
                        {copiedMain ? (
                            <CheckOutlined
                                style={{
                                    color: colors.success,
                                    fontSize: 14,
                                    animation: 'fadeInScale 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            />
                        ) : (
                            <CopyOutlined
                                style={{
                                    color: colors.textFaded,
                                    fontSize: 14
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons Row */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    width: '100%'
                }}>
                {/* Alt Addresses Button */}
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'Inter-Regular, serif',
                        color: colors.text,
                        background: colors.buttonHoverBg,
                        border: 'none',
                        borderRadius: '17px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        height: '36px'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = colors.buttonBg;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = colors.buttonHoverBg;
                    }}>
                    <span>Alt Addresses</span>
                </button>

                {/* History Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(explorerUrl, '_blank');
                    }}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'Inter-Regular, serif',
                        color: colors.text,
                        border: 'none',
                        borderRadius: '17px',
                        background: colors.buttonHoverBg,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        height: '36px'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = colors.buttonBg;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = colors.buttonHoverBg;
                    }}>
                    <HistoryOutlined style={{ fontSize: 13, color: colors.textFaded }} />
                    <span>History</span>
                </button>
            </div>

            {/* Modal Popup */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.2s ease-out',
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setShowModal(false)}>
                    <div
                        style={{
                            background: colors.containerBg,
                            border: `1px solid ${colors.containerBorder}`,
                            borderRadius: '16px',
                            width: '500px',
                            maxWidth: '90vw',
                            maxHeight: '80vh',
                            animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '20px 24px 16px',
                                borderBottom: `1px solid ${colors.containerBorder}`
                            }}>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: colors.text,
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Alternative Addresses
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: colors.textFaded,
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                    e.currentTarget.style.color = colors.text;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'none';
                                    e.currentTarget.style.color = colors.textFaded;
                                }}>
                                <CloseOutlined style={{ fontSize: 16 }} />
                            </button>
                        </div>

                        {/* Modal Content with Scrollbar */}
                        <div
                            style={{
                                padding: '16px 24px 24px',
                                maxHeight: 'calc(80vh - 80px)',
                                overflowY: 'auto',
                                overflowX: 'hidden'
                            }}>
                            {otherAddresses.map((addr, i) => (
                                <div
                                    key={addr.label}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '12px',
                                        marginBottom: i !== otherAddresses.length - 1 ? '12px' : '0',
                                        background: colors.inputBg,
                                        border: `1px solid ${colors.containerBorder}`,
                                        transition: 'all 0.15s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = colors.buttonHoverBg;
                                        e.currentTarget.style.borderColor = colors.main + '40';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = colors.inputBg;
                                        e.currentTarget.style.borderColor = colors.containerBorder;
                                    }}
                                    onClick={() => handleCopy(addr.value)}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between'
                                        }}>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: '13px',
                                                    color: colors.main,
                                                    fontWeight: 600,
                                                    letterSpacing: '0.3px',
                                                    marginBottom: '8px',
                                                    fontFamily: 'Inter-Regular, serif'
                                                }}>
                                                {addr.label}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '14px',
                                                    color: colors.text,
                                                    fontFamily: 'monospace',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginBottom: addr.showBalance ? '12px' : 0,
                                                    wordBreak: 'break-all'
                                                }}>
                                                {addr.value}
                                                {copiedOther === addr.value ? (
                                                    <CheckOutlined style={{ color: colors.success, fontSize: 13 }} />
                                                ) : (
                                                    <CopyOutlined style={{ color: colors.textFaded, fontSize: 13 }} />
                                                )}
                                            </div>

                                            {/* Balance Display */}
                                            {addr.showBalance && (
                                                <div
                                                    style={{
                                                        background: colors.containerBgFaded,
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        marginTop: '8px'
                                                    }}>
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            color: colors.textFaded,
                                                            fontWeight: 600,
                                                            marginBottom: '8px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                        Balance
                                                    </div>

                                                    {/* Total */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginBottom: '6px'
                                                        }}>
                                                        <span style={{ fontSize: '12px', color: colors.textFaded }}>
                                                            Total:
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '12px',
                                                                color: colors.text,
                                                                fontWeight: 600,
                                                                fontFamily: 'monospace'
                                                            }}>
                                                            {formatAmount(addr.total)} BTC
                                                        </span>
                                                    </div>

                                                    {/* Unlocked */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginBottom: '6px'
                                                        }}>
                                                        <span
                                                            style={{
                                                                fontSize: '12px',
                                                                color: colors.success,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                            <UnlockOutlined style={{ fontSize: 11 }} />
                                                            Unlocked:
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '12px',
                                                                color: colors.success,
                                                                fontFamily: 'monospace'
                                                            }}>
                                                            {formatAmount(addr.unlocked)} BTC
                                                        </span>
                                                    </div>

                                                    {/* Locked */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}>
                                                        <span
                                                            style={{
                                                                fontSize: '12px',
                                                                color: colors.warning,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                            <LockOutlined style={{ fontSize: 11 }} />
                                                            Locked:
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '12px',
                                                                color: colors.warning,
                                                                fontFamily: 'monospace'
                                                            }}>
                                                            {formatAmount(addr.locked)} BTC
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                position: 'relative',
                                                display: addr.info ? 'inline-block' : 'none',
                                                marginLeft: '12px',
                                                marginTop: '2px'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseEnter={(e) => {
                                                const tooltip = e.currentTarget.querySelector(
                                                    '.custom-tooltip'
                                                ) as HTMLElement;
                                                if (tooltip) {
                                                    tooltip.style.visibility = 'visible';
                                                    tooltip.style.opacity = '1';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                const tooltip = e.currentTarget.querySelector(
                                                    '.custom-tooltip'
                                                ) as HTMLElement;
                                                if (tooltip) {
                                                    tooltip.style.visibility = 'hidden';
                                                    tooltip.style.opacity = '0';
                                                }
                                            }}>
                                            <InfoCircleOutlined
                                                style={{
                                                    color: colors.textFaded,
                                                    cursor: 'help',
                                                    fontSize: 16
                                                }}
                                            />
                                            <div
                                                style={{
                                                    visibility: 'hidden',
                                                    opacity: 0,
                                                    transition: 'all 0.2s',
                                                    position: 'absolute',
                                                    bottom: '120%',
                                                    right: '-10px',
                                                    background: colors.background,
                                                    color: colors.text,
                                                    fontSize: '11px',
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${colors.containerBorder}`,
                                                    width: '220px',
                                                    textAlign: 'left',
                                                    zIndex: 200,
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                                                    pointerEvents: 'none',
                                                    whiteSpace: 'normal',
                                                    lineHeight: '1.4',
                                                    fontFamily: 'Inter-Regular, serif'
                                                }}
                                                className="custom-tooltip">
                                                {addr.info}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                
                @keyframes fadeInScale {
                    from {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                
                /* Custom scrollbar styling */
                div::-webkit-scrollbar {
                    width: 6px;
                }
                
                div::-webkit-scrollbar-track {
                    background: ${colors.containerBgFaded};
                    border-radius: 3px;
                }
                
                div::-webkit-scrollbar-thumb {
                    background: ${colors.textFaded};
                    border-radius: 3px;
                }
                
                div::-webkit-scrollbar-thumb:hover {
                    background: ${colors.text};
                }
            `}</style>
        </div>
    );
}
