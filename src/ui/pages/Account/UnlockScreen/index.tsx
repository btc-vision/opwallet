import React, { useEffect, useState } from 'react';

import { DuplicationDetectionResult } from '@/shared/types/Duplication';
import { Column, Content, Layout, Row } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { Button } from '@/ui/components/Button';
import { DuplicationAlertModal } from '@/ui/components/DuplicationAlertModal';
import { Input } from '@/ui/components/Input';
import { Logo } from '@/ui/components/Logo';
import { Text } from '@/ui/components/Text';
import { useUnlockCallback } from '@/ui/state/global/hooks';
import { getUiType, useWallet } from '@/ui/utils';

import { RouteTypes, useNavigate } from '../../MainRoute';

export default function UnlockScreen() {
    const wallet = useWallet();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [disabled, setDisabled] = useState(true);
    const [duplicationDetection, setDuplicationDetection] = useState<DuplicationDetectionResult | null>(null);
    const [showDuplicationAlert, setShowDuplicationAlert] = useState(false);
    const UIType = getUiType();
    const isInNotification = UIType.isNotification;
    const unlock = useUnlockCallback();
    const tools = useTools();

    const btnClick = async () => {
        try {
            await unlock(password);

            // Check for duplicate wallets after unlock
            try {
                const detection = await wallet.checkForDuplicates();
                if (detection.hasDuplicates) {
                    const state = await wallet.getDuplicationState();
                    if (!state.isResolved) {
                        setDuplicationDetection(detection);
                        setShowDuplicationAlert(true);
                        return; // Don't navigate away - show modal
                    }
                }
            } catch (e) {
                console.error('Failed to check for duplicates:', e);
                // Continue with normal flow if detection fails
            }

            if (!isInNotification) {
                const hasVault = await wallet.hasVault();
                if (!hasVault) {
                    navigate(RouteTypes.WelcomeScreen);
                    return;
                } else {
                    navigate(RouteTypes.MainScreen);
                    return;
                }
            }
        } catch (e) {
            tools.toastError(`Wrong password entered, please try again.`);
        }
    };

    const handleDuplicationResolve = () => {
        setShowDuplicationAlert(false);
        navigate(RouteTypes.DuplicationResolutionScreen);
    };

    const handleOnKeyUp = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!disabled && 'Enter' == e.key) {
            await btnClick();
        }
    };

    useEffect(() => {
        if (password) {
            setDisabled(false);
        } else {
            setDisabled(true);
        }
    }, [password]);
    return (
        <Layout>
            <Content preset="middle">
                <Column fullX>
                    <Row justifyCenter>
                        <Logo preset="large" />
                    </Row>

                    <Column gap="xl" mt="xxl">
                        <Text preset="title-bold" text="Enter your password" textCenter />
                        <Input
                            preset="password"
                            placeholder="Password"
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyUp={(e) => handleOnKeyUp(e)}
                            autoFocus={true}
                        />
                        <Button disabled={disabled} text="Unlock" preset="primary" onClick={btnClick} />
                    </Column>
                </Column>
            </Content>

            {/* Duplication Alert Modal */}
            {duplicationDetection && showDuplicationAlert && (
                <DuplicationAlertModal detection={duplicationDetection} onResolve={handleDuplicationResolve} />
            )}
        </Layout>
    );
}
