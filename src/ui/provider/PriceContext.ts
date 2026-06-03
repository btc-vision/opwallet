import { createContext } from 'react';

export interface PriceContextType {
    isLoadingBtcPrice: boolean;
    btcPrice: number;
    refreshBtcPrice: () => void;
}

export const PriceContext = createContext<PriceContextType>({} as PriceContextType);
