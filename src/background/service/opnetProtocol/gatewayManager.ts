/**
 * Gateway Manager Service
 *
 * Manages IPFS gateways with health checking and prioritization.
 */

import {
    DEFAULT_IPFS_GATEWAYS,
    GatewayConfig,
    GatewayHealth
} from '@/shared/types/OpnetProtocol';
import contenthashCacheService from './contenthashCache';

const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const TEST_CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // IPFS readme

class GatewayManager {
    private gateways: GatewayConfig[] = [];
    private healthStatus: Map<string, GatewayHealth> = new Map();
    private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
    private localNodeUrl: string | null = null;
    private initialized = false;

    async init(): Promise<void> {
        if (this.initialized) return;

        const settings = contenthashCacheService.getSettings();

        // Initialize gateways list
        this.gateways = [...DEFAULT_IPFS_GATEWAYS];

        // Add user-configured gateways
        if (settings.customGateways) {
            settings.customGateways.forEach((g) => {
                if (!this.gateways.find((existing) => existing.url === g.url)) {
                    this.gateways.push(g);
                }
            });
        }

        // Set local node if configured
        if (settings.localIpfsNodeUrl) {
            this.localNodeUrl = settings.localIpfsNodeUrl;
            // Local node gets highest priority
            this.gateways.unshift({
                url: settings.localIpfsNodeUrl,
                priority: -1,
                isDefault: false,
                isUserConfigured: true,
                isLocalNode: true
            });
        }

        // Initialize health status
        this.gateways.forEach((g) => {
            this.healthStatus.set(g.url, {
                url: g.url,
                isHealthy: true, // Assume healthy until checked
                latency: Infinity,
                lastChecked: 0,
                failureCount: 0,
                successCount: 0
            });
        });

        // Start health checking
        await this.checkAllGateways();
        this.startHealthCheckTimer();

        this.initialized = true;
    }

    private startHealthCheckTimer(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        this.healthCheckTimer = setInterval(() => {
            this.checkAllGateways();
        }, HEALTH_CHECK_INTERVAL);
    }

    async checkAllGateways(): Promise<void> {
        const checks = this.gateways.map((g) => this.checkGateway(g.url));
        await Promise.allSettled(checks);
        this.sortGatewaysByHealth();
    }

