import { useContext } from 'react';

import { WalletContext, WalletController } from './WalletContext';

export const useWallet = () => {
    const ctx = useContext(WalletContext) as { wallet: WalletController };
    return ctx.wallet;
};
