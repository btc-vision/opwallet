import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircleFilled } from '@ant-design/icons';
import { faRocket, faBolt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Button, Column, Content, Header, Layout, Row, Text } from '@/ui/components';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useWallet } from '@/ui/utils';

type ExperienceMode = 'simple' | 'expert';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    purple: '#a78bfa'
};

interface ModeOption {
    mode: ExperienceMode;
    title: string;
    description: string;
    icon: typeof faRocket;
    iconColor: string;
    features: string[];
}

const modeOptions: ModeOption[] = [
    {
        mode: 'simple',
        title: 'Simple Mode',
        description: 'Perfect for beginners',
        icon: faRocket,
        iconColor: colors.success,
        features: ['Streamlined dashboard', 'Hidden technical details', 'Easier navigation']
    },
    {
        mode: 'expert',
        title: 'Expert Mode',
        description: 'Full control for power users',
        icon: faBolt,
        iconColor: colors.purple,
        features: ['MLDSA & BTC badges visible', 'Full address visibility', 'Advanced features']
    }
];

export default function UserExperienceModeScreen() {
    const navigate = useNavigate();
    const wallet = useWallet();
    const location = useLocation();
    const isSetup = (location.state as { isSetup?: boolean })?.isSetup ?? false;

    const [selectedMode, setSelectedMode] = useState<ExperienceMode | null>(null);
    const [saving, setSaving] = useState(false);

    const handleContinue = async () => {
        if (!selectedMode) return;

        setSaving(true);
        try {
            await wallet.setExperienceMode(selectedMode);
            if (isSetup) {
                navigate(RouteTypes.MainScreen);
            } else {
                navigate(RouteTypes.SettingsTabScreen);
            }
        } catch (error) {
            console.error('Failed to save experience mode:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <Header
                onBack={isSetup ? undefined : () => navigate(RouteTypes.SettingsTabScreen)}
                title={isSetup ? 'Welcome' : 'Experience Mode'}
            />
            <Content>
                <Column gap="lg" style={{ padding: '20px' }}>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <Text
                            text="Choose Your Experience"
                            style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}
                        />
                        <Text
                            text="Select the mode that fits your needs. You can change this anytime in Settings."
                            preset="sub"
                            style={{ textAlign: 'center', lineHeight: 1.5 }}
                        />
                    </div>

                    <Column gap="md">
                        {modeOptions.map((option) => {
                            const isSelected = selectedMode === option.mode;
                            return (
                                <div
                                    key={option.mode}
                                    onClick={() => setSelectedMode(option.mode)}
                                    style={{
                                        background: colors.containerBgFaded,
                                        borderRadius: '14px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        border: `2px solid ${isSelected ? option.iconColor : 'transparent'}`,
                                        transition: 'all 0.2s ease',
                                        position: 'relative'
                                    }}>
                                    {isSelected && (
                                        <CheckCircleFilled
                                            style={{
                                                position: 'absolute',
                                                top: 12,
                                                right: 12,
                                                fontSize: 20,
                                                color: option.iconColor
                                            }}
                                        />
                                    )}

                                    <Row style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <div
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: '12px',
                                                background: `${option.iconColor}20`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                            <FontAwesomeIcon
                                                icon={option.icon}
                                                style={{ fontSize: 20, color: option.iconColor }}
                                            />
                                        </div>
                                        <Column style={{ gap: 2 }}>
                                            <Text
                                                text={option.title}
                                                style={{ fontSize: 16, fontWeight: 600, color: colors.text }}
                                            />
                                            <Text
                                                text={option.description}
                                                style={{ fontSize: 12, color: colors.textFaded }}
                                            />
                                        </Column>
                                    </Row>

                                    <Column style={{ gap: 6, marginLeft: 4 }}>
                                        {option.features.map((feature, index) => (
                                            <Row key={index} style={{ alignItems: 'center', gap: 8 }}>
                                                <div
                                                    style={{
                                                        width: 4,
                                                        height: 4,
                                                        borderRadius: '50%',
                                                        background: option.iconColor
                                                    }}
                                                />
                                                <Text
                                                    text={feature}
                                                    style={{ fontSize: 13, color: colors.textFaded }}
                                                />
                                            </Row>
                                        ))}
                                    </Column>
                                </div>
                            );
                        })}
                    </Column>

                    <Button
                        preset="primary"
                        text={saving ? 'Saving...' : 'Continue'}
                        onClick={handleContinue}
                        disabled={!selectedMode || saving}
                        style={{ marginTop: 16 }}
                    />
                </Column>
            </Content>
        </Layout>
    );
}
