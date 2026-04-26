import { CSSProperties } from 'react';

import { ColorTypes } from '@/ui/theme/colors';
import { showLongNumber } from '@/ui/utils';

import { BaseView, BaseViewProps } from '../BaseView';
import { $sizeStyles, $textPresets, Presets, Sizes } from './presets';

export type { Sizes };

export interface TextProps extends BaseViewProps {
    text?: string | number;
    preset?: Presets;
    size?: Sizes;
    color?: ColorTypes;
    textCenter?: boolean;
    textEnd?: boolean;
    wrap?: boolean;
    selectText?: boolean;
    disableTranslate?: boolean;
    digital?: boolean;
    ellipsis?: boolean;
}

export function Text(props: TextProps) {
    const {
        size,
        text,
        textCenter,
        textEnd,
        wrap,
        selectText,
        disableTranslate,
        ellipsis,
        style: $styleOverride,
        ...rest
    } = props;
    const preset: Presets = props.preset ?? 'regular';
    const $textStyle = Object.assign(
        {},
        $textPresets[preset],
        size ? $sizeStyles[size] : {},
        textCenter ? { textAlign: 'center' } : {},
        textEnd ? { textAlign: 'end' } : {},
        wrap ? { overflowWrap: 'anywhere' } : {},
        selectText ? { userSelect: 'text' } : {},
        ellipsis
            ? {
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
              }
            : {}
    ) as CSSProperties;
    const $style = Object.assign({}, $textStyle, $styleOverride);
    const textUse = props.digital ? showLongNumber(text) : text;
    return (
        <BaseView style={$style} {...rest}>
            {disableTranslate ? <span translate="no">{textUse}</span> : textUse}
        </BaseView>
    );
}
