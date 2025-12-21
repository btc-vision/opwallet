// Browser tab utilities - no React dependencies
// For use in both background and UI contexts

import browser, {
    browserTabsCreate,
    browserTabsGetCurrent,
    browserTabsQuery,
    browserTabsUpdate
} from '@/background/webapi/browser';

export const openExtensionInTab = async () => {
    const url = browser.runtime.getURL('index.html');
    const tab = await browserTabsCreate({ url });
    return tab;
};

export const extensionIsInTab = async () => {
    return Boolean(await browserTabsGetCurrent());
};

export const focusExtensionTab = async () => {
    const tab = await browserTabsGetCurrent();
    if (tab && tab.id && tab?.id !== browser.tabs.TAB_ID_NONE) {
        browserTabsUpdate(tab.id, { active: true });
    }
};

export const getCurrentTab = async () => {
    const tabs = await browserTabsQuery({ active: true, currentWindow: true });
    return tabs[0];
};
