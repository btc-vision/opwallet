import { useMemo, useRef, useState, type CSSProperties } from 'react';

import { TOS_LAST_UPDATE } from '@/shared/constant';
import { TermsText, type LegalDocStyles } from '@/legal-documents/Terms';
import { PrivacyPolicyText } from '@/legal-documents/Privacy';
import { Header, Layout } from '@/ui/components';
import { FileTextOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

type DocKey = 'tos' | 'privacy';

const colors = {
    main: '#f37413',
    background: '#212121',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    buttonBg: '#434343',
    buttonHoverBg: 'rgba(85, 85, 85, 0.3)',
    containerBgFaded: '#292929',
    containerBorder: '#303030'
};

export default function LegalDocumentsScreen() {
    const [activeDoc, setActiveDoc] = useState<DocKey>('tos');
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleTabChange = (doc: DocKey) => {
        setActiveDoc(doc);
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    };

    const legalDocStyles: LegalDocStyles = useMemo(() => {
        const baseText: CSSProperties = {
            color: 'rgba(255,255,255,0.84)',
            fontSize: 12.5,
            lineHeight: 1.68,
            letterSpacing: '0.01em',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            margin: '6px 0'
        };
        return {
            baseText,
            h2: {
                ...baseText,
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                margin: '18px 0 8px',
                letterSpacing: '0.02em'
            },
            h3: {
                ...baseText,
                fontSize: 13.5,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.92)',
                margin: '14px 0 6px'
            },
            ul: { paddingLeft: 20, margin: '6px 0' },
            li: { ...baseText, margin: '3px 0' },
            hr: {
                border: 'none',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                margin: '16px 0'
            },
            callout: {
                ...baseText,
                background: 'rgba(243,116,19,0.08)',
                border: '1px solid rgba(243,116,19,0.2)',
                borderRadius: 8,
                padding: '10px 14px',
                margin: '10px 0',
                fontSize: 12
            }
        };
    }, []);

    return (
        <Layout>
            <Header
                onBack={() => window.history.back()}
                title="Legal Documents"
            />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden',
                    padding: '0 12px 12px'
                }}>
                {/* Effective Date */}
                <div
                    style={{
                        textAlign: 'center',
                        padding: '8px 0 4px',
                        fontSize: 11,
                        color: colors.textFaded,
                        letterSpacing: '0.02em'
                    }}>
                    Effective Date: {TOS_LAST_UPDATE}
                </div>

                {/* Tab Switcher */}
                <div
                    style={{
                        display: 'flex',
                        gap: 6,
                        padding: '4px',
                        background: colors.containerBgFaded,
                        borderRadius: 12,
                        marginBottom: 10
                    }}>
                    <button
                        type="button"
                        onClick={() => handleTabChange('tos')}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeDoc === 'tos' ? colors.main : 'transparent',
                            color: activeDoc === 'tos' ? '#fff' : colors.textFaded,
                            fontSize: 12.5,
                            fontWeight: 600,
                            fontFamily: "'Inter', sans-serif"
                        }}>
                        <FileTextOutlined style={{ fontSize: 14 }} />
                        Terms of Use
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('privacy')}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeDoc === 'privacy' ? colors.main : 'transparent',
                            color: activeDoc === 'privacy' ? '#fff' : colors.textFaded,
                            fontSize: 12.5,
                            fontWeight: 600,
                            fontFamily: "'Inter', sans-serif"
                        }}>
                        <SafetyCertificateOutlined style={{ fontSize: 14 }} />
                        Privacy Policy
                    </button>
                </div>

                {/* Scrollable Content */}
                <div
                    ref={scrollRef}
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        background: colors.containerBgFaded,
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: `1px solid ${colors.containerBorder}`
                    }}>
                    {activeDoc === 'tos' ? (
                        <TermsText effectiveDate={TOS_LAST_UPDATE} styles={legalDocStyles} />
                    ) : (
                        <PrivacyPolicyText effectiveDate={TOS_LAST_UPDATE} styles={legalDocStyles} />
                    )}
                    <div style={{ height: 14 }} />
                </div>
            </div>
        </Layout>
    );
}

