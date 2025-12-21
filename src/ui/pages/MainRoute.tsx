import { ReactElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import TxCreateScreen from '@/ui/pages/Wallet/TxCreateScreen';
import { RouteTypes, routePaths } from './routeTypes';

// Re-export for backward compatibility
export { RouteTypes, useNavigate } from './routeTypes';
export type { UseNavigate } from './routeTypes';

import { Content, OPNetLoader } from '../components';
import { accountActions } from '../state/accounts/reducer';
import { useIsReady, useIsUnlocked } from '../state/global/hooks';
import { globalActions } from '../state/global/reducer';
import { useAppDispatch } from '../state/hooks';
import { settingsActions } from '../state/settings/reducer';
import { useWallet } from '../utils';
import AddKeyringScreen from './Account/AddKeyringScreen';
import CreateAccountScreen from './Account/CreateAccountScreen';
import CreateHDWalletScreen from './Account/CreateHDWalletScreen';
import CreateKeystoneWalletScreen from './Account/CreateKeystoneWalletScreen';
import CreatePasswordScreen from './Account/CreatePasswordScreen';
import CreateSimpleWalletScreen from './Account/CreateSimpleWalletScreen';
import SwitchAccountScreen from './Account/SwitchAccountScreen';
import SwitchKeyringScreen from './Account/SwitchKeyringScreen';
import UnlockScreen from './Account/UnlockScreen';
import ApprovalScreen from './Approval/ApprovalScreen';
import ConnectedSitesScreen from './Approval/ConnectedSitesScreen';
import AppTabScrren from './Main/AppTabScreen';
import BoostScreen from './Main/BoostScreen';
import SettingsTabScreen from './Main/SettingsTabScreen';
import WalletTabScreen from './Main/WalletTabScreen';
import WelcomeScreen from './Main/WelcomeScreen';
import DeployContract from './OpNet/DeployContract';
import Mint from './OpNet/Mint';
import OpNetTokenScreen from './OpNet/OpNetTokenScreen';
import SendOpNetScreen from './OpNet/SendOpNetScreen';
import AddressTypeScreen from './Settings/AddressTypeScreen';
import AdvancedScreen from './Settings/AdvancedScreen';
import ChangePasswordScreen from './Settings/ChangePasswordScreen';
import EditAccountNameScreen from './Settings/EditAccountNameScreen';
import EditWalletNameScreen from './Settings/EditWalletNameScreen';
import ExportMnemonicsScreen from './Settings/ExportMnemonicsScreen';
import ExportPrivateKeyScreen from './Settings/ExportPrivateKeyScreen';
import NetworkTypeScreen from './Settings/NetworkTypeScreen';
import OpnetBrowserScreen from './Settings/OpnetBrowserScreen';
import BtcDomainScreen from './Domain/BtcDomainScreen';
import DuplicationResolutionScreen from './Settings/DuplicationResolutionScreen';
import QuantumMigrationScreen from './Settings/QuantumMigrationScreen';
import UpgradeNoticeScreen from './Settings/UpgradeNoticeScreen';
import ReceiveScreen from './Wallet/ReceiveScreen';
import TxConfirmScreen from './Wallet/TxConfirmScreen';
import TxFailScreen from './Wallet/TxFailScreen';
import TxOpnetConfirmScreen from './Wallet/TxOpnetConfirmScreen';
import TxSuccessScreen from './Wallet/TxSuccessScreen';
import UnavailableUtxoScreen from './Wallet/UnavailableUtxoScreen';
import './index.module.less';
import ImportNFTScreen from '@/ui/pages/Wallet/ImportNFTScreen';
import NFTTabScreen from '@/ui/pages/Main/NFTTabScreen';
import ImportSelectionScreen from '@/ui/pages/Wallet/ImportSelectionScreen';
import NFTSendScreen from '@/ui/pages/Wallet/NFTSendScreen';
import ImportTokenScreen from '@/ui/pages/Wallet/ImportOP20Screen';
import HistoryScreen from '@/ui/pages/History/HistoryScreen';
import TransactionDetailScreen from '@/ui/pages/History/TransactionDetailScreen';

type Routes = {
    [key in RouteTypes]: {
        path: string;
        element: ReactElement;
    };
};

export const routes: Routes = {
    [RouteTypes.BoostScreen]: {
        path: routePaths[RouteTypes.BoostScreen],
        element: <BoostScreen />
    },
    [RouteTypes.WelcomeScreen]: {
        path: routePaths[RouteTypes.WelcomeScreen],
        element: <WelcomeScreen />
    },
    [RouteTypes.MainScreen]: {
        path: routePaths[RouteTypes.MainScreen],
        element: <WalletTabScreen />
    },
    [RouteTypes.AppTabScrren]: {
        path: routePaths[RouteTypes.AppTabScrren],
        element: <AppTabScrren />
    },
    [RouteTypes.SettingsTabScreen]: {
        path: routePaths[RouteTypes.SettingsTabScreen],
        element: <SettingsTabScreen />
    },
    [RouteTypes.CreateHDWalletScreen]: {
        path: routePaths[RouteTypes.CreateHDWalletScreen],
        element: <CreateHDWalletScreen />
    },
    [RouteTypes.TxCreateScreen]: {
        path: routePaths[RouteTypes.TxCreateScreen],
        element: <TxCreateScreen />
    },
    [RouteTypes.CreateAccountScreen]: {
        path: routePaths[RouteTypes.CreateAccountScreen],
        element: <CreateAccountScreen />
    },
    [RouteTypes.CreatePasswordScreen]: {
        path: routePaths[RouteTypes.CreatePasswordScreen],
        element: <CreatePasswordScreen />
    },
    [RouteTypes.UnlockScreen]: {
        path: routePaths[RouteTypes.UnlockScreen],
        element: <UnlockScreen />
    },
    [RouteTypes.SwitchAccountScreen]: {
        path: routePaths[RouteTypes.SwitchAccountScreen],
        element: <SwitchAccountScreen />
    },
    [RouteTypes.ReceiveScreen]: {
        path: routePaths[RouteTypes.ReceiveScreen],
        element: <ReceiveScreen />
    },
    [RouteTypes.TxConfirmScreen]: {
        path: routePaths[RouteTypes.TxConfirmScreen],
        element: <TxConfirmScreen />
    },
    [RouteTypes.TxOpnetConfirmScreen]: {
        path: routePaths[RouteTypes.TxOpnetConfirmScreen],
        element: <TxOpnetConfirmScreen />
    },
    [RouteTypes.TxSuccessScreen]: {
        path: routePaths[RouteTypes.TxSuccessScreen],
        element: <TxSuccessScreen />
    },
    [RouteTypes.TxFailScreen]: {
        path: routePaths[RouteTypes.TxFailScreen],
        element: <TxFailScreen />
    },
    [RouteTypes.NetworkTypeScreen]: {
        path: routePaths[RouteTypes.NetworkTypeScreen],
        element: <NetworkTypeScreen />
    },
    [RouteTypes.ChangePasswordScreen]: {
        path: routePaths[RouteTypes.ChangePasswordScreen],
        element: <ChangePasswordScreen />
    },
    [RouteTypes.ExportMnemonicsScreen]: {
        path: routePaths[RouteTypes.ExportMnemonicsScreen],
        element: <ExportMnemonicsScreen />
    },
    [RouteTypes.ExportPrivateKeyScreen]: {
        path: routePaths[RouteTypes.ExportPrivateKeyScreen],
        element: <ExportPrivateKeyScreen />
    },
    [RouteTypes.AdvancedScreen]: {
        path: routePaths[RouteTypes.AdvancedScreen],
        element: <AdvancedScreen />
    },
    [RouteTypes.ApprovalScreen]: {
        path: routePaths[RouteTypes.ApprovalScreen],
        element: <ApprovalScreen />
    },
    [RouteTypes.ConnectedSitesScreen]: {
        path: routePaths[RouteTypes.ConnectedSitesScreen],
        element: <ConnectedSitesScreen />
    },
    [RouteTypes.SwitchKeyringScreen]: {
        path: routePaths[RouteTypes.SwitchKeyringScreen],
        element: <SwitchKeyringScreen />
    },
    [RouteTypes.AddKeyringScreen]: {
        path: routePaths[RouteTypes.AddKeyringScreen],
        element: <AddKeyringScreen />
    },
    [RouteTypes.EditWalletNameScreen]: {
        path: routePaths[RouteTypes.EditWalletNameScreen],
        element: <EditWalletNameScreen />
    },
    [RouteTypes.CreateSimpleWalletScreen]: {
        path: routePaths[RouteTypes.CreateSimpleWalletScreen],
        element: <CreateSimpleWalletScreen />
    },
    [RouteTypes.CreateKeystoneWalletScreen]: {
        path: routePaths[RouteTypes.CreateKeystoneWalletScreen],
        element: <CreateKeystoneWalletScreen />
    },
    [RouteTypes.UpgradeNoticeScreen]: {
        path: routePaths[RouteTypes.UpgradeNoticeScreen],
        element: <UpgradeNoticeScreen />
    },
    [RouteTypes.AddressTypeScreen]: {
        path: routePaths[RouteTypes.AddressTypeScreen],
        element: <AddressTypeScreen />
    },
    [RouteTypes.EditAccountNameScreen]: {
        path: routePaths[RouteTypes.EditAccountNameScreen],
        element: <EditAccountNameScreen />
    },
    [RouteTypes.UnavailableUtxoScreen]: {
        path: routePaths[RouteTypes.UnavailableUtxoScreen],
        element: <UnavailableUtxoScreen />
    },
    [RouteTypes.OpNetTokenScreen]: {
        path: routePaths[RouteTypes.OpNetTokenScreen],
        element: <OpNetTokenScreen />
    },
    [RouteTypes.SendOpNetScreen]: {
        path: routePaths[RouteTypes.SendOpNetScreen],
        element: <SendOpNetScreen />
    },
    [RouteTypes.DeployContract]: {
        path: routePaths[RouteTypes.DeployContract],
        element: <DeployContract />
    },
    [RouteTypes.Mint]: {
        path: routePaths[RouteTypes.Mint],
        element: <Mint />
    },
    [RouteTypes.ImportSelectionScreen]: {
        path: routePaths[RouteTypes.ImportSelectionScreen],
        element: <ImportSelectionScreen />
    },
    [RouteTypes.ImportNFTScreen]: {
        path: routePaths[RouteTypes.ImportNFTScreen],
        element: <ImportNFTScreen />
    },
    [RouteTypes.NFTTabScreen]: {
        path: routePaths[RouteTypes.NFTTabScreen],
        element: <NFTTabScreen />
    },
    [RouteTypes.NFTSendScreen]: {
        path: routePaths[RouteTypes.NFTSendScreen],
        element: <NFTSendScreen />
    },
    [RouteTypes.ImportTokenScreen]: {
        path: routePaths[RouteTypes.ImportTokenScreen],
        element: <ImportTokenScreen />
    },
    [RouteTypes.QuantumMigrationScreen]: {
        path: routePaths[RouteTypes.QuantumMigrationScreen],
        element: <QuantumMigrationScreen />
    },
    [RouteTypes.DuplicationResolutionScreen]: {
        path: routePaths[RouteTypes.DuplicationResolutionScreen],
        element: <DuplicationResolutionScreen />
    },
    [RouteTypes.HistoryScreen]: {
        path: routePaths[RouteTypes.HistoryScreen],
        element: <HistoryScreen />
    },
    [RouteTypes.TransactionDetailScreen]: {
        path: routePaths[RouteTypes.TransactionDetailScreen],
        element: <TransactionDetailScreen />
    },
    [RouteTypes.OpnetBrowserScreen]: {
        path: routePaths[RouteTypes.OpnetBrowserScreen],
        element: <OpnetBrowserScreen />
    },
    [RouteTypes.BtcDomainScreen]: {
        path: routePaths[RouteTypes.BtcDomainScreen],
        element: <BtcDomainScreen />
    }
};

const Main = () => {
    const wallet = useWallet();
    const dispatch = useAppDispatch();

    const isReady = useIsReady();
    const isUnlocked = useIsUnlocked();

    const selfRef = useRef({
        settingsLoaded: false,
        summaryLoaded: false,
        accountLoaded: false,
        configLoaded: false
    });
    const self = selfRef.current;
    const init = useCallback(async () => {
        try {
            if (!self.accountLoaded) {
                const currentAccount = await wallet.getCurrentAccount();
                if (currentAccount) {
                    dispatch(accountActions.setCurrent(currentAccount));

                    const accounts = await wallet.getAccounts();
                    dispatch(accountActions.setAccounts(accounts));

                    if (accounts.length > 0) {
                        self.accountLoaded = true;
                    }
                }
            }

            if (!self.settingsLoaded) {
                const chainType = await wallet.getChainType();
                dispatch(
                    settingsActions.updateSettings({
                        chainType
                    })
                );

                const _locale = await wallet.getLocale();
                dispatch(settingsActions.updateSettings({ locale: _locale }));
                self.settingsLoaded = true;
            }

            if (!self.summaryLoaded) {
                const appSummary = await wallet.getAppSummary();
                dispatch(accountActions.setAppSummary(appSummary));

                self.summaryLoaded = true;
            }

            if (!self.configLoaded) {
                self.configLoaded = true;

                const v = await wallet.getSkippedVersion();
                dispatch(settingsActions.updateSettings({ skippedVersion: v }));

                const a = await wallet.getAutoLockTimeId();
                dispatch(settingsActions.updateSettings({ autoLockTimeId: a }));
            }

            dispatch(globalActions.update({ isReady: true }));
        } catch (e) {
            console.log('init error', e);
        }
    }, [wallet, dispatch, isReady, isUnlocked]);

    useEffect(() => {
        void (async () => {
            const val = await wallet.hasVault();

            if (val) {
                dispatch(globalActions.update({ isBooted: true }));

                const isUnlock = await wallet.isUnlocked();
                dispatch(globalActions.update({ isUnlocked: isUnlock }));
            }
        })();
    }, []);

    useEffect(() => {
        void init();
    }, [init]);

    const renderedRoutes = useMemo(() => {
        return Object.entries(routes).map(([key, route]) => (
            <Route key={route.path} path={route.path} element={route.element} />
        ));
    }, []);

    if (!isReady) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100vw',
                    height: '100vh',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    backgroundColor: '#212121'
                }}>
                <Content justifyCenter itemsCenter>
                    <OPNetLoader size={140} text="Loading" />
                </Content>
            </div>
        );
    }

    return (
        <HashRouter>
            <Routes>{renderedRoutes}</Routes>
        </HashRouter>
    );
};

export default Main;
