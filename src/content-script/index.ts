import { nanoid } from 'nanoid';

import { SendMessagePayload } from '@/shared/types/Message';
import { RequestParams } from '@/shared/types/Request.js';
import { Message } from '@/shared/utils';
import browser from 'webextension-polyfill';

function injectScript() {
    try {
        const channelName = nanoid();

        // Use sessionStorage (works across page context)
        sessionStorage.setItem('__opnetChannel', channelName);

        // Use a data attribute on the script tag itself
        const scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'module');
        scriptTag.setAttribute('data-channel', channelName);
        scriptTag.src = browser.runtime.getURL('pageProvider.js');

        // Use microtask
        Promise.resolve().then(() => {
            requestAnimationFrame(() => {
                const target = document.head || document.documentElement;
                if (target) {
                    scriptTag.onload = () => {
                        // Remove immediately after load
                        scriptTag.remove();
                    };
                    scriptTag.onerror = () => {
                        scriptTag.remove();
                        console.warn('OPNet: Failed to load provider script');
                    };

                    target.appendChild(scriptTag);
                } else {
                    // Retry if no target available
                    setTimeout(() => injectScript(), 10);
                    return;
                }
            });
        });

        // Set up communication channels
        const { BroadcastChannelMessage, PortMessage } = Message;

        const pm = new PortMessage().connect();
        const bcm = new BroadcastChannelMessage(channelName).listen((data: RequestParams) => {
            return pm.request(data);
        });

        pm.on('message', (data: SendMessagePayload) => {
            bcm.send('message', data);
        });

        document.addEventListener('beforeunload', () => {
            bcm.dispose();
            pm.dispose();
        });
    } catch (error) {
        console.warn('OPNet: Provider injection failed.', error);
    }
}

/**
 * Checks the doctype of the current document if it exists
 *
 * @returns {boolean} {@code true} if the doctype is html or if none exists
 */
function doctypeCheck(): boolean {
    const { doctype } = window.document;
    if (doctype) {
        return doctype.name === 'html';
    }
    return true;
}

/**
 * Returns whether or not the extension (suffix) of the current document is prohibited
 *
 * This checks {@code window.location.pathname} against a set of file extensions
 * that we should not inject the provider into. This check is indifferent of
 * query parameters in the location.
 *
 * @returns {boolean} whether or not the extension of the current document is prohibited
 */
function suffixCheck(): boolean {
    const prohibitedTypes = [/\.xml$/u, /\.pdf$/u];
    const currentUrl = window.location.pathname;
    for (const prohibitedType of prohibitedTypes) {
        if (prohibitedType.test(currentUrl)) {
            return false;
        }
    }
    return true;
}

/**
 * Checks the documentElement of the current document
 *
 * @returns {boolean} {@code true} if the documentElement is an html node or if none exists
 */
function documentElementCheck(): boolean {
    const documentElement = document.documentElement.nodeName;
    if (documentElement) {
        return documentElement.toLowerCase() === 'html';
    }
    return true;
}

/**
 * Checks if the current domain is blocked
 *
 * @returns {boolean} {@code true} if the current domain is blocked
 */
function blockedDomainCheck(): boolean {
    const blockedDomains: string[] = [];
    if (!blockedDomains.length) {
        return false;
    }

    const currentUrl = window.location.href;

    let currentRegex: RegExp;
    for (const blockedDomain of blockedDomains) {
        const escapedDomain = blockedDomain.replace('.', '\\.');
        currentRegex = new RegExp(`(?:https?:\\/\\/)(?:(?!${escapedDomain}).)*$`, 'u');
        if (!currentRegex.test(currentUrl)) {
            return true;
        }
    }

    return false;
}

function iframeCheck(): boolean {
    return self != top;
}

/**
 * Determines if the provider should be injected
 *
 * @returns {boolean} {@code true} Whether the provider should be injected
 */
function shouldInjectProvider(): boolean {
    return doctypeCheck() && suffixCheck() && documentElementCheck() && !blockedDomainCheck() && !iframeCheck();
}

if (shouldInjectProvider()) {
    if (document.readyState === 'loading' && !document.documentElement) {
        // Very early, wait for documentElement
        const observer = new MutationObserver((_mutations, obs) => {
            if (document.documentElement) {
                obs.disconnect();
                injectScript();
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    } else {
        injectScript();
    }
}
