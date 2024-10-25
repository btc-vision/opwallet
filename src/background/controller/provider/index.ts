import { ethErrors } from 'eth-rpc-errors';

import { keyringService, sessionService } from '@/background/service';
import { tab } from '@/background/webapi';

import { ProviderControllerRequest } from '@/shared/types/Request';
import internalMethod from './internalMethod';
import rpcFlow from './rpcFlow';


tab.on('tabRemove', (id) => {
    sessionService.deleteSession(id);
});

export default (req: ProviderControllerRequest): Promise<unknown> => {
    const method = req.data.method;

    // @ts-ignore
    if (internalMethod[method]) {
        // @ts-ignore
        return internalMethod[method](req);
    }

    const hasVault = keyringService.hasVault();
    if (!hasVault) {
        throw ethErrors.provider.userRejectedRequest({
            message: 'wallet must has at least one account'
        });
    }

    return rpcFlow(req);
};
