import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path, { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import eslint from 'vite-plugin-eslint2';
import checker from 'vite-plugin-checker';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import fs from 'fs';
import archiver from 'archiver';
import tailwindcss from '@tailwindcss/vite';

// Get package version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version.split('-beta')[0];

// Custom plugin to handle manifest generation for MV3
function manifestPlugin(): PluginOption {
    return {
        name: 'manifest-plugin',
        writeBundle() {
            const browser = process.env.BROWSER || 'chrome';

            // Load base manifest
            const basePath = resolve(__dirname, 'build/_raw/manifest/_base_v3.json');
            const browserPath = resolve(__dirname, `build/_raw/manifest/${browser}.json`);

            if (!fs.existsSync(basePath)) {
                console.error(`Base manifest not found at ${basePath}`);
                return;
            }

            let baseManifest = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
            let browserManifest = {};

            // Load browser-specific manifest if it exists
            if (fs.existsSync(browserPath)) {
                browserManifest = JSON.parse(fs.readFileSync(browserPath, 'utf-8'));
                console.log(`Loading browser-specific manifest from ${browserPath}`);
            } else {
                console.warn(`No browser-specific manifest found for ${browser}`);
            }

            // Merge manifests (browser-specific overrides base)
            const manifest = {
                ...baseManifest,
                ...browserManifest,
                // Always set the version from package.json
                version: version
            };

            // Ensure background service worker has type: module for MV3
            if (manifest.background && manifest.background.service_worker) {
                manifest.background.type = 'module';
            }

            // Remove incorrect type: module from content_scripts
            if (manifest.content_scripts) {
                manifest.content_scripts = manifest.content_scripts.map((script: any) => {
                    const { type, ...rest } = script;
                    return rest;
                });
            }

            // Remove incorrect type: module from web_accessible_resources
            if (manifest.web_accessible_resources) {
                manifest.web_accessible_resources = manifest.web_accessible_resources.map((resource: any) => {
                    const { type, ...rest } = resource;
                    return rest;
                });
            }

            // Write manifest to browser-specific directory
            const manifestPath = resolve(__dirname, 'dist', browser, 'manifest.json');
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            console.log(`Manifest generated at ${manifestPath}`);
        }
    };
}

// Custom plugin to fix @btc-vision/wallet-sdk imports
function fixBtcVisionImports(): PluginOption {
    return {
        name: 'fix-btc-vision-imports',
        enforce: 'pre', // Run before other plugins
        resolveId(source, importer) {
            // Handle @btc-vision/wallet-sdk imports
            if (source === '@btc-vision/wallet-sdk') {
                // Main import should use lib/index.js
                const resolvedPath = resolve(__dirname, 'node_modules/@btc-vision/wallet-sdk/lib/index.js');
                return { id: resolvedPath, moduleSideEffects: false };
            }
            if (source.startsWith('@btc-vision/wallet-sdk/')) {
                // Subpath imports should map correctly
                const subpath = source.replace('@btc-vision/wallet-sdk/', '');
                let fullPath = resolve(__dirname, 'node_modules/@btc-vision/wallet-sdk', subpath);

                // Try different extensions
                const extensions = ['', '.js', '.ts', '/index.js', '/index.ts'];
                for (const ext of extensions) {
                    if (fs.existsSync(fullPath + ext)) {
                        return { id: fullPath + ext, moduleSideEffects: false };
                    }
                }
            }
            return null;
        },
        load(id) {
            // If it's a @btc-vision/wallet-sdk file, load it
            if (id.includes('@btc-vision/wallet-sdk')) {
                try {
                    const code = fs.readFileSync(id, 'utf-8');
                    return {
                        code,
                        map: null
                    };
                } catch (e) {
                    console.error(`Failed to load ${id}:`, e);
                    return null;
                }
            }
            return null;
        }
    };
}

// Copy static assets plugin
function copyAssetsPlugin(): PluginOption {
    return {
        name: 'copy-assets',
        async writeBundle() {
            const browser = process.env.BROWSER || 'chrome';
            const sourceDir = resolve(__dirname, 'build/_raw');
            const destDir = resolve(__dirname, 'dist', browser);

            // Recursively copy all files from build/_raw
            const copyRecursive = (src: string, dest: string, skipPatterns: string[] = []) => {
                if (!fs.existsSync(src)) {
                    console.warn(`Source directory ${src} does not exist`);
                    return;
                }

                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true });
                }

                const items = fs.readdirSync(src);
                items.forEach((item) => {
                    // Skip manifest directory as we generate it separately
                    if (skipPatterns.some((pattern) => item.includes(pattern))) {
                        return;
                    }

                    const srcPath = path.join(src, item);
                    const destPath = path.join(dest, item);

                    if (fs.statSync(srcPath).isDirectory()) {
                        copyRecursive(srcPath, destPath, skipPatterns);
                    } else {
                        fs.copyFileSync(srcPath, destPath);
                        console.log(`Copied: ${item}`);
                    }
                });
            };

            // Copy everything from build/_raw except manifest files
            copyRecursive(sourceDir, destDir, ['manifest']);

            // Also copy _locales if it exists
            const localesPath = resolve(__dirname, 'build/_raw/_locales');
            if (fs.existsSync(localesPath)) {
                copyRecursive(localesPath, resolve(__dirname, 'dist', browser, '_locales'), []);
            }

            // Inject scripts into HTML files if they exist
            const htmlFiles = ['index.html', 'notification.html'];
            htmlFiles.forEach((htmlFile) => {
                const htmlPath = path.join(destDir, htmlFile);
                if (fs.existsSync(htmlPath)) {
                    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

                    // Remove the web app manifest link if present
                    htmlContent = htmlContent.replace(/<link rel="manifest"[^>]*>/g, '');

                    // Inject UI script for popup and notification pages
                    if (!htmlContent.includes('ui.js')) {
                        htmlContent = htmlContent.replace(
                            '</body>',
                            '<script type="module" src="ui.js"></script>\n</body>'
                        );
                    }

                    fs.writeFileSync(htmlPath, htmlContent);
                    console.log(`Injected scripts into ${htmlFile}`);
                }
            });
        }
    };
}

