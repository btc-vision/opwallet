import { useEffect, useMemo, useState } from 'react';

import { ADDRESS_TYPES, KEYRING_TYPE } from '@/shared/constant';
import { AddressAssets } from '@/shared/types';
import { Column, Content, Header, Layout, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useCurrentAccount, useReloadAccounts } from '@/ui/state/accounts/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import { copyToClipboard, satoshisToAmount, useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    CheckOutlined,
    CopyOutlined,
    InfoCircleOutlined,
    LoadingOutlined,
    WalletOutlined
} from '@ant-design/icons';

import { useBTCUnit } from '@/ui/state/settings/hooks';
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
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

interface AddressTypeItemProps {
    label: string;
    address: string;
    assets: AddressAssets;
    checked: boolean;
    description?: string;
    btcUnit: string;
    onClick: () => void;
}

function AddressTypeItem({ label, address, assets, checked, description, btcUnit, onClick }: AddressTypeItemProps) {
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const tools = useTools();

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await copyToClipboard(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        tools.toastSuccess('Address copied!');
    };

    const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Loading...';

    return (
        <div
            style={{
                width: '100%',
                position: 'relative',
                background: checked
                    ? `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`
                    : isHovered
                      ? colors.buttonBg
                      : colors.buttonHoverBg,
                border: `1px solid ${checked ? colors.main : colors.containerBorder}`,
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
            }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}>
            {/* Selected indicator bar */}
            {checked && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: colors.main,
                        borderRadius: '12px 0 0 12px'
                    }}
                />
            )}

            {/* Main Content */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%'
                }}>
                {/* Icon */}
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        borderRadius: '8px',
                        background: checked ? `${colors.main}20` : colors.containerBgFaded,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                    <WalletOutlined
                        style={{
                            fontSize: 18,
                            color: checked ? colors.main : colors.textFaded
                        }}
                    />
                    {checked && (
                        <CheckCircleFilled
                            style={{
                                position: 'absolute',
                                bottom: -2,
                                right: -2,
                                fontSize: 12,
                                color: colors.main,
                                background: colors.background,
                                borderRadius: '50%'
                            }}
                        />
                    )}
                </div>

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                    {/* Title and Badge Row */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                        }}>
                        <div
                            style={{
                                fontSize: '13px',
                                fontWeight: checked ? 600 : 500,
                                color: colors.text,
                                fontFamily: 'Inter-Regular, serif',
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                            {label}
                        </div>
                        {checked && (
                            <div
                                style={{
                                    padding: '2px 6px',
                                    background: colors.main,
                                    borderRadius: '4px',
                                    fontSize: '9px',
                                    color: colors.background,
                                    fontWeight: 600,
                                    flexShrink: 0
                                }}>
                                ACTIVE
                            </div>
                        )}
                    </div>

                    {/* Address Row */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                        <button
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 6px',
                                background: colors.containerBgFaded,
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onClick={handleCopy}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = colors.buttonBg;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = colors.containerBgFaded;
                            }}>
                            <span
                                style={{
                                    fontSize: '10px',
                                    color: colors.textFaded,
                                    fontFamily: 'monospace'
                                }}>
                                {shortAddress}
                            </span>
                            {copied ? (
                                <CheckOutlined style={{ fontSize: 9, color: colors.success }} />
                            ) : (
                                <CopyOutlined style={{ fontSize: 9, color: colors.textFaded }} />
                            )}
                        </button>

                        {/* Balance */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flex: 1,
                                minWidth: 0
                            }}>
                            <span
                                style={{
                                    fontSize: '11px',
                                    color: assets.satoshis > 0 ? colors.success : colors.textFaded,
                                    fontWeight: assets.satoshis > 0 ? 500 : 400,
                                    whiteSpace: 'nowrap'
                                }}>
                                {assets.total_btc} {btcUnit}
                            </span>
                            {assets.satoshis > 0 && (
                                <div
                                    style={{
                                        padding: '1px 4px',
                                        background: `${colors.success}20`,
                                        borderRadius: '3px',
                                        fontSize: '8px',
                                        color: colors.success,
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}>
                                    FUNDED
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {description && (
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.textFaded,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                lineHeight: '1.3'
                            }}>
                            <InfoCircleOutlined style={{ fontSize: 9, flexShrink: 0 }} />
                            <span
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                {description}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AddressTypeScreen() {
    const wallet = useWallet();
    const account = useCurrentAccount();
    const navigate = useNavigate();
    const reloadAccounts = useReloadAccounts();
    const currentKeyring = useCurrentKeyring();
    const tools = useTools();
    const btcUnit = useBTCUnit();

    const [addresses, setAddresses] = useState<string[]>([]);
    const [addressAssets, setAddressAssets] = useState<Record<string, AddressAssets>>({});
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);

    const loadAddresses = async () => {
        setLoading(true);
        try {
            const _res = await wallet.getAllAddresses(currentKeyring, account.index ?? 0);
            setAddresses(_res);

            const balances = await wallet.getMultiAddressAssets(_res.join(','));
            const addressAssets: Record<string, AddressAssets> = {};

            for (let i = 0; i < _res.length; i++) {
                const address = _res[i];
                const balance = balances[i];
                const satoshis = balance.totalSatoshis;
                addressAssets[address] = {
                    total_btc: satoshisToAmount(balance.totalSatoshis),
                    satoshis
                };
            }

            setAddressAssets(addressAssets);
        } catch (error) {
            console.error('Failed to load addresses:', error);
            tools.toastError('Failed to load address information');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAddresses();
    }, []);

    const addressTypes = useMemo(() => {
        if (currentKeyring.type === KEYRING_TYPE.HdKeyring) {
            return ADDRESS_TYPES.filter((v) => {
                if (v.displayIndex < 0) {
                    return false;
                }
                const address = addresses[v.value];
                const balance = addressAssets[address];
                if (v.isUnisatLegacy) {
                    if (!balance || balance.satoshis == 0) {
                        return false;
                    }
                }
                return true;
            }).sort((a, b) => a.displayIndex - b.displayIndex);
        } else {
            return ADDRESS_TYPES.filter((v) => v.displayIndex >= 0 && v.isUnisatLegacy != true).sort(
                (a, b) => a.displayIndex - b.displayIndex
            );
        }
    }, [currentKeyring.type, addressAssets, addresses]);

    const handleAddressTypeChange = async (item: (typeof ADDRESS_TYPES)[0]) => {
        if (item.value === currentKeyring.addressType) {
            return;
        }

        setSwitching(true);
        try {
            await wallet.changeAddressType(item.value);
            await reloadAccounts();
            tools.toastSuccess('Address type changed successfully');
            navigate(RouteTypes.MainScreen);
        } catch (error) {
            console.error('Failed to change address type:', error);
            tools.toastError('Failed to change address type');
        } finally {
            setSwitching(false);
        }
    };

    const getDescription = (item: (typeof ADDRESS_TYPES)[0]) => {
        if (item.name === 'P2TR') {
            return 'Taproot - Lower fees, enhanced privacy';
        } else if (item.name === 'P2WPKH') {
            return 'Native SegWit - Modern standard';
        } else if (item.name === 'P2SH-P2WPKH') {
            return 'Nested SegWit - Wide support';
        } else if (item.name === 'P2PKH') {
            return 'Legacy - Original format';
        }
        return '';
    };

    if (loading) {
        return (
            <Layout>
                <Header onBack={() => window.history.go(-1)} title="Address Type" />
                <Content
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '300px'
                    }}>
                    <Column itemsCenter>
                        <LoadingOutlined style={{ fontSize: 24, color: colors.main }} />
                        <Text text="Loading addresses..." color="textDim" style={{ marginTop: 12 }} />
                    </Column>
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header onBack={() => window.history.go(-1)} title="Address Type" />
            <Content
                style={{
                    padding: '12px',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflowX: 'hidden'
                }}>
                {/* Info Card */}
                <div
                    style={{
                        width: '100%',
                        background: `linear-gradient(135deg, ${colors.main}10 0%, ${colors.main}05 100%)`,
                        border: `1px solid ${colors.main}30`,
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        boxSizing: 'border-box'
                    }}>
                    <InfoCircleOutlined
                        style={{
                            fontSize: 13,
                            color: colors.main,
                            marginTop: '1px',
                            flexShrink: 0
                        }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.text,
                                fontWeight: 500,
                                marginBottom: '3px'
                            }}>
                            Choose Your Address Format
                        </div>
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.textFaded,
                                lineHeight: '1.3'
                            }}>
                            Taproot (P2TR) is recommended for lower transaction fees.
                        </div>
                    </div>
                </div>

                {/* Address Type List */}
                <div style={{ width: '100%' }}>
                    {addressTypes.map((item, index) => {
                        const address = addresses[item.value];
                        const assets = addressAssets[address] || {
                            total_btc: '0',
                            satoshis: 0,
                            total_inscription: 0
                        };

                        let name = item.name;
                        if (currentKeyring.type === KEYRING_TYPE.HdKeyring) {
                            name = `${item.name} (${item.hdPath}/${account.index})`;
                        }

                        return (
                            <AddressTypeItem
                                key={index}
                                label={name}
                                address={address}
                                assets={assets}
                                checked={item.value === currentKeyring.addressType}
                                description={getDescription(item)}
                                btcUnit={btcUnit}
                                onClick={() => handleAddressTypeChange(item)}
                            />
                        );
                    })}
                </div>

                {/* Loading Overlay */}
                {switching && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}>
                        <Column itemsCenter>
                            <LoadingOutlined style={{ fontSize: 24, color: colors.main }} />
                            <Text text="Switching address type..." color="text" style={{ marginTop: 12 }} />
                        </Column>
                    </div>
                )}
            </Content>
        </Layout>
    );
}
