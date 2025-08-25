import React from 'react';
import OPScan from './directory/OPScan';
import MempoolIcon from './directory/Mempool';

interface PartnerIconProps {
    icon: string;
    size: number;
}

const PartnerIcon: React.FC<PartnerIconProps> = ({ icon, size }) => {
    switch (icon) {
        case 'OPScan':
            return <OPScan size={size} />;
        case 'Mempool':
            return <MempoolIcon size={size} />;
    }

    return <OPScan size={size} />;
};

export default PartnerIcon;
