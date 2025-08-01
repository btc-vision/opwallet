import Web3API from '@/shared/web3/Web3API';
import { useAccountPublicKey } from '@/ui/state/accounts/hooks';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import { CopyOutlined, DownOutlined, HistoryOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import { useRef, useState } from 'react';
import { useTools } from '../ActionComponent';

export function AddressBar() {
    const tools = useTools();
    const publicKey = '0x' + useAccountPublicKey();
    const explorerUrl = `https://opscan.org/accounts/${publicKey}`;
    const csv75Address = Address.fromString(publicKey).toCSV(75, Web3API.network).address;
    const csv1Address = Address.fromString(publicKey).toCSV(1, Web3API.network).address;

    const [showMenu, setShowMenu] = useState(false);
    const closeTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleCopy = (address: string) => {
        copyToClipboard(address).then(() => tools.toastSuccess('Copied'));
    };

    const handleMouseEnter = () => {
        if (closeTimeout.current) clearTimeout(closeTimeout.current);
        setShowMenu(true);
    };

    const handleMouseLeave = () => {
        if (closeTimeout.current) clearTimeout(closeTimeout.current);
        closeTimeout.current = setTimeout(() => setShowMenu(false), 100);
    };

    const addresses = [
        {
            label: 'Public Key',
            value: publicKey,
            info: 'Your unified OP_NET account. All OP_20 tokens are tied to this key. More info: https://docs.opnet.org/learn/unified-accounts'
        },
        {
            label: 'CSV 75',
            value: csv75Address,
            info: 'Address used for SHA1 Mining reward payouts on OP_NET.'
        },
        {
            label: 'CSV 1',
            value: csv1Address,
            info: 'Address for anti-pinning protection, used by contracts such as NativeSwap.'
        }
    ];

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
            }}>
            <div style={{ position: 'relative' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#ee771b',
                        cursor: 'pointer',
                        padding: '3px 0',
                        borderBottom: '1px dashed rgba(238,119,27,0.6)',
                        transition: 'color 0.2s ease'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = '#ff9444')}
                    onMouseOut={(e) => (e.currentTarget.style.color = '#ee771b')}>
                    Show other addresses
                    <DownOutlined style={{ fontSize: 10 }} />
                </div>

                {showMenu && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '28px',
                            left: '-5px',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            padding: '10px',
                            width: '300px',
                            zIndex: 20,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
                        }}>
                        {addresses.map((addr, i) => (
                            <div
                                key={addr.label}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '6px 0',
                                    borderBottom: i !== addresses.length - 1 ? '1px solid #2a2a2a' : 'none'
                                }}>
                                <div style={{ flex: '1' }}>
                                    <div style={{ fontSize: '11px', color: '#aaa' }}>{addr.label}</div>
                                    <div
                                        style={{ cursor: 'pointer', fontSize: '13px', color: '#fff' }}
                                        onClick={() => handleCopy(addr.value)}>
                                        {shortAddress(addr.value)}{' '}
                                        <CopyOutlined
                                            style={{ color: '#ee771b', fontSize: 13 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(addr.value);
                                            }}
                                        />
                                    </div>
                                </div>
                                <div
                                    style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}
                                    onMouseEnter={(e) => {
                                        const tooltip = e.currentTarget.querySelector('.custom-tooltip') as HTMLElement;
                                        if (tooltip) {
                                            tooltip.style.left = '50%';
                                            tooltip.style.right = 'auto';
                                            tooltip.style.transform = 'translateX(-50%)';

                                            tooltip.style.visibility = 'hidden';
                                            tooltip.style.opacity = '0';
                                            tooltip.style.display = 'block';

                                            const rect = tooltip.getBoundingClientRect();
                                            const bodyWidth = document.body.clientWidth;
                                            const rightOverflow = rect.right > bodyWidth - 10;

                                            if (rightOverflow) {
                                                tooltip.style.left = 'auto';
                                                tooltip.style.right = '0';
                                                tooltip.style.transform = 'translateX(0)';
                                            }

                                            tooltip.style.visibility = 'visible';
                                            tooltip.style.opacity = '1';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        const tooltip = e.currentTarget.querySelector('.custom-tooltip') as HTMLElement;
                                        if (tooltip) {
                                            tooltip.style.visibility = 'hidden';
                                            tooltip.style.opacity = '0';
                                            tooltip.style.display = 'block';
                                        }
                                    }}>
                                    <InfoCircleOutlined style={{ color: '#666', cursor: 'help' }} />
                                    <div
                                        style={{
                                            visibility: 'hidden',
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                            position: 'absolute',
                                            bottom: '130%',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: '#2a2a2a',
                                            color: '#fff',
                                            fontSize: '11px',
                                            padding: '6px 8px',
                                            borderRadius: '4px',
                                            width: '240px',
                                            textAlign: 'left',
                                            zIndex: 100,
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                                            pointerEvents: 'none',
                                            whiteSpace: 'normal'
                                        }}
                                        className="custom-tooltip">
                                        {addr.info}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    window.open(explorerUrl, '_blank');
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    color: '#ee771b',
                    border: '1px solid #ee771b',
                    borderRadius: '6px',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(238, 119, 27, 0.1)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
                <HistoryOutlined />
                History
            </button>
        </div>
    );
}
