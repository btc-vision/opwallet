import { CHAINS_MAP, ChainType } from '@/shared/constant';
import { Column, Image, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent/useTools';
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
import { useMemo, useState } from 'react';

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

interface ChainTypeOption {
    value: ChainType;
    label: string;
    icon: string;
    unit: string;
    family: string;
}

function getChainFamily(chainType: ChainType): string {
    const ct = chainType as string;
    if (ct.includes('FRACTAL')) return 'Fractal';
    if (ct.includes('DOGECOIN')) return 'Dogecoin';
    if (ct.includes('LITECOIN')) return 'Litecoin';
    if (ct.includes('BITCOINCASH')) return 'Bitcoin Cash';
    if (ct.includes('DASH')) return 'Dash';
    return 'Bitcoin';
}

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

    // Build chain type options from CHAINS_MAP, grouped by family
    const { chainOptions, groupedOptions } = useMemo(() => {
        const options: ChainTypeOption[] = [];
        for (const [key, config] of Object.entries(CHAINS_MAP)) {
            if (!config) continue;
            const ct = key as ChainType;
            options.push({
                value: ct,
                label: config.label,
                icon: config.icon,
                unit: config.unit,
                family: getChainFamily(ct)
            });
        }

        // Group by family, preserving enum order within each family
        const grouped = new Map<string, ChainTypeOption[]>();
        for (const opt of options) {
            const group = grouped.get(opt.family) ?? [];
            group.push(opt);
            grouped.set(opt.family, group);
        }

        return { chainOptions: options, groupedOptions: grouped };
    }, []);

    const defaultChainType = ChainType.BITCOIN_MAINNET;
    const defaultConfig = CHAINS_MAP[defaultChainType];

    const [chainType, setChainType] = useState<ChainType>(defaultChainType);
    const [name, setName] = useState('');
    const [unit, setUnit] = useState(defaultConfig?.unit ?? 'BTC');
    const [rpcUrl, setRpcUrl] = useState('');
    const [explorerUrl, setExplorerUrl] = useState(defaultConfig?.mempoolSpaceUrl ?? 'https://mempool.space');
    const [faucetUrl, setFaucetUrl] = useState('');
    const [showPrice, setShowPrice] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showChainDropdown, setShowChainDropdown] = useState(false);

    const selectedOption = chainOptions.find((o) => o.value === chainType);

    const handleChainTypeChange = (ct: ChainType) => {
        setChainType(ct);
        setShowChainDropdown(false);

        // Auto-fill defaults from chain config
        const config = CHAINS_MAP[ct];
        if (config) {
            setUnit(config.unit);
            setExplorerUrl(config.mempoolSpaceUrl || 'https://mempool.space');
            setShowPrice(config.showPrice);
        }
    };

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
                chainType,
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
                                <Image src={selectedOption?.icon || ''} size={20} />
                                <span
                                    style={{
                                        fontSize: '13px',
                                        color: colors.text,
                                        fontFamily: 'Inter-Regular, serif'
                                    }}>
                                    {selectedOption?.label || ''}
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
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    maxHeight: '250px',
                                    overflowY: 'auto'
                                }}>
                                {Array.from(groupedOptions.entries()).map(([family, options]) => (
                                    <div key={family}>
                                        <div
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                color: colors.textFaded,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                background: colors.containerBgFaded,
                                                borderBottom: `1px solid ${colors.containerBorder}`
                                            }}>
                                            {family}
                                        </div>
                                        {options.map((option) => (
                                            <button
                                                key={option.value}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px 8px 20px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: `1px solid ${colors.containerBorder}`,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    transition: 'all 0.15s'
                                                }}
                                                onClick={() => handleChainTypeChange(option.value)}
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
                                                {chainType === option.value && (
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
