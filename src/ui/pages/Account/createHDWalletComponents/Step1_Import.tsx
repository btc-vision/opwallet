import { CheckCircleFilled, FileTextOutlined, LockOutlined, WarningOutlined } from '@ant-design/icons';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { useMemo, useRef, useState } from 'react';

import { RestoreWalletType } from '@/shared/types';
import { isWalletError } from '@/shared/utils/errors';
import { Column, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import {
    ContextData,
    TabType,
    UpdateContextDataParams,
    WordsType
} from '@/ui/pages/Account/createHDWalletComponents/types';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    error: '#ef4444'
};

const WORDS_12_ITEM = {
    key: WordsType.WORDS_12,
    label: '12 words',
    count: 12
};

const WORDS_24_ITEM = {
    key: WordsType.WORDS_24,
    label: '24 words',
    count: 24
};

export function Step1_Import({
    contextData,
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const isXverse = contextData.restoreWalletType === RestoreWalletType.XVERSE;

    const wordsItems = useMemo(() => {
        if (isXverse) {
            return [WORDS_12_ITEM];
        } else {
            return [WORDS_12_ITEM, WORDS_24_ITEM];
        }
    }, [isXverse]);

    const wordsCount = wordsItems[contextData.wordsType]?.count ?? 12;
    const [keys, setKeys] = useState<string[]>(new Array(wordsCount).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>(new Array<HTMLInputElement | null>(wordsCount).fill(null));
    const [focusedIndex, setFocusedIndex] = useState<number | null>(0);

    const handleEventPaste = (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
        const copyText = event.clipboardData?.getData('text/plain');
        const textArr = copyText
            .trim()
            .split(/[\s,]+/)
            .filter((word: string) => word.length > 0);
        const newKeys = [...keys];
        if (textArr) {
            for (let i = 0; i < keys.length - index; i++) {
                if (textArr.length == i) {
                    break;
                }
                newKeys[index + i] = textArr[i].toLowerCase();
            }
            setKeys(newKeys);
        }
        event.preventDefault();
    };

    const handleChange = (value: string, index: number) => {
        const newKeys = [...keys];
        newKeys[index] = value.toLowerCase().trim();
        setKeys(newKeys);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (index < wordsCount - 1) {
                inputRefs.current[index + 1]?.focus();
            } else if (mnemonicValid) {
                onNext();
            }
        } else if (e.key === 'Backspace' && keys[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Derive validation state directly from keys
    const hasEmpty = keys.some((key) => key === '');
    const mnemonicValid = !hasEmpty && validateMnemonic(keys.join(' '), wordlist);
    const hasAttempted = !hasEmpty && !mnemonicValid;
    const filledCount = keys.filter((k) => k !== '').length;

    const tools = useTools();
    const onNext = () => {
        try {
            const mnemonics = keys.join(' ');
            updateContextData({ mnemonics, tabType: TabType.STEP3 });
        } catch (e) {
            if (isWalletError(e)) {
                tools.toastError(e.message);
            } else {
                tools.toastError('An unexpected error occurred.');
                console.error('Non-WalletError caught: ', e);
            }
        }
    };

    return (
        <Column gap="lg">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <div
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}10 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                    }}>
                    <LockOutlined style={{ fontSize: 26, color: colors.main }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Text text="Secret Recovery Phrase" preset="bold" size="lg" />
                </div>
                <div style={{ fontSize: '13px', color: colors.textFaded, marginTop: '6px' }}>
                    Import an existing wallet with your secret recovery phrase
                </div>
            </div>

            {/* Word Count Toggle */}
            {wordsItems.length > 1 && (
                <div
                    style={{
                        display: 'flex',
                        background: colors.containerBgFaded,
                        borderRadius: '10px',
                        padding: '3px',
                        border: `1px solid ${colors.containerBorder}`
                    }}>
                    {wordsItems.map((item) => {
                        const isActive = contextData.wordsType === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => {
                                    updateContextData({ wordsType: item.key });
                                    setKeys(new Array(item.count).fill('') as string[]);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    background: isActive ? colors.main : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: isActive ? colors.background : colors.textFaded,
                                    fontSize: '13px',
                                    fontWeight: isActive ? 600 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}>
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Progress indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                    style={{
                        flex: 1,
                        height: '3px',
                        borderRadius: '2px',
                        background: colors.containerBorder,
                        overflow: 'hidden'
                    }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${(filledCount / wordsCount) * 100}%`,
                            background: mnemonicValid ? colors.success : colors.main,
                            borderRadius: '2px',
                            transition: 'width 0.2s, background 0.2s'
                        }}
                    />
                </div>
                <span
                    style={{
                        fontSize: '11px',
                        color: mnemonicValid ? colors.success : colors.textFaded,
                        fontWeight: 500,
                        minWidth: '40px',
                        textAlign: 'right'
                    }}>
                    {filledCount}/{wordsCount}
                </span>
            </div>

            {/* Word Inputs Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px'
                }}>
                {keys.map((word, index) => {
                    const isFilled = word !== '';
                    return (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: isFilled ? `${colors.main}08` : colors.containerBgFaded,
                                border: `1.5px solid ${
                                    focusedIndex === index
                                        ? colors.main
                                        : isFilled
                                          ? `${colors.main}30`
                                          : colors.containerBorder
                                }`,
                                borderRadius: '10px',
                                padding: '0 8px',
                                height: '38px',
                                transition: 'border-color 0.15s',
                                gap: '4px'
                            }}>
                            <span
                                style={{
                                    fontSize: '10px',
                                    color: isFilled ? colors.main : colors.textFaded,
                                    fontWeight: 600,
                                    minWidth: '18px',
                                    textAlign: 'right',
                                    fontFamily: 'monospace',
                                    flexShrink: 0,
                                    opacity: 0.8
                                }}>
                                {index + 1}
                            </span>
                            <input
                                ref={(el) => {
                                    inputRefs.current[index] = el;
                                }}
                                type="text"
                                value={word}
                                autoComplete="off"
                                spellCheck={false}
                                onChange={(e) => handleChange(e.target.value, index)}
                                onPaste={(e) => handleEventPaste(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onFocus={() => setFocusedIndex(index)}
                                onBlur={() => setFocusedIndex(null)}
                                autoFocus={index === 0}
                                placeholder="···"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: colors.text,
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    padding: '4px 0',
                                    width: '100%',
                                    minWidth: 0,
                                    fontFamily: 'Inter-Regular, serif'
                                }}
                            />
                            {isFilled && (
                                <CheckCircleFilled
                                    style={{
                                        fontSize: 10,
                                        color: colors.success,
                                        flexShrink: 0,
                                        opacity: 0.7
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Validation Error */}
            {hasAttempted && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        background: `${colors.error}10`,
                        border: `1px solid ${colors.error}30`,
                        borderRadius: '10px'
                    }}>
                    <WarningOutlined style={{ fontSize: 14, color: colors.error }} />
                    <span style={{ fontSize: '12px', color: colors.error }}>
                        Invalid recovery phrase. Please check your words and try again.
                    </span>
                </div>
            )}

            {/* Paste hint */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: `${colors.main}08`,
                    border: `1px solid ${colors.main}15`,
                    borderRadius: '10px'
                }}>
                <FileTextOutlined style={{ fontSize: 14, color: colors.main }} />
                <span style={{ fontSize: '11px', color: colors.textFaded }}>
                    Paste your entire phrase into the first field to auto-fill all words
                </span>
            </div>

            {/* Continue Button */}
            <button
                disabled={!mnemonicValid}
                onClick={onNext}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: !mnemonicValid ? colors.buttonBg : colors.main,
                    border: 'none',
                    borderRadius: '12px',
                    color: !mnemonicValid ? colors.textFaded : colors.background,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: !mnemonicValid ? 'not-allowed' : 'pointer',
                    opacity: !mnemonicValid ? 0.5 : 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                {mnemonicValid && <CheckCircleFilled style={{ fontSize: 14 }} />}
                Continue
            </button>
        </Column>
    );
}


