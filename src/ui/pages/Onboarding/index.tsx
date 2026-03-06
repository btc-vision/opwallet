import { useEffect, useMemo, useState } from 'react';

import { Layout, Content } from '@/ui/components';
import { useWallet } from '@/ui/utils';
import { RouteTypes, useNavigate } from '../routeTypes';
import { TOS_ACCEPTED_KEY } from '@/ui/components/AcceptModals/TermsModal';

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

// Ordered list — new steps added here appear in this order.
const STEP_ORDER: StepId[] = ['tos', 'experience', 'display', 'utxo'];

type StepId = keyof typeof STEP_VERSIONS;

const ONBOARDING_STORAGE_KEY = 'opwallet_onboarding';

// Legacy keys — checked for migration from old system
const LEGACY_DONE_KEY = 'opwallet_onboarding_done';
const LEGACY_DISPLAY_KEY = 'opwallet_display_setup_done';
const LEGACY_UTXO_KEY = 'opwallet_utxo_protection_setup_done';

interface OnboardingState {
    [stepId: string]: string; // stepId → completed version
}

function loadState(): OnboardingState {
    try {
        const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as OnboardingState;

        // Migration: if old system marked onboarding as done, mark all current steps as done
        const legacyDone = localStorage.getItem(LEGACY_DONE_KEY) === 'true';
        if (legacyDone) {
            const migrated: OnboardingState = {};
            for (const [id, version] of Object.entries(STEP_VERSIONS)) {
                migrated[id] = version;
            }
            localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(migrated));
            return migrated;
        }

        // Also check individual legacy keys for partial migration
        const state: OnboardingState = {};
        if (localStorage.getItem(TOS_ACCEPTED_KEY) === '1') {
            state.tos = STEP_VERSIONS.tos;
        }
        if (localStorage.getItem(LEGACY_DISPLAY_KEY) === 'true') {
            state.display = STEP_VERSIONS.display;
        }
        if (localStorage.getItem(LEGACY_UTXO_KEY) === 'true') {
            state.utxo = STEP_VERSIONS.utxo;
        }
        // Can't check experience mode from localStorage — it's in wallet API.
        // If TOS was accepted, they likely went through the old experience setup too.
        if (state.tos) {
            state.experience = STEP_VERSIONS.experience;
        }

        if (Object.keys(state).length > 0) {
            localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
            return state;
        }
    } catch {
        // ignore
    }
    return {};
}

function saveStepCompleted(stepId: string) {
    try {
        const state = loadState();
        state[stepId] = STEP_VERSIONS[stepId];
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
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

    // If nothing is pending, navigate away in an effect (not during render)
    useEffect(() => {
        if (!currentStep) {
            setLegacyKeys();
            navigate(RouteTypes.MainScreen);
        }
    }, [currentStep, navigate]);

    if (!currentStep) {
        return null;
    }

    function markDone(stepId: StepId) {
        saveStepCompleted(stepId);
    }

    function goNext() {
        const nextIndex = pendingIndex + 1;
        if (nextIndex >= totalSteps) {
            finishAll();
        } else {
            setPendingIndex(nextIndex);
        }
    }

    function finishAll() {
        setLegacyKeys();
        navigate(RouteTypes.MainScreen);
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
                                    try { localStorage.setItem(TOS_ACCEPTED_KEY, '1'); } catch { /* ignore */ }
                                    markDone('tos');
                                    goNext();
                                }}
                            />
                        )}

                        {currentStep === 'experience' && (
                            <OnboardingExperience
                                wallet={wallet}
                                onContinue={() => {
                                    markDone('experience');
                                    goNext();
                                }}
                            />
                        )}

                        {currentStep === 'display' && (
                            <OnboardingDisplay
                                onContinue={() => {
                                    markDone('display');
                                    goNext();
                                }}
                            />
                        )}

                        {currentStep === 'utxo' && (
                            <OnboardingUTXO
                                wallet={wallet}
                                onContinue={() => {
                                    markDone('utxo');
                                    finishAll();
                                }}
                            />
                        )}
                    </div>
                </div>
            </Content>
        </Layout>
    );
}

/** Set legacy localStorage keys for backward compatibility */
function setLegacyKeys() {
    try {
        localStorage.setItem(LEGACY_DONE_KEY, 'true');
        localStorage.setItem(LEGACY_DISPLAY_KEY, 'true');
        localStorage.setItem(LEGACY_UTXO_KEY, 'true');
    } catch {
        // ignore
    }
}
