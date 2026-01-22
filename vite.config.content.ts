import { defineConfig } from 'vite';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const browser = process.env.BROWSER || 'chrome';

export default defineConfig({
    build: {
        outDir: `dist/${browser}`,
        emptyOutDir: true,
        lib: {
            entry: resolve(__dirname, 'src/content-script/index.ts'),
            name: 'OPNetContentScript',
            fileName: () => 'content-script.js',
            formats: ['iife']
        },
        rollupOptions: {
            output: {
                // Ensure no code splitting for content script
                inlineDynamicImports: true,
                // No external dependencies - bundle everything
                extend: true
            }
        },
        minify: 'terser',
        sourcemap: false
    },

    plugins: [
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true
            },
            overrides: {
                // Use ESM events shim to avoid CJS bundling issues
                events: resolve(__dirname, 'src/shims/events-browser.js')
            }
        }),
        tsconfigPaths()
    ],

    resolve: {
        alias: [
            {
                find: '@',
                replacement: resolve(__dirname, './src')
            },
            // ESM-compatible events shim
            {
                find: 'events',
                replacement: resolve(__dirname, 'src/shims/events-browser.js')
            }
        ]
    },

    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
        global: 'globalThis'
    }
});
