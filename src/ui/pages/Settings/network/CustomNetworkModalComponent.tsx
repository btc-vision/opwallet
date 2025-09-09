import { CHAIN_ICONS, ChainId } from '@/shared/constant';
import { NetworkType } from '@/shared/types';
import { Column, Image, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { BottomModal } from '@/ui/components/BottomModal';
import { useWallet } from '@/ui/utils';
import {
    ApiOutlined,
    CheckCircleFilled,
    CloseOutlined,
    DollarOutlined,
    ExperimentOutlined,
    GlobalOutlined,
    InfoCircleOutlined,
    LinkOutlined
} from '@ant-design/icons';
import { useState } from 'react';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

interface NetworkOption {
    value: NetworkType;
    label: string;
    description: string;
}

interface ChainOption {
    value: ChainId;
    label: string;
    icon: string;
}

const NETWORK_OPTIONS: NetworkOption[] = [
    { value: NetworkType.MAINNET, label: 'Mainnet', description: 'Production network' },
    { value: NetworkType.TESTNET, label: 'Testnet', description: 'Test network' },
    { value: NetworkType.REGTEST, label: 'Regtest', description: 'Local testing' }
];

const CHAIN_OPTIONS: ChainOption[] = [
    { value: ChainId.Bitcoin, label: 'Bitcoin', icon: CHAIN_ICONS[ChainId.Bitcoin] },
    { value: ChainId.Fractal, label: 'Fractal', icon: CHAIN_ICONS[ChainId.Fractal] },
    { value: ChainId.Dogecoin, label: 'Dogecoin', icon: CHAIN_ICONS[ChainId.Dogecoin] },
    { value: ChainId.Litecoin, label: 'Litecoin', icon: CHAIN_ICONS[ChainId.Litecoin] },
    { value: ChainId.BitcoinCash, label: 'Bitcoin Cash', icon: CHAIN_ICONS[ChainId.BitcoinCash] },
    { value: ChainId.Dash, label: 'Dash', icon: CHAIN_ICONS[ChainId.Dash] }
];

const InputField = ({
    label,
    value,
    onChange,
    placeholder,
    icon,
    required = false,
    info
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon?: React.ReactNode;
    required?: boolean;
    info?: string;
}) => (
    <div style={{ marginBottom: '16px' }}>
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px'
            }}>
            <label
                style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colors.textFaded,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                {label}
                {required && <span style={{ color: colors.main }}> *</span>}
            </label>
            {info && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <InfoCircleOutlined
                        style={{
                            fontSize: 12,
                            color: colors.textFaded,
                            cursor: 'help'
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '120%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: colors.containerBg,
                            color: colors.text,
                            fontSize: '11px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${colors.containerBorder}`,
                            width: '200px',
                            textAlign: 'left',
                            zIndex: 1000,
                            pointerEvents: 'none',
                            whiteSpace: 'normal',
                            lineHeight: '1.3',
                            visibility: 'hidden',
                            opacity: 0,
                            transition: 'all 0.2s'
                        }}
                        className="tooltip">
                        {info}
                    </div>
                    <style>{`
                        .tooltip:hover + .tooltip,
                        div:hover > .tooltip {
                            visibility: visible !important;
                            opacity: 1 !important;
                        }
                    `}</style>
                </div>
            )}
        </div>
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                background: colors.inputBg,
                border: `1px solid ${colors.containerBorder}`,
                borderRadius: '10px',
                padding: '10px 12px',
                transition: 'all 0.2s'
            }}>
            {icon && (
                <div
                    style={{
                        marginRight: '10px',
                        color: colors.textFaded,
                        fontSize: '16px'
                    }}>
                    {icon}
                </div>
            )}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: colors.text,
                    fontSize: '13px',
                    fontFamily: 'Inter-Regular, serif'
                }}
            />
        </div>
    </div>
);

