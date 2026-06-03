import { CSSProperties } from 'react';

import { colors } from '@/ui/theme/colors';
import { typography } from '@/ui/theme/typography';

export type Sizes = keyof typeof $sizeStyles;

export const $sizeStyles = {
    xxxl: { fontSize: 32, lineHeight: 'normal' } as CSSProperties,
    xxl: { fontSize: 24, lineHeight: 'normal' } as CSSProperties,
    xl: { fontSize: 20, lineHeight: 'normal' } as CSSProperties,
    lg: { fontSize: 18, lineHeight: 'normal' } as CSSProperties,
    md: { fontSize: 16, lineHeight: 'normal' } as CSSProperties,
    sm: { fontSize: 14, lineHeight: 'normal' } as CSSProperties,
    xs: { fontSize: 12, lineHeight: 'normal' } as CSSProperties,
    xxs: { fontSize: 10, lineHeight: 'normal' } as CSSProperties,
    xxxs: { fontSize: 8, lineHeight: 'normal' } as CSSProperties
};

const $baseStyle: CSSProperties = Object.assign({}, $sizeStyles.sm, {
    fontFamily: typography.primary.regular,
    color: colors.white,
    textAlign: 'left',
    userSelect: 'none'
} as CSSProperties);

export const $textPresets = {
    large: Object.assign({}, $baseStyle, $sizeStyles.xl),

    title: Object.assign({}, $baseStyle, $sizeStyles.lg),
    'title-bold': Object.assign({}, $baseStyle, $sizeStyles.lg, {
        fontFamily: typography.primary.bold
    }),

    regular: Object.assign({}, $baseStyle, $sizeStyles.sm),
    'regular-bold': Object.assign({}, $baseStyle, $sizeStyles.sm, {
        fontFamily: typography.primary.bold
    }),

    bold: Object.assign({}, $baseStyle, $sizeStyles.sm, {
        fontFamily: typography.primary.bold
    }),

    sub: Object.assign({}, $baseStyle, $sizeStyles.xs, {
        color: colors.white_muted
    }),
    'sub-bold': Object.assign({}, $baseStyle, $sizeStyles.xs, {
        fontFamily: typography.primary.bold,
        color: colors.white_muted
    }),

    link: Object.assign({}, $baseStyle, $sizeStyles.xs, {
        color: colors.blue,
        textDecorationLine: 'underline'
    } as CSSProperties),
    default: $baseStyle
};

export type Presets = keyof typeof $textPresets;
