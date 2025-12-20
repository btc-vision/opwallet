import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Button, Row } from '@/ui/components';
import { TOS_LAST_UPDATE, DOMAIN_TOS_VERSION } from '@/shared/constant';

export const TOS_DOMAIN_SEEN_KEY = 'opnet_domain_tos_seen_' + DOMAIN_TOS_VERSION;
export const TOS_DOMAIN_ACCEPTED_KEY = 'opnet_domain_tos_accepted_' + DOMAIN_TOS_VERSION;

export function BTCDomainModal({
                                   open,
                                   onAccept,
                                   onClose,
                               }: {
    open: boolean;
    onAccept: () => void;
    onClose?: () => void;
}) {
    const [accepted, setAccepted] = useState(false);
    const [canInteract, setCanInteract] = useState(false);

    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        if (typeof window === 'undefined') return;

        const prevAccepted = window.localStorage.getItem(TOS_DOMAIN_ACCEPTED_KEY) === '1';
        setAccepted(prevAccepted);

        // force scroll-to-bottom gating each time it opens
        setCanInteract(false);

        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (typeof window === 'undefined') return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose?.();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    const checkScrolledToBottom = () => {
        const el = scrollRef.current;
        if (!el) return;

        const tolerancePx = 8;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - tolerancePx;
        if (atBottom) setCanInteract(true);
    };

    const scrollToBottom = () => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    };

    const styles = useMemo(() => {
        const overlay: CSSProperties = {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
        };

        const modal: CSSProperties = {
            width: '100%',
            maxWidth: 920,
            height: 'calc(95vh)',
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(30,30,30,0.98)',
            boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
        };

        const header: CSSProperties = {
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
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
            fontSize: 16,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        };

        const subtitle: CSSProperties = {
            margin: 0,
            fontSize: 12,
            color: 'rgba(255,255,255,0.60)',
        };

        const closeBtn: CSSProperties = {
            width: 34,
            height: 34,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(0,0,0,0.30)',
            color: 'rgba(255,255,255,0.90)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            flex: '0 0 auto',
        };

        const body: CSSProperties = {
            position: 'relative',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
        };

        const scrollArea: CSSProperties = {
            height: '100%',
            overflowY: 'auto' as const,
            overflowX: 'hidden' as const,
            padding: '14px 16px',
        };

        const baseText: CSSProperties = {
            color: 'rgba(255,255,255,0.84)',
            fontSize: 13,
            lineHeight: 1.68,
            letterSpacing: '0.01em',
            fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
            margin: '8px 0',
        };

        const h1: CSSProperties = {
            ...baseText,
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: '-0.015em',
            margin: '0 0 4px 0',
            color: 'rgba(255,255,255,0.94)',
        };

        const h2: CSSProperties = {
            ...baseText,
            fontSize: 14.5,
            fontWeight: 800,
            margin: '16px 0 6px 0',
            color: 'rgba(255,255,255,0.92)',
        };

        const h3: CSSProperties = {
            ...baseText,
            fontSize: 13,
            fontWeight: 800,
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
            fontSize: 12.5,
            lineHeight: 1.5,
        };

        const jumpBtn: CSSProperties = {
            position: 'absolute',
            right: 14,
            bottom: 14,
            width: 38,
            height: 38,
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
            opacity: canInteract ? 0 : 1,
            pointerEvents: 'auto'
        };

        const footer: CSSProperties = {
            padding: '12px 16px',
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
            gap: 12,
            padding: '10px 12px',
            borderRadius: 14,
            border: accepted ? '1px solid rgba(147,197,253,0.35)' : '1px solid rgba(255,255,255,0.12)',
            background: accepted ? 'rgba(147,197,253,0.08)' : 'rgba(255,255,255,0.03)',
            cursor: canInteract ? 'pointer' : 'not-allowed',
            userSelect: 'none',
            opacity: canInteract ? 1 : 0.55,
        };

        const box: CSSProperties = {
            width: 18,
            height: 18,
            borderRadius: 6,
            border: accepted ? '1px solid rgba(147,197,253,0.95)' : '1px solid rgba(255,255,255,0.25)',
            background: accepted ? 'rgba(147,197,253,0.22)' : 'rgba(0,0,0,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: accepted ? '0 0 0 4px rgba(147,197,253,0.10)' : 'none',
            flex: '0 0 auto',
        };

        const check: CSSProperties = {
            width: 10,
            height: 6,
            borderLeft: '2px solid rgba(255,255,255,0.92)',
            borderBottom: '2px solid rgba(255,255,255,0.92)',
            transform: 'rotate(-45deg)',
            marginTop: -1,
            opacity: accepted ? 1 : 0,
            transition: 'opacity 120ms ease',
        };

        const consentText: CSSProperties = {
            color: 'rgba(255,255,255,0.80)',
            fontSize: 12.5,
            lineHeight: 1.35,
            margin: 0,
        };

        const hint: CSSProperties = {
            margin: 0,
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
        };

        return {
            overlay,
            modal,
            header,
            titleWrap,
            title,
            subtitle,
            closeBtn,
            body,
            scrollArea,
            baseText,
            h1,
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
    }, [accepted, canInteract]);

    if (!open) return null;

    return (
        <div
            style={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label=".btc Domain Terms"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div
                style={styles.modal}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
            >
                <div style={styles.header}>
                    <div style={styles.titleWrap}>
                        <h1 style={styles.title}>.BTC Domain Terms</h1>
                        <p style={styles.subtitle}>Effective Date: {TOS_LAST_UPDATE}</p>
                    </div>

                    <button type="button" style={styles.closeBtn} onClick={() => onClose?.()} aria-label="Close" title="Close">
                        <span style={{ fontSize: 18, lineHeight: 1, transform: 'translateY(-1px)' }}>×</span>
                    </button>
                </div>

                <div style={styles.body}>
                    <div
                        ref={scrollRef}
                        style={styles.scrollArea}
                        onScroll={() => {
                            if (!canInteract) checkScrolledToBottom();
                        }}
                    >
                        {/* ===== .BTC DOMAIN TERMS (FULL) ===== */}

                        <div style={{ marginBottom: 10 }}>
                            <div style={styles.h1}>.BTC DOMAIN</div>
                            <div style={{ ...styles.h1, fontSize: 16, marginTop: 2 }}>
                                TERMS OF SERVICE, DISCLOSURE POLICY, AND ACCEPTABLE USE POLICY
                            </div>
                            <p style={{ ...styles.baseText, marginTop: 6, color: 'rgba(255,255,255,0.70)' }}>
                                ORANGE PILL LABS HOLDING LTD
                                <br />
                                Effective Date: {TOS_LAST_UPDATE}
                            </p>
                        </div>

                        <h2 style={styles.h2}>PREAMBLE</h2>
                        <p style={styles.baseText}>
                            This Terms of Service, Disclosure Policy, and Acceptable Use Policy (collectively, these &quot;Terms&quot;) constitutes a
                            legally binding agreement between you (&quot;User,&quot; &quot;Registrant,&quot; &quot;you,&quot; or &quot;your&quot;) and
                            ORANGE PILL LABS HOLDING LTD, a company incorporated and registered in Abu Dhabi Global Market, United Arab Emirates,
                            operating under the trade name OPNET (&quot;OPNET,&quot; &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
                            &quot;our&quot;). These Terms govern your use of the .btc domain namespace, the OPNet resolution services, the OPNET IPFS
                            pinning service, the opwallet application, and all related services, interfaces, and infrastructure provided or operated by
                            OPNET (collectively, the &quot;Services&quot;).
                        </p>
                        <p style={styles.baseText}>
                            By registering a .btc domain on the Bitcoin blockchain, by using any OPNET resolution service, by uploading content to the
                            OPNET IPFS pinning service, by accessing the opwallet application, or by otherwise interacting with the Services, you
                            acknowledge that you have read, understood, and agree to be bound by these Terms in their entirety. If you do not agree to
                            these Terms, you must not use the Services. If you are entering into these Terms on behalf of a legal entity, you represent
                            and warrant that you have the authority to bind such entity to these Terms.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 1: DEFINITIONS AND INTERPRETATION</h2>

                        <h3 style={styles.h3}>1.1 Definitions</h3>
                        <p style={styles.baseText}>
                            In these Terms, unless the context otherwise requires, the following terms shall have the meanings ascribed to them below.
                            &quot;Bitcoin&quot; means the decentralised peer-to-peer electronic cash system operating on the Bitcoin blockchain network.
                            &quot;Bitcoin Blockchain&quot; means the distributed public ledger recording all Bitcoin transactions. &quot;.btc Domain&quot;
                            means a human-readable identifier registered on the Bitcoin Blockchain within the .btc namespace. &quot;IPFS&quot; means the
                            InterPlanetary File System, a protocol and peer-to-peer network for storing and sharing data in a distributed file system
                            using content-addressing to uniquely identify files. &quot;Pinning&quot; means the act of instructing an IPFS node to retain
                            and serve specific content, preventing it from being removed during garbage collection. &quot;Resolution&quot; means the
                            process of translating a .btc domain name into associated data, records, or content addresses. &quot;Smart Contract&quot; means
                            self-executing code deployed on a blockchain that automatically enforces the terms of an agreement.
                        </p>

                        <h3 style={styles.h3}>1.2 Interpretation</h3>
                        <p style={styles.baseText}>
                            In these Terms, unless the context otherwise requires, words importing the singular shall include the plural and vice versa,
                            words importing any gender shall include all genders, references to persons shall include natural persons and legal entities,
                            headings are for convenience only and shall not affect interpretation, references to Articles and Sections are references to
                            Articles and Sections of these Terms, and any reference to a statute or statutory provision shall include any subordinate
                            legislation made under it and any amendment, re-enactment, or replacement thereof.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 2: NATURE OF SERVICES AND TECHNICAL DISCLOSURES</h2>

                        <h3 style={styles.h3}>2.1 Decentralised Domain Registration</h3>
                        <p style={styles.baseText}>
                            You acknowledge and understand that .btc domain registration occurs directly on the Bitcoin Blockchain through transactions
                            broadcast by you or on your behalf. OPNET does not act as an intermediary, registrar, custodian, or agent in the domain
                            registration process. When you register a .btc domain, you interact directly with the Bitcoin network by broadcasting a valid
                            Bitcoin transaction containing the registration data. OPNET has no role in processing, validating, confirming, or executing
                            your registration transaction. The Bitcoin network's miners validate and confirm your transaction according to Bitcoin's
                            consensus rules. Once your registration transaction is confirmed on the Bitcoin Blockchain, your domain registration becomes
                            part of Bitcoin's immutable public ledger.
                        </p>

                        <h3 style={styles.h3}>2.2 OPNet Consensus Layer</h3>
                        <p style={styles.baseText}>
                            OPNet operates as a consensus layer that reads, interprets, and validates Bitcoin transactions containing .btc domain data
                            according to the OPNet protocol rules. OPNet does not modify, process, or intermediate Bitcoin transactions. OPNet's consensus
                            layer observes the Bitcoin Blockchain and derives state from valid transactions. The OPNet protocol is trustless and
                            permissionless, meaning that any party may run an OPNet node to independently verify the state of all .btc domains. OPNET the
                            company does not control the OPNet protocol and cannot unilaterally alter protocol rules or domain ownership records.
                        </p>

                        <h3 style={styles.h3}>2.3 Non-Custodial Architecture</h3>
                        <p style={styles.baseText}>
                            The .btc domain system is entirely non-custodial. Your private keys remain exclusively under your control at all times.
                            Neither OPNET nor any OPNet protocol participant has access to, custody of, or control over your private keys, your Bitcoin,
                            or your domain assets. All domain registrations, transfers, updates, and renewals require cryptographic signatures from your
                            private keys. Loss of your private keys will result in permanent and irrecoverable loss of access to your domains and any
                            associated assets. OPNET has no capability to recover lost private keys, reverse transactions, or restore access to domains.
                        </p>

                        <h3 style={styles.h3}>2.4 Immutability of Blockchain Records</h3>
                        <p style={styles.baseText}>
                            You acknowledge and understand that once a .btc domain registration, transfer, or update transaction is confirmed on the
                            Bitcoin Blockchain, that record becomes practically immutable. Neither OPNET nor any other party can modify, reverse, cancel,
                            or delete blockchain records. OPNET has no technical capability to censor, revoke, transfer, or alter .btc domain registrations
                            recorded on the Bitcoin Blockchain. This immutability is a fundamental characteristic of blockchain technology and is not a
                            limitation imposed by OPNET but rather an inherent property of the underlying system.
                        </p>

                        <h3 style={styles.h3}>2.5 Partial Transaction Reversion</h3>
                        <p style={styles.baseText}>
                            You acknowledge and understand that transactions on OPNet may partially revert. Because OPNet operates as a consensus layer
                            atop Bitcoin rather than as an independent blockchain, when a transaction contains both Bitcoin value transfers and OPNet smart
                            contract execution, the OPNet execution component may fail or revert while the underlying Bitcoin transfer remains valid and
                            irreversible. Bitcoin transactions achieve finality through Bitcoin's proof-of-work consensus independently of OPNet's
                            consensus layer. If an OPNet execution fails, any Bitcoin transferred in that transaction cannot be recovered through OPNet
                            mechanisms because the Bitcoin transfer was valid under Bitcoin's consensus rules. You accept this partial reversion behaviour
                            as an inherent characteristic of the system.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 3: RESOLUTION SERVICES AND ACCESS CONTROL</h2>

                        <h3 style={styles.h3}>3.1 Distinction Between Registration and Resolution</h3>
                        <p style={styles.baseText}>
                            There exists a fundamental distinction between on-chain domain registration and domain resolution services. On-chain
                            registration refers to the immutable blockchain record of domain ownership and associated data, which neither OPNET nor any
                            party can modify as described in Article 2. Resolution services refer to the software, infrastructure, and interfaces through
                            which users query domain data and navigate to domain-associated content, including but not limited to the opwallet browser
                            application, the OPNET website resolver, any application programming interfaces, and any affiliated applications or services.
                            While OPNET cannot alter on-chain registrations, OPNET maintains complete and exclusive discretion over the operation of its
                            resolution services and browsing interfaces.
                        </p>

                        <h3 style={styles.h3}>3.2 OPNET&apos;s Right to Block Resolution</h3>
                        <p style={styles.baseText}>
                            OPNET expressly reserves the absolute and unilateral right to block, nullify, suspend, restrict, disable, or otherwise prevent
                            the resolution of any .btc domain through any OPNET-operated service, including without limitation opwallet and any other
                            resolution infrastructure, at any time, for any reason or for no reason, in OPNET&apos;s sole and absolute discretion, without
                            prior notice, without contemporaneous notice, without subsequent notice, without explanation, without appeal, and without any
                            liability whatsoever to you or any third party. When OPNET blocks a domain from resolution, users attempting to access that
                            domain through OPNET services will receive no resolution, an error message, a blocked domain notification, or such other
                            response as OPNET deems appropriate. Blocking a domain from resolution does not affect and cannot affect the underlying on-chain
                            registration, which remains permanently recorded on the Bitcoin Blockchain.
                        </p>

                        <h3 style={styles.h3}>3.3 Grounds for Resolution Blocking</h3>
                        <p style={styles.baseText}>
                            Without limiting the generality of Section 3.2, OPNET may block domain resolution for reasons including but not limited to:
                            alleged or actual trademark infringement, alleged or actual copyright infringement, alleged or actual patent infringement,
                            domains associated with content illegal under the laws of the United Arab Emirates, domains associated with content illegal
                            under the laws of any jurisdiction in which OPNET operates or in which users access the Services, domains used for phishing or
                            social engineering attacks, domains used for fraud or deceptive practices, domains impersonating natural persons or legal
                            entities, domains distributing malware or malicious software, domains associated with terrorism or violent extremism, domains
                            hosting or linking to child sexual abuse material, domains promoting illegal narcotics trafficking, domains facilitating money
                            laundering or terrorist financing, domains facilitating sanctions evasion, domains associated with hate speech or incitement to
                            violence, domains violating export control regulations, domains subject to court orders or legal process in any jurisdiction,
                            domains reported through OPNET&apos;s complaint mechanisms, domains that OPNET determines pose reputational risk to the .btc
                            ecosystem, and any other ground that OPNET deems sufficient in its sole and absolute discretion.
                        </p>

                        <h3 style={styles.h3}>3.4 No Notice or Appeal</h3>
                        <p style={styles.baseText}>
                            OPNET is under no obligation to provide notice before, during, or after blocking a domain from resolution. OPNET is under no
                            obligation to explain, justify, or document its reasoning for any blocking decision. OPNET is under no obligation to establish,
                            maintain, or operate any appeals process, review mechanism, reinstatement procedure, or grievance mechanism. OPNET is under no
                            obligation to respond to any inquiry, complaint, or communication regarding any blocking decision. You acknowledge and accept
                            that OPNET may exercise its blocking rights at any moment without warning and that you shall have no recourse, remedy, or claim
                            against OPNET for any blocking action or the consequences thereof.
                        </p>

                        <h3 style={styles.h3}>3.5 Effect of Resolution Blocking</h3>
                        <p style={styles.baseText}>
                            When OPNET blocks a domain from resolution, the following consequences shall apply: the domain shall become inaccessible through
                            opwallet and all OPNET-operated resolution services, any content associated with the domain shall become unreachable through
                            OPNET infrastructure, the domain may be flagged, marked, or listed as blocked in OPNET interfaces, the domain owner shall retain
                            full on-chain ownership and may transfer the domain through on-chain transactions, and the domain owner may attempt to access or
                            resolve the domain through third-party infrastructure not operated by OPNET. OPNET makes no representation regarding the
                            availability, functionality, legality, or safety of any third-party resolution services. Blocking does not constitute seizure,
                            confiscation, forfeiture, or transfer of the domain itself or any property interest therein.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 4: IPFS PINNING SERVICE</h2>

                        <h3 style={styles.h3}>4.1 Nature of IPFS and Pinning</h3>
                        <p style={styles.baseText}>
                            IPFS is a distributed, peer-to-peer file storage and sharing protocol that identifies files by their cryptographic hash rather
                            than by their location. Content on IPFS is not stored on any single server but is distributed across multiple nodes in the
                            network. When content is added to IPFS, it receives a unique content identifier derived from the content&apos;s cryptographic
                            hash. Content persists on IPFS only so long as at least one node in the network retains and serves that content. Pinning is the
                            mechanism by which an IPFS node operator instructs their node to retain specific content and continue serving it to the network,
                            preventing automatic removal during the node&apos;s garbage collection processes.
                        </p>

                        <h3 style={styles.h3}>4.2 OPNET IPFS Pinning Service</h3>
                        <p style={styles.baseText}>
                            OPNET operates an IPFS pinning service that allows users to upload content and have that content pinned to OPNET-operated IPFS
                            nodes. When you upload content to the OPNET IPFS pinning service, OPNET&apos;s nodes will retain and serve that content to the
                            IPFS network, making it accessible to users requesting that content through IPFS. The OPNET IPFS pinning service is provided to
                            facilitate the hosting of content associated with .btc domains. By using the OPNET IPFS pinning service, you can associate
                            website content, application data, or other files with your .btc domain and have that content served through OPNET
                            infrastructure.
                        </p>

                        <h3 style={styles.h3}>4.3 OPNET&apos;s Right to Unpin Content</h3>
                        <p style={styles.baseText}>
                            OPNET expressly reserves the absolute and unilateral right to unpin, remove, delete, or cease serving any content from its IPFS
                            nodes at any time, for any reason or for no reason, in OPNET&apos;s sole and absolute discretion, without prior notice, without
                            contemporaneous notice, without subsequent notice, without explanation, without appeal, and without any liability whatsoever to
                            you or any third party. When OPNET unpins content, OPNET&apos;s nodes will cease retaining and serving that content. If OPNET was
                            the only node pinning the content, the content may become unavailable on IPFS entirely. If other nodes were also pinning the
                            content, the content may remain available through those other nodes. OPNET makes no representation regarding whether any other
                            nodes are pinning any particular content.
                        </p>

                        <h3 style={styles.h3}>4.4 Grounds for Unpinning</h3>
                        <p style={styles.baseText}>
                            Without limiting the generality of Section 4.3, OPNET may unpin content for any of the grounds specified in Section 3.3 with
                            respect to resolution blocking, as well as for: excessive bandwidth consumption, storage capacity limitations, content that OPNET
                            determines is not legitimately associated with a .btc domain, content uploaded in violation of these Terms, content that OPNET
                            determines is abusive of the IPFS pinning service, and any other ground that OPNET deems sufficient in its sole and absolute
                            discretion.
                        </p>

                        <h3 style={styles.h3}>4.5 No Guarantee of Availability</h3>
                        <p style={styles.baseText}>
                            OPNET does not guarantee the availability, persistence, accessibility, performance, or integrity of any content pinned through
                            the OPNET IPFS pinning service. IPFS nodes may experience downtime, connectivity issues, hardware failures, or other technical
                            problems. Content may become temporarily or permanently unavailable due to factors within or beyond OPNET&apos;s control. You are
                            solely responsible for maintaining backup copies of any content you upload to the OPNET IPFS pinning service. OPNET shall have
                            no liability for any loss, corruption, or unavailability of content.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 5: INTELLECTUAL PROPERTY AND THIRD-PARTY RIGHTS</h2>

                        <h3 style={styles.h3}>5.1 User Responsibility for Trademark Clearance</h3>
                        <p style={styles.baseText}>
                            You are solely and exclusively responsible for ensuring that any .btc domain you register, and any content you associate with
                            such domain, does not infringe upon the trademarks, service marks, trade names, trade dress, or other intellectual property
                            rights of any third party in any jurisdiction. Before registering a domain, you must conduct thorough due diligence including
                            appropriate trademark searches in all relevant jurisdictions. OPNET does not perform trademark searches, does not verify
                            trademark availability, does not provide legal advice, and makes no representation regarding whether any domain registration or
                            use may constitute infringement. Registration of a .btc domain does not grant you any trademark rights, does not establish
                            priority over existing trademark holders, and does not constitute legal clearance for commercial use of the domain name.
                        </p>

                        <h3 style={styles.h3}>5.2 User Responsibility for Copyright Compliance</h3>
                        <p style={styles.baseText}>
                            You are solely and exclusively responsible for ensuring that any content you upload to the OPNET IPFS pinning service or
                            otherwise associate with your .btc domain does not infringe upon the copyrights, moral rights, or other intellectual property
                            rights of any third party in any jurisdiction. You represent and warrant that you own or have obtained all necessary rights,
                            licences, consents, and permissions to upload, distribute, and display any content you provide through the Services. OPNET does
                            not review content for copyright compliance and makes no representation regarding the legal status of any content.
                        </p>

                        <h3 style={styles.h3}>5.3 Complaint Procedure</h3>
                        <p style={styles.baseText}>
                            Third parties who believe that a .btc domain or associated content infringes their intellectual property rights or violates
                            applicable law may submit a complaint to OPNET at report@opnet.org. Complaints must include: clear identification of the
                            allegedly infringing domain or content, identification of the intellectual property right allegedly infringed including
                            registration numbers and jurisdictions where applicable, a detailed description of how the domain or content allegedly infringes
                            the claimed right, the complainant&apos;s full legal name and contact information, a statement that the complainant has a good
                            faith belief that the use is not authorised by the intellectual property owner or the law, a statement under penalty of perjury
                            that the information provided is accurate and that the complainant is authorised to act on behalf of the intellectual property
                            owner, and the complainant&apos;s physical or electronic signature. OPNET may in its sole discretion investigate the complaint,
                            request additional information, block the domain from resolution, unpin associated content, take no action, or refer the matter
                            to appropriate authorities.
                        </p>

                        <h3 style={styles.h3}>5.4 OPNET Not an Adjudicatory Body</h3>
                        <p style={styles.baseText}>
                            OPNET is not a court, tribunal, arbitrator, mediator, or adjudicatory body. OPNET does not resolve intellectual property
                            disputes, does not determine questions of trademark validity or infringement, does not determine questions of copyright
                            ownership or infringement, and does not issue binding decisions regarding any party&apos;s rights. OPNET&apos;s decision to block
                            or not block a domain, or to unpin or not unpin content, does not constitute a legal determination regarding any intellectual
                            property claim. Intellectual property disputes must be resolved through appropriate legal proceedings between the parties in
                            courts or tribunals of competent jurisdiction.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 6: PROHIBITED USES AND ACCEPTABLE USE POLICY</h2>

                        <h3 style={styles.h3}>6.1 Prohibited Content</h3>
                        <p style={styles.baseText}>
                            You agree not to register, use, or associate any .btc domain with content that: constitutes, depicts, promotes, or facilitates
                            child sexual abuse or exploitation in any form, promotes, incites, or facilitates terrorism or violent extremism, incites or
                            promotes violence against any individual or group, constitutes or facilitates phishing, social engineering, or fraud,
                            impersonates any natural person or legal entity for deceptive purposes, distributes malware, viruses, ransomware, or other
                            malicious software, promotes or facilitates illegal drug manufacturing or trafficking, facilitates human trafficking or modern
                            slavery, facilitates illegal weapons trafficking, facilitates money laundering or terrorist financing, facilitates evasion of
                            sanctions imposed by the United Arab Emirates, the United Nations, the United States, the European Union, or any other relevant
                            jurisdiction, violates export control regulations, constitutes defamation or libel under applicable law, violates privacy rights
                            including through non-consensual intimate imagery, promotes self-harm or suicide, facilitates illegal gambling, infringes
                            intellectual property rights, or is otherwise illegal under the laws of the United Arab Emirates or any jurisdiction in which
                            OPNET operates or users access the Services.
                        </p>

                        <h3 style={styles.h3}>6.2 Prohibited Technical Uses</h3>
                        <p style={styles.baseText}>
                            You agree not to use .btc domains or the Services to: conduct denial-of-service attacks or participate in botnets, distribute
                            spam or unsolicited commercial communications, host command-and-control infrastructure for malicious networks, facilitate
                            unauthorised access to computer systems, circumvent security measures or access controls, engage in domain squatting with intent
                            to extract payment from trademark holders, register domains in bad faith to prevent legitimate use by rights holders, conduct
                            automated bulk registration designed to monopolise namespace, abuse the IPFS pinning service through excessive uploads or
                            bandwidth consumption, or otherwise abuse, disrupt, or interfere with the Services or their intended operation.
                        </p>

                        <h3 style={styles.h3}>6.3 Reporting Violations</h3>
                        <p style={styles.baseText}>
                            Any person may report suspected violations of this Acceptable Use Policy by sending a report to report@opnet.org. Reports should
                            include the domain name at issue, a description of the alleged violation, supporting evidence where available, and contact
                            information for the reporter. OPNET will review reports and take such action as it deems appropriate in its sole discretion.
                            OPNET is under no obligation to investigate every report, to take action on every report, to communicate with reporters
                            regarding the status or outcome of their reports, or to explain its decisions.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 7: DISCLAIMERS AND EXCLUSIONS</h2>

                        <h3 style={styles.h3}>7.1 No Warranties</h3>
                        <p style={styles.baseText}>
                            THE SERVICES, INCLUDING WITHOUT LIMITATION THE .BTC DOMAIN SYSTEM, THE OPNET CONSENSUS LAYER, THE OPWALLET APPLICATION, AND THE
                            IPFS PINNING SERVICE, ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND,
                            WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, OPNET EXPRESSLY DISCLAIMS
                            ALL WARRANTIES INCLUDING WITHOUT LIMITATION: IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
                            NON-INFRINGEMENT; WARRANTIES ARISING FROM COURSE OF DEALING, COURSE OF PERFORMANCE, OR USAGE OF TRADE; WARRANTIES THAT THE
                            SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM VIRUSES OR HARMFUL COMPONENTS; WARRANTIES THAT DEFECTS WILL BE
                            CORRECTED; AND WARRANTIES REGARDING THE ACCURACY, COMPLETENESS, RELIABILITY, OR AVAILABILITY OF ANY INFORMATION OR CONTENT.
                        </p>

                        <h3 style={styles.h3}>7.2 No Investment Value</h3>
                        <p style={styles.baseText}>
                            OPNET MAKES NO REPRESENTATION REGARDING THE VALUE, UTILITY, MARKETABILITY, OR INVESTMENT POTENTIAL OF ANY .BTC DOMAIN. DOMAIN
                            NAMES HAVE NO INTRINSIC VALUE. ANY PERCEIVED VALUE IS ENTIRELY SPECULATIVE AND SUBJECT TO CHANGE WITHOUT NOTICE. YOU ACKNOWLEDGE
                            THAT YOU MAY NOT BE ABLE TO SELL, TRANSFER, OR MONETISE YOUR DOMAIN FOR ANY AMOUNT. REGISTRATION OF A DOMAIN DOES NOT GUARANTEE
                            THAT ANY PARTY WILL WISH TO PURCHASE IT, THAT IT WILL GENERATE REVENUE, OR THAT IT WILL RETAIN ANY VALUE. YOU MUST NOT REGISTER
                            DOMAINS AS AN INVESTMENT OR WITH ANY EXPECTATION OF PROFIT OR RETURN.
                        </p>

                        <h3 style={styles.h3}>7.3 No Guarantee of Continued Service</h3>
                        <p style={styles.baseText}>
                            OPNET DOES NOT GUARANTEE THAT THE SERVICES WILL REMAIN AVAILABLE FOR ANY PARTICULAR DOMAIN, FOR THE .BTC NAMESPACE GENERALLY, OR
                            AT ALL. OPNET MAY DISCONTINUE, MODIFY, SUSPEND, OR RESTRICT THE SERVICES AT ANY TIME FOR ANY REASON. YOUR ON-CHAIN DOMAIN
                            REGISTRATION DOES NOT ENTITLE YOU TO PERPETUAL ACCESS THROUGH OPNET INFRASTRUCTURE. WHILE YOUR ON-CHAIN REGISTRATION REMAINS
                            IMMUTABLE ON THE BITCOIN BLOCKCHAIN, YOUR ABILITY TO RESOLVE AND USE THAT DOMAIN THROUGH OPNET SERVICES DEPENDS ENTIRELY UPON
                            OPNET&apos;S CONTINUED PROVISION OF THOSE SERVICES IN ITS SOLE DISCRETION.
                        </p>

                        <h3 style={styles.h3}>7.4 Assumption of Risk</h3>
                        <p style={styles.baseText}>
                            You expressly acknowledge and assume all risks associated with registering and using .btc domains and the Services, including
                            without limitation: risk of permanent loss of access due to lost or compromised private keys, risk of technical failures, bugs,
                            or vulnerabilities in the OPNet protocol, risk of Bitcoin network congestion, reorganisation, or consensus changes affecting
                            transactions, risk that your domain may be blocked from OPNET resolution services, risk that OPNET may unpin your IPFS content,
                            risk that third parties may challenge your use of a domain name, risk that the .btc namespace may not achieve widespread
                            adoption, risk of regulatory action affecting availability or legality, risk of smart contract vulnerabilities, and all other
                            risks inherent in decentralised systems and blockchain technology. You represent that you have sufficient knowledge and
                            experience to evaluate and assume these risks.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 8: LIMITATION OF LIABILITY</h2>

                        <h3 style={styles.h3}>8.1 Exclusion of Certain Damages</h3>
                        <p style={styles.baseText}>
                            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL OPNET, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS,
                            AFFILIATES, SHAREHOLDERS, SUCCESSORS, OR ASSIGNS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR
                            EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, LOSS OF REVENUE, LOSS OF BUSINESS, LOSS OF GOODWILL,
                            LOSS OF USE, LOSS OF DATA, LOSS OF CONTENT, LOSS OF DOMAIN VALUE, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION
                            WITH THESE TERMS, THE SERVICES, YOUR REGISTRATION OR USE OF .BTC DOMAINS, ANY BLOCKING OR RESTRICTION OF ACCESS, ANY UNPINNING OF
                            CONTENT, OR ANY OTHER MATTER RELATING TO THE SERVICES, REGARDLESS OF THE THEORY OF LIABILITY (WHETHER CONTRACT, TORT, STRICT
                            LIABILITY, NEGLIGENCE, OR OTHERWISE) AND REGARDLESS OF WHETHER OPNET WAS ADVISED OF OR SHOULD HAVE KNOWN OF THE POSSIBILITY OF
                            SUCH DAMAGES.
                        </p>

                        <h3 style={styles.h3}>8.2 Maximum Aggregate Liability</h3>
                        <p style={styles.baseText}>
                            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OPNET&apos;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR
                            IN CONNECTION WITH THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE GREATER OF: (A) ONE HUNDRED UNITED STATES DOLLARS (USD
                            100.00); OR (B) THE TOTAL AMOUNT PAID BY YOU TO OPNET FOR THE SERVICES IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT
                            GIVING RISE TO THE CLAIM. THIS LIMITATION APPLIES REGARDLESS OF THE NUMBER OF CLAIMS, THE THEORY OF LIABILITY, OR THE FORM OF
                            ACTION.
                        </p>

                        <h3 style={styles.h3}>8.3 Essential Basis of Agreement</h3>
                        <p style={styles.baseText}>
                            You acknowledge that the disclaimers, exclusions, and limitations of liability set forth in Articles 7 and 8 reflect a
                            reasonable and fair allocation of risk between you and OPNET, that they form an essential basis of the bargain between the
                            parties, and that OPNET would not provide the Services without these limitations. The limitations shall apply even if any
                            limited remedy fails of its essential purpose.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 9: INDEMNIFICATION</h2>
                        <p style={styles.baseText}>
                            You agree to indemnify, defend, and hold harmless OPNET and its directors, officers, employees, agents, affiliates,
                            shareholders, successors, and assigns (collectively, &quot;Indemnified Parties&quot;) from and against any and all claims,
                            demands, actions, proceedings, damages, losses, liabilities, costs, and expenses (including without limitation reasonable legal
                            fees and disbursements) arising out of or in connection with: your registration, ownership, or use of any .btc domain; any
                            content you upload to the IPFS pinning service or otherwise associate with your domains; your breach of these Terms or any
                            representation or warranty contained herein; your violation of any applicable law, regulation, or order; your violation of any
                            third party&apos;s rights including intellectual property rights, privacy rights, or publicity rights; any dispute between you
                            and any third party regarding domain ownership, use, or content; any claim that your domain or content infringes,
                            misappropriates, or violates any party&apos;s rights; your use of the Services in any manner not authorised by these Terms; and
                            any negligent, reckless, or intentional misconduct by you. OPNET reserves the right to assume exclusive defence and control of
                            any matter subject to indemnification by you, and you agree to cooperate with OPNET&apos;s defence. You shall not settle any
                            claim without OPNET&apos;s prior written consent.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 10: GOVERNING LAW AND JURISDICTION</h2>

                        <h3 style={styles.h3}>10.1 Governing Law</h3>
                        <p style={styles.baseText}>
                            These Terms and any dispute, controversy, or claim arising out of or in connection with these Terms or the Services, including
                            their existence, validity, interpretation, performance, breach, or termination, shall be governed by and construed in
                            accordance with the laws of Abu Dhabi Global Market, United Arab Emirates, and, to the extent applicable, the federal laws of
                            the United Arab Emirates, without regard to conflict of laws principles that would result in the application of the laws of any
                            other jurisdiction. The United Nations Convention on Contracts for the International Sale of Goods shall not apply to these
                            Terms.
                        </p>

                        <h3 style={styles.h3}>10.2 Exclusive Jurisdiction</h3>
                        <p style={styles.baseText}>
                            Subject to Section 10.4, any dispute, controversy, or claim arising out of or in connection with these Terms or the Services
                            that cannot be resolved amicably shall be subject to the exclusive jurisdiction of the courts of Abu Dhabi Global Market, United
                            Arab Emirates. You irrevocably submit to the exclusive jurisdiction of such courts, consent to service of process in any manner
                            permitted by applicable law, and waive any objection to venue in Abu Dhabi Global Market and any objection based on forum non
                            conveniens.
                        </p>

                        <h3 style={styles.h3}>10.3 Waiver of Class Actions and Jury Trial</h3>
                        <p style={styles.baseText}>
                            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, YOU AND OPNET EACH WAIVE ANY RIGHT TO A JURY TRIAL IN ANY PROCEEDING ARISING
                            OUT OF OR IN CONNECTION WITH THESE TERMS OR THE SERVICES. YOU AND OPNET EACH WAIVE ANY RIGHT TO PARTICIPATE IN CLASS ACTIONS,
                            CLASS ARBITRATIONS, REPRESENTATIVE ACTIONS, OR COLLECTIVE ACTIONS. ALL DISPUTES SHALL BE CONDUCTED ON AN INDIVIDUAL BASIS ONLY.
                            YOU SHALL NOT BRING, JOIN, OR PARTICIPATE IN ANY CLAIM IN A REPRESENTATIVE CAPACITY ON BEHALF OF ANY OTHER PERSON OR ENTITY.
                        </p>

                        <h3 style={styles.h3}>10.4 International Users and Compliance with Local Laws</h3>
                        <p style={styles.baseText}>
                            The Services are operated from the United Arab Emirates. OPNET makes no representation that the Services are appropriate,
                            lawful, or available for use in any jurisdiction other than the United Arab Emirates. If you access the Services from outside
                            the United Arab Emirates, you do so at your own risk and are solely responsible for compliance with all applicable local,
                            national, and international laws, regulations, and rules, including without limitation laws regarding the transmission of data,
                            online content, intellectual property, privacy, and blockchain technology. You agree not to access or use the Services from any
                            jurisdiction where such access or use would be prohibited or restricted by law. You acknowledge that: the legal status of
                            blockchain technology, cryptocurrencies, and domain name systems varies by jurisdiction; certain activities that are lawful in
                            some jurisdictions may be unlawful in others; OPNET cannot provide legal advice regarding the laws of your jurisdiction; and you
                            must independently determine whether your use of the Services complies with all laws applicable to you.
                        </p>

                        <h3 style={styles.h3}>10.5 Compliance with UAE Law</h3>
                        <p style={styles.baseText}>
                            You agree to comply with all applicable laws, regulations, directives, and orders of the United Arab Emirates, including without
                            limitation: Federal Law No. 5 of 2012 on Combatting Cybercrimes as amended, Federal Law No. 3 of 1987 promulgating the Penal
                            Code as amended, Federal Law No. 7 of 2014 on Combatting Terrorism Offences, Federal Decree-Law No. 34 of 2021 on Combatting
                            Rumours and Cybercrimes, Cabinet Resolution No. 57 of 2020 concerning the Positive List of Virtual Assets Activities, and all
                            regulations issued by the Securities and Commodities Authority, the Central Bank of the UAE, and the relevant financial
                            services regulatory authorities of Abu Dhabi Global Market. You acknowledge that violations of UAE law may result in civil and
                            criminal penalties.
                        </p>

                        <h3 style={styles.h3}>10.6 Export Controls and Sanctions</h3>
                        <p style={styles.baseText}>
                            You represent and warrant that you are not: located in, organised under the laws of, or ordinarily resident in any country or
                            territory subject to comprehensive sanctions by the United Arab Emirates, the United Nations, the United States, the European
                            Union, or the United Kingdom; identified on any sanctions list maintained by any of the foregoing jurisdictions; or owned or
                            controlled by, or acting on behalf of, any person or entity described in the foregoing. You agree not to use the Services in any
                            manner that would violate any applicable export control laws, trade sanctions, or embargo regulations.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 11: GENERAL PROVISIONS</h2>

                        <h3 style={styles.h3}>11.1 Entire Agreement</h3>
                        <p style={styles.baseText}>
                            These Terms, together with any documents or policies expressly incorporated by reference, constitute the entire agreement
                            between you and OPNET regarding the Services and supersede all prior and contemporaneous agreements, proposals, representations,
                            understandings, and communications, whether oral or written, relating to the subject matter hereof. No oral or written
                            statement, representation, or promise by any OPNET representative shall modify these Terms or create any additional obligation
                            unless such modification is in writing and signed by an authorised representative of OPNET.
                        </p>

                        <h3 style={styles.h3}>11.2 Amendment</h3>
                        <p style={styles.baseText}>
                            OPNET reserves the right to amend, modify, supplement, or replace these Terms at any time in its sole discretion by posting the
                            amended Terms on the OPNET website or through the Services. Amendments become effective immediately upon posting unless OPNET
                            specifies a later effective date. Your continued use of the Services after any amendment constitutes your acceptance of the
                            amended Terms. You are responsible for reviewing these Terms periodically. If you do not agree to any amended Terms, you must
                            immediately cease using the Services. OPNET is under no obligation to provide notice of amendments beyond posting the amended
                            Terms.
                        </p>

                        <h3 style={styles.h3}>11.3 Severability</h3>
                        <p style={styles.baseText}>
                            If any provision of these Terms is held to be invalid, illegal, void, or unenforceable by a court or tribunal of competent
                            jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable while
                            preserving the parties&apos; original intent, or if such modification is not possible, shall be severed from these Terms. The
                            invalidity or unenforceability of any provision shall not affect the validity or enforceability of any other provision, and all
                            remaining provisions shall continue in full force and effect.
                        </p>

                        <h3 style={styles.h3}>11.4 No Waiver</h3>
                        <p style={styles.baseText}>
                            No failure, delay, or omission by OPNET in exercising any right, power, privilege, or remedy under these Terms shall operate as
                            a waiver thereof. No single or partial exercise of any right, power, privilege, or remedy shall preclude any other or further
                            exercise thereof or the exercise of any other right, power, privilege, or remedy. No waiver shall be effective unless made in
                            writing and signed by an authorised representative of OPNET. A waiver on one occasion shall not be construed as a waiver of any
                            right or remedy on any future occasion.
                        </p>

                        <h3 style={styles.h3}>11.5 Assignment</h3>
                        <p style={styles.baseText}>
                            You may not assign, transfer, delegate, or otherwise dispose of these Terms or any rights, obligations, or interests hereunder,
                            in whole or in part, without OPNET&apos;s prior written consent. Any attempted assignment in violation of this provision shall
                            be null, void, and of no effect. OPNET may assign, transfer, delegate, or otherwise dispose of these Terms or any rights,
                            obligations, or interests hereunder without notice to you or your consent to any affiliate, or to any successor in connection
                            with a merger, acquisition, corporate reorganisation, or sale of all or substantially all assets, or by operation of law.
                        </p>

                        <h3 style={styles.h3}>11.6 No Third-Party Beneficiaries</h3>
                        <p style={styles.baseText}>
                            These Terms are for the sole benefit of you and OPNET and shall not confer any rights or remedies upon any third party. Nothing
                            in these Terms shall be construed to create any third-party beneficiary rights in any person or entity.
                        </p>

                        <h3 style={styles.h3}>11.7 Relationship of Parties</h3>
                        <p style={styles.baseText}>
                            Nothing in these Terms shall be deemed to create any partnership, joint venture, agency, franchise, sales representative, or
                            employment relationship between you and OPNET. You have no authority to make or accept any offers or representations on behalf
                            of OPNET. You shall not represent yourself as an employee, agent, or representative of OPNET.
                        </p>

                        <h3 style={styles.h3}>11.8 Force Majeure</h3>
                        <p style={styles.baseText}>
                            OPNET shall not be liable for any failure or delay in performing its obligations under these Terms to the extent such failure or
                            delay results from causes beyond OPNET&apos;s reasonable control, including without limitation acts of God, natural disasters,
                            war, terrorism, civil unrest, riots, strikes, labour disputes, government actions, embargoes, pandemic, epidemic, power failures,
                            internet or telecommunications failures, cyberattacks, hardware or software failures, or any other cause beyond OPNET&apos;s
                            reasonable control.
                        </p>

                        <h3 style={styles.h3}>11.9 Notices</h3>
                        <p style={styles.baseText}>
                            OPNET may provide notices to you by posting on the OPNET website, through the Services, or by such other means as OPNET deems
                            appropriate. Notices to OPNET must be sent by registered post or internationally recognised courier service to the registered
                            address of ORANGE PILL LABS HOLDING LTD, or by email to report@opnet.org for complaints and reports as specified in these Terms.
                            Notices shall be deemed received upon posting (for website notices), upon delivery confirmation (for postal and courier notices),
                            or upon transmission without bounce-back error (for email notices).
                        </p>

                        <h3 style={styles.h3}>11.10 Language</h3>
                        <p style={styles.baseText}>
                            These Terms are drafted in the English language. If these Terms are translated into any other language, the English language
                            version shall prevail in the event of any conflict, ambiguity, or inconsistency between the English version and any translation.
                        </p>

                        <h3 style={styles.h3}>11.11 Survival</h3>
                        <p style={styles.baseText}>
                            The following provisions shall survive any termination or expiration of these Terms: Article 1 (Definitions), Article 2
                            (Technical Disclosures), Section 3.2 through 3.5 (Resolution Blocking), Section 4.3 through 4.5 (Unpinning and Availability),
                            Article 5 (Intellectual Property), Article 7 (Disclaimers), Article 8 (Limitation of Liability), Article 9 (Indemnification),
                            Article 10 (Governing Law and Jurisdiction), Article 11 (General Provisions), and any other provisions that by their nature
                            should survive termination.
                        </p>

                        <h2 style={styles.h2}>ARTICLE 12: TERMINATION</h2>

                        <h3 style={styles.h3}>12.1 Termination by OPNET</h3>
                        <p style={styles.baseText}>
                            OPNET may terminate or suspend your access to the Services at any time, for any reason or for no reason, with or without cause,
                            with or without notice, in OPNET&apos;s sole and absolute discretion. Without limiting the foregoing, OPNET may terminate or
                            suspend your access if: you breach any provision of these Terms; OPNET receives a complaint alleging that your domain or content
                            infringes third-party rights; OPNET determines that your use of the Services poses a risk to OPNET, other users, or third
                            parties; OPNET discontinues the Services; or for any other reason OPNET deems appropriate.
                        </p>

                        <h3 style={styles.h3}>12.2 Effect of Termination</h3>
                        <p style={styles.baseText}>
                            Upon termination of your access to the Services for any reason: your right to use the Services shall immediately cease; OPNET
                            may block your domains from resolution through OPNET services; OPNET may unpin any content you uploaded to the IPFS pinning
                            service; your on-chain domain registrations shall remain recorded on the Bitcoin Blockchain and shall not be affected by
                            termination; you shall remain liable for all obligations accrued prior to termination; and OPNET shall have no liability to you
                            for any consequences of termination.
                        </p>

                        <hr style={styles.hr} />

                        <h2 style={styles.h2}>ACKNOWLEDGMENT AND ACCEPTANCE</h2>
                        <p style={styles.baseText}>
                            BY REGISTERING A .BTC DOMAIN ON THE BITCOIN BLOCKCHAIN, BY USING ANY OPNET RESOLUTION SERVICE, BY UPLOADING CONTENT TO THE OPNET
                            IPFS PINNING SERVICE, BY ACCESSING THE OPWALLET APPLICATION, OR BY OTHERWISE USING THE SERVICES, YOU ACKNOWLEDGE THAT: YOU HAVE
                            READ THESE TERMS IN THEIR ENTIRETY; YOU UNDERSTAND ALL PROVISIONS OF THESE TERMS; YOU AGREE TO BE LEGALLY BOUND BY ALL
                            PROVISIONS OF THESE TERMS; YOU HAVE HAD THE OPPORTUNITY TO SEEK INDEPENDENT LEGAL ADVICE BEFORE ACCEPTING THESE TERMS; YOU ARE OF
                            LEGAL AGE AND HAVE THE LEGAL CAPACITY TO ENTER INTO THESE TERMS; AND IF ACTING ON BEHALF OF A LEGAL ENTITY, YOU HAVE THE
                            AUTHORITY TO BIND SUCH ENTITY TO THESE TERMS.
                        </p>
                        <p style={styles.baseText}>
                            IF YOU DO NOT AGREE TO THESE TERMS, DO NOT REGISTER .BTC DOMAINS, DO NOT USE THE SERVICES, AND DO NOT ACCESS OPWALLET.
                        </p>

                        <h2 style={styles.h2}>CONTACT INFORMATION</h2>
                        <p style={styles.baseText}>
                            For complaints, reports, and inquiries regarding these Terms:
                            <br />
                            ORANGE PILL LABS HOLDING LTD
                            <br />
                            Abu Dhabi Global Market, United Arab Emirates
                            <br />
                            Email: report@opnet.org
                        </p>

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
                        aria-disabled={!canInteract}
                        tabIndex={canInteract ? 0 : -1}
                        onClick={() => {
                            if (!canInteract) return;
                            setAccepted((v) => !v);
                        }}
                        onKeyDown={(e) => {
                            if (!canInteract) return;
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
                            I agree to the .btc Domain Terms.
                            {!canInteract ? ' (Scroll to the bottom to enable.)' : ''}
                        </p>
                    </div>

                    <p style={styles.hint}>
                        {!canInteract
                            ? 'Please scroll to the bottom to enable acceptance.'
                            : accepted
                                ? 'Click “I accept” to continue.'
                                : 'Tick the box to enable “I accept”.'}
                    </p>

                    <Row justifyCenter>
                        <Button
                            text="I accept"
                            preset="primary"
                            disabled={!canInteract || !accepted}
                            onClick={() => {
                                if (!canInteract || !accepted) return;

                                if (typeof window !== 'undefined') {
                                    try {
                                        window.localStorage.setItem(TOS_DOMAIN_SEEN_KEY, '1');
                                        window.localStorage.setItem(TOS_DOMAIN_ACCEPTED_KEY, '1');
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
