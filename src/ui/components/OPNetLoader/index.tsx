import { CSSProperties } from 'react';

import { typography } from '@/ui/theme/typography';

import './index.less';

export interface OPNetLoaderProps {
    size?: number;
    text?: string;
}

const OPNET_ORANGE = '#ee771b';

export function OPNetLoader({ size = 120, text }: OPNetLoaderProps) {
    const ringSize = size * 1.5;
    const logoWidth = size;
    const logoHeight = size * 0.68;

    const containerStyle: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: typography.primary.regular
    };

    const loaderStyle: CSSProperties = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${ringSize}px`,
        height: `${ringSize}px`
    };

    const textStyle: CSSProperties = {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: '14px',
        fontFamily: typography.primary.regular,
        display: 'flex',
        alignItems: 'center',
        gap: '2px'
    };

    return (
        <div style={containerStyle}>
            <div style={loaderStyle}>
                {/* Spinning ring */}
                <svg
                    className="opnet-ring-spin"
                    width={ringSize}
                    height={ringSize}
                    viewBox="0 0 200 200"
                    style={{ position: 'absolute' }}
                >
                    <circle
                        cx="100"
                        cy="100"
                        r="90"
                        fill="none"
                        stroke={OPNET_ORANGE}
                        strokeWidth="2"
                        strokeDasharray="80 420"
                        strokeLinecap="round"
                        style={{
                            filter: 'drop-shadow(0 0 8px rgba(238, 119, 27, 0.6))'
                        }}
                    />
                </svg>

                {/* Pulsing logo */}
                <svg
                    className="opnet-logo-pulse"
                    width={logoWidth}
                    height={logoHeight}
                    viewBox="0 0 165 112"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M164.28 45.35C163.61 20.68 142.85 0.28 118.17 0C109.48 -0.1 101.35 2.21 94.36 6.26C91.78 7.75 91.07 11.17 92.81 13.59C96.26 18.39 98.96 23.75 100.79 29.5C101.8 32.7 105.61 33.73 108.45 31.93C112 29.68 116.42 28.68 121.13 29.6C127.66 30.87 133.08 36.04 134.57 42.53C137.19 53.93 128.6 64.04 117.65 64.04C114.24 64.04 111.07 63.05 108.4 61.34C105.58 59.54 101.78 60.68 100.77 63.87C96.29 77.92 86.5 89.59 73.75 96.54C72.08 97.45 70.99 99.14 70.99 101.04V106.62C70.99 109.42 73.26 111.69 76.06 111.69H95.19C97.99 111.69 100.26 109.42 100.26 106.62V96.86C100.26 93.51 103.43 91.19 106.68 91.99C110.2 92.85 113.87 93.31 117.65 93.31C143.85 93.31 165.01 71.71 164.29 45.35H164.28Z"
                        fill={OPNET_ORANGE}
                    />
                    <path
                        d="M46.66 0C20.89 0 0 20.89 0 46.66C0 72.43 20.89 93.32 46.66 93.32C72.43 93.32 93.32 72.43 93.32 46.66C93.32 20.89 72.43 0 46.66 0ZM46.66 64.05C37.06 64.05 29.27 56.26 29.27 46.66C29.27 37.06 37.06 29.27 46.66 29.27C56.26 29.27 64.05 37.06 64.05 46.66C64.05 56.26 56.26 64.05 46.66 64.05Z"
                        fill="white"
                    />
                </svg>
            </div>

            {/* Loading text */}
            {text && (
                <div style={textStyle}>
                    <span>{text}</span>
                    <span className="opnet-dot-1">.</span>
                    <span className="opnet-dot-2">.</span>
                    <span className="opnet-dot-3">.</span>
                </div>
            )}
        </div>
    );
}
