import { useAccountPublicKey } from '@/ui/state/accounts/hooks';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import { CopyOutlined } from '@ant-design/icons';

import { useTools } from '../ActionComponent';

export function AddressBar() {
    const tools = useTools();
    const publicKey = '0x' + useAccountPublicKey();
    return (
        <>
            <div className="pubkey_row">
                <div className="pubkey_col_1">
                    <div className="pubkey_holder">
                        <div className="pubkey_title">
                            Public Key
                        </div>
                        <div className="pubkey_value" onClick={
                            (e) => {
                                e.stopPropagation();
                                copyToClipboard(publicKey).then(() => {
                                    tools.toastSuccess('Copied');
                                });
                            }}
                        >
                            {shortAddress(publicKey)} <CopyOutlined
                            style={{ color: '#ee771b', fontSize: 13 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(publicKey).then(() => {
                                    tools.toastSuccess('Copied');
                                });
                            }}
                        />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
