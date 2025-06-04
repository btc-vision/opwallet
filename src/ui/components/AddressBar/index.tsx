import { useAccountPublicKey } from '@/ui/state/accounts/hooks';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import { CopyOutlined, HistoryOutlined } from '@ant-design/icons';

import { useTools } from '../ActionComponent';

export function AddressBar() {
    const tools = useTools();
    const publicKey = '0x' + useAccountPublicKey();
    const explorerUrl = `https://opscan.org/accounts/${publicKey}`;

    return (
        <>
            <div
                className="pubkey_row"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="pubkey_col_1" style={{ flex: '1' }}>
                    <div
                        className="pubkey_holder"
                        style={{
                            justifyContent: 'center'
                        }}>
                        <div className="pubkey_title">Public Key</div>
                        <div
                            className="pubkey_value"
                            onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(publicKey).then(() => {
                                    tools.toastSuccess('Copied');
                                });
                            }}
                            style={{ cursor: 'pointer' }}>
                            {shortAddress(publicKey)}{' '}
                            <CopyOutlined
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

                <div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(explorerUrl, '_blank');
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            color: '#ee771b',
                            border: '1px solid #ee771b',
                            borderRadius: '6px',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.3s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(238, 119, 27, 0.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}>
                        <HistoryOutlined />
                        History
                    </button>
                </div>
            </div>
        </>
    );
}
