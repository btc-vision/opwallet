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

const run = async () => {
    console.log('Starting patching process...');
    let success = true;
    try {
        // All previous patches (tiny-secp256k1, p2tr.js, transaction crypto) have been
        // removed as they are no longer needed with @btc-vision/bitcoin v7,
        // @btc-vision/ecpair v4, and @btc-vision/transaction v1.8.
        console.log('No patches needed for current package versions.');
    } catch (error) {
        console.error('Error during patching:', error.message);
        success = false;
    } finally {
        console.log('Fix modules result:', success ? 'success' : 'failed');
    }
};

run().catch((error) => console.error('Unexpected error during patching process:', error.message));
