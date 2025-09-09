import archiver from 'archiver';
import fs from 'fs';
import minimist from 'minimist';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;
const brandName = 'opwallet';

const knownOptions = {
    string: ['browser'],
    default: {
        browser: 'chrome'
    }
};

const options = minimist(process.argv.slice(2), knownOptions);

async function createPackage(): Promise<void> {
    return new Promise((resolve, reject) => {
        const outputFile = `./dist/${brandName}-${options.browser}-v${version}.zip`;
        const output = fs.createWriteStream(outputFile);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            const size = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`✓ Package created: ${outputFile} (${size} MB)`);
            resolve();
        });

        archive.on('error', (err) => {
            console.error(`Error creating package:`, err);
            reject(err);
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Warning:', err);
            } else {
                throw err;
            }
        });

        archive.pipe(output);

        // Only add files from the specific browser directory
        archive.glob('**/*', {
            cwd: `dist/${options.browser}`, // Changed from 'dist' to 'dist/${options.browser}'
            ignore: ['*.zip']
        });

        archive.finalize();
    });
}

createPackage().catch((error) => {
    console.error('Failed to create package:', error);
    process.exit(1);
});
