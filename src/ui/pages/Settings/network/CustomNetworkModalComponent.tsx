import { useState } from 'react';
import { CHAIN_ICONS, ChainId } from '@/shared/constant';
import { NetworkType } from '@/shared/types';
import { Button, Card, Column, Icon, Image, Input, Row, Text } from '@/ui/components';
import { BottomModal } from '@/ui/components/BottomModal';
import { useTools } from '@/ui/components/ActionComponent';
import { colors } from '@/ui/theme/colors';
import { CloseOutlined } from '@ant-design/icons';
import { useWallet } from '@/ui/utils';

interface NetworkOption {
    value: NetworkType;
    label: string;
}

interface ChainOption {
    value: ChainId;
    label: string;
    icon: string;
}

const NETWORK_OPTIONS: NetworkOption[] = [
    { value: NetworkType.MAINNET, label: 'Mainnet' },
    { value: NetworkType.TESTNET, label: 'Testnet' },
    { value: NetworkType.REGTEST, label: 'Regtest' }
];

const CHAIN_OPTIONS: ChainOption[] = [
    { value: ChainId.Bitcoin, label: 'Bitcoin', icon: CHAIN_ICONS[ChainId.Bitcoin] },
    { value: ChainId.Fractal, label: 'Fractal', icon: CHAIN_ICONS[ChainId.Fractal] },
    { value: ChainId.Dogecoin, label: 'Dogecoin', icon: CHAIN_ICONS[ChainId.Dogecoin] },
    { value: ChainId.Litecoin, label: 'Litecoin', icon: CHAIN_ICONS[ChainId.Litecoin] },
    { value: ChainId.BitcoinCash, label: 'Bitcoin Cash', icon: CHAIN_ICONS[ChainId.BitcoinCash] },
    { value: ChainId.Dash, label: 'Dash', icon: CHAIN_ICONS[ChainId.Dash] }
];

