import { ECPairFactory } from 'ecpair';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ADDRESS_TYPES } from '@/shared/constant';
import { AddressAssets, AddressType } from '@/shared/types';
import { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import { Button, Column, Content, Header, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { AddressTypeCard } from '@/ui/components/AddressTypeCard';
import { FooterButtonContainer } from '@/ui/components/FooterButtonContainer';
import { TabBar } from '@/ui/components/TabBar';
import { satoshisToAmount, useWallet } from '@/ui/utils';
import * as ecc from '@bitcoinerlab/secp256k1';
import { EcKeyPair, Wallet } from '@btc-vision/transaction';
import { ethers } from 'ethers';

import { RouteTypes, useNavigate } from '../MainRoute';

const ECPair = ECPairFactory(ecc);

/*const _res = await wallet.createTmpKeyringWithPrivateKey(wif, AddressType.P2TR);
if (_res.accounts.length == 0) {
    throw new Error('Invalid PrivateKey');
}*/

/*const address = Wallet.fromWif(contextData.wif, bitcoinNetwork); //keyring.accounts[0].address;
if (!address.p2tr) {
    throw new Error('Invalid PrivateKey');
}*/

function Step1({
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const [wif, setWif] = useState('');
    const [disabled, setDisabled] = useState(true);
    const wallet = useWallet();
    useEffect(() => {
        setDisabled(true);

        if (!wif) {
            return;
        }

        setDisabled(false);
    }, [wif]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setWif(val);
        updateContextData({ step1Completed: !!val });
    };

    const tools = useTools();

    const btnClick = async () => {
        const network = await wallet.getNetworkType();
        const bitcoinNetwork = getBitcoinLibJSNetwork(network);

        const raw = wif.trim();

        let keyKind: KeyKind | null = null;

        // try WIF first
        try {
            ECPair.fromWIF(raw, bitcoinNetwork);
            keyKind = 'wif';
        } catch {}

        // then try raw 32-byte hex (ethereum-style)
        if (!keyKind && isLikelyHexPriv(raw)) {
            try {
                const buf = Buffer.from(raw.replace(/^0x/, ''), 'hex');
                ECPair.fromPrivateKey(buf, { network: bitcoinNetwork }); // just a secp check
                keyKind = 'rawHex';
            } catch {}
        }

        if (!keyKind) {
            tools.toastError(`Invalid WIF / 32-byte hex private key (check network too)`);
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
            <Text text="Private Key" textCenter preset="bold" />

            <Input
                placeholder="WIF or 32-byte hex (Ethereum) private key"
                onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if ('Enter' == e.key) {
                        void btnClick();
                    }
                }}
                onChange={onChange}
                autoFocus={true}
            />
            <FooterButtonContainer>
                <Button disabled={disabled} text="Continue" preset="primary" onClick={btnClick} />
            </FooterButtonContainer>
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

    const [previewAddresses, setPreviewAddresses] = useState<string[]>(hdPathOptions.map((v) => ''));
    const [addressAssets, setAddressAssets] = useState<Record<string, AddressAssets>>({});
    const [ethAddress, setEthAddress] = useState<string | null>(null);

    const run = async () => {
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
                return EcKeyPair.getLegacyAddress(ECPair.fromWIF(contextData.wif, bitcoinNetwork), bitcoinNetwork);
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
                addresses.push(''); // keep length aligned with hdPathOptions
            }
        }

        // fetch balances in one shot
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

    const navigate = useNavigate();

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
    return (
        <Column gap="lg">
            <Text text="Address Type" preset="bold" />

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
                return (
                    <AddressTypeCard
                        key={index}
                        label={item.label}
                        address={address}
                        assets={assets}
                        checked={index == pathIndex}
                        onClick={() => {
                            updateContextData({ addressType: item.addressType });
                        }}
                    />
                );
            })}

            {ethAddress && (
                <Row>
                    <Text preset="sub" text={`Linked Ethereum address: ${ethAddress}`} />
                </Row>
            )}

            <FooterButtonContainer>
                <Button text="Continue" preset="primary" onClick={onNext} />
            </FooterButtonContainer>
        </Column>
    );
}

enum TabType {
    STEP1 = 'STEP1',
    STEP2 = 'STEP2',
    STEP3 = 'STEP3'
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
            label: 'Step 1',
            children: <Step1 contextData={contextData} updateContextData={updateContextData} />
        },
        {
            key: TabType.STEP2,
            label: 'Step 2',
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
                title="Create Single Wallet"
            />
            <Content>
                <Row justifyCenter>
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
