/**
 * Contenthash Cache Service
 *
 * Caches domain-to-contenthash resolutions with configurable TTL.
 */

import browser from '../../webapi/browser';
import eventBus from '@/shared/eventBus';
import { EVENTS } from '@/shared/constant';
import { NetworkType } from '@/shared/types';
import {
    ContenthashCacheEntry,
    ContenthashType,
    DEFAULT_CACHE_SETTINGS,
    OpnetCacheSettings
} from '@/shared/types/OpnetProtocol';

const STORAGE_KEY = 'opnet_contenthash_cache';
const SETTINGS_KEY = 'opnet_cache_settings';

class ContenthashCacheService {
    private cache: Map<string, ContenthashCacheEntry> = new Map();
    private settings: OpnetCacheSettings = { ...DEFAULT_CACHE_SETTINGS };
    private initialized = false;

    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            // Load cache from storage
            const data = await browser.storage.local.get([STORAGE_KEY, SETTINGS_KEY]);

            if (data[STORAGE_KEY]) {
                const entries = data[STORAGE_KEY] as ContenthashCacheEntry[];
                const now = Date.now();

                // Only load non-expired entries
                entries.forEach((entry) => {
                    if (entry.expiresAt > now) {
                        this.cache.set(
                            this.getCacheKey(entry.domain, entry.networkType),
                            entry
                        );
                    }
                });
            }

            if (data[SETTINGS_KEY]) {
                this.settings = { ...DEFAULT_CACHE_SETTINGS, ...data[SETTINGS_KEY] };
            }

            // Listen for network changes to clear cache
            eventBus.addEventListener(EVENTS.broadcastToUI, this.handleBroadcast);

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize contenthash cache:', error);
        }
    }

    private handleBroadcast = (params: unknown): void => {
        const p = params as { method?: string } | undefined;
        if (p?.method === 'networkChanged' || p?.method === 'chainChanged') {
            // Clear cache on network switch
            this.clearCache();
        }
    };

    private getCacheKey(domain: string, networkType: NetworkType): string {
        return `${domain.toLowerCase()}:${networkType}`;
    }

    get(domain: string, networkType: NetworkType): ContenthashCacheEntry | null {
        const key = this.getCacheKey(domain, networkType);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.persist();
            return null;
        }

        return entry;
    }

    set(
        domain: string,
        contenthash: string,
        contenthashType: ContenthashType,
        networkType: NetworkType,
        ttlSeconds?: number
    ): void {
        const now = Date.now();
        // Use contract TTL or settings TTL, whichever is smaller
        const contractTtlMs = ttlSeconds ? ttlSeconds * 1000 : this.settings.contenthashTtlMs;
        const ttlMs = Math.min(contractTtlMs, this.settings.contenthashTtlMs);

        const entry: ContenthashCacheEntry = {
            domain: domain.toLowerCase(),
            contenthash,
            contenthashType,
            resolvedAt: now,
            expiresAt: now + ttlMs,
            networkType,
            ttl: ttlSeconds || Math.floor(this.settings.contenthashTtlMs / 1000)
        };

        this.cache.set(this.getCacheKey(domain, networkType), entry);
        this.persist();
    }

    invalidate(domain: string, networkType?: NetworkType): void {
        if (networkType !== undefined) {
            this.cache.delete(this.getCacheKey(domain, networkType));
        } else {
            // Remove for all networks
            const domainLower = domain.toLowerCase();
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${domainLower}:`)) {
                    this.cache.delete(key);
                }
            }
        }
        this.persist();
    }

    clearCache(): void {
        this.cache.clear();
        this.persist();
    }

    clearForNetwork(networkType: NetworkType): void {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.networkType === networkType) {
                this.cache.delete(key);
            }
        }
        this.persist();
    }

    getSettings(): OpnetCacheSettings {
        return { ...this.settings };
    }

    async updateSettings(settings: Partial<OpnetCacheSettings>): Promise<void> {
        this.settings = { ...this.settings, ...settings };
        await browser.storage.local.set({ [SETTINGS_KEY]: this.settings });
    }

    getStats(): { entries: number } {
        return {
            entries: this.cache.size
        };
    }

    private async persist(): Promise<void> {
        try {
            const entries = Array.from(this.cache.values());
            await browser.storage.local.set({ [STORAGE_KEY]: entries });
        } catch (error) {
            console.error('Failed to persist contenthash cache:', error);
        }
    }

    cleanup(): void {
        eventBus.removeEventListener(EVENTS.broadcastToUI, this.handleBroadcast);
    }
}

export default new ContenthashCacheService();
