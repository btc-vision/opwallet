/**
 * Decode a Base64 string into a Uint8Array.
 * Uses the native atob() available in both browser and service worker contexts.
 */
export function fromBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Encode a Uint8Array into a Base64 string.
 * Uses the native btoa() available in both browser and service worker contexts.
 */
export function toBase64(bytes: Uint8Array): string {
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
}
