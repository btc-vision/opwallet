import React from 'react';

interface MempoolIconProps {
    size?: number;
}

const MempoolIcon: React.FC<MempoolIconProps> = ({ size }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            width={size}
            height={size}
            className="opacity-60 hover:opacity-100 transition">
            <path
                className="cls-1"
                d="M175.67,0H24.33C10.89,0,0,10.89,0,24.33v151.33c0,13.44,10.89,24.33,24.33,24.33h151.33c13.44,0,24.33-10.89,24.33-24.33V24.33c0-13.44-10.89-24.33-24.33-24.33ZM179.33,170.33c0,3.5-2.84,6.33-6.33,6.33h-21.67c-3.5,0-6.33-2.84-6.33-6.33V29.67c0-3.5,2.84-6.33,6.33-6.33h21.67c3.5,0,6.33,2.84,6.33,6.33v140.67Z"
            />
        </svg>
    );
};

export default MempoolIcon;
