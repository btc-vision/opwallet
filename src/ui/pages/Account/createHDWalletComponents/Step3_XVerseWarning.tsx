import { Button, Column } from '@/ui/components';
import { WarningOutlined } from '@ant-design/icons';
import { FooterButtonContainer } from '@/ui/components/FooterButtonContainer';
import { ContextData, TabType, UpdateContextDataParams } from './types';
import { useCreateAccountCallback } from '@/ui/state/global/hooks';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useTools } from '@/ui/components/ActionComponent';
import { useState } from 'react';
import { usePrivacyModeEnabled } from '@/ui/hooks/useAppConfig';

const colors = {
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.06)',
    warningBorder: 'rgba(245, 158, 11, 0.2)',
    text: '#e4e4e4',
    textDim: 'rgba(219, 219, 219, 0.65)',
    info: '#60a5fa',
    infoBg: 'rgba(96, 165, 250, 0.06)',
    infoBorder: 'rgba(96, 165, 250, 0.18)',
    cardBg: 'rgba(255, 255, 255, 0.03)',
    cardBorder: 'rgba(255, 255, 255, 0.06)',
    divider: 'rgba(255, 255, 255, 0.06)',
    main: '#f37413'
};

export function Step3_XVerseWarning({
    contextData,
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const navigate = useNavigate();
    const createAccount = useCreateAccountCallback();
    const tools = useTools();
    const privacyModeEnabled = usePrivacyModeEnabled();
    const [creatingWallet, setCreatingWallet] = useState(false);

    const onContinue = async () => {
        // If privacy mode is enabled, go to privacy step
        if (privacyModeEnabled) {
            updateContextData({ tabType: TabType.STEP4 });
            return;
        }

        // Otherwise create wallet directly with standard mode
        setCreatingWallet(true);
        try {
            await createAccount(
                contextData.mnemonics,
                contextData.hdPath,
                contextData.passphrase,
                contextData.addressType,
                1,
                false // rotationModeEnabled = false (standard mode)
            );
            navigate(RouteTypes.BoostScreen);
        } catch (e) {
            tools.toastError((e as Error).message);
        } finally {
            setCreatingWallet(false);
        }
    };

    return (
        <Column gap="lg">
            {/* Warning Header */}
            <div
                style={{
                    padding: '14px 16px',
                    background: `linear-gradient(135deg, ${colors.warningBg} 0%, rgba(245, 158, 11, 0.02) 100%)`,
                    borderRadius: '12px',
                    border: `1px solid ${colors.warningBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                    <WarningOutlined style={{ fontSize: 18, color: '#fbbf24' }} />
                </div>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fbbf24', marginBottom: '2px' }}>
                        XVerse Wallet Notice
                    </div>
                    <div style={{ fontSize: '11px', color: colors.textDim }}>Please read before continuing</div>
                </div>
            </div>

            {/* Main Warning Content */}
            <div
                style={{
                    padding: '16px',
                    background: `linear-gradient(135deg, ${colors.cardBg} 0%, rgba(255,255,255,0.01) 100%)`,
                    borderRadius: '12px',
                    border: `1px solid ${colors.cardBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                    XVerse uses two separate private keys:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                background: `${colors.main}18`,
                                border: `1px solid ${colors.main}30`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: colors.main,
                                flexShrink: 0
                            }}>
                            1
                        </div>
                        <span style={{ fontSize: '12.5px', color: colors.textDim, lineHeight: '1.4' }}>
                            <strong style={{ color: colors.text }}>SegWit address</strong> (Nested SegWit), for regular
                            BTC
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                background: `${colors.main}18`,
                                border: `1px solid ${colors.main}30`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: colors.main,
                                flexShrink: 0
                            }}>
                            2
                        </div>
                        <span style={{ fontSize: '12.5px', color: colors.textDim, lineHeight: '1.4' }}>
                            <strong style={{ color: colors.text }}>Taproot address</strong>, for Ordinals/Inscriptions
                        </span>
                    </div>
                </div>

                <div style={{ height: '1px', background: colors.divider, margin: '2px 0' }} />

                <div
                    style={{
                        padding: '10px 12px',
                        background: 'rgba(245, 158, 11, 0.06)',
                        borderRadius: '8px',
                        borderLeft: '3px solid rgba(245, 158, 11, 0.4)'
                    }}>
                    <div
                        style={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#fbbf24',
                            marginBottom: '4px'
                        }}>
                        Your BTC funds are likely on your SegWit address
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textDim, lineHeight: '1.5' }}>
                        When you import your XVerse mnemonic, OPWallet will show your Taproot address. If your balance
                        shows as 0, your funds are still safe on your SegWit address in XVerse.
                    </div>
                </div>
            </div>

            {/* Action Required */}
            <div
                style={{
                    padding: '16px',
                    background: `linear-gradient(135deg, ${colors.infoBg} 0%, rgba(96, 165, 250, 0.02) 100%)`,
                    borderRadius: '12px',
                    border: `1px solid ${colors.infoBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>💡</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: colors.info }}>What you need to do</span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingLeft: '4px'
                    }}>
                    <div style={{ fontSize: '12px', color: colors.textDim, lineHeight: '1.55' }}>
                        Transfer your BTC from your XVerse SegWit address to your Taproot address before using OPWallet.
                    </div>
                    <div
                        style={{
                            fontSize: '12px',
                            color: colors.textDim,
                            lineHeight: '1.55',
                            fontStyle: 'italic',
                            opacity: 0.85
                        }}>
                        You can do this within XVerse by sending BTC to your own Taproot address.
                    </div>
                </div>
            </div>

            {/* Acknowledgment */}
            <div
                style={{
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '10px',
                    border: `1px solid ${colors.divider}`
                }}>
                <div
                    style={{
                        fontSize: '11px',
                        color: colors.textDim,
                        lineHeight: '1.45',
                        opacity: 0.8
                    }}>
                    By continuing, you acknowledge that you understand your funds may not appear until transferred to
                    your Taproot address.
                </div>
            </div>

            <FooterButtonContainer>
                <Button
                    text={creatingWallet ? 'Creating Wallet...' : 'I Understand, Continue'}
                    preset="primary"
                    onClick={onContinue}
                    disabled={creatingWallet}
                />
            </FooterButtonContainer>
        </Column>
    );
}
