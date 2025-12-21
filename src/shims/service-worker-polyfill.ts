// Service Worker Polyfill
// Provides minimal window/document compatibility for code that expects browser environment
// This is needed because Vite's preload polyfill and some libraries reference window/document

// Only apply polyfills if we're in a service worker context (no window)
if (typeof window === 'undefined') {
    // Minimal window polyfill for service workers
    const windowPolyfill = {
        ...globalThis,
        // Event dispatching (used by Vite preload error handler)
        dispatchEvent: (event: Event) => {
            console.warn('[SW] window.dispatchEvent called:', event.type);
            return true;
        },
        addEventListener: (type: string, listener: EventListener) => {
            // No-op in service worker
        },
        removeEventListener: (type: string, listener: EventListener) => {
            // No-op in service worker
        },
        // Location (some libs check this)
        location: {
            href: '',
            origin: '',
            protocol: 'chrome-extension:',
            host: '',
            hostname: '',
            port: '',
            pathname: '',
            search: '',
            hash: ''
        },
        // Navigator
        navigator: globalThis.navigator,
        // Crypto
        crypto: globalThis.crypto
    };

    // @ts-expect-error - Intentionally adding window to globalThis for compatibility
    globalThis.window = windowPolyfill;

    // Minimal document polyfill
    const documentPolyfill = {
        createElement: () => ({
            relList: {
                supports: () => false
            }
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementsByTagName: () => [],
        head: {
            appendChild: () => {}
        },
        body: null
    };

    // @ts-expect-error - Intentionally adding document to globalThis for compatibility
    globalThis.document = documentPolyfill;
}

export {};
