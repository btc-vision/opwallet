/**
 * OPNet Resolver Page Script
 *
 * Handles domain resolution and content rendering for opnet:// URLs.
 */

import browser from 'webextension-polyfill';

// Initialize window.opnet provider
import './opnetProvider';
import {
    ContenthashType,
    OpnetDomainRecord,
    OpnetProtocolError,
    OpnetProtocolErrorInfo,
    ParsedOpnetUrl,
    ResolvedContent
} from '@/shared/types/OpnetProtocol';

// Error configurations
const ERROR_CONFIG: Record<
    OpnetProtocolError,
    {
        title: string;
        message: string;
        suggestion: string;
    }
> = {
    [OpnetProtocolError.DOMAIN_NOT_REGISTERED]: {
        title: 'Domain Not Found',
        message: 'This OPNet domain has not been registered yet.',
        suggestion: 'Check the domain name spelling or try again later.'
    },
    [OpnetProtocolError.CONTENTHASH_EMPTY]: {
        title: 'No Content Available',
        message: 'This domain is registered but has no content configured.',
        suggestion: 'The domain owner needs to set a contenthash for this domain.'
    },
    [OpnetProtocolError.IPFS_UNREACHABLE]: {
        title: 'IPFS Gateway Unreachable',
        message: 'Unable to connect to IPFS gateways to fetch content.',
        suggestion: 'Check your internet connection or try configuring a local IPFS node.'
    },
    [OpnetProtocolError.INDEXER_OFFLINE]: {
        title: 'OPNet Indexer Offline',
        message: 'The OPNet indexer service is currently unavailable.',
        suggestion: 'Please try again in a few minutes.'
    },
    [OpnetProtocolError.NETWORK_ERROR]: {
        title: 'Network Error',
        message: 'A network error occurred while processing your request.',
        suggestion: 'Check your internet connection and try again.'
    },
    [OpnetProtocolError.INVALID_CONTENTHASH]: {
        title: 'Invalid Content Hash',
        message: 'The content hash for this domain is invalid or unsupported.',
        suggestion: 'Contact the domain owner to fix the content configuration.'
    },
    [OpnetProtocolError.GATEWAY_TIMEOUT]: {
        title: 'Gateway Timeout',
        message: 'The IPFS gateway took too long to respond.',
        suggestion: 'Try again or configure a different gateway in settings.'
    },
    [OpnetProtocolError.WALLET_LOCKED]: {
        title: 'Wallet Locked',
        message: 'The wallet needs to be unlocked to resolve OPNet domains.',
        suggestion: 'Please unlock your wallet and try again.'
    }
};

// DOM Elements
let addressBar: HTMLElement | null;
let urlInput: HTMLInputElement | null;
let goBtn: HTMLElement | null;
let loadingContainer: HTMLElement | null;
let loadingText: HTMLElement | null;
let errorContainer: HTMLElement | null;
let errorTitle: HTMLElement | null;
let errorDomain: HTMLElement | null;
let errorMessage: HTMLElement | null;
let errorSuggestion: HTMLElement | null;
let contentFrame: HTMLIFrameElement | null;

// Current state
let currentUrl: string = '';
let currentParsedUrl: ParsedOpnetUrl | null = null;

// Initialize DOM elements
function initElements(): void {
    addressBar = document.getElementById('address-bar');
    urlInput = document.getElementById('url-input') as HTMLInputElement;
    goBtn = document.getElementById('go-btn');
    loadingContainer = document.getElementById('loading-container');
    loadingText = document.getElementById('loading-text');
    errorContainer = document.getElementById('error-container');
    errorTitle = document.getElementById('error-title');
    errorDomain = document.getElementById('error-domain');
    errorMessage = document.getElementById('error-message');
    errorSuggestion = document.getElementById('error-suggestion');
    contentFrame = document.getElementById('content-frame') as HTMLIFrameElement;
}

// Parse URL from query parameters
function getOpnetUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('url');
}

