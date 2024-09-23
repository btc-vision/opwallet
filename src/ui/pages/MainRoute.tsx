import { useCallback, useEffect, useRef } from 'react';
import { HashRouter, Route, Routes, useNavigate as useNavigateOrigin } from 'react-router-dom';

import { LoadingOutlined } from '@ant-design/icons';

import { Content, Icon } from '../components';
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
import { InscribeTransferScreen } from './Approval/components/InscribeTransfer';
import AppTabScrren from './Main/AppTabScreen';
import BoostScreen from './Main/BoostScreen';
import DiscoverTabScreen from './Main/DiscoverTabScreen';
import SettingsTabScreen from './Main/SettingsTabScreen';
import WalletTabScreen from './Main/WalletTabScreen';
import WelcomeScreen from './Main/WelcomeScreen';
import Airdrop from './OpNet/Airdrop';
import DeployContract from './OpNet/DeployContract';
import Mint from './OpNet/Mint';
import OpNetTokenScreen from './OpNet/OpNetTokenScreen';
import SendOpNetScreen from './OpNet/SendOpNetScreen';
import SplitUtxoScreen from './OpNet/SplitUtxoScreen';
import StakeWBTCoPNet from './OpNet/StakeWBTCoPNet';
import Swap from './OpNet/SwapToken';
import UnStakeWBTCoPNet from './OpNet/UnStakeWBTCoPNet';
import UnWrapBitcoinOpnet from './OpNet/UnWrapBitcoinOpnet';
import WrapBitcoinOpnet from './OpNet/WrapBitcoinOpnet';
import AddressTypeScreen from './Settings/AddressTypeScreen';
import AdvancedScreen from './Settings/AdvancedScreen';
import ChangePasswordScreen from './Settings/ChangePasswordScreen';
import EditAccountNameScreen from './Settings/EditAccountNameScreen';
import EditWalletNameScreen from './Settings/EditWalletNameScreen';
import ExportMnemonicsScreen from './Settings/ExportMnemonicsScreen';
import ExportPrivateKeyScreen from './Settings/ExportPrivateKeyScreen';
import NetworkTypeScreen from './Settings/NetworkTypeScreen';
import UpgradeNoticeScreen from './Settings/UpgradeNoticeScreen';
import TestScreen from './Test/TestScreen';
import HistoryScreen from './Wallet/HistoryScreen';
import ReceiveScreen from './Wallet/ReceiveScreen';
import TxConfirmScreen from './Wallet/TxConfirmScreen';
import TxCreateScreen from './Wallet/TxCreateScreen';
import TxFailScreen from './Wallet/TxFailScreen';
import TxOpnetConfirmScreen from './Wallet/TxOpnetConfirmScreen';
import TxSuccessScreen from './Wallet/TxSuccessScreen';
import UnavailableUtxoScreen from './Wallet/UnavailableUtxoScreen';
import './index.module.less';

