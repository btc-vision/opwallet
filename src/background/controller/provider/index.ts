import { keyringService, sessionService } from '@/background/service';
import { tab } from '@/background/webapi';

import { isInternalMethod } from '@/background/utils/controller';
import { providerErrors } from '@/shared/lib/bitcoin-rpc-errors/errors';
import { ProviderControllerRequest } from '@/shared/types/Request';
import internalMethod from './internalMethod';
import rpcFlow from './rpcFlow';

tab.on('tabRemove', (id: number) => {
    sessionService.deleteSession(id);
});

async function waitForVault(maxAttempts = 30, delay = 600): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
        if (keyringService.hasVault()) {
            return true;
        }

        // Check if there are keyrings but no vault yet (indicating pending persistence)
        if (keyringService.keyrings.length > 0) {
            console.warn(`Keyring not loaded yet.`);

            await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
            return false; // No keyrings and no vault - genuinely empty
        }
    }
    return keyringService.hasVault();
}

export default async (req: ProviderControllerRequest): Promise<unknown> => {
    const method = req.data.method;

    if (isInternalMethod(method)) {
        return Promise.resolve(internalMethod[method](req));
    }

    const hasVault = await waitForVault();
    if (!hasVault) {
        throw providerErrors.userRejectedRequest({
            message: 'Wallet is locked or not initialized'
        });
    }

    return rpcFlow(req);
};
