import React from 'react';

import { CloseOutlined } from '@ant-design/icons';

import { Row } from '../Row';

export const Popover = ({
    children,
    onClose,
    style
}: {
    children: React.ReactNode;
    onClose?: () => void;
    style?: React.CSSProperties;
}) => {
    return (
        <div
            className="popover-container"
            style={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                ...style
            }}>
            <div
                style={{ backgroundColor: '#181A1F', width: 340, padding: 20, borderRadius: 15, position: 'relative' }}>
                {onClose && (
                    <Row
                        style={{ position: 'absolute', top: 10, right: 10 }}
                        justifyEnd
                        onClick={() => {
                            onClose();
                        }}>
                        <CloseOutlined />
                    </Row>
                )}

                {children}
            </div>
        </div>
    );
};
