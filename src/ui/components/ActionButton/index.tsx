import React from 'react';

const colors = {
    main: '#f37413',
    mainDark: '#d5640f',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.55)',
    containerBorder: '#303030',
    bg: '#292929'
};

interface ActionButtonProps {
    label: string;
    icon: React.ReactNode;
    onClick?: (() => void) | React.MouseEventHandler<HTMLButtonElement>;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, icon }) => {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '4px 4px 4px',
                background: 'transparent',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
                const circle = e.currentTarget.querySelector('[data-icon-circle]') as HTMLElement | null;
                if (circle) {
                    circle.style.background = `linear-gradient(135deg, ${colors.main} 0%, ${colors.mainDark} 100%)`;
                    circle.style.borderColor = colors.main;
                    circle.style.transform = 'scale(1.08)';
                    circle.style.boxShadow = `0 4px 16px ${colors.main}40`;
                }
                const lbl = e.currentTarget.querySelector('[data-label]') as HTMLElement | null;
                if (lbl) lbl.style.color = colors.text;
            }}
            onMouseLeave={(e) => {
                const circle = e.currentTarget.querySelector('[data-icon-circle]') as HTMLElement | null;
                if (circle) {
                    circle.style.background = colors.bg;
                    circle.style.borderColor = colors.containerBorder;
                    circle.style.transform = 'scale(1)';
                    circle.style.boxShadow = 'none';
                }
                const lbl = e.currentTarget.querySelector('[data-label]') as HTMLElement | null;
                if (lbl) lbl.style.color = colors.textFaded;
            }}>
            <div
                data-icon-circle=""
                style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: colors.bg,
                    border: `1.5px solid ${colors.containerBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.25s ease'
                }}>
                {icon}
            </div>
            <span
                data-label=""
                style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: colors.textFaded,
                    fontFamily: 'Inter-Regular, serif',
                    transition: 'color 0.2s'
                }}>
                {label}
            </span>
        </button>
    );
};

export default ActionButton;