    private async checkGateway(url: string): Promise<void> {
        const health = this.healthStatus.get(url);
        if (!health) return;

        const testUrl = `${url}/ipfs/${TEST_CID}`;
        const startTime = Date.now();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

            const response = await fetch(testUrl, {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const latency = Date.now() - startTime;

            if (response.ok) {
                health.isHealthy = true;
                health.latency = latency;
                health.successCount++;
                health.failureCount = 0; // Reset on success
            } else {
                this.markGatewayFailed(health);
            }
        } catch {
            this.markGatewayFailed(health);
        }

        health.lastChecked = Date.now();
    }

    private markGatewayFailed(health: GatewayHealth): void {
        health.failureCount++;
        health.latency = Infinity;

        // Mark unhealthy after 3 consecutive failures
        if (health.failureCount >= 3) {
            health.isHealthy = false;
        }
    }

    private sortGatewaysByHealth(): void {
        this.gateways.sort((a, b) => {
            const healthA = this.healthStatus.get(a.url);
            const healthB = this.healthStatus.get(b.url);

            if (!healthA || !healthB) return 0;

            // Healthy gateways first
            if (healthA.isHealthy !== healthB.isHealthy) {
                return healthA.isHealthy ? -1 : 1;
            }

            // Then by latency
            if (healthA.latency !== healthB.latency) {
                return healthA.latency - healthB.latency;
            }

            // Then by configured priority
            return a.priority - b.priority;
        });
    }

    getOrderedGateways(): GatewayConfig[] {
        return this.gateways.filter((g) => {
            const health = this.healthStatus.get(g.url);
            return health?.isHealthy !== false; // Include healthy and unchecked
        });
    }

    getAllGateways(): { config: GatewayConfig; health: GatewayHealth }[] {
        return this.gateways.map((g) => ({
            config: g,
            health: this.healthStatus.get(g.url) ?? {
                url: g.url,
                isHealthy: false,
                latency: Infinity,
                lastChecked: 0,
                failureCount: 0,
                successCount: 0
            }
        }));
    }

    async addCustomGateway(url: string): Promise<void> {
        if (this.gateways.find((g) => g.url === url)) return;

        const config: GatewayConfig = {
            url,
            priority: this.gateways.length,
            isDefault: false,
            isUserConfigured: true,
            isLocalNode: url.includes('localhost') || url.includes('127.0.0.1')
        };

        this.gateways.push(config);
        this.healthStatus.set(url, {
            url,
            isHealthy: true,
            latency: Infinity,
            lastChecked: 0,
            failureCount: 0,
            successCount: 0
        });

        // Save to settings
        const settings = contenthashCacheService.getSettings();
        const customGateways = [...(settings.customGateways || []), config];
        await contenthashCacheService.updateSettings({ customGateways });

        // Check health immediately
        await this.checkGateway(url);
        this.sortGatewaysByHealth();
    }

    async removeCustomGateway(url: string): Promise<void> {
        const gateway = this.gateways.find((g) => g.url === url);
        if (!gateway || gateway.isDefault) return;

        this.gateways = this.gateways.filter((g) => g.url !== url);
        this.healthStatus.delete(url);

        // Update settings
        const settings = contenthashCacheService.getSettings();
        const customGateways = (settings.customGateways || []).filter((g) => g.url !== url);
        await contenthashCacheService.updateSettings({ customGateways });
    }

    async setLocalNode(url: string | null): Promise<void> {
        // Remove existing local node
        if (this.localNodeUrl) {
            this.gateways = this.gateways.filter((g) => g.url !== this.localNodeUrl);
            this.healthStatus.delete(this.localNodeUrl);
        }

        this.localNodeUrl = url;

        if (url) {
            const config: GatewayConfig = {
                url,
                priority: -1, // Highest priority
                isDefault: false,
                isUserConfigured: true,
                isLocalNode: true
            };

            this.gateways.unshift(config);
            this.healthStatus.set(url, {
                url,
                isHealthy: true,
                latency: Infinity,
                lastChecked: 0,
                failureCount: 0,
                successCount: 0
            });

            await this.checkGateway(url);
        }

        await contenthashCacheService.updateSettings({ localIpfsNodeUrl: url });
        this.sortGatewaysByHealth();
    }

    async fetchFromGateway(cid: string, path?: string): Promise<Response> {
        const gateways = this.getOrderedGateways();
        const fullPath = path ? `${cid}${path}` : cid;

        if (gateways.length === 0) {
            throw new Error('No healthy gateways available');
        }

        // AbortControllers to cancel losing requests
        const controllers: Map<number, AbortController> = new Map();

        // Race ALL gateways - return fastest successful response
        const fetchPromises = gateways.map((gateway, index) => {
            const controller = new AbortController();
            controllers.set(index, controller);

            const url = `${gateway.url}/ipfs/${fullPath}`;

            return fetch(url, {
                redirect: 'follow',
                headers: { Accept: '*/*' },
                signal: controller.signal
            })
                .then((response) => {
                    if (response.ok) {
                        // Update health on success
                        const health = this.healthStatus.get(gateway.url);
                        if (health) {
                            health.successCount++;
                            health.failureCount = 0;
                        }
                        return { response, index };
                    }
                    throw new Error(`Gateway ${gateway.url} returned ${response.status}`);
                })
                .catch((error: unknown) => {
                    // Mark gateway as potentially unhealthy (only if not aborted)
                    if (!controller.signal.aborted) {
                        const health = this.healthStatus.get(gateway.url);
                        if (health) {
                            health.failureCount++;
                        }
                    }
                    throw error;
                });
        });

        try {
            // Race for first successful response
            const result = await this.raceForSuccess(fetchPromises);

            // Cancel all other pending requests
            controllers.forEach((controller, i) => {
                if (i !== result.index) {
                    controller.abort();
                }
            });

            return result.response;
        } catch (error) {
            throw new Error('All gateways failed');
        }
    }

    /**
     * Race promises - resolve on first SUCCESS, reject only if ALL fail
     */
    private raceForSuccess<T>(promises: Promise<T>[]): Promise<T> {
        return new Promise((resolve, reject) => {
            let pendingCount = promises.length;
            const errors: Error[] = [];

            if (pendingCount === 0) {
                reject(new Error('No promises to race'));
                return;
            }

            promises.forEach((promise, index) => {
                promise
                    .then(resolve) // First success wins
                    .catch((error: unknown) => {
                        errors[index] = error instanceof Error ? error : new Error(String(error));
                        pendingCount--;
                        if (pendingCount === 0) {
                            reject(new AggregateError(errors, 'All requests failed'));
                        }
                    });
            });
        });
    }

    cleanup(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
}

export default new GatewayManager();
