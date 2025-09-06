import { BitcoinBalance } from '@/shared/types';

export interface BalanceCacheEntry {
    balance: BitcoinBalance;
    timestamp: number;
    fetchPromise?: Promise<BitcoinBalance>;
}

export class BalanceManager {
    private balanceCache: Map<string, BalanceCacheEntry> = new Map();
    private readonly CACHE_DURATION = 8000;
    private cacheCleanupTimer: NodeJS.Timeout | null = null;

    public startCacheCleanup(): void {
        if (this.cacheCleanupTimer) {
            clearInterval(this.cacheCleanupTimer);
        }
        this.cacheCleanupTimer = setInterval(() => {
            this.cleanupExpiredCache();
        }, this.CACHE_DURATION);
    }

    public stopCacheCleanup(): void {
        if (this.cacheCleanupTimer) {
            clearInterval(this.cacheCleanupTimer);
            this.cacheCleanupTimer = null;
        }
        this.balanceCache.clear();
    }

    private cleanupExpiredCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.balanceCache.entries()) {
            if (now - entry.timestamp > this.CACHE_DURATION) {
                this.balanceCache.delete(key);
            }
        }
    }

    public async getBalanceWithCache(
        address: string, 
        fetchBalance: () => Promise<BitcoinBalance>
    ): Promise<BitcoinBalance> {
        const cacheKey = address;
        const now = Date.now();
        const cached = this.balanceCache.get(cacheKey);

        if (cached && (now - cached.timestamp < this.CACHE_DURATION)) {
            return cached.balance;
        }

        if (cached?.fetchPromise) {
            try {
                return await cached.fetchPromise;
            } catch {
                // Continue to create new fetch
            }
        }

        const fetchPromise = this.createFetchWithErrorHandling(fetchBalance, cacheKey, now);
        
        if (cached) {
            cached.fetchPromise = fetchPromise;
        } else {
            this.balanceCache.set(cacheKey, {
                balance: { amount: '0', btc_amount: '0', satoshis: 0 },
                timestamp: 0,
                fetchPromise
            });
        }

        return await fetchPromise;
    }

    private async createFetchWithErrorHandling(
        fetchBalance: () => Promise<BitcoinBalance>,
        cacheKey: string,
        startTime: number
    ): Promise<BitcoinBalance> {
        try {
            const balance = await fetchBalance();
            
            const entry = this.balanceCache.get(cacheKey);
            if (entry) {
                entry.balance = balance;
                entry.timestamp = startTime;
                delete entry.fetchPromise;
            }
            
            return balance;
        } catch (error) {
            const cached = this.balanceCache.get(cacheKey);
            
            if (cached && cached.balance && cached.balance.amount !== '0') {
                cached.timestamp = startTime - (this.CACHE_DURATION - 5000);
                delete cached.fetchPromise;
                return cached.balance;
            }

            delete cached?.fetchPromise;
            throw error;
        }
    }

    public clearCache(): void {
        this.balanceCache.clear();
    }
}