import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version.split('-beta')[0];

// Service worker polyfill - injected at the start of the bundle
function serviceWorkerPolyfillPlugin() {
    // Polyfill for service worker environment:
    // - window/document stubs for libraries that check for browser environment
    // - URL.createObjectURL stub (not available in service workers, used by opnet's WorkerCreator)
    const polyfill = `(function(){if(typeof window==="undefined"){var n=function(){};globalThis.window=Object.assign({},globalThis,{dispatchEvent:n,addEventListener:n,removeEventListener:n});globalThis.document={createElement:function(){return{relList:{supports:function(){return false}}}},querySelector:function(){return null},querySelectorAll:function(){return[]},getElementsByTagName:function(){return[]},head:{appendChild:n}}}if(typeof URL!=="undefined"&&typeof URL.createObjectURL==="undefined"){URL.createObjectURL=function(blob){console.warn("[SW] URL.createObjectURL not available in service workers");return"blob:sw-stub"};URL.revokeObjectURL=function(){}}})();`;

    return {
        name: 'service-worker-polyfill',
        generateBundle(_options: unknown, bundle: Record<string, { type: string; code?: string }>) {
            for (const fileName of Object.keys(bundle)) {
                const chunk = bundle[fileName];
                if (chunk.type === 'chunk' && fileName.endsWith('.js') && chunk.code) {
                    chunk.code = polyfill + chunk.code;
                }
            }
        }
    };
}

export default defineConfig(({ mode }) => {
    const browser = process.env.BROWSER || 'chrome';
    const isProd = mode === 'production';

    console.log(`🔧 Building background for ${browser} in ${mode} mode`);

    return {
        build: {
            outDir: `dist/${browser}`,
            emptyOutDir: false,
            rollupOptions: {
                input: {
                    background: resolve(__dirname, 'src/background/index.ts')
                },
                output: {
                    entryFileNames: '[name].js',
                    format: 'es',
                    inlineDynamicImports: true
                }
            },
            target: 'esnext',
            minify: isProd ? 'terser' : false,
            terserOptions: isProd
                ? {
                      compress: {
                          drop_console: false,
                          drop_debugger: true,
                          evaluate: false
                      },
                      mangle: { eval: false }
                  }
                : undefined,
            sourcemap: false,
            commonjsOptions: {
                strictRequires: true,
                transformMixedEsModules: true
            }
        },

        plugins: [
            nodePolyfills({
                globals: {
                    Buffer: true,
                    global: true,
                    process: true
                },
                // Exclude modules we handle via aliases
                exclude: [
                    'crypto',
                    'vm',
                    'zlib',
                    'worker_threads',
                    'fs',
                    'path',
                    'os',
                    'http',
                    'https',
                    'net',
                    'tls',
                    'dns',
                    'child_process',
                    'cluster',
                    'dgram',
                    'readline',
                    'repl',
                    'tty',
                    'perf_hooks',
                    'inspector',
                    'async_hooks',
                    'trace_events',
                    'v8',
                    'wasi'
                ],
                overrides: {
                    events: resolve(__dirname, 'src/shims/events-browser.js')
                }
            }),
            tsconfigPaths(),
            wasm(),
            topLevelAwait(),
            serviceWorkerPolyfillPlugin()
        ],

        resolve: {
            alias: [
                { find: '@', replacement: resolve(__dirname, './src') },
                { find: 'events', replacement: resolve(__dirname, 'src/shims/events-browser.js') },

                { find: 'crypto', replacement: resolve(__dirname, 'crypto-browserify.js') },
                { find: 'vm', replacement: resolve(__dirname, 'vm-browserify') },
                { find: '@protobufjs/inquire', replacement: resolve(__dirname, 'src/shims/inquire-browser.js') },
                { find: 'moment', replacement: 'dayjs' }
            ],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            mainFields: ['browser', 'module', 'main'],
            dedupe: [
                '@noble/curves',
                '@noble/hashes',
                '@scure/base',
                'buffer',
                'valibot',
                'bip39',
                '@btc-vision/bitcoin',
                '@btc-vision/bip32',
                '@btc-vision/logger',
                'tiny-secp256k1'
            ]
        },

        define: {
            'process.env.version': JSON.stringify(version),
            'process.env.tosVersion': JSON.stringify('1.0.0'),
            'process.env.domainTosVersion': JSON.stringify('1.0.0'),
            'process.env.tosLastUpdate': JSON.stringify('2025-12-20'),
            'process.env.domainTosLastUpdate': JSON.stringify('2025-12-20'),
            'process.env.release': JSON.stringify(version),
            'process.env.channel': JSON.stringify(process.env.CHANNEL || 'stable'),
            'process.env.BUILD_ENV': JSON.stringify(isProd ? 'PRO' : 'DEV'),
            'process.env.DEBUG': JSON.stringify(!isProd),
            'process.env.NODE_ENV': JSON.stringify(mode),
            'global.crypto': 'globalThis.crypto',
            global: 'globalThis'
        }
    };
});
