import VirtualList from 'rc-virtual-list';
import { forwardRef, useMemo, useState } from 'react';

import { KEYRING_CLASS, KEYRING_TYPE } from '@/shared/constant';
import { Account } from '@/shared/types';
import { Card, Column, Content, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { accountActions } from '@/ui/state/accounts/reducer';
import { useAppDispatch } from '@/ui/state/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import { colors } from '@/ui/theme/colors';
import { copyToClipboard, shortAddress, useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    CopyOutlined,
    EditOutlined,
    EllipsisOutlined,
    KeyOutlined,
    PlusCircleOutlined
} from '@ant-design/icons';

import { RouteTypes, useNavigate } from '../MainRoute';

export interface ItemData {
    key: string;
    account?: Account;
}

interface MyItemProps {
    account?: Account;
    autoNav?: boolean;
}

export function MyItem({ account, autoNav }: MyItemProps, ref) {
    const navigate = useNavigate();
    const currentAccount = useCurrentAccount();
    const selected = currentAccount.pubkey == account?.pubkey;
    const wallet = useWallet();
    const dispatch = useAppDispatch();
    const keyring = useCurrentKeyring();
    if (!account) {
        return <div />;
    }
    const [optionsVisible, setOptionsVisible] = useState(false);
    let path = '';
    if ((keyring.type !== KEYRING_CLASS.PRIVATE_KEY) && (account.index !== undefined)) {
        path = ` (${keyring.hdPath + '/' + account.index.toString()})`;
    }

    const tools = useTools();

    return (
        <Card justifyBetween mt="md">
            <Row>
                <Column style={{ width: 20 }} selfItemsCenter>
                    {selected && (
                        <Icon>
                            <CheckCircleFilled />
                        </Icon>
                    )}
                </Column>
                <Column
                    onClick={async (e) => {
                        if (currentAccount.pubkey !== account.pubkey) {
                            await wallet.changeKeyring(keyring, account.index);
                            const _currentAccount = await wallet.getCurrentAccount();
                            dispatch(accountActions.setCurrent(_currentAccount));
                        }
                        if (autoNav) navigate(RouteTypes.MainScreen);
                    }}>
                    <Text text={account.alianName} />
                    <Text text={`${shortAddress(account.address)}${path}`} preset="sub" />
                </Column>
            </Row>
            <Column relative>
                {optionsVisible && (
                    <div
                        style={{
                            position: 'fixed',
                            zIndex: 10,
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0
                        }}
                        onTouchStart={() => {
                            setOptionsVisible(false);
                        }}
                        onMouseDown={() => {
                            setOptionsVisible(false);
                        }}></div>
                )}

                <Icon
                    onClick={() => {
                        setOptionsVisible(!optionsVisible);
                    }}>
                    <EllipsisOutlined />
                </Icon>

                {optionsVisible && (
                    <Column
                        style={{
                            backgroundColor: colors.black,
                            width: 160,
                            position: 'absolute',
                            right: 0,
                            padding: 5,
                            zIndex: 10
                        }}>
                        <Row
                            onClick={() => {
                                navigate(RouteTypes.EditAccountNameScreen, { account });
                            }}>
                            <EditOutlined />
                            <Text text="Edit Name" size="sm" />
                        </Row>
                        <Row
                            onClick={async () => {
                                await copyToClipboard(account.address);
                                tools.toastSuccess('copied');
                                setOptionsVisible(false);
                            }}>
                            <CopyOutlined />
                            <Text text="Copy address" size="sm" />
                        </Row>
                        {account.type !== KEYRING_TYPE.KeystoneKeyring && (
                            <Row
                                onClick={() => {
                                    navigate(RouteTypes.ExportPrivateKeyScreen, { account });
                                }}>
                                <KeyOutlined />
                                <Text text="Export Private Key" size="sm" />
                            </Row>
                        )}
                    </Column>
                )}
            </Column>
        </Card>
    );
}

export default function SwitchAccountScreen() {
    const navigate = useNavigate();
    const keyring = useCurrentKeyring();
    const items = useMemo(() => {
        const _items: ItemData[] = keyring.accounts.map((v) => {
            return {
                key: v.address,
                account: v
            };
        });
        return _items;
    }, []);
    const ForwardMyItem = forwardRef(MyItem);

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Switch Account"
                RightComponent={
                    keyring.type == KEYRING_CLASS.PRIVATE_KEY ? null : (
                        <Icon
                            onClick={() => {
                                navigate(RouteTypes.CreateAccountScreen);
                            }}>
                            <PlusCircleOutlined />
                        </Icon>
                    )
                }
            />
            <Content>
                <VirtualList data={items} data-id="list" itemHeight={20} itemKey={(item) => item.key}>
                    {(item) => <ForwardMyItem account={item.account} autoNav={true} />}
                </VirtualList>
            </Content>
        </Layout>
    );
}
