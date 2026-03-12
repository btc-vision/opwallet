import React, { type CSSProperties } from 'react';

type PolicyStyles = {
    baseText: CSSProperties;
    h2: CSSProperties;
    h3: CSSProperties;
    ul: CSSProperties;
    li: CSSProperties;
    hr?: CSSProperties;
    callout?: CSSProperties;
};

type PrivacyPolicyTextProps = {
    effectiveDate: string;
    styles: PolicyStyles;
};

export function PrivacyPolicyText({ effectiveDate, styles }: PrivacyPolicyTextProps) {
    const linkStyle: CSSProperties = {
        color: 'rgba(147,197,253,0.95)',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
        wordBreak: 'break-word'
    };

    return (
        <>
            <div style={{ marginBottom: 10 }}>
                <div style={{ ...styles.h2, marginTop: 2 }}>PRIVACY POLICY</div>
                <p style={{ ...styles.baseText, marginTop: 6, color: 'rgba(255,255,255,0.70)' }}>
                    Last Updated: {effectiveDate}
                </p>
            </div>

            <div style={styles.callout}>
                <strong>Please read this Privacy Policy and Our Terms of Use carefully</strong> before submitting any
                Personal Data or other information to Us. This Privacy Policy should be read in conjunction with Our
                Terms of Use and any other notices or consents provided to You at the point of data collection. By
                providing Your express consent, You acknowledge and agree that Your Personal Data may be received,
                collected, transferred, used, disclosed, and/or otherwise processed by Us in accordance with this
                Privacy Policy.
            </div>

            <p style={styles.baseText}>
                This Privacy Policy (&quot;Privacy Policy&quot;) sets out the manner and legal basis on which OPNet
                (referred to as &quot;OP&quot;, &quot;We&quot;, &quot;Us&quot;, or &quot;Our&quot;), including its
                affiliates and associated entities (unless the context otherwise requires), collects, uses, discloses,
                processes, and protects information in connection with Your access to and use of our products and
                services, including without limitation: Opwallet, MotoSwap, OPtools, Opscan, and any related websites,
                subdomains, browser extensions, mobile and web applications, desktop applications, APIs, content,
                features, functionality, and services (individually &ldquo;Platform&rdquo; and collectively, the
                &ldquo;Platforms&rdquo; or &ldquo;Services&rdquo;).
            </p>
            <p style={styles.baseText}>
                This Privacy Policy applies to all Users who engage with the Platforms, including, but not limited to,
                visitors, traders, liquidity providers, token deployers, stakers, farmers, analysts, or other
                participants (collectively referred to as &ldquo;Users&rdquo;, &ldquo;You&rdquo;, or
                &ldquo;Your&rdquo;).
            </p>
            <p style={styles.baseText}>
                This Privacy Policy applies to all Personal Data provided to or collected by Us in connection with Your
                access to or use of Our Platforms, including all subdomains, web pages, applications, browser
                extensions, and content made available by Us.
            </p>
            <p style={styles.baseText}>
                By accessing or using the Platforms, submitting any Personal Data to Us, or otherwise interacting with
                Us, You acknowledge that You have read and understood this Privacy Policy. Where We rely on Your consent
                as the legal basis for processing, We will obtain Your explicit, informed, and freely given consent
                through appropriate mechanisms (such as clear opt-in checkboxes or affirmative action buttons) at the
                point of collection, separately from Your acceptance of this Privacy Policy, before processing Your
                Personal Data for such purposes. You may withdraw such consent at any time through the mechanisms
                provided at the point of collection or by contacting Us at{' '}
                <a style={linkStyle} href="mailto:support@opnet.org">
                    support@opnet.org
                </a>
                . If You do not agree with this Privacy Policy or any part thereof, You must immediately discontinue use
                of the Platforms and refrain from providing any Personal Data to Us.
            </p>

            <h2 style={styles.h2}>GENERAL</h2>

            <h3 style={styles.h3}>Definitions</h3>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Applicable Law</strong> means all applicable data protection and privacy laws, statutes,
                    regulations, rules, directives, orders, binding guidance, and regulatory requirements of any
                    competent governmental or regulatory authority, as amended from time to time.
                </li>
                <li style={styles.li}>
                    <strong>Cookies</strong> refer to small data files placed on Your device when You access or use the
                    Platforms. They allow Us or selected third parties to recognise Your browser or device and gather
                    information about Your preferences or past activity.
                </li>
                <li style={styles.li}>
                    <strong>Personal Data</strong> means any data relating to an identified natural person or a person
                    who can be identified, directly or indirectly, by reference to identifiers such as name, voice,
                    image, identification number, electronic identifier, location data, online identifiers (including
                    cookie identifiers), or one or more physical, physiological, genetic, mental, economic, cultural or
                    social characteristics, or any other information that is treated as &ldquo;personal data&rdquo; or
                    &ldquo;personal information&rdquo; under Applicable Law.
                </li>
                <li style={styles.li}>
                    <strong>Third-Party Service Providers</strong> means any third party that provides services,
                    infrastructure, tooling, integrations, or content in connection with the Platforms (including
                    hosting providers, analytics providers, advertising providers, security providers, customer support
                    tools, blockchain explorers, indexers, wallets, smart contracts, protocols, domain
                    registries/resolvers, messaging services, and other third parties).
                </li>
            </ul>

            <h3 style={styles.h3}>Interpretation</h3>
            <p style={styles.baseText}>
                All capitalised terms used but not defined herein shall have the meanings assigned to them in the terms
                and conditions of use provided on the Platforms.
            </p>
            <p style={styles.baseText}>In this Policy, unless repugnant to the context:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    Headings and defined terms are for convenience only and do not affect the interpretation of this
                    Policy;
                </li>
                <li style={styles.li}>
                    The meaning of general words is not limited by specific examples introduced by
                    &quot;including,&quot; &quot;for example,&quot; &quot;such as,&quot; or similar expressions.
                </li>
                <li style={styles.li}>
                    Unless otherwise indicated, reference to a specified clause shall be construed as a reference to
                    that specified clause (&quot;Clause&quot;) of this Privacy Policy;
                </li>
                <li style={styles.li}>The singular includes the plural and vice versa.</li>
                <li style={styles.li}>
                    All terms and conditions of this Privacy Policy, including introductory paragraphs and any attached
                    documents, are incorporated by reference and form part of this Privacy Policy.
                </li>
                <li style={styles.li}>
                    A reference to a particular Person includes that Person&apos;s executors, administrators,
                    successors, permitted assigns, and legal representatives.
                </li>
                <li style={styles.li}>
                    A reference to any date or time is determined in accordance with the relevant jurisdiction
                    applicable to this Policy.
                </li>
            </ul>

            <h2 style={styles.h2}>SCOPE</h2>
            <p style={styles.baseText}>
                This Privacy Policy applies to all Personal Data collected, used, disclosed, processed, or stored by Us
                in connection with Your use of Our Platforms and Services. It governs how We handle the Personal Data of
                Users who visit Our Platforms or utilise Our Services.
            </p>
            <p style={styles.baseText}>
                This Privacy Policy applies to Personal Data that We collect, use, disclose, process, or store in
                connection with:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>Your access to or use of the Platforms and its associated Services;</li>
                <li style={styles.li}>
                    Any interactions You have with Us, whether through the Platforms, email, customer support, or other
                    communication channels; and
                </li>
                <li style={styles.li}>
                    Any Personal Data shared with or obtained by Us from Third-Party Service Providers, affiliates, or
                    business partners in relation to the Platforms or Services.
                </li>
            </ul>
            <p style={styles.baseText}>This Privacy Policy does not apply to:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    Public blockchain activity occurring independently on the blockchain(s) (including Bitcoin Layer 1
                    and any OP protocol activity), which We do not control. Transaction data recorded on public
                    blockchains may be publicly visible and immutable, and We cannot delete or modify it;
                </li>
                <li style={styles.li}>
                    Any third-party platforms, services, or websites that are linked to, referenced, or integrated with
                    the Platforms, including those operated by Third-Party Service Providers. These third parties
                    operate independently of Us and are governed by their own privacy policies and data protection
                    practices;
                </li>
                <li style={styles.li}>
                    Data that is anonymised or aggregated in a manner that no longer identifies an individual, whether
                    from an individual data point or through a collection thereof; and
                </li>
                <li style={styles.li}>
                    Any Personal Data collected by Third-Party Service Providers that use Our intellectual property to
                    facilitate their own services (where they act as independent controllers), as they are solely
                    responsible for their own data processing activities.
                </li>
            </ul>
            <p style={styles.baseText}>
                Certain OP products (including Opwallet and MotoSwap) are designed to be non-custodial. We do not
                collect or store Users&rsquo; private keys, seed phrases, or recovery phrases, and We cannot access or
                control Digital Assets held in blockchain addresses controlled by You. Where specific products require
                different handling (e.g., optional accounts, premium features, ads, API keys), those product-specific
                practices will be described in product-specific notices provided at the point of data collection, which
                will form part of this Privacy Policy.
            </p>
            <p style={styles.baseText}>
                This Privacy Policy supplements but does not replace any other consents You may have provided to Us
                regarding Your Personal Data.
            </p>

            <h2 style={styles.h2}>COLLECTION OF PERSONAL DATA</h2>
            <p style={styles.baseText}>
                Depending on how You interact with the Platforms, We may collect, use, and process certain Personal Data
                in accordance with the principles of data minimization and purpose limitation. We collect only Personal
                Data that is adequate, relevant, and limited to what is necessary for the specific purposes set out in
                this Privacy Policy, including providing Services, enabling support, maintaining security, improving
                functionality, and complying with Applicable Law.
            </p>

            <h3 style={styles.h3}>Information You Provide Directly</h3>
            <p style={styles.baseText}>We may collect Personal Data that You choose to provide, such as:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Contact Information:</strong> name (if provided), email address, phone number, and other
                    communication details You voluntarily provide (e.g., when contacting support, subscribing to
                    updates, or participating in programs);
                </li>
                <li style={styles.li}>
                    <strong>Support Correspondence:</strong> information You provide when contacting support, including
                    ticket history, message content, and attachments;
                </li>
                <li style={styles.li}>
                    <strong>User-submitted content:</strong> any content or information You submit through the Platforms
                    (e.g., feedback, bug reports, feature requests, promotional applications, project submissions, or
                    advertising inquiries);
                </li>
                <li style={styles.li}>
                    <strong>Preferences and settings:</strong> communication preferences, language settings, and other
                    preferences you configure on the Platforms.
                </li>
            </ul>

            <h3 style={styles.h3}>Information Collected Automatically</h3>
            <p style={styles.baseText}>When You access or use the Platforms, We may automatically collect:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Technical Data:</strong> IP address, device identifiers, browser type and version, operating
                    system, language, time zone setting, approximate location derived from IP, device characteristics,
                    and log data;
                </li>
                <li style={styles.li}>
                    <strong>Usage Data:</strong> pages/screens visited, feature usage, clickstream data, navigation
                    paths, referral/exit pages, session duration, interaction patterns, error logs/crash reports, and
                    performance diagnostics;
                </li>
                <li style={styles.li}>
                    <strong>Cookie and tracking data:</strong> cookie identifiers and other online identifiers, subject
                    to Your choices and consent as described in the Cookie Policy.
                </li>
            </ul>

            <h3 style={styles.h3}>Wallet / Blockchain Identifiers (Product Dependent)</h3>
            <p style={styles.baseText}>
                Given that some OP products are used with non-custodial wallets and public blockchains, certain
                identifiers may be processed for operational/security/analytics purposes, such as:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    Wallet addresses, transaction hashes, smart contract interaction identifiers, pool IDs, staking
                    positions (as visible on-chain), and associated metadata; and
                </li>
                <li style={styles.li}>
                    Connected wallet details (e.g., wallet type, connection method, permissions, connected site
                    approvals), where exposed to the Platforms by the wallet connection process.
                </li>
            </ul>
            <div style={styles.callout}>
                <strong>Important:</strong> We do not request, collect, store, have access to, or process Your private
                keys, recovery phrases/seed phrases (mnemonics), wallet passwords, or any other self-custody
                authentication credentials used to control Digital Assets. These credentials are generated and stored
                locally on Your device (or within Your chosen wallet software) and remain solely under Your control. You
                should never share Your private keys, recovery phrases/seed phrases, or wallet passwords with anyone,
                including Us. Any communication claiming to be from Us and requesting such credentials is fraudulent and
                should be reported to Us immediately at{' '}
                <a style={linkStyle} href="mailto:support@opnet.org">
                    support@opnet.org
                </a>
                .
            </div>

            <h3 style={styles.h3}>Advertising and Promotion Data (Where Applicable)</h3>
            <p style={styles.baseText}>
                If a Platform displays advertisements or promotional placements (including token ribbons/banners), We
                and/or authorised advertising partners may process:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    impression data, click data, conversion events (if implemented), and campaign measurement data;
                </li>
                <li style={styles.li}>
                    cookie/identifier data for ad delivery and frequency capping (subject to consent where required);
                    and
                </li>
                <li style={styles.li}>
                    advertiser contact details and campaign admin information (if you purchase/manage placements).
                </li>
            </ul>

            <h3 style={styles.h3}>Information from Third Parties</h3>
            <p style={styles.baseText}>
                We may receive Personal Data from Third-Party Service Providers or partners, such as:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>analytics providers (usage measurement);</li>
                <li style={styles.li}>security providers (fraud/abuse signals);</li>
                <li style={styles.li}>customer support tools;</li>
                <li style={styles.li}>advertising partners (campaign reporting);</li>
                <li style={styles.li}>infrastructure providers (hosting/CDN);</li>
                <li style={styles.li}>social platforms (where you engage with our official accounts); and</li>
                <li style={styles.li}>
                    where applicable, compliance/identity service providers (e.g., if a specific feature requires
                    eligibility checks under Applicable Law).
                </li>
            </ul>

            <h3 style={styles.h3}>Sensitive Data</h3>
            <p style={styles.baseText}>
                We do not intentionally collect or process &ldquo;special category&rdquo;/sensitive Personal Data (e.g.,
                health, religion, biometric identifiers) unless:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>it is required by Applicable Law; or</li>
                <li style={styles.li}>You voluntarily provide it and we have a lawful basis to process it.</li>
            </ul>
            <p style={styles.baseText}>
                You should not provide sensitive Personal Data through the Platforms unless expressly requested and
                necessary for a stated purpose.
            </p>
            <p style={styles.baseText}>We collect Personal Data through the following means:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Directly from You:</strong> when You submit information, contact support, apply for
                    features/programs, subscribe to communications, or otherwise interact with Us.
                </li>
                <li style={styles.li}>
                    <strong>Automatically via Technology:</strong> When You browse or interact with the Platforms, We
                    use Cookies and analytics tools to collect limited technical and interaction data. Please refer to
                    our Cookie Policy for further details.
                </li>
                <li style={styles.li}>
                    <strong>From Third Parties:</strong> We receive data from Third-Party Service Providers, affiliates
                    or other partners necessary to provide Services.
                </li>
            </ul>

            <h2 style={styles.h2}>PURPOSES AND LAWFUL BASIS OF PROCESSING PERSONAL DATA</h2>
            <p style={styles.baseText}>
                OP processes Personal Data only for lawful, specific and limited purposes that are relevant and
                proportionate to the nature of Our Services as a technology intermediary and provider of non-custodial
                and/or non-transactional software interfaces (as applicable). These purposes may include:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Operating and Improving the Platforms:</strong> To provide, maintain, administer, secure,
                    and enhance the functionality, performance, and reliability of Our Platforms and Services (including
                    diagnosing errors, fixing bugs, and releasing updates).
                </li>
                <li style={styles.li}>
                    <strong>Security, Integrity, and Abuse Prevention:</strong> To protect Users, the Platforms, and the
                    Services from fraud, phishing, spam, unauthorised access, malicious activity, denial-of-service
                    activity, scraping, and other abuse; to implement security controls, rate limits, and monitoring
                    where appropriate; and to enforce Platform specific terms and conditions.
                </li>
                <li style={styles.li}>
                    <strong>Wallet Connection, Interface Functionality, and User Experience:</strong> To enable key
                    non-custodial interface functions such as wallet connectivity (where applicable), displaying
                    account-less session functionality, remembering preferences (e.g., language, settings), and
                    supporting user-requested features across the Platforms.
                </li>
                <li style={styles.li}>
                    <strong>Analytics and Service Development:</strong> To understand how Our Platforms and Services are
                    used (including feature adoption and engagement), improve user experience, measure performance, and
                    develop new features, products, or Services, using aggregated and pseudonymised data where possible.
                </li>
                <li style={styles.li}>
                    <strong>Customer Support and Service Communications:</strong> To respond to Your queries,
                    troubleshoot issues, provide technical support, communicate about service status, respond to reports
                    of misuse, and provide administrative notices (including updates to our legal documents).
                </li>
                <li style={styles.li}>
                    <strong>Advertising, Promotions, and Partnerships (Where Applicable):</strong> To administer
                    advertising placements and promotional features, measure campaign performance, prevent fraud, and
                    manage advertiser relationships and communications (subject to Applicable Law and Your
                    cookie/marketing preferences where required).
                </li>
                <li style={styles.li}>
                    <strong>Compliance with Legal Obligations and Requests:</strong> To comply with Applicable Law and
                    lawful requests from competent governmental, regulatory, or law enforcement authorities.
                </li>
                <li style={styles.li}>
                    <strong>Feedback Integration:</strong> To analyse and use feedback, bug reports, feature requests,
                    and communications to identify areas for improvement and enhance the quality and safety of Our
                    Services.
                </li>
                <li style={styles.li}>
                    <strong>Risk Disclosures and User Protection:</strong> To deliver risk disclosures, safety notices,
                    and informational prompts designed to reduce the risk of user harm.
                </li>
            </ul>
            <p style={styles.baseText}>
                Where a Platform is offered as a browser extension, mobile application, or desktop application, and You
                enable permissions, We may process data necessary to provide the feature You request (for example, push
                notifications, camera access for QR scanning, clipboard access, or local storage for settings). We do
                not use such permissions to collect private keys, seed phrases, or recovery phrases.
            </p>
            <p style={styles.baseText}>
                If You allow access to location data (including approximate location derived from IP address or precise
                location via device permission), We may provide location-relevant features (for example,
                compliance-related access restrictions, language or region settings, or location-tailored content).
            </p>
            <p style={styles.baseText}>
                If You choose to connect or interact with Third-Party Services through the Platforms (including
                third-party wallets, analytics tools, domain registries, protocols, smart contracts, or social
                platforms), the relevant Third-Party Service may collect Personal Data under its own terms and policies,
                which You are responsible for reviewing.
            </p>
            <p style={styles.baseText}>
                In accordance with Applicable Law, We process Personal Data under one or more of the following lawful
                bases:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>Your consent, which You may withdraw at any time;</li>
                <li style={styles.li}>
                    Performance of a contract / providing Services, where processing is necessary to provide the
                    Platforms and Services to You in accordance with the applicable Terms of Use;
                </li>
                <li style={styles.li}>
                    Legitimate interests, where processing is necessary for the legitimate operation, security,
                    integrity, and improvement of Our Platforms and Services, provided that such interests do not
                    override Your fundamental rights and freedoms;
                </li>
                <li style={styles.li}>
                    Compliance with legal obligations, where processing is required to comply with obligations imposed
                    by Applicable Law, regulatory authorities, or lawful requests;
                </li>
                <li style={styles.li}>
                    Protection of vital interests / public interest, where necessary for the protection of individuals
                    or to comply with public interest requirements, to the extent permitted under Applicable Laws.
                </li>
            </ul>

            <h2 style={styles.h2}>PROMOTIONAL AND TRANSACTIONAL COMMUNICATION</h2>
            <p style={styles.baseText}>
                As part of Our Services, You may receive service-related transactional communications about Your account
                (if any), activity, security, and updates. For example, if You submit a support request, You may receive
                an email acknowledging receipt and providing updates. While You can opt out of promotional messages
                (where offered), We will continue sending You service-related communications that are necessary for the
                management, security, and administration of the Platforms and Services, including security alerts,
                service announcements, and legal updates.
            </p>
            <p style={styles.baseText}>
                We respect Your preferences and will honour opt-out requests in accordance with Applicable Law. However,
                opting out of certain types of communications or data collection may impact the functionality, security,
                or personalisation of certain features. For example, disabling notifications may prevent You from
                receiving security alerts.
            </p>
            <p style={styles.baseText}>
                To withdraw Your consent, please contact Us at{' '}
                <a style={linkStyle} href="mailto:support@opnet.org">
                    support@opnet.org
                </a>{' '}
                or use the relevant Platform controls (including cookie settings and unsubscribe links where provided).
                Withdrawal of consent may impact Our ability to provide certain services or functionalities that rely on
                such consent. If You have questions about how withdrawal affects Your data, please contact Us.
            </p>

            <h2 style={styles.h2}>DISCLOSURE OF PERSONAL DATA</h2>
            <p style={styles.baseText}>
                We may share Your information with the following categories of recipients, in each case only to the
                extent reasonably necessary for the operation of the Platforms, the delivery of Services, or compliance
                with our legal obligations:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    <strong>Service providers (processors):</strong> We may share Personal Data with Third-Party Service
                    Providers that perform services on our behalf (e.g., hosting, security monitoring, analytics,
                    customer support tooling, communications services, advertising measurement, CDN). These recipients
                    act under contractual safeguards and are permitted to process Personal Data only for the purposes we
                    specify and in accordance with our written instructions.
                </li>
                <li style={styles.li}>
                    <strong>Affiliates and corporate group:</strong> We may share Personal Data within our corporate
                    group/affiliates for specified internal business purposes, including security, operations,
                    compliance, and service improvement, subject to appropriate safeguards and in accordance with
                    applicable data protection laws.
                </li>
                <li style={styles.li}>
                    <strong>Legal and regulatory disclosures:</strong> We may disclose Personal Data where required by
                    Applicable Law or where we have a good faith belief that disclosure is reasonably necessary to
                    comply with a legal obligation, including in response to lawful requests by courts, regulators, law
                    enforcement, or other governmental authorities. Where permitted by law, we will notify affected
                    individuals of such disclosures unless prohibited from doing so.
                </li>
                <li style={styles.li}>
                    <strong>Business transfers:</strong> We may disclose Personal Data in connection with a merger,
                    acquisition, financing, reorganisation, dissolution, bankruptcy, or sale/transfer of some or all of
                    our assets. In such circumstances, we will require appropriate protection and safeguards to be
                    applied.
                </li>
                <li style={styles.li}>
                    <strong>Third-party services you choose to use:</strong> If You choose to use Third-Party Services
                    via the Platforms, data you share with them (or that is collected by them) is governed by their
                    privacy policies and terms. We are not responsible for their data practices.
                </li>
                <li style={styles.li}>
                    <strong>No sale of Personal Data:</strong> We do not sell Personal Data to unaffiliated third
                    parties for their direct marketing purposes without Your express consent.
                </li>
            </ul>

            <h2 style={styles.h2}>CROSS-BORDER TRANSFERS OF DATA</h2>
            <p style={styles.baseText}>
                Your Personal Data may be transferred to and processed in jurisdictions other than where You reside
                (including where we or our service providers operate). Where required by Applicable Law, we will
                implement appropriate safeguards for such transfers, which may include contractual clauses, adequacy
                mechanisms, and/or other lawful transfer tools.
            </p>

            <h2 style={styles.h2}>DATA SECURITY AND PROTECTION MEASURES</h2>
            <p style={styles.baseText}>
                We implement appropriate technical and organisational safeguards to protect Personal Data against loss,
                misuse, unauthorised access, alteration, or destruction, in line with Applicable Laws and industry
                standards. You acknowledge that blockchain transactions are public and immutable, and that data recorded
                on public blockchains cannot be deleted or modified by us. We retain personal data only as long as
                needed for the purposes described or as required by law. These safeguards include, where relevant:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>Encryption and pseudonymisation of Personal Data;</li>
                <li style={styles.li}>Access controls to restrict data access to authorised personnel only;</li>
                <li style={styles.li}>Use of secure servers and encrypted communication protocols;</li>
                <li style={styles.li}>
                    Periodic testing and review of security measures to ensure system integrity and resilience; and
                </li>
                <li style={styles.li}>
                    Requiring third-party service providers to adhere to comparable security standards.
                </li>
            </ul>
            <p style={styles.baseText}>
                We continuously review and update our security practices, taking into account the nature, scope,
                context, and purposes of processing, the sensitivity of the data, and the potential risks to Your rights
                and freedoms.
            </p>
            <p style={styles.baseText}>
                While We take these precautions, You acknowledge that no method of transmission over the internet or
                method of electronic storage is completely secure. Accordingly, We cannot guarantee absolute security of
                Your Personal Data.
            </p>

            <h2 style={styles.h2}>RETENTION OF PERSONAL DATA</h2>
            <p style={styles.baseText}>
                We do not keep Your Personal Data forever. We retain Your Personal Data only for as long as necessary to
                fulfil the purposes outlined in this Privacy Policy, including to comply with Our legal, contractual, or
                regulatory obligations, resolve disputes, and enforce Our policies.
            </p>
            <p style={styles.baseText}>
                The retention period can vary for different data types in the context of different Services and actual
                retention periods can vary significantly. We determine the appropriate retention period for personal
                information based on the amount, nature and sensitivity of Your Personal Data processed, the potential
                risk of harm from unauthorized use or disclosure of Your Personal Data and whether we can achieve the
                purposes of the processing through other means, as well as applicable legal requirements.
            </p>
            <p style={styles.baseText}>
                After expiry of the applicable retention periods, Your Personal Data will be deleted. If there is any
                data that we are unable, for technical reasons, to delete entirely from our systems, we will put in
                place appropriate measures to prevent any further use of that data.
            </p>

            <h2 style={styles.h2}>YOUR RIGHTS</h2>
            <p style={styles.baseText}>
                You have the following rights in relation to the Personal Data We collect and process:
            </p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    You may request confirmation of whether We process Your Personal Data, and obtain a copy of such
                    data, along with information on how it is being used;
                </li>
                <li style={styles.li}>
                    You may request the correction or updating of inaccurate or incomplete Personal Data held by Us;
                </li>
                <li style={styles.li}>
                    You may request that We erase Your Personal Data where it is no longer necessary for the purposes
                    for which it was collected, or if You withdraw consent (where processing is based on consent), or
                    where otherwise required by Applicable Law, subject to our legal obligations to retain certain data
                    and technical limitations inherent in blockchain technology;
                </li>
                <li style={styles.li}>
                    You may request that We restrict the processing of Your Personal Data in certain circumstances, such
                    as while a request for correction or objection is being evaluated;
                </li>
                <li style={styles.li}>
                    You have the right to object to the processing of Your Personal Data where it is based on Our
                    legitimate interests;
                </li>
                <li style={styles.li}>
                    Where technically feasible, You may request to receive Your Personal Data in a structured, commonly
                    used, and machine-readable format and request that it be transferred to another service provider;
                </li>
                <li style={styles.li}>
                    Where processing is based on Your consent, You may withdraw that consent at any time. This will not
                    affect the lawfulness of processing prior to such withdrawal; and
                </li>
                <li style={styles.li}>
                    If You believe that Your data protection rights have been violated, You may lodge a complaint with a
                    competent authority in Your jurisdiction as provided under Applicable Law.
                </li>
            </ul>
            <p style={styles.baseText}>
                You have the right to object to decisions made solely on the basis of automated processing, including
                profiling, where such decisions produce legal or similarly significant effects on You. This right does
                not apply where the automated processing is necessary for the performance of a contract, required by
                applicable law, or carried out with Your explicit consent. In such cases, We shall implement appropriate
                safeguards and, upon Your request, ensure that a human review is included in the decision-making
                process.
            </p>
            <p style={styles.baseText}>
                If a breach or violation involving Your Personal Data occurs that is likely to impact the
                confidentiality, integrity, or security of such data, We will promptly notify You where required under
                Applicable Law and without undue delay.
            </p>
            <p style={styles.baseText}>
                To exercise any of the rights above, You may contact Us using the details provided below. We may require
                You to verify Your identity and other necessary details before processing Your request.
            </p>
            <p style={styles.baseText}>
                Due to Our limited role in processing Personal Data (as described in the Terms of Use), the extent to
                which We may assist You in exercising these rights may be subject to certain technical or legal
                limitations. We will respond to all legitimate requests within five (5) business days. If Your request
                is complex or if multiple requests have been made, We may require additional time and will notify You
                accordingly.
            </p>

            <h2 style={styles.h2}>CONTACT US</h2>
            <p style={styles.baseText}>
                If You have any questions, concerns, or requests regarding this Privacy Policy, Our data practices, You
                may contact Us at{' '}
                <a style={linkStyle} href="mailto:support@opnet.org">
                    support@opnet.org
                </a>
                .
            </p>
            <p style={styles.baseText}>
                To assist Us in processing Your request efficiently, You should provide sufficient details about Your
                inquiry, including any supporting evidence or relevant information. We will treat all requests and
                complaints confidentially. Our team will serve as the first point of contact for all privacy-related
                matters and will ensure compliance with Our data protection obligations.
            </p>
            <p style={styles.baseText}>
                We are committed to addressing any concerns or complaints related to the collection, use, disclosure, or
                processing of Personal Data. We will acknowledge receipt of Your complaint and aim to provide a
                substantive response within a reasonable period, typically within [30] business days.
            </p>
            <p style={styles.baseText}>
                If additional information is required, We will reach out to You. Upon reaching a determination, We will
                notify You in writing, which may include electronic communication via email.
            </p>

            <h2 style={styles.h2}>CHANGES TO THIS PRIVACY POLICY</h2>
            <p style={styles.baseText}>
                We may update this Privacy Policy from time to time at Our sole discretion. Any changes will be
                effective upon publication on the respective Platform, unless otherwise stated.
            </p>
            <p style={styles.baseText}>
                We encourage You to review this Privacy Policy periodically. Your continued use of the Platforms and
                Services after the effective date of any changes constitutes Your acknowledgement of the updated Privacy
                Policy. However, where Applicable Law requires, We will obtain Your explicit consent before applying
                material changes that affect the legal basis for processing Your Personal Data.
            </p>
            <p style={styles.baseText}>Where the changes are material, We may also notify You by:</p>
            <ul style={styles.ul}>
                <li style={styles.li}>
                    sending a notice to the primary email address associated with Your account (if available); or
                </li>
                <li style={styles.li}>placing a prominent notice on the Platforms.</li>
            </ul>

            <h2 style={styles.h2}>DISPUTE RESOLUTION</h2>
            <p style={styles.baseText}>
                This Privacy Policy, and any dispute, controversy, claim, or difference arising out of or in connection
                with this Privacy Policy or Our processing of Personal Data (including any question regarding its
                existence, validity, interpretation, performance, breach, termination, or enforceability) (each, a
                &ldquo;Dispute&rdquo;), shall be governed by and construed in accordance with the Applicable Laws of the
                ADGM, including ADGM regulations and, to the extent applicable in ADGM, the federal laws of the United
                Arab Emirates, in each case without regard to conflict of laws principles. Subject to any mandatory
                rights under Applicable Law, the courts of the ADGM shall have exclusive jurisdiction to settle any
                Dispute.
            </p>

            {styles.hr ? <hr style={styles.hr} /> : null}

            <h2 style={styles.h2}>ACKNOWLEDGMENT</h2>
            <p style={styles.baseText}>
                BY PROVIDING YOUR EXPRESS CONSENT, SUBMITTING PERSONAL DATA, ACCESSING, OR USING THE PLATFORMS, YOU
                ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THIS PRIVACY POLICY.
            </p>
        </>
    );
}
