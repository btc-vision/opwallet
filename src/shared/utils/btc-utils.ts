// BTC utility functions - no React dependencies
// For use in both background and UI contexts

import BigNumber from 'bignumber.js';

export const satoshisToBTC = (amount: number) => {
    return amount / 100000000;
};

export function satoshisToAmount(val: number) {
    const num = new BigNumber(val);
    return num.dividedBy(100000000).toFixed(8);
}

export function amountToSatoshis(val: string | number) {
    const num = new BigNumber(val);
    return num.multipliedBy(100000000).toNumber();
}

export function shortAddress(address?: string, len = 5) {
    if (!address) return '';
    if (address.length <= len * 2) return address;
    return address.slice(0, len) + '...' + address.slice(address.length - len);
}

export function shortDesc(desc?: string, len = 50) {
    if (!desc) return '';
    if (desc.length <= len) return desc;
    return desc.slice(0, len) + '...';
}

export function shortUtxo(txid: string, vout: number): string {
    return `${txid.slice(0, 8)}...:${vout}`;
}

export async function sleep(timeSec: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(null);
        }, timeSec * 1000);
    });
}

export function isValidAddress(address: string) {
    if (!address) return false;
    return true;
}

export function copyToClipboard(textToCopy: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(textToCopy);
    }
    return Promise.resolve();
}
