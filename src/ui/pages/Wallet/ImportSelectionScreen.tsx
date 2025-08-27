import { useState } from 'react';
import { Column, Content, Header, Layout } from '@/ui/components';
import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';

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

export default function ImportSelectionScreen() {
    const navigate = useNavigate();
    const [hoveredOption, setHoveredOption] = useState<ImportType | null>(null);

    const handleSelection = (type: ImportType) => {
        if (type === ImportType.TOKEN) {
            // Go back and trigger token import modal
            navigate(RouteTypes.MainScreen);
            // You'll need to pass a flag or use state to open the token import modal
            setTimeout(() => {
                const importBtn = document.querySelector('[data-import-token-trigger]');
                if (importBtn) (importBtn as HTMLElement).click();
            }, 100);
        } else {
            navigate(RouteTypes.ImportNFTScreen);
        }
    };

    const ImportOption = ({
        type,
        icon,
        title,
        description
    }: {
        type: ImportType;
        icon: string;
        title: string;
        description: string;
    }) => (
        <button
            style={{
                width: '100%',
                background: colors.containerBgFaded,
                border: `1px solid ${hoveredOption === type ? colors.main : colors.containerBorder}`,
                borderRadius: '14px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transform: hoveredOption === type ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hoveredOption === type ? `0 4px 12px ${colors.main}20` : 'none'
            }}
            onClick={() => handleSelection(type)}
            onMouseEnter={() => setHoveredOption(type)}
            onMouseLeave={() => setHoveredOption(null)}>
            <div
                style={{
                    width: '48px',
                    height: '48px',
                    background: colors.main,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
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

    return (
        <Layout>
            <Header title="Import Asset" onBack={() => window.history.go(-1)} />

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
                        icon="🪙"
                        title="OP20 Token"
                        description="Import fungible tokens like MOTO, wBTC, etc."
                    />

                    <ImportOption
                        type={ImportType.NFT}
                        icon="🎨"
                        title="OP721 NFT Collection"
                        description="Import NFT collections to view and manage your NFTs"
                    />
                </Column>
            </Content>
        </Layout>
    );
}
