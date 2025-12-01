import { useCallback, useEffect, useMemo, useState } from 'react';

import { ADDRESS_TYPES } from '@/shared/constant';
import { AddressAssets, AddressTypes } from '@/shared/types';
import { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import { Column, Content, Header, Layout, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { AddressTypeCard } from '@/ui/components/AddressTypeCard';
import { satoshisToAmount, useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    ImportOutlined,
    InfoCircleOutlined,
    KeyOutlined,
    LoadingOutlined,
    SafetyOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { EcKeyPair } from '@btc-vision/transaction';
import { ethers } from 'ethers';

import { RouteTypes, useNavigate } from '../MainRoute';

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
    warning: '#fbbf24',
    ethereum: '#627EEA'
};

function Step1({ updateContextData }: { updateContextData: (params: UpdateContextDataParams) => void }) {
    const [wif, setWif] = useState('');
    const [disabled, setDisabled] = useState(true);
    const [inputType, setInputType] = useState<'auto' | 'wif' | 'ethereum'>('auto');
    const wallet = useWallet();
    const tools = useTools();

    useEffect(() => {
        setDisabled(!wif.trim());
    }, [wif]);

    useEffect(() => {
        const raw = wif.trim();
        if (!raw) {
            setInputType('auto');
            return;
        }

        if (isLikelyHexPriv(raw)) {
            setInputType('ethereum');
        } else {
            setInputType('wif');
        }
    }, [wif]);

    const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setWif(val);
        updateContextData({ step1Completed: !!val });
    };

    const btnClick = async () => {
        const network = await wallet.getNetworkType();
        const bitcoinNetwork = getBitcoinLibJSNetwork(network);

        const raw = wif.trim();
        let keyKind: KeyKind | null = null;

        // try WIF first
        try {
            EcKeyPair.fromWIF(raw, bitcoinNetwork);
            keyKind = 'wif';
        } catch (e) {
            console.error(e);
        }

        // then try raw 32-byte hex (ethereum-style)
        if (!keyKind && isLikelyHexPriv(raw)) {
            try {
                const buf = Buffer.from(raw.replace(/^0x/, ''), 'hex');
                EcKeyPair.fromPrivateKey(buf, bitcoinNetwork);
                keyKind = 'rawHex';
            } catch (e) {
                console.error(e);
            }
        }

        if (!keyKind) {
            tools.toastError(`Invalid private key format`);
            return;
        }

        updateContextData({
            wif: raw,
            keyKind,
            tabType: TabType.STEP2
        });
    };

    return (
        <Column gap="lg">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}10 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                    <KeyOutlined style={{ fontSize: 28, color: colors.main }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Text text="Import Private Key" preset="bold" size="lg" />
                </div>
                <div
                    style={{
                        fontSize: '13px',
                        color: colors.textFaded,
                        marginTop: '8px'
                    }}>
                    Enter your Bitcoin WIF/HEX or Ethereum private key
                </div>
            </div>

            {/* Input Area */}
            <div style={{ position: 'relative' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                    }}>
                    <label
                        style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: colors.textFaded,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                        Private Key
                    </label>
                    {inputType !== 'auto' && (
                        <span
                            style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                background: inputType === 'ethereum' ? `${colors.ethereum}20` : `${colors.main}20`,
                                color: inputType === 'ethereum' ? colors.ethereum : colors.main,
                                borderRadius: '4px',
                                fontWeight: 600
                            }}>
                            {inputType === 'ethereum' ? 'BTC/ETH Format' : 'BTC Format'}
                        </span>
                    )}
                </div>

                <textarea
                    style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        background: colors.inputBg,
                        border: `1px solid ${colors.containerBorder}`,
                        borderRadius: '10px',
                        color: colors.text,
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                        outline: 'none',
                        transition: 'all 0.2s'
                    }}
                    placeholder="WIF format (c..., K..., L...) or 64-character hex"
                    value={wif}
                    onChange={onChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            void btnClick();
                        }
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.main;
                        e.currentTarget.style.background = colors.containerBgFaded;
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.containerBorder;
                        e.currentTarget.style.background = colors.inputBg;
                    }}
                    autoFocus
                />
            </div>

            {/* Format Examples */}
            <div
                style={{
                    background: colors.containerBgFaded,
                    borderRadius: '10px',
                    padding: '12px'
                }}>
                <div
                    style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: colors.textFaded,
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                    <InfoCircleOutlined style={{ fontSize: 12 }} />
                    Supported Formats
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                        <span
                            style={{
                                padding: '1px 4px',
                                background: `${colors.main}20`,
                                color: colors.main,
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 600
                            }}>
                            BTC
                        </span>
                        <span style={{ fontFamily: 'monospace' }}>cNvbw... C/K/L...</span>
                    </div>
                    <div
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                        <span
                            style={{
                                padding: '1px 4px',
                                background: `${colors.ethereum}20`,
                                color: colors.ethereum,
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 600
                            }}>
                            BTC/ETH
                        </span>
                        <span style={{ fontFamily: 'monospace' }}>64 hex chars</span>
                    </div>
                </div>
            </div>

            {/* Continue Button */}
            <button
                style={{
                    width: '100%',
                    padding: '14px',
                    background: disabled ? colors.buttonBg : colors.main,
                    border: 'none',
                    borderRadius: '12px',
                    color: disabled ? colors.textFaded : colors.background,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    marginTop: '8px',
                    opacity: disabled ? 0.5 : 1
                }}
                disabled={disabled}
                onClick={btnClick}
                onMouseEnter={(e) => {
                    if (!disabled) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 116, 19, 0.3)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
                Continue
            </button>
        </Column>
    );
}

