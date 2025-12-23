import { Column, Content, Header, Layout } from '@/ui/components';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';
import { DollarOutlined, PictureOutlined } from '@ant-design/icons';
import { useState } from 'react';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030'
};

export enum ImportType {
    TOKEN = 'token',
    NFT = 'nft'
}

interface ImportOptionProps {
    type: ImportType;
    icon: React.ReactNode;
    title: string;
    description: string;
    isHovered: boolean;
    onHover: (type: ImportType | null) => void;
    onSelect: (type: ImportType) => void;
}

function ImportOption({ type, icon, title, description, isHovered, onHover, onSelect }: ImportOptionProps) {
    return (
        <button
            style={{
                width: '100%',
                background: colors.containerBgFaded,
                border: `1px solid ${isHovered ? colors.main : colors.containerBorder}`,
                borderRadius: '14px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered ? `0 4px 12px ${colors.main}20` : 'none'
            }}
            onClick={() => onSelect(type)}
            onMouseEnter={() => onHover(type)}
            onMouseLeave={() => onHover(null)}>
            <div
                style={{
                    width: '48px',
                    height: '48px',
                    background: colors.main,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                {icon}
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
                <div
                    style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: colors.text,
                        marginBottom: '4px'
                    }}>
                    {title}
                </div>
                <div
                    style={{
                        fontSize: '12px',
                        color: colors.textFaded
                    }}>
                    {description}
                </div>
            </div>
        </button>
    );
}

export default function ImportSelectionScreen() {
    const navigate = useNavigate();
    const [hoveredOption, setHoveredOption] = useState<ImportType | null>(null);

    const handleSelection = (type: ImportType) => {
        if (type === ImportType.TOKEN) {
            navigate(RouteTypes.ImportTokenScreen);
        } else {
            navigate(RouteTypes.ImportNFTScreen);
        }
    };

    return (
        <Layout>
            <Header title="Import Asset" onBack={() => navigate(RouteTypes.MainScreen)} />

            <Content style={{ padding: '16px' }}>
                <Column gap="lg">
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h2
                            style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                color: colors.text,
                                marginBottom: '8px'
                            }}>
                            What would you like to import?
                        </h2>
                        <p
                            style={{
                                fontSize: '12px',
                                color: colors.textFaded
                            }}>
                            Choose the type of asset to add to your wallet
                        </p>
                    </div>

                    <ImportOption
                        type={ImportType.TOKEN}
                        icon={<DollarOutlined style={{ fontSize: '24px', color: colors.background }} />}
                        title="OP_20 Token"
                        description="Import fungible tokens like MOTO, PILL, etc."
                        isHovered={hoveredOption === ImportType.TOKEN}
                        onHover={setHoveredOption}
                        onSelect={handleSelection}
                    />

                    <ImportOption
                        type={ImportType.NFT}
                        icon={<PictureOutlined style={{ fontSize: '24px', color: colors.background }} />}
                        title="OP_721 NFT Collection"
                        description="Import NFT collections to view and manage your NFTs"
                        isHovered={hoveredOption === ImportType.NFT}
                        onHover={setHoveredOption}
                        onSelect={handleSelection}
                    />
                </Column>
            </Content>
        </Layout>
    );
}
