import { useCallback, useEffect, useState } from 'react';

import { extensionIsInTab, openExtensionInTab } from '@/shared/utils/browser-tabs';

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