// Send message to background
async function sendMessage(type: string, params: unknown[]): Promise<unknown> {
    return browser.runtime.sendMessage({
        type,
        params
    });
}

// Parse opnet URL
async function parseUrl(url: string): Promise<ParsedOpnetUrl> {
    const result = (await sendMessage('opnetProtocol:parseUrl', [url])) as ParsedOpnetUrl;
    return result;
}

// Resolve domain
async function resolveDomain(
    domain: string
): Promise<OpnetDomainRecord | OpnetProtocolErrorInfo> {
    return sendMessage('opnetProtocol:resolveDomain', [domain]) as Promise<
        OpnetDomainRecord | OpnetProtocolErrorInfo
    >;
}

// Fetch content
async function fetchContent(
    contenthash: string,
    contenthashType: ContenthashType,
    path: string
): Promise<ResolvedContent | OpnetProtocolErrorInfo> {
    return sendMessage('opnetProtocol:fetchContent', [
        contenthash,
        contenthashType,
        path
    ]) as Promise<ResolvedContent | OpnetProtocolErrorInfo>;
}

// Update address bar
function updateAddressBar(parsed: ParsedOpnetUrl): void {
    if (addressBar) {
        addressBar.style.display = 'flex';
    }
    if (urlInput) {
        // Show domain + path in input (without opnet:// prefix)
        const pathPart = parsed.path + parsed.query + parsed.hash;
        urlInput.value = parsed.fullDomain + pathPart;
    }

    // Update document title
    document.title = `${parsed.fullDomain} - OPNet Browser`;
}

// Navigate to a new URL
function navigateToUrl(input: string): void {
    let url = input.trim();
    if (!url) return;

    // Add .btc if no TLD specified
    if (!url.includes('.') || (!url.includes('.btc') && !url.includes('/'))) {
        const slashIndex = url.indexOf('/');
        if (slashIndex === -1) {
            url = url + '.btc';
        } else {
            url = url.substring(0, slashIndex) + '.btc' + url.substring(slashIndex);
        }
    }

    // Build the full opnet URL
    const opnetUrl = `opnet://${url}`;

    // Navigate to the resolver with the new URL
    const resolverUrl = `${window.location.pathname}?url=${encodeURIComponent(opnetUrl)}`;
    window.location.href = resolverUrl;
}

// Show loading state
function showLoading(message: string = 'Resolving OPNet domain'): void {
    if (loadingContainer) {
        loadingContainer.classList.remove('hidden');
    }
    if (loadingText) {
        loadingText.textContent = message;
    }
    if (errorContainer) {
        errorContainer.classList.add('hidden');
    }
    if (contentFrame) {
        contentFrame.style.display = 'none';
    }
}

// Show error state
function showError(error: OpnetProtocolErrorInfo): void {
    const config = ERROR_CONFIG[error.type] || {
        title: 'Error',
        message: error.message,
        suggestion: ''
    };

    if (loadingContainer) {
        loadingContainer.classList.add('hidden');
    }
    if (errorContainer) {
        errorContainer.classList.remove('hidden');
    }
    if (errorTitle) {
        errorTitle.textContent = config.title;
    }
    if (errorDomain && error.domain) {
        errorDomain.textContent = `${error.domain}.btc`;
        errorDomain.style.display = 'block';
    } else if (errorDomain) {
        errorDomain.style.display = 'none';
    }
    if (errorMessage) {
        errorMessage.textContent = config.message;
    }
    if (errorSuggestion) {
        errorSuggestion.textContent = config.suggestion;
    }
    if (contentFrame) {
        contentFrame.style.display = 'none';
    }
}

// Render content in sandboxed iframe - load directly from IPFS gateway
function renderContent(content: ResolvedContent, path: string): void {
    if (loadingContainer) {
        loadingContainer.classList.add('hidden');
    }
    if (errorContainer) {
        errorContainer.classList.add('hidden');
    }

    if (contentFrame) {
        // Load directly from IPFS gateway - sandbox still applies via iframe attribute
        // This avoids CSP inheritance issues with blob URLs
        const gatewayPath = path === '/' || path === '' ? '' : path;
        const ipfsUrl = `https://ipfs.opnet.org/ipfs/${content.ipfsHash}${gatewayPath}`;
        contentFrame.src = ipfsUrl;
        contentFrame.style.display = 'block';
    }
}

