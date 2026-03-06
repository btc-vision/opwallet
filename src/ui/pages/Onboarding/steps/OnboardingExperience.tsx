import { useState } from 'react';
import { ExperimentOutlined, SettingOutlined } from '@ant-design/icons';

import type { WalletController } from '@/ui/utils/WalletContext';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    buttonBg: '#434343'
};

type Mode = 'simple' | 'expert';

export function OnboardingExperience({
    wallet,
    onContinue
}: {
    wallet: WalletController;
    onContinue: () => void;
}) {
    const [selected, setSelected] = useState<Mode | null>(null);

    const handleContinue = () => {
        if (!selected) return;
        void wallet.setExperienceMode(selected).then(onContinue);
    };

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: colors.text }}>
                    Choose Your Experience
                </div>
                <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                    You can change this anytime in Settings
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {/* Simple Mode */}
                <button
                    onClick={() => setSelected('simple')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '16px',
                        background: selected === 'simple' ? `${colors.success}10` : colors.containerBgFaded,
                        border: `1.5px solid ${selected === 'simple' ? colors.success : colors.containerBorder}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                    }}>
                    <div
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: `${colors.success}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                        <ExperimentOutlined style={{ fontSize: 22, color: colors.success }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '4px' }}>
                            Simple Mode
                        </div>
                        <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                            Clean interface, essential features only. Best for everyday use and beginners.
                        </div>
                    </div>
                </button>

                {/* Expert Mode */}
                <button
                    onClick={() => setSelected('expert')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '16px',
                        background: selected === 'expert' ? `${colors.main}10` : colors.containerBgFaded,
                        border: `1.5px solid ${selected === 'expert' ? colors.main : colors.containerBorder}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                    }}>
                    <div
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: `${colors.main}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                        <SettingOutlined style={{ fontSize: 22, color: colors.main }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '4px' }}>
                            Expert Mode
                        </div>
                        <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                            Full access to all features including UTXO management, address rotation, and advanced settings.
                        </div>
                    </div>
                </button>
            </div>

            <button
                disabled={!selected}
                onClick={handleContinue}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: selected ? colors.main : colors.buttonBg,
                    border: 'none',
                    borderRadius: '12px',
                    color: selected ? '#000' : colors.textFaded,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: selected ? 'pointer' : 'not-allowed',
                    opacity: selected ? 1 : 0.5,
                    transition: 'all 0.2s'
                }}>
                Continue
            </button>
        </div>
    );
}
