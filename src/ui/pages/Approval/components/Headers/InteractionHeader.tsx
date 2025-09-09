import { SignInteractionApprovalParams } from '@/shared/types/Approval';
import { ContractInformation } from '@/shared/web3/interfaces/ContractInformation';
import { ContractNames } from '@/shared/web3/metadata/ContractNames';
import { FileTextOutlined } from '@ant-design/icons';

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
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    info: '#3b82f6'
};

export interface Props {
    params: SignInteractionApprovalParams;
}

export const InteractionHeader = ({
    contract,
    contractInfo
}: {
    contract: string;
    contractInfo?: ContractInformation;
}) => {
    const contractName = contractInfo?.name || ContractNames[contract] || 'Unknown Contract';
    const shortAddress = `${contract.slice(0, 8)}...${contract.slice(-6)}`;

    return (
        <div
            style={{
                background: `linear-gradient(135deg, ${colors.main}10 0%, ${colors.main}05 100%)`,
                border: `1px solid ${colors.main}20`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px'
            }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                {contractInfo?.logo ? (
                    <img
                        src={contractInfo.logo}
                        alt={contractName}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px'
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            background: colors.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                        <FileTextOutlined style={{ fontSize: 20, color: colors.background }} />
                    </div>
                )}

                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: colors.text,
                            marginBottom: '2px'
                        }}>
                        {contractName}
                    </div>
                    <div
                        style={{
                            fontSize: '11px',
                            color: colors.textFaded,
                            fontFamily: 'monospace'
                        }}>
                        {shortAddress}
                    </div>
                </div>
            </div>
        </div>
    );
};
