import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button, Row } from '@/ui/components';
import { TOS_VERSION, TOS_LAST_UPDATE } from '@/shared/constant';

import { TermsText, type LegalDocStyles } from '@/legal-documents/Terms';
import { PrivacyPolicyText } from '@/legal-documents/Privacy';

export const TOS_SEEN_KEY = 'opnet_tos_seen_' + TOS_VERSION;
export const TOS_ACCEPTED_KEY = 'opnet_tos_accepted_' + TOS_VERSION;

export const LEGAL_SEEN_KEY = 'opnet_legal_seen_' + TOS_VERSION;
export const LEGAL_ACCEPTED_KEY = 'opnet_legal_accepted_' + TOS_VERSION;

type DocKey = 'tos' | 'privacy';

export function TermsOfServiceModal({
                                        open,
                                        onAccept,
                                    }: {
    open: boolean;
    onAccept: () => void;
}) {
    const [activeDoc, setActiveDoc] = useState<DocKey>('tos');

    const [tosScrolledBottom, setTosScrolledBottom] = useState(false);
    const [privacyScrolledBottom, setPrivacyScrolledBottom] = useState(false);

    // Require user interaction per doc to prevent “carry-over bottom”
    const [tosInteracted, setTosInteracted] = useState(false);
    const [privacyInteracted, setPrivacyInteracted] = useState(false);

    // single checkbox for both docs
    const [accepted, setAccepted] = useState(false);

    // During doc switch, ignore scroll checks until after we force scrollTop=0 and layout settles
    const [switchingDoc, setSwitchingDoc] = useState(false);

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const bothScrolled = tosScrolledBottom && privacyScrolledBottom;

    useEffect(() => {
        if (!open) return;
        if (typeof window === 'undefined') return;

        const prevAccepted =
            window.localStorage.getItem(LEGAL_ACCEPTED_KEY) === '1' ||
            window.localStorage.getItem(TOS_ACCEPTED_KEY) === '1'; // legacy support
        setAccepted(prevAccepted);

        // reset gating every time modal opens
        setTosScrolledBottom(false);
        setPrivacyScrolledBottom(false);
        setTosInteracted(false);
        setPrivacyInteracted(false);

        setActiveDoc('tos');
        setSwitchingDoc(true);
    }, [open]);

    const isAtBottom = (el: HTMLDivElement) => {
        const tolerancePx = 8;
        return el.scrollTop + el.clientHeight >= el.scrollHeight - tolerancePx;
    };

    const markActiveAsRead = () => {
        if (activeDoc === 'tos') setTosScrolledBottom(true);
        else setPrivacyScrolledBottom(true);
    };

    const hasInteractedWithActiveDoc = () => {
        return activeDoc === 'tos' ? tosInteracted : privacyInteracted;
    };

    const setInteractedForActiveDoc = () => {
        if (activeDoc === 'tos') setTosInteracted(true);
        else setPrivacyInteracted(true);
    };

    const checkReadStatus = () => {
        const el = scrollRef.current;
        if (!el) return;

        const tolerancePx = 8;
        const noScrollNeeded = el.scrollHeight <= el.clientHeight + tolerancePx;

        // If no scrolling is possible/needed, mark as read right away
        if (noScrollNeeded) {
            markActiveAsRead();
            return;
        }

        // Prevent “auto read” unless user actually interacted with this doc
        if (!hasInteractedWithActiveDoc()) return;

        if (isAtBottom(el)) markActiveAsRead();
    };

    // Hard reset scroll when switching documents (this prevents “clamped-to-bottom” carry-over)
    useLayoutEffect(() => {
        if (!open) return;

        setSwitchingDoc(true);

        // Wait for the doc content to mount/update, then force scrollTop = 0
        requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (el) {
                el.scrollTo({ top: 0, behavior: 'auto' });
            }

            // Wait one more frame so scrollHeight/clientHeight settle for new content
            requestAnimationFrame(() => {
                setSwitchingDoc(false);

                // Only auto-check the "noScrollNeeded" case after settle.
                // (Does NOT allow auto “at bottom” without interaction.)
                checkReadStatus();
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeDoc, open]);

    const onScroll = () => {
        if (switchingDoc) return;
        setInteractedForActiveDoc();
        checkReadStatus();
    };

    const scrollToBottom = () => {
        const el = scrollRef.current;
        if (!el) return;

        // Jump button counts as interaction
        setInteractedForActiveDoc();

        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });

        // After the smooth scroll completes-ish, re-check (cheap + safe)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                checkReadStatus();
            });
        });
    };

    const styles = useMemo(() => {
        const overlay: CSSProperties = {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
            zIndex: 99999, // Must be higher than DuplicationAlertModal (10000)
        };

        // Chrome extension popup width-friendly
        const modal: CSSProperties = {
            width: '100%',
            maxWidth: 360,
            height: 'calc(95vh)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(30,30,30,0.98)',
            boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
        };

        const header: CSSProperties = {
            padding: '12px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flex: '0 0 auto',
        };

        const titleWrap: CSSProperties = {
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 0,
        };

        const title: CSSProperties = {
            margin: 0,
            fontSize: 14.5,
            fontWeight: 850,
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        };

        const subtitle: CSSProperties = {
            margin: 0,
            fontSize: 11.5,
            color: 'rgba(255,255,255,0.60)',
        };

        const docTabsWrap: CSSProperties = {
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            width: '100%',
        };

        const docTab: CSSProperties = {
            flex: '1 1 0',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.03)',
            padding: '10px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            cursor: 'pointer',
            userSelect: 'none',
            color: 'rgba(255,255,255,0.90)',
            fontSize: 12.25,
            fontWeight: 800,
            minWidth: 0,
        };

        const docTabActive: CSSProperties = {
            border: '1px solid rgba(147,197,253,0.35)',
            background: 'rgba(147,197,253,0.08)',
        };

        const docName: CSSProperties = {
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        };

        const tickWrap: CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(0,0,0,0.20)',
            flex: '0 0 auto',
        };

        const tickOn: CSSProperties = {
            border: '1px solid rgba(147,197,253,0.65)',
            background: 'rgba(147,197,253,0.12)',
        };

        const tickMark: CSSProperties = {
            fontSize: 11,
            lineHeight: 1,
            transform: 'translateY(-0.5px)',
            color: 'rgba(255,255,255,0.92)',
        };

        const body: CSSProperties = {
            position: 'relative',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
        };

        const scrollArea: CSSProperties = {
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '12px 12px',
        };

        const baseText: CSSProperties = {
            color: 'rgba(255,255,255,0.84)',
            fontSize: 12.5,
            lineHeight: 1.68,
            letterSpacing: '0.01em',
            fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
            margin: '8px 0',
        };

        const h2: CSSProperties = {
            ...baseText,
            fontSize: 13.5,
            fontWeight: 850,
            margin: '14px 0 6px 0',
            color: 'rgba(255,255,255,0.92)',
        };

        const h3: CSSProperties = {
            ...baseText,
            fontSize: 12.5,
            fontWeight: 850,
            margin: '12px 0 4px 0',
            color: 'rgba(255,255,255,0.88)',
        };

        const ul: CSSProperties = { ...baseText, paddingLeft: 18, margin: '8px 0' };
        const li: CSSProperties = { ...baseText, margin: '6px 0' };

        const hr: CSSProperties = {
            border: 0,
            borderTop: '1px solid rgba(255,255,255,0.10)',
            margin: '14px 0',
        };

        const callout: CSSProperties = {
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.24)',
            padding: '10px 12px',
            margin: '10px 0',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12.25,
            lineHeight: 1.5,
        };

        const jumpBtn: CSSProperties = {
            position: 'absolute',
            right: 10,
            bottom: 10,
            width: 36,
            height: 36,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(0,0,0,0.40)',
            color: 'rgba(255,255,255,0.90)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
            userSelect: 'none',
        };

        const footer: CSSProperties = {
            padding: '12px 12px',
            borderTop: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(0,0,0,0.18)',
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
        };

        const consentPill: CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 10px',
            borderRadius: 14,
            border: accepted ? '1px solid rgba(147,197,253,0.35)' : '1px solid rgba(255,255,255,0.12)',
            background: accepted ? 'rgba(147,197,253,0.08)' : 'rgba(255,255,255,0.03)',
            cursor: bothScrolled ? 'pointer' : 'not-allowed',
            userSelect: 'none',
            opacity: bothScrolled ? 1 : 0.55,
        };

        // smaller checkbox
        const box: CSSProperties = {
            width: 14,
            height: 14,
            borderRadius: 5,
            border: accepted ? '1px solid rgba(147,197,253,0.95)' : '1px solid rgba(255,255,255,0.25)',
            background: accepted ? 'rgba(147,197,253,0.22)' : 'rgba(0,0,0,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: accepted ? '0 0 0 4px rgba(147,197,253,0.10)' : 'none',
            flex: '0 0 auto',
        };

        const check: CSSProperties = {
            width: 8,
            height: 4.5,
            borderLeft: '2px solid rgba(255,255,255,0.92)',
            borderBottom: '2px solid rgba(255,255,255,0.92)',
            transform: 'rotate(-45deg)',
            marginTop: -1,
            opacity: accepted ? 1 : 0,
            transition: 'opacity 120ms ease',
        };

        const consentText: CSSProperties = {
            color: 'rgba(255,255,255,0.80)',
            fontSize: 12,
            lineHeight: 1.35,
            margin: 0,
        };

        const hint: CSSProperties = {
            margin: 0,
            fontSize: 11.5,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.35,
        };

        return {
            overlay,
            modal,
            header,
            titleWrap,
            title,
            subtitle,
            docTabsWrap,
            docTab,
            docTabActive,
            docName,
            tickWrap,
            tickOn,
            tickMark,
            body,
            scrollArea,
            baseText,
            h2,
            h3,
            ul,
            li,
            hr,
            callout,
            jumpBtn,
            footer,
            consentPill,
            box,
            check,
            consentText,
            hint,
        };
    }, [accepted, bothScrolled]);

    const legalDocStyles: LegalDocStyles = useMemo(
        () => ({
            baseText: styles.baseText,
            h2: styles.h2,
            h3: styles.h3,
            ul: styles.ul,
            li: styles.li,
            hr: styles.hr,
            callout: styles.callout,
        }),
        [styles]
    );

    if (!open) return null;

    return (
        <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="Legal agreements">
            <div style={styles.modal}>
                <div style={styles.header}>
                    <div style={styles.titleWrap}>
                        <h1 style={styles.title}>Legal Agreements</h1>
                        <p style={styles.subtitle}>Effective Date: {TOS_LAST_UPDATE}</p>
                    </div>

                    <div style={styles.docTabsWrap}>
                        <button
                            type="button"
                            style={{
                                ...styles.docTab,
                                ...(activeDoc === 'tos' ? styles.docTabActive : null),
                            }}
                            onClick={() => setActiveDoc('tos')}
                            aria-pressed={activeDoc === 'tos'}
                        >
                            <p style={styles.docName}>Terms</p>
                            <div
                                style={{
                                    ...styles.tickWrap,
                                    ...(tosScrolledBottom ? styles.tickOn : null),
                                }}
                                aria-hidden="true"
                            >
                                {tosScrolledBottom ? <span style={styles.tickMark}>✓</span> : null}
                            </div>
                        </button>

                        <button
                            type="button"
                            style={{
                                ...styles.docTab,
                                ...(activeDoc === 'privacy' ? styles.docTabActive : null),
                            }}
                            onClick={() => setActiveDoc('privacy')}
                            aria-pressed={activeDoc === 'privacy'}
                        >
                            <p style={styles.docName}>Privacy</p>
                            <div
                                style={{
                                    ...styles.tickWrap,
                                    ...(privacyScrolledBottom ? styles.tickOn : null),
                                }}
                                aria-hidden="true"
                            >
                                {privacyScrolledBottom ? <span style={styles.tickMark}>✓</span> : null}
                            </div>
                        </button>
                    </div>
                </div>

                <div style={styles.body}>
                    <div ref={scrollRef} style={styles.scrollArea} onScroll={onScroll}>
                        {activeDoc === 'tos' ? (
                            <TermsText effectiveDate={TOS_LAST_UPDATE} styles={legalDocStyles} />
                        ) : (
                            <PrivacyPolicyText effectiveDate={TOS_LAST_UPDATE} styles={legalDocStyles} />
                        )}
                        <div style={{ height: 14 }} />
                    </div>

                    <button
                        type="button"
                        style={styles.jumpBtn}
                        onClick={scrollToBottom}
                        aria-label="Jump to bottom"
                        title="Jump to bottom"
                    >
                        <span style={{ fontSize: 18, transform: 'translateY(1px)' }}>↓</span>
                    </button>
                </div>

                <div style={styles.footer}>
                    <div
                        style={styles.consentPill}
                        role="checkbox"
                        aria-checked={accepted}
                        aria-disabled={!bothScrolled}
                        tabIndex={bothScrolled ? 0 : -1}
                        onClick={() => {
                            if (!bothScrolled) return;
                            setAccepted((v) => !v);
                        }}
                        onKeyDown={(e) => {
                            if (!bothScrolled) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setAccepted((v) => !v);
                            }
                        }}
                    >
                        <div style={styles.box} aria-hidden="true">
                            <div style={styles.check} />
                        </div>
                        <p style={styles.consentText}>
                            I have read and agree to the Terms & Privacy.
                            {!bothScrolled ? ' (Read both to enable.)' : ''}
                        </p>
                    </div>

                    <p style={styles.hint}>
                        {!bothScrolled
                            ? `Scroll both docs to the bottom. (${tosScrolledBottom ? '✓' : '•'} Terms, ${
                                privacyScrolledBottom ? '✓' : '•'
                            } Privacy)`
                            : accepted
                                ? 'Click “I accept” to continue.'
                                : 'Tick the box to enable “I accept”.'}
                    </p>

                    <Row justifyCenter>
                        <Button
                            text="I accept"
                            preset="primary"
                            disabled={!bothScrolled || !accepted}
                            onClick={() => {
                                if (!bothScrolled || !accepted) return;

                                if (typeof window !== 'undefined') {
                                    try {
                                        // legacy
                                        window.localStorage.setItem(TOS_SEEN_KEY, '1');
                                        window.localStorage.setItem(TOS_ACCEPTED_KEY, '1');

                                        // combined
                                        window.localStorage.setItem(LEGAL_SEEN_KEY, '1');
                                        window.localStorage.setItem(LEGAL_ACCEPTED_KEY, '1');
                                    } catch {
                                        // ignore
                                    }
                                }

                                onAccept();
                            }}
                        />
                    </Row>
                </div>
            </div>
        </div>
    );
}
