import { ReactNode } from 'react';

import { WalletContext, WalletController } from './WalletContext';

export const WalletProvider = ({ children, wallet }: { children?: ReactNode; wallet: WalletController }) => (
    <WalletContext.Provider value={{ wallet }}>{children}</WalletContext.Provider>
);
