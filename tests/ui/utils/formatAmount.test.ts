import { describe, expect, it } from 'vitest';

import { formatAmount, DisplaySettings, DEFAULT_DISPLAY_SETTINGS } from '@/ui/utils/formatAmount';

describe('formatAmount', () => {
    // =============================================
    // DEFAULT BEHAVIOR (no settings change)
    // =============================================
    describe('defaults (current behavior preserved)', () => {
        it('returns string as-is with default settings', () => {
            expect(formatAmount('7754.01371567')).toBe('7754.01371567');
        });

        it('returns number as-is with default settings', () => {
            expect(formatAmount(1234.5678)).toBe('1234.5678');
        });

        it('returns bigint as string with default settings', () => {
            expect(formatAmount(BigInt(999999))).toBe('999999');
        });

        it('explicit default settings returns as-is', () => {
            expect(formatAmount('51.53181685', DEFAULT_DISPLAY_SETTINGS)).toBe('51.53181685');
        });

        it('zero stays zero', () => {
            expect(formatAmount(0)).toBe('0');
            expect(formatAmount('0')).toBe('0');
        });
    });

    // =============================================
    // DECIMAL PRECISION
    // =============================================
    describe('decimal precision', () => {
        const settings = (dp: number): DisplaySettings => ({
            decimalPrecision: dp,
            useKMBNotation: false,
            useCommas: false
        });

        it('0 decimals rounds to whole number', () => {
            expect(formatAmount(7754.01371567, settings(0))).toBe('7754');
        });

        it('2 decimals', () => {
            expect(formatAmount(7754.01371567, settings(2))).toBe('7754.01');
        });

        it('4 decimals', () => {
            expect(formatAmount(7754.01371567, settings(4))).toBe('7754.0137');
        });

        it('8 decimals', () => {
            expect(formatAmount(7754.01371567, settings(8))).toBe('7754.01371567');
        });

        it('8 decimals pads with zeros', () => {
            expect(formatAmount(100, settings(8))).toBe('100.00000000');
        });

        it('0 decimals with string input', () => {
            expect(formatAmount('51.53181685', settings(0))).toBe('52');
        });

        it('2 decimals with string input', () => {
            expect(formatAmount('51.53181685', settings(2))).toBe('51.53');
        });
    });

    // =============================================
    // K/M/B NOTATION
    // =============================================
    describe('K/M/B notation', () => {
        const settings: DisplaySettings = {
            decimalPrecision: -1,
            useKMBNotation: true,
            useCommas: false
        };

        it('billions', () => {
            expect(formatAmount(1234567890, settings)).toBe('1.23B');
        });

        it('millions', () => {
            expect(formatAmount(1234567, settings)).toBe('1.23M');
        });

        it('ten-thousands use K', () => {
            expect(formatAmount(45000, settings)).toBe('45.00K');
        });

        it('below 10K stays as-is', () => {
            expect(formatAmount(9999, settings)).toBe('9999');
        });

        it('exactly 10000', () => {
            expect(formatAmount(10000, settings)).toBe('10.00K');
        });

        it('negative millions', () => {
            expect(formatAmount(-5500000, settings)).toBe('-5.50M');
        });
    });

    // =============================================
    // COMMA SEPARATORS
    // =============================================
    describe('comma separators', () => {
        const settings: DisplaySettings = {
            decimalPrecision: -1,
            useKMBNotation: false,
            useCommas: true
        };

        it('adds commas to thousands', () => {
            expect(formatAmount(7754.01371567, settings)).toBe('7,754.01371567');
        });

        it('adds commas to millions', () => {
            expect(formatAmount(1234567.89, settings)).toBe('1,234,567.89');
        });

        it('no commas needed for small numbers', () => {
            expect(formatAmount(999.5, settings)).toBe('999.5');
        });

        it('handles string with existing commas', () => {
            expect(formatAmount('1,234,567.89', settings)).toBe('1,234,567.89');
        });
    });

    // =============================================
    // COMBINED SETTINGS
    // =============================================
    describe('combined settings', () => {
        it('2 decimals + commas', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 2,
                useKMBNotation: false,
                useCommas: true
            };
            expect(formatAmount(7754.01371567, settings)).toBe('7,754.01');
        });

        it('K/M/B + commas (commas apply to K/M/B number)', () => {
            const settings: DisplaySettings = {
                decimalPrecision: -1,
                useKMBNotation: true,
                useCommas: true
            };
            // 1.23B -- no commas needed in the abbreviated number
            expect(formatAmount(1234567890, settings)).toBe('1.23B');
        });

        it('K/M/B + commas + decimals with sub-10K number', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 2,
                useKMBNotation: true,
                useCommas: true
            };
            // 9999 is below 10K threshold, so K/M/B doesn't apply
            expect(formatAmount(9999.12345, settings)).toBe('9,999.12');
        });

        it('all on with large number', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 4,
                useKMBNotation: true,
                useCommas: true
            };
            expect(formatAmount(50000, settings)).toBe('50.00K');
        });
    });

    // =============================================
    // DUST / SMALL AMOUNTS
    // =============================================
    describe('dust amounts (always preserve significant digits)', () => {
        it('very small number preserves precision regardless of decimal setting', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 0,
                useKMBNotation: false,
                useCommas: false
            };
            // 0.00000006 should NOT become "0" -- must preserve significant digits
            const result = formatAmount(0.00000006, settings);
            expect(parseFloat(result)).toBeCloseTo(0.00000006, 10);
            expect(result).not.toBe('0');
        });

        it('dust with 2 decimals still shows significant digits', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 2,
                useKMBNotation: false,
                useCommas: false
            };
            // toPrecision(2) on 0.0000345 = "0.000034" (2 sig digits)
            const result = formatAmount(0.0000345, settings);
            expect(parseFloat(result)).toBeCloseTo(0.000034, 6);
        });

        it('dust with defaults stays as-is', () => {
            expect(formatAmount(0.00000006)).toBe('6e-8');
        });

        it('threshold: 0.001 is NOT dust', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 0,
                useKMBNotation: false,
                useCommas: false
            };
            expect(formatAmount(0.001, settings)).toBe('0');
        });

        it('just below threshold IS dust', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 0,
                useKMBNotation: false,
                useCommas: false
            };
            const result = formatAmount(0.0009, settings);
            expect(parseFloat(result)).toBeCloseTo(0.0009, 6);
        });
    });

    // =============================================
    // EDGE CASES
    // =============================================
    describe('edge cases', () => {
        it('NaN input returns original string', () => {
            expect(formatAmount('not-a-number', { decimalPrecision: 2, useKMBNotation: false, useCommas: false })).toBe('not-a-number');
        });

        it('empty string returns empty string', () => {
            expect(formatAmount('')).toBe('');
        });

        it('bigint zero', () => {
            expect(formatAmount(BigInt(0), { decimalPrecision: 2, useKMBNotation: false, useCommas: false })).toBe('0');
        });

        it('very large bigint', () => {
            const settings: DisplaySettings = {
                decimalPrecision: -1,
                useKMBNotation: true,
                useCommas: false
            };
            expect(formatAmount(BigInt('50000000000'), settings)).toBe('50.00B');
        });

        it('negative number with commas', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 2,
                useKMBNotation: false,
                useCommas: true
            };
            expect(formatAmount(-1234567.89, settings)).toBe('-1,234,567.89');
        });
    });
});
