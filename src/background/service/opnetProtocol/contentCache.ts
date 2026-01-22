import browser from '../../webapi/browser';
import { ContentCacheEntry } from '@/shared/types/OpnetProtocol';

const STORAGE_KEY = 'opnet_content_cache_meta';
const MAX_ENTRY_SIZE = 5 * 1024 * 1024; // 5 MB max per entry
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50 MB default

class ContentCacheService {
    private cache: Map<string, ContentCacheEntry> = new Map();
    private totalSize = 0;
    private maxSizeBytes: number = DEFAULT_MAX_SIZE;
    private initialized = false;

    async init(maxSizeMb?: number): Promise<void> {
        if (this.initialized) return;

        if (maxSizeMb) {
            this.maxSizeBytes = maxSizeMb * 1024 * 1024;
        }

        try {
            // Load metadata from storage
            const data = await browser.storage.local.get(STORAGE_KEY);
            if (data[STORAGE_KEY]) {
                const metadata = data[STORAGE_KEY] as ContentCacheEntry[];
                const now = Date.now();

                // Load non-expired entries
                for (const entry of metadata) {
                    if (entry.expiresAt > now) {
                        this.cache.set(entry.cid, entry);
                        this.totalSize += entry.size;
                    }
                }
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize content cache:', error);
        }
    }

    get(cid: string): ContentCacheEntry | null {
        const entry = this.cache.get(cid);

        if (!entry) return null;

        // Check expiration
        if (Date.now() > entry.expiresAt) {
            this.remove(cid);
            return null;
        }

        return entry;
    }

    set(
        cid: string,
        content: string,
        contentType: string,
        cacheHeaders?: Record<string, string>
    ): void {
        const size = new Blob([content]).size;

        // Don't cache if too large
        if (size > MAX_ENTRY_SIZE) {
            console.log(`Content too large to cache: ${size} bytes`);
            return;
        }

        // Parse cache headers for expiration
        const expiresAt = this.parseExpiration(cacheHeaders);

        // Evict if necessary
        this.ensureSpace(size);

        const entry: ContentCacheEntry = {
            cid,
            content,
            contentType,
            fetchedAt: Date.now(),
            expiresAt,
            size
        };

        this.cache.set(cid, entry);
        this.totalSize += size;
        this.persistMetadata();
    }

    private parseExpiration(headers?: Record<string, string>): number {
        const defaultExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours default

        if (!headers) return defaultExpiry;

        // Check Cache-Control max-age
        const cacheControl = headers['cache-control'] || headers['Cache-Control'];
        if (cacheControl) {
            const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
            if (maxAgeMatch) {
                return Date.now() + parseInt(maxAgeMatch[1], 10) * 1000;
            }
        }

        // Check Expires header
        const expires = headers['expires'] || headers['Expires'];
        if (expires) {
            const expiryDate = new Date(expires).getTime();
            if (!isNaN(expiryDate)) return expiryDate;
        }

        return defaultExpiry;
    }

    private ensureSpace(neededBytes: number): void {
        while (this.totalSize + neededBytes > this.maxSizeBytes && this.cache.size > 0) {
            // LRU eviction - remove oldest entry
            let oldestKey: string | null = null;
            let oldestTime = Infinity;

            for (const [key, entry] of this.cache.entries()) {
                if (entry.fetchedAt < oldestTime) {
                    oldestTime = entry.fetchedAt;
                    oldestKey = key;
                }
            }

            if (oldestKey) {
                this.remove(oldestKey);
            } else {
                break;
            }
        }
    }

    remove(cid: string): void {
        const entry = this.cache.get(cid);
        if (entry) {
            this.totalSize -= entry.size;
            this.cache.delete(cid);
            this.persistMetadata();
        }
    }

    async clear(): Promise<void> {
        this.cache.clear();
        this.totalSize = 0;
        await browser.storage.local.remove(STORAGE_KEY);
    }

    private async persistMetadata(): Promise<void> {
        try {
            const metadata = Array.from(this.cache.values());
            await browser.storage.local.set({ [STORAGE_KEY]: metadata });
        } catch (error) {
            console.error('Failed to persist content cache metadata:', error);
        }
    }

    getStats(): { entries: number; totalSizeMb: number; maxSizeMb: number } {
        return {
            entries: this.cache.size,
            totalSizeMb: this.totalSize / (1024 * 1024),
            maxSizeMb: this.maxSizeBytes / (1024 * 1024)
        };
    }

    setMaxSize(maxSizeMb: number): void {
        this.maxSizeBytes = maxSizeMb * 1024 * 1024;
        // Evict if over new limit
        this.ensureSpace(0);
    }
}

export default new ContentCacheService();
