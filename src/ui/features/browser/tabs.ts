import { useCallback, useEffect, useState } from 'react';

// Re-export non-React utilities from shared
export {
    openExtensionInTab,
    extensionIsInTab,
    focusExtensionTab,
    getCurrentTab
} from '@/shared/utils/browser-tabs';

import { extensionIsInTab, openExtensionInTab } from '@/shared/utils/browser-tabs';

// React hooks that depend on the shared utilities
export const useExtensionIsInTab = () => {
    const [isInTab, setIsInTab] = useState(false);
    useEffect(() => {
        const init = async () => {
            const inTab = await extensionIsInTab();
            setIsInTab(inTab);
        };
        init();
    }, []);
    return isInTab;
};

export const useOpenExtensionInTab = () => {
    return useCallback(async () => {
        await openExtensionInTab();
        window.close();
    }, []);
};
