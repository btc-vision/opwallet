import { Tabs, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import { CSSProperties, ReactElement, useEffect, useMemo, useState } from 'react';

import { AddressFlagType } from '@/shared/constant';
import { checkAddressFlag } from '@/shared/utils';
import Web3API, { bigIntToDecimal } from '@/shared/web3/Web3API';
import { AddressBar, Card, Column, Content, Footer, Header, Icon, Image, Layout, Row, Text } from '@/ui/components';
import AccountSelect from '@/ui/components/AccountSelect';
import { BtcUsd } from '@/ui/components/BtcUsd';
import { Button } from '@/ui/components/Button';
import { DisableUnconfirmedsPopover } from '@/ui/components/DisableUnconfirmedPopover';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { UpgradePopover } from '@/ui/components/UpgradePopover';
import { BtcDisplay } from '@/ui/pages/Main/WalletTabScreen/components/BtcDisplay';
import { useAccountBalance, useAddressSummary, useCurrentAccount } from '@/ui/state/accounts/hooks';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import {
    useBTCUnit,
    useChain,
    useFaucetUrl,
    useSkipVersionCallback,
    useVersionInfo,
    useWalletConfig
} from '@/ui/state/settings/hooks';
import { useAssetTabKey, useResetUiTxCreateScreen } from '@/ui/state/ui/hooks';
import { AssetTabKey, uiActions } from '@/ui/state/ui/reducer';
import { fontSizes } from '@/ui/theme/font';
import { amountToSatoshis, satoshisToAmount, useWallet } from '@/ui/utils';

import { RouteTypes, useNavigate } from '../../MainRoute';
import { SwitchChainModal } from '../../Settings/SwitchChainModal';
import { OPNetList } from './OPNetList';

const $noBreakStyle: CSSProperties = {
    whiteSpace: 'nowrap',
    wordBreak: 'keep-all'
};

export default function WalletTabScreen() {
    const navigate = useNavigate();

    const accountBalance = useAccountBalance();
    const chain = useChain();

    const currentKeyring = useCurrentKeyring();
    const currentAccount = useCurrentAccount();
    const balanceValue = useMemo(() => {
        return new BigNumber(accountBalance.amount).toString();
    }, [accountBalance.amount]);

    const wallet = useWallet();

    const dispatch = useAppDispatch();
    const assetTabKey = useAssetTabKey();

    const skipVersion = useSkipVersionCallback();

    const walletConfig = useWalletConfig();
    const versionInfo = useVersionInfo();

    // const [showSafeNotice, setShowSafeNotice] = useState(false);
    const [showDisableUnconfirmedUtxoNotice, setShowDisableUnconfirmedUtxoNotice] = useState(false);

    const availableSatoshis =
        amountToSatoshis(accountBalance.amount) - amountToSatoshis(accountBalance.inscription_amount);

    const totalSatoshis = amountToSatoshis(accountBalance.amount);
    const unavailableSatoshis = totalSatoshis - availableSatoshis;
    const [availableAmount, setAvailableAmount] = useState(0);
    const unavailableAmount = satoshisToAmount(unavailableSatoshis);
    const totalAmountUse = satoshisToAmount(totalSatoshis);
    const [totalAmount, setTotalAmount] = useState(totalAmountUse);

    const addressSummary = useAddressSummary();

    useEffect(() => {
        const fetchBalance = async () => {
            if (accountBalance.amount === '0') {
                setAvailableAmount(0);
            } else {
                try {
                    Web3API.setNetwork(await wallet.getChainType());

                    const btcBalance = await Web3API.getBalance(currentAccount.address, true);
                    setAvailableAmount(new BigNumber(bigIntToDecimal(btcBalance, 8)).toNumber());
                    setTotalAmount(bigIntToDecimal(btcBalance, 8).toString());
                } catch (e) {
                    console.warn(`Unable to fetch balance -> ${e}`);
                }
            }
        };

        void fetchBalance();
    }, [accountBalance.amount, chain.enum, currentAccount.address]);

    useEffect(() => {
        void (async () => {
            if (currentAccount.address !== addressSummary.address) {
                return;
            }
            if (checkAddressFlag(currentAccount.flag, AddressFlagType.CONFIRMED_UTXO_MODE)) {
                return;
            }
            if (checkAddressFlag(currentAccount.flag, AddressFlagType.DISABLE_AUTO_SWITCH_CONFIRMED)) {
                return;
            }

            const account = await wallet.addAddressFlag(currentAccount, AddressFlagType.CONFIRMED_UTXO_MODE);
            dispatch(accountActions.setCurrent(account));

            setShowDisableUnconfirmedUtxoNotice(true);
        })();
    }, [addressSummary, currentAccount]);

    const tabItems: { key: AssetTabKey; label: string; children: ReactElement }[] = [
        {
            key: AssetTabKey.OP_NET,
            label: 'OP_NET',
            children: <OPNetList />
        }
    ];

    const faucetUrl = useFaucetUrl();
    const resetUiTxCreateScreen = useResetUiTxCreateScreen();
    const btcUnit = useBTCUnit();

    const [switchChainModalVisible, setSwitchChainModalVisible] = useState(false);
    return (
        <Layout>
            <Header
                LeftComponent={
                    <Card
                        preset="style2"
                        onClick={() => {
                            navigate(RouteTypes.SwitchKeyringScreen);
                        }}>
                        <Text text={currentKeyring.alianName} size="xxs" />
                    </Card>
                }
                RightComponent={
                    <Card
                        preset="style2"
                        style={{
                            backgroundColor: 'transparent'
                        }}
                        onClick={() => {
                            setSwitchChainModalVisible(true);
                        }}>
                        <Image
                            src={'./images/artifacts/chain-bar.png'}
                            width={56}
                            height={28}
                            style={{
                                position: 'absolute',
                                right: 56 / 2
                            }}
                        />
                        <Image
                            src={chain.icon}
                            size={22}
                            style={{
                                position: 'absolute',
                                right: 55
                            }}
                        />
                    </Card>
                }
            />

            <Content>
                <AccountSelect />

                <Column gap="lg2" mt="md">
                    {(walletConfig.chainTip || walletConfig.statusMessage) && (
                        <Column
                            py={'lg'}
                            px={'md'}
                            gap={'lg'}
                            style={{
                                borderRadius: 12,
                                border: '1px solid rgba(245, 84, 84, 0.35)',
                                background: 'rgba(245, 84, 84, 0.08)'
                            }}>
                            {walletConfig.chainTip && <Text text={walletConfig.chainTip} color="text" textCenter />}
                            {walletConfig.statusMessage && (
                                <Text text={walletConfig.statusMessage} color="danger" textCenter />
                            )}
                        </Column>
                    )}

                    <AddressBar />

                    <Tooltip
                        className="op_tooltip"
                        placement={'bottom'}
                        title={
                            <>
                                <Row justifyBetween>
                                    <span style={$noBreakStyle}>{'Available '}</span>
                                    <span style={$noBreakStyle}>{` ${availableAmount} ${btcUnit}`}</span>
                                </Row>
                                <Row justifyBetween>
                                    <span style={$noBreakStyle}>{'Unavailable '}</span>
                                    <span style={$noBreakStyle}>{` ${unavailableAmount} ${btcUnit}`}</span>
                                </Row>
                                <Row justifyBetween>
                                    <span style={$noBreakStyle}>{'Total '}</span>
                                    <span style={$noBreakStyle}>{` ${totalAmount} ${btcUnit}`}</span>
                                </Row>
                            </>
                        }
                        overlayStyle={{
                            fontSize: fontSizes.xs
                        }}>
                        <div>
                            <Text text={'TOTAL BALANCE'} textCenter color="textDim" />
                            <BtcDisplay balance={balanceValue} />
                        </div>
                    </Tooltip>
                    <BtcUsd
                        sats={amountToSatoshis(balanceValue)}
                        textCenter
                        size={'md'}
                        style={{
                            marginTop: -16,
                            marginBottom: -8
                        }}
                    />

                    <Row justifyCenter mt="md">
                        <button
                            onClick={() => {
                                navigate(RouteTypes.ReceiveScreen);
                            }}
                            className="op_action_button"
                        >
                            <div
                                className="op_icon_wrapper"
                            >
                                <Icon
                                    icon="receive"
                                    color={'background'}
                                    size={20}
                                />
                            </div>
                            Receive
                        </button>

                        <button
                            onClick={() => {
                                navigate(RouteTypes.TxCreateScreen);
                            }}
                            className="op_action_button"
                        >
                            <div
                                className="op_icon_wrapper"
                            >
                                <Icon
                                    icon="send"
                                    color={'background'}
                                    size={20}
                                />
                            </div>
                            Send
                        </button>

                        <button
                            onClick={() => {
                                navigate(RouteTypes.Swap);
                            }}
                            className="op_action_button"
                        >
                            <div
                                className="op_icon_wrapper"
                            >
                                <Icon
                                    icon="swap"
                                    color={'background'}
                                    size={20}
                                />
                            </div>
                            Swap
                        </button>

                        <button
                            onClick={() => {
                                window.open(faucetUrl, '_blank');
                            }}
                            className="op_action_button"
                        >
                            <div
                                className="op_icon_wrapper"
                            >
                                <Icon
                                    icon="faucet"
                                    color={'background'}
                                    size={20}
                                />
                            </div>
                            Faucet
                        </button>
                    </Row>

                    <Tabs
                        size={'small'}
                        defaultActiveKey={assetTabKey.toString()}
                        activeKey={assetTabKey.toString()}
                        items={tabItems}
                        onTabClick={(key) => {
                            dispatch(uiActions.updateAssetTabScreen({ assetTabKey: key as unknown as AssetTabKey }));
                        }}
                    />
                </Column>

                {!versionInfo.skipped && (
                    <UpgradePopover
                        onClose={async () => {
                            await skipVersion(versionInfo.newVersion);
                        }}
                    />
                )}

                {showDisableUnconfirmedUtxoNotice && (
                    <DisableUnconfirmedsPopover onClose={() => setShowDisableUnconfirmedUtxoNotice(false)} />
                )}

                {switchChainModalVisible && (
                    <SwitchChainModal
                        onClose={() => {
                            setSwitchChainModalVisible(false);
                        }}
                    />
                )}
            </Content>
            <Footer px="zero" py="zero">
                <NavTabBar tab="home" />
            </Footer>
        </Layout>
    );
}
