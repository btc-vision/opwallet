/**
 * OPNet Protocol Service
 *
 * Main service for handling opnet:// protocol and .btc domain resolution.
 */

import { getContract } from 'opnet';

import browser from '../../webapi/browser';
import contenthashCacheService from './contenthashCache';
import contentCacheService from './contentCache';
import gatewayManager from './gatewayManager';
import { NetworkType } from '@/shared/types';
import {
    ContenthashType,
    DEFAULT_BROWSER_SETTINGS,
    GatewayConfig,
    GatewayHealth,
    OpnetBrowserSettings,
    OpnetCacheSettings,
    OpnetCacheStats,
    OpnetDomainRecord,
    OpnetProtocolError,
    OpnetProtocolErrorInfo,
    ParsedOpnetUrl,
    ResolvedContent
} from '@/shared/types/OpnetProtocol';
import Web3API from '@/shared/web3/Web3API';
import { BTC_NAME_RESOLVER_ABI } from '@/shared/web3/abi/BTC_NAME_RESOLVER_ABI';
import { IBtcNameResolverContract } from '@/shared/web3/interfaces/IBtcNameResolverContract';

const BROWSER_SETTINGS_KEY = 'opnet_browser_settings';

class OpnetProtocolService {
    private browserSettings: OpnetBrowserSettings = { ...DEFAULT_BROWSER_SETTINGS };
    private currentNetworkType: NetworkType = NetworkType.MAINNET;
    private initialized = false;

    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            // Initialize sub-services
            await contenthashCacheService.init();
            await contentCacheService.init();
            await gatewayManager.init();

            // Load browser settings
            const data = await browser.storage.local.get(BROWSER_SETTINGS_KEY);
            if (data[BROWSER_SETTINGS_KEY]) {
                this.browserSettings = { ...DEFAULT_BROWSER_SETTINGS, ...data[BROWSER_SETTINGS_KEY] };
            }

