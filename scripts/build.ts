import { execSync } from 'child_process';
import fs from 'fs';
import archiver from 'archiver';
import minimist from 'minimist';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;
const validVersion = version.split('-beta')[0];
const brandName = 'opwallet';

// Parse command line arguments
const knownOptions = {
    string: ['browser', 'manifest', 'mode'],
    default: {
        browser: 'chrome',
        manifest: 'mv3',
        mode: 'production'
    }
};

const supported_browsers = ['chrome', 'firefox', 'edge', 'brave', 'opera'];
const supported_mvs = ['mv2', 'mv3'];

const options = minimist(process.argv.slice(2), knownOptions);

// Validate options
if (!supported_browsers.includes(options.browser)) {
    console.error(`Not supported browser: [${options.browser}]. It should be one of ${supported_browsers.join(', ')}.`);
    process.exit(1);
}

if (!supported_mvs.includes(options.manifest)) {
    console.error(`Not supported manifest: [${options.manifest}]. It should be one of ${supported_mvs.join(', ')}.`);
    process.exit(1);
}

// Build function
async function build() {
    console.log(`Building ${brandName} for ${options.browser} with ${options.manifest}...`);

    // Set environment variables for Vite
    const env = {
        ...process.env,
        BROWSER: options.browser,
        MANIFEST: options.manifest,
        VERSION: validVersion,
        CHANNEL: options.mode === 'production' ? 'stable' : 'dev'
    };

    // Run Vite build
    try {
        console.log('Running Vite build...');
        execSync(`vite build --mode ${options.mode}`, {
            stdio: 'inherit',
            env
        });
        console.log('Build complete!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

// Package function (creates zip file)
async function createPackage(): Promise<void> {
    return new Promise((resolve, reject) => {
        const outputFile = `./dist/${brandName}-${options.browser}-v${version}.zip`;
        const output = fs.createWriteStream(outputFile);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            console.log(`✓ Zip created: ${outputFile} (${archive.pointer()} bytes)`);
            resolve();
        });

        archive.on('error', (err) => {
            console.error(`Error while zipping:`, err);
            reject(err);
        });

        archive.pipe(output);
        archive.directory('dist/', false);
        archive.finalize();
    });
}

// Development build with watch mode
async function buildDev() {
    console.log(`Starting development build for ${options.browser} with ${options.manifest}...`);

    const env = {
        ...process.env,
        BROWSER: options.browser,
        MANIFEST: options.manifest,
        VERSION: '0.0.0',
        CHANNEL: 'dev'
    };

    try {
        execSync(`vite build --watch --mode development`, {
            stdio: 'inherit',
            env
        });
    } catch (error) {
        console.error('Dev build failed:', error);
        process.exit(1);
    }
}

// Main execution
async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'build':
            await build();
            if (options.mode === 'production') {
                await createPackage();
            }
            break;
        case 'dev':
            await buildDev();
            break;
        case 'package':
            await createPackage();
            break;
        default:
            console.log('Usage:');
            console.log('  npm run build:ext -- --browser=chrome --manifest=mv3');
            console.log('  npm run dev:ext -- --browser=chrome --manifest=mv3');
            console.log('  npm run package:ext -- --browser=chrome --manifest=mv3');
    }
}

main().catch(console.error);
