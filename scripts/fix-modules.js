import fs from 'fs/promises';

const patchFile = async (filePath, searchValue, replaceValue) => {
    try {
        const fileData = await fs.readFile(filePath, 'utf-8');

        const regex =
            typeof searchValue === 'string'
                ? new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
                : searchValue;

        const updatedData = fileData.replace(regex, replaceValue);

        if (fileData !== updatedData) {
            await fs.writeFile(filePath, updatedData, 'utf-8');
            console.log(`Patched ${filePath}`);
        } else {
            console.log(`No changes made to ${filePath}.`);
        }
    } catch (error) {
        console.error(`Failed to patch ${filePath}:`, error.message);
    }
};

const fixWindowError = async () => {
    const file = './node_modules/bitcore-lib/lib/crypto/random.js';
    const searchValue = `Random.getRandomBufferBrowser = function(size) {
  if (!window.crypto && !window.msCrypto)
    throw new Error('window.crypto not available');

  if (window.crypto && window.crypto.getRandomValues)
    var crypto = window.crypto;
  else if (window.msCrypto && window.msCrypto.getRandomValues) //internet explorer
    var crypto = window.msCrypto;
  else
    throw new Error('window.crypto.getRandomValues not available');

  var bbuf = new Uint8Array(size);
  crypto.getRandomValues(bbuf);
  var buf = Buffer.from(bbuf);

  return buf;
};`;
    const replaceValue = `Random.getRandomBufferBrowser = function(size) {
  var bbuf = new Uint8Array(size);
  crypto.getRandomValues(bbuf);
  var buf = Buffer.from(bbuf);

  return buf;
};`;

    await patchFile(file, searchValue, replaceValue);
};

const fixWindowError2 = async () => {
    const file = './node_modules/tiny-secp256k1/lib/rand.browser.js';
    await patchFile(file, 'window.crypto', 'crypto');
};

const fixWindowError3 = async () => {
    const file = './node_modules/@btc-vision/bitcoin/build/payments/p2tr.js';
    const searchValue = 'signature: types_1.typeforce.maybe(types_1.typeforce.BufferN(64))';
    const replaceValue = 'signature: types_1.typeforce.maybe(types_1.typeforce.Buffer)';
    await patchFile(file, searchValue, replaceValue);
};

const fixBufferError = async () => {
    const file = './node_modules/bitcore-lib/lib/crypto/signature.js';
    const searchValue = `var Signature = function Signature(r, s) {
  if (!(this instanceof Signature)) {
    return new Signature(r, s);
  }
  if (r instanceof BN) {
    this.set({
      r: r,
      s: s
    });
  } else if (r) {
    var obj = r;
    this.set(obj);
  }
};`;
    const replaceValue = `var Signature = function Signature(r, s) {
  if (!(this instanceof Signature)) {
    return new Signature(r, s);
  }
  if (r instanceof BN) {
    this.set({
      r: r,
      s: s
    });
  } else if (r) {
    var obj = r;
    this.set(obj);
  }

  this.r = BN.fromString(this.r.toString(16), 16);
  this.s = BN.fromString(this.s.toString(16), 16);
};`;

    await patchFile(file, searchValue, replaceValue);
};

const fixMinifiedGlobalThisCrypto = async () => {
    const file = './node_modules/@btc-vision/transaction/browser/index.js';
    const searchValue = `if(fa&&"function"==typeof fa.getRandomValues){var r=new Uint8Array(t);return fa.getRandomValues(r),la.from(r)}`;
    const replaceValue = `if(globalThis.crypto&&"function"==typeof globalThis.crypto.getRandomValues){var r=new Uint8Array(t);return globalThis.crypto.getRandomValues(r),la.from(r)}`;
    await patchFile(file, searchValue, replaceValue);
};

const run = async () => {
    console.log('Starting patching process...');
    let success = true;
    try {
        await fixWindowError();
        await fixWindowError2();
        await fixWindowError3();
        await fixBufferError();
        await fixMinifiedGlobalThisCrypto();
    } catch (error) {
        console.error('Error during patching:', error.message);
        success = false;
    } finally {
        console.log('Fix modules result:', success ? 'success' : 'failed');
    }
};

run().catch((error) => console.error('Unexpected error during patching process:', error.message));
