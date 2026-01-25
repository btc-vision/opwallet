import { CheckCircleFilled } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { Row } from '../Row';
import './index.less';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBg: '#434343',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    disabled: 'rgba(255, 255, 255, 0.3)'
};

interface TabProps {
    key: string | number;
    label: string;
    hidden?: boolean;
    icon?: React.ReactNode;
}

interface TabBarProps {
    defaultActiveKey?: string | number;
    activeKey?: string | number;
    items: TabProps[];
    onTabClick: (key: string | number | undefined) => void;
    progressEnabled?: boolean;
    preset?: 'number-page' | 'default' | 'style1' | 'style2' | 'pills' | 'underline' | 'segment';
}

export function TabBar(props: TabBarProps) {
    const { items, defaultActiveKey, activeKey, onTabClick, progressEnabled, preset = 'default' } = props;
    const [tabKey, setTabKey] = useState(defaultActiveKey);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const curIndex = items.findIndex((v) => v.key === tabKey);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync progress with tab key
        setProgress(curIndex);
        onTabClick(tabKey);
    }, [tabKey, items, onTabClick]);

    // Track previous activeKey for controlled component sync
    const [prevActiveKey, setPrevActiveKey] = useState(activeKey);
    if (activeKey !== prevActiveKey) {
        setPrevActiveKey(activeKey);
        if (activeKey !== tabKey) {
            setTabKey(activeKey);
            const curIndex = items.findIndex((v) => v.key === activeKey);
            setProgress(curIndex);
        }
    }

    // Number Page Style (Step indicator)
    if (preset === 'number-page') {
        return (
            <Row style={{ gap: '8px', alignItems: 'center' }}>
                {items.map((v, index) => {
                    const isActive = v.key === tabKey;
                    const isPast = progressEnabled ? index < progress : false;
                    const isDisabled = progressEnabled && index > progress;

                    return (
                        <div key={v.key} style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: isActive ? colors.main : isPast ? colors.success : colors.buttonHoverBg,
                                    border: `2px solid ${isActive ? colors.main : isPast ? colors.success : colors.containerBorder}`,
                                    color: isActive || isPast ? colors.background : colors.text,
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isDisabled ? 0.5 : 1,
                                    transition: 'all 0.3s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onClick={() => !isDisabled && setTabKey(v.key)}
                                disabled={isDisabled}>
                                {isPast && !isActive ? (
                                    <CheckCircleFilled style={{ fontSize: 16, color: colors.background }} />
                                ) : (
                                    v.label
                                )}
                            </button>
                            {index < items.length - 1 && (
                                <div
                                    style={{
                                        width: '40px',
                                        height: '2px',
                                        background: index < progress ? colors.success : colors.containerBorder,
                                        margin: '0 8px',
                                        transition: 'background 0.3s'
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </Row>
        );
    }

    // Pills Style (Rounded buttons)
    if (preset === 'pills') {
        return (
            <div
                style={{
                    background: colors.containerBgFaded,
                    borderRadius: '12px',
                    padding: '4px',
                    display: 'inline-flex',
                    gap: '4px'
                }}>
                {items.map((v, index) => {
                    if (v.hidden) return null;
                    const isSelected = v.key === tabKey;
                    const isDisabled = progressEnabled && index > progress;

                    return (
                        <button
                            key={v.key}
                            style={{
                                padding: '8px 16px',
                                background: isSelected ? colors.main : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: isSelected ? colors.background : isDisabled ? colors.disabled : colors.text,
                                fontSize: '13px',
                                fontWeight: isSelected ? 600 : 500,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter-Regular, serif',
                                opacity: isDisabled ? 0.5 : 1
                            }}
                            onClick={() => !isDisabled && setTabKey(v.key)}
                            disabled={isDisabled}
                            onMouseEnter={(e) => {
                                if (!isSelected && !isDisabled) {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}>
                            {v.label}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Underline Style
    if (preset === 'underline') {
        return (
            <div
                style={{
                    borderBottom: `1px solid ${colors.containerBorder}`,
                    display: 'flex',
                    gap: '24px',
                    position: 'relative'
                }}>
                {items.map((v, index) => {
                    if (v.hidden) return null;
                    const isSelected = v.key === tabKey;
                    const isDisabled = progressEnabled && index > progress;

                    return (
                        <button
                            key={v.key}
                            style={{
                                padding: '12px 4px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: `2px solid ${isSelected ? colors.main : 'transparent'}`,
                                marginBottom: '-1px',
                                color: isSelected ? colors.main : isDisabled ? colors.disabled : colors.text,
                                fontSize: '14px',
                                fontWeight: isSelected ? 600 : 500,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter-Regular, serif',
                                opacity: isDisabled ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onClick={() => !isDisabled && setTabKey(v.key)}
                            disabled={isDisabled}>
                            {v.icon && <span style={{ fontSize: '16px' }}>{v.icon}</span>}
                            {v.label}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Segment Style (Connected buttons)
    if (preset === 'segment') {
        return (
            <div
                style={{
                    display: 'inline-flex',
                    border: `1px solid ${colors.containerBorder}`,
                    borderRadius: '10px',
                    overflow: 'hidden'
                }}>
                {items.map((v, index) => {
                    if (v.hidden) return null;
                    const isSelected = v.key === tabKey;
                    const isDisabled = progressEnabled && index > progress;

                    return (
                        <button
                            key={v.key}
                            style={{
                                padding: '10px 20px',
                                background: isSelected ? colors.main : colors.buttonHoverBg,
                                border: 'none',
                                borderRight: index < items.length - 1 ? `1px solid ${colors.containerBorder}` : 'none',
                                color: isSelected ? colors.background : isDisabled ? colors.disabled : colors.text,
                                fontSize: '13px',
                                fontWeight: isSelected ? 600 : 500,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter-Regular, serif',
                                opacity: isDisabled ? 0.5 : 1
                            }}
                            onClick={() => !isDisabled && setTabKey(v.key)}
                            disabled={isDisabled}
                            onMouseEnter={(e) => {
                                if (!isSelected && !isDisabled) {
                                    e.currentTarget.style.background = colors.buttonBg;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                }
                            }}>
                            {v.label}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Style1 (Simple tabs with spacing)
    if (preset === 'style1') {
        return (
            <Row style={{ gap: '24px' }}>
                {items.map((v, index) => {
                    const isSelected = v.key === tabKey;
                    const isDisabled = progressEnabled && index > progress;

                    return (
                        <button
                            key={v.key}
                            style={{
                                padding: '8px 4px',
                                background: 'transparent',
                                border: 'none',
                                color: isSelected ? colors.main : isDisabled ? colors.disabled : colors.text,
                                fontSize: '14px',
                                fontWeight: isSelected ? 600 : 500,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter-Regular, serif',
                                opacity: isDisabled ? 0.5 : 1,
                                position: 'relative'
                            }}
                            onClick={() => !isDisabled && setTabKey(v.key)}
                            disabled={isDisabled}>
                            {v.label}
                            {isSelected && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: colors.main,
                                        borderRadius: '1px'
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </Row>
        );
    }

    // Style2 (Chip style)
    if (preset === 'style2') {
        return (
            <Row style={{ gap: '8px', flexWrap: 'wrap' }}>
                {items.map((v, index) => {
                    if (v.hidden) return null;
                    const isSelected = v.key === tabKey;
                    const isDisabled = progressEnabled && index > progress;

                    return (
                        <button
                            key={v.key}
                            style={{
                                padding: '6px 14px',
                                background: isSelected ? `${colors.main}20` : colors.buttonHoverBg,
                                border: `1px solid ${isSelected ? colors.main : colors.containerBorder}`,
                                borderRadius: '20px',
                                color: isSelected ? colors.main : isDisabled ? colors.disabled : colors.text,
                                fontSize: '12px',
                                fontWeight: isSelected ? 600 : 500,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Inter-Regular, serif',
                                opacity: isDisabled ? 0.5 : 1
                            }}
                            onClick={() => !isDisabled && setTabKey(v.key)}
                            disabled={isDisabled}
                            onMouseEnter={(e) => {
                                if (!isSelected && !isDisabled) {
                                    e.currentTarget.style.background = colors.buttonBg;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = colors.buttonHoverBg;
                                }
                            }}>
                            {v.label}
                        </button>
                    );
                })}
            </Row>
        );
    }

    // Default Style
    return (
        <div
            style={{
                display: 'flex',
                gap: '16px',
                borderBottom: `1px solid ${colors.containerBorder}`,
                paddingBottom: '2px'
            }}>
            {items.map((v, index) => {
                const isSelected = v.key === tabKey;
                const isDisabled = progressEnabled && index > progress;

                return (
                    <button
                        key={v.key}
                        style={{
                            padding: '10px 4px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${isSelected ? colors.main : 'transparent'}`,
                            marginBottom: '-3px',
                            color: isSelected ? colors.text : isDisabled ? colors.disabled : colors.textFaded,
                            fontSize: '14px',
                            fontWeight: isSelected ? 600 : 400,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: 'Inter-Regular, serif',
                            opacity: isDisabled ? 0.5 : 1
                        }}
                        onClick={() => !isDisabled && setTabKey(v.key)}
                        disabled={isDisabled}
                        onMouseEnter={(e) => {
                            if (!isSelected && !isDisabled) {
                                e.currentTarget.style.color = colors.text;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSelected) {
                                e.currentTarget.style.color = colors.textFaded;
                            }
                        }}>
                        {v.label}
                    </button>
                );
            })}
        </div>
    );
}
