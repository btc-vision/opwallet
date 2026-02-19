import BigNumber from 'bignumber.js';
import { describe, expect, it } from 'vitest';

import { formatBalance, formatBalanceWithSettings } from '@/ui/pages/OpNet/BigintToString';
import { DisplaySettings } from '@/ui/utils/formatAmount';

describe('formatBalance (original behavior)', () => {
    it('formats zero', () => {
        expect(formatBalance(new BigNumber(0))).toBe('0');
    });

    it('formats small number with 3 sig digits after decimal', () => {
        // Original uses formatTruncated with sigDigits=3
        expect(formatBalance(new BigNumber('3.01594187'))).toBe('3.015');
    });

    it('formats thousands with K (divides at 1000)', () => {
        // 7754 / 1000 = 7.754
        expect(formatBalance(new BigNumber(7754))).toBe('7.754K');
    });

    it('formats millions with M', () => {
        expect(formatBalance(new BigNumber(1234567))).toBe('1.234M');
    });

    it('formats sub-1 number preserving significant digits', () => {
        const result = formatBalance(new BigNumber('0.00000006'));
        expect(parseFloat(result)).toBeCloseTo(0.00000006, 10);
    });
});

describe('formatBalanceWithSettings', () => {
    describe('defaults fallback to original behavior', () => {
        it('null settings uses original', () => {
            const result = formatBalanceWithSettings(new BigNumber(7754), null);
            expect(result).toBe(formatBalance(new BigNumber(7754)));
        });

        it('default settings uses original', () => {
            const defaults: DisplaySettings = {
                decimalPrecision: -1,
                useKMBNotation: false,
                useCommas: false
            };
            const result = formatBalanceWithSettings(new BigNumber(7754), defaults);
            expect(result).toBe(formatBalance(new BigNumber(7754)));
        });
    });

    describe('decimal precision', () => {
        it('0 decimals', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 0,
                useKMBNotation: false,
                useCommas: false
            };
            expect(formatBalanceWithSettings(new BigNumber('7754.01371567'), settings)).toBe('7754');
        });

        it('2 decimals (rounds down)', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 2,
                useKMBNotation: false,
                useCommas: false
            };
            expect(formatBalanceWithSettings(new BigNumber('7754.01371567'), settings)).toBe('7754.01');
        });

        it('4 decimals', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 4,
                useKMBNotation: false,
                useCommas: false
            };
            expect(formatBalanceWithSettings(new BigNumber('7754.01371567'), settings)).toBe('7754.0137');
        });
    });

    describe('K/M/B notation (threshold at 1K, same as original)', () => {
        const settings: DisplaySettings = {
            decimalPrecision: -1,
            useKMBNotation: true,
            useCommas: false
        };

        it('thousands use K', () => {
            // 45000 / 1000 = 45.00K
            const result = formatBalanceWithSettings(new BigNumber(45000), settings);
            expect(result).toBe('45.00K');
        });

        it('millions use M', () => {
            // 1500000 / 1000 = 1500 / 1000 = 1.50M
            const result = formatBalanceWithSettings(new BigNumber(1500000), settings);
            expect(result).toBe('1.50M');
        });

        it('below 1K falls through to truncated formatting', () => {
            const result = formatBalanceWithSettings(new BigNumber(999), settings);
            // Below 1000, no K/M/B applied -> formatTruncated(999, 3)
            expect(result).toBe('999.000');
        });

        it('exactly 1000 uses K', () => {
            const result = formatBalanceWithSettings(new BigNumber(1000), settings);
            expect(result).toBe('1.00K');
        });
    });

    describe('commas', () => {
        const settings: DisplaySettings = {
            decimalPrecision: 2,
            useKMBNotation: false,
            useCommas: true
        };

        it('adds commas to thousands', () => {
            expect(formatBalanceWithSettings(new BigNumber('7754.01371567'), settings)).toBe('7,754.01');
        });

        it('adds commas to millions', () => {
            expect(formatBalanceWithSettings(new BigNumber('1234567.89'), settings)).toBe('1,234,567.89');
        });
    });

    describe('dust amounts preserved', () => {
        it('very small amount preserves digits even with 0 decimals', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 0,
                useKMBNotation: false,
                useCommas: false
            };
            const result = formatBalanceWithSettings(new BigNumber('0.00000006'), settings);
            expect(parseFloat(result)).toBeCloseTo(0.00000006, 10);
            expect(result).not.toBe('0');
        });
    });

    describe('combined settings', () => {
        it('K/M/B + commas + 2 decimals on large number', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 2,
                useKMBNotation: true,
                useCommas: true
            };
            expect(formatBalanceWithSettings(new BigNumber(50000), settings)).toBe('50.00K');
        });

        it('commas + 4 decimals with K/M/B on 9999 -> K notation', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 4,
                useKMBNotation: true,
                useCommas: true
            };
            // 9999 >= 1000 -> 9.9991K with 4 decimal places
            expect(formatBalanceWithSettings(new BigNumber('9999.123456'), settings)).toBe('9.9991K');
        });

        it('commas + 4 decimals WITHOUT K/M/B on 9999', () => {
            const settings: DisplaySettings = {
                decimalPrecision: 4,
                useKMBNotation: false,
                useCommas: true
            };
            expect(formatBalanceWithSettings(new BigNumber('9999.123456'), settings)).toBe('9,999.1234');
        });
    });
});
