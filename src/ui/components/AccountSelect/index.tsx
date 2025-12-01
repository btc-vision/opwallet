import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import { CopyOutlined } from '@ant-design/icons';

import { AddressTypes } from '@/shared/types';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import { useTools } from '../ActionComponent';
import { Icon } from '../Icon';
import './index.less';

const AccountSelect = () => {
    const navigate = useNavigate();

    const currentAccount = useCurrentAccount();
    const currentKeyring = useCurrentKeyring();
    const tools = useTools();
    const address = currentAccount.address;

    const getAddressTypeLabel = (type: AddressTypes): string => {
        const typeLabels: Partial<Record<AddressTypes, string>> = {
            [AddressTypes.P2PKH]: 'Legacy',
            [AddressTypes.P2WPKH]: 'Native SegWit',
            [AddressTypes.P2TR]: 'Taproot',
            [AddressTypes.P2SH_OR_P2SH_P2WPKH]: 'Nested SegWit',
            [AddressTypes.P2WDA]: 'Quantum'
        };
        return typeLabels[type] || 'Unknown';
    };

    const getAddressTypeColor = (type: AddressTypes): string => {
        const colorMap: Partial<Record<AddressTypes, string>> = {
            [AddressTypes.P2PKH]: 'rgba(255, 193, 7, 0.2)', // amber
            [AddressTypes.P2WPKH]: 'rgba(76, 175, 80, 0.2)', // green
            [AddressTypes.P2TR]: 'rgba(156, 39, 176, 0.2)', // purple
            [AddressTypes.P2SH_OR_P2SH_P2WPKH]: 'rgba(33, 150, 243, 0.2)', // blue
            [AddressTypes.P2WDA]: 'rgba(255, 64, 129, 0.2)' // pink for quantum
        };
        return colorMap[type] || 'rgba(255, 255, 255, 0.1)';
    };

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
                    <div className="op_account_name_row">
                        <span className="op_account_name">{shortAddress(currentAccount?.alianName, 8)}</span>
                        <span
                            className="op_account_type_badge"
                            style={{
                                background: getAddressTypeColor(currentKeyring.addressType)
                            }}>
                            {getAddressTypeLabel(currentKeyring.addressType)}
                        </span>
                    </div>
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
