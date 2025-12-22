import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApprovalResponse } from '@/shared/types/Approval';
import { WalletError } from '@/shared/types/Error';
import { isWalletError } from '@/shared/utils/errors';
import { InteractionParametersWithoutSigner } from '@btc-vision/transaction';
import { getUiType } from './uiType';
import { useWallet } from './WalletContext';

export const useApproval = () => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const getApproval = wallet.getApproval.bind(wallet);

    const resolveApproval = useCallback(
        async (
            data?: ApprovalResponse,
            interactionParametersToUse?: InteractionParametersWithoutSigner,
            stay?: boolean,
            forceReject?: boolean
        ) => {
            const approval = await getApproval();

            if (approval) {
                await wallet.resolveApproval(data, interactionParametersToUse, forceReject);
            }

            if (stay) {
                return;
            }

            setTimeout(() => {
                navigate('/');
            });
        },
        [getApproval, navigate, wallet]
    );

    const rejectApproval = useCallback(
        async (err?: string, stay?: boolean, isInternal?: boolean) => {
            const approval = await getApproval();
            if (approval) {
                await wallet.rejectApproval(err, stay, isInternal);
            }
            if (!stay) {
                navigate('/');
            }
        },
        [getApproval, navigate, wallet]
    );

    const handleBeforeUnload = useCallback(async () => {
        await rejectApproval('beforeUnload event occurred', false, false);
    }, [rejectApproval]);

    useEffect(() => {
        if (!getUiType().isNotification) {
            return;
        }
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [handleBeforeUnload]);

    return { getApproval, resolveApproval, rejectApproval };
};

export const useWalletRequest = <TArgs extends unknown[], TResult>(
    requestFn: (...args: TArgs) => Promise<TResult>,
    {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        onSuccess,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        onError
    }: {
        onSuccess?(result: TResult): void;
        onError?(error: WalletError): void;
    }
) => {
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);
    const [loading, setLoading] = useState<boolean>(false);
    const [res, setRes] = useState<TResult | undefined>(undefined);
    const [err, setErr] = useState<WalletError>();

    const run = async (...args: TArgs) => {
        setLoading(true);
        try {
            const _res = await Promise.resolve(requestFn(...args));
            if (!mounted.current) {
                return;
            }
            setRes(_res);
            onSuccess?.(_res);
        } catch (err) {
            if (!mounted.current) {
                return;
            }
            if (isWalletError(err)) {
                setErr(err);
                onError?.(err);
            } else {
                console.error('Non-WalletError caught: ', err);
            }
        } finally {
            if (mounted.current) {
                setLoading(false);
            }
        }
    };

    return [run, loading, res, err] as const;
};
