import { useState } from 'react';
import { SafetyOutlined, WarningOutlined } from '@ant-design/icons';

import type { WalletController } from '@/ui/utils/WalletContext';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    buttonBg: '#434343'
};

export function OnboardingUTXO({
    wallet,
    onContinue
}: {
    wallet: WalletController;
    onContinue: () => void;
}) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const handleKeepProtection = () => {
        void wallet.setUTXOProtectionDisabled(false).then(onContinue);
    };

    const handleConfirmDisable = () => {
        void wallet.setUTXOProtectionDisabled(true).then(onContinue);
    };

    if (showConfirm) {
        return (
            <div>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <WarningOutlined style={{ fontSize: 32, color: colors.error }} />
                    <div style={{ fontSize: '18px', fontWeight: 700, color: colors.error, marginTop: '8px' }}>
                        Are You Sure?
                    </div>
                </div>

                <div
                    style={{
                        background: '#3b1111',
                        borderRadius: '10px',
                        padding: '14px',
                        marginBottom: '16px'
                    }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: colors.error, marginBottom: '6px' }}>
                        THIS MAY DESTROY YOUR ORDINALS
                    </div>
                    <div style={{ fontSize: '11px', color: '#ccc', lineHeight: '1.6' }}>
                        OPWallet will use all UTXOs including those under 1,000 sat. If any contain ordinals or
                        inscriptions, they will be permanently spent and lost.
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px' }}>
                        Type <strong style={{ color: colors.error }}>DISABLE</strong> to confirm:
                    </div>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type DISABLE"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            border: `1px solid ${confirmText === 'DISABLE' ? colors.error : colors.containerBorder}`,
                            background: colors.containerBgFaded,
                            color: colors.text,
                            fontSize: '14px',
                            fontWeight: 600,
                            textAlign: 'center',
                            letterSpacing: '2px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: `1px solid ${colors.success}40`,
                            background: `${colors.success}10`,
                            color: colors.success,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                        Go Back - Keep Protection
                    </button>
                    <button
                        disabled={confirmText !== 'DISABLE'}
                        onClick={handleConfirmDisable}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: confirmText === 'DISABLE' ? colors.error : colors.buttonBg,
                            color: confirmText === 'DISABLE' ? '#fff' : colors.textFaded,
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: confirmText === 'DISABLE' ? 'pointer' : 'not-allowed',
                            opacity: confirmText === 'DISABLE' ? 1 : 0.5
                        }}>
                        Confirm - Disable Protection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <SafetyOutlined style={{ fontSize: 28, color: colors.warning, marginBottom: '8px' }} />
                <div style={{ fontSize: '18px', fontWeight: 700, color: colors.text }}>
                    UTXO Protection
                </div>
                <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                    Protect ordinals from accidental spending
                </div>
            </div>

            <div
                style={{
                    background: '#3b2e11',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '16px'
                }}>
                <div style={{ fontSize: '12px', color: colors.text, lineHeight: '1.6' }}>
                    OPWallet filters UTXOs under 1,000 sat to prevent accidental ordinal spending.
                    This was reduced from 12k sat to 1k sat.
                </div>
                <div style={{ fontSize: '12px', color: colors.textFaded, lineHeight: '1.6', marginTop: '8px' }}>
                    If you do not care about ordinals and want to use all UTXOs, you can disable this protection.
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                    onClick={handleKeepProtection}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: colors.main,
                        border: 'none',
                        borderRadius: '12px',
                        color: '#000',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}>
                    Keep Protection (Recommended)
                </button>
                <button
                    onClick={() => setShowConfirm(true)}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: `1px solid ${colors.containerBorder}`,
                        background: 'transparent',
                        color: colors.textFaded,
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}>
                    Disable Protection
                </button>
            </div>
        </div>
    );
}
