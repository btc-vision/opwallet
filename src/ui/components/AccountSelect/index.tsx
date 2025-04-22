import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useAddressExplorerUrl, useChain } from '@/ui/state/settings/hooks';
import { fontSizes } from '@/ui/theme/font';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import { CopyOutlined } from '@ant-design/icons';

import { useTools } from '../ActionComponent';
import { Column } from '../Column';
import { Icon } from '../Icon';
import { Row } from '../Row';
import { Text } from '../Text';
import './index.less';

const AccountSelect = () => {
    const navigate = useNavigate();
    const chain = useChain();

    const currentAccount = useCurrentAccount();
    const tools = useTools();
    const address = currentAccount.address;

    const addressExplorerUrl = useAddressExplorerUrl(address);

    return (
        <div className="op_account_bar" onClick={() => {
            navigate(RouteTypes.SwitchAccountScreen);
        }}>
            <div className="op_account_col_1">
                <div className="op_account_icon_holder">
                    <Icon icon="user" size={20} />
                </div>
                <div className="op_account_details">
                    <div className="op_account_name">
                        {shortAddress(currentAccount?.alianName, 8)}
                    </div>
                    <div className="op_account_wallet" onClick={
                        (e) => {
                            e.stopPropagation();
                            copyToClipboard(address).then(() => {
                                tools.toastSuccess('Copied');
                            });
                        }
                    }>
                        {shortAddress(address)}
                        <CopyOutlined style={{ color: 'rgba(219, 219, 219, 0.7)', fontSize: 14 }} />
                    </div>
                </div>
            </div>
            <div className="op_account_col_2">
                <div className="op_account_icon_holder">
                    <Icon icon="right" size={20} />
                </div>
            </div>
        </div>
    );
};

export default AccountSelect;

{/*
        <Row justifyBetween px="md" py="md" bg="card" rounded itemsCenter>
            <Row style={{ flex: 1 }}>
                <Icon icon="user" />
            </Row>

            <Column
                justifyCenter
                rounded
                px="sm"
                style={{
                    flex: 1
                }}
                onClick={() => {
                    copyToClipboard(address).then(() => {
                        tools.toastSuccess('Copied');
                    });
                }}>
                <Text text={shortAddress(currentAccount?.alianName, 8)} textCenter />
                <Row selfItemsCenter itemsCenter>
                    <Text text={shortAddress(address)} color="textDim" />
                    <CopyOutlined style={{ color: '#888', fontSize: 14 }} />

                    <Text
                        text={'History'}
                        size="xs"
                        onClick={() => window.open(addressExplorerUrl)}
                    />

                    <Icon
                        icon="link"
                        size={fontSizes.xs}
                        onClick={() => window.open(addressExplorerUrl)}
                    />
                </Row>
            </Column>

            <Row
                style={{ flex: 1 }}
                fullY
                justifyEnd
                itemsCenter
                onClick={() => {
                    navigate(RouteTypes.SwitchAccountScreen);
                }}>
                <Icon icon="right" />
            </Row>
        </Row>
        */}