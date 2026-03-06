import { useRef, useState } from 'react';
import { FileTextOutlined, CheckCircleFilled } from '@ant-design/icons';

const colors = {
    main: '#f37413',
    text: '#dbdbdb',
    textFaded: 'rgba(219, 219, 219, 0.7)',
    containerBgFaded: '#292929',
    containerBorder: '#303030',
    success: '#4ade80',
    buttonBg: '#434343'
};

export function OnboardingTOS({ onAccept }: { onAccept: () => void }) {
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
        if (atBottom) setScrolledToBottom(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <FileTextOutlined style={{ fontSize: 28, color: colors.main, marginBottom: '8px' }} />
                <div style={{ fontSize: '18px', fontWeight: 700, color: colors.text }}>
                    Terms of Service
                </div>
                <div style={{ fontSize: '12px', color: colors.textFaded, marginTop: '4px' }}>
                    Please read and accept to continue
                </div>
            </div>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                style={{
                    flex: 1,
                    background: colors.containerBgFaded,
                    borderRadius: '10px',
                    border: `1px solid ${colors.containerBorder}`,
                    padding: '14px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    color: colors.textFaded,
                    lineHeight: '1.6',
                    maxHeight: '280px',
                    marginBottom: '12px'
                }}>
                <div style={{ fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                    OPWallet Terms of Service
                </div>
                <p>
                    By using OPWallet, you agree to these terms. OPWallet is a non-custodial browser extension
                    wallet for managing tokens and interacting with applications on the OP_NET Bitcoin Layer 1
                    Metaprotocol.
                </p>
                <p style={{ marginTop: '8px' }}>
                    <strong style={{ color: colors.text }}>Self-Custody:</strong> You are solely responsible
                    for your wallet security. OPWallet does not store your private keys, seed phrases, or
                    passwords on any server. If you lose access to your recovery phrase or private keys, your
                    funds cannot be recovered.
                </p>
                <p style={{ marginTop: '8px' }}>
                    <strong style={{ color: colors.text }}>No Warranty:</strong> OPWallet is provided &quot;as
                    is&quot; without warranty of any kind. We are not responsible for any loss of funds,
                    failed transactions, or damages arising from the use of this software.
                </p>
                <p style={{ marginTop: '8px' }}>
                    <strong style={{ color: colors.text }}>Smart Contract Risks:</strong> Interacting with
                    smart contracts carries inherent risks. Always verify contract addresses and transaction
                    details before signing.
                </p>
                <p style={{ marginTop: '8px' }}>
                    <strong style={{ color: colors.text }}>Privacy:</strong> OPWallet does not collect personal
                    data. Network requests are made directly to Bitcoin nodes and indexers. Your transaction
                    history is publicly visible on the Bitcoin blockchain.
                </p>
                <p style={{ marginTop: '8px' }}>
                    <strong style={{ color: colors.text }}>Updates:</strong> We may update these terms at any
                    time. Continued use of OPWallet constitutes acceptance of updated terms.
                </p>
                <div style={{ height: '20px' }} />
            </div>

            {!scrolledToBottom && (
                <div style={{ fontSize: '10px', color: colors.textFaded, textAlign: 'center', marginBottom: '8px' }}>
                    Scroll to the bottom to continue
                </div>
            )}

            <label
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: accepted ? `${colors.success}10` : colors.containerBgFaded,
                    borderRadius: '10px',
                    border: `1px solid ${accepted ? colors.success + '30' : colors.containerBorder}`,
                    cursor: scrolledToBottom ? 'pointer' : 'not-allowed',
                    opacity: scrolledToBottom ? 1 : 0.4,
                    transition: 'all 0.15s',
                    marginBottom: '12px'
                }}>
                <input
                    type="checkbox"
                    checked={accepted}
                    disabled={!scrolledToBottom}
                    onChange={(e) => setAccepted(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: colors.success }}
                />
                <span style={{ fontSize: '12px', color: accepted ? colors.success : colors.textFaded, fontWeight: 500 }}>
                    I have read and accept the Terms of Service
                </span>
                {accepted && <CheckCircleFilled style={{ fontSize: 14, color: colors.success, marginLeft: 'auto' }} />}
            </label>

            <button
                disabled={!accepted}
                onClick={onAccept}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: accepted ? colors.main : colors.buttonBg,
                    border: 'none',
                    borderRadius: '12px',
                    color: accepted ? '#000' : colors.textFaded,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: accepted ? 'pointer' : 'not-allowed',
                    opacity: accepted ? 1 : 0.5,
                    transition: 'all 0.2s'
                }}>
                Continue
            </button>
        </div>
    );
}
