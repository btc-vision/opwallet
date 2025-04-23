import { useAccountPublicKey } from '@/ui/state/accounts/hooks';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import { CopyOutlined } from '@ant-design/icons';

import { useTools } from '../ActionComponent';
import { Row } from '../Row';
import { Text } from '../Text';

export function AddressBar() {
    const tools = useTools();
    const publicKey = useAccountPublicKey();
    return (
        <>
            <div className="pubkey_row">
                <div className="pubkey_col_1">
                    <div className="pubkey_holder">
                        <div className="pubkey_title">Public Key</div>
                        <div className="pubkey_value"
                        onClick={async () => {
                            await copyToClipboard(publicKey).then(() => {
                                tools.toastSuccess('Copied');
                            });
                        }}>
                            03c25...1c3ad
                            <CopyOutlined style={{ color: '#f37413', fontSize: 13 }} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
