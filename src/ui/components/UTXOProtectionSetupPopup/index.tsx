import { useState } from 'react';

import { useIsUnlocked } from '@/ui/state/global/hooks';
import { useWallet } from '@/ui/utils';
import { getUiType } from '@/ui/utils/uiType';

const UTXO_PROTECTION_SETUP_KEY = 'opwallet_utxo_protection_setup_done';

const colors = {
    main: '#f37413',
    background: 'rgba(0, 0, 0, 0.75)',
    cardBg: '#1a1a1a',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    warning: '#fbbf24',
    error: '#ef4444',
    success: '#4ade80'
};

type Step = 'initial' | 'confirm_disable';

export default function UTXOProtectionSetupPopup() {
    const isUnlocked = useIsUnlocked();
    const wallet = useWallet();

    const [hasCompleted, setHasCompleted] = useState(() => {
        try {
            return localStorage.getItem(UTXO_PROTECTION_SETUP_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const [step, setStep] = useState<Step>('initial');
    const [confirmText, setConfirmText] = useState('');

    const uiType = getUiType();
    if (uiType.isNotification) return null;
    if (!isUnlocked) return null;
    if (hasCompleted) return null;

    const completeSetup = () => {
        try {
            localStorage.setItem(UTXO_PROTECTION_SETUP_KEY, 'true');
        } catch {
            // ignore
        }
        setHasCompleted(true);
    };

    const handleKeepProtection = () => {
        // User wants to keep ordinal protection (optimize: true, the safe default)
        void wallet.setUTXOProtectionDisabled(false).then(() => {
            completeSetup();
        });
    };

    const handleDisableProtection = () => {
        // Show second confirmation step
        setStep('confirm_disable');
    };

    const handleConfirmDisable = () => {
        void wallet.setUTXOProtectionDisabled(true).then(() => {
            completeSetup();
        });
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: colors.background,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
            }}>
            <div
                style={{
                    background: colors.cardBg,
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '360px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '20px 16px'
                }}>
                {step === 'initial' && (
                    <>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div
                                style={{
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    color: colors.warning,
                                    marginBottom: '8px'
                                }}>
                                UTXO Protection
                            </div>
                        </div>

                        {/* Explanation */}
                        <div
                            style={{
                                background: `${colors.warning}10`,
                                border: `1px solid ${colors.warning}30`,
                                borderRadius: '12px',
                                padding: '14px',
                                marginBottom: '16px'
                            }}>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.text,
                                    lineHeight: '1.6'
                                }}>
                                OPWallet does not care about ordinals. To prevent you from spending your ordinals, we
                                have to filter all UTXOs under 1,000 sat so you do not spend an ordinal by
                                mistake.
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.textFaded,
                                    lineHeight: '1.6',
                                    marginTop: '10px'
                                }}>
                                This filter got reduced from 12k sat to 1k sat.
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.text,
                                    lineHeight: '1.6',
                                    marginTop: '10px',
                                    fontWeight: 500
                                }}>
                                If you do not care about ordinals and wish to unlock full OPWallet potential, please
                                confirm or deny OPWallet from using UTXOs under 1k sat.
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={handleKeepProtection}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: `1.5px solid ${colors.success}60`,
                                    background: `${colors.success}15`,
                                    color: colors.success,
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}>
                                Keep Protection (Recommended)
                            </button>
                            <button
                                onClick={handleDisableProtection}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: `1px solid ${colors.warning}40`,
                                    background: 'transparent',
                                    color: colors.warning,
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}>
                                Disable Protection - Use All UTXOs
                            </button>
                        </div>

                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.textFaded,
                                textAlign: 'center',
                                marginTop: '12px',
                                lineHeight: '1.4'
                            }}>
                            You can change this setting anytime in Settings &gt; Advanced.
                        </div>
                    </>
                )}

                {step === 'confirm_disable' && (
                    <>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div
                                style={{
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    color: colors.error,
                                    marginBottom: '8px'
                                }}>
                                Are You Sure?
                            </div>
                        </div>

                        {/* Warning */}
                        <div
                            style={{
                                background: `${colors.error}10`,
                                border: `1px solid ${colors.error}30`,
                                borderRadius: '12px',
                                padding: '14px',
                                marginBottom: '16px'
                            }}>
                            <div
                                style={{
                                    fontSize: '13px',
                                    color: colors.error,
                                    fontWeight: 600,
                                    marginBottom: '8px'
                                }}>
                                WARNING: THIS MAY DESTROY YOUR ORDINALS
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.text,
                                    lineHeight: '1.6'
                                }}>
                                By disabling UTXO protection, OPWallet will use <strong>all</strong> UTXOs including
                                those under 1,000 sat. If any of those UTXOs contain ordinals or inscriptions, they
                                will be <strong>permanently spent and lost</strong>.
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.textFaded,
                                    lineHeight: '1.6',
                                    marginTop: '10px'
                                }}>
                                Only disable this if you are certain your wallet does not contain ordinals or
                                inscriptions you want to keep.
                            </div>
                        </div>

                        {/* Confirmation input */}
                        <div style={{ marginBottom: '16px' }}>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.textFaded,
                                    marginBottom: '8px'
                                }}>
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
                                    border: `1px solid ${confirmText === 'DISABLE' ? colors.error : '#444'}`,
                                    background: '#222',
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

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    setStep('initial');
                                    setConfirmText('');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: `1.5px solid ${colors.success}60`,
                                    background: `${colors.success}15`,
                                    color: colors.success,
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}>
                                Go Back - Keep Protection
                            </button>
                            <button
                                onClick={handleConfirmDisable}
                                disabled={confirmText !== 'DISABLE'}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: `1px solid ${confirmText === 'DISABLE' ? colors.error + '60' : '#333'}`,
                                    background:
                                        confirmText === 'DISABLE' ? `${colors.error}15` : 'transparent',
                                    color: confirmText === 'DISABLE' ? colors.error : '#555',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: confirmText === 'DISABLE' ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.15s',
                                    opacity: confirmText === 'DISABLE' ? 1 : 0.5
                                }}>
                                Confirm - Disable UTXO Protection
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
