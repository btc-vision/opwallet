import { useEffect, useState } from 'react';

import { ChainType, TypeChain, TypeChainGroup } from '@/shared/constant';
import { customNetworksManager } from '@/shared/utils/CustomNetworksManager';
import { Column, Image, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { BottomModal } from '@/ui/components/BottomModal';
import { useReloadAccounts } from '@/ui/state/accounts/hooks';
import { useChain, useChangeChainTypeCallback } from '@/ui/state/settings/hooks';
import { useWallet } from '@/ui/utils';
import {
    CheckCircleFilled,
    CloseOutlined,
    DeleteOutlined,
    DownOutlined,
    EyeInvisibleOutlined,
    PlusCircleOutlined,
    UpOutlined
} from '@ant-design/icons';
import { AddCustomNetworkModal } from './CustomNetworkModalComponent';

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
    warning: '#fbbf24',
    disabled: 'rgba(255, 255, 255, 0.3)'
};

function ChainItem(props: {
    chainType: ChainType;
    inGroup?: boolean;
    onClose: () => void;
    onDelete?: () => void;
    hideDisabled?: boolean;
}) {
    const currentChain = useChain();
    const changeChainType = useChangeChainTypeCallback();
    const reloadAccounts = useReloadAccounts();
    const tools = useTools();

    const chain = customNetworksManager.getChain(props.chainType);

    if (!chain) return null;
    if (props.hideDisabled && chain.disable) return null;

    const selected = currentChain?.enum == chain.enum;
    const isCustom = chain.isCustom;
    const isDisabled = chain.disable;

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                marginBottom: '1px',
                background: selected
                    ? colors.containerBg
                    : props.inGroup
                      ? colors.containerBgFaded
                      : colors.buttonHoverBg,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                transition: 'all 0.15s ease'
            }}
            onClick={async () => {
                if (isDisabled) {
                    return tools.toastError('This network is not available');
                }

                if (selected) return;

                await changeChainType(chain.enum);
                props.onClose();
                void reloadAccounts();
                tools.toastSuccess(`Switched to ${chain.label}`);
            }}
            onMouseEnter={(e) => {
                if (!isDisabled && !selected) {
                    e.currentTarget.style.background = colors.buttonBg;
                }
            }}
            onMouseLeave={(e) => {
                if (!isDisabled && !selected) {
                    e.currentTarget.style.background = props.inGroup ? colors.containerBgFaded : colors.buttonHoverBg;
                }
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: selected ? `${colors.main}20` : 'transparent',
                        position: 'relative'
                    }}>
                    <Image
                        src={chain.icon}
                        size={28}
                        style={{
                            opacity: isDisabled ? 0.5 : 1,
                            filter: isDisabled ? 'grayscale(1)' : 'none'
                        }}
                    />
                    {selected && (
                        <CheckCircleFilled
                            style={{
                                position: 'absolute',
                                bottom: -2,
                                right: -2,
                                fontSize: 14,
                                color: colors.main,
                                background: colors.background,
                                borderRadius: '50%'
                            }}
                        />
                    )}
                </div>

                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: selected ? 600 : 400,
                            color: selected ? colors.text : isDisabled ? colors.disabled : colors.text,
                            fontFamily: 'Inter-Regular, serif'
                        }}>
                        {chain.label}
                    </div>
                    {isCustom && (
                        <div
                            style={{
                                fontSize: '10px',
                                color: colors.main,
                                fontWeight: 600,
                                marginTop: '2px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                            Custom RPC
                        </div>
                    )}
                </div>
            </div>

            {isCustom && props.onDelete && (
                <button
                    style={{
                        padding: '6px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'all 0.15s'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        props.onDelete?.();
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${colors.error}20`;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}>
                    <DeleteOutlined style={{ fontSize: 16, color: colors.textFaded }} />
                </button>
            )}
        </div>
    );
}

function ChainGroup(props: {
    group: TypeChainGroup;
    onClose: () => void;
    onRefresh: () => void;
    hideDisabled?: boolean;
}) {
    const group = props.group;
    const currentChain = useChain();
    const [folded, setFolded] = useState(true);

    useEffect(() => {
        if (group.type === 'list') {
            const hasSelected = group.items?.find((v) => v.enum == currentChain?.enum);
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync fold state with selection
            setFolded(!hasSelected);
        }
    }, [currentChain, group.type, group.items]);

    if (group.type === 'single' && group.chain) {
        return (
            <div
                style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '8px',
                    border: `1px solid ${colors.containerBorder}`
                }}>
                <ChainItem chainType={group.chain.enum} onClose={props.onClose} hideDisabled={props.hideDisabled} />
            </div>
        );
    }

    const visibleItems = props.hideDisabled
        ? group.items?.filter((item) => {
              const chain = customNetworksManager.getChain(item.enum);
              return chain && !chain.disable;
          })
        : group.items;

    if (props.hideDisabled && (!visibleItems || visibleItems.length === 0)) {
        return null;
    }

    const hasSelectedItem = group.items?.some((item) => item.enum === currentChain?.enum);

    return (
        <div
            style={{
                marginBottom: '8px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: `1px solid ${hasSelectedItem && !folded ? colors.main : colors.containerBorder}`
            }}>
            <div
                style={{
                    padding: '12px 10px',
                    background: colors.buttonHoverBg,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
                onClick={() => setFolded(!folded)}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.buttonBg;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.buttonHoverBg;
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            background: hasSelectedItem && !folded ? `${colors.main}15` : 'transparent'
                        }}>
                        <Image src={group.icon} size={28} />
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: colors.text,
                                fontFamily: 'Inter-Regular, serif'
                            }}>
                            {group.label}
                        </div>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.textFaded,
                                marginTop: '2px'
                            }}>
                            {visibleItems?.length || 0} network{visibleItems?.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        background: colors.containerBgFaded
                    }}>
                    {folded ? (
                        <DownOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                    ) : (
                        <UpOutlined style={{ fontSize: 10, color: colors.main }} />
                    )}
                </div>
            </div>

            {!folded && visibleItems && visibleItems.length > 0 && (
                <>
                    <div
                        style={{
                            height: '1px',
                            background: colors.containerBorder
                        }}
                    />
                    {visibleItems.map((v, index) => (
                        <ChainItem
                            key={v.enum}
                            inGroup
                            chainType={v.enum}
                            onClose={props.onClose}
                            hideDisabled={props.hideDisabled}
                        />
                    ))}
                </>
            )}
        </div>
    );
}

export const SwitchChainModal = ({ onClose }: { onClose: () => void }) => {
    const wallet = useWallet();
    const [showAddNetwork, setShowAddNetwork] = useState(false);
    const [customNetworks, setCustomNetworks] = useState<TypeChain<ChainType>[]>([]);
    const [chainGroups, setChainGroups] = useState<TypeChainGroup[]>([]);
    const [hideDisabled, setHideDisabled] = useState(true);
    const tools = useTools();

    const loadData = async () => {
        try {
            await customNetworksManager.reload();

            const networks = await customNetworksManager.getAllCustomNetworks();
            const chains = networks
                .map((network) => customNetworksManager.getChain(network.chainType))
                .filter(Boolean) as TypeChain<ChainType>[];
            setCustomNetworks(chains);

            const groups = await customNetworksManager.getChainGroups();
            setChainGroups(groups);
        } catch (error) {
            console.error('Error loading chain data:', error);
            tools.toastError('Failed to load network data');
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Async data loading on mount
        void loadData();
    }, []);

    const handleDeleteCustomNetwork = async (chainType: ChainType) => {
        const customNetwork = await customNetworksManager.getCustomNetworkByChainType(chainType);
        if (!customNetwork) return;

        const confirmed = window.confirm(`Delete "${customNetwork.name}" network?`);
        if (!confirmed) return;

        try {
            const deleted = await wallet.deleteCustomNetwork(customNetwork.id);
            if (deleted) {
                tools.toastSuccess('Network deleted');
                await loadData();
            } else {
                tools.toastError('Failed to delete network');
            }
        } catch (error) {
            console.error('Error deleting network:', error);
            tools.toastError('Failed to delete network');
        }
    };

    const handleAddNetworkSuccess = async () => {
        setShowAddNetwork(false);
        await loadData();
    };

    if (showAddNetwork) {
        return <AddCustomNetworkModal onClose={() => setShowAddNetwork(false)} onSuccess={handleAddNetworkSuccess} />;
    }

    return (
        <BottomModal onClose={onClose}>
            <Column style={{ height: '100%', maxHeight: '520px' }}>
                {/* Clean Header */}
                <div
                    style={{
                        padding: '14px 16px',
                        background: colors.background,
                        borderBottom: `1px solid ${colors.containerBorder}`
                    }}>
                    <Row justifyBetween itemsCenter fullX>
                        <Text
                            text="Networks"
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

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '12px',
                        background: colors.background
                    }}>
                    {/* Hide Disabled Toggle */}
                    {chainGroups.some(
                        (g) =>
                            g.type === 'list' &&
                            g.items?.some((i) => {
                                const chain = customNetworksManager.getChain(i.enum);
                                return chain?.disable;
                            })
                    ) && (
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                marginBottom: '12px',
                                background: colors.containerBgFaded,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}>
                            <input
                                type="checkbox"
                                checked={hideDisabled}
                                onChange={(e) => setHideDisabled(e.target.checked)}
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
                                        fontSize: '12px',
                                        color: colors.text,
                                        fontWeight: 500
                                    }}>
                                    Hide unavailable networks
                                </div>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        color: colors.textFaded,
                                        marginTop: '2px'
                                    }}>
                                    Show only active networks
                                </div>
                            </div>
                            <EyeInvisibleOutlined
                                style={{
                                    fontSize: 14,
                                    color: hideDisabled ? colors.main : colors.textFaded
                                }}
                            />
                        </label>
                    )}

                    {/* Chain Groups */}
                    {chainGroups.map((v, index) => (
                        <ChainGroup
                            key={`chain_group_${index}`}
                            group={v}
                            onClose={onClose}
                            onRefresh={loadData}
                            hideDisabled={hideDisabled}
                        />
                    ))}

                    {/* Custom Networks Section */}
                    {customNetworks.length > 0 && (
                        <>
                            <div
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: colors.textFaded,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    margin: '16px 0 8px 4px'
                                }}>
                                Your Custom Networks
                            </div>
                            {customNetworks.map((chain) => (
                                <div
                                    key={chain.enum}
                                    style={{
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        marginBottom: '8px',
                                        border: `1px solid ${colors.containerBorder}`
                                    }}>
                                    <ChainItem
                                        chainType={chain.enum}
                                        onClose={onClose}
                                        onDelete={() => handleDeleteCustomNetwork(chain.enum)}
                                        hideDisabled={hideDisabled}
                                    />
                                </div>
                            ))}
                        </>
                    )}

                    {/* Add Custom RPC Button */}
                    <button
                        style={{
                            width: '100%',
                            marginTop: '16px',
                            marginBottom: '8px',
                            padding: '12px',
                            background: colors.buttonHoverBg,
                            border: `1px dashed ${colors.main}50`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                        onClick={() => setShowAddNetwork(true)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                            e.currentTarget.style.borderColor = colors.main;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                            e.currentTarget.style.borderColor = `${colors.main}50`;
                        }}>
                        <PlusCircleOutlined style={{ fontSize: 16, color: colors.main }} />
                        <span
                            style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: colors.main,
                                fontFamily: 'Inter-Regular, serif'
                            }}>
                            Add Custom RPC
                        </span>
                    </button>
                </div>
            </Column>
        </BottomModal>
    );
};
