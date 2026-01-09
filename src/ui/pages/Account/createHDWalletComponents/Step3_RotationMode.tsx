import { useState } from 'react';
import {
    WalletOutlined,
    SafetyCertificateOutlined,
    LockOutlined,
    CheckCircleFilled,
    InfoCircleOutlined
} from '@ant-design/icons';

import { Button, Column, Row, Text } from '@/ui/components';
import { FooterButtonContainer } from '@/ui/components/FooterButtonContainer';
import { ContextData, UpdateContextDataParams } from './types';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useCreateAccountCallback } from '@/ui/state/global/hooks';
import { useTools } from '@/ui/components/ActionComponent';

const colors = {
    main: '#f37413',
    mainGradient: 'linear-gradient(135deg, #f37413 0%, #ff8c42 100%)',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    warning: '#fbbf24',
    privacyBlue: '#3b82f6'
};

enum PrivacyLevel {
    STANDARD = 'standard',
    PRIVACY = 'privacy'
}

interface PrivacyOption {
    id: PrivacyLevel;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    features: string[];
}

const privacyOptions: PrivacyOption[] = [
    {
        id: PrivacyLevel.STANDARD,
        icon: <WalletOutlined style={{ fontSize: 22, color: colors.text }} />,
        title: 'Standard Wallet',
        subtitle: 'Traditional Bitcoin wallet',
        features: ['Single address', 'Simple and familiar']
    },
    {
        id: PrivacyLevel.PRIVACY,
        icon: <SafetyCertificateOutlined style={{ fontSize: 22, color: colors.privacyBlue }} />,
        title: 'Privacy Wallet (Advanced)',
        subtitle: 'For experienced Bitcoin users',
        features: ['Auto-rotating addresses', 'Hidden cold storage']
    }
];

export function Step3_RotationMode({
    contextData,
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const tools = useTools();
    const navigate = useNavigate();
    const createAccount = useCreateAccountCallback();

    const [selectedOption, setSelectedOption] = useState<PrivacyLevel>(PrivacyLevel.STANDARD);
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        setLoading(true);
        try {
            const rotationModeEnabled = selectedOption === PrivacyLevel.PRIVACY;

            // Update context with rotation mode choice
            updateContextData({ rotationModeEnabled });

            // Create the wallet with rotation mode flag
            const hdPath = contextData.customHdPath || contextData.hdPath;
            await createAccount(
                contextData.mnemonics,
                hdPath,
                contextData.passphrase,
                contextData.addressType,
                1,
                rotationModeEnabled
            );

            navigate(RouteTypes.MainScreen);
        } catch (e) {
            tools.toastError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Column gap="md" style={{ padding: '0 16px' }}>
            {/* Header */}
            <Column gap="xs" style={{ textAlign: 'center' }}>
                <Text
                    text="Choose Privacy Level"
                    style={{ fontSize: 18, fontWeight: 600 }}
                />
                <Text
                    text="Select how you want to receive Bitcoin"
                    preset="sub"
                    style={{ fontSize: 13 }}
                />
            </Column>

            {/* Warning card */}
            <div
                style={{
                    background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.warning}08 100%)`,
                    border: `1px solid ${colors.warning}40`,
                    borderRadius: 10,
                    padding: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                <InfoCircleOutlined style={{ fontSize: 14, color: colors.warning }} />
                <Text
                    text="This choice is permanent and cannot be changed later."
                    style={{ fontSize: 11, color: colors.warning, lineHeight: 1.3 }}
                />
            </div>

            {/* Options */}
            <Column gap="sm">
                {privacyOptions.map((option) => (
                    <OptionCard
                        key={option.id}
                        option={option}
                        selected={selectedOption === option.id}
                        onClick={() => setSelectedOption(option.id)}
                    />
                ))}
            </Column>

            {/* Selected option explanation */}
            <div
                style={{
                    background: colors.containerBgFaded,
                    borderRadius: 10,
                    padding: 12
                }}>
                {selectedOption === PrivacyLevel.PRIVACY ? (
                    <Column gap="xs">
                        <Row style={{ gap: 6, alignItems: 'center' }}>
                            <LockOutlined style={{ color: colors.privacyBlue, fontSize: 12 }} />
                            <Text text="How Privacy Mode works" style={{ fontWeight: 500, fontSize: 12 }} />
                        </Row>
                        <Text
                            text="Each time you receive Bitcoin, a new address is generated. Funds are automatically moved to hidden cold storage."
                            preset="sub"
                            style={{ fontSize: 11, lineHeight: 1.4 }}
                        />
                    </Column>
                ) : (
                    <Column gap="xs">
                        <Row style={{ gap: 6, alignItems: 'center' }}>
                            <WalletOutlined style={{ color: colors.text, fontSize: 12 }} />
                            <Text text="How Standard Mode works" style={{ fontWeight: 500, fontSize: 12 }} />
                        </Row>
                        <Text
                            text="Single Bitcoin address you can share with anyone. Simple but all transactions are publicly linked."
                            preset="sub"
                            style={{ fontSize: 11, lineHeight: 1.4 }}
                        />
                    </Column>
                )}
            </div>

            <FooterButtonContainer>
                <Button
                    text={loading ? 'Creating Wallet...' : 'Create Wallet'}
                    preset="primary"
                    onClick={handleContinue}
                    disabled={loading}
                />
            </FooterButtonContainer>
        </Column>
    );
}

function OptionCard({
    option,
    selected,
    onClick
}: {
    option: PrivacyOption;
    selected: boolean;
    onClick: () => void;
}) {
    const isPrivacy = option.id === PrivacyLevel.PRIVACY;
    const accentColor = isPrivacy ? colors.privacyBlue : colors.main;
    const borderColor = selected ? accentColor : 'transparent';
    const bgGradient = selected
        ? `linear-gradient(145deg, ${accentColor}15 0%, ${accentColor}08 100%)`
        : colors.containerBgFaded;

    return (
        <div
            onClick={onClick}
            style={{
                background: bgGradient,
                border: `2px solid ${borderColor}`,
                borderRadius: 12,
                padding: 12,
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}>
            <Row style={{ gap: 10, alignItems: 'center' }}>
                {/* Icon */}
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: isPrivacy ? `${colors.privacyBlue}20` : colors.containerBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                    {option.icon}
                </div>

                {/* Content */}
                <Column style={{ flex: 1, gap: 2 }}>
                    <Row justifyBetween>
                        <Text text={option.title} style={{ fontWeight: 600, fontSize: 14 }} />
                        {selected && (
                            <CheckCircleFilled style={{ color: accentColor, fontSize: 16 }} />
                        )}
                    </Row>
                    <Text text={option.subtitle} preset="sub" style={{ fontSize: 11 }} />
                    <Text
                        text={option.features.join(' · ')}
                        style={{ fontSize: 10, color: colors.textFaded }}
                    />
                </Column>
            </Row>
        </div>
    );
}
