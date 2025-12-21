import {
    CheckCircleOutlined,
    DownloadOutlined,
    ExclamationCircleOutlined,
    LockOutlined,
    SafetyOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { useState, useEffect } from 'react';

import {
    DuplicationConflict,
    DuplicationDetectionResult,
    DuplicationResolution
} from '@/shared/types/Duplication';
import { Button, Card, Column, Content, Header, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useWallet } from '@/ui/utils';

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
    purple: '#8B5CF6'
};

enum ResolutionStep {
    PASSWORD = 0,
    BACKUP = 1,
    RESOLVE = 2,
    CONFIRM = 3,
    COMPLETE = 4
}

interface ConflictSelection {
    conflictId: string;
    selectedWalletIndex: number;
}

export default function DuplicationResolutionScreen() {
    const wallet = useWallet();
    const navigate = useNavigate();
    const tools = useTools();

    const [step, setStep] = useState<ResolutionStep>(ResolutionStep.PASSWORD);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [detection, setDetection] = useState<DuplicationDetectionResult | null>(null);
    const [backupAcknowledged, setBackupAcknowledged] = useState(false);
    const [backupDownloaded, setBackupDownloaded] = useState(false);
    const [conflictSelections, setConflictSelections] = useState<ConflictSelection[]>([]);
    const [confirmAcknowledged, setConfirmAcknowledged] = useState(false);

    // Load detection results on mount
    useEffect(() => {
        const loadDetection = async () => {
            try {
                const result = await wallet.checkForDuplicates();
                setDetection(result);

                // Initialize selections
                const allConflicts = [...result.walletDuplicates, ...result.mldsaDuplicates];
                setConflictSelections(
                    allConflicts.map((conflict) => ({
                        conflictId: conflict.conflictId,
                        selectedWalletIndex: -1 // No selection yet
                    }))
                );
            } catch (e) {
                console.error('Failed to load detection:', e);
            }
        };
        void loadDetection();
    }, [wallet]);

    const handlePasswordVerify = async () => {
        if (!password) return;

        setIsLoading(true);
        try {
            await wallet.createDuplicationBackup(password);
            tools.toastSuccess('Backup created successfully');
            setStep(ResolutionStep.BACKUP);
        } catch (e) {
            tools.toastError('Invalid password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadBackup = async () => {
        setIsLoading(true);
        try {
            const result = await wallet.exportDuplicationBackup(password);
            // Create and trigger download
            const blob = new Blob([result.content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setBackupDownloaded(true);
            tools.toastSuccess('Backup downloaded');
        } catch (e) {
            tools.toastError('Failed to download backup');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackupContinue = () => {
        if (!backupAcknowledged) {
            tools.toastError('Please acknowledge that you have saved your backup');
            return;
        }
        setStep(ResolutionStep.RESOLVE);
    };

    const handleConflictSelection = (conflictId: string, walletIndex: number) => {
        setConflictSelections((prev) =>
            prev.map((sel) => (sel.conflictId === conflictId ? { ...sel, selectedWalletIndex: walletIndex } : sel))
        );
    };

    const areAllConflictsResolved = () => {
        return conflictSelections.every((sel) => sel.selectedWalletIndex >= 0);
    };

    const handleResolveContinue = () => {
        if (!areAllConflictsResolved()) {
            tools.toastError('Please select the correct wallet for each conflict');
            return;
        }
        setStep(ResolutionStep.CONFIRM);
    };

    const handleApplyResolutions = async () => {
        if (!confirmAcknowledged) {
            tools.toastError('Please acknowledge that you understand the changes');
            return;
        }

        setIsLoading(true);
        try {
            // Apply resolutions for each conflict
            for (const selection of conflictSelections) {
                await wallet.resolveDuplicationConflict({
                    conflictId: selection.conflictId,
                    resolution: DuplicationResolution.KEEP_SELECTED,
                    correctWalletIndex: selection.selectedWalletIndex
                });
            }

            await wallet.setDuplicationResolved();
            tools.toastSuccess('All conflicts resolved successfully');
            setStep(ResolutionStep.COMPLETE);
        } catch (e) {
            tools.toastError('Failed to apply resolutions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = () => {
        navigate(RouteTypes.MainScreen);
    };

    const renderStepIndicator = () => {
        const steps = ['Verify', 'Backup', 'Resolve', 'Confirm'];
        const currentStepIndex = Math.min(step, 3);

        return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                {steps.map((stepName, index) => (
                    <div key={stepName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 600,
                                background:
                                    index < currentStepIndex
                                        ? colors.success
                                        : index === currentStepIndex
                                          ? colors.main
                                          : colors.containerBgFaded,
                                color: index <= currentStepIndex ? '#fff' : colors.textFaded,
                                border: `1px solid ${index <= currentStepIndex ? 'transparent' : colors.containerBorder}`
                            }}>
                            {index < currentStepIndex ? <CheckCircleOutlined /> : index + 1}
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                style={{
                                    width: '20px',
                                    height: '2px',
                                    background: index < currentStepIndex ? colors.success : colors.containerBorder
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderPasswordStep = () => (
        <Column gap="lg">
            <Card
                style={{
                    background: `linear-gradient(135deg, ${colors.error}15 0%, transparent 100%)`,
                    borderColor: `${colors.error}40`
                }}>
                <Row itemsCenter gap="md">
                    <ExclamationCircleOutlined style={{ fontSize: 24, color: colors.error }} />
                    <Column gap="xs">
                        <Text text="Wallet Conflict Resolution Required" preset="bold" color="error" />
                        <Text
                            text="Enter your password to create a secure backup before resolving conflicts."
                            preset="sub"
                            size="xs"
                        />
                    </Column>
                </Row>
            </Card>

            <Text text="Enter your wallet password" preset="title" textCenter />

            <Input
                preset="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handlePasswordVerify()}
                autoFocus
            />

            <Button
                text={isLoading ? 'Verifying...' : 'Verify & Create Backup'}
                preset="primary"
                disabled={!password || isLoading}
                onClick={handlePasswordVerify}
            />
        </Column>
    );

    const renderBackupStep = () => (
        <Column gap="lg">
            <Card style={{ background: colors.containerBgFaded }}>
                <Row itemsCenter gap="md">
                    <SafetyOutlined style={{ fontSize: 24, color: colors.success }} />
                    <Column gap="xs">
                        <Text text="Backup Created Successfully" preset="bold" color="green" />
                        <Text text="Your wallets have been backed up securely." preset="sub" size="xs" />
                    </Column>
                </Row>
            </Card>

            <Card>
                <Column gap="md">
                    <Text text="Download Backup File" preset="bold" size="sm" />
                    <Text
                        text="We strongly recommend downloading a backup file for extra safety. This file contains all your wallet data including MLDSA keys."
                        preset="sub"
                        size="xs"
                    />
                    <Button
                        text={backupDownloaded ? 'Downloaded' : 'Download Backup'}
                        preset={backupDownloaded ? 'default' : 'primary'}
                        icon={<DownloadOutlined />}
                        disabled={isLoading}
                        onClick={handleDownloadBackup}
                    />
                </Column>
            </Card>

            <Card
                style={{
                    background: `${colors.warning}10`,
                    borderColor: `${colors.warning}30`
                }}>
                <Row itemsCenter gap="sm">
                    <input
                        type="checkbox"
                        id="backupAck"
                        checked={backupAcknowledged}
                        onChange={(e) => setBackupAcknowledged(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="backupAck" style={{ cursor: 'pointer', flex: 1 }}>
                        <Text
                            text="I have securely stored my backup and understand that I need it to recover my wallets"
                            preset="sub"
                            size="xs"
                        />
                    </label>
                </Row>
            </Card>

            <Button
                text="Continue to Resolution"
                preset="primary"
                disabled={!backupAcknowledged}
                onClick={handleBackupContinue}
            />
        </Column>
    );

    const renderConflictCard = (conflict: DuplicationConflict, selection: ConflictSelection | undefined) => (
        <Card
            key={conflict.conflictId}
            style={{
                marginBottom: '12px',
                borderColor: conflict.type === 'WALLET_DUPLICATE' ? `${colors.error}40` : `${colors.warning}40`
            }}>
            <Column gap="md">
                <Row itemsCenter gap="sm">
                    <WarningOutlined
                        style={{
                            color: conflict.type === 'WALLET_DUPLICATE' ? colors.error : colors.warning,
                            fontSize: 16
                        }}
                    />
                    <Text
                        text={conflict.description}
                        preset="bold"
                        size="sm"
                        color={conflict.type === 'WALLET_DUPLICATE' ? 'error' : 'warning'}
                    />
                </Row>

                <Text text="Select the correct wallet:" preset="sub" size="xs" />

                {conflict.wallets.map((walletInfo, idx) => (
                    <div
                        key={walletInfo.keyringKey}
                        onClick={() => handleConflictSelection(conflict.conflictId, walletInfo.keyringIndex)}
                        style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${selection?.selectedWalletIndex === walletInfo.keyringIndex ? colors.main : colors.containerBorder}`,
                            background:
                                selection?.selectedWalletIndex === walletInfo.keyringIndex
                                    ? `${colors.main}10`
                                    : colors.containerBgFaded,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}>
                        <Row justifyBetween itemsCenter>
                            <Column gap="xs">
                                <Row itemsCenter gap="sm">
                                    <Text text={walletInfo.alianName || `Wallet ${idx + 1}`} preset="bold" size="sm" />
                                    {walletInfo.isOnChainMatch && (
                                        <div
                                            style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: `${colors.purple}20`,
                                                border: `1px solid ${colors.purple}40`
                                            }}>
                                            <Text text="On-chain verified" size="xxs" style={{ color: colors.purple }} />
                                        </div>
                                    )}
                                </Row>
                                <Text
                                    text={`${walletInfo.address.substring(0, 10)}...${walletInfo.address.substring(walletInfo.address.length - 6)}`}
                                    preset="sub"
                                    size="xs"
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </Column>
                            <div
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: `2px solid ${selection?.selectedWalletIndex === walletInfo.keyringIndex ? colors.main : colors.containerBorder}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                {selection?.selectedWalletIndex === walletInfo.keyringIndex && (
                                    <div
                                        style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: colors.main
                                        }}
                                    />
                                )}
                            </div>
                        </Row>
                    </div>
                ))}
            </Column>
        </Card>
    );

    const renderResolveStep = () => {
        if (!detection) return null;

        const allConflicts = [...detection.walletDuplicates, ...detection.mldsaDuplicates];

        return (
            <Column gap="lg">
                <Text text="Resolve Conflicts" preset="title" textCenter />
                <Text
                    text="Select the correct wallet for each conflict. Wallets with on-chain verified MLDSA keys are marked."
                    preset="sub"
                    size="xs"
                    textCenter
                />

                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {allConflicts.map((conflict) =>
                        renderConflictCard(
                            conflict,
                            conflictSelections.find((s) => s.conflictId === conflict.conflictId)
                        )
                    )}
                </div>

                <Button
                    text="Continue to Confirmation"
                    preset="primary"
                    disabled={!areAllConflictsResolved()}
                    onClick={handleResolveContinue}
                />
            </Column>
        );
    };

    const renderConfirmStep = () => (
        <Column gap="lg">
            <Card
                style={{
                    background: `${colors.warning}10`,
                    borderColor: `${colors.warning}40`
                }}>
                <Row itemsCenter gap="md">
                    <ExclamationCircleOutlined style={{ fontSize: 24, color: colors.warning }} />
                    <Column gap="xs">
                        <Text text="Review Your Selections" preset="bold" color="warning" />
                        <Text
                            text="The wallets you selected will be marked as correct. You can manually delete duplicate wallets later."
                            preset="sub"
                            size="xs"
                        />
                    </Column>
                </Row>
            </Card>

            <Card>
                <Column gap="sm">
                    <Text text="Summary of Changes" preset="bold" size="sm" />
                    {conflictSelections.map((selection) => {
                        const conflict = [...(detection?.walletDuplicates || []), ...(detection?.mldsaDuplicates || [])].find(
                            (c) => c.conflictId === selection.conflictId
                        );
                        const selectedWallet = conflict?.wallets.find((w) => w.keyringIndex === selection.selectedWalletIndex);

                        return (
                            <Row key={selection.conflictId} gap="sm" itemsCenter>
                                <CheckCircleOutlined style={{ color: colors.success }} />
                                <Text
                                    text={`"${selectedWallet?.alianName || 'Wallet'}" marked as correct`}
                                    preset="sub"
                                    size="xs"
                                />
                            </Row>
                        );
                    })}
                </Column>
            </Card>

            <Card
                style={{
                    background: `${colors.error}10`,
                    borderColor: `${colors.error}30`
                }}>
                <Row itemsCenter gap="sm">
                    <input
                        type="checkbox"
                        id="confirmAck"
                        checked={confirmAcknowledged}
                        onChange={(e) => setConfirmAcknowledged(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="confirmAck" style={{ cursor: 'pointer', flex: 1 }}>
                        <Text
                            text="I understand these changes and have backed up my wallets"
                            preset="sub"
                            size="xs"
                        />
                    </label>
                </Row>
            </Card>

            <Row gap="md">
                <Button text="Back" preset="default" onClick={() => setStep(ResolutionStep.RESOLVE)} style={{ flex: 1 }} />
                <Button
                    text={isLoading ? 'Applying...' : 'Apply Changes'}
                    preset="primary"
                    disabled={!confirmAcknowledged || isLoading}
                    onClick={handleApplyResolutions}
                    style={{ flex: 1 }}
                />
            </Row>
        </Column>
    );

    const renderCompleteStep = () => (
        <Column gap="lg" style={{ textAlign: 'center' }}>
            <div
                style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: `${colors.success}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                }}>
                <CheckCircleOutlined style={{ fontSize: 40, color: colors.success }} />
            </div>

            <Text text="Resolution Complete!" preset="title-bold" color="green" textCenter />
            <Text text="All wallet conflicts have been resolved successfully." preset="sub" textCenter />

            <Button text="Continue to Wallet" preset="primary" onClick={handleComplete} />
        </Column>
    );

    const renderCurrentStep = () => {
        switch (step) {
            case ResolutionStep.PASSWORD:
                return renderPasswordStep();
            case ResolutionStep.BACKUP:
                return renderBackupStep();
            case ResolutionStep.RESOLVE:
                return renderResolveStep();
            case ResolutionStep.CONFIRM:
                return renderConfirmStep();
            case ResolutionStep.COMPLETE:
                return renderCompleteStep();
            default:
                return null;
        }
    };

    return (
        <Layout>
            <Header
                title="Resolve Wallet Conflicts"
                LeftComponent={
                    <LockOutlined style={{ fontSize: 20, color: colors.error }} />
                }
            />
            <Content>
                <Column fullX>
                    {step < ResolutionStep.COMPLETE && renderStepIndicator()}
                    {renderCurrentStep()}
                </Column>
            </Content>
        </Layout>
    );
}
