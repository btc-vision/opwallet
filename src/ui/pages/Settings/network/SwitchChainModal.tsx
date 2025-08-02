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
    const [showAddNetwork, setShowAddNetwork] = useState(false);
    const [customNetworks, setCustomNetworks] = useState<TypeChain<ChainType>[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const tools = useTools();

    const loadCustomNetworks = () => {
        const networks = customNetworksManager.getAllCustomNetworks();
        const chains = networks
            .map((network) => customNetworksManager.getChain(network.chainType))
            .filter(Boolean) as TypeChain<ChainType>[];
        setCustomNetworks(chains);
    };

    useEffect(() => {
        loadCustomNetworks();
    }, [refreshKey]);

    const handleDeleteCustomNetwork = (chainType: ChainType) => {
        const customNetwork = customNetworksManager.getCustomNetworkByChainType(chainType);
        if (!customNetwork) return;

        const confirmed = window.confirm(`Are you sure you want to delete "${customNetwork.name}"?`);
        if (!confirmed) return;

        const deleted = customNetworksManager.deleteCustomNetwork(customNetwork.id);
        if (deleted) {
            tools.toastSuccess('Custom network deleted');
            setRefreshKey((prev) => prev + 1);
        } else {
            tools.toastError('Failed to delete custom network');
        }
    };

    const getChainGroups = (): TypeChainGroup[] => {
        return customNetworksManager.getChainGroups();
    };

    if (showAddNetwork) {
        return (
            <AddCustomNetworkModal
                onClose={() => setShowAddNetwork(false)}
                onSuccess={() => {
                    setShowAddNetwork(false);
                    setRefreshKey((prev) => prev + 1);
                }}
            />
        );
    }

    return (
        <BottomModal onClose={onClose}>
            <Column justifyCenter itemsCenter>
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

                <Column gap="zero" mt="sm" mb="lg" fullX>
                    {getChainGroups().map((v, index) => (
                        <ChainGroup
                            key={`chain_group_${index}`}
                            group={v}
                            onClose={onClose}
                            onRefresh={() => setRefreshKey((prev) => prev + 1)}
                        />
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
