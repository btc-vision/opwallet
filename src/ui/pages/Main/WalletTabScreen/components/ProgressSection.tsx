import React, { CSSProperties } from 'react';

interface ProgressSectionProps {
    title?: string;
    label: string;
    currentValue: number;
    maxValue: number;
    warningThreshold?: number;
    colors: {
        main: string;
        containerBorder: string;
        success: string;
        error: string;
        warning: string;
    };
    noBreakStyle: CSSProperties;
    showMaxValue?: boolean;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
    title,
    label,
    currentValue,
    maxValue,
    warningThreshold,
    colors,
    noBreakStyle,
    showMaxValue = true
}) => {
    const percentage = Math.min((currentValue / maxValue) * 100, 100);

    const getProgressColor = () => {
        if (currentValue >= maxValue) return colors.error;
        if (warningThreshold && currentValue >= warningThreshold) return colors.warning;
        return colors.success;
    };

    const progressColor = getProgressColor();

    if (currentValue === 0) {
        return null;
    }

    return (
        <div
            style={{
                marginBottom: title ? '8px' : '6px',
                paddingTop: title ? '8px' : '0px',
                borderTop: title ? `1px solid ${colors.containerBorder}` : 'none'
            }}>
            {title && (
                <div
                    style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: colors.main,
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                    {title}
                </div>
            )}
            {/* Single row container */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '8px',
                    marginBottom: '4px',
                    alignItems: 'center'
                }}>
                {/* Label */}
                <div
                    style={{
                        width: '110px',
                        minWidth: '110px',
                        flexShrink: 0,
                        textAlign: 'left'
                    }}>
                    <span
                        style={{
                            ...noBreakStyle,
                            color: progressColor,
                            fontWeight: 600,
                            fontSize: '11px'
                        }}>
                        {label}
                    </span>
                </div>

                {/* Progress bar container with relative positioning */}
                <div
                    style={{
                        flex: 1,
                        position: 'relative'
                    }}>
                    {/* Progress bar */}
                    <div
                        style={{
                            width: '100%',
                            height: '4px',
                            backgroundColor: colors.containerBorder,
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}>
                        <div
                            style={{
                                width: `${percentage}%`,
                                height: '100%',
                                backgroundColor: progressColor,
                                transition: 'width 0.3s ease, background-color 0.3s ease'
                            }}
                        />
                    </div>
                    
                    {/* Value text positioned at bottom right */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '-12px',
                            right: '0',
                            fontSize: '9px',
                            color: '#666',
                            fontWeight: 500
                        }}>
                        {currentValue || '0'}
                        {showMaxValue && ` / ${maxValue}`}
                    </div>
                </div>
            </div>
        </div>
    );
};
