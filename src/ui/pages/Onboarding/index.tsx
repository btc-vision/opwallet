import { useEffect, useMemo, useState } from 'react';

import { Content, Layout } from '@/ui/components';
import { useWallet } from '@/ui/utils';
import { RouteTypes, useNavigate } from '../routeTypes';

import { OnboardingTOS } from './steps/OnboardingTOS';
import { OnboardingExperience } from './steps/OnboardingExperience';
import { OnboardingDisplay } from './steps/OnboardingDisplay';
import { OnboardingUTXO } from './steps/OnboardingUTXO';
import { getPendingSteps, saveStepCompleted } from './state';
import './onboarding.css';

export default function OnboardingScreen() {
    const wallet = useWallet();
    const navigate = useNavigate();

    const pendingSteps = useMemo(() => getPendingSteps(), []);
    const [pendingIndex, setPendingIndex] = useState(0);

    const currentStep = pendingSteps[pendingIndex];
    const totalSteps = pendingSteps.length;

    useEffect(() => {
        if (!currentStep) {
            navigate(RouteTypes.MainScreen);
        }
    }, [currentStep, navigate]);

    if (!currentStep) {
        return null;
    }

    function goNext() {
        const nextIndex = pendingIndex + 1;
        if (nextIndex >= totalSteps) {
            navigate(RouteTypes.MainScreen);
        } else {
            setPendingIndex(nextIndex);
        }
    }

    return (
        <Layout>
            <Content style={{ padding: 0 }}>
                <div className="onboarding">
                    <div className="onboarding__progress">
                        <div className="onboarding__progress-bar">
                            {pendingSteps.map((_, i) => (
                                <div key={i} className="onboarding__progress-segment" data-active={i <= pendingIndex} />
                            ))}
                        </div>
                        <div className="onboarding__progress-count">
                            {pendingIndex + 1} / {totalSteps}
                        </div>
                    </div>

                    <div className="onboarding__content">
                        {currentStep === 'tos' && (
                            <OnboardingTOS
                                onAccept={() => {
                                    saveStepCompleted('tos');
                                    goNext();
                                }}
                            />
                        )}

                        {currentStep === 'experience' && (
                            <OnboardingExperience
                                wallet={wallet}
                                onContinue={() => {
                                    saveStepCompleted('experience');
                                    goNext();
                                }}
                            />
                        )}

                        {currentStep === 'display' && (
                            <OnboardingDisplay
                                onContinue={() => {
                                    saveStepCompleted('display');
                                    goNext();
                                }}
                            />
                        )}

                        {currentStep === 'utxo' && (
                            <OnboardingUTXO
                                wallet={wallet}
                                onContinue={() => {
                                    saveStepCompleted('utxo');
                                    goNext();
                                }}
                            />
                        )}
                    </div>
                </div>
            </Content>
        </Layout>
    );
}
