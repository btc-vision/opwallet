export const STEP_VERSIONS: Record<string, string> = {
    tos: '4',
    experience: '2',
    display: '2',
    utxo: '2'
};

export type StepId = keyof typeof STEP_VERSIONS;

export const STEP_ORDER: StepId[] = ['tos', 'experience', 'display', 'utxo'];

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

export function saveStepCompleted(stepId: string) {
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
