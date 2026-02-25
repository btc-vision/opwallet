import { Column, Content, Header, Layout } from '@/ui/components';
import { RouteTypes, useNavigate } from '@/ui/pages/routeTypes';

const colors = {
    background: '#212121',
    textFaded: 'rgba(255, 255, 255, 0.5)',
    main: '#f37413'
};

export default function HistoryScreen() {
    const navigate = useNavigate();

    return (
        <Layout>
            <Header title="Transaction History" onBack={() => navigate(RouteTypes.MainScreen)} />

            <Content style={{ padding: '12px 16px', backgroundColor: colors.background }}>
                <Column>
                    <div
                        style={{
                            textAlign: 'center',
                            paddingTop: 80,
                            color: colors.textFaded
                        }}>
                        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: colors.main }}>
                            History not implemented yet
                        </div>
                        <div style={{ fontSize: 12 }}>Transaction history is temporarily disabled.</div>
                    </div>
                </Column>
            </Content>
        </Layout>
    );
}
