import { deserializePreSignedInteractionData, ParsedTxOutput } from '@/background/service/notification';
import { SignInteractionApprovalParams } from '@/shared/types/Approval';
import { selectorToString } from '@/shared/web3/decoder/CalldataDecoder';
import Web3API from '@/shared/web3/Web3API';
import { Button, Content, Footer, Layout, OPNetTransactionFlow, Row } from '@/ui/components';
import { DeserializedPreSignedData } from '@/ui/components/TxBowtieGraph/OPNetTransactionFlow';
import { decodeCallData } from '@/ui/pages/OpNet/decoded/decodeCallData';
import { DecodedCalldata } from '@/ui/pages/OpNet/decoded/DecodedCalldata';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useApproval } from '@/ui/utils/hooks';
import { useWallet } from '@/ui/utils/WalletContext';
import { CodeOutlined, DownOutlined, EditOutlined, RightOutlined, ThunderboltOutlined, WarningOutlined } from '@ant-design/icons';
import { Address } from '@btc-vision/transaction';
import { useEffect, useMemo, useState } from 'react';
import { Decoded } from '../../OpNet/decoded/DecodedTypes';
import { InteractionHeader } from './Headers/InteractionHeader';
import { ChangeFeeRate } from './SignInteraction/ChangeFeeRate';
import { ChangePriorityFee } from './SignInteraction/ChangePriorityFee';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    success: '#4ade80'
};

