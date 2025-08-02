import { useEffect, useState } from 'react';

import { ChainType, TypeChain, TypeChainGroup } from '@/shared/constant';
import { Button, Card, Column, Icon, Image, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { BottomModal } from '@/ui/components/BottomModal';
import { useReloadAccounts } from '@/ui/state/accounts/hooks';
import { useChain, useChangeChainTypeCallback } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { customNetworksManager } from '@/shared/utils/CustomNetworksManager';
import { AddCustomNetworkModal } from './CustomNetworkModalComponent';
import { useWallet } from '@/ui/utils';

function ChainItem(props: { chainType: ChainType; inGroup?: boolean; onClose: () => void; onDelete?: () => void }) {
    // All hooks must be called at the top level, before any conditional returns
    const currentChain = useChain();
    const changeChainType = useChangeChainTypeCallback();
    const reloadAccounts = useReloadAccounts();
    const tools = useTools();

    const chain = customNetworksManager.getChain(props.chainType);

    // Early return after all hooks have been called
    if (!chain) return null;

    const selected = currentChain?.enum == chain.enum;
    const isCustom = chain.isCustom;

    return (
        <Card
            style={Object.assign(
                {},
                {
                    borderRadius: 10,
                    borderColor: colors.gold,
                    borderWidth: selected ? 1 : 0
                },
                props.inGroup
                    ? { backgroundColor: 'opacity', marginTop: 6 }
                    : {
                          backgroundColor: chain.disable ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
                          marginTop: 12
                      }
            )}
            onClick={async () => {
                if (chain.disable) {
                    return tools.toastError('This network is not available');
                }

                if (currentChain?.enum == chain.enum) {
                    return;
                }
                await changeChainType(chain.enum);
                props.onClose();
                void reloadAccounts();
                tools.toastSuccess(`Changed to ${chain.label}`);
            }}>
            <Row fullX justifyBetween itemsCenter>
                <Row itemsCenter>
                    <Image src={chain.icon} size={30} style={{ opacity: chain.disable ? 0.7 : 1 }} />
                    <Column gap="zero">
                        <Text text={chain.label} color={chain.disable ? 'textDim' : 'text'} />
                        {isCustom && <Text text="Custom" size="xs" color="textDim" />}
                    </Column>
                </Row>
                {isCustom && props.onDelete && (
                    <Row
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onDelete?.();
                        }}
                        style={{ cursor: 'pointer' }}>
                        <DeleteOutlined style={{ color: colors.danger }} />
                    </Row>
                )}
            </Row>
        </Card>
    );
}

function ChainGroup(props: { group: TypeChainGroup; onClose: () => void; onRefresh: () => void }) {
    const group = props.group;
    const currentChain = useChain();

    const [folded, setFolded] = useState(true);

    useEffect(() => {
        if (group.type === 'list') {
            let defaultFolded = true;
            if (group.items?.find((v) => v.enum == currentChain?.enum)) {
                defaultFolded = false;
            }
            setFolded(defaultFolded);
        }
    }, [currentChain, group.type, group.items]);

    if (group.type === 'single' && group.chain) {
        return <ChainItem chainType={group.chain.enum} onClose={props.onClose} />;
    } else {
        return (
            <Column>
                <Card
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        borderColor: colors.gold,
                        borderWidth: 0
                    }}
                    mt="lg"
                    onClick={() => {
                        setFolded(!folded);
                    }}>
                    <Column fullX gap="zero">
                        <Row fullX justifyBetween itemsCenter>
                            <Row itemsCenter>
                                <Image src={group.icon} size={30} />
                                <Text text={group.label} color={'text'} />
                            </Row>
                            {folded ? <Icon icon="down" /> : <Icon icon="up" />}
                        </Row>
                        {!folded ? (
                            <Row
                                style={{
                                    borderTopWidth: 1,
                                    borderColor: '#FFFFFF1F',
                                    alignSelf: 'stretch',
                                    width: '100%'
                                }}
                                my="md"
                            />
                        ) : null}

                        {!folded ? (
                            <Column gap="zero">
                                {group.items?.map((v) => (
                                    <ChainItem key={v.enum} inGroup chainType={v.enum} onClose={props.onClose} />
                                ))}
                            </Column>
                        ) : null}
                    </Column>
                </Card>
            </Column>
        );
    }
}

