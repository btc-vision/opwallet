import { useState } from 'react';
import { CheckCircleFilled } from '@ant-design/icons';
import { faRocket, faBolt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import type { WalletController } from '@/ui/utils/WalletContext';

type Mode = 'simple' | 'expert';

interface ModeOption {
    mode: Mode;
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
        iconColor: '#4ade80',
        features: ['Streamlined dashboard', 'Hidden technical details', 'Easier navigation'],
    },
    {
        mode: 'expert',
        title: 'Expert Mode',
        description: 'Full control for power users',
        icon: faBolt,
        iconColor: '#a78bfa',
        features: ['MLDSA & BTC badges visible', 'Full address visibility', 'Advanced features'],
    },
];

export function OnboardingExperience({
    wallet,
    onContinue,
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
            <div className="experience__header">
                <div className="experience__title">Choose Your Experience</div>
                <div className="experience__subtitle">You can change this anytime in Settings</div>
            </div>

            <div className="experience__cards">
                {modeOptions.map((option) => {
                    const isSelected = selected === option.mode;
                    return (
                        <button
                            key={option.mode}
                            type="button"
                            className={`experience__card ${isSelected ? 'experience__card--selected' : ''}`}
                            data-mode={option.mode}
                            style={{
                                borderColor: isSelected ? option.iconColor : undefined,
                                background: isSelected ? `${option.iconColor}10` : undefined,
                            }}
                            onClick={() => setSelected(option.mode)}>
                            {isSelected && (
                                <CheckCircleFilled
                                    className="experience__card-check"
                                    style={{ color: option.iconColor }}
                                />
                            )}

                            <div className="experience__card-icon-row">
                                <div
                                    className="experience__card-icon"
                                    style={{ background: `${option.iconColor}20` }}>
                                    <FontAwesomeIcon
                                        icon={option.icon}
                                        style={{ fontSize: 20, color: option.iconColor }}
                                    />
                                </div>
                                <div>
                                    <div className="experience__card-title">{option.title}</div>
                                    <div className="experience__card-desc">{option.description}</div>
                                </div>
                            </div>

                            <div className="experience__card-features">
                                {option.features.map((feature, i) => (
                                    <div key={i} className="experience__card-feature">
                                        <span
                                            className="experience__card-dot"
                                            style={{ background: option.iconColor }}
                                        />
                                        <span className="experience__card-feature-text">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                disabled={!selected}
                onClick={handleContinue}
                className={`btn ${selected ? 'btn-primary' : 'btn-disabled'}`}>
                Continue
            </button>
        </div>
    );
}
