/**
 * OPNet Resolver Page Script
 *
 * Handles domain resolution and content rendering for opnet:// URLs.
 */

import browser from 'webextension-polyfill';
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
let domainDisplay: HTMLElement | null;
let pathDisplay: HTMLElement | null;
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
    domainDisplay = document.getElementById('domain-display');
    pathDisplay = document.getElementById('path-display');
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
    if (domainDisplay) {
        domainDisplay.textContent = parsed.fullDomain;
    }
    if (pathDisplay) {
        pathDisplay.textContent = parsed.path + parsed.query + parsed.hash;
    }

    // Update document title
    document.title = `${parsed.fullDomain} - OPNet Browser`;
}

// Show loading state
function showLoading(message: string = 'Resolving OPNet domain...'): void {
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

// Rewrite URLs in content for proper resolution
function rewriteContent(
    html: string,
    ipfsHash: string,
    domain: string
): string {
    const baseUrl = `https://ipfs.opnet.org/ipfs/${ipfsHash}`;

    // Add base tag for relative URLs
    const baseTag = `<base href="${baseUrl}/">`;

    // Inject base tag after <head>
    if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n${baseTag}`);
    } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>\n${baseTag}`);
    } else {
        html = `${baseTag}${html}`;
    }

    // Inject link interception script
    const interceptScript = `
<script>
(function() {
    document.addEventListener('click', function(e) {
        var link = e.target;
        while (link && link.tagName !== 'A') {
            link = link.parentElement;
        }
        if (link && link.href) {
            var href = link.getAttribute('href') || '';
            // Check for .btc or opnet:// links
            if (href.match(/\\.btc(\\/|$|\\?|#)/i) ||
                href.startsWith('opnet://') ||
                href.startsWith('web+opnet://')) {
                e.preventDefault();
                e.stopPropagation();
                window.parent.postMessage({
                    type: 'opnet-navigate',
                    url: href
                }, '*');
            }
        }
    }, true);
})();
</script>
`;

    // Inject before </body> or at end
    if (html.includes('</body>')) {
        html = html.replace('</body>', `${interceptScript}</body>`);
    } else if (html.includes('</BODY>')) {
        html = html.replace('</BODY>', `${interceptScript}</BODY>`);
    } else {
        html = `${html}${interceptScript}`;
    }

    return html;
}

// Render content in iframe
function renderContent(content: ResolvedContent, domain: string): void {
    if (loadingContainer) {
        loadingContainer.classList.add('hidden');
    }
    if (errorContainer) {
        errorContainer.classList.add('hidden');
    }

    if (contentFrame) {
        // Rewrite content for proper URL handling
        const processedHtml = rewriteContent(content.html, content.ipfsHash, domain);

        // Create blob URL for sandboxed content
        const blob = new Blob([processedHtml], { type: content.contentType });
        const blobUrl = URL.createObjectURL(blob);

        contentFrame.src = blobUrl;
        contentFrame.style.display = 'block';
    }
}

// Set up message listener for navigation
function setupMessageListener(): void {
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'opnet-navigate') {
            const url = event.data.url;
            navigateToUrl(url);
        }
    });
}

// Navigate to a new opnet URL
function navigateToUrl(url: string): void {
    const resolverUrl = browser.runtime.getURL(
        `opnet-resolver.html?url=${encodeURIComponent(url)}`
    );
    window.location.href = resolverUrl;
}

// Retry function (exposed globally for button)
(window as unknown as { retry: () => void }).retry = function retry(): void {
    if (currentUrl) {
        init();
    }
};

// Go back function (exposed globally for button)
(window as unknown as { goBack: () => void }).goBack = function goBack(): void {
    window.history.back();
};

// Check if result is an error
function isError(
    result: OpnetDomainRecord | ResolvedContent | OpnetProtocolErrorInfo
): result is OpnetProtocolErrorInfo {
    return 'type' in result && Object.values(OpnetProtocolError).includes(result.type);
}

// Main initialization
async function init(): Promise<void> {
    initElements();
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
        showLoading('Parsing URL...');

        // Parse the URL
        currentParsedUrl = await parseUrl(opnetUrl);
        updateAddressBar(currentParsedUrl);

        showLoading('Resolving domain...');

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

        showLoading('Fetching content...');

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
        renderContent(contentResult, currentParsedUrl.domain);
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