export const SwitchChainModal = ({ onClose }: { onClose: () => void }) => {
    const wallet = useWallet();
    const [showAddNetwork, setShowAddNetwork] = useState(false);
    const [customNetworks, setCustomNetworks] = useState<TypeChain<ChainType>[]>([]);
    const [chainGroups, setChainGroups] = useState<TypeChainGroup[]>([]);
    const tools = useTools();

    const loadData = async () => {
        try {
            // Ensure custom networks manager is initialized and reloaded
            await customNetworksManager.reload();

            // Load custom networks
            const networks = await customNetworksManager.getAllCustomNetworks();
            const chains = networks
                .map((network) => customNetworksManager.getChain(network.chainType))
                .filter(Boolean) as TypeChain<ChainType>[];
            setCustomNetworks(chains);

            // Load chain groups
            const groups = await customNetworksManager.getChainGroups();
            setChainGroups(groups);
        } catch (error) {
            console.error('Error loading chain data:', error);
            tools.toastError('Failed to load network data');
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const handleDeleteCustomNetwork = async (chainType: ChainType) => {
        const customNetwork = await customNetworksManager.getCustomNetworkByChainType(chainType);
        if (!customNetwork) return;

        const confirmed = window.confirm(`Are you sure you want to delete "${customNetwork.name}"?`);
        if (!confirmed) return;

        try {
            // Use wallet controller for deletion
            const deleted = await wallet.deleteCustomNetwork(customNetwork.id);
            if (deleted) {
                tools.toastSuccess('Custom network deleted');
                // Reload data after deletion
                await loadData();
            } else {
                tools.toastError('Failed to delete custom network');
            }
        } catch (error) {
            console.error('Error deleting network:', error);
            tools.toastError('Failed to delete custom network');
        }
    };

    const handleAddNetworkSuccess = async () => {
        setShowAddNetwork(false);
        // Reload data after adding a new network
        await loadData();
    };

    if (showAddNetwork) {
        return <AddCustomNetworkModal onClose={() => setShowAddNetwork(false)} onSuccess={handleAddNetworkSuccess} />;
    }

    return (
        <BottomModal onClose={onClose}>
            <Column style={{ height: '100%', maxHeight: '80vh' }}>
                {/* Fixed Header */}
                <Column justifyCenter itemsCenter style={{ flexShrink: 0 }}>
                    <Row justifyBetween itemsCenter style={{ height: 20 }} fullX>
                        <Text text="Select Network" textCenter size="md" />
                        <Row
                            onClick={() => {
                                onClose();
                            }}>
                            <CloseOutlined />
                        </Row>
                    </Row>
                    <Row fullX style={{ borderTopWidth: 1, borderColor: colors.border }} mt="md" />
                </Column>

                {/* Scrollable Content */}
                <Column
                    gap="zero"
                    mt="sm"
                    mb="lg"
                    fullX
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: 8,
                        paddingBottom: 20,
                        minHeight: 0
                    }}>
                    {chainGroups.map((v, index) => (
                        <ChainGroup key={`chain_group_${index}`} group={v} onClose={onClose} onRefresh={loadData} />
                    ))}

                    {customNetworks.length > 0 && (
                        <>
                            <Row fullX mt="lg" mb="md">
                                <Text text="Custom Networks" size="sm" color="textDim" />
                            </Row>
                            {customNetworks.map((chain) => (
                                <ChainItem
                                    key={chain.enum}
                                    chainType={chain.enum}
                                    onClose={onClose}
                                    onDelete={() => handleDeleteCustomNetwork(chain.enum)}
                                />
                            ))}
                        </>
                    )}

                    <Button
                        preset="primary"
                        icon={<PlusOutlined />}
                        text="Add Custom RPC"
                        onClick={() => setShowAddNetwork(true)}
                        style={{ marginTop: 20 }}
                    />
                </Column>
            </Column>
        </BottomModal>
    );
};
