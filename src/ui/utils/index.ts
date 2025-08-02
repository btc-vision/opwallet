import BigNumber from 'bignumber.js';
import { useLocation } from 'react-router-dom';

export * from './hooks';
export * from './WalletContext';
const UI_TYPE = {
    Tab: 'index',
    Pop: 'popup',
    Notification: 'notification'
};

interface UiTypeCheck {
    isTab: boolean;
    isNotification: boolean;
    isPop: boolean;

    [key: string]: boolean;
}

export const getUiType = (): UiTypeCheck => {
    const { pathname } = window.location;
    return Object.entries(UI_TYPE).reduce<UiTypeCheck>(
        (m, [key, value]) => {
            m[`is${key}`] = pathname === `/${value}.html`;

            return m;
        },
        { isNotification: false, isPop: false, isTab: false }
    );
};

export const satoshisToBTC = (amount: number) => {
    return amount / 100000000;
};

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
    return !!address;
}

export const copyToClipboard = async (textToCopy: string | number): Promise<void> => {
    const text = textToCopy.toString();

    // Try the modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch (err) {
            // If Clipboard API fails, fall through to the legacy approach
            console.warn('Clipboard API failed, falling back to legacy method:', err);
        }
    }

    // Legacy fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Make textarea invisible and move it off-screen
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        // Use execCommand as fallback, acknowledging it's deprecated
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('Copy command was unsuccessful');
        }
    } catch (err) {
        throw new Error('Failed to copy text to clipboard');
    } finally {
        document.body.removeChild(textArea);
    }
};

export function satoshisToAmount(val: number) {
    const num = new BigNumber(val);
    return num.dividedBy(100000000).toFixed(8);
}

export function amountToSatoshis(val: string | number) {
    const num = new BigNumber(val);
    return num.multipliedBy(100000000).toNumber();
}

export function useLocationState<T>() {
    const location = useLocation();
    return location.state as T;
}

export function numberWithCommas(value: string, maxFixed: number, isFixed = false) {
    const [integerPart, decimalPart] = value.toString().split('.');
    const integerPartWithCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (maxFixed === 0) {
        // no decimal
        return integerPartWithCommas;
    } else if (maxFixed > 0) {
        if (isFixed) {
            // fixed
            return `${integerPartWithCommas}.${(decimalPart || '').substring(0, maxFixed).padEnd(maxFixed, '0')}`;
        } else {
            return decimalPart
                ? `${integerPartWithCommas}.${decimalPart.substring(0, Math.min(maxFixed, decimalPart.length))}`
                : integerPartWithCommas;
        }
    } else {
        // fixed <0 show all decimal
        return decimalPart ? `${integerPartWithCommas}.${decimalPart}` : integerPartWithCommas;
    }
}

export function showLongNumber(num: string | number | undefined, maxFixed = 8, isFixed = false) {
    if (!num || new BigNumber(num).isZero()) return '0';
    if (Math.abs(num as number) < 0.000001 && maxFixed <= 6) {
        let temp = '0.';
        for (let i = 0; i < maxFixed; i += 1) {
            temp += '0';
        }
        return temp;
    }
    return numberWithCommas(num.toString(), maxFixed, isFixed);
}

BigNumber.config({ EXPONENTIAL_AT: 1e9, DECIMAL_PLACES: 38 });
