import { useState } from 'react';
import {
    WalletOutlined,
    SafetyCertificateOutlined,
    LockOutlined,
    SwapOutlined,
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

interface PrivacyOption {
    id: 'standard' | 'privacy';
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    features: string[];
    recommended?: boolean;
}

const privacyOptions: PrivacyOption[] = [
    {
        id: 'standard',
        icon: <WalletOutlined style={{ fontSize: 32, color: colors.text }} />,
        title: 'Standard Wallet',
        subtitle: 'Traditional Bitcoin wallet',
        features: [
            'Single receiving address',
            'Simple and familiar',
            'Good for basic usage'
        ],
        recommended: true
    },
    {
        id: 'privacy',
        icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: colors.privacyBlue }} />,
        title: 'Privacy Wallet',
        subtitle: 'ALPHA - Experimental feature',
        features: [
            'Auto-rotating addresses',
            'Hidden cold storage',
            'One-time use addresses'
        ]
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

    const [selectedOption, setSelectedOption] = useState<'standard' | 'privacy'>('standard');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        setLoading(true);
        try {
            const rotationModeEnabled = selectedOption === 'privacy';

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
        <Column gap="lg" style={{ padding: '0 16px' }}>
            {/* Header */}
            <Column gap="sm" style={{ textAlign: 'center', marginBottom: 8 }}>
                <Text
                    text="Choose Privacy Level"
                    style={{ fontSize: 20, fontWeight: 600 }}
                />
                <Text
                    text="Select how you want to receive Bitcoin"
                    preset="sub"
                    style={{ fontSize: 14 }}
                />
            </Column>

            {/* Warning card */}
            <div
                style={{
                    background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.warning}08 100%)`,
                    border: `1px solid ${colors.warning}40`,
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10
                }}>
                <InfoCircleOutlined style={{ fontSize: 16, color: colors.warning, marginTop: 2 }} />
                <Text
                    text="This choice is permanent and cannot be changed after wallet creation."
                    style={{ fontSize: 12, color: colors.warning, lineHeight: 1.4 }}
                />
            </div>

            {/* Options */}
            <Column gap="md">
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
                    borderRadius: 12,
                    padding: 14
                }}>
                {selectedOption === 'privacy' ? (
                    <Column gap="sm">
                        <Row style={{ gap: 8, alignItems: 'center' }}>
                            <LockOutlined style={{ color: colors.privacyBlue }} />
                            <Text text="How Privacy Mode works" style={{ fontWeight: 500, fontSize: 13 }} />
                        </Row>
                        <Text
                            text="Every time you receive Bitcoin, a new unique address is generated. Your funds are automatically protected in a hidden cold storage that only you can access."
                            preset="sub"
                            style={{ fontSize: 12, lineHeight: 1.5 }}
                        />
                    </Column>
                ) : (
                    <Column gap="sm">
                        <Row style={{ gap: 8, alignItems: 'center' }}>
                            <WalletOutlined style={{ color: colors.text }} />
                            <Text text="How Standard Mode works" style={{ fontWeight: 500, fontSize: 13 }} />
                        </Row>
                        <Text
                            text="You'll have a single Bitcoin address that you can share with anyone. Simple and straightforward, but all transactions to this address are publicly linked."
                            preset="sub"
                            style={{ fontSize: 12, lineHeight: 1.5 }}
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
    const borderColor = selected
        ? option.id === 'privacy'
            ? colors.privacyBlue
            : colors.main
        : 'transparent';

    const bgGradient = selected
        ? option.id === 'privacy'
            ? `linear-gradient(145deg, ${colors.privacyBlue}15 0%, ${colors.privacyBlue}08 100%)`
            : `linear-gradient(145deg, ${colors.main}15 0%, ${colors.main}08 100%)`
        : colors.containerBgFaded;

    return (
        <div
            onClick={onClick}
            style={{
                background: bgGradient,
                border: `2px solid ${borderColor}`,
                borderRadius: 14,
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
            }}>
            {/* Recommended badge */}
            {option.recommended && (
                <div
                    style={{
                        position: 'absolute',
                        top: -10,
                        right: 12,
                        background: option.id === 'privacy' ? colors.privacyBlue : colors.main,
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 10
                    }}>
                    RECOMMENDED
                </div>
            )}

            <Row style={{ gap: 14, alignItems: 'flex-start' }}>
                {/* Icon */}
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: option.id === 'privacy' ? `${colors.privacyBlue}20` : colors.containerBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                    {option.icon}
                </div>

                {/* Content */}
                <Column style={{ flex: 1 }}>
                    <Row justifyBetween style={{ marginBottom: 4 }}>
                        <Text text={option.title} style={{ fontWeight: 600, fontSize: 15 }} />
                        {selected && (
                            <CheckCircleFilled
                                style={{
                                    color: option.id === 'privacy' ? colors.privacyBlue : colors.main,
                                    fontSize: 18
                                }}
                            />
                        )}
                    </Row>
                    <Text
                        text={option.subtitle}
                        preset="sub"
                        style={{ fontSize: 12, marginBottom: 10 }}
                    />

                    {/* Features */}
                    <Column gap="xs">
                        {option.features.map((feature, index) => (
                            <Row key={index} style={{ gap: 6, alignItems: 'center' }}>
                                <div
                                    style={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: 2,
                                        background: option.id === 'privacy' ? colors.privacyBlue : colors.textFaded
                                    }}
                                />
                                <Text
                                    text={feature}
                                    style={{
                                        fontSize: 11,
                                        color: colors.textFaded
                                    }}
                                />
                            </Row>
                        ))}
                    </Column>
                </Column>
            </Row>
        </div>
    );
}
