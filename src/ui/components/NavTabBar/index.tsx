import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useUnreadAppSummary } from '@/ui/state/accounts/hooks';
import { TabOption } from '@/ui/state/global/reducer';
import { colors } from '@/ui/theme/colors';

import { BaseView } from '../BaseView';
import { Column } from '../Column';
import { Grid } from '../Grid';
import { Icon, IconTypes } from '../Icon';

export function NavTabBar({ tab }: { tab: TabOption }) {
    return (
        <Grid columns={2} style={{ width: '100%', height: '67.5px', backgroundColor: colors.bg2 }}>
            <TabButton tabName="home" icon="wallet" isActive={tab === 'home'} />
            <TabButton tabName="settings" icon="settings" isActive={tab === 'settings'} />
        </Grid>
    );
}

function TabButton({ tabName, icon, isActive }: { tabName: TabOption; icon: IconTypes; isActive: boolean }) {
    const navigate = useNavigate();
    const unreadApp = useUnreadAppSummary();
    //const readTab = useReadTab();
    return (
        <Column
            justifyCenter
            itemsCenter
            onClick={(e) => {
                if (tabName === 'home') {
                    navigate(RouteTypes.MainScreen);
                } /*else if (tabName === 'app') {
                    navigate(RouteTypes.AppTabScrren);
                    readTab('app');
                }*/ else if (tabName === 'settings') {
                    navigate(RouteTypes.SettingsTabScreen);
                }
            }}>
            <Icon icon={icon} color={isActive ? 'white' : 'white_muted'} />
            <BaseView style={{ position: 'relative' }}>
                {tabName === 'app' && unreadApp && (
                    <BaseView
                        style={{
                            position: 'absolute',
                            bottom: 20,
                            left: 5,
                            width: 5,
                            height: 5,
                            backgroundColor: 'red',
                            borderRadius: '50%'
                        }}></BaseView>
                )}
            </BaseView>
        </Column>
    );
}
