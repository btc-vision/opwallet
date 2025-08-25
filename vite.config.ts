import { defineConfig, type PluginOption, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path, { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import eslint from 'vite-plugin-eslint2';
import checker from 'vite-plugin-checker';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import fs from 'fs';

// Get package version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version.split('-beta')[0];

// Custom plugin to handle manifest generation
function manifestPlugin(browser: string, manifestVersion: 'mv2' | 'mv3'): PluginOption {
    return {
        name: 'manifest-plugin',
        async writeBundle() {
            const baseManifestFile = manifestVersion === 'mv2' ? '_base_v2.json' : '_base_v3.json';
            const basePath = resolve(__dirname, `build/_raw/manifest/${baseManifestFile}`);
            const browserPath = resolve(__dirname, `build/_raw/manifest/${browser}.json`);

            if (!fs.existsSync(basePath) || !fs.existsSync(browserPath)) {
                console.warn('Manifest files not found, skipping manifest generation');
                return;
            }

            const baseManifest = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
            const browserManifest = JSON.parse(fs.readFileSync(browserPath, 'utf-8'));

            const manifest = {
                ...baseManifest,
                ...browserManifest,
                version: version
            };

            const outputPath = resolve(__dirname, `dist/manifest.json`);
            fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
            console.log(`Manifest generated for ${browser} (${manifestVersion})`);
        }
    };
}

// Custom plugin to copy raw files
function copyRawFilesPlugin(): PluginOption {
    return {
        name: 'copy-raw-files',
        async writeBundle() {
            const sourceDir = resolve(__dirname, 'build/_raw');
            const destDir = resolve(__dirname, 'dist');

            // Copy all files except manifest directory
            const copyRecursive = (src: string, dest: string) => {
                if (!fs.existsSync(src)) return;

                const stats = fs.statSync(src);

                if (stats.isDirectory()) {
                    // Skip manifest directory as it's handled by manifestPlugin
                    if (path.basename(src) === 'manifest') return;

                    if (!fs.existsSync(dest)) {
                        fs.mkdirSync(dest, { recursive: true });
                    }

                    const items = fs.readdirSync(src);
                    items.forEach((item) => {
                        copyRecursive(path.join(src, item), path.join(dest, item));
                    });
                } else {
                    fs.copyFileSync(src, dest);
                }
            };

            copyRecursive(sourceDir, destDir);
        }
    };
}

export default defineConfig(({ mode }) => {
    // Get browser and manifest version from environment variables
    const browser = process.env.BROWSER || 'chrome';
    const manifestVersion = (process.env.MANIFEST || 'mv3') as 'mv2' | 'mv3';
    const isDev = mode === 'development';
    const isProd = mode === 'production';

    console.log(`Building for ${browser} with ${manifestVersion} in ${mode} mode`);

    const config: UserConfig = {
        // Build configuration
        build: {
            // Output directory
            outDir: 'dist',

            // Clean output directory before building
            emptyOutDir: true,

            // Disable minification in dev for easier debugging
            minify: isProd ? 'terser' : false,

            // Terser options for production builds
            terserOptions: isProd
                ? {
                      compress: {
                          drop_console: false,
                          drop_debugger: false,
                          passes: 2
                      },
                      format: {
                          comments: false,
                          ascii_only: true
                      },
                      ecma: 2020,
                      module: false,
                      toplevel: false
                  }
                : undefined,

            // Source maps
            sourcemap: isDev ? 'inline' : false,

            // Set reasonable chunk size limits
            chunkSizeWarningLimit: 2500,

            // Rollup options for multiple entry points
            rollupOptions: {
                input: {
                    // Entry points
                    background: resolve(__dirname, 'src/background/index.ts'),
                    'content-script': resolve(__dirname, 'src/content-script/index.ts'),
                    pageProvider: resolve(__dirname, 'src/content-script/pageProvider/index.ts'),
                    ui: resolve(__dirname, 'src/ui/index.tsx'),
                    // HTML pages
                    index: resolve(__dirname, 'index.html'),
                    notification: resolve(__dirname, 'notification.html')
                },
                output: {
                    // Ensure consistent chunk names
                    entryFileNames: (chunkInfo) => {
                        // HTML files should not be renamed
                        if (chunkInfo.name?.endsWith('.html')) {
                            return '[name]';
                        }
                        return '[name].js';
                    },
                    chunkFileNames: 'js/[name]-[hash].js',
                    assetFileNames: (assetInfo) => {
                        const info = assetInfo.name?.split('.');
                        const ext = info?.[info.length - 1];
                        if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
                            return `images/[name][extname]`;
                        }
                        if (/css/i.test(ext || '')) {
                            return `css/[name][extname]`;
                        }
                        return `assets/[name][extname]`;
                    },

                    // Disable code splitting for Chrome extensions (MV3 compatibility)
                    manualChunks: undefined,
                    inlineDynamicImports: true
                }
            },

            // Target modern browsers
            target: 'esnext',

            // Disable module preload polyfill
            modulePreload: false,

            // CSS code splitting
            cssCodeSplit: false,

            // Asset handling
            assetsInlineLimit: 10000
        },

        // Plugins as a regular array
        plugins: [
            // React with SWC for fast refresh and compilation
            react({
                jsxImportSource: 'react',
                plugins: []
            }),

            // TypeScript paths resolution
            tsconfigPaths(),

            // WASM support
            wasm(),
            topLevelAwait(),

            // ESLint plugin with vite-plugin-eslint2
            eslint({
                cache: true,
                fix: true,
                include: ['src/**/*.{ts,tsx,js,jsx}'],
                exclude: ['node_modules', 'dist'],
                lintOnStart: true,
                emitError: isProd,
                emitWarning: !isProd
            }),

            // TypeScript type checking (only in production)
            isProd &&
                checker({
                    typescript: {
                        tsconfigPath: './tsconfig.json',
                        buildMode: true
                    },
                    overlay: {
                        initialIsOpen: false,
                        position: 'br'
                    },
                    enableBuild: true
                }),

            // Custom plugins
            copyRawFilesPlugin(),
            manifestPlugin(browser, manifestVersion)
        ].filter(Boolean) as PluginOption[],

        // Module resolution
        resolve: {
            alias: {
                '@': resolve(__dirname, './src'),
                // Polyfills for Node.js built-ins
                stream: 'stream-browserify',
                crypto: 'crypto-browserify',
                buffer: 'buffer',
                process: 'process/browser',
                events: 'events',
                zlib: 'browserify-zlib',
                http: 'stream-http',
                https: 'https-browserify',
                vm: 'vm-browserify',
                // Replace moment with dayjs
                moment: 'dayjs'
            },
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
        },

        // Define global constants
        define: {
            'process.env.version': JSON.stringify(version),
            'process.env.release': JSON.stringify(version),
            'process.env.manifest': JSON.stringify(manifestVersion),
            'process.env.channel': JSON.stringify(process.env.CHANNEL || 'stable'),
            'process.env.BUILD_ENV': JSON.stringify(isProd ? 'PRO' : 'DEV'),
            'process.env.DEBUG': JSON.stringify(!isProd),
            'process.env.NODE_ENV': JSON.stringify(mode),
            global: 'globalThis'
        },

        // CSS configuration
        css: {
            modules: {
                generateScopedName: isDev ? '[name]__[local]__[hash:base64:5]' : '[hash:base64:5]',
                localsConvention: 'camelCaseOnly'
            },
            preprocessorOptions: {
                less: {
                    javascriptEnabled: true,
                    modifyVars: {
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

        // Development server configuration
        server: {
            port: 3000,
            open: false,
            hmr: {
                protocol: 'ws',
                host: 'localhost'
            },
            watch: {
                ignored: ['**/node_modules/**', '**/dist/**'],
                usePolling: true,
                interval: 1000
            }
        },

        // Optimizations
        optimizeDeps: {
            include: [
                'react',
                'react-dom',
                'dayjs',
                'buffer',
                'process',
                'events',
                'stream-browserify',
                'crypto-browserify'
            ],
            exclude: ['@btc-vision/transaction'],
            esbuildOptions: {
                target: 'esnext',
                define: {
                    global: 'globalThis'
                }
            }
        },

        // Worker configuration
        worker: {
            format: 'es',
            plugins: () => [wasm(), topLevelAwait()]
        },

        // Build optimizations
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

    return config;
});
