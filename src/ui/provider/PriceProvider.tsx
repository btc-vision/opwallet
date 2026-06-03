import { ReactNode, useCallback, useEffect, useState } from 'react';

import { useWallet } from '@/ui/utils';

import { PriceContext } from './PriceContext';

let isRequestingBtcPrice = false;
let refreshBtcPriceTime = 0;

export function PriceProvider({ children }: { children: ReactNode }) {
    const wallet = useWallet();
    const [isLoadingBtcPrice, setIsLoadingBtcPrice] = useState(false);
    const [btcPrice, setBtcPrice] = useState(0);

    const refreshBtcPrice = useCallback(() => {
        if (isRequestingBtcPrice) {
            return;
        }
        // 30s cache
        if (Date.now() - refreshBtcPriceTime < 30 * 1000) {
            return;
        }
        isRequestingBtcPrice = true;
        setIsLoadingBtcPrice(true);
        refreshBtcPriceTime = Date.now();
        wallet
            .getBtcPrice()
            .then((price) => {
                if (price > 0) setBtcPrice(price);
            })
            .catch((_e: unknown) => {
                // Keep previous price on error instead of resetting to 0
            })
            .finally(() => {
                setIsLoadingBtcPrice(false);
                isRequestingBtcPrice = false;
            });
    }, [wallet]);

    useEffect(() => {
        queueMicrotask(() => {
            refreshBtcPrice();
        });
    }, [refreshBtcPrice]);

    const value = {
        isLoadingBtcPrice,
        btcPrice,
        refreshBtcPrice
    };

    return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
}
