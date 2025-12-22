import { useCallback, useEffect, useMemo, useState } from 'react';

import { ADDRESS_TYPES } from '@/shared/constant';
import { AddressAssets } from '@/shared/types';
import { AddressTypes } from '@btc-vision/transaction';
import Web3API, { getBitcoinLibJSNetwork } from '@/shared/web3/Web3API';
import { Column, Content, Header, Layout, OPNetLoader, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { AddressTypeCard } from '@/ui/components/AddressTypeCard';
import { satoshisToAmount, useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    ImportOutlined,
    InfoCircleOutlined,
    KeyOutlined,
    PlusCircleOutlined,
    SafetyOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { EcKeyPair, MLDSASecurityLevel, Wallet } from '@btc-vision/transaction';
import { getMLDSAConfig, QuantumBIP32Factory } from '@btc-vision/bip32';
import { crypto as bitcoinCrypto, networks } from '@btc-vision/bitcoin';
import { ethers } from 'ethers';

import { RouteTypes, useNavigate } from '../routeTypes';

// Get the expected MLDSA key size for LEVEL2
const MLDSA_CONFIG = getMLDSAConfig(MLDSASecurityLevel.LEVEL2, networks.bitcoin);
const EXPECTED_QUANTUM_KEY_BYTES = MLDSA_CONFIG.privateKeySize;
const EXPECTED_QUANTUM_KEY_HEX_CHARS = EXPECTED_QUANTUM_KEY_BYTES * 2;

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
        let keypair: ReturnType<typeof EcKeyPair.fromWIF> | null = null;

        // try WIF first
        try {
            keypair = EcKeyPair.fromWIF(raw, bitcoinNetwork);
            keyKind = 'wif';
        } catch (e) {
            console.error(e);
        }

        // then try raw 32-byte hex (ethereum-style)
        if (!keyKind && isLikelyHexPriv(raw)) {
            try {
                const buf = Buffer.from(raw.replace(/^0x/, ''), 'hex');
                keypair = EcKeyPair.fromPrivateKey(buf, bitcoinNetwork);
                keyKind = 'rawHex';
            } catch (e) {
                console.error(e);
            }
        }

        if (!keyKind || !keypair) {
            tools.toastError(`Invalid private key format`);
            return;
        }

        // Check if this wallet is already imported by checking all address types
        const existingAccounts = await wallet.getAccounts();
        const pubkey = keypair.publicKey.toString('hex');

        // Check all address types for this public key
        for (const addrType of ADDRESS_TYPES) {
            if (addrType.displayIndex < 0) continue;

            let address = '';
            try {
                if (addrType.value === AddressTypes.P2TR) {
                    address = EcKeyPair.getTaprootAddress(keypair, bitcoinNetwork);
                } else if (addrType.value === AddressTypes.P2SH_OR_P2SH_P2WPKH) {
                    address = EcKeyPair.getLegacySegwitAddress(keypair, bitcoinNetwork);
                } else if (addrType.value === AddressTypes.P2WPKH) {
                    address = EcKeyPair.getP2WPKHAddress(keypair, bitcoinNetwork);
                } else {
                    address = EcKeyPair.getLegacyAddress(keypair, bitcoinNetwork);
                }
            } catch {
                continue;
            }

            const duplicate = existingAccounts.find((acc) => acc.address === address || acc.pubkey === pubkey);
            if (duplicate) {
                tools.toastError(`This wallet has already been imported`);
                return;
            }
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

        updateContextData({ addressType: recommended, step2Completed: true });
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

    const onNext = () => {
        updateContextData({ tabType: TabType.STEP3 });
    };

    if (loading) {
        return (
            <Column itemsCenter justifyCenter style={{ minHeight: 300 }}>
                <OPNetLoader size={60} text="Loading addresses" />
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

            {/* Continue Button */}
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
                Continue
            </button>
        </Column>
    );
}

function Step3({
    contextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const wallet = useWallet();
    const tools = useTools();
    const navigate = useNavigate();

    const [quantumKeyInput, setQuantumKeyInput] = useState('');
    const [quantumKeyError, setQuantumKeyError] = useState('');
    const [importing, setImporting] = useState(false);
    const [quantumMode, setQuantumMode] = useState<'generate' | 'import' | null>(null);

    // On-chain key verification state
    const [loading, setLoading] = useState(true);
    const [onChainLinkedKey, setOnChainLinkedKey] = useState<string | null>(null);
    const [previewAddress, setPreviewAddress] = useState<string>('');

    // Check on-chain for existing linked key
    useEffect(() => {
        const checkOnChainKey = async () => {
            setLoading(true);
            try {
                const network = await wallet.getNetworkType();
                const bitcoinNetwork = getBitcoinLibJSNetwork(network);

                // Get the address for the selected address type
                const kp =
                    contextData.keyKind === 'wif'
                        ? EcKeyPair.fromWIF(contextData.wif, bitcoinNetwork)
                        : EcKeyPair.fromPrivateKey(
                              Buffer.from(contextData.wif.replace(/^0x/, '').trim(), 'hex'),
                              bitcoinNetwork
                          );

                let address = '';
                if (contextData.addressType === AddressTypes.P2TR) {
                    address = EcKeyPair.getTaprootAddress(kp, bitcoinNetwork);
                } else if (contextData.addressType === AddressTypes.P2SH_OR_P2SH_P2WPKH) {
                    address = EcKeyPair.getLegacySegwitAddress(kp, bitcoinNetwork);
                } else if (contextData.addressType === AddressTypes.P2WPKH) {
                    address = EcKeyPair.getP2WPKHAddress(kp, bitcoinNetwork);
                } else {
                    address = EcKeyPair.getLegacyAddress(kp, bitcoinNetwork);
                }

                setPreviewAddress(address);

                const key = kp.publicKey.toString('hex');

                // Query on-chain for existing MLDSA key linkage
                const pubKeyInfo = await Web3API.provider.getPublicKeysInfoRaw(key);
                const info = pubKeyInfo[key];
                if (info && !('error' in info) && info.mldsaHashedPublicKey) {
                    setOnChainLinkedKey(info.mldsaHashedPublicKey);
                } else {
                    setOnChainLinkedKey(null);
                }
            } catch (e) {
                console.log('Error checking on-chain key:', e);
                setOnChainLinkedKey(null);
            } finally {
                setLoading(false);
            }
        };

        void checkOnChainKey();
         
    }, [contextData.wif, contextData.addressType]);

    const validateQuantumKey = (key: string): boolean => {
        if (!key) return true;
        const cleanKey = key.replace('0x', '').trim();

        // Check if it's valid hex
        if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
            setQuantumKeyError('Invalid hex format. Must contain only hexadecimal characters (0-9, a-f).');
            return false;
        }

        // Check length - MLDSA LEVEL2 private key is 2560 bytes = 5120 hex chars
        // But also allow for keys with chain code appended (2560 + 32 = 2592 bytes = 5184 hex chars)
        const minLength = EXPECTED_QUANTUM_KEY_HEX_CHARS;
        const maxLength = EXPECTED_QUANTUM_KEY_HEX_CHARS + 64; // +32 bytes for chain code

        if (cleanKey.length < minLength) {
            setQuantumKeyError(
                `Quantum key too short. Expected at least ${minLength} hex characters (${EXPECTED_QUANTUM_KEY_BYTES} bytes for ML-DSA-44), got ${cleanKey.length}.`
            );
            return false;
        }

        if (cleanKey.length > maxLength) {
            setQuantumKeyError(
                `Quantum key too long. Expected at most ${maxLength} hex characters, got ${cleanKey.length}.`
            );
            return false;
        }

        setQuantumKeyError('');
        return true;
    };

    // Compute SHA256 hash of MLDSA public key from private key
    const computePublicKeyHash = async (quantumPrivateKeyHex: string): Promise<string | null> => {
        try {
            const network = await wallet.getNetworkType();
            const bitcoinNetwork = getBitcoinLibJSNetwork(network);

            // Extract just the private key part (without chain code)
            const privateKeyOnly = quantumPrivateKeyHex.slice(0, EXPECTED_QUANTUM_KEY_HEX_CHARS);
            const privateKeyBuffer = Buffer.from(privateKeyOnly, 'hex');

            // Import the key and get public key
            const qkp = QuantumBIP32Factory.fromPrivateKey(
                privateKeyBuffer,
                Buffer.alloc(32),
                bitcoinNetwork,
                MLDSASecurityLevel.LEVEL2
            );
            const publicKey = Buffer.from(qkp.publicKey);

            // Compute SHA256 hash
            const hash = bitcoinCrypto.sha256(publicKey);
            return hash.toString('hex');
        } catch (e) {
            console.error('Error computing public key hash:', e);
            return null;
        }
    };

    const onImportWallet = async (generateNewQuantumKey: boolean) => {
        setImporting(true);
        setQuantumKeyError('');

        const network = await wallet.getNetworkType();
        const bitcoinNetwork = getBitcoinLibJSNetwork(network);

        try {
            const pk =
                contextData.keyKind === 'rawHex' ? contextData.wif.replace(/^0x/, '').toLowerCase() : contextData.wif;

            let quantumKey: string | undefined;

            if (generateNewQuantumKey) {
                // Check if there's an on-chain linked key - cannot generate new if one exists
                if (onChainLinkedKey) {
                    setQuantumKeyError(
                        'Cannot generate a new key. This wallet already has an MLDSA key linked on-chain. You must import the original key.'
                    );
                    setImporting(false);
                    return;
                }

                quantumKey = Wallet.generate(bitcoinNetwork, MLDSASecurityLevel.LEVEL2).quantumPrivateKeyHex;
            } else if (quantumKeyInput) {
                // Validate format
                if (!validateQuantumKey(quantumKeyInput)) {
                    setImporting(false);
                    return;
                }

                const cleanKey = quantumKeyInput.replace('0x', '').trim();

                // If there's an on-chain linked key, verify the imported key matches
                if (onChainLinkedKey) {
                    const importedKeyHash = await computePublicKeyHash(cleanKey);
                    const onChainClean = onChainLinkedKey.replace('0x', '').toLowerCase();

                    if (!importedKeyHash || importedKeyHash.toLowerCase() !== onChainClean) {
                        setQuantumKeyError(
                            `Key mismatch! The imported key does not match the on-chain linked key.\n\nExpected hash: 0x${onChainClean.slice(0, 16)}...\nImported key hash: ${importedKeyHash ? `0x${importedKeyHash.slice(0, 16)}...` : 'invalid'}\n\nPlease import the correct key that was previously linked to this wallet.`
                        );
                        setImporting(false);
                        return;
                    }
                }

                quantumKey = cleanKey;
            }

            if (!quantumKey) {
                throw new Error('Quantum key is required for import.');
            }

            // Create the wallet
            await wallet.createKeyringWithPrivateKey(pk, contextData.addressType, quantumKey, undefined);

            // If user chose to generate new key and no key was provided
            if (generateNewQuantumKey && !quantumKey) {
                await wallet.generateQuantumKey();
            }

            navigate(RouteTypes.MainScreen);
        } catch (e) {
            tools.toastError((e as Error).message);
        } finally {
            setImporting(false);
        }
    };

    if (loading) {
        return (
            <Column itemsCenter justifyCenter style={{ minHeight: 300 }}>
                <OPNetLoader size={60} text="Checking key status" />
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
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                    <SafetyOutlined style={{ fontSize: 28, color: '#8B5CF6' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Text text="Quantum Key Setup" preset="bold" size="lg" />
                </div>
                <div
                    style={{
                        fontSize: '13px',
                        color: colors.textFaded,
                        marginTop: '8px'
                    }}>
                    Set up your post-quantum MLDSA key for OPNet
                </div>
            </div>

            {/* On-chain linked key warning */}
            {onChainLinkedKey && (
                <div
                    style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '10px',
                        padding: '12px'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <KeyOutlined style={{ fontSize: 16, color: '#8B5CF6', marginTop: '2px' }} />
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                                On-Chain Linked Key Detected
                            </div>
                            <div style={{ fontSize: '11px', color: colors.textFaded, marginTop: '4px' }}>
                                This wallet ({previewAddress.slice(0, 8)}...{previewAddress.slice(-6)}) already has an
                                MLDSA key linked on the blockchain. You must import the original key that matches this
                                hash:
                            </div>
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '8px',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '6px',
                                    fontFamily: 'monospace',
                                    fontSize: '10px',
                                    wordBreak: 'break-all',
                                    color: colors.text
                                }}>
                                {onChainLinkedKey}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Card - only show if no on-chain key */}
            {!onChainLinkedKey && (
                <div
                    style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '10px',
                        padding: '12px'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <InfoCircleOutlined style={{ fontSize: 16, color: '#8B5CF6', marginTop: '2px' }} />
                        <div style={{ fontSize: '12px', color: colors.text, lineHeight: '1.5' }}>
                            OPNet requires a quantum-resistant MLDSA key for transactions. You can either import an
                            existing key or generate a new one.
                        </div>
                    </div>
                </div>
            )}

            {/* Option Cards - show when no mode selected */}
            {quantumMode === null && (
                <>
                    {/* Import Existing Key Option - always available */}
                    <div
                        style={{
                            background: colors.containerBgFaded,
                            border: `2px solid ${onChainLinkedKey ? colors.main : colors.containerBorder}`,
                            borderRadius: '12px',
                            padding: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => setQuantumMode('import')}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = colors.main;
                            e.currentTarget.style.background = `${colors.main}08`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = onChainLinkedKey ? colors.main : colors.containerBorder;
                            e.currentTarget.style.background = colors.containerBgFaded;
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: `${colors.main}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                <ImportOutlined style={{ fontSize: 20, color: colors.main }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                    Import Existing Key{onChainLinkedKey ? ' (Required)' : ''}
                                </div>
                                <div style={{ fontSize: '11px', color: colors.textFaded, marginTop: '4px' }}>
                                    {onChainLinkedKey
                                        ? 'Import the quantum key that matches the on-chain linked hash.'
                                        : 'Use a quantum key you exported from another wallet.'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Generate New Key Option - only if no on-chain key */}
                    {!onChainLinkedKey && (
                        <div
                            style={{
                                background: colors.containerBgFaded,
                                border: `2px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                padding: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => setQuantumMode('generate')}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#8B5CF6';
                                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = colors.containerBorder;
                                e.currentTarget.style.background = colors.containerBgFaded;
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'rgba(139, 92, 246, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                    <PlusCircleOutlined style={{ fontSize: 20, color: '#8B5CF6' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                        Generate New Key
                                    </div>
                                    <div style={{ fontSize: '11px', color: colors.textFaded, marginTop: '4px' }}>
                                        Create a new quantum-resistant key. Recommended for new wallets.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info about why generate is disabled */}
                    {onChainLinkedKey && (
                        <div
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '10px',
                                padding: '12px'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <InfoCircleOutlined
                                    style={{ fontSize: 14, color: colors.textFaded, marginTop: '2px' }}
                                />
                                <div style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.4' }}>
                                    Generating a new key is disabled because this wallet already has a key linked
                                    on-chain. You must import the original key to access your funds.
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Generate New Key Confirmation */}
            {quantumMode === 'generate' && (
                <>
                    <div
                        style={{
                            background: 'rgba(74, 222, 128, 0.1)',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            borderRadius: '10px',
                            padding: '12px'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <CheckCircleFilled style={{ fontSize: 16, color: colors.success, marginTop: '2px' }} />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
                                    A new ML-DSA-44 key will be generated
                                </div>
                                <div style={{ fontSize: '11px', color: colors.textFaded, marginTop: '4px' }}>
                                    Make sure to backup your quantum key after the wallet is created. You can export it
                                    from the wallet settings.
                                </div>
                            </div>
                        </div>
                    </div>

                    {quantumKeyError && (
                        <div style={{ fontSize: '11px', color: colors.error, padding: '8px', whiteSpace: 'pre-wrap' }}>
                            {quantumKeyError}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: colors.buttonBg,
                                border: 'none',
                                borderRadius: '12px',
                                color: colors.text,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                setQuantumMode(null);
                                setQuantumKeyError('');
                            }}>
                            Back
                        </button>
                        <button
                            style={{
                                flex: 2,
                                padding: '14px',
                                background: '#8B5CF6',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: importing ? 'not-allowed' : 'pointer',
                                opacity: importing ? 0.7 : 1
                            }}
                            disabled={importing}
                            onClick={() => onImportWallet(true)}>
                            {importing ? 'Creating Wallet...' : 'Generate & Import'}
                        </button>
                    </div>
                </>
            )}

            {/* Import Existing Key Form */}
            {quantumMode === 'import' && (
                <>
                    <div>
                        <label
                            style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                                display: 'block'
                            }}>
                            ML-DSA Private Key
                        </label>
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '12px',
                                background: colors.inputBg,
                                border: quantumKeyError
                                    ? `1px solid ${colors.error}`
                                    : `1px solid ${colors.containerBorder}`,
                                borderRadius: '10px',
                                color: colors.text,
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                resize: 'vertical',
                                outline: 'none'
                            }}
                            placeholder={`Paste your ML-DSA-44 private key (${EXPECTED_QUANTUM_KEY_HEX_CHARS} hex characters)`}
                            value={quantumKeyInput}
                            onChange={(e) => {
                                setQuantumKeyInput(e.target.value);
                                setQuantumKeyError('');
                            }}
                        />
                        {quantumKeyError && (
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.error,
                                    marginTop: '6px',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                {quantumKeyError}
                            </div>
                        )}
                        <div style={{ fontSize: '10px', color: colors.textFaded, marginTop: '6px' }}>
                            Expected key size: {EXPECTED_QUANTUM_KEY_BYTES.toLocaleString()} bytes (
                            {EXPECTED_QUANTUM_KEY_HEX_CHARS.toLocaleString()} hex characters) for ML-DSA-44 (Level 2)
                        </div>
                    </div>

                    {/* Don't have a key? Generate one button - only if no on-chain key */}
                    {!onChainLinkedKey && (
                        <div
                            style={{
                                background: 'rgba(139, 92, 246, 0.05)',
                                border: '1px dashed rgba(139, 92, 246, 0.3)',
                                borderRadius: '10px',
                                padding: '12px',
                                textAlign: 'center'
                            }}>
                            <div style={{ fontSize: '12px', color: colors.textFaded, marginBottom: '8px' }}>
                                Don&#39;t have a quantum key to link with this wallet?
                            </div>
                            <button
                                style={{
                                    padding: '8px 16px',
                                    background: 'rgba(139, 92, 246, 0.2)',
                                    border: '1px solid rgba(139, 92, 246, 0.4)',
                                    borderRadius: '8px',
                                    color: '#8B5CF6',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                                onClick={() => {
                                    setQuantumMode('generate');
                                    setQuantumKeyInput('');
                                    setQuantumKeyError('');
                                }}>
                                Generate a Random Key Instead
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: colors.buttonBg,
                                border: 'none',
                                borderRadius: '12px',
                                color: colors.text,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                setQuantumMode(null);
                                setQuantumKeyError('');
                            }}>
                            Back
                        </button>
                        <button
                            style={{
                                flex: 2,
                                padding: '14px',
                                background: colors.main,
                                border: 'none',
                                borderRadius: '12px',
                                color: colors.background,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: importing || !quantumKeyInput.trim() ? 'not-allowed' : 'pointer',
                                opacity: importing || !quantumKeyInput.trim() ? 0.7 : 1
                            }}
                            disabled={importing || !quantumKeyInput.trim()}
                            onClick={() => onImportWallet(false)}>
                            {importing ? 'Verifying & Importing...' : 'Import Wallet'}
                        </button>
                    </div>
                </>
            )}
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
    addressType: AddressTypes;
    step1Completed: boolean;
    step2Completed: boolean;
    tabType: TabType;
}

interface UpdateContextDataParams {
    wif?: string;
    keyKind?: KeyKind;
    addressType?: AddressTypes;
    step1Completed?: boolean;
    step2Completed?: boolean;
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
        addressType: AddressTypes.P2WPKH,
        step1Completed: false,
        step2Completed: false,
        tabType: TabType.STEP1
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
            },
            {
                key: TabType.STEP3,
                label: 'Quantum Key',
                children: <Step3 contextData={contextData} updateContextData={updateContextData} />
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
                            // Allow navigation to completed steps, or next step if current step is completed
                            const canGoToStep2 = contextData.step1Completed;
                            const canGoToStep3 = contextData.step1Completed && contextData.step2Completed;
                            const isClickable =
                                isCompleted || (index === 1 && canGoToStep2) || (index === 2 && canGoToStep3);

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
                                            if (toTabType === TabType.STEP3 && !contextData.step2Completed) {
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