export const AddCustomNetworkModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const wallet = useWallet();
    const tools = useTools();
    const [name, setName] = useState('');
    const [networkType, setNetworkType] = useState<NetworkType>(NetworkType.MAINNET);
    const [chainId, setChainId] = useState<ChainId>(ChainId.Bitcoin);
    const [unit, setUnit] = useState('BTC');
    const [rpcUrl, setRpcUrl] = useState('');
    const [explorerUrl, setExplorerUrl] = useState('https://mempool.space');
    const [faucetUrl, setFaucetUrl] = useState('');
    const [showPrice, setShowPrice] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
    const [showChainDropdown, setShowChainDropdown] = useState(false);

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

            // Use wallet controller instead of direct customNetworksManager
            await wallet.addCustomNetwork({
                name: name.trim(),
                networkType,
                chainId,
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
            <Column>
                <Row justifyBetween itemsCenter style={{ height: 20 }} fullX>
                    <Text text="Add Custom Network" textCenter size="md" />
                    <Row onClick={onClose}>
                        <CloseOutlined />
                    </Row>
                </Row>

                <Row fullX style={{ borderTopWidth: 1, borderColor: colors.border }} mt="md" />

                <Column gap="md" mt="lg" mb="lg" fullX>
                    <Column gap="sm">
                        <Text text="Network Name" size="sm" />
                        <Input
                            placeholder="Enter network name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </Column>

                    <Column gap="sm">
                        <Text text="Network Type" size="sm" />
                        <Card
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderRadius: 8,
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                            onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}>
                            <Row justifyBetween itemsCenter>
                                <Text text={NETWORK_OPTIONS.find((o) => o.value === networkType)?.label || ''} />
                                <Icon icon={showNetworkDropdown ? 'up' : 'down'} />
                            </Row>
                        </Card>
                        {showNetworkDropdown && (
                            <Card
                                style={{
                                    backgroundColor: 'rgba(0,0,0,0.9)',
                                    borderRadius: 8,
                                    position: 'absolute',
                                    zIndex: 1000,
                                    marginTop: 45,
                                    width: '100%',
                                    border: `1px solid ${colors.border}`
                                }}>
                                <Column gap="zero">
                                    {NETWORK_OPTIONS.map((option, index) => (
                                        <Card
                                            key={option.value}
                                            style={{
                                                backgroundColor: 'transparent',
                                                borderRadius: 0,
                                                borderBottom:
                                                    index < NETWORK_OPTIONS.length - 1
                                                        ? `1px solid ${colors.border}`
                                                        : 'none',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                setNetworkType(option.value);
                                                setShowNetworkDropdown(false);
                                            }}>
                                            <Text text={option.label} />
                                        </Card>
                                    ))}
                                </Column>
                            </Card>
                        )}
                    </Column>

                    <Column gap="sm">
                        <Text text="Chain Type" size="sm" />
                        <Card
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderRadius: 8,
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                            onClick={() => setShowChainDropdown(!showChainDropdown)}>
                            <Row justifyBetween itemsCenter>
                                <Row itemsCenter gap="sm">
                                    <Image src={CHAIN_OPTIONS.find((o) => o.value === chainId)?.icon || ''} size={20} />
                                    <Text text={CHAIN_OPTIONS.find((o) => o.value === chainId)?.label || ''} />
                                </Row>
                                <Icon icon={showChainDropdown ? 'up' : 'down'} />
                            </Row>
                        </Card>
                        {showChainDropdown && (
                            <Card
                                style={{
                                    backgroundColor: 'rgba(0,0,0,0.9)',
                                    borderRadius: 8,
                                    position: 'absolute',
                                    zIndex: 1000,
                                    marginTop: 45,
                                    width: '100%',
                                    border: `1px solid ${colors.border}`
                                }}>
                                <Column gap="zero">
                                    {CHAIN_OPTIONS.map((option, index) => (
                                        <Card
                                            key={option.value}
                                            style={{
                                                backgroundColor: 'transparent',
                                                borderRadius: 0,
                                                borderBottom:
                                                    index < CHAIN_OPTIONS.length - 1
                                                        ? `1px solid ${colors.border}`
                                                        : 'none',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                setChainId(option.value);
                                                setShowChainDropdown(false);
                                            }}>
                                            <Row itemsCenter gap="sm">
                                                <Image src={option.icon} size={20} />
                                                <Text text={option.label} />
                                            </Row>
                                        </Card>
                                    ))}
                                </Column>
                            </Card>
                        )}
                    </Column>

                    <Column gap="sm">
                        <Text text="Currency Unit" size="sm" />
                        <Input
                            placeholder="e.g., BTC, tBTC, FB"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                        />
                    </Column>

                    <Column gap="sm">
                        <Text text="RPC URL" size="sm" />
                        <Input
                            placeholder="https://your-rpc-endpoint.com"
                            value={rpcUrl}
                            onChange={(e) => setRpcUrl(e.target.value)}
                        />
                    </Column>

                    <Column gap="sm">
                        <Text text="Block Explorer URL" size="sm" />
                        <Input
                            placeholder="https://mempool.space"
                            value={explorerUrl}
                            onChange={(e) => setExplorerUrl(e.target.value)}
                        />
                    </Column>

                    <Column gap="sm">
                        <Text text="Faucet URL (Optional)" size="sm" />
                        <Input
                            placeholder="https://faucet.example.com"
                            value={faucetUrl}
                            onChange={(e) => setFaucetUrl(e.target.value)}
                        />
                    </Column>

                    <Row itemsCenter gap="sm">
                        <input
                            type="checkbox"
                            checked={showPrice}
                            onChange={(e) => setShowPrice(e.target.checked)}
                            style={{ width: 16, height: 16 }}
                        />
                        <Text text="Show price information" size="sm" />
                    </Row>

                    <Button
                        text={testing ? 'Testing Connection...' : 'Add Network'}
                        preset="primary"
                        onClick={handleSubmit}
                        disabled={testing}
                    />
                </Column>
            </Column>
        </BottomModal>
    );
};
