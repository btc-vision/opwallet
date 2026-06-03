import { useContext } from 'react';

import { ActionComponentContext } from './ActionComponentContext';

export function useTools() {
    return useContext(ActionComponentContext);
}
