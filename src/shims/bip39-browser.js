// Drop-in `bip39` shim backed by `@scure/bip39`.
//
// `@btc-vision/transaction`'s Mnemonic class imports `* as bip39 from 'bip39'`
// and only uses three functions: `validateMnemonic`, `mnemonicToSeedSync`, and
// `generateMnemonic`. The bip39 npm package, by contrast, eagerly tries to
// `require()` every wordlist at load time (chinese_simplified, chinese_traditional,
// czech, french, italian, japanese, korean, portuguese, spanish, plus english) —
// ~220 KB of JSON we have no use for. @scure/bip39 ships the same algorithms in
// a tree-shakeable form and is already pulled into the bundle by other packages,
// so re-exporting from it costs essentially nothing.

import { wordlist as english } from '@scure/bip39/wordlists/english.js';
import {
    generateMnemonic as scureGenerateMnemonic,
    mnemonicToSeedSync as scureMnemonicToSeedSync,
    validateMnemonic as scureValidateMnemonic
} from '@scure/bip39';

export function validateMnemonic(phrase, wordlist) {
    return scureValidateMnemonic(phrase, wordlist ?? english);
}

export function mnemonicToSeedSync(phrase, passphrase) {
    return Buffer.from(scureMnemonicToSeedSync(phrase, passphrase));
}

export function generateMnemonic(strength = 128, _rng, wordlist) {
    return scureGenerateMnemonic(wordlist ?? english, strength);
}

export const wordlists = { english };

export default {
    validateMnemonic,
    mnemonicToSeedSync,
    generateMnemonic,
    wordlists
};
