import { useState } from 'react';

import { Column, Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useDisplaySettings, useUpdateDisplaySettings } from '@/ui/state/settings/hooks';
import { DisplaySettings } from '@/ui/state/settings/reducer';
import { CheckCircleFilled, FontSizeOutlined, InfoCircleOutlined, NumberOutlined, RightOutlined } from '@ant-design/icons';
import { Popover } from '@/ui/components/Popover';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

const DECIMAL_OPTIONS = [
    { id: -1, label: 'Full (default)', description: 'Show all decimal places as-is' },
    { id: 0, label: 'None', description: 'Round to whole numbers (e.g. 7,754)' },
    { id: 2, label: '2 decimals', description: 'e.g. 7,754.01' },
    { id: 4, label: '4 decimals', description: 'e.g. 7,754.0137' },
    { id: 8, label: '8 decimals', description: 'e.g. 7,754.01371567' }
];

export default function DisplaySettingsScreen() {
    const tools = useTools();
    const displaySettings = useDisplaySettings();
    const updateDisplaySettings = useUpdateDisplaySettings();
    const [decimalPopoverVisible, setDecimalPopoverVisible] = useState(false);

    const currentDecimalOption = DECIMAL_OPTIONS.find((o) => o.id === displaySettings.decimalPrecision) || DECIMAL_OPTIONS[0];

    const handleToggle = (key: keyof DisplaySettings) => {
        const newSettings: DisplaySettings = {
            ...displaySettings,
            [key]: !displaySettings[key as keyof DisplaySettings]
        };
        updateDisplaySettings(newSettings);
        tools.toastSuccess('Display settings updated');
    };

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Display Settings" />
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '12px',
                    paddingBottom: '40px'
                }}>
                {/* Info Card */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                    <InfoCircleOutlined
                        style={{
                            fontSize: 13,
                            color: colors.textFaded,
                            marginTop: '1px',
                            flexShrink: 0
                        }}
                    />
                    <div>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.text,
                                fontWeight: 500,
                                marginBottom: '3px'
                            }}>
                            Number Formatting
                        </div>
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.textFaded,
                                lineHeight: '1.3'
                            }}>
                            Customize how token amounts and balances are displayed. These settings only affect the visual
                            display and never change the actual values. Very small amounts (dust) always preserve their
                            significant digits.
                        </div>
                    </div>
                </div>

                {/* Settings List */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        overflow: 'hidden'
                    }}>
                    {/* Decimal Precision */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            borderBottom: `1px solid ${colors.containerBorder}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={() => setDecimalPopoverVisible(true)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: colors.buttonHoverBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '12px'
                            }}>
                            <NumberOutlined style={{ fontSize: 18, color: colors.main }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Decimal Precision
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: colors.main,
                                    fontWeight: 500
                                }}>
                                {currentDecimalOption.label}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                How many decimal places to show
                            </div>
                        </div>
                        <RightOutlined style={{ fontSize: 12, color: colors.textFaded }} />
                    </div>

                    {/* K/M/B Notation Toggle */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            borderBottom: `1px solid ${colors.containerBorder}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={() => handleToggle('useKMBNotation')}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: colors.buttonHoverBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '12px'
                            }}>
                            <FontSizeOutlined style={{ fontSize: 18, color: colors.main }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Large Number Notation
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: displaySettings.useKMBNotation ? colors.success : colors.textFaded,
                                    fontWeight: 500
                                }}>
                                {displaySettings.useKMBNotation ? 'On (1,234,567 \u2192 1.23M)' : 'Off'}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                Show K, M, B for large numbers
                            </div>
                        </div>
                        {/* Toggle Switch */}
                        <div
                            style={{
                                width: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                background: displaySettings.useKMBNotation ? colors.main : colors.buttonBg,
                                position: 'relative',
                                transition: 'background 0.2s',
                                cursor: 'pointer'
                            }}>
                            <div
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '10px',
                                    background: colors.text,
                                    position: 'absolute',
                                    top: '2px',
                                    left: displaySettings.useKMBNotation ? '22px' : '2px',
                                    transition: 'left 0.2s'
                                }}
                            />
                        </div>
                    </div>

                    {/* Comma Separators Toggle */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onClick={() => handleToggle('useCommas')}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: colors.buttonHoverBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '12px'
                            }}>
                            <span style={{ fontSize: 18, color: colors.main, fontWeight: 700 }}>,</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: colors.text,
                                    marginBottom: '2px',
                                    fontFamily: 'Inter-Regular, serif'
                                }}>
                                Comma Separators
                            </div>
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: displaySettings.useCommas ? colors.success : colors.textFaded,
                                    fontWeight: 500
                                }}>
                                {displaySettings.useCommas ? 'On (7754 \u2192 7,754)' : 'Off'}
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                Add thousand separators to numbers
                            </div>
                        </div>
                        {/* Toggle Switch */}
                        <div
                            style={{
                                width: '44px',
                                height: '24px',
                                borderRadius: '12px',
                                background: displaySettings.useCommas ? colors.main : colors.buttonBg,
                                position: 'relative',
                                transition: 'background 0.2s',
                                cursor: 'pointer'
                            }}>
                            <div
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '10px',
                                    background: colors.text,
                                    position: 'absolute',
                                    top: '2px',
                                    left: displaySettings.useCommas ? '22px' : '2px',
                                    transition: 'left 0.2s'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Preview Card */}
                <div
                    style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: colors.textFaded,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: '20px',
                        marginBottom: '10px',
                        paddingLeft: '4px'
                    }}>
                    Preview
                </div>
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '14px',
                        padding: '14px',
                        overflow: 'hidden'
                    }}>
                    <PreviewRow label="Large balance" raw={1234567.89012345} settings={displaySettings} />
                    <PreviewRow label="Normal balance" raw={7754.01371567} settings={displaySettings} />
                    <PreviewRow label="Small amount" raw={51.53181685} settings={displaySettings} />
                    <PreviewRow label="Dust amount" raw={0.00000006} settings={displaySettings} />
                    <PreviewRow label="BTC balance" raw={3.01594187} settings={displaySettings} isLast />
                </div>
            </div>

            {decimalPopoverVisible && (
                <DecimalPopover
                    currentValue={displaySettings.decimalPrecision}
                    onSelect={(value) => {
                        updateDisplaySettings({
                            ...displaySettings,
                            decimalPrecision: value
                        });
                        tools.toastSuccess('Decimal precision updated');
                        setDecimalPopoverVisible(false);
                    }}
                    onCancel={() => setDecimalPopoverVisible(false)}
                />
            )}
        </Layout>
    );
}

