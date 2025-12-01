import React from 'react';
import { useNavigate } from 'react-router-dom';

const colors = {
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    buttonBorder: '#444746',
    buttonBorderHover: '#f37413',
    main: '#f37413',
    text: '#dbdbdb'
};

interface ActionButtonProps {
    label: string;
    icon: React.ReactNode;
    onClick?: (() => void) | React.MouseEventHandler<HTMLButtonElement>;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, icon }) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                aspectRatio: '1 / 1',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: colors.buttonHoverBg,
                border: `1px solid`,
                borderColor: colors.buttonBorder,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.buttonBg;
                e.currentTarget.style.borderColor = colors.main;
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.buttonHoverBg;
                e.currentTarget.style.borderColor = colors.buttonBorder;
                e.currentTarget.style.transform = 'translateY(0)';
            }}>
            <div
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '-5px',
                    justifyContent: 'center'
                }}>
                {icon}
            </div>
            <span
                style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: colors.text,
                    fontFamily: 'Inter-Regular, serif'
                }}>
                {label}
            </span>
        </button>
    );
};

export default ActionButton;
