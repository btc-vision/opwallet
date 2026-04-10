// Minimal `crypto` shim for the background bundle.
//
// opnet, @btc-vision/transaction and @btc-vision/bitcoin only touch four
// functions from Node's `crypto` module:
//
//   - createHash
//   - createHmac
//   - pbkdf2Sync
//   - randomBytes
//
// The full `crypto-browserify` package transitively pulls in elliptic, asn1.js,
// public-encrypt, create-ecdh and 5 copies of bn.js (~600 KB) just to provide
// the legacy cipher / public-key APIs that nothing here uses. Even the slim
// sub-packages (create-hash + ripemd160 + readable-stream + ...) it composes
// add up to ~170 KB. We bypass all of that by re-implementing the four
// functions on top of @noble/hashes, which is already in the bundle (~30 KB)
// because opnet/@btc-vision/transaction depend on it directly.

import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js';
import { md5, ripemd160, sha1 } from '@noble/hashes/legacy.js';
import { hmac } from '@noble/hashes/hmac.js';
import { pbkdf2 as noblePbkdf2 } from '@noble/hashes/pbkdf2.js';

const HASHES = {
    sha256,
    sha384,
    sha512,
    sha1,
    md5,
    ripemd160,
    rmd160: ripemd160
};

function resolveHash(algorithm) {
    const key = String(algorithm).toLowerCase();
    const fn = HASHES[key];
    if (!fn) {
        throw new Error(`crypto shim: unsupported hash algorithm "${algorithm}"`);
    }
    return fn;
}

function toBytes(data, encoding) {
    if (data instanceof Uint8Array) return data;
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof data === 'string') {
        if (encoding === 'hex') {
            const len = data.length / 2;
            const out = new Uint8Array(len);
            for (let i = 0; i < len; i++) out[i] = parseInt(data.substr(i * 2, 2), 16);
            return out;
        }
        if (encoding === 'base64') {
            const bin = atob(data);
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
        }
        return new TextEncoder().encode(data);
    }
    throw new TypeError('crypto shim: unsupported data type');
}

function toBufferOrEncoded(bytes, encoding) {
    if (!encoding) return Buffer.from(bytes);
    if (encoding === 'hex') {
        let s = '';
        for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
        return s;
    }
    if (encoding === 'base64') {
        let s = '';
        for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
        return btoa(s);
    }
    return Buffer.from(bytes).toString(encoding);
}

class HashWrapper {
    constructor(hashFn) {
        this._hash = hashFn.create();
    }
    update(data, encoding) {
        this._hash.update(toBytes(data, encoding));
        return this;
    }
    digest(encoding) {
        return toBufferOrEncoded(this._hash.digest(), encoding);
    }
}

class HmacWrapper {
    constructor(hashFn, key) {
        this._hmac = hmac.create(hashFn, toBytes(key));
    }
    update(data, encoding) {
        this._hmac.update(toBytes(data, encoding));
        return this;
    }
    digest(encoding) {
        return toBufferOrEncoded(this._hmac.digest(), encoding);
    }
}

export function createHash(algorithm) {
    return new HashWrapper(resolveHash(algorithm));
}

export function createHmac(algorithm, key) {
    return new HmacWrapper(resolveHash(algorithm), key);
}

export function randomBytes(size) {
    const out = new Uint8Array(size);
    globalThis.crypto.getRandomValues(out);
    return Buffer.from(out);
}

export function pbkdf2Sync(password, salt, iterations, keylen, digest) {
    const hashFn = resolveHash(digest || 'sha1');
    const key = noblePbkdf2(hashFn, toBytes(password), toBytes(salt), { c: iterations, dkLen: keylen });
    return Buffer.from(key);
}

export function pbkdf2(password, salt, iterations, keylen, digest, callback) {
    if (typeof digest === 'function') {
        callback = digest;
        digest = undefined;
    }
    try {
        const result = pbkdf2Sync(password, salt, iterations, keylen, digest);
        queueMicrotask(() => callback(null, result));
    } catch (err) {
        queueMicrotask(() => callback(err));
    }
}

export default {
    createHash,
    createHmac,
    randomBytes,
    pbkdf2,
    pbkdf2Sync
};
