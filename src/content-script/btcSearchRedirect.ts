/**
 * BTC Search Redirect
 *
 * Detects when user searches for a .btc domain on Google/Bing
 * and offers to redirect them to the OPNet browser.
 */

import browser from 'webextension-polyfill';

// Only run on search result pages
function isSearchPage(): boolean {
    const hostname = window.location.hostname;
    return hostname.includes('google.') ||
           hostname.includes('bing.') ||
           hostname.includes('duckduckgo.');
}

// Extract search query from URL
function getSearchQuery(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || params.get('query') || null;
}

// Check if query looks like a .btc domain
function extractBtcDomain(query: string): string | null {
    const trimmed = query.trim().toLowerCase();

    // Direct .btc domain patterns
    const patterns = [
        /^([a-z0-9][-a-z0-9]*\.btc)$/i,           // domain.btc
        /^([a-z0-9][-a-z0-9]*\.btc)\/.*$/i,       // domain.btc/path
        /^([-a-z0-9]+\.[-a-z0-9]+\.btc)$/i,       // sub.domain.btc
        /^opnet:\/\/(.+\.btc.*)$/i,               // opnet://domain.btc
        /^web\+opnet:\/\/(.+\.btc.*)$/i           // web+opnet://domain.btc
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
            return match[1].replace(/\.btc.*$/, '.btc');
        }
    }

    return null;
}

// Create and show the redirect banner
function showRedirectBanner(domain: string): void {
    // Check if banner already exists
    if (document.getElementById('opnet-search-banner')) {
        return;
    }

    const banner = document.createElement('div');
    banner.id = 'opnet-search-banner';
    banner.innerHTML = `
        <style>
            #opnet-search-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                color: #fff;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 16px;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.3);
                animation: opnet-slide-down 0.3s ease-out;
            }
            @keyframes opnet-slide-down {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            #opnet-search-banner .opnet-logo {
                width: 24px;
                height: 24px;
            }
            #opnet-search-banner .opnet-text {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #opnet-search-banner .opnet-domain {
                color: #f37413;
                font-weight: 600;
                font-family: ui-monospace, monospace;
            }
            #opnet-search-banner .opnet-btn {
                background: #f37413;
                color: #fff;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                font-size: 13px;
                transition: background 0.15s;
            }
            #opnet-search-banner .opnet-btn:hover {
                background: #e56b0e;
            }
            #opnet-search-banner .opnet-close {
                background: transparent;
                border: none;
                color: #888;
                cursor: pointer;
                padding: 4px 8px;
                font-size: 18px;
                line-height: 1;
            }
            #opnet-search-banner .opnet-close:hover {
                color: #fff;
            }
        </style>
        <svg class="opnet-logo" viewBox="0 0 165 112" fill="none">
            <path d="M164.28 45.35C163.61 20.68 142.85 0.28 118.17 0C109.48 -0.1 101.35 2.21 94.36 6.26C91.78 7.75 91.07 11.17 92.81 13.59C96.26 18.39 98.96 23.75 100.79 29.5C101.8 32.7 105.61 33.73 108.45 31.93C112 29.68 116.42 28.68 121.13 29.6C127.66 30.87 133.08 36.04 134.57 42.53C137.19 53.93 128.6 64.04 117.65 64.04C114.24 64.04 111.07 63.05 108.4 61.34C105.58 59.54 101.78 60.68 100.77 63.87C96.29 77.92 86.5 89.59 73.75 96.54C72.08 97.45 70.99 99.14 70.99 101.04V106.62C70.99 109.42 73.26 111.69 76.06 111.69H95.19C97.99 111.69 100.26 109.42 100.26 106.62V96.86C100.26 93.51 103.43 91.19 106.68 91.99C110.2 92.85 113.87 93.31 117.65 93.31C143.85 93.31 165.01 71.71 164.29 45.35H164.28Z" fill="#ee771b"/>
            <path d="M46.66 0C20.89 0 0 20.89 0 46.66C0 72.43 20.89 93.32 46.66 93.32C72.43 93.32 93.32 72.43 93.32 46.66C93.32 20.89 72.43 0 46.66 0ZM46.66 64.05C37.06 64.05 29.27 56.26 29.27 46.66C29.27 37.06 37.06 29.27 46.66 29.27C56.26 29.27 64.05 37.06 64.05 46.66C64.05 56.26 56.26 64.05 46.66 64.05Z" fill="white"/>
        </svg>
        <div class="opnet-text">
            Navigate to <span class="opnet-domain">${domain}</span>?
        </div>
        <button class="opnet-btn" id="opnet-go-btn">Open in OPNet Browser</button>
        <button class="opnet-close" id="opnet-close-btn">&times;</button>
    `;

    document.body.appendChild(banner);

    // Handle click
    document.getElementById('opnet-go-btn')?.addEventListener('click', () => {
        const resolverUrl = browser.runtime.getURL(
            `opnet-resolver.html?url=${encodeURIComponent(`opnet://${domain}`)}`
        );
        window.location.href = resolverUrl;
    });

    // Handle close
    document.getElementById('opnet-close-btn')?.addEventListener('click', () => {
        banner.remove();
        // Remember dismissal for this session
        sessionStorage.setItem(`opnet-dismissed-${domain}`, 'true');
    });
}

// Check if we should show the banner
async function checkAndShowBanner(): Promise<void> {
    if (!isSearchPage()) {
        return;
    }

    const query = getSearchQuery();
    if (!query) {
        return;
    }

    const domain = extractBtcDomain(query);
    if (!domain) {
        return;
    }

    // Check if user dismissed this domain
    if (sessionStorage.getItem(`opnet-dismissed-${domain}`)) {
        return;
    }

    // Check if OPNet browser is enabled
    try {
        const response = await browser.runtime.sendMessage({
            type: 'isOpnetBrowserEnabled'
        }) as { enabled?: boolean } | undefined;

        if (!response?.enabled) {
            return;
        }
    } catch {
        // Extension context may not be available
        return;
    }

    showRedirectBanner(domain);
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndShowBanner);
} else {
    checkAndShowBanner();
}
