import { useContext } from 'react';

import { PriceContext } from './PriceContext';

export function usePrice() {
    const context = useContext(PriceContext);
    if (!context) {
        throw Error('Feature flag hooks can only be used by children of BridgeProvider.');
    } else {
        return context;
    }
}
