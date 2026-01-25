import { CheckCircleFilled } from '@ant-design/icons';
import { useCallback, useMemo, useState } from 'react';

import { RestoreWalletType } from '@/shared/types';
import { AddressTypes } from '@btc-vision/transaction';
import { Content, Header, Layout } from '@/ui/components';
import { Step0 } from '@/ui/pages/Account/createHDWalletComponents/Step0';
import { Step1_Create } from '@/ui/pages/Account/createHDWalletComponents/Step1_Create';
import { Step1_Import } from '@/ui/pages/Account/createHDWalletComponents/Step1_Import';
import { Step2 } from '@/ui/pages/Account/createHDWalletComponents/Step2';
import { Step3_RotationMode } from '@/ui/pages/Account/createHDWalletComponents/Step3_RotationMode';
import { Step3_XVerseWarning } from '@/ui/pages/Account/createHDWalletComponents/Step3_XVerseWarning';
import {
    ContextData,
    TabType,
    UpdateContextDataParams,
    WordsType
} from '@/ui/pages/Account/createHDWalletComponents/types';

import { useLocationState } from '@/ui/utils';
import { RouteTypes, useNavigate } from '../routeTypes';
import { usePrivacyModeEnabled } from '@/ui/hooks/useAppConfig';

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
    warning: '#fbbf24'
};

interface LocationState {
    isImport: boolean;
    fromUnlock?: boolean;
}

