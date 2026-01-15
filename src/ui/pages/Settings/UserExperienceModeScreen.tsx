import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Column, Content, Header, Layout, Row, Text } from '@/ui/components';
import { useNavigate, RouteTypes } from '@/ui/pages/MainRoute';
import { useWallet } from '@/ui/utils';
import { colors } from '@/ui/theme/colors';

type ExperienceMode = 'simple' | 'expert';

interface ModeOption {
    mode: ExperienceMode;
    title: string;
    description: string;
    icon: string;
    features: string[];
    gradient: string;
    borderColor: string;
}

const modeOptions: ModeOption[] = [
    {
        mode: 'simple',
        title: 'Simple Mode',
        description: 'Perfect for beginners',
        icon: '\u{1F680}',
        features: ['Streamlined dashboard', 'Hidden technical details', 'Easier navigation'],
        gradient: 'linear-gradient(135deg, #1a4d3a 0%, #2d5a47 100%)',
        borderColor: '#4ade80'
    },
    {
        mode: 'expert',
        title: 'Expert Mode',
        description: 'Full control for power users',
        icon: '\u{26A1}',
        features: ['MLDSA & BTC badges', 'Full address visibility', 'Advanced features'],
        gradient: 'linear-gradient(135deg, #3d2d5a 0%, #4a3a6d 100%)',
        borderColor: '#a78bfa'
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
                title={isSetup ? 'Welcome to OPWallet' : 'Experience Mode'}
            />
            <Content>
                <Column gap="lg" style={{ padding: '16px' }}>
                    <Column gap="sm">
                        <Text
                            text="Choose Your Experience"
                            preset="title-bold"
                            textCenter
                        />
                        <Text
                            text="Select the mode that best fits your needs. You can change this anytime in Settings."
                            preset="sub"
                            textCenter
                            color="textDim"
                        />
                    </Column>

                    <Column gap="md" style={{ marginTop: '16px' }}>
                        {modeOptions.map((option) => (
                            <div
                                key={option.mode}
                                onClick={() => setSelectedMode(option.mode)}
                                style={{
                                    background: option.gradient,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    cursor: 'pointer',
                                    border: `2px solid ${selectedMode === option.mode ? option.borderColor : 'transparent'}`,
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                            >
                                {selectedMode === option.mode && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: option.borderColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '14px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        ✓
                                    </div>
                                )}

                                <Column gap="sm">
                                    <Row itemsCenter gap="sm">
                                        <span style={{ fontSize: '28px' }}>{option.icon}</span>
                                        <Column gap="zero">
                                            <Text text={option.title} preset="bold" />
                                            <Text text={option.description} preset="sub" color="textDim" size="xs" />
                                        </Column>
                                    </Row>

                                    <Column gap="xs" style={{ marginTop: '8px', marginLeft: '8px' }}>
                                        {option.features.map((feature, index) => (
                                            <Row key={index} itemsCenter gap="sm">
                                                <span style={{ color: option.borderColor, fontSize: '10px' }}>•</span>
                                                <Text text={feature} preset="sub" size="sm" />
                                            </Row>
                                        ))}
                                    </Column>
                                </Column>
                            </div>
                        ))}
                    </Column>

                    <button
                        onClick={handleContinue}
                        disabled={!selectedMode || saving}
                        style={{
                            marginTop: '24px',
                            padding: '14px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: selectedMode ? colors.primary : '#444',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: selectedMode ? 'pointer' : 'not-allowed',
                            opacity: selectedMode ? 1 : 0.6,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {saving ? 'Saving...' : 'Continue'}
                    </button>
                </Column>
            </Content>
        </Layout>
    );
}
