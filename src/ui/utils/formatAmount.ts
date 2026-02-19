/**
 * Display formatting utility for token amounts.
 * DISPLAY ONLY -- never use on input fields or internal state.
 */

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
 * - Decimal precision: rounds display to N decimal places
 * 
 * @param amount - The raw amount (string or number)
 * @param settings - User display settings
 * @returns Formatted string for display
 */
export function formatAmount(amount: string | number | bigint, settings?: DisplaySettings): string {
    const cfg = settings || DEFAULT_DISPLAY_SETTINGS;

    // If all defaults, return as-is (current behavior)
    if (cfg.decimalPrecision === -1 && !cfg.useKMBNotation && !cfg.useCommas) {
        return typeof amount === 'bigint' ? amount.toString() : String(amount);
    }

    let num: number;
    if (typeof amount === 'bigint') {
        num = Number(amount);
    } else if (typeof amount === 'string') {
        // Remove existing commas before parsing
        num = parseFloat(amount.replace(/,/g, ''));
    } else {
        num = amount;
    }

    if (isNaN(num)) return String(amount);
    if (num === 0) return '0';

    // Small/dust amounts: ALWAYS preserve significant digits regardless of settings
    if (Math.abs(num) > 0 && Math.abs(num) < 0.001) {
        return num.toPrecision(2);
    }

    // K/M/B notation (if enabled)
    if (cfg.useKMBNotation) {
        if (Math.abs(num) >= 1_000_000_000) {
            return addCommasIfEnabled(formatFixed(num / 1e9, 2), cfg.useCommas) + 'B';
        }
        if (Math.abs(num) >= 1_000_000) {
            return addCommasIfEnabled(formatFixed(num / 1e6, 2), cfg.useCommas) + 'M';
        }
        if (Math.abs(num) >= 10_000) {
            return addCommasIfEnabled(formatFixed(num / 1e3, 2), cfg.useCommas) + 'K';
        }
    }

    // Apply decimal precision
    let formatted: string;
    if (cfg.decimalPrecision >= 0) {
        formatted = formatFixed(num, cfg.decimalPrecision);
    } else {
        formatted = String(num);
    }

    // Apply comma separators
    if (cfg.useCommas) {
        formatted = addCommas(formatted);
    }

    return formatted;
}

/**
 * Format number to fixed decimal places, trimming trailing zeros.
 */
function formatFixed(num: number, decimals: number): string {
    if (decimals === 0) return Math.round(num).toString();

    const fixed = num.toFixed(decimals);
    // Don't trim trailing zeros for user-specified precision
    return fixed;
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
