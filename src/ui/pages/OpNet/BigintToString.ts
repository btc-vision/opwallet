import BigNumber from 'bignumber.js';

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
