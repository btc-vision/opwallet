import { RouteTypes, useNavigate } from '@/ui/pages/MainRoute';
import { useUnreadAppSummary } from '@/ui/state/accounts/hooks';
import { TabOption } from '@/ui/state/global/reducer';
import { colors } from '@/ui/theme/colors';

import PartnerIcon from '@/ui/components/Icon/PartnerIcon';
import { BaseView } from '../BaseView';
import { Grid } from '../Grid';
import { Icon, IconTypes } from '../Icon';

export function NavTabBar({ tab }: { tab: TabOption }) {
    return (
        <Grid
            columns={2}
            style={{
                width: '100%',
                height: '50px',
                backgroundColor: colors.bg2,
                borderTop: `1px solid ${colors.border}`
            }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start'
                }}>
                <button
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '1 / 1',
                        color: colors.text,
                        fill: colors.text
                    }}>
                    <PartnerIcon icon="OPScan" size={16} />
                </button>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    justifyContent: 'flex-end'
                }}>
                <TabButton tabName="home" icon="wallet" isActive={tab === 'home'} />
                <TabButton tabName="nft" icon="grid" isActive={tab === 'nft'} />
                <TabButton tabName="settings" icon="settings" isActive={tab === 'settings'} />
            </div>
        </Grid>
    );
}

function TabButton({ tabName, icon, isActive }: { tabName: TabOption; icon: IconTypes; isActive: boolean }) {
    const navigate = useNavigate();
    const unreadApp = useUnreadAppSummary();

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: '1 / 1',
                cursor: 'pointer'
            }}
            onClick={() => {
                if (tabName === 'home') {
                    navigate(RouteTypes.MainScreen);
                } else if (tabName === 'nft') {
                    navigate(RouteTypes.NFTTabScreen);
                } else if (tabName === 'settings') {
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
        </div>
    );
}