export const AddCustomNetworkModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const wallet = useWallet();
    const tools = useTools();
    const [name, setName] = useState('');
    const [networkType, setNetworkType] = useState<NetworkType>(NetworkType.MAINNET);
    const [chainId, setChainId] = useState<ChainId>(ChainId.Bitcoin);
    const [unit, setUnit] = useState('BTC');
    const [rpcUrl, setRpcUrl] = useState('');
    const [explorerUrl, setExplorerUrl] = useState('https://mempool.space');
    const [faucetUrl, setFaucetUrl] = useState('');
    const [showPrice, setShowPrice] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
    const [showChainDropdown, setShowChainDropdown] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) {
            tools.toastError('Please enter a network name');
            return;
        }

        if (!rpcUrl.trim()) {
            tools.toastError('Please enter an RPC URL');
            return;
        }

        if (!unit.trim()) {
            tools.toastError('Please enter a currency unit');
            return;
        }

        if (!explorerUrl.trim()) {
            tools.toastError('Please enter an explorer URL');
            return;
        }

        try {
            setTesting(true);
            tools.showLoading(true);

            await wallet.addCustomNetwork({
                name: name.trim(),
                networkType,
                chainId,
                unit: unit.trim(),
                opnetUrl: rpcUrl.trim(),
                mempoolSpaceUrl: explorerUrl.trim(),
                faucetUrl: faucetUrl.trim(),
                showPrice
            });

            tools.toastSuccess('Custom network added successfully');
            onSuccess();
            onClose();
        } catch (error) {
            tools.toastError(error instanceof Error ? error.message : 'Failed to add custom network');
        } finally {
            setTesting(false);
            tools.showLoading(false);
        }
    };

    return (
        <BottomModal onClose={onClose}>
            <Column style={{ height: '100%', maxHeight: '520px' }}>
                {/* Header */}
                <div
                    style={{
                        padding: '14px 16px',
                        background: colors.background,
                        borderBottom: `1px solid ${colors.containerBorder}`
                    }}>
                    <Row justifyBetween itemsCenter fullX>
                        <Text
                            text="Add Custom RPC"
                            style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: colors.text,
                                fontFamily: 'Inter-Regular, serif'
                            }}
                        />
                        <button
                            style={{
                                width: '28px',
                                height: '28px',
                                background: colors.buttonHoverBg,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                transition: 'all 0.15s'
                            }}
                            onClick={onClose}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = colors.buttonBg;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                            }}>
                            <CloseOutlined style={{ fontSize: 14, color: colors.textFaded }} />
                        </button>
                    </Row>
                </div>

                {/* Scrollable Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '16px',
                        background: colors.background
                    }}>
                    {/* Network Name */}
                    <InputField
                        label="Network Name"
                        value={name}
                        onChange={setName}
                        placeholder="My Custom Network"
                        required
                    />

                    {/* Network Type Selector */}
                    <div style={{ marginBottom: '16px' }}>
                        <label
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                            Network Type <span style={{ color: colors.main }}>*</span>
                        </label>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '8px'
                            }}>
                            {NETWORK_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    style={{
                                        padding: '8px',
                                        background: networkType === option.value ? colors.main : colors.buttonHoverBg,
                                        border: `1px solid ${networkType === option.value ? colors.main : colors.containerBorder}`,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                    onClick={() => setNetworkType(option.value)}
                                    onMouseEnter={(e) => {
                                        if (networkType !== option.value) {
                                            e.currentTarget.style.background = colors.buttonBg;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (networkType !== option.value) {
                                            e.currentTarget.style.background = colors.buttonHoverBg;
                                        }
                                    }}>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: networkType === option.value ? colors.background : colors.text
                                        }}>
                                        {option.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '10px',
                                            color: networkType === option.value ? colors.background : colors.textFaded,
                                            marginTop: '2px'
                                        }}>
                                        {option.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chain Type Dropdown */}
                    <div style={{ marginBottom: '16px', position: 'relative' }}>
                        <label
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                            Chain Type <span style={{ color: colors.main }}>*</span>
                        </label>
                        <button
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                            onClick={() => setShowChainDropdown(!showChainDropdown)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Image src={CHAIN_OPTIONS.find((o) => o.value === chainId)?.icon || ''} size={20} />
                                <span
                                    style={{
                                        fontSize: '13px',
                                        color: colors.text,
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    {CHAIN_OPTIONS.find((o) => o.value === chainId)?.label || ''}
                                </span>
                            </div>
                            <span
                                style={{
                                    fontSize: '10px',
                                    color: colors.textFaded,
                                    transform: showChainDropdown ? 'rotate(180deg)' : 'rotate(0)',
                                    transition: 'transform 0.2s'
                                }}>
                                ▼
                            </span>
                        </button>

                        {showChainDropdown && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    background: colors.containerBg,
                                    border: `1px solid ${colors.containerBorder}`,
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    zIndex: 1000,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                }}>
                                {CHAIN_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: `1px solid ${colors.containerBorder}`,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.15s'
                                        }}
                                        onClick={() => {
                                            setChainId(option.value);
                                            setShowChainDropdown(false);
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = colors.buttonHoverBg;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}>
                                        <Image src={option.icon} size={20} />
                                        <span
                                            style={{
                                                fontSize: '13px',
                                                color: colors.text,
                                                fontFamily: 'Inter-Regular, serif'
                                            }}>
                                            {option.label}
                                        </span>
                                        {chainId === option.value && (
                                            <CheckCircleFilled
                                                style={{
                                                    marginLeft: 'auto',
                                                    fontSize: 14,
                                                    color: colors.main
                                                }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Currency Unit */}
                    <InputField
                        label="Currency Unit"
                        value={unit}
                        onChange={setUnit}
                        placeholder="BTC, tBTC, FB"
                        icon={<DollarOutlined />}
                        required
                        info="The ticker symbol for this network"
                    />

                    {/* RPC URL */}
                    <InputField
                        label="RPC URL"
                        value={rpcUrl}
                        onChange={setRpcUrl}
                        placeholder="https://mainnet.opnet.org"
                        icon={<ApiOutlined />}
                        required
                        info="The RPC endpoint for this network"
                    />

                    {/* Explorer URL */}
                    <InputField
                        label="Block Explorer"
                        value={explorerUrl}
                        onChange={setExplorerUrl}
                        placeholder="https://mempool.space"
                        icon={<GlobalOutlined />}
                        required
                        info="Block explorer for viewing transactions"
                    />

                    {/* Faucet URL */}
                    <InputField
                        label="Faucet URL"
                        value={faucetUrl}
                        onChange={setFaucetUrl}
                        placeholder="https://faucet.opnet.org (optional)"
                        icon={<ExperimentOutlined />}
                        info="Faucet for getting test tokens"
                    />

                    {/* Show Price Checkbox */}
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px',
                            background: colors.containerBgFaded,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            transition: 'all 0.15s'
                        }}>
                        <input
                            type="checkbox"
                            checked={showPrice}
                            onChange={(e) => setShowPrice(e.target.checked)}
                            style={{
                                width: '16px',
                                height: '16px',
                                cursor: 'pointer',
                                accentColor: colors.main
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: '13px',
                                    color: colors.text,
                                    fontWeight: 500
                                }}>
                                Show price information
                            </div>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    marginTop: '2px'
                                }}>
                                Display fiat value for this network
                            </div>
                        </div>
                        <LinkOutlined
                            style={{
                                fontSize: 14,
                                color: showPrice ? colors.main : colors.textFaded
                            }}
                        />
                    </label>

                    {/* Submit Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: testing ? colors.buttonBg : colors.main,
                            border: 'none',
                            borderRadius: '12px',
                            color: testing ? colors.textFaded : colors.background,
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: testing ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: 'Inter-Regular, serif'
                        }}
                        onClick={handleSubmit}
                        disabled={testing}
                        onMouseEnter={(e) => {
                            if (!testing) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 116, 19, 0.3)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        {testing ? 'Testing Connection...' : 'Add Network'}
                    </button>
                </div>
            </Column>
        </BottomModal>
    );
};
