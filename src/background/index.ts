import { EVENTS, MANIFEST_VERSION } from '@/shared/constant';
import eventBus from '@/shared/eventBus';
import { ProviderControllerRequest, RequestParams } from '@/shared/types/Request.js';
import { Message } from '@/shared/utils';
import { openExtensionInTab } from '@/ui/features/browser/tabs';
import 'reflect-metadata';

import { SessionEvent, SessionEventPayload } from '@/shared/interfaces/SessionEvent';
import { customNetworksManager } from '@/shared/utils/CustomNetworksManager';
import { initEccLib } from '@btc-vision/bitcoin';
import * as ecc from 'tiny-secp256k1';
import { Runtime } from 'webextension-polyfill';
import { providerController, walletController } from './controller';
import contactBookService from './service/contactBook';
import keyringService, { StoredData } from './service/keyring';
import opnetApi from './service/opnetApi';
import opnetProtocolService from './service/opnetProtocol';
import permissionService from './service/permission';
import preferenceService from './service/preference';
import sessionService from './service/session';
import { isWalletControllerMethod } from './utils/controller';
import { storage } from './webapi';
import browser, { browserRuntimeOnConnect, browserRuntimeOnInstalled } from './webapi/browser';

initEccLib(ecc);

const { PortMessage } = Message;

let appStoreLoaded = false;

async function restoreAppState() {
    const keyringState = await storage.get<StoredData>('keyringState');
    keyringService.loadStore(keyringState ?? { booted: '', vault: '' });
    keyringService.store.subscribe((value) => storage.set('keyringState', value));

    await preferenceService.init();

    await opnetApi.init();

    await permissionService.init();

    await contactBookService.init();

    await customNetworksManager.reload();

    // Initialize OPNet protocol service
    await opnetProtocolService.init();

    chrome.storage.onChanged.addListener(async (changes, areaName) => {
        if (areaName === 'local' && changes['custom_networks']) {
            console.log('Custom networks updated from UI, reinitializing...');
            // Force reload of custom networks and rebuild CHAINS_MAP
            await customNetworksManager.reload();
        }
    });

    // Apply side panel preference (default is false = popup mode)
    if (chrome.sidePanel) {
        const useSidePanel = preferenceService.getUseSidePanel();

        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidePanel }).catch(console.error);
    }

    appStoreLoaded = true;
}

void restoreAppState();

// for page provider
browserRuntimeOnConnect((port: Runtime.Port) => {
    if (port.name === 'popup' || port.name === 'notification' || port.name === 'tab') {
        const pm = new PortMessage(port);
        pm.listen((data: RequestParams) => {
            if (data?.type) {
                switch (data.type) {
                    case 'broadcast':
                        eventBus.emit(data.method, data.params);
                        return Promise.resolve();
                    case 'controller':
                    default:
                        // TODO (typing): Check this again as it's not the most ideal solution.
                        // However, the problem is that we have a general type like RequestParams for
                        // incoming request data as we have different handlers. So, we assumed that
                        // the params are passed correctly for each method for now
                        if (isWalletControllerMethod(data.method)) {
                            const method = walletController[data.method];
                            const params = Array.isArray(data.params) ? data.params : [];
                            return Promise.resolve(
                                (method as (...args: unknown[]) => unknown).apply(walletController, params)
                            );
                        } else {
                            const errorMsg = `Method ${data.method} not found in controller`;
                            console.error(errorMsg);
                            return Promise.reject(new Error(errorMsg));
                        }
                }
            } else {
                return Promise.reject(new Error('Missing data in the received message'));
            }
        });

        const boardcastCallback = async (params: unknown) => {
            const data = params as RequestParams;
            await pm.request({
                type: 'broadcast',
                method: data.method,
                params: data.params
            });
        };

        if (port.name === 'popup') {
            preferenceService.setPopupOpen(true);

            port.onDisconnect.addListener(() => {
                preferenceService.setPopupOpen(false);
            });
        }

        eventBus.addEventListener(EVENTS.broadcastToUI, boardcastCallback);
        port.onDisconnect.addListener(() => {
            eventBus.removeEventListener(EVENTS.broadcastToUI, boardcastCallback);
        });

        return;
    }

    const pm = new PortMessage(port);

    // SECURITY: Get the verified origin from the browser, not from the page
    // This prevents origin spoofing attacks where a malicious page claims to be a trusted site
    let verifiedOrigin = '';
    if (port.sender?.url) {
        try {
            verifiedOrigin = new URL(port.sender.url).origin;
        } catch {
            // Invalid URL, leave origin empty
        }
    }

    pm.listen(async (data) => {
        if (!appStoreLoaded) {
            // todo
        }

        const sessionId = port.sender?.tab?.id;
        if (sessionId == null) {
            throw new Error('Invalid session id');
        }

        const session = sessionService.getOrCreateSession(sessionId);

        // SECURITY: Always set origin from browser-verified source, never trust page-provided origin
        if (verifiedOrigin && session.origin !== verifiedOrigin) {
            session.origin = verifiedOrigin;
        }

        const req: ProviderControllerRequest = { data, session };

        // for background push to respective page
        session.pushMessage = <T extends SessionEvent>(event: T, data?: SessionEventPayload<T>) => {
            pm.send('message', { event, data });
        };

        return providerController(req);
    });

    port.onDisconnect.addListener(() => {
        // todo, remove session?
        pm.dispose();
    });
});

