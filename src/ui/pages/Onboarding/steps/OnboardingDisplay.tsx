import { useState } from 'react';

import { useDisplaySettings, useUpdateDisplaySettings } from '@/ui/state/settings/hooks';
import { DisplaySettings } from '@/ui/state/settings/reducer';
import { formatAmount } from '@/ui/utils/formatAmount';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    buttonBg: '#434343'
};

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
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: colors.text }}>
                    Display Preferences
                </div>
                <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                    How should numbers be displayed?
                </div>
            </div>

            {/* Decimal Precision */}
            <div style={{ marginBottom: '14px' }}>
                <div
                    style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: colors.textFaded,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px'
                    }}>
                    Decimal Places
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {DECIMAL_OPTIONS.map((opt) => {
                        const selected = settings.decimalPrecision === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setSettings({ ...settings, decimalPrecision: opt.id })}
                                style={{
                                    flex: 1,
                                    padding: '10px 4px',
                                    borderRadius: '10px',
                                    border: `1.5px solid ${selected ? colors.main : 'transparent'}`,
                                    background: selected ? `${colors.main}15` : colors.buttonBg,
                                    color: selected ? colors.main : colors.text,
                                    fontSize: '13px',
                                    fontWeight: selected ? 600 : 400,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    textAlign: 'center'
                                }}>
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <ToggleRow
                    label="Large numbers as K/M/B"
                    example="1,234,567 → 1.23M"
                    enabled={settings.useKMBNotation}
                    onToggle={() => setSettings({ ...settings, useKMBNotation: !settings.useKMBNotation })}
                />
                <ToggleRow
                    label="Comma separators"
                    example="7754 → 7,754"
                    enabled={settings.useCommas}
                    onToggle={() => setSettings({ ...settings, useCommas: !settings.useCommas })}
                />
            </div>

            {/* Preview */}
            <div style={{ marginBottom: '16px' }}>
                <div
                    style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: colors.textFaded,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px'
                    }}>
                    Preview
                </div>
                <div style={{ background: '#222', borderRadius: '10px', padding: '10px' }}>
                    {PREVIEW_VALUES.map((item, i) => (
                        <div
                            key={item.label}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 0',
                                borderBottom: i < PREVIEW_VALUES.length - 1 ? '1px solid #333' : 'none'
                            }}>
                            <span style={{ fontSize: '11px', color: colors.textFaded }}>{item.label}</span>
                            <span
                                style={{
                                    fontSize: '13px',
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                    fontWeight: 500
                                }}>
                                {formatAmount(item.raw, settings)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={handleContinue}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: colors.main,
                    border: 'none',
                    borderRadius: '12px',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}>
                Continue
            </button>
        </div>
    );
}

function ToggleRow({
    label,
    example,
    enabled,
    onToggle
}: {
    label: string;
    example: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <div
            onClick={onToggle}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: enabled ? `${colors.main}10` : '#222',
                borderRadius: '10px',
                border: `1.5px solid ${enabled ? colors.main : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.15s'
            }}>
            <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>{label}</div>
                <div style={{ fontSize: '11px', color: enabled ? colors.success : colors.textFaded }}>
                    {enabled ? `On (${example})` : 'Off'}
                </div>
            </div>
            <div
                style={{
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    background: enabled ? colors.main : colors.buttonBg,
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    marginLeft: '8px'
                }}>
                <div
                    style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '9px',
                        background: '#fff',
                        position: 'absolute',
                        top: '2px',
                        left: enabled ? '20px' : '2px',
                        transition: 'left 0.2s'
                    }}
                />
            </div>
        </div>
    );
}
