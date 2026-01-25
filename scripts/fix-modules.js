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
        await fixWindowError2();
        await fixWindowError3();
        await fixMinifiedGlobalThisCrypto();
    } catch (error) {
        console.error('Error during patching:', error.message);
        success = false;
    } finally {
        console.log('Fix modules result:', success ? 'success' : 'failed');
    }
};

run().catch((error) => console.error('Unexpected error during patching process:', error.message));
