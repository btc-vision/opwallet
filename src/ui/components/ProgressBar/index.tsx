import React from 'react';

interface ProgressBarProps {
    percentage: number;
    color?: string;
    backgroundColor?: string;
    height?: number;
    showPercentage?: boolean;
    animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    percentage,
    color = '#f37413',
    backgroundColor = '#303030',
    height = 6,
    showPercentage = false,
    animated = true
}) => {
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

    return (
        <div style={{ width: '100%' }}>
            <div
                style={{
                    width: '100%',
                    height: `${height}px`,
                    backgroundColor,
                    borderRadius: `${height / 2}px`,
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                <div
                    style={{
                        width: `${clampedPercentage}%`,
                        height: '100%',
                        backgroundColor: color,
                        transition: animated ? 'width 0.3s ease' : 'none',
                        borderRadius: `${height / 2}px`
                    }}
                />
            </div>
            {showPercentage && (
                <div
                    style={{
                        fontSize: '11px',
                        color: '#999',
                        marginTop: '6px',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                    }}>
                    {clampedPercentage.toFixed(0)}%
                </div>
            )}
        </div>
    );
};
