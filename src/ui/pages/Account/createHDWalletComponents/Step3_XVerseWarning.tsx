import { Button, Column, Row, Text } from '@/ui/components';
import { FooterButtonContainer } from '@/ui/components/FooterButtonContainer';
import { ContextData, TabType, UpdateContextDataParams } from './types';
import { useCreateAccountCallback } from '@/ui/state/global/hooks';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useTools } from '@/ui/components/ActionComponent';
import { useState } from 'react';
import { usePrivacyModeEnabled } from '@/ui/hooks/useAppConfig';

const colors = {
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.1)',
    warningBorder: 'rgba(245, 158, 11, 0.3)',
    text: '#dbdbdb',
    textDim: 'rgba(219, 219, 219, 0.7)',
    info: '#3b82f6',
    infoBg: 'rgba(59, 130, 246, 0.1)'
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
            navigate(RouteTypes.MainScreen);
        } catch (e) {
            tools.toastError((e as Error).message);
        } finally {
            setCreatingWallet(false);
        }
    };

    return (
        <Column gap="lg">
            {/* Warning Header */}
            <Row
                style={{
                    padding: '16px',
                    background: colors.warningBg,
                    borderRadius: '8px',
                    border: `1px solid ${colors.warningBorder}`
                }}>
                <Column gap="sm">
                    <Row itemsCenter gap="sm">
                        <Text text="⚠️" size="xl" />
                        <Text text="Important: XVerse Wallet Notice" preset="bold" color="warning" />
                    </Row>
                </Column>
            </Row>

            {/* Main Warning Content */}
            <Column
                gap="md"
                style={{
                    padding: '16px',
                    background: 'rgba(42, 38, 38, 0.8)',
                    borderRadius: '8px'
                }}>
                <Text
                    text="XVerse uses two separate private keys:"
                    preset="bold"
                    style={{ color: colors.text }}
                />

                <Column gap="sm" style={{ paddingLeft: '12px' }}>
                    <Row itemsCenter gap="sm">
                        <Text text="1." preset="bold" color="primary" />
                        <Text
                            text="SegWit address (Nested SegWit) - for regular BTC"
                            style={{ color: colors.textDim }}
                        />
                    </Row>
                    <Row itemsCenter gap="sm">
                        <Text text="2." preset="bold" color="primary" />
                        <Text
                            text="Taproot address - for Ordinals/Inscriptions"
                            style={{ color: colors.textDim }}
                        />
                    </Row>
                </Column>

                <div
                    style={{
                        height: '1px',
                        background: 'rgba(255,255,255,0.1)',
                        margin: '8px 0'
                    }}
                />

                <Text
                    text="Your BTC funds are likely on your SegWit address"
                    preset="bold"
                    color="warning"
                />

                <Text
                    text="When you import your XVerse mnemonic, OPWallet will show your Taproot address. If your balance shows as 0, your funds are still safe on your SegWit address in XVerse."
                    style={{ color: colors.textDim, lineHeight: '1.5' }}
                />
            </Column>

            {/* Action Required */}
            <Column
                gap="md"
                style={{
                    padding: '16px',
                    background: colors.infoBg,
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                <Row itemsCenter gap="sm">
                    <Text text="💡" size="lg" />
                    <Text text="What you need to do:" preset="bold" style={{ color: colors.info }} />
                </Row>

                <Column gap="sm" style={{ paddingLeft: '8px' }}>
                    <Text
                        text="Transfer your BTC from your XVerse SegWit address to your Taproot address before using OPWallet."
                        style={{ color: colors.textDim, lineHeight: '1.5' }}
                    />
                    <Text
                        text="You can do this within XVerse by sending BTC to your own Taproot address."
                        style={{ color: colors.textDim, lineHeight: '1.5', fontStyle: 'italic' }}
                    />
                </Column>
            </Column>

            {/* Acknowledgment */}
            <Column
                style={{
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px'
                }}>
                <Text
                    text="By continuing, you acknowledge that you understand your funds may not appear until transferred to your Taproot address."
                    size="xs"
                    style={{ color: colors.textDim, lineHeight: '1.4' }}
                />
            </Column>

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
