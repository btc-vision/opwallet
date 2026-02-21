import BigNumber from 'bignumber.js';

import { DisplaySettings } from '@/ui/utils/formatAmount';

const units = ['', 'K', 'M', 'B', 'T', 'Q'];

function formatTruncated(bn: BigNumber, sigDigits = 3): string {
    if (bn.isZero()) return '0';

    if (bn.isGreaterThanOrEqualTo(1)) {
        return bn.decimalPlaces(sigDigits, BigNumber.ROUND_DOWN).toFixed(sigDigits);
    } else {
        let fixed = bn.toFixed(20);
        fixed = fixed.replace(/0+$/, '');
        const parts = fixed.split('.');
        if (parts.length < 2) return fixed;
        const decimals = parts[1];
        const leadingZerosMatch = decimals.match(/^0*/);
        const zerosCount = leadingZerosMatch ? leadingZerosMatch[0].length : 0;
        const requiredDecimals = zerosCount + sigDigits;
        let result = bn.decimalPlaces(requiredDecimals, BigNumber.ROUND_DOWN).toFixed(requiredDecimals);
        result = result.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.$/, '');
        return result;
    }
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
 * Original formatBalance -- used when display settings are at defaults.
 */
export function formatBalance(balance: BigNumber, sigDigits = 3): string {
    let unitIndex = 0;
    let value = new BigNumber(balance);
    while (value.isGreaterThanOrEqualTo(1000) && unitIndex < units.length - 1) {
        value = value.dividedBy(1000);
        unitIndex++;
    }
    const formatted = formatTruncated(value, sigDigits);
    return formatted + units[unitIndex];
}

/**
 * Display-settings-aware formatBalance.
 * If settings are all defaults, falls back to original behavior.
 * Otherwise applies user preferences (decimal precision, K/M/B, commas).
 */
export function formatBalanceWithSettings(balance: BigNumber, settings?: DisplaySettings | null, sigDigits = 3): string {
    // If no settings or all defaults, use original behavior
    if (!settings || (settings.decimalPrecision === -1 && !settings.useKMBNotation && !settings.useCommas)) {
        return formatBalance(balance, sigDigits);
    }

    if (balance.isZero()) return '0';

    const num = balance.toNumber();

    // Small/dust amounts: always preserve significant digits (never scientific notation)
    if (Math.abs(num) > 0 && Math.abs(num) < 0.001) {
        const absNum = Math.abs(num);
        const leadingZeros = Math.floor(-Math.log10(absNum));
        const decPlaces = leadingZeros + 2;
        return balance.toFixed(Math.min(decPlaces, 20)).replace(/0+$/, '').replace(/\.$/, '');
    }

    // K/M/B notation
    if (settings.useKMBNotation) {
        let unitIndex = 0;
        let value = new BigNumber(balance);
        while (value.isGreaterThanOrEqualTo(1000) && unitIndex < units.length - 1) {
            value = value.dividedBy(1000);
            unitIndex++;
        }
        if (unitIndex > 0) {
            const dp = settings.decimalPrecision >= 0 ? settings.decimalPrecision : 2;
            let formatted = value.decimalPlaces(dp, BigNumber.ROUND_DOWN).toFixed(dp);
            if (settings.useCommas) formatted = addCommas(formatted);
            return formatted + units[unitIndex];
        }
    }

    // Apply decimal precision
    let formatted: string;
    if (settings.decimalPrecision >= 0) {
        formatted = balance.decimalPlaces(settings.decimalPrecision, BigNumber.ROUND_DOWN).toFixed(settings.decimalPrecision);
    } else {
        formatted = formatTruncated(balance, sigDigits);
    }

    // Apply commas
    if (settings.useCommas) {
        formatted = addCommas(formatted);
    }

    return formatted;
}
