import keyringService from '@/background/service/keyring';

import { SessionInfo } from '@/background/service/session';
import { ProviderState } from '@/shared/types/Provider';
import { ProviderControllerRequest } from '@/shared/types/Request';
import wallet from '../wallet';

const tabCheckin = (req: ProviderControllerRequest) => {
    // SECURITY: Only allow page to set name and icon, NOT origin
    // Origin is set from browser-verified source in background/index.ts
    // This prevents origin spoofing attacks
    const { name, icon } = req.data.params as SessionInfo;

    // Only update name and icon, preserve the browser-verified origin
    req.session.name = name || req.session.name;
    req.session.icon = icon || req.session.icon;
};

const getProviderState = async (_req: ProviderControllerRequest): Promise<ProviderState> => {
    const isUnlocked = keyringService.memStore.getState().isUnlocked;
    const accounts: string[] = [];
    if (isUnlocked) {
        const currentAccount = await wallet.getCurrentAccount();
        if (currentAccount) {
            accounts.push(currentAccount.address);
        }
    }
    return {
        network: wallet.getLegacyNetworkName(),
        chain: wallet.getChainType(),
        isUnlocked,
        accounts
    };
};

const keepAlive = (_req: ProviderControllerRequest) => {
    return 'ACK_KEEP_ALIVE_MESSAGE';
};

export interface InternalMethod {
    tabCheckin: (req: ProviderControllerRequest) => void;
    getProviderState: (req: ProviderControllerRequest) => Promise<ProviderState>;
    keepAlive: (req: ProviderControllerRequest) => string;
}

const internalMethod: InternalMethod = {
    tabCheckin,
    getProviderState,
    keepAlive
};

export default internalMethod;
