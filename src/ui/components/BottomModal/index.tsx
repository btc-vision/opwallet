import React from 'react';

export const BottomModal = ({
                                children,
                                onClose,
                            }: {
    children: React.ReactNode;
    onClose?: () => void;
}) => {
    return (
        <div
            className="popover-container"
            style={{
                backgroundColor: 'rgba(33,33,33,0.74)',
                backdropFilter: 'blur(10px)',
            }}>
            <div
                className="fade-in-up"
                style={{
                    borderTop: '1px solid #444746',
                    backgroundColor: '#1a1a1a',
                    width: '100%',
                    padding: 20,
                    position: 'fixed',
                    bottom: 0,
                }}>
                {children}
            </div>
        </div>
    );
};
