import { useEffect, useState } from 'react';

import { Column } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { ContextData, TabType, UpdateContextDataParams } from '@/ui/pages/Account/createHDWalletComponents/types';
import { copyToClipboard, useWallet } from '@/ui/utils';
import {
    CopyOutlined,
    CheckCircleFilled,
    WarningOutlined
} from '@ant-design/icons';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

export function Step1_Create({
    contextData,
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const [checked, setChecked] = useState(false);
    const [copied, setCopied] = useState(false);
    const wallet = useWallet();
    const tools = useTools();

    useEffect(() => {
        const init = async () => {
            const _mnemonics = await wallet.generatePreMnemonic();
            updateContextData({ mnemonics: _mnemonics });
        };
        void init();
    }, []);

    const handleCopy = () => {
        void copyToClipboard(contextData.mnemonics).then(() => {
            setCopied(true);
            tools.toastSuccess('Copied');
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const words = contextData.mnemonics.split(' ');

    return (
        <Column gap="md">
            {/* Word Grid */}
            <div
                style={{
                    background: colors.containerBgFaded,
                    borderRadius: '12px',
                    padding: '12px',
                    border: `1px solid ${colors.containerBorder}`
                }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                    }}>
                    {words.map((word, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: colors.inputBg,
                                borderRadius: '8px',
                                padding: '0 10px',
                                height: '36px',
                                border: `1px solid ${colors.containerBorder}`,
                                minWidth: 0
                            }}>
                            <span
                                style={{
                                    fontSize: '11px',
                                    color: colors.textFaded,
                                    minWidth: '22px',
                                    fontWeight: 500,
                                    userSelect: 'none'
                                }}>
                                {index + 1}.
                            </span>
                            <span
                                style={{
                                    fontSize: '13px',
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                    userSelect: 'text'
                                }}>
                                {word}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Copy button */}
                <button
                    onClick={handleCopy}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        marginTop: '10px',
                        padding: '8px',
                        background: 'transparent',
                        border: `1px dashed ${colors.containerBorder}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: copied ? colors.success : colors.textFaded,
                        fontSize: '12px',
                        fontWeight: 500,
                        transition: 'all 0.15s'
                    }}>
                    {copied ? (
                        <CheckCircleFilled style={{ fontSize: 13 }} />
                    ) : (
                        <CopyOutlined style={{ fontSize: 13 }} />
                    )}
                    {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
            </div>

            {/* Warning */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 12px',
                    background: `${colors.warning}10`,
                    border: `1px solid ${colors.warning}25`,
                    borderRadius: '10px'
                }}>
                <WarningOutlined style={{ fontSize: 14, color: colors.warning, marginTop: '1px', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                    This phrase is the <strong style={{ color: colors.text }}>ONLY</strong> way to recover your wallet.
                    Write it down and store it in a safe place.
                </span>
            </div>

            {/* Checkbox */}
            <label
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    background: checked ? `${colors.success}10` : colors.containerBgFaded,
                    borderRadius: '10px',
                    border: `1px solid ${checked ? colors.success + '30' : colors.containerBorder}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                }}>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                        setChecked(e.target.checked);
                        updateContextData({ step1Completed: e.target.checked });
                    }}
                    style={{
                        width: '18px',
                        height: '18px',
                        accentColor: colors.success,
                        cursor: 'pointer'
                    }}
                />
                <span
                    style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: checked ? colors.success : colors.textFaded
                    }}>
                    I saved my Secret Recovery Phrase
                </span>
            </label>

            {/* Continue */}
            <button
                disabled={!checked}
                onClick={() => updateContextData({ tabType: TabType.STEP2 })}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: !checked ? '#434343' : colors.main,
                    border: 'none',
                    borderRadius: '12px',
                    color: !checked ? colors.textFaded : colors.background,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: !checked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: !checked ? 0.5 : 1
                }}>
                Continue
            </button>
        </Column>
    );
}
