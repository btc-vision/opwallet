import { useState } from 'react';

import { Layout, Content, Logo } from '@/ui/components';
import { useWallet } from '@/ui/utils';
import ParticleCanvas from '@/ui/components/ParticleField/ParticleField';
import {
    PlusOutlined,
    ImportOutlined,
    UsbOutlined
} from '@ant-design/icons';

import { RouteTypes, useNavigate } from '../routeTypes';
import { ConnectHardwareModal } from './ConnectHardwareModal';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    buttonBg: '#434343'
};

export default function WelcomeScreen() {
    const navigate = useNavigate();
    const wallet = useWallet();
    const [connectHardwareModalVisible, setConnectHardwareModalVisible] = useState(false);

    const handleAction = async (isImport: boolean) => {
        const isBooted = await wallet.isBooted();
        if (isBooted) {
            navigate(RouteTypes.CreateHDWalletScreen, { isImport });
        } else {
            navigate(RouteTypes.CreatePasswordScreen, { isNewAccount: !isImport });
        }
    };

    return (
        <Layout>
            <Content style={{ padding: 0, overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'relative',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}>
                    {/* Background */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.3,
                            pointerEvents: 'none'
                        }}>
                        <ParticleCanvas count={15} speed={0.12} />
                    </div>

                    {/* Logo */}
                    <div style={{ position: 'relative', zIndex: 1, marginBottom: '16px' }}>
                        <Logo preset="large" />
                    </div>

                    <div
                        style={{
                            fontSize: '13px',
                            color: colors.textFaded,
                            textAlign: 'center',
                            maxWidth: '280px',
                            lineHeight: '1.5',
                            marginBottom: '32px',
                            position: 'relative',
                            zIndex: 1
                        }}>
                        Manage tokens and interact with apps on the OP_NET Bitcoin L1 Metaprotocol.
                    </div>

                    {/* Action buttons */}
                    <div
                        style={{
                            width: '100%',
                            maxWidth: '300px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            position: 'relative',
                            zIndex: 1
                        }}>
                        <button
                            onClick={() => void handleAction(false)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: colors.main,
                                border: 'none',
                                borderRadius: '12px',
                                color: '#000',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}>
                            <PlusOutlined style={{ fontSize: 14 }} />
                            Create New Wallet
                        </button>

                        <button
                            onClick={() => void handleAction(true)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: colors.containerBgFaded,
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                color: colors.text,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}>
                            <ImportOutlined style={{ fontSize: 14 }} />
                            Import Existing Wallet
                        </button>

                        <button
                            onClick={() => setConnectHardwareModalVisible(true)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'transparent',
                                border: `1px solid ${colors.containerBorder}`,
                                borderRadius: '12px',
                                color: colors.textFaded,
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.15s'
                            }}>
                            <UsbOutlined style={{ fontSize: 13 }} />
                            Hardware Wallet
                        </button>
                    </div>
                </div>

                {connectHardwareModalVisible && (
                    <ConnectHardwareModal onClose={() => setConnectHardwareModalVisible(false)} />
                )}
            </Content>
        </Layout>
    );
}
