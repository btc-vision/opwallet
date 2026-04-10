import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
// Strip prerelease suffixes (-alpha, -beta, -rc) for valid extension version
const version = packageJson.version.replace(/-(alpha|beta|rc).*$/, '');

// ----------------------------------------------------------------------------
// Force tree-shakeable `build/` entries for @btc-vision packages and opnet.
//
// These packages ship two entry points via package.json `exports`:
//   * `browser/`: rolldown-pre-bundled with their own copies of bitcoin,
//     noble-curves, noble-hashes, all bip39 wordlists, and protobufjs inlined
//     as opaque chunks. ~2.1 MB for opnet and ~1.3 MB for transaction, with
//     the same dependencies duplicated across both — and totally opaque to
//     downstream tree-shaking.
//   * `build/`: per-file ESM (~363 KB and ~590 KB total) that tree-shakes
//     against the standalone @btc-vision/bitcoin / @noble/* packages, of
//     which we end up using a small fraction.
//
// Vite picks `browser/` by default when building for the web. We need it to
// pick `build/` instead. `resolve.alias` and `resolveId` plugin hooks both
// run AFTER Vite's internal resolver has consumed the `exports` field, so
// they can't intercept the bare specifier. The only thing that works is
// modifying the `exports` field on disk BEFORE Vite ever loads the config.
//
// We do that synchronously here, at the top of this file, so it runs before
// `defineConfig` returns. The build/ entries reference a few Node-only
// modules (undici, crypto, zlib, os, worker_threads) that are gated at
// runtime by isNode checks or only touched by code paths we never invoke;
// they're aliased to browser shims in `resolve.alias` below so they resolve
// cleanly without actually executing.
//
// We DO need to restore the originals once the background build finishes,
// because the subsequent UI build (vite.config.ts) still expects the browser/
// entries — it hasn't been taught about the shims yet, so forcing it onto
// build/ would drag in undici and blow up. Restoration happens via a plugin's
// `closeBundle` hook, with a `process.on('exit')` safety net for hard crashes.
const FORCE_BUILD_PACKAGES = ['opnet', '@btc-vision/transaction', '@btc-vision/bitcoin', '@btc-vision/ecpair'];
const forceBuildOriginals: Record<string, string> = {};

function forceBuildPatch() {
    for (const name of FORCE_BUILD_PACKAGES) {
        const p = resolve(__dirname, 'node_modules', name, 'package.json');
        if (!fs.existsSync(p)) continue;
        const raw = fs.readFileSync(p, 'utf-8');
        const pkg = JSON.parse(raw);
        let changed = false;

        // Strip the `browser` condition from every export entry.
        if (pkg.exports && typeof pkg.exports === 'object') {
            for (const key of Object.keys(pkg.exports)) {
                const v = pkg.exports[key];
                if (v && typeof v === 'object' && 'browser' in v) {
                    delete v.browser;
                    changed = true;
                }
            }
        }

        // Also strip the legacy top-level `browser` field. When it's an object
        // (a path-mapping) Vite/rolldown uses it to rewrite individual files
        // — e.g. @btc-vision/bitcoin maps `./build/index.js` → `./browser/index.js`,
        // which would silently undo what we just did to `exports`.
        if (pkg.browser !== undefined) {
            delete pkg.browser;
            changed = true;
        }

        if (changed) {
            forceBuildOriginals[p] = raw;
            fs.writeFileSync(p, JSON.stringify(pkg, null, 4));
            console.log(`[force-build] patched ${name}/package.json`);
        }
    }
}

function forceBuildRestore() {
    for (const [p, raw] of Object.entries(forceBuildOriginals)) {
        try {
            fs.writeFileSync(p, raw);
        } catch {
            // best-effort
        }
        delete forceBuildOriginals[p];
    }
}

forceBuildPatch();
process.on('exit', forceBuildRestore);
process.on('SIGINT', () => {
    forceBuildRestore();
    process.exit(130);
});
process.on('SIGTERM', () => {
    forceBuildRestore();
    process.exit(143);
});

