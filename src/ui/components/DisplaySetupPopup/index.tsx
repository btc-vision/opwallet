import { useEffect, useState } from 'react';

import {
    useDisplaySettings,
    useUpdateDisplaySettings
} from '@/ui/state/settings/hooks';
import { useIsUnlocked } from '@/ui/state/global/hooks';
import { DisplaySettings } from '@/ui/state/settings/reducer';
import { formatAmount } from '@/ui/utils/formatAmount';
import { getUiType } from '@/ui/utils/uiType';

const DISPLAY_SETUP_KEY = 'opwallet_display_setup_done';

const colors = {
    main: '#f37413',
    background: 'rgba(0, 0, 0, 0.75)',
    cardBg: '#1a1a1a',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    selectedBg: 'rgba(243, 116, 19, 0.15)',
    selectedBorder: '#f37413',
    success: '#4ade80'
};

const DECIMAL_OPTIONS = [
    { id: -1, label: 'Full', desc: 'All decimals as-is' },
    { id: 2, label: '2', desc: '7,754.01' },
    { id: 4, label: '4', desc: '7,754.0137' },
    { id: 8, label: '8', desc: '7,754.01371567' }
];

const PREVIEW_VALUES = [
    { label: 'Token balance', raw: 7754.01371567 },
    { label: 'BTC balance', raw: 3.01594187 },
    { label: 'Dust', raw: 0.00000006 }
];

export default function DisplaySetupPopup() {
    const currentSettings = useDisplaySettings();
    const updateSettings = useUpdateDisplaySettings();
    const isUnlocked = useIsUnlocked();

    // Check localStorage directly for completion flag
    const [hasCompleted, setHasCompleted] = useState(() => {
        try {
            return localStorage.getItem(DISPLAY_SETUP_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const [settings, setSettings] = useState<DisplaySettings>({
        decimalPrecision: 2,
        useKMBNotation: true,
        useCommas: true
    });

    const completeSetup = () => {
        try {
            localStorage.setItem(DISPLAY_SETUP_KEY, 'true');
        } catch {
            // ignore
        }
        setHasCompleted(true);
    };

    // Don't show on website popups (notification windows) -- only main popup or tab
    const uiType = getUiType();
    if (uiType.isNotification) return null;

    // Don't show if user isn't logged in yet
    if (!isUnlocked) return null;

    if (hasCompleted) return null;

    const handleSave = () => {
        updateSettings(settings);
        completeSetup();
    };

    const handleSkip = () => {
        // Keep defaults, just dismiss
        completeSetup();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: colors.background,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
            }}>
            <div
                style={{
                    background: colors.cardBg,
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '360px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '20px 16px'
                }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: colors.main, marginBottom: '4px' }}>
                        Customize Your Wallet
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textFaded, lineHeight: '1.4' }}>
                        Choose how numbers are displayed. You can change these anytime in Settings &gt; Display.
                    </div>
                </div>

                {/* Decimal Precision */}
                <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textFaded, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
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
                                        padding: '8px 4px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${selected ? colors.selectedBorder : 'transparent'}`,
                                        background: selected ? colors.selectedBg : colors.buttonBg,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
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
                    <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textFaded, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
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
                                <span style={{ fontSize: '13px', color: colors.text, fontFamily: 'monospace', fontWeight: 500 }}>
                                    {formatAmount(item.raw, settings)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleSkip}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid #444',
                            background: 'transparent',
                            color: colors.textFaded,
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}>
                        Skip
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            flex: 2,
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: `linear-gradient(135deg, ${colors.main}, #e06000)`,
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                        Apply Settings
                    </button>
                </div>
            </div>
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
                background: enabled ? colors.selectedBg : '#222',
                borderRadius: '10px',
                border: `1.5px solid ${enabled ? colors.selectedBorder : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.15s'
            }}>
            <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>{label}</div>
                <div style={{ fontSize: '11px', color: enabled ? colors.success : colors.textFaded }}>{enabled ? `On (${example})` : 'Off'}</div>
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