// Import for preview
import { formatAmount } from '@/ui/utils/formatAmount';

function PreviewRow({
    label,
    raw,
    settings,
    isLast
}: {
    label: string;
    raw: number;
    settings: DisplaySettings;
    isLast?: boolean;
}) {
    const formatted = formatAmount(raw, settings);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: isLast ? 'none' : `1px solid ${colors.containerBorder}`
            }}>
            <span style={{ fontSize: '12px', color: colors.textFaded }}>{label}</span>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: colors.text, fontWeight: 500, fontFamily: 'monospace' }}>
                    {formatted}
                </div>
                <div style={{ fontSize: '10px', color: colors.textFaded, fontFamily: 'monospace' }}>{String(raw)}</div>
            </div>
        </div>
    );
}

function DecimalPopover({
    currentValue,
    onSelect,
    onCancel
}: {
    currentValue: number;
    onSelect: (value: number) => void;
    onCancel: () => void;
}) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    return (
        <Popover onClose={onCancel}>
            <Column style={{ width: '100%' }}>
                <div
                    style={{
                        textAlign: 'center',
                        paddingBottom: '12px',
                        borderBottom: `1px solid ${colors.containerBorder}`
                    }}>
                    <div
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: colors.text,
                            marginBottom: '4px',
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        Decimal Precision
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textFaded }}>
                        Choose how many decimal places to display
                    </div>
                </div>

                <div style={{ margin: '12px 0' }}>
                    {DECIMAL_OPTIONS.map((option) => {
                        const isSelected = option.id === currentValue;
                        const isHovered = option.id === hoveredId;

                        return (
                            <div
                                key={option.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px',
                                    marginBottom: '6px',
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`
                                        : isHovered
                                          ? colors.buttonBg
                                          : colors.buttonHoverBg,
                                    border: `1px solid ${isSelected ? colors.main : 'transparent'}`,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    position: 'relative'
                                }}
                                onClick={() => onSelect(option.id)}
                                onMouseEnter={() => setHoveredId(option.id)}
                                onMouseLeave={() => setHoveredId(null)}>
                                {isSelected && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: '3px',
                                            background: colors.main,
                                            borderRadius: '10px 0 0 10px'
                                        }}
                                    />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: '13px',
                                            fontWeight: isSelected ? 600 : 500,
                                            color: colors.text,
                                            fontFamily: 'Inter-Regular, serif'
                                        }}>
                                        {option.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            color: colors.textFaded,
                                            marginTop: '2px'
                                        }}>
                                        {option.description}
                                    </div>
                                </div>
                                {isSelected && (
                                    <CheckCircleFilled style={{ fontSize: 14, color: colors.main, marginLeft: '8px' }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                <button
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: colors.buttonHoverBg,
                        border: `1px solid ${colors.containerBorder}`,
                        borderRadius: '10px',
                        color: colors.text,
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'Inter-Regular, serif'
                    }}
                    onClick={onCancel}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.buttonBg;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.buttonHoverBg;
                    }}>
                    Cancel
                </button>
            </Column>
        </Popover>
    );
}