function forceBuildRestorePlugin() {
    return {
        name: 'force-build-restore',
        closeBundle() {
            forceBuildRestore();
        }
    };
}

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
                    codeSplitting: false
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
            serviceWorkerPolyfillPlugin(),
            forceBuildRestorePlugin()
        ],

        resolve: {
            alias: [
                { find: '@', replacement: resolve(__dirname, './src') },
                { find: 'events', replacement: resolve(__dirname, 'src/shims/events-browser.js') },
                { find: /^vm$/, replacement: 'vm-browserify' },
                { find: '@protobufjs/inquire', replacement: resolve(__dirname, 'src/shims/inquire-browser.js') },
                { find: 'moment', replacement: 'dayjs' },
                // The build/ versions of opnet / @btc-vision/* (forced via the
                // exports-field patch in `forceBuildEntries()` above) reference
                // a few Node built-ins that are gated at runtime by isNode
                // checks (e.g. opnet/build/threading/WorkerCreator.js, opnet's
                // undici-based fetcher). The bundler still needs them to
                // *resolve*, but the modules are never executed in the SW.
                // crypto-browserify covers the small surface
                // (createHash/createHmac/pbkdf2Sync/randomBytes) that the libs
                // use; everything else is a no-op stub.
                { find: 'undici', replacement: resolve(__dirname, 'src/shims/undici-browser.js') },
                // bip39 unconditionally tries to require every wordlist via
                // try/catch (chinese, czech, french, italian, japanese, korean,
                // portuguese, spanish + the english one we actually use). Each
                // is ~24 KB, totalling ~220 KB of dead weight in the SW. Stub
                // every non-English wordlist to an empty array; bip39's
                // `_wordlists.js` cascade leaves english as the default.
                // The bip39 npm package eagerly loads every wordlist at module
                // init time (~220 KB total) via try/catch requires. Only one
                // place — @btc-vision/transaction's Mnemonic.js — actually
                // imports it, and only uses validateMnemonic / mnemonicToSeedSync /
                // generateMnemonic. We redirect the whole package to a tiny
                // shim backed by @scure/bip39 (already in the bundle) and a
                // single english wordlist.
                {
                    find: /^bip39$/,
                    replacement: resolve(__dirname, 'src/shims/bip39-browser.js')
                },
                // @metamask/obs-store's barrel re-exports `asStream` and
                // `transform` which both `require('readable-stream')` — that
                // alone drags in ~70 KB of stream polyfill we never use. The
                // keyring service only touches `ObservableStore`, so point the
                // bare specifier directly at that submodule.
                {
                    find: /^@metamask\/obs-store$/,
                    replacement: resolve(__dirname, 'node_modules/@metamask/obs-store/dist/ObservableStore.js')
                },
                // safe-buffer is CJS, so it forces vite-plugin-node-polyfills'
                // buffer shim to load its `.cjs` build alongside the `.js`
                // build that ESM importers already pulled in — duplicating
                // ~54 KB. The shim below collapses safe-buffer to a single
                // ESM file that just re-exports the global Buffer.
                {
                    find: /^safe-buffer$/,
                    replacement: resolve(__dirname, 'src/shims/safe-buffer.js')
                },
                { find: /^crypto$/, replacement: resolve(__dirname, 'src/shims/crypto-browser.js') },
                { find: /^node:crypto$/, replacement: resolve(__dirname, 'src/shims/crypto-browser.js') },
                { find: /^worker_threads$/, replacement: resolve(__dirname, 'src/shims/empty.js') },
                { find: /^node:worker_threads$/, replacement: resolve(__dirname, 'src/shims/empty.js') },
                { find: /^os$/, replacement: resolve(__dirname, 'src/shims/empty.js') },
                { find: /^node:os$/, replacement: resolve(__dirname, 'src/shims/empty.js') },
                { find: /^zlib$/, replacement: resolve(__dirname, 'src/shims/empty.js') },
                { find: /^node:zlib$/, replacement: resolve(__dirname, 'src/shims/empty.js') }
            ],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            // `browser` is intentionally NOT in mainFields. With the
            // package.json patches above stripping the `browser` exports key,
            // including it here would just send the resolver back to the
            // pre-bundled `browser/` blobs via the legacy field on packages
            // that haven't been patched.
            mainFields: ['module', 'main'],
            dedupe: [
                'buffer',
                'valibot',
                '@btc-vision/bitcoin',
                '@btc-vision/bip32',
                '@btc-vision/logger',
                '@btc-vision/ecpair'
            ]
        },

        define: {
            'process.env.version': JSON.stringify(version),
            'process.env.tosVersion': JSON.stringify('1.0.1'),
            'process.env.domainTosVersion': JSON.stringify('1.0.1'),
            'process.env.tosLastUpdate': JSON.stringify('2026-03-12'),
            'process.env.domainTosLastUpdate': JSON.stringify('2026-03-12'),
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
