import { useEffect, useState } from 'react';

import { useWallet } from '@/ui/utils';

export type ExperienceMode = 'simple' | 'expert' | undefined;

interface UseExperienceModeResult {
    mode: ExperienceMode;
    isSet: boolean;
    loading: boolean;
    setMode: (mode: ExperienceMode) => Promise<void>;
}

export function useExperienceMode(): UseExperienceModeResult {
    const wallet = useWallet();
    const [mode, setModeState] = useState<ExperienceMode>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMode = async () => {
            try {
                const currentMode = await wallet.getExperienceMode();
                setModeState(currentMode);
            } catch (error) {
                console.error('Failed to load experience mode:', error);
            } finally {
                setLoading(false);
            }
        };

        void loadMode();
    }, [wallet]);

    const setMode = async (newMode: ExperienceMode) => {
        await wallet.setExperienceMode(newMode);
        setModeState(newMode);
    };

    return {
        mode,
        isSet: mode !== undefined,
        loading,
        setMode
    };
}

export function useSimpleModeEnabled(): boolean {
    const { mode, loading } = useExperienceMode();
    // While loading, or if not set, default to expert mode behavior (show everything)
    if (loading || mode === undefined) {
        return false;
    }
    return mode === 'simple';
}

export function useExpertModeEnabled(): boolean {
    const { mode, loading } = useExperienceMode();
    // While loading, or if not set, default to expert mode behavior
    if (loading || mode === undefined) {
        return true;
    }
    return mode === 'expert';
}
