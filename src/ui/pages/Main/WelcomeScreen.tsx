import React, { useEffect, useState } from 'react';

import { Button, Column, Content, Layout, Logo, Row, Text } from '@/ui/components';
import { useWallet } from '@/ui/utils';

import { RouteTypes, useNavigate } from '../routeTypes';
import { ConnectHardwareModal } from './ConnectHardwareModal';
import { TermsOfServiceModal, TOS_ACCEPTED_KEY } from '@/ui/components/AcceptModals/TermsModal';

export default function WelcomeScreen() {
    const navigate = useNavigate();
    const wallet = useWallet();

    const [connectHardwareModalVisible, setConnectHardwareModalVisible] = useState(false);
    const [termsVisible, setTermsVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Only show if they haven't accepted yet (tied to the accept button).
        const accepted = window.localStorage.getItem(TOS_ACCEPTED_KEY) === '1';
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Check localStorage on mount
        if (!accepted) setTermsVisible(true);
    }, []);

    return (
        <Layout>
            <Content preset="middle">
                <Column fullX>
                    <Row justifyCenter>
                        <Logo preset="large" />
                    </Row>

                    <Column gap="xl" mt="xxl">
                        <Text
                            text="A browser extension for managing tokens and interacting with apps on the OP_NET Bitcoin Layer 1 Metaprotocol."
                            preset="sub"
                            textCenter
                        />

                        <Button
                            text="Create new wallet"
                            preset="primary"
                            onClick={async () => {
                                const isBooted = await wallet.isBooted();
                                if (isBooted) {
                                    navigate(RouteTypes.CreateHDWalletScreen, { isImport: false });
                                } else {
                                    navigate(RouteTypes.CreatePasswordScreen, { isNewAccount: true });
                                }
                            }}
                        />

                        <Button
                            text="I already have a wallet"
                            preset="default"
                            onClick={async () => {
                                const isBooted = await wallet.isBooted();
                                if (isBooted) {
                                    navigate(RouteTypes.CreateHDWalletScreen, { isImport: true });
                                } else {
                                    navigate(RouteTypes.CreatePasswordScreen, { isNewAccount: false });
                                }
                            }}
                        />

                        <Button
                            text="I have an Ethereum wallet"
                            preset="default"
                            onClick={async () => {
                                const isBooted = await wallet.isBooted();
                                if (isBooted) {
                                    navigate(RouteTypes.CreateSimpleWalletScreen, { isImport: true });
                                } else {
                                    navigate(RouteTypes.CreatePasswordScreen, { isNewAccount: false, isEthereum: true });
                                }
                            }}
                        />

                        <Button
                            text="Connect to Hardware Wallet"
                            preset="default"
                            onClick={() => {
                                setConnectHardwareModalVisible(true);
                            }}
                        />

                        {/* Optional: reopen the Terms modal manually (it still only closes via “I accept”) */}
                        <Button
                            text="Terms of service"
                            preset="approval"
                            onClick={() => {
                                setTermsVisible(true);
                            }}
                        />

                        {connectHardwareModalVisible && (
                            <ConnectHardwareModal
                                onClose={() => {
                                    setConnectHardwareModalVisible(false);
                                }}
                            />
                        )}

                        <TermsOfServiceModal
                            open={termsVisible}
                            onAccept={() => {
                                setTermsVisible(false);
                            }}
                        />
                    </Column>
                </Column>
            </Content>
        </Layout>
    );
}