// Helper to shorten address for display
function shortAddress(address: string, chars = 6): string {
    if (address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export interface Props {
    params: SignInteractionApprovalParams;
}

export default function SignInteraction(props: Props) {
    const {
        params: { data }
    } = props;

    const { resolveApproval, rejectApproval } = useApproval();
    const wallet = useWallet();
    const unitBtc = useBTCUnit();

    const [interactionParameters, setInteractionParameters] = useState(data.interactionParameters);
    const [isInteractionParametersChanged, setIsInteractionParametersChanged] = useState(false);
    const [isFeeRateModalOpen, setIsFeeRateModalOpen] = useState(false);
    const [isPriorityFeeModalOpen, setIsPriorityFeeModalOpen] = useState(false);
    const [preSignedData, setPreSignedData] = useState<DeserializedPreSignedData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userAddresses, setUserAddresses] = useState<Set<string>>(new Set());
    const [isTxFlowExpanded, setIsTxFlowExpanded] = useState(true);

    // Fetch all user addresses (main, csv75, csv2, csv1, p2wda, p2tr) for change detection
    useEffect(() => {
        const fetchUserAddresses = async () => {
            try {
                const account = await wallet.getCurrentAccount();
                const addresses = new Set<string>();

                // Add main address (could be any type)
                addresses.add(account.address.toLowerCase());

                // Derive all address types from pubkey
                if (account.pubkey) {
                    const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
                    const addressInst = Address.fromString(zeroHash, account.pubkey);

                    // Add all derived addresses - CSV, p2wda, and p2tr
                    try {
                        addresses.add(addressInst.toCSV(75, Web3API.network).address.toLowerCase());
                    } catch { /* ignore if derivation fails */ }
                    try {
                        addresses.add(addressInst.toCSV(2, Web3API.network).address.toLowerCase());
                    } catch { /* ignore if derivation fails */ }
                    try {
                        addresses.add(addressInst.toCSV(1, Web3API.network).address.toLowerCase());
                    } catch { /* ignore if derivation fails */ }
                    try {
                        addresses.add(addressInst.p2wda(Web3API.network).address.toLowerCase());
                    } catch { /* ignore if derivation fails */ }
                    try {
                        // Also add p2tr (taproot) address
                        addresses.add(addressInst.p2tr(Web3API.network).toLowerCase());
                    } catch { /* ignore if derivation fails */ }
                }

                setUserAddresses(addresses);
            } catch (e) {
                console.error('Failed to fetch user addresses:', e);
            }
        };

        void fetchUserAddresses();
    }, [wallet]);

    // Trigger pre-signing and fetch pre-signed transaction data for preview
    useEffect(() => {
        let isMounted = true;
        let pollCount = 0;
        const maxPolls = 30;

        // Trigger pre-signing when component mounts
        // This runs in the background and stores the result in notification service
        wallet.triggerPreSignInteraction();

        const fetchPreSignedData = async () => {
            try {
                const serializedData = await wallet.getPreSignedDataForPreview();
                if (isMounted) {
                    if (serializedData) {
                        // Deserialize BigInt values from strings
                        const deserializedData = deserializePreSignedInteractionData(serializedData);
                        setPreSignedData(deserializedData);
                        setIsLoading(false);
                    } else if (pollCount < maxPolls) {
                        pollCount++;
                        setTimeout(fetchPreSignedData, 1000);
                    } else {
                        setIsLoading(false);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch pre-signed data:', e);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchPreSignedData();

        return () => {
            isMounted = false;
        };
    }, [wallet]);

    const contractInfo = data.contractInfo;
    const to: string = interactionParameters.to;
    const interactionType = selectorToString(interactionParameters.calldata as unknown as string);
    const decoded: Decoded | null = decodeCallData(interactionParameters.calldata as unknown as string);
    const chain = data.network;
    const gasSatFee = interactionParameters.gasSatFee;
    const optionalOutputs = interactionParameters.optionalOutputs;
    const feeRate = interactionParameters.feeRate;
    const priorityFee = interactionParameters.priorityFee;

    // Analyze outputs: identify which go to user (change) vs external (payments/fees)
    // SECURITY: We must check against ALL user addresses (main, csv75, csv2, csv1, p2wda)
    // because inputs can come from any source and change can go to any user address
    const outputAnalysis = useMemo(() => {
        if (!preSignedData || userAddresses.size === 0) {
            // Fallback estimate when pre-signed data not available
            const optionalOutputsTotal = (optionalOutputs ?? []).reduce(
                (sum, output) => sum + BigInt(output.value),
                0n
            );
            return {
                totalCost: Number(
                    BigInt(gasSatFee as unknown as string) +
                        BigInt(priorityFee as unknown as string) +
                        optionalOutputsTotal
                ),
                changeOutputs: [] as ParsedTxOutput[],
                externalOutputs: [] as ParsedTxOutput[],
                totalChange: 0n,
                totalExternal: 0n,
                isActual: false
            };
        }

        const fundingTx = preSignedData.fundingTx;
        const interactionTx = preSignedData.interactionTx;

        // Total inputs = funding tx inputs (what user is spending)
        // Values are now properly deserialized as BigInt
        const totalInputs = fundingTx ? fundingTx.totalInputValue : interactionTx.totalInputValue;

        // Analyze all outputs (skip first which is epoch miner)
        const outputs = interactionTx.outputs.slice(1).filter((o) => !o.isOpReturn);

        const changeOutputs: ParsedTxOutput[] = [];
        const externalOutputs: ParsedTxOutput[] = [];
        let totalChange = 0n;
        let totalExternal = 0n;

        for (const output of outputs) {
            const outputAddr = output.address?.toLowerCase();
            const isUserAddress = outputAddr ? userAddresses.has(outputAddr) : false;

            if (isUserAddress) {
                changeOutputs.push(output);
                totalChange += output.value;
            } else {
                externalOutputs.push(output);
                totalExternal += output.value;
            }
        }

        // Total cost = inputs - change going back to user
        const totalCost = Number(totalInputs - totalChange);

        return {
            totalCost,
            changeOutputs,
            externalOutputs,
            totalChange,
            totalExternal,
            isActual: true
        };
    }, [preSignedData, userAddresses, gasSatFee, priorityFee, optionalOutputs]);

    const handleCancel = async () => {
        await rejectApproval('User rejected the request.');
    };

    const handleConfirm = async () => {
        await resolveApproval(undefined, isInteractionParametersChanged ? interactionParameters : undefined);
        if (isInteractionParametersChanged) {
            setInteractionParameters(data.interactionParameters);
            setIsInteractionParametersChanged(false);
        }
    };

    const setFeeRate = (newFeeRate: number) => {
        setInteractionParameters((prev) => ({
            ...prev,
            feeRate: newFeeRate
        }));
        setIsInteractionParametersChanged(true);
    };

    const setPriorityFee = (newPriorityFee: bigint) => {
        setInteractionParameters((prev) => ({
            ...prev,
            priorityFee: newPriorityFee
        }));
        setIsInteractionParametersChanged(true);
    };

    return (
        <Layout>
            {isFeeRateModalOpen && (
                <ChangeFeeRate
                    onClose={() => setIsFeeRateModalOpen(false)}
                    setSetting={setFeeRate}
                    setting={feeRate.toString()}
                />
            )}

            {isPriorityFeeModalOpen && (
                <ChangePriorityFee
                    onClose={() => setIsPriorityFeeModalOpen(false)}
                    setSetting={setPriorityFee}
                    setting={priorityFee.toLocaleString()}
                />
            )}

            <Content style={{ padding: '12px', overflowY: 'auto' }}>
                {/* Contract Header */}
                <InteractionHeader contract={to} contractInfo={contractInfo} />

                {/* Interaction Details */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '12px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.textFaded,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <CodeOutlined style={{ fontSize: 10 }} />
                        Interaction Type
                    </div>

                    {decoded ? (
                        <DecodedCalldata
                            decoded={decoded}
                            contractInfo={contractInfo}
                            interactionType={interactionType}
                            chain={chain}
                        />
                    ) : (
                        <div
                            style={{
                                padding: '8px',
                                background: colors.inputBg,
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: colors.text,
                                fontFamily: 'monospace',
                                wordBreak: 'break-all'
                            }}>
                            {interactionType}
                        </div>
                    )}
                </div>

                {/* Transaction Flow Visualization - Collapsible */}
                <div style={{ marginBottom: '12px' }}>
                    {/* Collapsible Header */}
                    <div
                        onClick={() => setIsTxFlowExpanded(!isTxFlowExpanded)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 4px',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: colors.textFaded,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                            <CodeOutlined style={{ fontSize: 10 }} />
                            Transaction Flow
                        </div>
                        {isTxFlowExpanded ? (
                            <DownOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                        ) : (
                            <RightOutlined style={{ fontSize: 10, color: colors.textFaded }} />
                        )}
                    </div>

                    {/* Collapsible Content */}
                    {isTxFlowExpanded && (
                        <OPNetTransactionFlow
                            preSignedData={preSignedData}
                            contractAddress={to}
                            contractInfo={contractInfo}
                            calldata={interactionParameters.calldata as unknown as string}
                            isLoading={isLoading}
                            width={340}
                        />
                    )}
                </div>

                {/* Fee Settings */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '12px'
                    }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: colors.textFaded,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                        <ThunderboltOutlined style={{ fontSize: 10 }} />
                        Fee Settings
                    </div>

                    {/* Priority Fee */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px',
                            background: colors.inputBg,
                            borderRadius: '8px',
                            marginBottom: '8px'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: colors.text }}>Priority Fee</span>
                            <button
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex'
                                }}
                                onClick={() => setIsPriorityFeeModalOpen(true)}>
                                <EditOutlined style={{ fontSize: 12, color: colors.main }} />
                            </button>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: colors.main }}>
                            {Number(priorityFee).toLocaleString()}
                            <span style={{ fontSize: '10px', color: colors.textFaded, marginLeft: '4px' }}>sat</span>
                        </div>
                    </div>

                    {/* Fee Rate */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px',
                            background: colors.inputBg,
                            borderRadius: '8px'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: colors.text }}>Fee Rate</span>
                            <button
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex'
                                }}
                                onClick={() => setIsFeeRateModalOpen(true)}>
                                <EditOutlined style={{ fontSize: 12, color: colors.main }} />
                            </button>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: colors.main }}>
                            {feeRate}
                            <span style={{ fontSize: '10px', color: colors.textFaded, marginLeft: '4px' }}>sat/vB</span>
                        </div>
                    </div>
                </div>

                {/* Total Cost Summary */}
                <div
                    style={{
                        background: `linear-gradient(135deg, ${colors.main}15 0%, ${colors.main}08 100%)`,
                        border: `1px solid ${colors.main}30`,
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '12px'
                    }}>
                    <div
                        style={{
                            textAlign: 'center',
                            marginBottom:
                                outputAnalysis.changeOutputs.length > 0 || outputAnalysis.externalOutputs.length > 0
                                    ? '10px'
                                    : '0'
                        }}>
                        <div
                            style={{
                                fontSize: '11px',
                                color: colors.textFaded,
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}>
                            Total Transaction Cost
                            {outputAnalysis.isActual ? (
                                <span style={{ fontSize: '9px', color: colors.success, fontWeight: 600 }}>ACTUAL</span>
                            ) : (
                                <span style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 600 }}>~EST</span>
                            )}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: colors.main }}>
                            {(outputAnalysis.totalCost / 1e8).toFixed(8).replace(/\.?0+$/, '')} {unitBtc}
                        </div>
                    </div>

                    {/* Refund Info - Show where user's change goes (outputs to user addresses) */}
                    {outputAnalysis.changeOutputs.length > 0 && (
                        <div
                            style={{
                                padding: '8px 10px',
                                background: `${colors.success}10`,
                                border: `1px solid ${colors.success}25`,
                                borderRadius: '8px',
                                marginBottom: outputAnalysis.externalOutputs.length > 0 ? '8px' : '0'
                            }}>
                            <div style={{ fontSize: '10px', color: colors.textFaded, marginBottom: '4px' }}>
                                Refund to your address{outputAnalysis.changeOutputs.length > 1 ? 'es' : ''}
                            </div>
                            {outputAnalysis.changeOutputs.map((output, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: idx > 0 ? '4px' : '0'
                                    }}>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: colors.success,
                                            fontFamily: 'monospace',
                                            fontWeight: 500
                                        }}
                                        title={output.address || ''}>
                                        {shortAddress(output.address || 'Unknown', 8)}
                                    </span>
                                    <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>
                                        +{(Number(output.value) / 1e8).toFixed(8).replace(/\.?0+$/, '')} {unitBtc}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Warning: External outputs (not going to user addresses) */}
                    {outputAnalysis.externalOutputs.length > 0 && (
                        <div
                            style={{
                                padding: '8px 10px',
                                background: '#fbbf2415',
                                border: '1px solid #fbbf2430',
                                borderRadius: '8px'
                            }}>
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: '#fbbf24',
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                <WarningOutlined style={{ fontSize: 10 }} />
                                External output{outputAnalysis.externalOutputs.length > 1 ? 's' : ''} (not your address)
                            </div>
                            {outputAnalysis.externalOutputs.map((output, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: idx > 0 ? '4px' : '0'
                                    }}>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            color: '#fbbf24',
                                            fontFamily: 'monospace',
                                            fontWeight: 500
                                        }}
                                        title={output.address || ''}>
                                        {shortAddress(output.address || 'Script', 8)}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
                                        -{(Number(output.value) / 1e8).toFixed(8).replace(/\.?0+$/, '')} {unitBtc}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Spacer for fixed footer */}
                <div style={{ height: '70px' }} />
            </Content>

            <Footer style={{ padding: '12px' }}>
                <Row full style={{ gap: '8px' }}>
                    <Button
                        text="Reject"
                        full
                        preset="default"
                        onClick={handleCancel}
                        style={{
                            background: colors.buttonBg,
                            border: `1px solid ${colors.containerBorder}`,
                            color: colors.text
                        }}
                    />
                    <Button
                        text="Sign"
                        full
                        preset="primary"
                        onClick={handleConfirm}
                        style={{
                            background: colors.main,
                            color: colors.background,
                            fontWeight: 600
                        }}
                    />
                </Row>
            </Footer>
        </Layout>
    );
}
