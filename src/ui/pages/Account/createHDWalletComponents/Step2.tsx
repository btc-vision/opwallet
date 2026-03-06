import { useEffect, useMemo, useState } from 'react';

import { ADDRESS_TYPES, RESTORE_WALLETS, getLeatherHdPath } from '@/shared/constant';

/** BIP32 path validation regex from @btc-vision/bip32 */
const BIP32_PATH_REGEX = /^(m\/)?(\d+'?\/)*\d+'?$/;
import { RestoreWalletType } from '@/shared/types';
import { AddressTypes } from '@btc-vision/transaction';
import Web3API from '@/shared/web3/Web3API';
import { Column, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { ContextData, TabType, UpdateContextDataParams } from '@/ui/pages/Account/createHDWalletComponents/types';
import { satoshisToAmount, useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    CopyOutlined,
    InfoCircleOutlined,
    LoadingOutlined,
    SearchOutlined,
    SettingOutlined,
    WalletOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { usePrivacyModeEnabled } from '@/ui/hooks/useAppConfig';
import { useCreateAccountCallback } from '@/ui/state/global/hooks';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { copyToClipboard } from '@/ui/utils';

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

// Friendly labels for address types
const ADDRESS_TYPE_INFO: Partial<Record<AddressTypes, { tag: string; desc: string }>> = {
    [AddressTypes.P2TR]: { tag: 'Taproot', desc: 'bc1p... -- Recommended for OP_NET' },
    [AddressTypes.P2WPKH]: { tag: 'SegWit', desc: 'bc1q... -- Native SegWit' },
    [AddressTypes.P2SH_OR_P2SH_P2WPKH]: { tag: 'Nested', desc: '3... -- Nested SegWit' },
    [AddressTypes.P2PKH]: { tag: 'Legacy', desc: '1... -- Legacy format' }
};

export function Step2({
    contextData,
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const wallet = useWallet();
    const tools = useTools();
    const navigate = useNavigate();
    const createAccount = useCreateAccountCallback();
    const privacyModeEnabled = usePrivacyModeEnabled();
    const btcUnit = useBTCUnit();
    const isLeatherImport = contextData.restoreWalletType === RestoreWalletType.LEATHER;

    const [showAdvanced, setShowAdvanced] = useState(false);

    /** Resolve HD path for a given address type, respecting Leather account-level derivation. */
    const resolveHdPath = (addressType: AddressTypes, fallbackHdPath: string): string => {
        if (isLeatherImport) {
            return getLeatherHdPath(addressType, contextData.leatherAccountIndex ?? 0);
        }
        return contextData.customHdPath || fallbackHdPath;
    };

    const hdPathOptions = useMemo(() => {
        const restoreWallet = RESTORE_WALLETS[contextData.restoreWalletType];
        return ADDRESS_TYPES.filter((v) => {
            if (v.displayIndex < 0) return false;
            if (!restoreWallet.addressTypes.includes(v.value)) return false;
            if (!contextData.isRestore && v.isUnisatLegacy) return false;
            return !(contextData.customHdPath && v.isUnisatLegacy);
        })
            .sort((a, b) => a.displayIndex - b.displayIndex)
            .map((v) => ({
                label: v.name,
                hdPath: v.hdPath,
                addressType: v.value,
                isUnisatLegacy: v.isUnisatLegacy
            }));
    }, [contextData]);

    const allHdPathOptions = useMemo(() => {
        return ADDRESS_TYPES.map((v) => v)
            .sort((a, b) => a.displayIndex - b.displayIndex)
            .map((v) => ({
                label: v.name,
                hdPath: v.hdPath,
                addressType: v.value,
                isUnisatLegacy: v.isUnisatLegacy
            }));
    }, []);

    const [previewAddresses, setPreviewAddresses] = useState<string[]>(hdPathOptions.map(() => ''));
    const [scannedGroups, setScannedGroups] = useState<
        { type: AddressTypes; address_arr: string[]; satoshis_arr: number[] }[]
    >([]);
    const [addressAssets, setAddressAssets] = useState<
        Record<string, { total_btc: string; satoshis: number }>
    >({});
    const [error, setError] = useState('');
    const [pathError, setPathError] = useState('');
    const [loading, setLoading] = useState(false);
    const [creatingWallet, setCreatingWallet] = useState(false);
    const [pathText, setPathText] = useState(contextData.customHdPath);
    const [recommendedTypeIndex, setRecommendedTypeIndex] = useState(0);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (scannedGroups.length > 0) {
            const itemIndex = scannedGroups.findIndex((v) => v.address_arr.length > 0);
            const item = scannedGroups[itemIndex];
            const updates: UpdateContextDataParams = { addressType: item.type, addressTypeIndex: itemIndex };
            if (isLeatherImport) {
                updates.customHdPath = getLeatherHdPath(item.type, contextData.leatherAccountIndex ?? 0);
            }
            updateContextData(updates);
        } else {
            const option = hdPathOptions[recommendedTypeIndex];
            const updates: UpdateContextDataParams = { addressType: option.addressType, addressTypeIndex: recommendedTypeIndex };
            if (isLeatherImport) {
                updates.customHdPath = getLeatherHdPath(option.addressType, contextData.leatherAccountIndex ?? 0);
            }
            updateContextData(updates);
        }
    }, [recommendedTypeIndex, scannedGroups]);

    useEffect(() => {
        const generateAddress = async () => {
            const addresses: string[] = [];
            for (const options of hdPathOptions) {
                try {
                    const keyring = await wallet.createTmpKeyringWithMnemonics(
                        contextData.mnemonics,
                        resolveHdPath(options.addressType, options.hdPath),
                        contextData.passphrase,
                        options.addressType
                    );
                    keyring.accounts.forEach((v) => {
                        addresses.push(v.address);
                    });
                } catch (e) {
                    setError((e as Error).message);
                    return;
                }
            }
            setPreviewAddresses(addresses);
        };

        void generateAddress();
        setScanned(false);
    }, [contextData.passphrase, contextData.customHdPath]);

    useEffect(() => {
        const fetchAddressesBalance = async () => {
            try {
                await Web3API.setNetwork(await wallet.getChainType());
                if (!contextData.isRestore) return;

                const addresses = previewAddresses;
                if (!addresses[0]) return;

                setLoading(true);
                let maxSatoshis = 0;
                let recommended = 0;

                const assets: Record<string, { total_btc: string; satoshis: number }> = {};
                for (let i = 0; i < addresses.length; i++) {
                    try {
                        const address = addresses[i];
                        const addressBalance = await wallet.getMultiAddressAssets(address);
                        const totalSatoshis = addressBalance[0].totalSatoshis || 0;
                        assets[address] = {
                            total_btc: satoshisToAmount(totalSatoshis),
                            satoshis: totalSatoshis
                        };
                        if (totalSatoshis > maxSatoshis) {
                            maxSatoshis = totalSatoshis;
                            recommended = i;
                        }
                    } catch {
                        // ignore
                    }
                }

                setLoading(false);
                setAddressAssets(assets);
            } catch {
                // ignore
            }
        };

        const selectP2TRAddress = () => {
            setLoading(true);
            for (let i = 0; i < hdPathOptions.length; i++) {
                if (hdPathOptions[i].addressType === AddressTypes.P2TR) {
                    setRecommendedTypeIndex(i);
                    break;
                }
            }
            setLoading(false);
            setAddressAssets(addressAssets);
        };

        void fetchAddressesBalance();
        selectP2TRAddress();
    }, [previewAddresses]);

    const submitCustomHdPath = (text: string) => {
        setPathError('');
        setPathText(text);
        if (text !== '') {
            const isValid = BIP32_PATH_REGEX.test(text);
            if (!isValid) {
                setPathError('Invalid derivation path.');
                return;
            }
            updateContextData({ customHdPath: text });
        } else {
            updateContextData({ customHdPath: '' });
        }
    };

    const disabled = useMemo(() => !(!error && !pathError), [error, pathError]);

    const onNext = async () => {
        let hdPath: string;
        if (scannedGroups.length > 0) {
            const option = allHdPathOptions[contextData.addressTypeIndex];
            hdPath = resolveHdPath(option.addressType, option.hdPath);
            updateContextData({ hdPath });
        } else {
            const option = hdPathOptions[contextData.addressTypeIndex];
            hdPath = resolveHdPath(option.addressType, option.hdPath);
            updateContextData({ hdPath });
        }

        if (contextData.isRestore && contextData.restoreWalletType === RestoreWalletType.XVERSE) {
            updateContextData({ tabType: TabType.STEP5 });
            return;
        }

        if (!privacyModeEnabled) {
            setCreatingWallet(true);
            try {
                await createAccount(
                    contextData.mnemonics, hdPath, contextData.passphrase,
                    contextData.addressType, 1, false
                );
                navigate(RouteTypes.MainScreen);
            } catch (e) {
                tools.toastError((e as Error).message);
            } finally {
                setCreatingWallet(false);
            }
            return;
        }

        const nextStep = contextData.isRestore ? TabType.STEP4 : TabType.STEP3;
        updateContextData({ tabType: nextStep });
    };

    const scanVaultAddress = async () => {
        setScanned(true);
        tools.showLoading(true);
        try {
            const groups: {
                type: AddressTypes;
                address_arr: string[];
                satoshis_arr: number[];
                pubkey_arr: string[];
            }[] = [];

            for (const options of allHdPathOptions) {
                const address_arr: string[] = [];
                const satoshis_arr: number[] = [];
                try {
                    const keyring = await wallet.createTmpKeyringWithMnemonics(
                        contextData.mnemonics,
                        resolveHdPath(options.addressType, options.hdPath),
                        contextData.passphrase,
                        options.addressType,
                        10
                    );
                    keyring.accounts.forEach((v) => {
                        address_arr.push(v.address);
                    });
                } catch (e) {
                    setError((e as Error).message);
                    return;
                }
                groups.push({ type: options.addressType, address_arr, satoshis_arr, pubkey_arr: [] });
            }

            setScannedGroups(groups);
            if (groups.length === 0) {
                tools.showTip('Unable to find any addresses with assets');
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            tools.showLoading(false);
        }
    };

    const handleCopyAddress = (addr: string) => {
        void copyToClipboard(addr).then(() => tools.toastSuccess('Address copied'));
    };

    return (
        <Column gap="lg">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
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
                    <Text text="Choose Address Type" preset="bold" size="lg" />
                </div>
                <div style={{ fontSize: '13px', color: colors.textFaded, marginTop: '8px' }}>
                    Select the address format for your wallet
                </div>
            </div>

            {/* Scan button for restore */}
            {contextData.isRestore && !scanned && (
                <button
                    onClick={() => void scanVaultAddress()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px',
                        background: `${colors.main}10`,
                        border: `1px dashed ${colors.main}40`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        color: colors.main,
                        fontSize: '12px',
                        fontWeight: 600
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${colors.main}18`;
                        e.currentTarget.style.borderColor = colors.main;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${colors.main}10`;
                        e.currentTarget.style.borderColor = `${colors.main}40`;
                    }}>
                    <SearchOutlined style={{ fontSize: 14 }} />
                    Scan for addresses with funds
                </button>
            )}

            {/* Address Type Cards */}
            <div
                style={{
                    background: colors.containerBgFaded,
                    borderRadius: '14px',
                    border: `1px solid ${colors.containerBorder}`,
                    overflow: 'hidden'
                }}>
                {scannedGroups.length > 0
                    ? (() => {
                          const visible = scannedGroups
                              .map((item, index) => ({ item, index, options: allHdPathOptions[index] }))
                              .filter(({ item }) => item.satoshis_arr.some((v) => v > 0));
                          return visible.map(({ item, index, options }, vi) => {
                              const isSelected = index === contextData.addressTypeIndex;
                              const info = ADDRESS_TYPE_INFO[options.addressType];
                              return (
                                  <AddressTypeOption
                                      key={index}
                                      label={options.label}
                                      tag={info?.tag}
                                      description={info?.desc || ''}
                                      addresses={item.address_arr}
                                      satoshis={item.satoshis_arr}
                                      selected={isSelected}
                                      recommended={options.addressType === AddressTypes.P2TR}
                                      isLast={vi === visible.length - 1}
                                      btcUnit={btcUnit}
                                      onCopy={handleCopyAddress}
                                      onClick={() => {
                                          updateContextData({
                                              addressTypeIndex: index,
                                              addressType: options.addressType
                                          });
                                      }}
                                  />
                              );
                          });
                      })()
                    : (() => {
                          const visible = hdPathOptions
                              .map((item, index) => ({ item, index }))
                              .filter(({ item }) => {
                                  if (item.isUnisatLegacy) {
                                      const addr = previewAddresses[hdPathOptions.indexOf(item)];
                                      const assets = addressAssets[addr];
                                      return contextData.isRestore && assets && assets.satoshis > 0;
                                  }
                                  return true;
                              });
                          return visible.map(({ item, index }, vi) => {
                              const address = previewAddresses[index];
                              const assets = addressAssets[address] || { total_btc: '--', satoshis: 0 };
                              const isSelected = index === contextData.addressTypeIndex;
                              const info = ADDRESS_TYPE_INFO[item.addressType];
                              const hdPath = resolveHdPath(item.addressType, item.hdPath) + '/0';
                              return (
                                  <AddressTypeOption
                                      key={index}
                                      label={item.label}
                                      tag={info?.tag}
                                      description={info?.desc || ''}
                                      addresses={address ? [address] : []}
                                      satoshis={[assets.satoshis]}
                                      hdPath={hdPath}
                                      selected={isSelected}
                                      recommended={item.addressType === AddressTypes.P2TR}
                                      isLast={vi === visible.length - 1}
                                      btcUnit={btcUnit}
                                      loading={loading}
                                      onCopy={handleCopyAddress}
                                      onClick={() => {
                                          const updates: UpdateContextDataParams = {
                                              addressTypeIndex: index,
                                              addressType: item.addressType
                                          };
                                          if (isLeatherImport) {
                                              updates.customHdPath = getLeatherHdPath(
                                                  item.addressType,
                                                  contextData.leatherAccountIndex ?? 0
                                              );
                                          }
                                          updateContextData(updates);
                                      }}
                                  />
                              );
                          });
                      })()}
            </div>

            {/* Advanced toggle */}
            {!isLeatherImport && (
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: colors.textFaded,
                        fontSize: '12px',
                        fontWeight: 500,
                        transition: 'color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = colors.text;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = colors.textFaded;
                    }}>
                    <SettingOutlined style={{ fontSize: 13 }} />
                    {showAdvanced ? 'Hide advanced options' : 'Advanced options'}
                </button>
            )}

            {/* Advanced: Custom HD Path + Passphrase */}
            {showAdvanced && !isLeatherImport && (
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '16px',
                        border: `1px solid ${colors.containerBorder}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                    {/* Custom HD Path */}
                    <div>
                        <label
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '6px',
                                display: 'block'
                            }}>
                            Custom Derivation Path
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. m/86'/0'/0'"
                            value={pathText}
                            onChange={(e) => submitCustomHdPath(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: colors.inputBg,
                                border: `1px solid ${pathError ? colors.error + '60' : colors.containerBorder}`,
                                borderRadius: '8px',
                                color: colors.text,
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => {
                                if (!pathError) e.currentTarget.style.borderColor = colors.main;
                            }}
                            onBlur={(e) => {
                                if (!pathError) e.currentTarget.style.borderColor = colors.containerBorder;
                            }}
                        />
                        {pathError && (
                            <div style={{ fontSize: '11px', color: colors.error, marginTop: '4px' }}>
                                {pathError}
                            </div>
                        )}
                    </div>

                    {/* Passphrase */}
                    <div>
                        <label
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '6px',
                                display: 'block'
                            }}>
                            BIP39 Passphrase
                        </label>
                        <input
                            type="password"
                            placeholder="Optional extra passphrase"
                            defaultValue={contextData.passphrase}
                            onChange={(e) => updateContextData({ passphrase: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: colors.inputBg,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '8px',
                                color: colors.text,
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = colors.main;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = colors.containerBorder;
                            }}
                        />
                    </div>

                    {/* Info */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <InfoCircleOutlined style={{ fontSize: 12, color: colors.textFaded, marginTop: '1px' }} />
                        <span style={{ fontSize: '10px', color: colors.textFaded, lineHeight: '1.4' }}>
                            Only use these if you know what you are doing. A wrong derivation path or passphrase will
                            produce different addresses.
                        </span>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        background: `${colors.error}10`,
                        border: `1px solid ${colors.error}30`,
                        borderRadius: '10px'
                    }}>
                    <WarningOutlined style={{ fontSize: 14, color: colors.error }} />
                    <span style={{ fontSize: '12px', color: colors.error }}>{error}</span>
                </div>
            )}

            {/* Continue Button */}
            <button
                disabled={disabled || creatingWallet}
                onClick={() => void onNext()}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: disabled || creatingWallet ? colors.buttonBg : colors.main,
                    border: 'none',
                    borderRadius: '12px',
                    color: disabled || creatingWallet ? colors.textFaded : colors.background,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: disabled || creatingWallet ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: disabled || creatingWallet ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                    if (!disabled && !creatingWallet) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 116, 19, 0.3)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
                {creatingWallet ? 'Creating Wallet...' : 'Continue'}
            </button>

            {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                    <LoadingOutlined style={{ fontSize: 20, color: colors.main }} />
                </div>
            )}
        </Column>
    );
}

// ─── Address Type Option Card ───
function AddressTypeOption({
    label,
    tag,
    description,
    addresses,
    satoshis,
    hdPath,
    selected,
    recommended,
    isLast,
    btcUnit,
    loading,
    onCopy,
    onClick
}: {
    label: string;
    tag?: string;
    description: string;
    addresses: string[];
    satoshis: number[];
    hdPath?: string;
    selected: boolean;
    recommended: boolean;
    isLast: boolean;
    btcUnit: string;
    loading?: boolean;
    onCopy: (addr: string) => void;
    onClick: () => void;
}) {
    const truncAddr = (addr: string) => {
        if (!addr || addr.length < 16) return addr;
        return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
    };

    const totalSats = satoshis.reduce((a, b) => a + b, 0);
    const hasFunds = totalSats > 0;

    return (
        <div
            onClick={onClick}
            style={{
                padding: '14px 16px',
                background: selected ? `${colors.main}10` : 'transparent',
                borderBottom: isLast ? 'none' : `1px solid ${colors.containerBorder}`,
                cursor: 'pointer',
                transition: 'background 0.15s',
                borderLeft: selected ? `3px solid ${colors.main}` : '3px solid transparent'
            }}
            onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.background = `${colors.main}08`;
            }}
            onMouseLeave={(e) => {
                if (!selected) e.currentTarget.style.background = 'transparent';
            }}>
            {/* Top row: label + badges + check */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>{label}</span>
                {tag && (
                    <span
                        style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            background: selected ? `${colors.main}25` : colors.containerBorder,
                            color: selected ? colors.main : colors.textFaded,
                            borderRadius: '4px',
                            fontWeight: 600
                        }}>
                        {tag}
                    </span>
                )}
                {recommended && (
                    <span
                        style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            background: colors.success + '20',
                            color: colors.success,
                            borderRadius: '4px',
                            fontWeight: 700
                        }}>
                        RECOMMENDED
                    </span>
                )}
                {hasFunds && (
                    <span
                        style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            background: colors.warning + '20',
                            color: colors.warning,
                            borderRadius: '4px',
                            fontWeight: 600
                        }}>
                        {satoshisToAmount(totalSats)} {btcUnit}
                    </span>
                )}
                <div style={{ flex: 1 }} />
                {selected && <CheckCircleFilled style={{ fontSize: 16, color: colors.main }} />}
            </div>

            {/* Description */}
            <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '6px' }}>
                {description}
            </div>

            {/* Addresses */}
            {addresses.map((addr, i) => (
                addr ? (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '4px'
                        }}>
                        <span
                            style={{
                                fontSize: '11px',
                                color: colors.textFaded,
                                fontFamily: 'monospace',
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                            {truncAddr(addr)}
                        </span>
                        {hdPath && (
                            <span style={{ fontSize: '10px', color: 'rgba(219, 219, 219, 0.45)' }}>
                                {hdPath}
                            </span>
                        )}
                        <CopyOutlined
                            style={{ fontSize: 11, color: colors.textFaded, cursor: 'pointer', flexShrink: 0 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onCopy(addr);
                            }}
                        />
                    </div>
                ) : null
            ))}
        </div>
    );
}
