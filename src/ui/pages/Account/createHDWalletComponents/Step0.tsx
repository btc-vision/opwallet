import { RESTORE_WALLETS } from '@/shared/constant';
import { RestoreWalletType } from '@/shared/types';
import { Column, Text } from '@/ui/components';
import { ContextData, TabType, UpdateContextDataParams } from '@/ui/pages/Account/createHDWalletComponents/types';
import {
    WalletOutlined,
    ImportOutlined,
    SafetyOutlined,
    SwapOutlined,
    AppstoreOutlined,
    RightOutlined
} from '@ant-design/icons';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80'
};

const walletIcons: Record<number, React.ReactNode> = {
    [RestoreWalletType.OP_WALLET]: <WalletOutlined style={{ fontSize: 20, color: colors.main }} />,
    [RestoreWalletType.UNISAT]: <ImportOutlined style={{ fontSize: 20, color: '#e8b94d' }} />,
    [RestoreWalletType.SPARROW]: <SafetyOutlined style={{ fontSize: 20, color: '#8B5CF6' }} />,
    [RestoreWalletType.XVERSE]: <SwapOutlined style={{ fontSize: 20, color: '#3b82f6' }} />,
    [RestoreWalletType.LEATHER]: <AppstoreOutlined style={{ fontSize: 20, color: '#ef4444' }} />,
    [RestoreWalletType.OTHERS]: <AppstoreOutlined style={{ fontSize: 20, color: colors.textFaded }} />
};

const walletDescriptions: Record<number, string> = {
    [RestoreWalletType.OP_WALLET]: 'Restore from an existing OP_WALLET backup',
    [RestoreWalletType.UNISAT]: 'Import using UniSat derivation path',
    [RestoreWalletType.SPARROW]: 'Import using Sparrow derivation path',
    [RestoreWalletType.XVERSE]: 'Import using Xverse derivation (12 words)',
    [RestoreWalletType.LEATHER]: 'Import using Leather account derivation',
    [RestoreWalletType.OTHERS]: 'Custom derivation path for other wallets'
};

export function Step0({
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
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
                    <ImportOutlined style={{ fontSize: 28, color: colors.main }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Text text="Select Your Wallet" preset="bold" size="lg" />
                </div>
                <div style={{ fontSize: '13px', color: colors.textFaded, marginTop: '8px' }}>
                    Choose the wallet you are restoring from so we can use the correct derivation path
                </div>
            </div>

            {/* Wallet Options */}
            <div
                style={{
                    background: colors.containerBgFaded,
                    borderRadius: '14px',
                    border: `1px solid ${colors.containerBorder}`,
                    overflow: 'hidden'
                }}>
                {RESTORE_WALLETS.map((item, index) => {
                    const isLast = index === RESTORE_WALLETS.length - 1;
                    const isOpWallet = item.value === RestoreWalletType.OP_WALLET;

                    return (
                        <button
                            key={item.value}
                            onClick={() => {
                                updateContextData({ tabType: TabType.STEP2, restoreWalletType: item.value });
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '14px 16px',
                                background: isOpWallet ? `${colors.main}08` : 'transparent',
                                border: 'none',
                                borderBottom: isLast ? 'none' : `1px solid ${colors.containerBorder}`,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = `${colors.main}12`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = isOpWallet ? `${colors.main}08` : 'transparent';
                            }}>
                            {/* Icon */}
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: `${colors.containerBorder}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                {walletIcons[item.value] || <WalletOutlined style={{ fontSize: 20, color: colors.textFaded }} />}
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                                        {item.name}
                                    </span>
                                    {isOpWallet && (
                                        <span
                                            style={{
                                                fontSize: '9px',
                                                padding: '2px 6px',
                                                background: colors.main,
                                                color: '#fff',
                                                borderRadius: '4px',
                                                fontWeight: 700
                                            }}>
                                            RECOMMENDED
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '11px', color: colors.textFaded, marginTop: '2px' }}>
                                    {walletDescriptions[item.value] || 'Import wallet'}
                                </div>
                            </div>

                            {/* Arrow */}
                            <RightOutlined style={{ fontSize: 12, color: colors.textFaded, flexShrink: 0 }} />
                        </button>
                    );
                })}
            </div>

            {/* Tip */}
            <div
                style={{
                    padding: '10px 12px',
                    background: `${colors.main}08`,
                    border: `1px solid ${colors.main}15`,
                    borderRadius: '10px'
                }}>
                <span style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                    Not sure? Select <strong style={{ color: colors.text }}>OP_WALLET</strong> or{' '}
                    <strong style={{ color: colors.text }}>Other Wallet</strong> -- both support all standard derivation paths.
                </span>
            </div>
        </Column>
    );
}