const addAppInstalledEvent = async () => {
    if (appStoreLoaded) {
        await openExtensionInTab();
        return;
    }
    setTimeout(async () => {
        await addAppInstalledEvent();
    }, 1000);
};

browserRuntimeOnInstalled(async (details) => {
    if (details.reason === 'install') {
        await addAppInstalledEvent();
    }
});

if (MANIFEST_VERSION === 'mv3') {
    // Keep alive for MV3
    const INTERNAL_STAYALIVE_PORT = 'CT_Internal_port_alive';
    let alivePort: Runtime.Port | null = null;

    setInterval(() => {
        // console.log('Highlander', Date.now());
        if (alivePort == null) {
            alivePort = browser.runtime.connect({ name: INTERNAL_STAYALIVE_PORT });

            alivePort.onDisconnect.addListener((p) => {
                if (browser.runtime.lastError) {
                    // console.log('(DEBUG Highlander) Expected disconnect (on error). SW should be still running.');
                } else {
                    // console.log('(DEBUG Highlander): port disconnected');
                }

                alivePort = null;
            });
        }

        if (alivePort) {
            alivePort.postMessage({ content: 'keep alive~' });

            if (browser.runtime.lastError) {
                // console.log(`(DEBUG Highlander): postMessage error: ${browser.runtime.lastError.message}`);
            } else {
                // console.log(`(DEBUG Highlander): sent through ${alivePort.name} port`);
            }
        }
    }, 5000);
}

// Intercept .btc domain navigation and redirect to resolver
const setupBtcDomainInterception = () => {
    // Listen for navigation to .btc domains
    chrome.webNavigation.onBeforeNavigate.addListener(
        (details) => {
            // Only intercept main frame navigations
            if (details.frameId !== 0) return;

            try {
                const url = new URL(details.url);

                // Check if it's a .btc domain
                if (url.hostname.endsWith('.btc')) {
                    // Build opnet URL
                    const opnetUrl = `opnet://${url.hostname}${url.pathname}${url.search}${url.hash}`;
                    const resolverUrl = chrome.runtime.getURL(
                        `opnet-resolver.html?url=${encodeURIComponent(opnetUrl)}`
                    );

                    // Redirect to resolver
                    chrome.tabs.update(details.tabId, { url: resolverUrl });
                }
            } catch {
                // Invalid URL, ignore
            }
        },
        {
            url: [
                { hostSuffix: '.btc' }
            ]
        }
    );
};

// Initialize .btc domain interception
setupBtcDomainInterception();

// OPNet Protocol message handler for resolver page
const opnetMessageHandler = (
    message: unknown,
    _sender: Runtime.MessageSender,
    sendResponse: (response: unknown) => void
): boolean | undefined => {
    const msg = message as { type?: string; params?: unknown[] } | undefined;
    if (msg && msg.type?.startsWith('opnetProtocol:')) {
        const method = msg.type.replace('opnetProtocol:', '');
        const params = msg.params || [];

        const handleMessage = async () => {
            try {
                switch (method) {
                    case 'parseUrl':
                        return opnetProtocolService.parseUrl(params[0] as string);
                    case 'resolveDomain':
                        return await opnetProtocolService.resolveDomain(params[0] as string);
                    case 'fetchContent':
                        return await opnetProtocolService.fetchContent(
                            params[0] as string,
                            params[1] as number,
                            params[2] as string
                        );
                    default:
                        throw new Error(`Unknown OPNet protocol method: ${method}`);
                }
            } catch (error) {
                console.error('OPNet protocol error:', error);
                throw error;
            }
        };

        handleMessage()
            .then((result) => sendResponse(result))
            .catch((error) => sendResponse({ error: (error as Error).message }));

        return true; // Keep the message channel open for async response
    }
    return undefined;
};
browser.runtime.onMessage.addListener(opnetMessageHandler as Parameters<typeof browser.runtime.onMessage.addListener>[0]);