function Step2({
    contextData,
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const wallet = useWallet();
    const tools = useTools();
    const navigate = useNavigate();

    const hdPathOptions = useMemo(() => {
        return ADDRESS_TYPES.filter((v) => {
            if (v.displayIndex < 0) {
                return false;
            }
            return !v.isUnisatLegacy;
        })
            .sort((a, b) => a.displayIndex - b.displayIndex)
            .map((v) => {
                return {
                    label: v.name,
                    hdPath: v.hdPath,
                    addressType: v.value,
                    isUnisatLegacy: v.isUnisatLegacy
                };
            });
    }, []);

    const [previewAddresses, setPreviewAddresses] = useState<string[]>(hdPathOptions.map(() => ''));
    const [addressAssets, setAddressAssets] = useState<Record<string, AddressAssets>>({});
    const [ethAddress, setEthAddress] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const run = async () => {
        setLoading(true);
        const network = await wallet.getNetworkType();
        const bitcoinNetwork = getBitcoinLibJSNetwork(network);

        const addresses: string[] = [];
        const balancesMap: Record<string, AddressAssets> = {};

        const getAddrForType = (t: AddressTypes) => {
            // For both WIF and raw hex, use EcKeyPair methods for address derivation
            const kp =
                contextData.keyKind === 'wif'
                    ? EcKeyPair.fromWIF(contextData.wif, bitcoinNetwork)
                    : EcKeyPair.fromPrivateKey(
                          Buffer.from(contextData.wif.replace(/^0x/, '').trim(), 'hex'),
                          bitcoinNetwork
                      );

            if (t === AddressTypes.P2TR) return EcKeyPair.getTaprootAddress(kp, bitcoinNetwork);
            if (t === AddressTypes.P2SH_OR_P2SH_P2WPKH) return EcKeyPair.getLegacySegwitAddress(kp, bitcoinNetwork);
            if (t === AddressTypes.P2WPKH) return EcKeyPair.getP2WPKHAddress(kp, bitcoinNetwork);
            return EcKeyPair.getLegacyAddress(kp, bitcoinNetwork);
        };

        for (const opt of hdPathOptions) {
            try {
                const addr = getAddrForType(opt.addressType);
                addresses.push(addr);
            } catch (e) {
                addresses.push('');
            }
        }

        const balances = await wallet.getMultiAddressAssets(addresses.join(','));
        let maxSatoshis = 0;
        let recommendedIndex = 0;

        for (let i = 0; i < addresses.length; i++) {
            const a = addresses[i];
            if (!a) continue;
            const b = balances[i];
            const satoshis = b?.totalSatoshis ?? 0;
            balancesMap[a] = { total_btc: satoshisToAmount(satoshis), satoshis };
            if (satoshis > maxSatoshis) {
                maxSatoshis = satoshis;
                recommendedIndex = i;
            }
        }

        let recommended: AddressTypes = hdPathOptions[recommendedIndex].addressType;
        if (maxSatoshis === 0) {
            recommended = AddressTypes.P2TR;
        }

        updateContextData({ addressType: recommended });
        setAddressAssets(balancesMap);
        setPreviewAddresses(addresses);
        setLoading(false);
    };

    useEffect(() => {
        void run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextData.wif]);

    useEffect(() => {
        const raw = contextData.wif?.trim();
        if (contextData.keyKind !== 'rawHex' || !raw) {
            setEthAddress(null);
            return;
        }
        try {
            const pk = raw.startsWith('0x') ? raw : '0x' + raw;
            const addr = ethers.computeAddress(pk);
            setEthAddress(addr);
        } catch {
            setEthAddress(null);
        }
    }, [contextData.wif, contextData.keyKind]);

    const pathIndex = useMemo(() => {
        return hdPathOptions.findIndex((v) => v.addressType === contextData.addressType);
    }, [hdPathOptions, contextData.addressType]);

    const [quantumKeyInput, setQuantumKeyInput] = useState('');
    const [quantumKeyError, setQuantumKeyError] = useState('');

    const validateQuantumKey = (key: string): boolean => {
        if (!key) return true; // Optional field
        const cleanKey = key.replace('0x', '').trim();
        if (!/^[0-9a-fA-F]{128}$/.test(cleanKey)) {
            setQuantumKeyError('Quantum key must be 128 hex characters (64 bytes)');
            return false;
        }
        setQuantumKeyError('');
        return true;
    };

    const onNext = async () => {
        try {
            const pk =
                contextData.keyKind === 'rawHex' ? contextData.wif.replace(/^0x/, '').toLowerCase() : contextData.wif;

            // Validate quantum key if provided
            if (contextData.importQuantumKey && quantumKeyInput) {
                if (!validateQuantumKey(quantumKeyInput)) {
                    return;
                }
            }

            // Pass quantum private key if provided
            const quantumKey =
                contextData.importQuantumKey && quantumKeyInput ? quantumKeyInput.replace('0x', '').trim() : undefined;

            await wallet.createKeyringWithPrivateKey(pk, contextData.addressType, undefined, quantumKey);
            navigate(RouteTypes.MainScreen);
        } catch (e) {
            tools.toastError((e as Error).message);
        }
    };

    if (loading) {
        return (
            <Column itemsCenter justifyCenter style={{ minHeight: 300 }}>
                <LoadingOutlined style={{ fontSize: 24, color: colors.main }} />
                <Text text="Loading addresses..." color="textDim" size="sm" style={{ marginTop: 12 }} />
            </Column>
        );
    }

    return (
        <Column gap="lg">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}10 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                    <WalletOutlined style={{ fontSize: 28, color: colors.main }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Text text="Select Address Type" preset="bold" size="lg" />
                </div>
                <div
                    style={{
                        fontSize: '13px',
                        color: colors.textFaded,
                        marginTop: '8px'
                    }}>
                    Choose the address format for your wallet
                </div>
            </div>

            {/* Ethereum Address Info */}
            {ethAddress && (
                <div
                    style={{
                        padding: '12px',
                        background: `${colors.ethereum}10`,
                        border: `1px solid ${colors.ethereum}30`,
                        borderRadius: '10px',
                        marginBottom: '12px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.ethereum,
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <ImportOutlined style={{ fontSize: 12 }} />
                        Linked Ethereum Address
                    </div>
                    <div
                        style={{
                            fontSize: '12px',
                            color: colors.text,
                            fontFamily: 'monospace',
                            wordBreak: 'break-all'
                        }}>
                        {ethAddress}
                    </div>
                </div>
            )}

            {/* Address Type Cards */}
            <div
                style={{
                    background: colors.containerBgFaded,
                    borderRadius: '14px',
                    padding: '8px'
                }}>
                {hdPathOptions.map((item, index) => {
                    const address = previewAddresses[index];
                    const assets = addressAssets[address] || {
                        total_btc: '--',
                        satoshis: 0
                    };

                    const hasVault = assets.satoshis > 0;
                    if (item.isUnisatLegacy && !hasVault) {
                        return null;
                    }

                    const isRecommended = assets.satoshis > 0 && index === pathIndex;

                    return (
                        <div key={index} style={{ marginBottom: '8px' }}>
                            <AddressTypeCard
                                label={item.label}
                                address={address}
                                assets={assets}
                                checked={index === pathIndex}
                                onClick={() => {
                                    updateContextData({ addressType: item.addressType });
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Post-Quantum Key Section */}
            <div
                style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginTop: '8px'
                }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: contextData.importQuantumKey ? '12px' : '0'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SafetyOutlined style={{ fontSize: 16, color: '#8B5CF6' }} />
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                                Import Quantum Key
                            </div>
                            <div style={{ fontSize: '11px', color: colors.textFaded }}>For OPNet compatibility</div>
                        </div>
                    </div>
                    <button
                        style={{
                            padding: '4px 12px',
                            background: contextData.importQuantumKey ? '#8B5CF6' : colors.buttonBg,
                            border: 'none',
                            borderRadius: '6px',
                            color: contextData.importQuantumKey ? colors.background : colors.text,
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                        onClick={() => updateContextData({ importQuantumKey: !contextData.importQuantumKey })}>
                        {contextData.importQuantumKey ? 'Enabled' : 'Optional'}
                    </button>
                </div>

                {contextData.importQuantumKey && (
                    <div>
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: '60px',
                                padding: '10px',
                                background: colors.inputBg,
                                border: quantumKeyError
                                    ? `1px solid ${colors.error}`
                                    : `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px',
                                color: colors.text,
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                resize: 'vertical',
                                outline: 'none'
                            }}
                            placeholder="Enter 128-character hex MLDSA private key (optional - one will be generated if not provided)"
                            value={quantumKeyInput}
                            onChange={(e) => {
                                setQuantumKeyInput(e.target.value);
                                setQuantumKeyError('');
                            }}
                        />
                        {quantumKeyError && (
                            <div style={{ fontSize: '11px', color: colors.error, marginTop: '4px' }}>
                                {quantumKeyError}
                            </div>
                        )}
                        <div style={{ fontSize: '10px', color: colors.textFaded, marginTop: '6px' }}>
                            If you have an existing quantum key from another wallet, enter it here. Otherwise, a new key
                            will be generated automatically.
                        </div>
                    </div>
                )}
            </div>

            {/* Import Button */}
            <button
                style={{
                    width: '100%',
                    padding: '14px',
                    background: colors.main,
                    border: 'none',
                    borderRadius: '12px',
                    color: colors.background,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginTop: '8px'
                }}
                onClick={onNext}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 116, 19, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
                Import Wallet
            </button>
        </Column>
    );
}

enum TabType {
    STEP1 = 'STEP1',
    STEP2 = 'STEP2'
}

type KeyKind = 'wif' | 'rawHex';

interface ContextData {
    wif: string;
    keyKind: KeyKind;
    addressType: AddressTypes;
    step1Completed: boolean;
    tabType: TabType;
    quantumPrivateKey?: string;
    importQuantumKey: boolean;
}

interface UpdateContextDataParams {
    wif?: string;
    keyKind?: KeyKind;
    addressType?: AddressTypes;
    step1Completed?: boolean;
    tabType?: TabType;
    quantumPrivateKey?: string;
    importQuantumKey?: boolean;
}

function isLikelyHexPriv(s: string) {
    const h = s.trim().toLowerCase().replace(/^0x/, '');
    return /^[0-9a-f]{64}$/.test(h);
}

export default function CreateSimpleWalletScreen() {
    const [contextData, setContextData] = useState<ContextData>({
        wif: '',
        keyKind: 'wif',
        addressType: AddressTypes.P2WPKH,
        step1Completed: false,
        tabType: TabType.STEP1,
        quantumPrivateKey: '',
        importQuantumKey: false
    });

    const updateContextData = useCallback(
        (params: UpdateContextDataParams) => {
            setContextData(Object.assign({}, contextData, params));
        },
        [contextData, setContextData]
    );

    const items = useMemo(() => {
        return [
            {
                key: TabType.STEP1,
                label: 'Private Key',
                children: <Step1 updateContextData={updateContextData} />
            },
            {
                key: TabType.STEP2,
                label: 'Address Type',
                children: <Step2 contextData={contextData} updateContextData={updateContextData} />
            }
        ];
    }, [contextData, updateContextData]);

    const currentChildren = useMemo(() => {
        const item = items.find((v) => v.key === contextData.tabType);
        return item?.children;
    }, [items, contextData.tabType]);

    const currentStepIndex = items.findIndex((item) => item.key === contextData.tabType);

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Import Private Key"
            />

            <Content
                style={{
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100vh - 56px)',
                    overflow: 'hidden'
                }}>
                {/* Compact Step Indicator */}
                <div
                    style={{
                        padding: '12px 16px',
                        background: colors.containerBgFaded,
                        borderBottom: `1px solid ${colors.containerBorder}`,
                        flexShrink: 0
                    }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.textFaded,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                            Step {currentStepIndex + 1} of {items.length}
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.main,
                                fontWeight: 600
                            }}>
                            {items[currentStepIndex]?.label}
                        </div>
                    </div>

                    {/* Compact Progress Steps */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                        {items.map((item, index) => {
                            const isActive = item.key === contextData.tabType;
                            const isCompleted = index < currentStepIndex;
                            const isClickable =
                                isCompleted || (index === currentStepIndex + 1 && contextData.step1Completed);

                            return (
                                <div
                                    key={item.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        flex: index === items.length - 1 ? '0' : '1'
                                    }}>
                                    <button
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: isActive
                                                ? colors.main
                                                : isCompleted
                                                  ? colors.success
                                                  : colors.buttonHoverBg,
                                            border: `1px solid ${
                                                isActive
                                                    ? colors.main
                                                    : isCompleted
                                                      ? colors.success
                                                      : colors.containerBorder
                                            }`,
                                            color: isActive || isCompleted ? colors.background : colors.textFaded,
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: isClickable ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            flexShrink: 0
                                        }}
                                        onClick={() => {
                                            if (!isClickable) return;

                                            const toTabType = item.key;
                                            if (toTabType === TabType.STEP2 && !contextData.step1Completed) {
                                                return;
                                            }
                                            updateContextData({ tabType: toTabType });
                                        }}>
                                        {isCompleted ? <CheckCircleFilled style={{ fontSize: 12 }} /> : index + 1}
                                    </button>
                                    {index < items.length - 1 && (
                                        <div
                                            style={{
                                                flex: 1,
                                                height: '2px',
                                                background: isCompleted ? colors.success : colors.containerBorder,
                                                margin: '0 8px',
                                                transition: 'background 0.3s'
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '16px',
                        minHeight: 0
                    }}>
                    {currentChildren}
                </div>

                {/* Fixed Bottom Warning - Only show on first step */}
                {currentStepIndex === 0 && (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: `${colors.warning}10`,
                            borderTop: `1px solid ${colors.warning}30`,
                            flexShrink: 0
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                            <span
                                style={{
                                    fontSize: '14px',
                                    color: colors.warning
                                }}>
                                ⚠️
                            </span>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    lineHeight: '1.3'
                                }}>
                                Never share your private key. Ensure privacy when importing.
                            </div>
                        </div>
                    </div>
                )}
            </Content>
        </Layout>
    );
}
