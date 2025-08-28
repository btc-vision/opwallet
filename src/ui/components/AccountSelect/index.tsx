import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import { CopyOutlined } from '@ant-design/icons';

import { useTools } from '../ActionComponent';
import { Icon } from '../Icon';
import './index.less';

const AccountSelect = () => {
    const navigate = useNavigate();

    const currentAccount = useCurrentAccount();
    const tools = useTools();
    const address = currentAccount.address;

    return (
        <div
            className="op_account_bar op_address"
            onClick={() => {
                navigate(RouteTypes.SwitchAccountScreen);
            }}>
            <div className="op_account_col_1">
                <div className="op_account_icon_holder">
                    <Icon icon="user" size={20} />
                </div>
                <div className="op_account_details">
                    <div className="op_account_name">{shortAddress(currentAccount?.alianName, 8)}</div>
                    <div
                        className="op_account_wallet"
                        onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(address).then(() => {
                                tools.toastSuccess('Copied');
                            });
                        }}>
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
