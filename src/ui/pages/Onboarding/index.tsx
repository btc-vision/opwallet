import { useEffect, useMemo, useState } from 'react';

import { Layout, Content } from '@/ui/components';
import { useWallet } from '@/ui/utils';
import { RouteTypes, useNavigate } from '../routeTypes';

import { OnboardingTOS } from './steps/OnboardingTOS';
import { OnboardingExperience } from './steps/OnboardingExperience';
import { OnboardingDisplay } from './steps/OnboardingDisplay';
import { OnboardingUTXO } from './steps/OnboardingUTXO';

// ─── Versioned step registry ───
// Bump a step's version to force it to re-show for existing users.
// Add new steps here — they'll auto-show for anyone who hasn't completed them.
const STEP_VERSIONS: Record<string, string> = {
    tos: '1',
    experience: '1',
    display: '1',
    utxo: '1'
};

const STEP_ORDER: StepId[] = ['tos', 'experience', 'display', 'utxo'];

type StepId = keyof typeof STEP_VERSIONS;

const ONBOARDING_KEY = 'opwallet_onboarding_v2';

interface OnboardingState {
    [stepId: string]: string;
}

function loadState(): OnboardingState {
    try {
        const raw = localStorage.getItem(ONBOARDING_KEY);
        if (raw) return JSON.parse(raw) as OnboardingState;
    } catch {
        // ignore
    }
    return {};
}

function saveStepCompleted(stepId: string) {
    try {
        const state = loadState();
        state[stepId] = STEP_VERSIONS[stepId];
        localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
    } catch {
        // ignore
    }
}

/** Check which steps still need to be shown. */
export function getPendingSteps(): StepId[] {
    const state = loadState();
    return STEP_ORDER.filter((id) => state[id] !== STEP_VERSIONS[id]);
}

/** Returns true if all steps are completed at their current versions. */
export function isOnboardingComplete(): boolean {
    return getPendingSteps().length === 0;
}

const colors = {
    main: '#f37413',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBorder: '#303030'
};

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
            <Content style={{ padding: '0' }}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Progress bar */}
                    <div style={{ padding: '16px 16px 0' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {pendingSteps.map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: '3px',
                                        borderRadius: '2px',
                                        background: i <= pendingIndex ? colors.main : colors.containerBorder,
                                        transition: 'background 0.3s'
                                    }}
                                />
                            ))}
                        </div>
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.textFaded,
                                textAlign: 'right',
                                marginTop: '6px'
                            }}>
                            {pendingIndex + 1} / {totalSteps}
                        </div>
                    </div>

                    {/* Step content */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 16px' }}>
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