// Set up message listener for navigation from iframe
function setupMessageListener(): void {
    window.addEventListener('message', (event) => {
        // Only accept navigation messages from trusted IPFS gateways
        const trustedOrigins = [
            'https://ipfs.opnet.org',
            'https://dweb.link',
            'https://ipfs.io'
        ];

        // Check if origin is trusted or from blob (null origin)
        const isFromIframe = event.source === contentFrame?.contentWindow;
        const isTrustedOrigin = trustedOrigins.some(origin =>
            event.origin === origin || event.origin.endsWith('.ipfs.io')
        );

        if (!isFromIframe || (!isTrustedOrigin && event.origin !== 'null')) {
            return; // Reject untrusted messages
        }

        if (event.data?.type === 'opnet-navigate') {
            const url = event.data.url;
            if (typeof url === 'string' && url.length < 2048) {
                navigateToUrl(url);
            }
        }
    });
}

// Retry function
function retry(): void {
    if (currentUrl) {
        init();
    }
}

// Go back function
function goBack(): void {
    window.history.back();
}

// Set up button event listeners
function setupButtonListeners(): void {
    const retryBtn = document.getElementById('retry-btn');
    const backBtn = document.getElementById('back-btn');

    if (retryBtn) {
        retryBtn.addEventListener('click', retry);
    }
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }

    // URL input navigation
    if (urlInput) {
        const input = urlInput; // Capture for closure
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                navigateToUrl(input.value);
            }
        });
    }
    if (goBtn) {
        goBtn.addEventListener('click', () => {
            if (urlInput) {
                navigateToUrl(urlInput.value);
            }
        });
    }
}

// Check if result is an error
function isError(
    result: OpnetDomainRecord | ResolvedContent | OpnetProtocolErrorInfo
): result is OpnetProtocolErrorInfo {
    return 'type' in result && Object.values(OpnetProtocolError).includes(result.type);
}

// Main initialization
async function init(): Promise<void> {
    initElements();
    setupButtonListeners();
    setupMessageListener();

    const opnetUrl = getOpnetUrl();
    if (!opnetUrl) {
        showError({
            type: OpnetProtocolError.NETWORK_ERROR,
            message: 'No URL provided'
        });
        return;
    }

    currentUrl = opnetUrl;

    try {
        showLoading('Parsing URL');

        // Parse the URL
        currentParsedUrl = await parseUrl(opnetUrl);
        updateAddressBar(currentParsedUrl);

        showLoading('Resolving domain');

        // Resolve the domain
        const domainResult = await resolveDomain(currentParsedUrl.domain);

        if (isError(domainResult)) {
            showError(domainResult);
            return;
        }

        if (!domainResult.exists) {
            showError({
                type: OpnetProtocolError.DOMAIN_NOT_REGISTERED,
                message: `Domain "${currentParsedUrl.fullDomain}" is not registered`,
                domain: currentParsedUrl.domain
            });
            return;
        }

        if (!domainResult.contenthash) {
            showError({
                type: OpnetProtocolError.CONTENTHASH_EMPTY,
                message: 'No content configured for this domain',
                domain: currentParsedUrl.domain
            });
            return;
        }

        showLoading('Fetching content');

        // Fetch the content
        const contentResult = await fetchContent(
            domainResult.contenthash,
            domainResult.contenthashType,
            currentParsedUrl.path
        );

        if (isError(contentResult)) {
            showError(contentResult);
            return;
        }

        // Render the content
        renderContent(contentResult, currentParsedUrl.path);
    } catch (error) {
        console.error('Resolver error:', error);
        showError({
            type: OpnetProtocolError.NETWORK_ERROR,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
