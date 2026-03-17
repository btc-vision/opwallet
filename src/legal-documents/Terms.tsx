import React, { type CSSProperties } from 'react';

export type LegalDocStyles = {
    baseText: CSSProperties;
    h2: CSSProperties;
    h3: CSSProperties;
    ul: CSSProperties;
    ol: CSSProperties;
    li: CSSProperties;
    hr: CSSProperties;
    callout: CSSProperties;
};

type TermsTextProps = {
    effectiveDate: string;
    styles: LegalDocStyles;
};

/**
 * Renders the full OP_WALLET Terms of Use.
 * Text-only component intended for use inside a modal scroll area.
 */
export function TermsText({ effectiveDate, styles }: TermsTextProps) {
    return (
        <>
            <div style={{ marginBottom: 10 }}>
                <div style={{ ...styles.h2, fontSize: 14, marginTop: 2 }}>OP_WALLET</div>
                <div style={{ ...styles.h2, fontSize: 14, marginTop: 2 }}>TERMS OF USE</div>

                <p style={{ ...styles.baseText, marginTop: 6, color: 'rgba(255,255,255,0.70)' }}>
                    Last Updated: {effectiveDate}
                </p>
            </div>

            <div style={styles.callout}>
                <strong>Please read these Terms carefully.</strong> By accessing or using the Platform or the OP_WALLET
                Services, You agree that You have read, understood, and agree to be bound by these Terms, including the
                binding arbitration clause below. If You do not agree, please do not use the Platform.
            </div>

            <div style={styles.callout}>
                <strong>RESTRICTED JURISDICTIONS NOTICE</strong>
                <br />
                THE OPWALLET SERVICES (AS DEFINED HEREIN) WERE NOT DEVELOPED FOR, AND ARE NOT OFFERED TO PERSONS OR
                ENTITIES WHO RESIDE IN, ARE CITIZENS OF, ARE LOCATED IN, ARE INCORPORATED IN, OR HAVE A REGISTERED
                OFFICE OR PRINCIPAL PLACE OF BUSINESS IN ANY RESTRICTED JURISDICTION OR COUNTRY SUBJECT TO ANY SANCTIONS
                OR RESTRICTIONS PURSUANT TO ANY APPLICABLE LAW, INCLUDING THE CRIMEA REGION, CHINA, PAKISTAN,
                BANGLADESH, BHUTAN, NEPAL, MYANMAR, AFGHANISTAN, CUBA, IRAN, NORTH KOREA, PANAMA, SYRIA, RUSSIA, OR ANY
                JURISDICTIONS IN WHICH THE TRANSACTING OF CRYPTOCURRENCIES IS PROHIBITED OR RESTRICTED IN ANY FORM OR
                MANNER (COLLECTIVELY, THE “RESTRICTED JURISDICTIONS”) OR ANY PERSON OWNED, CONTROLLED, LOCATED IN OR
                ORGANIZED UNDER THE LAWS OF ANY RESTRICTED JURISDICTION OR A RESIDENT OF OR LOCATED IN ANY COUNTRY OR
                JURISDICTION THAT RESTRICTS ACCESS TO OR PROHIBITS USE OF DIGITAL ASSETS OR CRYPTO CURRENCIES
                (COLLECTIVELY, “RESTRICTED PERSONS”).
            </div>

            <div style={styles.callout}>
                <strong>BY USING THE OPWALLET SERVICES, YOU REPRESENT THAT:</strong>
                <br />
                (I) YOU ARE NOT A RESTRICTED PERSON; AND
                <br />
                (II) YOU (INCLUDING, IF APPLICABLE, YOUR REPRESENTATIVES, EMPLOYEES, OR ANY OTHER PERSON WITH ACCESS TO
                YOUR ACCOUNT) WILL NOT CONTROL YOUR USE OF THE OPWALLET SERVICES FROM WITHIN ANY RESTRICTED
                JURISDICTION.
                <br />
                <br />
                YOU FURTHER REPRESENT AND WARRANT THAT YOU ARE NOT SUBJECT TO ECONOMIC OR TRADE SANCTIONS ADMINISTERED
                OR ENFORCED BY ANY GOVERNMENTAL AUTHORITY OR OTHERWISE DESIGNATED ON ANY LISTS OF PROHIBITED OR
                RESTRICTED PARTIES (INCLUDING BUT NOT LIMITED TO THE LIST MAINTAINED BY THE OFFICE OF FOREIGN ASSETS OR
                CONTROL (OFAC) OF THE U.S. DEPARTMENT OF THE TREASURY) AND YOU ARE NOT LOCATED, INCORPORATED, OTHERWISE
                ESTABLISHED IN, A CITIZEN OF, OR RESIDENT OF, OR HAVE BUSINESS OPERATIONS IN ANY COUNTRY OR REGION
                SUBJECT TO A SANCTION REGIME.
            </div>

            <h2 style={styles.h2}>OP_WALLET TERMS OF USE</h2>
            <p style={styles.baseText}>
                These terms and conditions, together with any documents, policies, and additional terms that expressly
                incorporate them by reference, including the privacy policy [insert link] and any other applicable
                supplemental terms (as may be amended from time to time, the “Terms”), govern Your access to and use of
                all products, websites, subdomains, browser extensions, mobile and web applications, desktop
                applications, content, features, functionality, and services (collectively, the “OP_WALLET Services”)
                made available exclusively or non-exclusively on or through opnet.org, and any other website, mobile
                application, web application, or interface operated by Us (collectively, the “Platform”, “Wallet”, “We”
                or “Us”).
            </p>
            <p style={styles.baseText}>
                These Terms apply to all Users who engage with the Platform, including, but not limited to, users of the
                OP_WALLET Services, developers, node operators, token holders, traders, or other participants
                (collectively referred to as “Users”, “You” or “Your”).
            </p>
            <p style={styles.baseText}>
                These Terms apply solely to the Wallet and the OP_WALLET Services made available directly by the Company
                through the Platform. Additional terms may apply to specific OP_WALLET Services, programmes, features,
                or interfaces made available through the Platform. Where such terms apply, they will be provided
                separately and shall supplement these Terms. In the event of any inconsistency between these Terms and
                any additional terms, these Terms shall prevail unless expressly stated otherwise in the additional
                terms.
            </p>
            <p style={styles.baseText}>
                By accessing or using the Platform, You acknowledge that you have read, understood, and agree to be
                bound by these Terms. If You do not agree, do not access or use the Platform.
            </p>
            <p style={styles.baseText}>
                By using the OP_WALLET Service, You consent to receive communications from the Company via email, in-app
                notifications, or other digital means. These communications may include service-related messages,
                updates, legal notices, or administrative communications.
            </p>

            <h2 style={styles.h2}>ACCESS, MODIFICATIONS &amp; ELIGIBILITY</h2>
            <p style={styles.baseText}>
                You may access and use the Wallet only if You are at legal age in Your respective jurisdiction and have
                the legal capacity to enter into a binding agreement under Applicable Law. If You are using the Wallet
                on behalf of an entity, You represent and warrant that You have the authority to bind that entity to
                these Terms.
            </p>
            <p style={styles.baseText}>
                The Wallet is provided for Your personal or internal business use only, unless otherwise expressly
                agreed in writing by the Company. You must not use the Wallet if You are prohibited from doing so under
                Applicable Law or if Your access to the Wallet has been suspended or terminated by the Company.
            </p>
            <p style={styles.baseText}>
                The Wallet does not require You to create an account with the Company. All Private Keys, Recovery
                Phrases, and authentication credentials are generated and stored locally on Your device and remain
                solely under Your control.
            </p>
            <p style={styles.baseText}>
                You are responsible, at Your own cost, for obtaining and maintaining the devices, software, and internet
                connectivity necessary to access and use the Wallet. You are solely responsible for maintaining the
                security of Your device and key material.
            </p>
            <p style={styles.baseText}>
                You are solely responsible for ensuring that Your access to and use of the Wallet complies with all
                Applicable Laws in Your jurisdiction.
            </p>
            <p style={styles.baseText}>
                We may from time to time make updates available for the Wallet (including security patches and
                compatibility changes). You are responsible for promptly installing updates.
            </p>

            <h2 style={styles.h2}>SCOPE OF SERVICES</h2>
            <p style={styles.baseText}>
                Wallet provides a technical, non-custodial software interface intended to help Users generate and manage
                self-hosted cryptographic credentials, view and interact with supported blockchain networks, and
                initiate transactions by signing with credentials controlled solely by the User.
            </p>
            <p style={styles.baseText}>
                The Wallet is a non-custodial software application and technical interface, made available as a browser
                extension and, where released, as a mobile application and/or desktop application, that enables Users to
                generate cryptographic key pairs locally, sign transactions on their device, and interact with supported
                blockchain networks, including:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>the Bitcoin blockchain; and</li>
                <li style={styles.li}>
                    the OPNet protocol and consensus layer implemented on or in connection with the Bitcoin network.
                </li>
            </ul>
            <p style={styles.baseText}>
                Wallet is currently free to use. We do not charge subscription fees or user charges for access to the
                basic Platform services at this time. However, We reserve the right to introduce paid features or
                subscription tiers in the future. If We introduce paid features, additional terms (including pricing,
                billing, payment, refund, and cancellation terms) will apply, and We will make such terms available to
                You and require Your acceptance prior to Your purchase, subscription to, or use of any paid feature. We
                may modify pricing for paid features at any time with notice as provided in these Terms.
            </p>
            <p style={styles.baseText}>
                You acknowledge and agree that connecting a Wallet is entirely at Your sole risk and discretion. The
                Wallet does not custody Digital Assets, operate a node on Your behalf, or act as an exchange, broker,
                custodian, settlement agent, or other financial intermediary.
            </p>
            <p style={styles.baseText}>
                All OP_WALLET Services are provided on an “as is” and “as available” basis without warranties of any
                kind.
            </p>

            <h2 style={styles.h2}>DEFINITIONS</h2>
            <p style={styles.baseText}>
                Unless otherwise defined in these Terms or the context otherwise requires, the following capitalised
                terms shall have the meanings set out below:
            </p>

            <h3 style={styles.h3}>Defined Terms</h3>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>.btc Domain</strong>: means a human-readable identifier registered on the Bitcoin blockchain
                    within the .btc namespace.
                </li>
                <li style={styles.li}>
                    <strong>ADIAC Arbitration Rules</strong>: means the arbitration rules of the ADIAC in force at the
                    time a Dispute is referred to arbitration under clause 15.
                </li>
                <li style={styles.li}>
                    <strong>Applicable Law</strong>: means all statutes, laws, regulations, ordinances, enactments,
                    rules, judgements, orders, notifications, decrees, by-laws, approvals, government resolutions, acts
                    of legislature or parliament, guidelines, policies, directions, or directives.
                </li>
                <li style={styles.li}>
                    <strong>Bitcoin Layer 1</strong>: means the base-layer Bitcoin blockchain network that validates,
                    records, and finalises transactions in accordance with the Bitcoin protocol’s consensus rules.
                </li>
                <li style={styles.li}>
                    <strong>BTC</strong>: means the native cryptocurrency of the Bitcoin Network.
                </li>
                <li style={styles.li}>
                    <strong>Business Days</strong>: any day other than a Sunday or a day on which scheduled commercial
                    banks in United Arab Emirates are authorised or required by Applicable Law to be closed.
                </li>
                <li style={styles.li}>
                    <strong>Digital Asset</strong>: means any cryptocurrency, native blockchain token, fungible token
                    (including OP20 tokens), non-fungible token (including OP721 tokens), or other blockchain-based
                    digital asset that may be accessed, managed, or transferred using the Wallet.
                </li>
                <li style={styles.li}>
                    <strong>Governmental Authority</strong>: means any relevant domestic or foreign governmental or
                    quasi-governmental, statutory, regulatory, judicial, fiscal, or administrative body or authority.
                </li>
                <li style={styles.li}>
                    <strong>Intellectual Property</strong>: includes all ideas, concepts, creations, discoveries,
                    inventions, improvements, know-how, trade secrets, proprietary techniques, methods, processes,
                    systems, algorithms, works of authorship, research, software programs, databases, electronic codes,
                    and other confidential or proprietary information.
                </li>
                <li style={styles.li}>
                    <strong>Intellectual Property Rights</strong>: means all rights, title, and interest under any
                    statute or common law in respect of Intellectual Property, including patent rights, copyrights,
                    moral rights, licences, permissions, applications, renewals, and causes of action.
                </li>
                <li style={styles.li}>
                    <strong>MotoSwap</strong>: means the decentralised token swap protocol and related smart contracts,
                    interfaces, and applications made available at motoswap.org (and any successor domain), which may be
                    accessible through the Wallet and which are governed by separate terms and conditions.
                </li>
                <li style={styles.li}>
                    <strong>OP_WALLET</strong>: means the Wallet, including any browser extension, mobile application,
                    desktop application, website, and any related software or interfaces made available by the Company.
                </li>
                <li style={styles.li}>
                    <strong>OP20 Token</strong>: means a fungible token standard deployed on the OPNet consensus layer.
                </li>
                <li style={styles.li}>
                    <strong>OP721 Token</strong>: means a non-fungible token standard deployed on the OPNet consensus
                    layer.
                </li>
                <li style={styles.li}>
                    <strong>OPNet</strong>: means the trustless, permissionless consensus layer and protocol implemented
                    on or in connection with the Bitcoin network that reads Bitcoin Layer 1 transactions and executes
                    Smart Contract logic in accordance with OPNet protocol rules.
                </li>
                <li style={styles.li}>
                    <strong>Personal Data</strong>: any information, whether true or not, that can identify an
                    individual on its own or when combined with other information.
                </li>
                <li style={styles.li}>
                    <strong>Privacy Policy</strong>: means the Company’s privacy policy, as updated from time to time
                    and made available through the Wallet or the Company’s website.
                </li>
                <li style={styles.li}>
                    <strong>Private Key</strong>: means a cryptographic key that is used to sign blockchain transactions
                    and control access to Digital Assets associated with a particular blockchain address.
                </li>
                <li style={styles.li}>
                    <strong>Recovery Phrase</strong>: means a series of words generated by the Wallet that can be used
                    to derive or restore Private Keys.
                </li>
                <li style={styles.li}>
                    <strong>Smart Contract</strong>: means self-executing code deployed on a blockchain network that
                    automatically performs functions in accordance with its programmed logic.
                </li>
                <li style={styles.li}>
                    <strong>Third-Party Partners</strong>: means any person that develops, owns, operates, provides, or
                    makes available a Third-Party Service or other service provider whose products or services may be
                    accessed or interacted with through the Wallet.
                </li>
                <li style={styles.li}>
                    <strong>Third-Party Services</strong>: means any protocol, blockchain network, decentralised
                    application, Smart Contract, website, exchange interface, token issuer, or other service that is not
                    governed by these Terms, including any such service that may be accessed or interacted with through
                    the Wallet.
                </li>
            </ul>

            <h3 style={styles.h3}>Interpretation</h3>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    Headings and defined terms are for convenience only and do not affect interpretation.
                </li>
                <li style={styles.li}>
                    The meaning of general words is not limited by specific examples introduced by “including,” “for
                    example,” “such as,” or similar expressions.
                </li>
                <li style={styles.li}>
                    Unless otherwise indicated, a reference to a specified clause is a reference to that clause of these
                    Terms.
                </li>
                <li style={styles.li}>The singular includes the plural and vice versa.</li>
                <li style={styles.li}>
                    All terms and conditions of these Terms, including introductory paragraphs, recitals, schedules, and
                    any attached documents, are contractual, binding, and incorporated by reference.
                </li>
                <li style={styles.li}>
                    A reference to a particular person includes that person&apos;s executors, administrators,
                    successors, permitted assigns, and legal representatives.
                </li>
                <li style={styles.li}>
                    A reference to any date or time is determined in accordance with the relevant jurisdiction
                    applicable to these Terms.
                </li>
                <li style={styles.li}>
                    Any period of time calculated from a specific date or event excludes the starting date unless
                    expressly stated otherwise.
                </li>
            </ul>

            <h2 style={styles.h2}>USE RESTRICTIONS</h2>
            <p style={styles.baseText}>You agree not to, and not to attempt to:</p>
            <ol style={styles.ol}>
                <li style={styles.li}>
                    use the Platform, Wallet, or OP_WALLET Services in any manner that could interfere with, disrupt,
                    negatively affect, or inhibit other users from fully enjoying the OP_WALLET Services;
                </li>
                <li style={styles.li}>
                    bypass, disable, defeat, circumvent, or otherwise attempt to override access controls, rate limits,
                    security features, content protections, geographic restrictions, compliance controls, or
                    jurisdictional restrictions;
                </li>
                <li style={styles.li}>
                    probe, scan, or test the vulnerability of any system or network, or breach or circumvent any
                    security or authentication measures;
                </li>
                <li style={styles.li}>
                    introduce, transmit, distribute, or deploy malware, exploits, viruses, trojan horses, worms, logic
                    bombs, spyware, denial-of-service activity, or other harmful code;
                </li>
                <li style={styles.li}>
                    use the Platform, Wallet, or OP_WALLET Services for illegal, fraudulent, deceptive, or prohibited
                    activities;
                </li>
                <li style={styles.li}>transmit, facilitate, or promote spam, phishing, or deceptive communications;</li>
                <li style={styles.li}>
                    reverse engineer, decompile, disassemble, decrypt, or otherwise attempt to derive source code, trade
                    secrets, proprietary algorithms, non-public data, or other proprietary information;
                </li>
                <li style={styles.li}>
                    copy, reproduce, modify, adapt, translate, distribute, sublicense, license, sell, resell, transfer,
                    assign, lease, rent, or otherwise commercially exploit the Platform, the Wallet, or the OP_WALLET
                    Services;
                </li>
                <li style={styles.li}>
                    use automated systems, bots, crawlers, scrapers, or data-mining tools to access, monitor, or extract
                    data, except where explicitly authorised in writing;
                </li>
                <li style={styles.li}>
                    use anonymising technologies, VPNs, proxy servers, Tor networks, or similar methods to circumvent
                    jurisdictional restrictions or compliance controls;
                </li>
                <li style={styles.li}>
                    infringe, misappropriate, or otherwise violate the Intellectual Property Rights or other rights of
                    the Company or any third party;
                </li>
                <li style={styles.li}>
                    remove, alter, obscure, or circumvent any proprietary notices, risk disclosures, disclaimers,
                    warnings, branding, or other notices;
                </li>
                <li style={styles.li}>
                    use the Platform, Wallet, or OP_WALLET Services in any manner that could reasonably be expected to
                    harm the legitimate business interests, reputation, or goodwill of the Company; or
                </li>
                <li style={styles.li}>
                    assist, encourage, or enable any third party to engage in any of the foregoing activities.
                </li>
            </ol>

            <p style={styles.baseText}>
                We reserve the right, but are not obligated, to implement technical controls (including rate limits,
                blocks, and access restrictions) and to restrict, suspend, disable, or terminate access to the Platform,
                the Wallet, the OP_WALLET Services, or any related functionality at Our sole discretion, without prior
                notice, where We determine that:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>You have violated these Terms or engaged in prohibited conduct;</li>
                <li style={styles.li}>
                    Your use presents legal, regulatory, security, operational, or reputational risk;
                </li>
                <li style={styles.li}>
                    such action is necessary to maintain the integrity, security, or availability of the Platform or OP
                    Wallet Services; or
                </li>
                <li style={styles.li}>
                    such action is required to comply with Applicable Law or a request or order from a Governmental
                    Authority.
                </li>
            </ul>
            <p style={styles.baseText}>
                Nothing in this clause affects Your control over Your Private Keys or Digital Assets, which remain
                solely under Your control.
            </p>

            <h2 style={styles.h2}>LIMITATIONS OF SERVICE</h2>

            <h3 style={styles.h3}>No Control Over Digital Assets or Transactions</h3>
            <p style={styles.baseText}>
                The Company does not initiate, authorise, validate, execute, cancel, reverse, freeze, seize, or
                otherwise control any transaction or Digital Asset. Any transaction submitted through the Wallet is
                signed by the User and transmitted directly to the applicable blockchain network or Third-Party Partner
                by the User.
            </p>
            <p style={styles.baseText}>
                Blockchain transactions are irreversible once broadcast. The Company has no ability to reverse, modify,
                or cancel any transaction, including transactions sent to incorrect addresses or involving incorrect
                parameters.
            </p>

            <h3 style={styles.h3}>User Responsibility for Keys and Assets</h3>
            <p style={styles.baseText}>
                You acknowledge and agree that, due to the non-custodial and self-custody nature of the Wallet:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    you are solely responsible for safeguarding your Private Keys, Recovery Phrase, and any
                    authentication credentials associated with your Wallet;
                </li>
                <li style={styles.li}>
                    you are solely responsible for verifying all transaction details prior to signing or broadcasting
                    any transaction;
                </li>
                <li style={styles.li}>
                    you are solely responsible for maintaining the security of your device, software environment, and
                    internet connection;
                </li>
                <li style={styles.li}>
                    you are solely responsible for determining whether your access to and use of the Wallet complies
                    with Applicable Law in your jurisdiction; and
                </li>
                <li style={styles.li}>you are solely responsible for any interaction with Third-Party Services.</li>
            </ul>
            <p style={styles.baseText}>
                Nothing in this clause creates any monitoring obligation, supervisory duty, or fiduciary responsibility
                on the part of the Company. The Company does not act as a financial institution, exchange, broker,
                custodian, or payment service provider.
            </p>
            <p style={styles.baseText}>
                The Platform is provided solely as a technical interface enabling Users to interact directly with
                blockchain networks and Third-Party Partners.
            </p>

            <h2 style={styles.h2}>WALLET ARCHITECTURE AND PRODUCT FUNCTIONALITY</h2>

            <h3 style={styles.h3}>Core Functionalities of the Wallet</h3>
            <p style={styles.baseText}>
                Subject to these Terms, the Wallet enables you to perform certain on-chain and protocol-level actions
                directly through supported blockchain networks and the OPNet protocol, including:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    generating, importing, and managing Private Keys and associated blockchain addresses;
                </li>
                <li style={styles.li}>
                    viewing balances and transaction history associated with blockchain addresses;
                </li>
                <li style={styles.li}>creating, signing, and broadcasting Bitcoin transactions;</li>
                <li style={styles.li}>
                    interacting with the OPNet protocol and supported Smart Contracts implemented on or in connection
                    with the Bitcoin network;
                </li>
                <li style={styles.li}>
                    sending, receiving, and managing Digital Assets supported by the Wallet, including BTC, OP20
                    fungible tokens and OP721 non-fungible tokens;
                </li>
                <li style={styles.li}>
                    managing display preferences for supported Digital Assets, including adding, hiding, or removing
                    token representations from the Wallet interface;
                </li>
                <li style={styles.li}>
                    registering, resolving, managing, accessing, and browsing supported blockchain-based domain names
                    (including .btc Domains where available);
                </li>
                <li style={styles.li}>
                    switching between supported blockchain networks (including mainnet, testnet, or other supported
                    environments);
                </li>
                <li style={styles.li}>
                    configuring Wallet settings, including address formats, auto-lock timers, notification preferences,
                    connected site permissions, and security preferences; and
                </li>
                <li style={styles.li}>
                    accessing integrated swap or exchange interfaces made available through Third-Party Services
                    (including MotoSwap, where applicable).
                </li>
            </ul>
            <p style={styles.baseText}>
                The specific features and supported functionalities of the Wallet may change from time to time. The
                Company may add, modify, suspend, restrict, or discontinue any feature or functionality without prior
                notice and without liability.
            </p>
            <p style={styles.baseText}>
                The Wallet functions solely as a technical interface. The Company does not control, validate, guarantee,
                or assume responsibility for the execution, confirmation, or outcome of any transaction, Smart Contract
                interaction, token transfer, swap, or domain registration initiated through the Wallet.
            </p>

            <h3 style={styles.h3}>Wallet Creation, Key Management and Address Architecture</h3>
            <p style={styles.baseText}>
                The Wallet supports key generation and derivation in accordance with widely adopted industry standards,
                enabling the generation of multiple accounts, address types, and cryptographic keys from a single
                Recovery Phrase.
            </p>
            <p style={styles.baseText}>
                During Wallet creation, you may, where supported through the Wallet interface:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>generate a new Recovery Phrase locally on your device;</li>
                <li style={styles.li}>import an existing Recovery Phrase or supported Private Key format;</li>
                <li style={styles.li}>
                    select from supported address types and corresponding derivation standards, including Legacy
                    (P2PKH), Native SegWit (P2WPKH), and Taproot (P2TR);
                </li>
                <li style={styles.li}>configure optional advanced settings, including custom derivation paths; and</li>
                <li style={styles.li}>configure an optional passphrase extension, where available.</li>
            </ul>
            <p style={styles.baseText}>The Wallet may offer selectable privacy configurations, including:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>a standard mode utilising a single primary receiving address; and</li>
                <li style={styles.li}>
                    a privacy-oriented mode that may generate rotating or one-time-use receiving addresses and implement
                    enhanced UTXO management logic.
                </li>
            </ul>

            <h3 style={styles.h3}>OPNet Consensus Layer and Execution Model</h3>
            <p style={styles.baseText}>
                The Wallet enables interaction with OPNet, a consensus layer that reads and interprets Bitcoin Layer 1
                transactions and executes Smart Contract logic in accordance with OPNet protocol rules.
            </p>
            <p style={styles.baseText}>
                OPNet operates directly on Bitcoin Layer 1 and does not introduce a separate gas token. All underlying
                transactions require native BTC for Bitcoin network fees.
            </p>
            <p style={styles.baseText}>
                You expressly acknowledge and understand the following critical characteristic of OPNet:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    OPNet may revert or invalidate Smart Contract execution where contract logic conditions are not
                    satisfied;
                </li>
                <li style={styles.li}>
                    however, OPNet cannot reverse, cancel, or modify Bitcoin Layer 1 transfers that have already been
                    broadcast or confirmed; and
                </li>
                <li style={styles.li}>
                    once BTC is transferred in a Bitcoin transaction, that transfer is governed solely by Bitcoin
                    consensus rules and is irreversible, regardless of whether the corresponding OPNet execution
                    succeeds or fails.
                </li>
            </ul>
            <p style={styles.baseText}>
                As a result, partial transaction reversion may occur, including circumstances where BTC is transferred
                on Bitcoin Layer 1 but the expected Smart Contract outcome, token issuance, or protocol-level state
                change does not occur.
            </p>
            <p style={styles.baseText}>
                The Wallet does not guarantee execution outcomes, contract validity, token delivery, or economic results
                arising from OPNet interactions.
            </p>

            <h3 style={styles.h3}>.btc Domain Functionality</h3>
            <p style={styles.baseText}>
                The Wallet enables the registration, management, and resolution of .btc Domain names implemented on or
                in connection with the Bitcoin blockchain.
            </p>
            <p style={styles.baseText}>
                Domain registration transactions are broadcast directly to the Bitcoin network and are immutable once
                confirmed under Bitcoin consensus rules.
            </p>
            <p style={styles.baseText}>
                The Company does not intermediate, custody, revoke, or transfer domain ownership recorded on-chain.
            </p>
            <p style={styles.baseText}>
                Notwithstanding on-chain immutability, the Company reserves the right, in its sole discretion and
                without prior notice, to restrict, suspend, or disable domain resolution through the Wallet interface in
                cases involving unlawful activity, trademark or intellectual property disputes, fraud, phishing, harmful
                content, or compliance with Applicable Law.
            </p>
            <p style={styles.baseText}>Such interface-level restrictions do not alter on-chain ownership.</p>
            <p style={styles.baseText}>
                Separate .btc Domain-specific terms and conditions, where published, shall apply and are incorporated
                into these Terms by reference.
            </p>

            <h3 style={styles.h3}>Transaction Fees and Network Costs</h3>
            <p style={styles.baseText}>
                Your use of the Wallet may require the payment of transaction fees, network fees, protocol fees, or
                other costs imposed by blockchain networks, validators, miners, decentralised protocols, or Third-Party
                Services (collectively, “Fees”).
            </p>
            <p style={styles.baseText}>
                Fees may be incurred regardless of whether a transaction, Smart Contract interaction, swap, or other
                operation successfully completes, fails, or is reverted at the protocol level.
            </p>
            <p style={styles.baseText}>
                You are solely responsible for reviewing and approving applicable Fees before signing or broadcasting
                any transaction. Any fee information displayed through the Wallet is provided for informational purposes
                only and is not guaranteed.
            </p>

            <h2 style={styles.h2}>REPRESENTATIONS AND WARRANTIES</h2>
            <p style={styles.baseText}>
                By accessing or using the Platform, You represent, warrant, acknowledge, and agree, on a continuing
                basis, that:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    You have full legal capacity, authority, and power to enter into and be bound by these Terms;
                </li>
                <li style={styles.li}>
                    if You access or use the Wallet on behalf of an entity, such entity is duly organised and validly
                    existing under Applicable Law, and You are duly authorised to bind it to these Terms;
                </li>
                <li style={styles.li}>
                    Your access to and use of the Wallet does not and will not violate any Applicable Law or any
                    contractual or legal obligation binding upon You;
                </li>
                <li style={styles.li}>
                    You are not named on, owned or controlled by, or acting on behalf of any person or entity named on,
                    any sanctions or restricted party list maintained by relevant authorities, and You are not located,
                    incorporated, organised, established in, or resident in any jurisdiction subject to comprehensive
                    economic or trade sanctions under Applicable Law;
                </li>
                <li style={styles.li}>
                    You have sufficient technical knowledge and understanding of blockchain technology, Digital Assets,
                    Private Keys, Recovery Phrases, and Smart Contracts to evaluate the risks associated with their use;
                </li>
                <li style={styles.li}>
                    You understand that blockchain transactions are irreversible, Digital Asset markets are highly
                    volatile, Smart Contracts may contain bugs or malicious code, third-party protocols may fail, and
                    transaction fees and network conditions may fluctuate significantly;
                </li>
                <li style={styles.li}>
                    all decisions to use the Wallet, transfer Digital Assets, or interact with Third-Party Services are
                    made solely on the basis of Your own independent judgment;
                </li>
                <li style={styles.li}>
                    You will comply with all Applicable Laws in connection with Your access to and use of the Wallet;
                </li>
                <li style={styles.li}>
                    any information and Personal Data You provide to the Company is and shall remain true, accurate,
                    complete, up to date, not misleading, and lawfully obtained and disclosed; and
                </li>
                <li style={styles.li}>
                    You are solely responsible for safeguarding Your device, communications, local environment, and any
                    data stored locally in connection with Your use of the Wallet.
                </li>
            </ul>
            <p style={styles.baseText}>
                You acknowledge that You have not relied on any representation, warranty, statement, or promise not
                expressly set out in these Terms.
            </p>
            <p style={styles.baseText}>
                The representations and warranties set out in this clause are continuing and shall be deemed to be
                reaffirmed each time You access or use the Wallet.
            </p>

            <h2 style={styles.h2}>THIRD PARTY SERVICES AND INTEGRATIONS</h2>
            <p style={styles.baseText}>
                The Wallet may provide integrated access to, display interfaces for, or otherwise facilitate interaction
                with third-party services, protocols, decentralised applications, Smart Contracts, token issuers,
                blockchain networks, data providers, domain registries/resolvers, or other third parties (collectively,
                “Third-Party Services”). Third-Party Services are not owned, operated, or controlled by the Company.
            </p>
            <p style={styles.baseText}>
                When You access or interact with any Third-Party Service through the Wallet, You interact directly with
                the applicable Third-Party Service and/or underlying blockchain network. Your use of Third-Party
                Services may be subject to separate terms, policies, documentation, fee schedules, risk disclosures, and
                eligibility requirements imposed by the relevant third party and/or network.
            </p>
            <p style={styles.baseText}>
                The Company does not endorse, audit, verify, guarantee, or assume responsibility for any Third-Party
                Service, including any Smart Contract, protocol logic, routing, pricing, liquidity, execution,
                settlement, data, content, availability, security, legality, or performance.
            </p>
            <p style={styles.baseText}>
                Certain Wallet features may rely on or enable interaction with Third-Party Services, including swap or
                exchange integrations and .btc domain functionality.
            </p>
            <p style={styles.baseText}>
                Where the Wallet displays pricing information, charts, valuations, conversion rates, estimated balances,
                token metadata, protocol data, or other information sourced from Third-Party Services (“Third-Party
                Data”), such Third-Party Data is provided for informational convenience only and may be delayed,
                incomplete, inaccurate, or unavailable.
            </p>
            <p style={styles.baseText}>
                The Company may add, modify, restrict, disable, or remove access to any Third-Party Service or
                integration through the Wallet at any time.
            </p>
            <p style={styles.baseText}>
                The Company may provide interface-level technical support for the Wallet, but does not provide support
                for Third-Party Services and is not responsible for their customer support, refunds, reversals,
                chargebacks, or remediation.
            </p>

            <h2 style={styles.h2}>INTELLECTUAL PROPERTY</h2>

            <h3 style={styles.h3}>Ownership</h3>
            <p style={styles.baseText}>
                The Wallet, the Platform, the OP_WALLET Services, and all related software, interfaces, source code,
                object code, architecture, content, design, user interface elements, documentation, text, graphics,
                branding, logos, trademarks, and other Intellectual Property and materials made available by the Company
                (collectively, the “Company Materials”) are and shall remain the exclusive property of the Company
                and/or its licensors.
            </p>
            <p style={styles.baseText}>
                Except for the limited licence expressly granted under these Terms, nothing in these Terms transfers or
                assigns to You any right, title, or interest in or to any Company Materials or Intellectual Property
                Rights.
            </p>

            <h3 style={styles.h3}>Limited Licence to Use the Wallet</h3>
            <p style={styles.baseText}>
                Subject to your ongoing compliance with these Terms, the Company grants you a limited, revocable,
                non-exclusive, non-transferable, non-sublicensable licence to download, install, access, load, and use
                the Wallet solely for your personal, lawful use in accordance with these Terms.
            </p>

            <h3 style={styles.h3}>Feedback</h3>
            <p style={styles.baseText}>
                If You provide the Company with any suggestions, ideas, feedback, improvements, or recommendations
                relating to the Wallet or OP_WALLET Services (“Feedback”), You grant the Company a perpetual,
                irrevocable, worldwide, royalty-free, fully paid-up, sublicensable, transferable licence to use,
                reproduce, modify, create derivative works from, distribute, communicate, and otherwise exploit such
                Feedback for any purpose, without restriction and without any obligation to You.
            </p>
            <p style={styles.baseText}>
                You represent and warrant that you have all rights necessary to provide the Feedback and to grant the
                foregoing licence.
            </p>

            <h2 style={styles.h2}>INDEMNITY AND LIMITATION OF LIABILITY</h2>

            <h3 style={styles.h3}>Indemnification</h3>
            <p style={styles.baseText}>
                To the maximum extent permitted under Applicable Law, You agree to indemnify, defend, and hold harmless
                the Company and its directors, officers, employees, affiliates, agents, successors, and assigns from and
                against any and all claims, demands, actions, proceedings, damages, losses, liabilities, judgments,
                settlements, costs, and expenses (including reasonable legal fees) arising out of or in connection with:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>Your access to or use (or misuse) of the Wallet or OP_WALLET Services;</li>
                <li style={styles.li}>Your breach or alleged breach of these Terms or Applicable Law;</li>
                <li style={styles.li}>
                    any Digital Asset transaction initiated, authorised, or signed by You using the Wallet;
                </li>
                <li style={styles.li}>Your interaction with or use of any Third-Party Services;</li>
                <li style={styles.li}>
                    any loss of Digital Assets arising from Your failure to safeguard Your Private Keys or Recovery
                    Phrase;
                </li>
                <li style={styles.li}>
                    any claim that Your use of the Wallet infringes, misappropriates, or otherwise violates the rights
                    of any third party;
                </li>
                <li style={styles.li}>Your negligence, fraud, wilful misconduct, or misrepresentation;</li>
                <li style={styles.li}>
                    any investigation, inquiry, enforcement action, or proceeding by any regulatory, law enforcement, or
                    Governmental Authority arising out of or relating to Your access to or use of the Wallet; or
                </li>
                <li style={styles.li}>any breach by You of Applicable Law relating to data protection or privacy.</li>
            </ul>

            <h3 style={styles.h3}>Release</h3>
            <p style={styles.baseText}>
                To the fullest extent permitted by Applicable Law, You irrevocably and unconditionally release and
                discharge the Company and its affiliates from any and all claims, demands, actions, causes of action,
                liabilities, or damages arising directly or indirectly out of or in connection with any interaction,
                transaction, or dispute between You and any Third-Party Service, any Digital Asset transaction conducted
                through the Wallet, or the subject matter of these Terms.
            </p>

            <h3 style={styles.h3}>Exclusion of Certain Damages</h3>
            <p style={styles.baseText}>
                To the fullest extent permitted by Applicable Law, in no event shall the Company or its directors,
                officers, employees, affiliates, agents, successors, or assigns be liable for any indirect, incidental,
                special, consequential, exemplary, or punitive damages, or any loss of profits, revenue, goodwill, data,
                Digital Assets, business opportunity, or other intangible losses.
            </p>
            <p style={styles.baseText}>
                Without limitation, the Company shall not be liable for any loss arising out of or relating to loss,
                compromise, or disclosure of Your Private Keys or Recovery Phrase; irreversible blockchain transactions;
                Smart Contract vulnerabilities; interaction with Third-Party Services; network congestion, forks,
                protocol upgrades, or blockchain malfunctions; partial transaction reversion; volatility in Digital
                Asset markets; unauthorised access to Your device or Wallet; any inability to access or use the Wallet;
                or suspension, restriction, or termination in accordance with these Terms.
            </p>

            <h3 style={styles.h3}>Limitation of Liability</h3>
            <p style={styles.baseText}>
                To the maximum extent permitted by Applicable Law, the Company’s total aggregate liability arising out
                of or relating to these Terms or the Wallet shall not exceed (i) the total fees paid by You to Opwallet
                in the twelve (12) months preceding the event giving rise to the claim, or (ii) one Hundred United
                States Dollars (USD 100), whichever is greater if applicable under the drafting intent you provided.
            </p>

            <h3 style={styles.h3}>Allocation of Risk</h3>
            <p style={styles.baseText}>
                You acknowledge and agree that the disclaimers, exclusions, and limitations set out in this clause
                reflect a reasonable allocation of risk between You and the Company and form an essential basis of the
                bargain between the parties.
            </p>

            <h3 style={styles.h3}>Jurisdictional Limitations</h3>
            <p style={styles.baseText}>
                Some jurisdictions do not allow the exclusion or limitation of certain damages or warranties. In such
                jurisdictions, the Company’s liability and the scope of any disclaimers shall be limited to the fullest
                extent permitted by Applicable Law.
            </p>

            <h2 style={styles.h2}>DISCLAIMERS</h2>
            <p style={styles.baseText}>
                To the fullest extent permitted by Applicable Law, the Wallet and the OP_WALLET Services are provided on
                an “as is” and “as available” basis, without any representation, warranty, guarantee, or condition of
                any kind, whether express, implied, statutory, or otherwise.
            </p>
            <p style={styles.baseText}>
                Without limiting the foregoing, the Company expressly disclaims all warranties and conditions, including
                any implied warranties of merchantability, satisfactory quality, fitness for a particular purpose,
                title, non-infringement, quiet enjoyment, and accuracy or completeness of information.
            </p>
            <p style={styles.baseText}>
                The Company does not warrant that the Wallet will be uninterrupted, secure, error-free, compatible with
                all devices or networks, free of harmful components, or that any defects will be corrected.
            </p>
            <p style={styles.baseText}>
                Nothing in the Wallet, the OP_WALLET Services, or these Terms constitutes investment, financial, legal,
                tax, or other professional advice, recommendation, endorsement, or solicitation.
            </p>
            <p style={styles.baseText}>
                The Wallet may enable You to access or interact with Third-Party Services. The Company does not own,
                control, endorse, audit, verify, or guarantee any Third-Party Service.
            </p>
            <p style={styles.baseText}>
                Where the Wallet displays pricing information, valuations, conversion rates, charts, estimated balances,
                or other market-related data (“Market Data”), such Market Data is provided solely for informational
                convenience and may be sourced from Third-Party Services. The Company does not guarantee that any Market
                Data is accurate, complete, current, available, error-free, or reflective of executable market prices.
            </p>
            <p style={styles.baseText}>
                You acknowledge and accept that the Wallet relies on blockchain technology and cryptographic systems
                that present inherent risks, including irreversible transactions, key loss, Smart Contract bugs,
                execution failures, volatility, network events, regulatory changes, phishing, malware, and device
                compromise.
            </p>

            <h2 style={styles.h2}>PERSONAL DATA AND PRIVACY</h2>
            <p style={styles.baseText}>
                The Company may collect and process certain Personal Data in connection with Your access to or use of
                the Wallet, including where You contact Us for support, subscribe to communications, for security
                monitoring, fraud prevention, technical diagnostics, compliance with Applicable Law, or otherwise
                voluntarily provide information to Us.
            </p>
            <p style={styles.baseText}>
                This clause, together with any applicable Privacy Policy, sets out the basis on which the Company
                collects, uses, stores, discloses, and otherwise processes Personal Data.
            </p>
            <p style={styles.baseText}>
                By accessing or using the Wallet, You acknowledge that You have read and understood these Terms and,
                where applicable, the Privacy Policy, and You consent to such processing in accordance with Applicable
                Law.
            </p>

            <h3 style={styles.h3}>Limited Data Collection</h3>
            <p style={styles.baseText}>
                The Wallet is non-custodial and does not require account creation. The Company does not collect, store,
                or have access to:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>Private Keys;</li>
                <li style={styles.li}>Recovery Phrases;</li>
                <li style={styles.li}>passwords; or</li>
                <li style={styles.li}>Digital Assets held in blockchain addresses controlled by You.</li>
            </ul>
            <p style={styles.baseText}>All such information remains solely under Your control on Your device.</p>
            <p style={styles.baseText}>
                The Wallet may enable access to or interaction with Third-Party Services. Any Personal Data shared
                directly with, or collected by, such Third-Party Services is governed solely by their respective terms
                and privacy policies.
            </p>
            <p style={styles.baseText}>
                The Company endeavours to implement commercially reasonable technical and organisational measures
                designed to protect Personal Data within its control in accordance with Applicable Law. However, no
                method of transmission over the internet or electronic storage is completely secure.
            </p>
            <p style={styles.baseText}>
                The Company may disclose Personal Data to the extent required or permitted by Applicable Law, including
                pursuant to any court order, regulatory requirement, or request from law enforcement or a Governmental
                Authority.
            </p>
            <p style={styles.baseText}>
                The Wallet may use analytics tools to collect aggregated or pseudonymised technical and usage data, such
                as device information, browser type, operating system, interaction patterns, feature usage, and
                performance metrics. The Company does not use analytics tools to access or collect Private Keys,
                Recovery Phrases, or Digital Assets.
            </p>

            <h2 style={styles.h2}>TERMINATION</h2>

            <h3 style={styles.h3}>Termination by You</h3>
            <p style={styles.baseText}>
                You may terminate these Terms at any time by ceasing to use the Wallet and uninstalling or removing the
                Wallet from Your device. Termination does not affect any transactions already broadcast to the
                blockchain or any assets stored in addresses associated with Your Private Keys.
            </p>

            <h3 style={styles.h3}>Suspension or Termination by the Company</h3>
            <p style={styles.baseText}>
                To the fullest extent permitted by Applicable Law, the Company may, at any time and in its sole
                discretion, with or without cause and with or without prior notice, suspend, restrict, disable, or
                terminate Your access to the Wallet or any related functionality.
            </p>
            <p style={styles.baseText}>Grounds may include:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>actual or suspected breach of these Terms or Applicable Law;</li>
                <li style={styles.li}>unlawful, fraudulent, abusive, or harmful conduct;</li>
                <li style={styles.li}>legal, regulatory, reputational, or operational risk;</li>
                <li style={styles.li}>suspected misuse involving sanctions, financial crime, or prohibited use;</li>
                <li style={styles.li}>compliance with a request or order from any Governmental Authority;</li>
                <li style={styles.li}>security incidents, technical risks, or integrity concerns; or</li>
                <li style={styles.li}>discontinuation, modification, or restructuring of the Wallet.</li>
            </ul>

            <h3 style={styles.h3}>Effect of Termination</h3>
            <p style={styles.baseText}>Upon termination:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>Your right to access and use the Wallet immediately ceases;</li>
                <li style={styles.li}>
                    the Company may disable access to the Wallet interface or related services; and
                </li>
                <li style={styles.li}>
                    the Company shall have no obligation to provide continued access, updates, support, or
                    functionality.
                </li>
            </ul>
            <p style={styles.baseText}>
                Due to the non-custodial nature of the Wallet, the Company cannot freeze, recover, transfer, or
                otherwise control Your Digital Assets.
            </p>

            <h2 style={styles.h2}>GOVERNING LAW</h2>
            <p style={styles.baseText}>
                These Terms, and any dispute, controversy, claim, or difference arising out of or in connection with
                these Terms, the Wallet, or the OP_WALLET Services (each, a “Dispute”), shall be governed by and
                construed in accordance with the laws of the Abu Dhabi Global Market (“ADGM”), including the ADGM
                regulations and, to the extent applicable within ADGM, the federal laws of the United Arab Emirates,
                without regard to conflict of laws principles.
            </p>
            <p style={styles.baseText}>
                Nothing in these Terms shall exclude or limit any mandatory consumer protection rights that may apply to
                You under Applicable Law in Your jurisdiction of residence, to the extent such rights cannot be lawfully
                excluded.
            </p>

            <h2 style={styles.h2}>DISPUTE RESOLUTION PROCESS</h2>

            <div style={styles.callout}>
                <strong>IMPORTANT:</strong> THESE TERMS CONTAIN A BINDING ARBITRATION CLAUSE, WAIVER OF JURY TRIAL, AND
                CLASS ACTION WAIVER.
            </div>

            <h3 style={styles.h3}>Good Faith Resolution Process</h3>
            <p style={styles.baseText}>
                Before initiating any formal legal proceedings, including arbitration or a small claims court action,
                You and the Company agree to attempt to resolve in good faith any Dispute through the following process:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Initial Notice:</strong> You must submit a written notice describing the Dispute in
                    reasonable detail to the Company at support@opnet.org and, where available, raise a formal support
                    request via the Platform.
                </li>
                <li style={styles.li}>
                    <strong>Acknowledgement:</strong> The Company shall endeavour to acknowledge receipt of the
                    complaint within 10 Business Days.
                </li>
                <li style={styles.li}>
                    <strong>Resolution Period:</strong> The parties shall attempt in good faith to resolve the Dispute
                    within 10 Business Days from the date the written notice is received.
                </li>
            </ul>

            <h3 style={styles.h3}>Binding Arbitration</h3>
            <p style={styles.baseText}>
                Any Dispute shall be referred to and finally resolved by arbitration administered by the Abu Dhabi
                International Arbitration Centre (“ADIAC”) in accordance with the ADIAC Arbitration Rules in force at
                the time of commencement of the arbitration. The number of arbitrators shall be one (1). The seat of
                arbitration shall be ADGM, Abu Dhabi, United Arab Emirates. The language of the arbitration shall be
                English.
            </p>
            <p style={styles.baseText}>
                The arbitrator&apos;s decision shall be final, binding, and non-appealable. Judgment upon the award may
                be entered in any court having jurisdiction.
            </p>

            <h3 style={styles.h3}>Arbitration Costs</h3>
            <p style={styles.baseText}>
                The costs of arbitration, including filing and administrative fees, shall be allocated in accordance
                with the ADIAC Arbitration Rules. Each party shall bear its own legal fees and expenses unless the
                Tribunal determines otherwise.
            </p>

            <h3 style={styles.h3}>Exceptions</h3>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Small Claims:</strong> Nothing in this clause prevents either party from bringing an
                    individual claim in a court of competent jurisdiction that qualifies for small claims procedures.
                </li>
                <li style={styles.li}>
                    <strong>Injunctive and Equitable Relief:</strong> Nothing in this clause prevents the Company from
                    seeking temporary, interim, or permanent injunctive or equitable relief in any court of competent
                    jurisdiction.
                </li>
            </ul>

            <h3 style={styles.h3}>Waiver of Jury Trial and Class Actions</h3>
            <ul style={styles.ul}>
                <li style={styles.li}>You waive any right to a trial by jury.</li>
                <li style={styles.li}>All Disputes shall be brought on an individual basis only.</li>
                <li style={styles.li}>
                    You agree not to bring or participate in any class action, representative action, consolidated
                    proceeding, or collective arbitration.
                </li>
                <li style={styles.li}>
                    Unless both the Company and You agree, the arbitrator or judge shall have no authority to
                    consolidate claims or preside over any form of class or representative proceeding.
                </li>
            </ul>

            <h3 style={styles.h3}>International Users</h3>
            <p style={styles.baseText}>
                The Wallet is operated from the ADGM, United Arab Emirates. If You access or use the Wallet from outside
                the United Arab Emirates, You do so on Your own initiative and at Your own risk. You are solely
                responsible for ensuring that Your access to and use of the Wallet complies with all Applicable Laws in
                Your jurisdiction.
            </p>

            <h3 style={styles.h3}>Regulatory Contact</h3>
            <p style={styles.baseText}>
                If any Governmental Authority has concerns regarding the Wallet or the OP_WALLET Services, the Company
                respectfully requests that such authority contact it at report@opnet.org prior to initiating formal
                enforcement proceedings, where practicable.
            </p>

            <h2 style={styles.h2}>COMPANY&apos;S GENERAL TERMS</h2>
            <p style={styles.baseText}>
                These Terms are product-specific terms governing Your use of the OP_WALLET Services.
            </p>
            <p style={styles.baseText}>
                To the extent that the Company or its affiliates make available separate general terms and conditions
                governing the overall use of any website, platform, or other products or services (the “General Terms”),
                such General Terms shall apply in addition to these Terms, except as expressly modified herein.
            </p>
            <p style={styles.baseText}>
                In the event of any conflict or inconsistency between these Terms and any applicable General Terms,
                these Terms shall prevail with respect to the OP_WALLET Services, unless expressly stated otherwise.
            </p>
            <p style={styles.baseText}>
                Any provision of the General Terms that contradicts, qualifies, or could reasonably be construed to
                compromise the non-custodial and technology-only nature of the OP_WALLET Services shall not apply to the
                OP_WALLET Services.
            </p>

            <h2 style={styles.h2}>MISCELLANEOUS</h2>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Entire Agreement:</strong> These Terms, together with any policies or documents expressly
                    incorporated by reference, constitute the entire agreement between You and the Company regarding the
                    Wallet and OP_WALLET Services.
                </li>
                <li style={styles.li}>
                    <strong>Changes to the Wallet:</strong> The Company may modify, enhance, suspend, restrict, or
                    discontinue the Wallet or any functionality at any time.
                </li>
                <li style={styles.li}>
                    <strong>Changes to These Terms:</strong> The Company may amend or update these Terms from time to
                    time. Your continued use after the effective date of any amendment constitutes acceptance.
                </li>
                <li style={styles.li}>
                    <strong>Assignment:</strong> You may not assign these Terms without prior written consent. The
                    Company may assign its rights and obligations without restriction.
                </li>
                <li style={styles.li}>
                    <strong>No Waiver:</strong> No failure or delay by the Company in exercising any right, power, or
                    remedy under these Terms shall constitute a waiver.
                </li>
                <li style={styles.li}>
                    <strong>Severability:</strong> If any provision is held invalid, illegal, or unenforceable, such
                    provision shall be modified to the minimum extent necessary or severed.
                </li>
                <li style={styles.li}>
                    <strong>Survival:</strong> Any provision of these Terms which by its nature is intended to survive
                    termination shall survive.
                </li>
                <li style={styles.li}>
                    <strong>Independent Contractors:</strong> You and the Company are independent contracting parties.
                </li>
                <li style={styles.li}>
                    <strong>No Third-Party Beneficiaries:</strong> Except as expressly provided in these Terms, no
                    person other than the parties shall have any rights under these Terms.
                </li>
                <li style={styles.li}>
                    <strong>Export and Sanctions Compliance:</strong> You agree to comply with all applicable export
                    control, sanctions, and trade restriction laws and regulations.
                </li>
                <li style={styles.li}>
                    <strong>Language:</strong> These Terms are drafted in English. If translated, the English version
                    shall prevail in the event of inconsistency.
                </li>
                <li style={styles.li}>
                    <strong>Notices:</strong> Unless otherwise specified, all notices required or permitted under these
                    Terms shall be provided electronically.
                </li>
            </ul>

            <h3 style={styles.h3}>Support and Communications</h3>
            <p style={styles.baseText}>
                The Company may provide general support or communications through one or more of the following channels:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>Email: support@opnet.org</li>
                <li style={styles.li}>OP_NET Discord: https://discord.gg/opnet</li>
                <li style={styles.li}>OP_NET Telegram: https://t.me/opnetbtc</li>
                <li style={styles.li}>OP_NET X (formerly Twitter): https://x.com/opnetbtc</li>
            </ul>
            <p style={styles.baseText}>
                Support provided through these channels is for general informational and technical assistance only. The
                Company does not guarantee response times, issue resolution, or continuous availability of any support
                channel. The Company will never request your Private Keys or Recovery Phrase through any communication
                channel.
            </p>

            <h3 style={styles.h3}>Access Restrictions</h3>
            <p style={styles.baseText}>
                The Company reserves the right, in its sole discretion and without prior notice, to restrict, suspend,
                or block access to the Wallet or any feature thereof from specific jurisdictions, IP addresses, devices,
                or users where necessary for legal, regulatory, security, or operational reasons.
            </p>

            <h3 style={styles.h3}>Force Majeure</h3>
            <p style={styles.baseText}>
                The Company shall not be liable for any delay, interruption, or failure in performance resulting from
                events beyond its reasonable control, including changes in Applicable Law, regulatory action,
                governmental orders, sanctions, acts of God, natural disasters, war, terrorism, public health
                emergencies, blockchain congestion, node failures, protocol changes, cyberattacks, malware events, or
                failures of internet infrastructure, telecommunications, utilities, or Third-Party Service Providers.
            </p>

            <h3 style={styles.h3}>Reporting Violations</h3>
            <p style={styles.baseText}>
                If You believe that any person is misusing the Wallet or violating these Terms, You may report the
                matter to the Company using the contact details provided in these Terms. The Company does not
                continuously monitor all blockchain transactions or user activity and is under no obligation to
                investigate, verify, or take any action in response to any report unless required by Applicable Law or
                unless the Company, in its sole discretion, determines that investigation is appropriate.
            </p>

            <h2 style={styles.h2}>CONTACT INFORMATION</h2>
            <p style={styles.baseText}>
                ORANGE PILL LABS HOLDING LTD
                <br />
                Abu Dhabi Global Market, United Arab Emirates
                <br />
                Email: support@opnet.org
                <br />
                Regulatory Contact: report@opnet.org
            </p>

            <hr style={styles.hr} />
            <div style={{ height: 14 }} />
        </>
    );
}