export default function CreateHDWalletScreen() {
    const navigate = useNavigate();
    const { isImport, fromUnlock } = useLocationState<LocationState>();
    const privacyModeEnabled = usePrivacyModeEnabled();

    const [contextData, setContextData] = useState<ContextData>({
        mnemonics: '',
        hdPath: '',
        passphrase: '',
        addressType: AddressTypes.P2WPKH,
        step1Completed: false,
        tabType: TabType.STEP1,
        restoreWalletType: RestoreWalletType.UNISAT,
        isRestore: isImport,
        isCustom: false,
        customHdPath: '',
        addressTypeIndex: 0,
        wordsType: WordsType.WORDS_12,
        rotationModeEnabled: false
    });

    const updateContextData = useCallback(
        (params: UpdateContextDataParams) => {
            setContextData(Object.assign({}, contextData, params));
        },
        [contextData, setContextData]
    );

    const items = useMemo(() => {
        if (contextData.isRestore) {
            if (contextData.restoreWalletType === RestoreWalletType.XVERSE) {
                // XVerse import: Type → Import → Address → Warning → (Privacy Mode if enabled)
                const steps = [
                    {
                        key: TabType.STEP1,
                        label: 'Type',
                        children: <Step0 contextData={contextData} updateContextData={updateContextData} />
                    },
                    {
                        key: TabType.STEP2,
                        label: 'Import',
                        children: <Step1_Import contextData={contextData} updateContextData={updateContextData} />
                    },
                    {
                        key: TabType.STEP3,
                        label: 'Address',
                        children: <Step2 contextData={contextData} updateContextData={updateContextData} />
                    },
                    {
                        key: TabType.STEP5,
                        label: 'Notice',
                        children: <Step3_XVerseWarning contextData={contextData} updateContextData={updateContextData} />
                    }
                ];
                // Only add privacy step if feature is enabled
                if (privacyModeEnabled) {
                    steps.push({
                        key: TabType.STEP4,
                        label: 'Privacy',
                        children: <Step3_RotationMode contextData={contextData} updateContextData={updateContextData} />
                    });
                }
                return steps;
            } else {
                // Standard import: Type → Import → Address → (Privacy Mode if enabled)
                const steps = [
                    {
                        key: TabType.STEP1,
                        label: 'Type',
                        children: <Step0 contextData={contextData} updateContextData={updateContextData} />
                    },
                    {
                        key: TabType.STEP2,
                        label: 'Import',
                        children: <Step1_Import contextData={contextData} updateContextData={updateContextData} />
                    },
                    {
                        key: TabType.STEP3,
                        label: 'Address',
                        children: <Step2 contextData={contextData} updateContextData={updateContextData} />
                    }
                ];
                // Only add privacy step if feature is enabled
                if (privacyModeEnabled) {
                    steps.push({
                        key: TabType.STEP4,
                        label: 'Privacy',
                        children: <Step3_RotationMode contextData={contextData} updateContextData={updateContextData} />
                    });
                }
                return steps;
            }
        } else {
            // Create: Create → Address → (Privacy Mode if enabled)
            const steps = [
                {
                    key: TabType.STEP1,
                    label: 'Create',
                    children: <Step1_Create contextData={contextData} updateContextData={updateContextData} />
                },
                {
                    key: TabType.STEP2,
                    label: 'Address',
                    children: <Step2 contextData={contextData} updateContextData={updateContextData} />
                }
            ];
            // Only add privacy step if feature is enabled
            if (privacyModeEnabled) {
                steps.push({
                    key: TabType.STEP3,
                    label: 'Privacy',
                    children: <Step3_RotationMode contextData={contextData} updateContextData={updateContextData} />
                });
            }
            return steps;
        }
    }, [contextData, updateContextData, privacyModeEnabled]);

    const currentChildren = useMemo(() => {
        const item = items.find((v) => v.key === contextData.tabType);
        return item?.children;
    }, [items, contextData.tabType]);

    const currentStepIndex = items.findIndex((item) => item.key === contextData.tabType);

    return (
        <Layout>
            <Header
                onBack={() => {
                    if (fromUnlock) {
                        navigate(RouteTypes.WelcomeScreen);
                    } else {
                        window.history.go(-1);
                    }
                }}
                title={contextData.isRestore ? 'Import Wallet' : 'Create Wallet'}
            />

            <Content
                style={{
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100vh - 56px)', // Account for header height
                    overflow: 'hidden'
                }}>
                {/* Compact Step Indicator */}
                <div
                    style={{
                        padding: '12px 16px',
                        background: colors.containerBgFaded,
                        borderBottom: `1px solid ${colors.containerBorder}`,
                        flexShrink: 0
                    }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.textFaded,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                            Step {currentStepIndex + 1} of {items.length}
                        </div>
                        <div
                            style={{
                                fontSize: '12px',
                                color: colors.main,
                                fontWeight: 600
                            }}>
                            {items[currentStepIndex]?.label}
                        </div>
                    </div>

                    {/* Compact Progress Steps */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                        {items.map((item, index) => {
                            const isActive = item.key === contextData.tabType;
                            const isCompleted = index < currentStepIndex;
                            const isClickable =
                                isCompleted || (index === currentStepIndex + 1 && contextData.step1Completed);

                            return (
                                <div
                                    key={item.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        flex: index === items.length - 1 ? '0' : '1'
                                    }}>
                                    <button
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: isActive
                                                ? colors.main
                                                : isCompleted
                                                  ? colors.success
                                                  : colors.buttonHoverBg,
                                            border: `1px solid ${
                                                isActive
                                                    ? colors.main
                                                    : isCompleted
                                                      ? colors.success
                                                      : colors.containerBorder
                                            }`,
                                            color: isActive || isCompleted ? colors.background : colors.textFaded,
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: isClickable ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            flexShrink: 0
                                        }}
                                        onClick={() => {
                                            if (!isClickable) return;

                                            const toTabType = item.key;
                                            if (toTabType === TabType.STEP2 && !contextData.step1Completed) {
                                                return;
                                            }
                                            if (toTabType === TabType.STEP3 && !contextData.step1Completed) {
                                                return;
                                            }
                                            updateContextData({ tabType: toTabType });
                                        }}>
                                        {isCompleted ? <CheckCircleFilled style={{ fontSize: 12 }} /> : index + 1}
                                    </button>
                                    {index < items.length - 1 && (
                                        <div
                                            style={{
                                                flex: 1,
                                                height: '2px',
                                                background: isCompleted ? colors.success : colors.containerBorder,
                                                margin: '0 8px',
                                                transition: 'background 0.3s'
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '16px',
                        minHeight: 0 // Important for flex child scrolling
                    }}>
                    {currentChildren}
                </div>

                {/* Fixed Bottom Warning - Only show on first step of import or create */}
                {((contextData.isRestore && currentStepIndex === 0) ||
                    (!contextData.isRestore && currentStepIndex === 0)) && (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: `${colors.warning}10`,
                            borderTop: `1px solid ${colors.warning}30`,
                            flexShrink: 0
                        }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                            <span
                                style={{
                                    fontSize: '14px',
                                    color: colors.warning
                                }}>
                                ⚠️
                            </span>
                            <div
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    lineHeight: '1.3'
                                }}>
                                {contextData.isRestore
                                    ? 'Never share your seed phrase. Ensure privacy.'
                                    : 'Write down and safely store your seed phrase.'}
                            </div>
                        </div>
                    </div>
                )}
            </Content>
        </Layout>
    );
}
