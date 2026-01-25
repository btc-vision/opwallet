import React, { CSSProperties, useEffect } from 'react';

import { routePaths, RouteTypes } from '@/ui/pages/routeTypes';
import { useBooted, useIsUnlocked } from '@/ui/state/global/hooks';

import './index.less';

export interface LayoutProps {
    children?: React.ReactNode;
    style?: CSSProperties;
}

export function Layout(props: LayoutProps) {
    const isBooted = useBooted();
    const isUnlocked = useIsUnlocked();

    useEffect(() => {
        const unlockPath = routePaths[RouteTypes.UnlockScreen];
        if (isBooted && !isUnlocked && !location.href.includes(unlockPath)) {
            const basePath = location.href.split('#')[0];
            location.href = `${basePath}#${unlockPath}`;
            return;
        }
    }, [isBooted, isUnlocked]);

    const { children, style: $styleBase } = props;
    return (
        <div
            className="layout"
            style={Object.assign(
                {
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100vw',
                    height: '100vh',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                },
                $styleBase
            )}>
            {children}
        </div>
    );
}