export const routes = {
    BoostScreen: {
        path: '/',
        element: <BoostScreen />
    },
    WelcomeScreen: {
        path: '/welcome',
        element: <WelcomeScreen />
    },
    MainScreen: {
        path: '/main',
        element: <WalletTabScreen />
    },
    DiscoverTabScreen: {
        path: '/discover',
        element: <DiscoverTabScreen />
    },
    AppTabScrren: {
        path: '/app',
        element: <AppTabScrren />
    },
    SettingsTabScreen: {
        path: '/settings',
        element: <SettingsTabScreen />
    },
    CreateHDWalletScreen: {
        path: '/account/create-hd-wallet',
        element: <CreateHDWalletScreen />
    },
    CreateAccountScreen: {
        path: '/account/create',
        element: <CreateAccountScreen />
    },
    CreatePasswordScreen: {
        path: '/account/create-password',
        element: <CreatePasswordScreen />
    },
    UnlockScreen: {
        path: '/account/unlock',
        element: <UnlockScreen />
    },
    SwitchAccountScreen: {
        path: '/account/switch-account',
        element: <SwitchAccountScreen />
    },
    ReceiveScreen: {
        path: '/wallet/receive',
        element: <ReceiveScreen />
    },

    TxCreateScreen: {
        path: '/wallet/tx/create',
        element: <TxCreateScreen />
    },
    TxConfirmScreen: {
        path: '/wallet/tx/confirm',
        element: <TxConfirmScreen />
    },
    TxOpnetConfirmScreen: {
        path: '/wallet/tx/confirm-opnet',
        element: <TxOpnetConfirmScreen />
    },
    TxSuccessScreen: {
        path: '/wallet/tx/success',
        element: <TxSuccessScreen />
    },
    TxFailScreen: {
        path: '/wallet/tx/fail',
        element: <TxFailScreen />
    },

    NetworkTypeScreen: {
        path: '/settings/network-type',
        element: <NetworkTypeScreen />
    },
    ChangePasswordScreen: {
        path: '/settings/password',
        element: <ChangePasswordScreen />
    },
    ExportMnemonicsScreen: {
        path: '/settings/export-mnemonics',
        element: <ExportMnemonicsScreen />
    },
    ExportPrivateKeyScreen: {
        path: '/settings/export-privatekey',
        element: <ExportPrivateKeyScreen />
    },
    AdvancedScreen: {
        path: '/settings/advanced',
        element: <AdvancedScreen />
    },
    HistoryScreen: {
        path: '/wallet/history',
        element: <HistoryScreen />
    },
    ApprovalScreen: {
        path: '/approval',
        element: <ApprovalScreen />
    },
    ConnectedSitesScreen: {
        path: '/connected-sites',
        element: <ConnectedSitesScreen />
    },
    SwitchKeyringScreen: {
        path: '/account/switch-keyring',
        element: <SwitchKeyringScreen />
    },
    AddKeyringScreen: {
        path: '/account/add-keyring',
        element: <AddKeyringScreen />
    },
    EditWalletNameScreen: {
        path: '/settings/edit-wallet-name',
        element: <EditWalletNameScreen />
    },
    CreateSimpleWalletScreen: {
        path: '/account/create-simple-wallet',
        element: <CreateSimpleWalletScreen />
    },
    CreateKeystoneWalletScreen: {
        path: '/account/create-keystone-wallet',
        element: <CreateKeystoneWalletScreen />
    },
    UpgradeNoticeScreen: {
        path: '/settings/upgrade-notice',
        element: <UpgradeNoticeScreen />
    },
    AddressTypeScreen: {
        path: '/settings/address-type',
        element: <AddressTypeScreen />
    },
    EditAccountNameScreen: {
        path: '/settings/edit-account-name',
        element: <EditAccountNameScreen />
    },
    InscribeTransferScreen: {
        path: '/inscribe/transfer',
        element: <InscribeTransferScreen />
    },
    TestScreen: {
        path: '/test',
        element: <TestScreen />
    },
    UnavailableUtxoScreen: {
        path: '/wallet/unavailable-utxo',
        element: <UnavailableUtxoScreen />
    },
    OpNetTokenScreen: {
        path: '/opnet/token',
        element: <OpNetTokenScreen />
    },
    SendOpNetScreen: {
        path: '/opnet/send-opnet',
        element: <SendOpNetScreen />
    },
    WrapBitcoinOpnet: {
        path: '/opnet/wrap-opnet',
        element: <WrapBitcoinOpnet />
    },
    UnWrapBitcoinOpnet: {
        path: '/opnet/unwrap-opnet',
        element: <UnWrapBitcoinOpnet />
    },
    StakeWBTCoPNet: {
        path: '/opnet/stake-wbtc',
        element: <StakeWBTCoPNet />
    },
    UnStakeWBTCoPNet: {
        path: '/opnet/unstake-wbtc',
        element: <UnStakeWBTCoPNet />
    },
    Swap: {
        path: '/opnet/swap',
        element: <Swap />
    },
    DeployContract: {
        path: '/opnet/deploy-contract',
        element: <DeployContract />
    },
    Mint: {
        path: '/opnet/mint',
        element: <Mint />
    },
    Airdrop: {
        path: '/opnet/airdrop',
        element: <Airdrop />
    },
    SplitUtxoScreen: {
        path: '/opnet/split-utxo',
        element: <SplitUtxoScreen />
    }
};

type RouteTypes = keyof typeof routes;

export function useNavigate() {
    const navigate = useNavigateOrigin();

    return useCallback(
        (routKey: RouteTypes, state?: any) => {
            navigate(routes[routKey].path, { state });
            console.log(routes[routKey].path, { state });
        },
        [useNavigateOrigin]
    );
}

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
                wallet.getInscriptionSummary().then((data) => {
                    dispatch(accountActions.setInscriptionSummary(data));
                });

                wallet.getAppSummary().then((data) => {
                    dispatch(accountActions.setAppSummary(data));
                });
                self.summaryLoaded = true;
            }

            if (!self.configLoaded) {
                self.configLoaded = true;

                // already load when reloadAccounts
                // wallet.getWalletConfig().then((data) => {
                //   dispatch(settingsActions.updateSettings({ walletConfig: data }));
                // });
                wallet.getSkippedVersion().then((data) => {
                    dispatch(settingsActions.updateSettings({ skippedVersion: data }));
                });

                wallet.getAutoLockTimeId().then((data) => {
                    dispatch(settingsActions.updateSettings({ autoLockTimeId: data }));
                });
            }

            dispatch(globalActions.update({ isReady: true }));
        } catch (e) {
            console.log('init error', e);
        }
    }, [wallet, dispatch, isReady, isUnlocked]);

    useEffect(() => {
        wallet.hasVault().then((val) => {
            if (val) {
                dispatch(globalActions.update({ isBooted: true }));
                wallet.isUnlocked().then((isUnlocked) => {
                    dispatch(globalActions.update({ isUnlocked }));
                });
            }
        });
    }, []);

    useEffect(() => {
        init();
    }, [init]);

    if (!isReady) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100vw',
                    height: '100vh',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}>
                <Content justifyCenter itemsCenter>
                    <Icon>
                        <LoadingOutlined />
                    </Icon>
                </Content>
            </div>
        );
    }

    return (
        <HashRouter>
            <Routes>
                {Object.keys(routes)
                    .map((v) => routes[v])
                    .map((v) => (
                        <Route key={v.path} path={v.path} element={v.element} />
                    ))}
            </Routes>
        </HashRouter>
    );
};

export default Main;
