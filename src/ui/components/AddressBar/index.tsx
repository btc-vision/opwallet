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

            {/*
            <Row
                selfItemsCenter
                itemsCenter
                style={{
                    padding: 5,
                    borderRadius: 7,
                    backgroundColor: 'rgba(240, 129, 51, 0.15)'
                }}
                onClick={async () => {
                    await copyToClipboard(publicKey).then(() => {
                        tools.toastSuccess('Copied');
                    });
                }}>
                <Text text={`Public Key: ${shortAddress(publicKey)}`} style={{ color: '#f08133' }} preset="regular" />
                <CopyOutlined style={{ color: '#f08133', fontSize: 14 }} />
            </Row>*/}
        </>
    );
}
