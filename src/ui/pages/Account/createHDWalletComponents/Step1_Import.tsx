import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getLeatherHdPath } from '@/shared/constant';
import { RestoreWalletType } from '@/shared/types';
import { isWalletError } from '@/shared/utils/errors';
import { AddressTypes } from '@btc-vision/transaction';
import { Column, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import {
    ContextData,
    TabType,
    UpdateContextDataParams,
    WordsType
} from '@/ui/pages/Account/createHDWalletComponents/types';
import {
    FileTextOutlined,
    LockOutlined,
    CheckCircleFilled,
    WarningOutlined
} from '@ant-design/icons';

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
    inputBg: '#292828',
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24'
};

export function Step1_Import({
    contextData,
    updateContextData
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
}) {
    const isLeather = contextData.restoreWalletType === RestoreWalletType.LEATHER;
    const isXverse = contextData.restoreWalletType === RestoreWalletType.XVERSE;

    // Leather gets a two-phase flow: seed phrase first, then account ID
    const [leatherPhase, setLeatherPhase] = useState<'seed' | 'account'>('seed');

    const showSeedInput = !isLeather || leatherPhase === 'seed';
    const showAccountInput = isLeather && leatherPhase === 'account';

    const wordsCount = isXverse ? 12 : contextData.wordsType === WordsType.WORDS_12 ? 12 : 24;
    const [keys, setKeys] = useState<string[]>(new Array(wordsCount).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [prevWordsCount, setPrevWordsCount] = useState(wordsCount);

    // Sync keys array when word count changes (adjust state during render, not in effect)
    if (wordsCount !== prevWordsCount) {
        setPrevWordsCount(wordsCount);
        setKeys(new Array(wordsCount).fill(''));
    }

    // Sync refs in effect (refs cannot be updated during render)
    useEffect(() => {
        inputRefs.current = new Array<HTMLInputElement | null>(wordsCount).fill(null);
    }, [wordsCount]);

    const mnemonicValid = useMemo(() => {
        if (keys.some((k) => k === '')) return false;
        return validateMnemonic(keys.join(' '), wordlist);
    }, [keys]);

    const allFilled = useMemo(() => keys.every((k) => k !== ''), [keys]);

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
        const text = event.clipboardData?.getData('text/plain') || '';
        const words = text.trim().split(/[\s,]+/).filter((w) => w.length > 0);
        if (words.length > 1) {
            const newKeys = [...keys];
            for (let i = 0; i < keys.length - index && i < words.length; i++) {
                newKeys[index + i] = words[i].toLowerCase();
            }
            setKeys(newKeys);
            event.preventDefault();
            // Focus the last filled or the next empty
            const nextFocus = Math.min(index + words.length, wordsCount - 1);
            setTimeout(() => inputRefs.current[nextFocus]?.focus(), 0);
        }
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
                handleSeedContinue();
            }
        } else if (e.key === 'Backspace' && keys[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const tools = useTools();

    const handleSeedContinue = () => {
        if (!mnemonicValid) return;
        updateContextData({ step1Completed: true });
        if (isLeather) {
            // Move to account selection phase
            setLeatherPhase('account');
        } else {
            finishImport();
        }
    };

    const finishImport = (accountIndex?: number) => {
        try {
            const mnemonics = keys.join(' ');
            if (isLeather) {
                const idx = accountIndex ?? contextData.leatherAccountIndex ?? 0;
                const leatherPath = getLeatherHdPath(AddressTypes.P2TR, idx);
                updateContextData({ mnemonics, customHdPath: leatherPath, tabType: TabType.STEP3 });
            } else {
                updateContextData({ mnemonics, tabType: TabType.STEP3 });
            }
        } catch (e) {
            if (isWalletError(e)) {
                tools.toastError(e.message);
            } else {
                tools.toastError('An unexpected error occurred.');
            }
        }
    };

    // ─── Seed Phrase Input View ───
    if (showSeedInput) {
        return (
            <Column gap="lg">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div
                        style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${colors.main}20 0%, ${colors.main}10 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                        <LockOutlined style={{ fontSize: 28, color: colors.main }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Text text="Secret Recovery Phrase" preset="bold" size="lg" />
                    </div>
                    <div style={{ fontSize: '13px', color: colors.textFaded, marginTop: '8px' }}>
                        Enter your seed phrase to restore your wallet
                    </div>
                </div>

                {/* Word Count Toggle - only show if not XVerse (which is always 12) */}
                {!isXverse && (
                    <div
                        style={{
                            display: 'flex',
                            background: colors.containerBgFaded,
                            borderRadius: '10px',
                            padding: '4px',
                            border: `1px solid ${colors.containerBorder}`
                        }}>
                        <button
                            onClick={() => {
                                updateContextData({ wordsType: WordsType.WORDS_12 });
                                setKeys(new Array(12).fill(''));
                            }}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                                background:
                                    contextData.wordsType === WordsType.WORDS_12
                                        ? colors.main
                                        : 'transparent',
                                color:
                                    contextData.wordsType === WordsType.WORDS_12
                                        ? colors.background
                                        : colors.textFaded
                            }}>
                            12 Words
                        </button>
                        <button
                            onClick={() => {
                                updateContextData({ wordsType: WordsType.WORDS_24 });
                                setKeys(new Array(24).fill(''));
                            }}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                                background:
                                    contextData.wordsType === WordsType.WORDS_24
                                        ? colors.main
                                        : 'transparent',
                                color:
                                    contextData.wordsType === WordsType.WORDS_24
                                        ? colors.background
                                        : colors.textFaded
                            }}>
                            24 Words
                        </button>
                    </div>
                )}

                {/* Word Input Grid */}
                <div
                    style={{
                        background: colors.containerBgFaded,
                        borderRadius: '12px',
                        padding: '12px',
                        border: `1px solid ${colors.containerBorder}`,
                        overflow: 'hidden'
                    }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px'
                        }}>
                        {keys.map((word, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: colors.inputBg,
                                    borderRadius: '8px',
                                    border: `1px solid ${
                                        word && !wordlist.includes(word)
                                            ? colors.error + '60'
                                            : word
                                              ? colors.success + '30'
                                              : colors.containerBorder
                                    }`,
                                    padding: '0 8px',
                                    height: '38px',
                                    transition: 'border-color 0.2s',
                                    minWidth: 0,
                                    boxSizing: 'border-box'
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
                                <input
                                    ref={(el) => {
                                        inputRefs.current[index] = el;
                                    }}
                                    type="text"
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={word}
                                    placeholder=""
                                    onPaste={(e) => handlePaste(e, index)}
                                    onChange={(e) => handleChange(e.target.value, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    onFocus={(e) => {
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) parent.style.borderColor = colors.main;
                                    }}
                                    onBlur={(e) => {
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            parent.style.borderColor = word && !wordlist.includes(word)
                                                ? colors.error + '60'
                                                : word
                                                  ? colors.success + '30'
                                                  : colors.containerBorder;
                                        }
                                    }}
                                    autoFocus={index === 0}
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: colors.text,
                                        fontSize: '13px',
                                        fontFamily: 'monospace',
                                        padding: '0 4px',
                                        height: '100%',
                                        boxSizing: 'border-box'
                                    } as React.CSSProperties}
                                />
                                {word && wordlist.includes(word) && (
                                    <CheckCircleFilled
                                        style={{ fontSize: 12, color: colors.success, flexShrink: 0 }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Validation Status */}
                {allFilled && !mnemonicValid && (
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
                    onClick={handleSeedContinue}
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
                        transition: 'all 0.2s',
                        opacity: !mnemonicValid ? 0.5 : 1,
                        marginTop: '4px'
                    }}
                    onMouseEnter={(e) => {
                        if (mnemonicValid) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 116, 19, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}>
                    Continue
                </button>
            </Column>
        );
    }

    // ─── Leather Account Selection View ───
    if (showAccountInput) {
        return <LeatherAccountStep
            contextData={contextData}
            updateContextData={updateContextData}
            onBack={() => setLeatherPhase('seed')}
            onContinue={(idx) => finishImport(idx)}
        />;
    }

    return null;
}

// ─── Leather Account ID Step (separate screen) ───
function LeatherAccountStep({
    contextData,
    updateContextData,
    onBack,
    onContinue
}: {
    contextData: ContextData;
    updateContextData: (params: UpdateContextDataParams) => void;
    onBack: () => void;
    onContinue: (accountIndex: number) => void;
}) {
    const [accountNum, setAccountNum] = useState(String((contextData.leatherAccountIndex ?? 0) + 1));

    const accountIndex = useMemo(() => {
        const n = parseInt(accountNum, 10);
        return isNaN(n) || n < 1 ? 0 : n - 1;
    }, [accountNum]);

    const isValid = useMemo(() => {
        const n = parseInt(accountNum, 10);
        return !isNaN(n) && n >= 1;
    }, [accountNum]);

    return (
        <Column gap="lg">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.warning}20 0%, ${colors.warning}10 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                    <FileTextOutlined style={{ fontSize: 28, color: colors.warning }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Text text="Leather Account Number" preset="bold" size="lg" />
                </div>
                <div style={{ fontSize: '13px', color: colors.textFaded, marginTop: '8px' }}>
                    Which account from your Leather wallet do you want to import?
                </div>
            </div>

            {/* Account Number Input */}
            <div
                style={{
                    background: colors.containerBgFaded,
                    borderRadius: '12px',
                    padding: '20px',
                    border: `1px solid ${colors.containerBorder}`
                }}>
                <label
                    style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: colors.textFaded,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '10px',
                        display: 'block'
                    }}>
                    Account Number
                </label>
                <input
                    type="number"
                    min="1"
                    value={accountNum}
                    onChange={(e) => {
                        setAccountNum(e.target.value);
                        const n = parseInt(e.target.value, 10);
                        if (!isNaN(n) && n >= 1) {
                            updateContextData({ leatherAccountIndex: n - 1 });
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && isValid) {
                            onContinue(accountIndex);
                        }
                    }}
                    autoFocus
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: colors.inputBg,
                        border: `1px solid ${colors.containerBorder}`,
                        borderRadius: '10px',
                        color: colors.text,
                        fontSize: '20px',
                        fontWeight: 600,
                        textAlign: 'center',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        fontFamily: 'monospace'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.main;
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.containerBorder;
                    }}
                />
                <div
                    style={{
                        fontSize: '11px',
                        color: colors.textFaded,
                        marginTop: '10px',
                        textAlign: 'center'
                    }}>
                    Account 1 is the first account in Leather. Enter the number of the account you want to import.
                </div>
            </div>

            {/* Info */}
            <div
                style={{
                    padding: '10px 12px',
                    background: `${colors.warning}10`,
                    border: `1px solid ${colors.warning}25`,
                    borderRadius: '10px'
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <WarningOutlined style={{ fontSize: 14, color: colors.warning, marginTop: '1px' }} />
                    <span style={{ fontSize: '11px', color: colors.textFaded, lineHeight: '1.5' }}>
                        Leather uses a different derivation path for each account. Make sure you select the correct
                        account number to access your funds.
                    </span>
                </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button
                    onClick={onBack}
                    style={{
                        flex: 1,
                        padding: '14px',
                        background: colors.buttonBg,
                        border: 'none',
                        borderRadius: '12px',
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}>
                    Back
                </button>
                <button
                    disabled={!isValid}
                    onClick={() => onContinue(accountIndex)}
                    style={{
                        flex: 2,
                        padding: '14px',
                        background: !isValid ? colors.buttonBg : colors.main,
                        border: 'none',
                        borderRadius: '12px',
                        color: !isValid ? colors.textFaded : colors.background,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: !isValid ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: !isValid ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (isValid) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 116, 19, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}>
                    Continue
                </button>
            </div>
        </Column>
    );
}
