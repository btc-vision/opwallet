import { useState } from 'react';

import { Layout, Content, Logo } from '@/ui/components';
import { useWallet } from '@/ui/utils';
import ParticleCanvas from '@/ui/components/ParticleField/ParticleField';
import { PlusOutlined, ImportOutlined, UsbOutlined } from '@ant-design/icons';

import { RouteTypes, useNavigate } from '../routeTypes';
import { ConnectHardwareModal } from './ConnectHardwareModal';
import './welcome.css';

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
                <div className="welcome">
                    <div className="welcome__particles">
                        <ParticleCanvas count={15} speed={0.12} />
                    </div>

                    <div className="welcome__logo">
                        <Logo preset="large" />
                    </div>

                    <div className="welcome__description">
                        Manage tokens and interact with apps on the OP_NET Bitcoin L1 Metaprotocol.
                    </div>

                    <div className="welcome__actions">
                        <button className="btn btn-primary" onClick={() => void handleAction(false)}>
                            <PlusOutlined style={{ fontSize: 14 }} />
                            Create New Wallet
                        </button>

                        <button className="btn btn-secondary" onClick={() => void handleAction(true)}>
                            <ImportOutlined style={{ fontSize: 14 }} />
                            Import Existing Wallet
                        </button>

                        <button className="btn btn-ghost" onClick={() => setConnectHardwareModalVisible(true)}>
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
