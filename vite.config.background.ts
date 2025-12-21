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
    // Set __IS_SERVICE_WORKER__ flag FIRST, then polyfill window/document
    const polyfill = `globalThis.__IS_SERVICE_WORKER__=true;(function(){if(typeof window==="undefined"){var n=function(){};globalThis.window=Object.assign({},globalThis,{dispatchEvent:n,addEventListener:n,removeEventListener:n});globalThis.document={createElement:function(){return{relList:{supports:function(){return false}}}},querySelector:function(){return null},querySelectorAll:function(){return[]},getElementsByTagName:function(){return[]},head:{appendChild:n}}}if(typeof URL!=="undefined"&&typeof URL.createObjectURL==="undefined"){URL.createObjectURL=function(blob){console.warn("[SW] URL.createObjectURL not available in service workers");return"blob:sw-stub"};URL.revokeObjectURL=function(){}}})();`;

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
                overrides: {
                    crypto: 'crypto-browserify',
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
                { find: '@noble/curves', replacement: resolve(__dirname, 'node_modules/@noble/curves') },
                { find: '@noble/hashes', replacement: resolve(__dirname, 'node_modules/@noble/hashes') },
                { find: '@scure/base', replacement: resolve(__dirname, 'node_modules/@scure/base') },
                { find: 'moment', replacement: 'dayjs' }
            ],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            mainFields: ['module', 'main', 'browser'],
            dedupe: ['@noble/curves', '@noble/hashes', '@scure/base', 'buffer']
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
