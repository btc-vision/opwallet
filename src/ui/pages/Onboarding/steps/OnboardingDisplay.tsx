import { useState } from 'react';

import { useDisplaySettings, useUpdateDisplaySettings } from '@/ui/state/settings/hooks';
import { DisplaySettings } from '@/ui/state/settings/reducer';
import { formatAmount } from '@/ui/utils/formatAmount';

const DECIMAL_OPTIONS = [
    { id: -1, label: 'Full' },
    { id: 2, label: '2' },
    { id: 4, label: '4' },
    { id: 8, label: '8' }
];

const PREVIEW_VALUES = [
    { label: 'Token balance', raw: 7754.01371567 },
    { label: 'BTC balance', raw: 3.01594187 },
    { label: 'Dust', raw: 0.00000006 }
];

export function OnboardingDisplay({ onContinue }: { onContinue: () => void }) {
    const currentSettings = useDisplaySettings();
    const updateSettings = useUpdateDisplaySettings();

    const [settings, setSettings] = useState<DisplaySettings>({
        decimalPrecision: currentSettings.decimalPrecision ?? 2,
        useKMBNotation: currentSettings.useKMBNotation ?? true,
        useCommas: currentSettings.useCommas ?? true
    });

    const handleContinue = () => {
        updateSettings(settings);
        onContinue();
    };

    return (
        <div>
            <div className="display__header">
                <div className="display__title">Display Preferences</div>
                <div className="display__subtitle">How should numbers be displayed?</div>
            </div>

            {/* Decimal Precision */}
            <div className="section-label">Decimal Places</div>
            <div className="display__decimal-options">
                {DECIMAL_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        className="display__decimal-btn"
                        data-selected={settings.decimalPrecision === opt.id}
                        onClick={() => setSettings({ ...settings, decimalPrecision: opt.id })}>
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Toggles */}
            <div className="display__toggles">
                <div
                    className="display__toggle-row"
                    data-active={settings.useKMBNotation}
                    onClick={() => setSettings({ ...settings, useKMBNotation: !settings.useKMBNotation })}>
                    <div>
                        <div className="display__toggle-label">Large numbers as K/M/B</div>
                        <div className="display__toggle-status">
                            {settings.useKMBNotation ? 'On (1,234,567 → 1.23M)' : 'Off'}
                        </div>
                    </div>
                    <div className="toggle-track" data-active={settings.useKMBNotation}>
                        <div className="toggle-thumb" />
                    </div>
                </div>

                <div
                    className="display__toggle-row"
                    data-active={settings.useCommas}
                    onClick={() => setSettings({ ...settings, useCommas: !settings.useCommas })}>
                    <div>
                        <div className="display__toggle-label">Comma separators</div>
                        <div className="display__toggle-status">
                            {settings.useCommas ? 'On (7754 → 7,754)' : 'Off'}
                        </div>
                    </div>
                    <div className="toggle-track" data-active={settings.useCommas}>
                        <div className="toggle-thumb" />
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="section-label">Preview</div>
            <div className="display__preview">
                {PREVIEW_VALUES.map((item, i) => (
                    <div key={item.label} className="display__preview-row">
                        <span className="display__preview-label">{item.label}</span>
                        <span className="display__preview-value">{formatAmount(item.raw, settings)}</span>
                    </div>
                ))}
            </div>

            <button onClick={handleContinue} className="btn btn-primary">
                Continue
            </button>
        </div>
    );
}