            // Set up navigation listener if enabled
            if (this.browserSettings.enabled) {
                this.setupNavigationListener();
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize OPNet protocol service:', error);
        }
    }

    private setupNavigationListener(): void {
        // Listen for .btc domain navigation
        if (chrome.webNavigation) {
            chrome.webNavigation.onBeforeNavigate.addListener(
                this.handleNavigation.bind(this),
                { url: [{ hostSuffix: '.btc' }] }
            );
        }

        // Set up omnibox if available
        if (chrome.omnibox) {
            chrome.omnibox.onInputEntered.addListener(this.handleOmniboxInput.bind(this));
            chrome.omnibox.setDefaultSuggestion({
                description: 'Navigate to OPNet domain: %s.btc'
            });
        }
    }

    private removeNavigationListener(): void {
        if (chrome.webNavigation) {
            chrome.webNavigation.onBeforeNavigate.removeListener(this.handleNavigation);
        }
        if (chrome.omnibox) {
            chrome.omnibox.onInputEntered.removeListener(this.handleOmniboxInput);
        }
    }

    private handleNavigation(details: { tabId: number; url: string; frameId: number }): void {
        if (details.frameId !== 0) return; // Only main frame

        try {
            const url = new URL(details.url);
            if (url.hostname.endsWith('.btc')) {
                // Redirect to resolver page
                const normalizedUrl = this.normalizeUrl(details.url);
                const resolverUrl = chrome.runtime.getURL(
                    `opnet-resolver.html?url=${encodeURIComponent(normalizedUrl)}`
                );

                chrome.tabs.update(details.tabId, { url: resolverUrl });
            }
        } catch (error) {
            console.error('Navigation handling error:', error);
        }
    }

    private handleOmniboxInput(
        text: string,
        disposition: 'currentTab' | 'newForegroundTab' | 'newBackgroundTab'
    ): void {
        // Normalize input - user might type "mysite.btc" or just "mysite"
        let domain = text.trim().toLowerCase();
        if (!domain.endsWith('.btc')) {
            domain += '.btc';
        }

        const resolverUrl = chrome.runtime.getURL(
            `opnet-resolver.html?url=${encodeURIComponent(`opnet://${domain}`)}`
        );

        switch (disposition) {
            case 'currentTab':
                chrome.tabs.update({ url: resolverUrl });
                break;
            case 'newForegroundTab':
                chrome.tabs.create({ url: resolverUrl, active: true });
                break;
            case 'newBackgroundTab':
                chrome.tabs.create({ url: resolverUrl, active: false });
                break;
        }
    }

    // =========================================================================
    // URL Parsing
    // =========================================================================

    parseUrl(url: string): ParsedOpnetUrl {
        let protocol = 'opnet:';
        let normalized = url;

        if (url.startsWith('web+opnet://')) {
            protocol = 'web+opnet:';
            normalized = url.replace('web+opnet://', '');
        } else if (url.startsWith('opnet://')) {
            normalized = url.replace('opnet://', '');
        } else if (url.includes('.btc')) {
            // Handle http(s)://*.btc URLs
            try {
                const parsed = new URL(url);
                normalized = parsed.hostname + parsed.pathname + parsed.search + parsed.hash;
            } catch {
                // If URL parsing fails, treat as domain
                normalized = url;
            }
        }

        // Split into parts
        const [hostAndPath, hashPart] = normalized.split('#');
        const [hostAndPathNoQuery, queryPart] = hostAndPath.split('?');
        const [host, ...pathParts] = hostAndPathNoQuery.split('/');

        const domain = host.toLowerCase().replace(/\.btc$/, '');
        const fullDomain = domain.endsWith('.btc') ? domain : `${domain}.btc`;
        const path = '/' + pathParts.join('/');
        const query = queryPart ? `?${queryPart}` : '';
        const hash = hashPart ? `#${hashPart}` : '';

        // Check if subdomain
        const dotIndex = domain.indexOf('.');
        const isSubdomain = dotIndex > 0 && dotIndex < domain.length - 1;

        return {
            protocol,
            domain,
            fullDomain,
            path,
            query,
            hash,
            isSubdomain,
            parentDomain: isSubdomain ? domain.substring(dotIndex + 1) : undefined,
            subdomainLabel: isSubdomain ? domain.substring(0, dotIndex) : undefined
        };
    }

    normalizeUrl(url: string): string {
        const parsed = this.parseUrl(url);
        return `opnet://${parsed.fullDomain}${parsed.path}${parsed.query}${parsed.hash}`;
    }

    // =========================================================================
    // Domain Resolution
    // =========================================================================

    /**
     * Get the BtcNameResolver contract instance.
     * Returns null if the resolver address is not configured for the current network.
     */
    private getResolverContract(): IBtcNameResolverContract | null {
        const resolverAddress = Web3API.btcResolverAddressP2OP;
        if (!resolverAddress) {
            return null;
        }

        return getContract<IBtcNameResolverContract>(
            resolverAddress,
            BTC_NAME_RESOLVER_ABI,
            Web3API.provider,
            Web3API.network
        );
    }

    async resolveDomain(domain: string): Promise<OpnetDomainRecord | OpnetProtocolErrorInfo> {
        // Normalize domain
        const domainLower = domain.toLowerCase().replace(/\.btc$/, '');

        // Check cache first
        const cached = contenthashCacheService.get(domainLower, this.currentNetworkType);
        if (cached) {
            return {
                domain: domainLower,
                owner: '', // Cached doesn't include owner
                contenthash: cached.contenthash,
                contenthashType: cached.contenthashType,
                ttl: cached.ttl,
                createdAt: 0,
                exists: true
            };
        }

        try {
            // Get the resolver contract
            const resolverContract = this.getResolverContract();
            if (!resolverContract) {
                return {
                    type: OpnetProtocolError.INDEXER_OFFLINE,
                    message: 'BtcNameResolver contract not configured for this network',
                    domain: domainLower
                };
            }

            // Query the domain info first to check if it exists
            const domainResult = await resolverContract.getDomain(domainLower);
            if (!domainResult.properties.exists) {
                return {
                    type: OpnetProtocolError.DOMAIN_NOT_REGISTERED,
                    message: `Domain "${domainLower}.btc" is not registered`,
                    domain: domainLower
                };
            }

            // Query the contenthash
            const contenthashResult = await resolverContract.getContenthash(domainLower);

            const hashType = contenthashResult.properties.hashType as ContenthashType;
            const hashString = contenthashResult.properties.hashString;

            // Check if contenthash is empty
            if (hashType === ContenthashType.NONE || !hashString) {
                return {
                    type: OpnetProtocolError.CONTENTHASH_EMPTY,
                    message: `Domain "${domainLower}.btc" has no contenthash configured`,
                    domain: domainLower
                };
            }

            const ttl = Number(domainResult.properties.ttl);
            const ownerAddress = domainResult.properties.owner.p2tr(Web3API.network);

            // Cache the result
            contenthashCacheService.set(
                domainLower,
                hashString,
                hashType,
                this.currentNetworkType,
                ttl
            );

            return {
                domain: domainLower,
                owner: ownerAddress,
                contenthash: hashString,
                contenthashType: hashType,
                ttl,
                createdAt: Number(domainResult.properties.createdAt),
                exists: true
            };
        } catch (error) {
            console.error('Domain resolution error:', error);

            // Check for specific error types
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (errorMessage.includes('not found') || errorMessage.includes('Contract not found')) {
                return {
                    type: OpnetProtocolError.DOMAIN_NOT_REGISTERED,
                    message: `Domain "${domainLower}.btc" is not registered`,
                    domain: domainLower
                };
            }

            return {
                type: OpnetProtocolError.INDEXER_OFFLINE,
                message: 'Unable to connect to OPNet indexer',
                domain: domainLower,
                details: errorMessage
            };
        }
    }

    /**
     * Resolve a subdomain (e.g., "sub.mydomain.btc")
     */
    async resolveSubdomain(fullName: string): Promise<OpnetDomainRecord | OpnetProtocolErrorInfo> {
        // Normalize the full subdomain name
        const nameLower = fullName.toLowerCase().replace(/\.btc$/, '');

        // Check cache first
        const cached = contenthashCacheService.get(nameLower, this.currentNetworkType);
        if (cached) {
            return {
                domain: nameLower,
                owner: '',
                contenthash: cached.contenthash,
                contenthashType: cached.contenthashType,
                ttl: cached.ttl,
                createdAt: 0,
                exists: true
            };
        }

        try {
            const resolverContract = this.getResolverContract();
            if (!resolverContract) {
                return {
                    type: OpnetProtocolError.INDEXER_OFFLINE,
                    message: 'BtcNameResolver contract not configured for this network',
                    domain: nameLower
                };
            }

            // Query the subdomain
            const subdomainResult = await resolverContract.getSubdomain(nameLower);
            if (!subdomainResult.properties.exists) {
                return {
                    type: OpnetProtocolError.DOMAIN_NOT_REGISTERED,
                    message: `Subdomain "${nameLower}.btc" is not registered`,
                    domain: nameLower
                };
            }

            // Query the contenthash for the subdomain
            const contenthashResult = await resolverContract.getContenthash(nameLower);

            const hashType = contenthashResult.properties.hashType as ContenthashType;
            const hashString = contenthashResult.properties.hashString;

            if (hashType === ContenthashType.NONE || !hashString) {
                return {
                    type: OpnetProtocolError.CONTENTHASH_EMPTY,
                    message: `Subdomain "${nameLower}.btc" has no contenthash configured`,
                    domain: nameLower
                };
            }

            const ttl = Number(subdomainResult.properties.ttl);
            const ownerAddress = subdomainResult.properties.owner.p2tr(Web3API.network);

            // Cache the result
            contenthashCacheService.set(nameLower, hashString, hashType, this.currentNetworkType, ttl);

            return {
                domain: nameLower,
                owner: ownerAddress,
                contenthash: hashString,
                contenthashType: hashType,
                ttl,
                createdAt: 0,
                exists: true
            };
        } catch (error) {
            console.error('Subdomain resolution error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            return {
                type: OpnetProtocolError.INDEXER_OFFLINE,
                message: 'Unable to resolve subdomain',
                domain: nameLower,
                details: errorMessage
            };
        }
    }

    /**
     * Resolve any .btc name (domain or subdomain)
     */
    async resolveAny(name: string): Promise<OpnetDomainRecord | OpnetProtocolErrorInfo> {
        const parsed = this.parseUrl(`opnet://${name}`);

        if (parsed.isSubdomain) {
            return this.resolveSubdomain(parsed.domain);
        }

        return this.resolveDomain(parsed.domain);
    }

    // =========================================================================
    // Content Fetching
    // =========================================================================

    async fetchContent(
        contenthash: string,
        contenthashType: ContenthashType,
        path: string = ''
    ): Promise<ResolvedContent | OpnetProtocolErrorInfo> {
        // Get the CID based on type
        let cid: string;

        switch (contenthashType) {
            case ContenthashType.CIDv0:
            case ContenthashType.CIDv1:
                cid = contenthash;
                break;
            case ContenthashType.IPNS:
                // IPNS resolution would go through IPFS gateway
                cid = contenthash;
                break;
            case ContenthashType.SHA256:
                // Convert raw hash to CID format
                // This would need proper CID encoding
                return {
                    type: OpnetProtocolError.INVALID_CONTENTHASH,
                    message: 'SHA256 hash contenthash type not yet supported'
                };
            default:
                return {
                    type: OpnetProtocolError.INVALID_CONTENTHASH,
                    message: 'Unknown contenthash type'
                };
        }

        // Check content cache
        const cacheKey = `${cid}${path}`;
        const cachedContent = contentCacheService.get(cacheKey);
        if (cachedContent) {
            return {
                html: cachedContent.content,
                contentType: cachedContent.contentType,
                ipfsHash: cid,
                domain: '',
                path
            };
        }

        try {
            const response = await gatewayManager.fetchFromGateway(cid, path || undefined);
            const contentType = response.headers.get('content-type') || 'text/html';
            const html = await response.text();

            // Cache the content
            const cacheHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                cacheHeaders[key] = value;
            });
            contentCacheService.set(cacheKey, html, contentType, cacheHeaders);

            return {
                html,
                contentType,
                ipfsHash: cid,
                domain: '',
                path
            };
        } catch (error) {
            console.error('Content fetch error:', error);
            return {
                type: OpnetProtocolError.IPFS_UNREACHABLE,
                message: 'Unable to fetch content from IPFS gateways'
            };
        }
    }

    // =========================================================================
    // Settings Management
    // =========================================================================

    getBrowserSettings(): OpnetBrowserSettings {
        return { ...this.browserSettings };
    }

    async setBrowserSettings(settings: Partial<OpnetBrowserSettings>): Promise<void> {
        const wasEnabled = this.browserSettings.enabled;
        this.browserSettings = { ...this.browserSettings, ...settings };

        await browser.storage.local.set({ [BROWSER_SETTINGS_KEY]: this.browserSettings });

        // Update navigation listener
        if (settings.enabled !== undefined) {
            if (settings.enabled && !wasEnabled) {
                this.setupNavigationListener();
            } else if (!settings.enabled && wasEnabled) {
                this.removeNavigationListener();
            }
        }
    }

    getCacheSettings(): OpnetCacheSettings {
        return contenthashCacheService.getSettings();
    }

    async updateCacheSettings(settings: Partial<OpnetCacheSettings>): Promise<void> {
        await contenthashCacheService.updateSettings(settings);

        // Update content cache max size if changed
        if (settings.contentCacheMaxSizeMb !== undefined) {
            contentCacheService.setMaxSize(settings.contentCacheMaxSizeMb);
        }
    }

    // =========================================================================
    // Cache Management
    // =========================================================================

    async clearCache(): Promise<void> {
        contenthashCacheService.clearCache();
        await contentCacheService.clear();
    }

    getCacheStats(): OpnetCacheStats {
        const contenthashStats = contenthashCacheService.getStats();
        const contentStats = contentCacheService.getStats();

        return {
            contenthashEntries: contenthashStats.entries,
            contentEntries: contentStats.entries,
            contentSizeMb: contentStats.totalSizeMb,
            maxSizeMb: contentStats.maxSizeMb
        };
    }

    // =========================================================================
    // Gateway Management
    // =========================================================================

    getGateways(): { config: GatewayConfig; health: GatewayHealth }[] {
        return gatewayManager.getAllGateways();
    }

    async addGateway(url: string): Promise<void> {
        await gatewayManager.addCustomGateway(url);
    }

    async removeGateway(url: string): Promise<void> {
        await gatewayManager.removeCustomGateway(url);
    }

    async setLocalNode(url: string | null): Promise<void> {
        await gatewayManager.setLocalNode(url);
    }

    async refreshGateways(): Promise<void> {
        await gatewayManager.checkAllGateways();
    }

    // =========================================================================
    // Network Management
    // =========================================================================

    setNetworkType(networkType: NetworkType): void {
        if (this.currentNetworkType !== networkType) {
            this.currentNetworkType = networkType;
            // Clear cache for old network
            contenthashCacheService.clearForNetwork(this.currentNetworkType);
        }
    }

    getNetworkType(): NetworkType {
        return this.currentNetworkType;
    }

    // =========================================================================
    // Cleanup
    // =========================================================================

    cleanup(): void {
        this.removeNavigationListener();
        contenthashCacheService.cleanup();
        gatewayManager.cleanup();
    }
}

export default new OpnetProtocolService();

// Re-export sub-services for direct access if needed
export { contenthashCacheService, contentCacheService, gatewayManager };
