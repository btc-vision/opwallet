import { useEffect } from 'react';

import { getUiType, useApproval, useWallet } from '@/ui/utils';

import { RouteTypes, useNavigate } from '../MainRoute';

export default function BoostScreen() {
    const navigate = useNavigate();
    const wallet = useWallet();

    const { getApproval, rejectApproval } = useApproval();
    const loadView = async () => {
        const UIType = getUiType();
        const isInNotification = UIType.isNotification;
        const isInTab = UIType.isTab;
        let approval = await getApproval();
        if (isInNotification && !approval) {
            window.close();
            return;
        }

        if (!isInNotification) {
            await rejectApproval();
            approval = undefined;
        }

        const isBooted = await wallet.isBooted();
        const hasVault = await wallet.hasVault();
        const isUnlocked = await wallet.isUnlocked();

        if (!isBooted) {
            navigate(RouteTypes.WelcomeScreen);
            return;
        }

        if (!isUnlocked) {
            navigate(RouteTypes.UnlockScreen);
            return;
        }

        if (!hasVault) {
            navigate(RouteTypes.WelcomeScreen);
            return;
        }

        if (!isInNotification && !isInTab) {
            navigate(RouteTypes.CreateHDWalletScreen, { isImport: false });
            return;
        }

        const currentAccount = await wallet.getCurrentAccount();
        if (!currentAccount) {
            navigate(RouteTypes.WelcomeScreen);
            return;
        } else if (approval) {
            navigate(RouteTypes.ApprovalScreen);
        } else {
            navigate(RouteTypes.MainScreen);
            return;
        }
    };

    const init = async () => {
        const ready = await wallet.isReady();

        if (ready) {
            await loadView();
        } else {
            setTimeout(() => {
                init();
            }, 1000);
        }
    };

    useEffect(() => {
        void init();
    }, []);

    return <div></div>;
}