// Package creation plugin
function packagePlugin(): PluginOption {
    return {
        name: 'package-plugin',
        async closeBundle() {
            if (process.env.PACKAGE === 'true') {
                const browser = process.env.BROWSER || 'chrome';
                const outputFile = `./dist/opwallet-${browser}-v${version}.zip`;

                await new Promise<void>((resolve, reject) => {
                    const output = fs.createWriteStream(outputFile);
                    const archive = archiver('zip', { zlib: { level: 9 } });

                    output.on('close', () => {
                        console.log(
                            `Package created: ${outputFile} (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`
                        );
                        resolve();
                    });

                    archive.on('error', reject);
                    archive.pipe(output);

                    // Archive everything in the browser-specific directory
                    archive.directory(`dist/${browser}/`, false);

                    archive.finalize();
                });
            }
        }
    };
}

export default defineConfig(({ mode }) => {
    const browser = process.env.BROWSER || 'chrome';
    const isDev = mode === 'development';
    const isProd = mode === 'production';

    console.log(`🚀 Building for ${browser} (MV3) in ${mode} mode`);

    return {
        build: {
            outDir: `dist/${browser}`,
            emptyOutDir: true,

            commonjsOptions: {
                strictRequires: true,
                transformMixedEsModules: true
            },

            // Use terser for production minification
            minify: isProd ? 'terser' : false,
            terserOptions: isProd
                ? {
                      compress: {
                          drop_console: false,
                          drop_debugger: true,
                          passes: 2
                      },
                      format: {
                          comments: false
                      }
                  }
                : undefined,

            sourcemap: false, //isDev ? 'inline' : false,

            rollupOptions: {
                cache: true,
                input: {
                    background: resolve(__dirname, 'src/background/index.ts'),
                    'content-script': resolve(__dirname, 'src/content-script/index.ts'),
                    pageProvider: resolve(__dirname, 'src/content-script/pageProvider/index.ts'),
                    ui: resolve(__dirname, 'src/ui/index.tsx')
                },
                //external: ['fs', 'path', 'crypto', 'stream'],
                output: {
                    entryFileNames: '[name].js',
                    chunkFileNames: 'js/[name]-[hash].js',
                    assetFileNames: (assetInfo) => {
                        const info = assetInfo.name?.split('.');
                        const ext = info?.[info.length - 1];
                        if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
                            return `images/[name][extname]`;
                        }
                        if (/woff|woff2|eot|ttf|otf/i.test(ext || '')) {
                            return `fonts/[name][extname]`;
                        }
                        if (/css/i.test(ext || '')) {
                            return `css/[name][extname]`;
                        }
                        return `assets/[name][extname]`;
                    },
                    //inlineDynamicImports: true,
                    manualChunks: undefined /*(id) => {
                        if (id.includes('node_modules')) {
                            // Split vendor code
                            if (id.includes('react') || id.includes('react-dom')) return 'react';
                            if (id.includes('antd')) return 'antd';
                            if (id.includes('@btc-vision')) return 'btc';
                            return 'vendor';
                        }
                    }*/
                }
            },

            target: 'esnext',
            modulePreload: false,
            cssCodeSplit: false,
            assetsInlineLimit: 10000,
            chunkSizeWarningLimit: 3000
        },

        plugins: [
            // Node.js polyfills
            nodePolyfills({
                globals: {
                    Buffer: true,
                    global: true,
                    process: true
                }
            }),

            // Fix for @btc-vision/wallet-sdk imports
            fixBtcVisionImports(),

            // React with SWC (without the non-existent prop-types plugin)
            react({
                jsxImportSource: 'react'
            }),

            // TypeScript paths
            tsconfigPaths(),

            // WASM support
            wasm(),
            topLevelAwait(),
            tailwindcss(),

            // ESLint
            eslint({
                cache: true,
                fix: true,
                include: ['src/**/*.{ts,tsx,js,jsx}'],
                exclude: ['node_modules', 'dist'],
                lintOnStart: true,
                emitError: isProd,
                emitWarning: !isProd
            }),

            // TypeScript type checking
            isProd &&
                checker({
                    typescript: {
                        tsconfigPath: './tsconfig.json',
                        buildMode: true
                    },
                    enableBuild: true
                }),

            // Custom plugins
            manifestPlugin(),
            copyAssetsPlugin(),
            packagePlugin()
        ].filter(Boolean) as PluginOption[],

        resolve: {
            alias: [
                {
                    find: '@',
                    replacement: resolve(__dirname, './src')
                },
                {
                    find: /^@btc-vision\/wallet-sdk$/,
                    replacement: resolve(__dirname, 'node_modules/@btc-vision/wallet-sdk/lib/index.js')
                },
                {
                    find: /^@btc-vision\/wallet-sdk\/(.*)/,
                    replacement: resolve(__dirname, 'node_modules/@btc-vision/wallet-sdk/$1')
                },
                {
                    find: 'moment',
                    replacement: 'dayjs'
                }
            ],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            mainFields: ['module', 'main', 'browser']
        },

        define: {
            'process.env.version': JSON.stringify(version),
            'process.env.release': JSON.stringify(version),
            'process.env.channel': JSON.stringify(process.env.CHANNEL || 'stable'),
            'process.env.BUILD_ENV': JSON.stringify(isProd ? 'PRO' : 'DEV'),
            'process.env.DEBUG': JSON.stringify(!isProd),
            'process.env.NODE_ENV': JSON.stringify(mode),
            global: 'globalThis'
        },

        css: {
            modules: {
                generateScopedName: isDev ? '[name]__[local]__[hash:base64:5]' : '[hash:base64:5]',
                localsConvention: 'camelCaseOnly'
            },
            preprocessorOptions: {
                less: {
                    javascriptEnabled: true,
                    modifyVars: {
                        // Your Ant Design theme variables
                        'primary-color': 'rgb(234,202,68)',
                        'primary-color-active': '#383535',
                        'input-icon-hover-color': '#FFFFFF',
                        'component-background': '#070606',
                        'select-dropdown-bg': '#2A2626',
                        'select-item-selected-bg': '#332F2F',
                        'select-item-active-bg': '#332F2F',
                        'input-border-color': 'rgba(255,255,255,0.2)',
                        'border-color': 'rgba(255,255,255,0.2)',
                        'input-hover-border-color': 'rgba(255,255,255,0.4)',
                        'hover-border-color': 'rgba(255,255,255,0.4)',
                        'border-color-base': 'rgba(255,255,255,0.2)',
                        'border-width-base': '0',
                        'animation-duration-slow': '0.08s',
                        'animation-duration-base': '0.08s',
                        'layout-header-background': '#2A2626',
                        'layout-header-padding': '0 1.875rem',
                        'layout-header-height': '5.625rem',
                        'layout-footer-padding': 'unset',
                        'border-radius-base': '0.3rem',
                        'checkbox-border-radius': '0.125rem',
                        'heading-color': '#ffffff',
                        'font-size-base': '1.125rem',
                        'line-height-base': '1.375rem',
                        'text-color': '#ffffff',
                        'text-color-secondary': '#AAAAAA',
                        'height-lg': '3.875rem',
                        'checkbox-size': '1.5rem',
                        'btn-text-hover-bg': '#383535',
                        'input-disabled-color': 'rgba(255,255,255,0.6)'
                    }
                }
            }
        },

        server: {
            port: 3000,
            open: false,
            hmr: {
                protocol: 'ws',
                host: 'localhost'
            }
        },

        optimizeDeps: {
            include: [
                'react',
                'react-dom',
                'dayjs',
                'buffer',
                'process',
                'events',
                'stream-browserify',
                'crypto-browserify',
                'bitcore-lib',
                'bip-schnorr'
            ],
            exclude: ['@btc-vision/transaction']
        },

        worker: {
            format: 'es',
            plugins: () => [wasm(), topLevelAwait()]
        },

        esbuild: {
            target: 'esnext',
            jsx: 'automatic',
            jsxImportSource: 'react',
            tsconfigRaw: {
                compilerOptions: {
                    experimentalDecorators: true
                }
            }
        }
    };
});
