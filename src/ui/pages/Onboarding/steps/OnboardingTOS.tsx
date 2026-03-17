import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CheckCircleFilled } from '@ant-design/icons';

import { TOS_LAST_UPDATE } from '@/shared/constant';
import { TermsText, type LegalDocStyles } from '@/legal-documents/Terms';
import { PrivacyPolicyText } from '@/legal-documents/Privacy';

type DocKey = 'tos' | 'privacy';

export function OnboardingTOS({ onAccept }: { onAccept: () => void }) {
    const [activeDoc, setActiveDoc] = useState<DocKey>('tos');

    const [tosScrolled, setTosScrolled] = useState(false);
    const [privacyScrolled, setPrivacyScrolled] = useState(false);

    const [tosInteracted, setTosInteracted] = useState(false);
    const [privacyInteracted, setPrivacyInteracted] = useState(false);

    const [accepted, setAccepted] = useState(false);

    const switchingDocRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const bothScrolled = tosScrolled && privacyScrolled;

    const isAtBottom = (el: HTMLDivElement) =>
        el.scrollTop + el.clientHeight >= el.scrollHeight - 8;

    const markActiveAsRead = () => {
        if (activeDoc === 'tos') setTosScrolled(true);
        else setPrivacyScrolled(true);
    };

    const checkReadStatus = () => {
        const el = scrollRef.current;
        if (!el) return;

        const noScrollNeeded = el.scrollHeight <= el.clientHeight + 8;
        if (noScrollNeeded) {
            markActiveAsRead();
            return;
        }

        const interacted = activeDoc === 'tos' ? tosInteracted : privacyInteracted;
        if (!interacted) return;

        if (isAtBottom(el)) markActiveAsRead();
    };

    useLayoutEffect(() => {
        switchingDocRef.current = true;

        requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (el) el.scrollTo({ top: 0, behavior: 'auto' });

            requestAnimationFrame(() => {
                switchingDocRef.current = false;
                checkReadStatus();
            });
        });
    }, [activeDoc]);

    const onScroll = () => {
        if (switchingDocRef.current) return;
        if (activeDoc === 'tos') setTosInteracted(true);
        else setPrivacyInteracted(true);
        checkReadStatus();
    };

    const scrollToBottom = () => {
        const el = scrollRef.current;
        if (!el) return;

        if (activeDoc === 'tos') setTosInteracted(true);
        else setPrivacyInteracted(true);

        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => checkReadStatus());
        });
    };

    const legalDocStyles: LegalDocStyles = useMemo(() => {
        const baseText: CSSProperties = {
            color: 'rgba(255,255,255,0.84)',
            fontSize: 12.5,
            lineHeight: 1.68,
            letterSpacing: '0.01em',
            fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
            margin: '8px 0',
        };
        return {
            baseText,
            h2: { ...baseText, fontSize: 13.5, fontWeight: 850, margin: '14px 0 6px 0', color: 'rgba(255,255,255,0.92)' },
            h3: { ...baseText, fontSize: 12.5, fontWeight: 850, margin: '12px 0 4px 0', color: 'rgba(255,255,255,0.88)' },
            ul: { ...baseText, paddingLeft: 18, margin: '8px 0', listStyleType: 'disc' },
            ol: { ...baseText, paddingLeft: 18, margin: '8px 0', listStyleType: 'decimal' },
            li: { ...baseText, margin: '6px 0' },
            hr: { border: 0, borderTop: '1px solid rgba(255,255,255,0.10)', margin: '14px 0' },
            callout: {
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.24)',
                padding: '10px 12px',
                margin: '10px 0',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 12.25,
                lineHeight: 1.5,
            },
        };
    }, []);

    const tosIcon = tosScrolled ? '\u2713' : '\u2022';
    const privacyIcon = privacyScrolled ? '\u2713' : '\u2022';

    return (
        <div className="tos-step">
            <div className="tos__header">
                <div className="tos__title">Legal Agreements</div>
                <div className="tos__subtitle">Effective Date: {TOS_LAST_UPDATE}</div>
            </div>

            <div className="tos__tabs">
                <button
                    type="button"
                    className={`tos__tab ${activeDoc === 'tos' ? 'tos__tab--active' : ''}`}
                    onClick={() => setActiveDoc('tos')}>
                    <span className="tos__tab-name">Terms of Service</span>
                    <span className={`tos__tab-tick ${tosScrolled ? 'tos__tab-tick--done' : ''}`}>
                        {tosScrolled ? '\u2713' : ''}
                    </span>
                </button>

                <button
                    type="button"
                    className={`tos__tab ${activeDoc === 'privacy' ? 'tos__tab--active' : ''}`}
                    onClick={() => setActiveDoc('privacy')}>
                    <span className="tos__tab-name">Privacy Policy</span>
                    <span className={`tos__tab-tick ${privacyScrolled ? 'tos__tab-tick--done' : ''}`}>
                        {privacyScrolled ? '\u2713' : ''}
                    </span>
                </button>
            </div>

            <div className="tos__body">
                <div ref={scrollRef} onScroll={onScroll} className="tos__scroll-area">
                    {activeDoc === 'tos' ? (
                        <TermsText effectiveDate={TOS_LAST_UPDATE} styles={legalDocStyles} />
                    ) : (
                        <PrivacyPolicyText effectiveDate={TOS_LAST_UPDATE} styles={legalDocStyles} />
                    )}
                    <div style={{ height: 14 }} />
                </div>

                <button
                    type="button"
                    className="tos__jump-btn"
                    onClick={scrollToBottom}
                    aria-label="Jump to bottom"
                    title="Jump to bottom">
                    <span style={{ fontSize: 18, transform: 'translateY(1px)' }}>{'\u2193'}</span>
                </button>
            </div>

            <div className="tos__footer">
                <div className="tos__hint">
                    {!bothScrolled
                        ? `Scroll both docs. (${tosIcon} Terms, ${privacyIcon} Privacy)`
                        : accepted
                            ? 'Click "Continue" to proceed.'
                            : 'Tick the box to enable "Continue".'}
                </div>

                <label
                    className="checkbox-label tos__checkbox"
                    data-checked={accepted}
                    data-disabled={!bothScrolled}>
                    <input
                        type="checkbox"
                        checked={accepted}
                        disabled={!bothScrolled}
                        onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span className={`tos__checkbox-text ${accepted ? 'text-success' : 'text-faded'}`}>
                        I have read and agree to the Terms &amp; Privacy Policy
                    </span>
                    {accepted && <CheckCircleFilled style={{ fontSize: 14, color: 'var(--color-success)', marginLeft: 'auto' }} />}
                </label>

                <button
                    disabled={!accepted}
                    onClick={onAccept}
                    className={`btn ${accepted ? 'btn-primary' : 'btn-disabled'}`}>
                    Continue
                </button>
            </div>
        </div>
    );
}
