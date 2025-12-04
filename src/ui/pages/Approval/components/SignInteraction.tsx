import { PreSignedInteractionData } from '@/background/service/notification';
import { SignInteractionApprovalParams } from '@/shared/types/Approval';
import { selectorToString } from '@/shared/web3/decoder/CalldataDecoder';
import { Button, Content, Footer, Layout, OPNetTransactionFlow, Row } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { decodeCallData } from '@/ui/pages/OpNet/decoded/decodeCallData';
import { DecodedCalldata } from '@/ui/pages/OpNet/decoded/DecodedCalldata';
import { useBTCUnit } from '@/ui/state/settings/hooks';
import { useApproval } from '@/ui/utils/hooks';
import { useWallet } from '@/ui/utils/WalletContext';
import {
    CodeOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
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
    warning: '#fbbf24'
};

export interface Props {
    params: SignInteractionApprovalParams;
}

export default function SignInteraction(props: Props) {
    const {
        params: { data, session }
    } = props;

    const { resolveApproval, rejectApproval } = useApproval();
    const wallet = useWallet();
    const unitBtc = useBTCUnit();

    const [interactionParameters, setInteractionParameters] = useState(data.interactionParameters);
    const [isInteractionParametersChanged, setIsInteractionParametersChanged] = useState(false);
    const [isFeeRateModalOpen, setIsFeeRateModalOpen] = useState(false);
    const [isPriorityFeeModalOpen, setIsPriorityFeeModalOpen] = useState(false);
    const [preSignedData, setPreSignedData] = useState<PreSignedInteractionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch pre-signed transaction data for preview
    useEffect(() => {
        let isMounted = true;
        let pollCount = 0;
        const maxPolls = 30;

        const fetchPreSignedData = async () => {
            try {
                const data = await wallet.getPreSignedDataForPreview();
                if (isMounted) {
                    if (data) {
                        setPreSignedData(data);
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

    const totalCost =
        Number(gasSatFee) +
        Number(priorityFee) +
        (optionalOutputs ?? []).reduce((sum, output) => sum + output.value, 0);

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

            <Content style={{ padding: '12px' }}>
                {/* Website Bar */}
                <WebsiteBar session={session} />

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

                {/* Transaction Flow Visualization - Multi-TX Bowtie */}
                <div style={{ marginBottom: '12px' }}>
                    <OPNetTransactionFlow
                        preSignedData={preSignedData}
                        contractAddress={to}
                        contractInfo={contractInfo}
                        calldata={interactionParameters.calldata as unknown as string}
                        isLoading={isLoading}
                        width={340}
                    />
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
                        marginBottom: '12px',
                        textAlign: 'center'
                    }}>
                    <div style={{ fontSize: '11px', color: colors.textFaded, marginBottom: '4px' }}>
                        Total Transaction Cost
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: colors.main }}>
                        {(totalCost / 1e8).toFixed(8).replace(/\.?0+$/, '')} {unitBtc}
                    </div>
                </div>

                {/* Warning */}
                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        padding: '10px',
                        background: `${colors.warning}10`,
                        border: `1px solid ${colors.warning}30`,
                        borderRadius: '8px',
                        marginBottom: '12px'
                    }}>
                    <ExclamationCircleOutlined
                        style={{ fontSize: 14, color: colors.warning, flexShrink: 0, marginTop: '1px' }}
                    />
                    <div style={{ fontSize: '11px', color: colors.text, lineHeight: '1.4' }}>
                        Only sign this transaction if you fully understand the content and trust the requesting site.
                    </div>
                </div>
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
