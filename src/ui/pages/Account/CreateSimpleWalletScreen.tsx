import { ECPairFactory } from 'ecpair';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ADDRESS_TYPES } from '@/shared/constant';
import { AddressAssets, AddressType } from '@/shared/types';
import { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import { Column, Content, Header, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { AddressTypeCard } from '@/ui/components/AddressTypeCard';
import { TabBar } from '@/ui/components/TabBar';
import { satoshisToAmount, useWallet } from '@/ui/utils';
import { ImportOutlined, InfoCircleOutlined, KeyOutlined, LoadingOutlined, WalletOutlined } from '@ant-design/icons';
import * as ecc from '@bitcoinerlab/secp256k1';
import { EcKeyPair, Wallet } from '@btc-vision/transaction';
import { ethers } from 'ethers';

import { RouteTypes, useNavigate } from '../MainRoute';

const ECPair = ECPairFactory(ecc);

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
            Wallet.fromWif(raw, bitcoinNetwork);
            keyKind = 'wif';
        } catch (e) {
            console.error(e);
        }

        // then try raw 32-byte hex (ethereum-style)
        if (!keyKind && isLikelyHexPriv(raw)) {
            try {
                const buf = Buffer.from(raw.replace(/^0x/, ''), 'hex');
                ECPair.fromPrivateKey(buf, { network: bitcoinNetwork });
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

        const getAddrForType = (t: AddressType) => {
            if (contextData.keyKind === 'wif') {
                const w = Wallet.fromWif(contextData.wif, bitcoinNetwork);
                if (t === AddressType.P2TR) return w.p2tr;
                if (t === AddressType.P2SH_P2WPKH) return w.segwitLegacy;
                if (t === AddressType.P2WPKH) return w.p2wpkh;
                return EcKeyPair.getLegacyAddress(
                    Wallet.fromWif(contextData.wif, bitcoinNetwork).keypair,
                    bitcoinNetwork
                );
            } else {
                const buf = Buffer.from(contextData.wif.replace(/^0x/, '').trim(), 'hex');
                const kp = EcKeyPair.fromPrivateKey(buf, bitcoinNetwork);
                if (t === AddressType.P2TR) return EcKeyPair.getTaprootAddress(kp, bitcoinNetwork);
                if (t === AddressType.P2SH_P2WPKH) return EcKeyPair.getLegacySegwitAddress(kp, bitcoinNetwork);
                if (t === AddressType.P2WPKH) return EcKeyPair.getP2WPKHAddress(kp, bitcoinNetwork);
                return EcKeyPair.getLegacyAddress(kp, bitcoinNetwork);
            }
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

        let recommended: AddressType = hdPathOptions[recommendedIndex].addressType;
        if (maxSatoshis === 0) {
            recommended = AddressType.P2TR;
        }

        updateContextData({ addressType: recommended });
        setAddressAssets(balancesMap);
        setPreviewAddresses(addresses);
        setLoading(false);
    };

    useEffect(() => {
        void run();
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

    const onNext = async () => {
        try {
            const pk =
                contextData.keyKind === 'rawHex' ? contextData.wif.replace(/^0x/, '').toLowerCase() : contextData.wif;

            await wallet.createKeyringWithPrivateKey(pk, contextData.addressType);
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
    addressType: AddressType;
    step1Completed: boolean;
    tabType: TabType;
}

interface UpdateContextDataParams {
    wif?: string;
    keyKind?: KeyKind;
    addressType?: AddressType;
    step1Completed?: boolean;
    tabType?: TabType;
}

function isLikelyHexPriv(s: string) {
    const h = s.trim().toLowerCase().replace(/^0x/, '');
    return /^[0-9a-f]{64}$/.test(h);
}

export default function CreateSimpleWalletScreen() {
    const [contextData, setContextData] = useState<ContextData>({
        wif: '',
        keyKind: 'wif',
        addressType: AddressType.P2WPKH,
        step1Completed: false,
        tabType: TabType.STEP1
    });

    const updateContextData = useCallback(
        (params: UpdateContextDataParams) => {
            setContextData(Object.assign({}, contextData, params));
        },
        [contextData, setContextData]
    );

    const items = [
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

    const renderChildren = items.find((v) => v.key == contextData.tabType)?.children;

    return (
        <Layout>
            <Header
                onBack={() => {
                    window.history.go(-1);
                }}
                title="Import Private Key"
            />
            <Content style={{ padding: '12px' }}>
                <Row justifyCenter style={{ marginBottom: '16px' }}>
                    <TabBar
                        progressEnabled
                        defaultActiveKey={TabType.STEP1}
                        items={items}
                        activeKey={contextData.tabType}
                        onTabClick={(key) => {
                            const toTabType = key as TabType;
                            if (toTabType === TabType.STEP2) {
                                if (!contextData.step1Completed) {
                                    setTimeout(() => {
                                        updateContextData({ tabType: contextData.tabType });
                                    }, 200);
                                    return;
                                }
                            }
                            updateContextData({ tabType: toTabType });
                        }}
                    />
                </Row>

                {renderChildren}
            </Content>
        </Layout>
    );
}
