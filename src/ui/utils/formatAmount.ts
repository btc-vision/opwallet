/**
 * Display formatting utility for token amounts.
 * DISPLAY ONLY -- never use on input fields or internal state.
 * Uses BigNumber.js for precision (no floating point errors).
 */

import BigNumber from 'bignumber.js';

// Never use scientific notation in BigNumber output
BigNumber.config({ EXPONENTIAL_AT: [-20, 20] });

export interface DisplaySettings {
    /** Decimal precision: -1 = full/current behavior, 0/2/4/8 = fixed decimals */
    decimalPrecision: number;
    /** Use K/M/B notation for large numbers */
    useKMBNotation: boolean;
    /** Use comma separators for thousands */
    useCommas: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
    decimalPrecision: -1, // full decimals (current behavior)
    useKMBNotation: false,
    useCommas: false
};

/**
 * Format a token amount for display based on user settings.
 *
 * Rules:
 * - If all defaults, returns the original string representation (no change)
 * - Small/dust amounts (< 0.001) ALWAYS preserve significant digits
 * - K/M/B: 1234567 -> "1.23M"
 * - Commas: 7754.01 -> "7,754.01"
 * - Decimal precision: truncates display to N decimal places (ROUND_DOWN)
 *
 * @param amount - The raw amount (string or number)
 * @param settings - User display settings
 * @returns Formatted string for display
 */
export function formatAmount(amount: string | number | bigint, settings?: DisplaySettings): string {
    const cfg = settings || DEFAULT_DISPLAY_SETTINGS;

    // Parse into BigNumber
    let bn: BigNumber;
    if (typeof amount === 'bigint') {
        bn = new BigNumber(amount.toString());
    } else if (typeof amount === 'string') {
        bn = new BigNumber(amount.replace(/,/g, ''));
    } else {
        bn = new BigNumber(amount);
    }

    if (bn.isNaN()) return String(amount);

    // If all defaults, return as-is (BigNumber.toString() never uses scientific notation with our config)
    if (cfg.decimalPrecision === -1 && !cfg.useKMBNotation && !cfg.useCommas) {
        return bn.toString();
    }

    if (bn.isZero()) return '0';

    // Small/dust amounts: ALWAYS preserve significant digits regardless of settings
    const abs = bn.abs();
    if (abs.isGreaterThan(0) && abs.isLessThan(0.001)) {
        // toPrecision(2) then trim trailing zeros (e.g. "0.000000060" -> "0.00000006")
        return bn.toPrecision(2).replace(/0+$/, '').replace(/\.$/, '');
    }

    // K/M/B notation (if enabled)
    if (cfg.useKMBNotation) {
        if (abs.isGreaterThanOrEqualTo(1_000_000_000)) {
            return addCommasIfEnabled(bn.dividedBy(1e9).toFixed(2, BigNumber.ROUND_DOWN), cfg.useCommas) + 'B';
        }
        if (abs.isGreaterThanOrEqualTo(1_000_000)) {
            return addCommasIfEnabled(bn.dividedBy(1e6).toFixed(2, BigNumber.ROUND_DOWN), cfg.useCommas) + 'M';
        }
        if (abs.isGreaterThanOrEqualTo(10_000)) {
            return addCommasIfEnabled(bn.dividedBy(1e3).toFixed(2, BigNumber.ROUND_DOWN), cfg.useCommas) + 'K';
        }
    }

    // Apply decimal precision
    let formatted: string;
    if (cfg.decimalPrecision >= 0) {
        formatted = bn.toFixed(cfg.decimalPrecision, BigNumber.ROUND_DOWN);
    } else {
        formatted = bn.toString();
    }

    // Apply comma separators
    if (cfg.useCommas) {
        formatted = addCommas(formatted);
    }

    return formatted;
}

/**
 * Add comma separators to a numeric string.
 */
function addCommas(numStr: string): string {
    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

/**
 * Conditionally add commas to a number string.
 */
function addCommasIfEnabled(numStr: string, enabled: boolean): string {
    return enabled ? addCommas(numStr) : numStr;
}
