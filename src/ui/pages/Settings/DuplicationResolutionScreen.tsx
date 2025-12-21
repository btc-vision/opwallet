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
    DuplicateWalletInfo,
    DuplicationConflict,
    DuplicationDetectionResult,
    DuplicationResolution
} from '@/shared/types/Duplication';
import { Button, Card, Column, Content, Header, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useReloadAccounts } from '@/ui/state/accounts/hooks';
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

interface RestorableKeypair {
    /** Wallet with correct Bitcoin key that needs MLDSA */
    targetWallet: DuplicateWalletInfo;
    /** Wallet with the MLDSA key that needs to be moved */
    sourceWallet: DuplicateWalletInfo;
    /** The on-chain MLDSA hash they should match */
    onChainHash: string;
}

export default function DuplicationResolutionScreen() {
    const wallet = useWallet();
    const navigate = useNavigate();
    const tools = useTools();
    const reloadAccounts = useReloadAccounts();

    const [step, setStep] = useState<ResolutionStep>(ResolutionStep.PASSWORD);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [detection, setDetection] = useState<DuplicationDetectionResult | null>(null);
    const [backupAcknowledged, setBackupAcknowledged] = useState(false);
    const [backupDownloaded, setBackupDownloaded] = useState(false);
    const [conflictSelections, setConflictSelections] = useState<ConflictSelection[]>([]);
    const [confirmAcknowledged, setConfirmAcknowledged] = useState(false);
    const [restoringConflictId, setRestoringConflictId] = useState<string | null>(null);

    /**
     * Find if a conflict has a restorable keypair combination:
     * - One wallet has correct Bitcoin key (linked on-chain to MLDSA hash X)
     * - Another wallet has MLDSA with hash X (but wrong Bitcoin key)
     * We can restore by moving the MLDSA from source to target
     */
    const findRestorableKeypair = (conflict: DuplicationConflict): RestorableKeypair | null => {
        // Look for a wallet that has on-chain linkage but doesn't have the matching MLDSA locally
        for (const targetWallet of conflict.wallets) {
            if (!targetWallet.onChainLinkedMldsaHash) continue;
            if (targetWallet.isOnChainMatch) continue; // Already has correct combo

            const onChainHash = targetWallet.onChainLinkedMldsaHash.replace('0x', '').toLowerCase();

            // Find another wallet that has the MLDSA matching this on-chain hash
            for (const sourceWallet of conflict.wallets) {
                if (sourceWallet.keyringIndex === targetWallet.keyringIndex) continue;
                if (!sourceWallet.mldsaPublicKeyHash) continue;

                const sourceMldsaHash = sourceWallet.mldsaPublicKeyHash.replace('0x', '').toLowerCase();
                if (sourceMldsaHash === onChainHash) {
                    return {
                        targetWallet,
                        sourceWallet,
                        onChainHash
                    };
                }
            }
        }
        return null;
    };

    // Load detection results once on mount
    useEffect(() => {
        let mounted = true;
        const loadDetection = async () => {
            try {
                const result = await wallet.checkForDuplicates();
                if (!mounted) return;

                setDetection(result);

                // Initialize selections - pre-select wallets that match on-chain
                const allConflicts = [...result.walletDuplicates, ...result.mldsaDuplicates];
                setConflictSelections(
                    allConflicts.map((conflict) => {
                        // Find a wallet that matches on-chain (isOnChainMatch)
                        const onChainMatchWallet = conflict.wallets.find(w => w.isOnChainMatch);
                        if (onChainMatchWallet) {
                            return {
                                conflictId: conflict.conflictId,
                                selectedWalletIndex: onChainMatchWallet.keyringIndex
                            };
                        }
                        // No on-chain match, leave unselected
                        return {
                            conflictId: conflict.conflictId,
                            selectedWalletIndex: -1
                        };
                    })
                );
            } catch (e) {
                console.error('Failed to load detection:', e);
            }
        };
        void loadDetection();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

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

    /**
     * Restore matching keypair by moving MLDSA from source wallet to target wallet
     */
    const handleRestoreKeypair = async (conflictId: string, restorable: RestorableKeypair) => {
        setRestoringConflictId(conflictId);
        try {
            // Move MLDSA from source to target
            await wallet.resolveDuplicationConflict({
                conflictId,
                resolution: DuplicationResolution.MOVE_MLDSA,
                correctWalletIndex: restorable.targetWallet.keyringIndex,
                targetWalletIndex: restorable.sourceWallet.keyringIndex // source keyring with MLDSA
            });

            tools.toastSuccess(
                `MLDSA key moved to ${restorable.targetWallet.alianName || restorable.targetWallet.address?.slice(0, 12) + '...'}`
            );

            // Reload accounts and detection
            await reloadAccounts();
            const result = await wallet.checkForDuplicates();
            setDetection(result);

            // Update selections for remaining conflicts
            const allConflicts = [...result.walletDuplicates, ...result.mldsaDuplicates];
            setConflictSelections(
                allConflicts.map((conflict) => {
                    const onChainMatchWallet = conflict.wallets.find(w => w.isOnChainMatch);
                    return {
                        conflictId: conflict.conflictId,
                        selectedWalletIndex: onChainMatchWallet ? onChainMatchWallet.keyringIndex : -1
                    };
                })
            );
        } catch (e) {
            console.error('Failed to restore keypair:', e);
            tools.toastError(`Failed to restore keypair: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setRestoringConflictId(null);
        }
    };

    const areAllConflictsResolved = () => {
        if (!detection) return false;
        const allConflicts = [...detection.walletDuplicates, ...detection.mldsaDuplicates];

        return conflictSelections.every((sel) => {
            // Find the conflict for this selection
            const conflict = allConflicts.find(c => c.conflictId === sel.conflictId);
            if (!conflict) return true; // Conflict was resolved/removed

            // If conflict has restorable keypair, it's handled by the restore button
            const restorable = findRestorableKeypair(conflict);
            if (restorable) return true; // Skip - user should click restore button

            // Otherwise, need a selection
            return sel.selectedWalletIndex >= 0;
        });
    };

    const handleResolveContinue = () => {
        if (!detection) return;

        // Check if there are any restorable conflicts pending
        const allConflicts = [...detection.walletDuplicates, ...detection.mldsaDuplicates];
        const pendingRestorables = allConflicts.filter(c => findRestorableKeypair(c) !== null);
        if (pendingRestorables.length > 0) {
            tools.toastError('Please click "Restore Matching Keypair" for conflicts that can be auto-restored');
            return;
        }

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

        if (!detection) {
            tools.toastError('Detection data not loaded');
            return;
        }

        setIsLoading(true);
        try {
            // Apply resolutions for each conflict
            const allConflicts = [...detection.walletDuplicates, ...detection.mldsaDuplicates];

            for (const selection of conflictSelections) {
                // Find the conflict to get all wallet indices
                const conflict = allConflicts.find((c) => c.conflictId === selection.conflictId);
                if (!conflict) {
                    console.error('[Resolution] Conflict not found:', selection.conflictId);
                    continue;
                }

                // Get indices of wallets to delete (all except the selected one)
                const allIndices = conflict.wallets.map((w) => w.keyringIndex);
                const walletsToDelete = allIndices.filter((idx) => idx !== selection.selectedWalletIndex);

                console.log('[Resolution] Conflict:', selection.conflictId);
                console.log('[Resolution] All wallet indices:', allIndices);
                console.log('[Resolution] Selected to keep:', selection.selectedWalletIndex);
                console.log('[Resolution] Wallets to delete:', walletsToDelete);

                await wallet.resolveDuplicationConflict({
                    conflictId: selection.conflictId,
                    resolution: DuplicationResolution.KEEP_SELECTED,
                    correctWalletIndex: selection.selectedWalletIndex,
                    walletsToDelete
                });
            }

            await wallet.setDuplicationResolved();

            // Reload accounts to reflect the changes
            await reloadAccounts();

            tools.toastSuccess('All conflicts resolved successfully');
            setStep(ResolutionStep.COMPLETE);
        } catch (e) {
            console.error('Failed to apply resolutions:', e);
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

    // Get user-friendly conflict description
    const getConflictExplanation = (conflict: DuplicationConflict) => {
        if (conflict.type === 'WALLET_DUPLICATE') {
            // Check if this is identical copies (same MLDSA) or different MLDSA
            const isIdenticalCopies = conflict.conflictId.startsWith('wallet_same_');
            const hasAnyMldsa = conflict.wallets.some(w => w.mldsaPrivateKeyExists);
            const noneHaveMldsa = !hasAnyMldsa;

            if (isIdenticalCopies) {
                if (noneHaveMldsa) {
                    // True duplicates with no MLDSA
                    return {
                        title: 'Identical Wallet Copies (No MLDSA)',
                        subtitle: 'These are exact copies of the same wallet. None have MLDSA keys yet.',
                        recommendation: 'Keep one wallet and delete the rest. Then migrate the kept one to get an MLDSA key.',
                        restorable: null
                    };
                } else {
                    // True duplicates with same MLDSA
                    return {
                        title: 'Identical Wallet Copies',
                        subtitle: 'These are exact copies of the same wallet with the same MLDSA key.',
                        recommendation: 'Keep one wallet and safely delete the duplicates. They are identical.',
                        restorable: null
                    };
                }
            } else {
                // Different MLDSA keys on same Bitcoin wallet
                const hasAnyOnChain = conflict.wallets.some(w => w.isOnChainMatch);
                const restorable = findRestorableKeypair(conflict);

                if (hasAnyOnChain) {
                    return {
                        title: 'Same Wallet - Different MLDSA Keys (On-chain Found)',
                        subtitle: 'Same Bitcoin key was migrated multiple times with different MLDSA keys. One is verified on-chain.',
                        recommendation: 'Select the ON-CHAIN VERIFIED wallet. The others have orphaned MLDSA keys.',
                        restorable: null
                    };
                } else if (restorable) {
                    return {
                        title: '🔧 Restorable Keypair Found',
                        subtitle: `The correct MLDSA key exists on another wallet. Click "Restore Matching Keypair" to move it.`,
                        recommendation: `Move MLDSA from "${restorable.sourceWallet.alianName || 'source'}" to "${restorable.targetWallet.alianName || restorable.targetWallet.address?.slice(0, 12) + '...'}" to match on-chain linkage.`,
                        restorable
                    };
                } else {
                    return {
                        title: 'Same Wallet - Different MLDSA Keys',
                        subtitle: 'Same Bitcoin key was migrated multiple times with different MLDSA keys.',
                        recommendation: 'Select the wallet with the MLDSA key you linked on-chain. If unsure, check your transaction history.',
                        restorable: null
                    };
                }
            }
        } else {
            // MLDSA_DUPLICATE - same MLDSA key on DIFFERENT Bitcoin wallets
            const hasAnyOnChain = conflict.wallets.some(w => w.isOnChainMatch);
            const onChainWallet = conflict.wallets.find(w => w.isOnChainMatch);
            const restorable = findRestorableKeypair(conflict);

            if (hasAnyOnChain && onChainWallet) {
                return {
                    title: 'Same MLDSA on Different Wallets (On-chain Found)',
                    subtitle: `The same MLDSA key is on multiple Bitcoin wallets. One wallet (${onChainWallet.alianName || onChainWallet.address?.slice(0, 12) + '...'}) is verified on-chain.`,
                    recommendation: 'Keep the ON-CHAIN VERIFIED wallet. The others incorrectly share this MLDSA key.',
                    restorable: null
                };
            } else if (restorable) {
                // Can restore - correct Bitcoin key exists AND correct MLDSA exists, just on wrong wallet
                return {
                    title: '🔧 Restorable Keypair Found',
                    subtitle: `The correct Bitcoin wallet and MLDSA key exist, but on different wallets. Click "Restore Matching Keypair" to fix.`,
                    recommendation: `Move MLDSA from "${restorable.sourceWallet.alianName || 'Wallet'}" to "${restorable.targetWallet.alianName || restorable.targetWallet.address?.slice(0, 12) + '...'}" to match on-chain linkage.`,
                    restorable
                };
            } else {
                return {
                    title: 'Same MLDSA on Different Wallets',
                    subtitle: 'The same MLDSA key is assigned to different Bitcoin addresses. No on-chain linkage found.',
                    recommendation: '⚠️ WALLET NOT LINKED ON CHAIN - Select which Bitcoin wallet should own this MLDSA key. Check your transaction history if unsure.',
                    restorable: null
                };
            }
        }
    };

    // Get MLDSA status badge
    const getMldsaBadge = (walletInfo: DuplicateWalletInfo) => {
        if (!walletInfo.mldsaPrivateKeyExists) {
            return {
                text: 'No MLDSA',
                color: colors.error,
                bgColor: `${colors.error}15`,
                borderColor: `${colors.error}40`
            };
        }
        if (walletInfo.isOnChainMatch) {
            return {
                text: '✓ On-chain Verified',
                color: colors.success,
                bgColor: `${colors.success}15`,
                borderColor: `${colors.success}40`
            };
        }
        // Has MLDSA but not verified on-chain
        if (walletInfo.onChainLinkedMldsaHash) {
            // There's an on-chain hash but it doesn't match this wallet's MLDSA
            return {
                text: 'MLDSA (Not Linked)',
                color: colors.warning,
                bgColor: `${colors.warning}15`,
                borderColor: `${colors.warning}40`
            };
        }
        return {
            text: 'MLDSA (No Chain Link)',
            color: colors.textFaded,
            bgColor: `${colors.containerBgFaded}`,
            borderColor: `${colors.containerBorder}`
        };
    };

    const renderConflictCard = (conflict: DuplicationConflict, selection: ConflictSelection | undefined) => {
        const explanation = getConflictExplanation(conflict);
        const isWalletDupe = conflict.type === 'WALLET_DUPLICATE';

        return (
            <Card
                key={conflict.conflictId}
                style={{
                    marginBottom: '12px',
                    borderColor: isWalletDupe ? `${colors.error}40` : `${colors.warning}40`
                }}>
                <Column gap="md">
                    {/* Conflict Header */}
                    <div
                        style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: isWalletDupe ? `${colors.error}10` : `${colors.warning}10`,
                            border: `1px solid ${isWalletDupe ? colors.error : colors.warning}30`
                        }}>
                        <Row itemsCenter gap="sm" style={{ marginBottom: '4px' }}>
                            <WarningOutlined
                                style={{
                                    color: isWalletDupe ? colors.error : colors.warning,
                                    fontSize: 14
                                }}
                            />
                            <Text
                                text={explanation.title}
                                preset="bold"
                                size="sm"
                                color={isWalletDupe ? 'error' : 'warning'}
                            />
                        </Row>
                        <Text text={explanation.subtitle} preset="sub" size="xs" style={{ marginBottom: '6px' }} />
                        <Text
                            text={`💡 ${explanation.recommendation}`}
                            size="xs"
                            style={{ color: colors.text, fontStyle: 'italic' }}
                        />

                        {/* Restore Button - shown when keypair can be automatically restored */}
                        {explanation.restorable && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreKeypair(conflict.conflictId, explanation.restorable!);
                                }}
                                disabled={restoringConflictId === conflict.conflictId}
                                style={{
                                    marginTop: '10px',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: `2px solid ${colors.success}`,
                                    background: `${colors.success}20`,
                                    color: colors.success,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: restoringConflictId === conflict.conflictId ? 'wait' : 'pointer',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    opacity: restoringConflictId === conflict.conflictId ? 0.7 : 1
                                }}>
                                {restoringConflictId === conflict.conflictId ? (
                                    '⏳ Restoring...'
                                ) : (
                                    <>🔧 Restore Matching Keypair</>
                                )}
                            </button>
                        )}
                    </div>

                    {!explanation.restorable && (
                        <Text text="Select which wallet to keep:" preset="sub" size="xs" />
                    )}

                    {/* Wallet Options - hide when restorable (only show restore button) */}
                    {!explanation.restorable && conflict.wallets.map((walletInfo, idx) => {
                        const badge = getMldsaBadge(walletInfo);
                        const isSelected = selection?.selectedWalletIndex === walletInfo.keyringIndex;
                        const keyringTypeLabel = walletInfo.keyringType === 'HD Key Tree' ? 'HD Wallet' : 'WIF Import';

                        return (
                            <div
                                key={walletInfo.keyringKey}
                                onClick={() => handleConflictSelection(conflict.conflictId, walletInfo.keyringIndex)}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: `2px solid ${isSelected ? colors.main : colors.containerBorder}`,
                                    background: isSelected ? `${colors.main}10` : colors.containerBgFaded,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}>
                                <Row justifyBetween itemsCenter>
                                    <Column gap="xs" style={{ flex: 1, minWidth: 0 }}>
                                        {/* Wallet Name & Type */}
                                        <Row itemsCenter gap="sm" style={{ flexWrap: 'wrap' }}>
                                            <Text
                                                text={walletInfo.alianName || `Wallet ${idx + 1}`}
                                                preset="bold"
                                                size="sm"
                                            />
                                            <div
                                                style={{
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    background: colors.containerBorder,
                                                    fontSize: '9px',
                                                    color: colors.textFaded
                                                }}>
                                                {keyringTypeLabel}
                                            </div>
                                        </Row>

                                        {/* Bitcoin Address */}
                                        <div style={{ marginTop: '2px' }}>
                                            <Text text="Bitcoin:" size="xxs" style={{ color: colors.textFaded }} />
                                            <Text
                                                text={walletInfo.address || 'Unknown address'}
                                                preset="sub"
                                                size="xs"
                                                style={{
                                                    fontFamily: 'monospace',
                                                    wordBreak: 'break-all',
                                                    fontSize: '10px'
                                                }}
                                            />
                                        </div>

                                        {/* MLDSA Status Badge */}
                                        <Row itemsCenter gap="sm" style={{ marginTop: '4px' }}>
                                            <div
                                                style={{
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: badge.bgColor,
                                                    border: `1px solid ${badge.borderColor}`,
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    color: badge.color
                                                }}>
                                                {badge.text}
                                            </div>
                                            {!walletInfo.mldsaPrivateKeyExists && (
                                                <Text
                                                    text="(Needs migration)"
                                                    size="xxs"
                                                    style={{ color: colors.error, fontStyle: 'italic' }}
                                                />
                                            )}
                                        </Row>
                                    </Column>

                                    {/* Radio Button */}
                                    <div
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: `2px solid ${isSelected ? colors.main : colors.containerBorder}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginLeft: '8px'
                                        }}>
                                        {isSelected && (
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
                        );
                    })}
                </Column>
            </Card>
        );
    };

    const renderResolveStep = () => {
        if (!detection) return null;

        const allConflicts = [...detection.walletDuplicates, ...detection.mldsaDuplicates];

        return (
            <Column gap="md" style={{ flex: 1, minHeight: 0 }}>
                <Text text="Resolve Conflicts" preset="title" textCenter />
                <Text
                    text="Select the correct wallet for each conflict. Wallets with on-chain verified MLDSA keys are marked."
                    preset="sub"
                    size="xs"
                    textCenter
                />

                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: '12px' }}>
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
            <Content style={{ display: 'flex', flexDirection: 'column' }}>
                <Column fullX style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {step < ResolutionStep.COMPLETE && renderStepIndicator()}
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        {renderCurrentStep()}
                    </div>
                </Column>
            </Content>
        </Layout>
    );
}
