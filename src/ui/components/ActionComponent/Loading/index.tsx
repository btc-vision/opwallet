import { CSSProperties } from 'react';

import { OPNetLoader } from '../../OPNetLoader';
import './index.less';

export interface LoadingProps {
    text?: string;
    onClose?: () => void;
}

const $baseViewStyle: CSSProperties = {
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(33,33,33,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
};

export function Loading(props: LoadingProps) {
    const { text } = props;
    return (
        <div className="loading-container">
            <div style={$baseViewStyle}>
                <OPNetLoader size={120} text={text} />
            </div>
        </div>
    );
}
