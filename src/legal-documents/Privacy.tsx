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

export function PrivacyPolicyText({
                                      effectiveDate,
                                      styles,
                                  }: {
    effectiveDate: string;
    styles: PolicyStyles;
}) {
    const linkStyle: CSSProperties = {
        color: 'rgba(147,197,253,0.95)',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
        wordBreak: 'break-word',
    };

    return (
        <>
            <div style={{ marginBottom: 10 }}>
                <div style={{ ...styles.h2, marginTop: 2 }}>OPWALLET PRIVACY POLICY</div>
                <p style={{ ...styles.baseText, marginTop: 6, color: 'rgba(255,255,255,0.70)' }}>
                    ORANGE PILL LABS HOLDING LTD
                    <br />
                    Effective Date: {effectiveDate}
                </p>
            </div>

            <h2 style={styles.h2}>1. INTRODUCTION</h2>
            <p style={styles.baseText}>
                ORANGE PILL LABS HOLDING LTD, a company incorporated in Abu Dhabi Global Market, United Arab Emirates
                (&quot;OPNET,&quot; &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), operates OPWALLET, a
                non-custodial cryptocurrency wallet browser extension. This Privacy Policy describes how we collect, use, disclose, and
                protect information in connection with the OPWALLET browser extension, associated websites, and related services
                (collectively, the &quot;Wallet&quot; or &quot;Services&quot;).
            </p>
            <p style={styles.baseText}>
                By installing, accessing, or using the Wallet, you consent to the practices described in this Privacy Policy. If you do
                not agree with this Privacy Policy, you must not install, access, or use the Wallet.
            </p>

            <h2 style={styles.h2}>2. NON-CUSTODIAL ARCHITECTURE AND DATA WE DO NOT COLLECT</h2>
            <p style={styles.baseText}>
                OPWALLET is designed as a non-custodial wallet. This architecture means we do not collect, store, access, or have the
                ability to recover certain categories of sensitive information.
            </p>

            <h3 style={styles.h3}>2.1 Information We Never Collect</h3>
            <p style={styles.baseText}>
                We do not collect, store, transmit, or have access to: your private keys; your seed phrases or recovery phrases; your
                wallet passwords or PINs; your account balances; your transaction history; your blockchain addresses; or the contents of
                transactions you sign or broadcast. All cryptographic key material is generated locally on your device, encrypted locally
                on your device, and stored only on your device. We have no technical capability to access this information.
            </p>

            <h3 style={styles.h3}>2.2 Local Storage</h3>
            <p style={styles.baseText}>
                Your private keys, seed phrases, and wallet data are stored exclusively in your browser&apos;s local storage in encrypted
                form. This data never leaves your device through our systems. We cannot retrieve, reset, or recover this data if you lose
                access to it.
            </p>

            <h2 style={styles.h2}>3. INFORMATION WE COLLECT</h2>
            <p style={styles.baseText}>
                While we do not collect wallet credentials or transaction data, we do collect certain information to operate and improve
                the Wallet.
            </p>

            <h3 style={styles.h3}>3.1 Analytics Data</h3>
            <p style={styles.baseText}>
                We use Google Analytics and may use other analytics services to collect usage data. Analytics data may include: device
                type and operating system; browser type and version; screen resolution; general geographic location derived from IP
                address at city or regional level; pages and features accessed within the Wallet; session duration and frequency of use;
                click patterns and user interface interactions; referral sources; and crash reports and error logs. Analytics data is
                collected in aggregated or pseudonymised form and is used to understand how users interact with the Wallet, identify bugs
                and performance issues, and improve user experience. Google Analytics may use cookies or similar technologies. You can
                learn more about Google&apos;s data practices at{' '}
                <a style={linkStyle} href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                    https://policies.google.com/privacy
                </a>
                .
            </p>

            <h3 style={styles.h3}>3.2 Information Collected by Third-Party Services</h3>
            <p style={styles.baseText}>
                When the Wallet retrieves price data from CoinGecko or other third-party data providers, your IP address and request
                metadata may be transmitted to those services. We do not control what information these third parties collect. Your use
                of the Wallet constitutes consent to such third-party data collection. We encourage you to review the privacy policies of
                third-party services, including CoinGecko&apos;s privacy policy at{' '}
                <a style={linkStyle} href="https://www.coingecko.com/en/privacy" target="_blank" rel="noreferrer">
                    https://www.coingecko.com/en/privacy
                </a>
                .
            </p>

            <h3 style={styles.h3}>3.3 Information You Provide Voluntarily</h3>
            <p style={styles.baseText}>
                If you contact us for support, report bugs, or provide feedback, we may collect: your email address; the content of your
                communications; and any attachments or screenshots you provide. We use this information solely to respond to your
                inquiries and improve the Wallet.
            </p>

            <h3 style={styles.h3}>3.4 Server Logs</h3>
            <p style={styles.baseText}>
                Our servers may automatically collect certain information when the Wallet communicates with our infrastructure,
                including: IP addresses; request timestamps; request types and endpoints accessed; and response codes and error messages.
                Server logs are retained for security and operational purposes and are typically deleted within ninety (90) days unless
                required for ongoing security investigations.
            </p>

            <h2 style={styles.h2}>4. HOW WE USE INFORMATION</h2>
            <p style={styles.baseText}>
                We use collected information for the following purposes: to operate and maintain the Wallet; to improve and optimise the
                Wallet&apos;s performance and user experience; to identify and fix bugs, errors, and security vulnerabilities; to analyse
                usage patterns and feature adoption; to respond to support requests and communications; to detect and prevent fraud,
                abuse, and security threats; to comply with legal obligations; and to enforce our Terms of Use.
            </p>

            <h2 style={styles.h2}>5. INFORMATION SHARING AND DISCLOSURE</h2>
            <p style={styles.baseText}>
                We do not sell your personal information. We may share information in the following limited circumstances.
            </p>

            <h3 style={styles.h3}>5.1 Service Providers</h3>
            <p style={styles.baseText}>
                We share information with third-party service providers who perform services on our behalf, including: Google
                (analytics); cloud hosting providers; and customer support tools. Service providers are contractually obligated to use
                information only for the purposes of providing services to us and to maintain appropriate security measures.
            </p>

            <h3 style={styles.h3}>5.2 Legal Requirements</h3>
            <p style={styles.baseText}>
                We may disclose information if required by law, regulation, legal process, or governmental request. We may also disclose
                information to: comply with applicable laws or regulations; respond to valid legal process such as subpoenas, court
                orders, or search warrants; protect the rights, property, or safety of OPNET, our users, or the public; detect, prevent,
                or address fraud, security, or technical issues; and enforce our Terms of Use.
            </p>

            <h3 style={styles.h3}>5.3 Business Transfers</h3>
            <p style={styles.baseText}>
                If OPNET is involved in a merger, acquisition, sale of assets, or bankruptcy, information may be transferred as part of
                that transaction. We will provide notice before information becomes subject to a different privacy policy.
            </p>

            <h3 style={styles.h3}>5.4 Aggregated or De-Identified Data</h3>
            <p style={styles.baseText}>
                We may share aggregated or de-identified information that cannot reasonably be used to identify you for any purpose,
                including research, analytics, and marketing.
            </p>

            <h2 style={styles.h2}>6. BLOCKCHAIN TRANSACTIONS AND PUBLIC DATA</h2>
            <p style={styles.baseText}>
                You must understand that blockchain networks, including Bitcoin and OPNet, are public and transparent by design.
            </p>
            <p style={styles.baseText}>
                When you broadcast a transaction through the Wallet, the following information becomes permanently and publicly recorded
                on the blockchain: sender and recipient addresses; transaction amounts; transaction timestamps; transaction fees; and any
                data included in the transaction. This information is publicly accessible to anyone, is permanently recorded and cannot
                be deleted or modified, may be analysed by third parties to link addresses to identities, and is not controlled by OPNET.
                OPNET has no ability to delete, modify, or restrict access to blockchain data. Your use of the Wallet to broadcast
                transactions constitutes your acknowledgment that such transactions will be publicly recorded.
            </p>

            <h2 style={styles.h2}>7. DATA RETENTION</h2>
            <p style={styles.baseText}>
                We retain information for as long as necessary to fulfil the purposes described in this Privacy Policy, unless a longer
                retention period is required or permitted by law. Analytics data is generally retained in aggregated form indefinitely
                for historical analysis. Server logs are typically retained for ninety (90) days. Support communications are retained for
                as long as necessary to resolve your inquiry and for a reasonable period thereafter for quality assurance purposes. When
                information is no longer needed, we delete it or anonymise it in accordance with our data retention practices.
            </p>

            <h2 style={styles.h2}>8. DATA SECURITY</h2>
            <p style={styles.baseText}>
                We implement reasonable technical and organisational measures to protect information against unauthorised access,
                alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is
                completely secure. We cannot guarantee absolute security. Your wallet security depends primarily on measures you take,
                including: securing your private keys and seed phrases; using strong, unique passwords; keeping your device and browser
                secure; and being vigilant against phishing and social engineering attacks. We are not responsible for any loss resulting
                from your failure to maintain adequate security practices.
            </p>

            <h2 style={styles.h2}>9. YOUR CHOICES AND RIGHTS</h2>
            <h3 style={styles.h3}>9.1 Analytics Opt-Out</h3>
            <p style={styles.baseText}>
                You may be able to opt out of certain analytics collection through: browser privacy settings; browser extensions that
                block analytics; and Google Analytics opt-out tools available at{' '}
                <a style={linkStyle} href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer">
                    https://tools.google.com/dlpage/gaoptout
                </a>
                . Note that opting out of analytics may affect our ability to identify and resolve bugs or improve the Wallet.
            </p>

            <h3 style={styles.h3}>9.2 Uninstalling the Wallet</h3>
            <p style={styles.baseText}>
                You may stop all data collection by uninstalling the Wallet. Uninstalling will remove locally stored data from your
                device, but will not affect: data already collected by analytics services; data stored on our servers; blockchain data you
                have broadcast; or data collected by third-party services.
            </p>

            <h3 style={styles.h3}>9.3 Data Subject Rights</h3>
            <p style={styles.baseText}>
                Depending on your jurisdiction, you may have certain rights regarding your personal information, including the right to:
                access the personal information we hold about you; correct inaccurate personal information; request deletion of your
                personal information; object to or restrict certain processing; and data portability. To exercise these rights, please
                contact us at report@opnet.org. We will respond to requests in accordance with applicable law. Note that we may be unable
                to fulfil certain requests because we do not possess certain information, such as private keys, transaction data, or
                wallet balances, due to our non-custodial architecture.
            </p>

            <h2 style={styles.h2}>10. INTERNATIONAL DATA TRANSFERS</h2>
            <p style={styles.baseText}>
                OPNET is based in the United Arab Emirates. Information we collect may be transferred to, stored, and processed in the
                United Arab Emirates or other countries where we or our service providers operate. These countries may have different
                data protection laws than your country of residence. By using the Wallet, you consent to the transfer of information to
                countries outside your country of residence, including the United Arab Emirates. We take steps to ensure that information
                receives adequate protection in accordance with this Privacy Policy regardless of where it is processed.
            </p>

            <h2 style={styles.h2}>11. CHILDREN&apos;S PRIVACY</h2>
            <p style={styles.baseText}>
                The Wallet is not intended for use by individuals under the age of eighteen (18) or the age of majority in their
                jurisdiction, whichever is higher. We do not knowingly collect personal information from children. If we become aware
                that we have collected personal information from a child, we will take steps to delete such information promptly. If you
                believe a child has provided us with personal information, please contact us at report@opnet.org.
            </p>

            <h2 style={styles.h2}>12. THIRD-PARTY LINKS AND SERVICES</h2>
            <p style={styles.baseText}>
                The Wallet may contain links to or integrations with third-party websites, applications, and services. This Privacy Policy
                does not apply to third-party services. We are not responsible for the privacy practices of third parties. We encourage
                you to review the privacy policies of any third-party services you access through the Wallet, including but not limited
                to: CoinGecko (
                <a style={linkStyle} href="https://www.coingecko.com/en/privacy" target="_blank" rel="noreferrer">
                    https://www.coingecko.com/en/privacy
                </a>
                ); Google (
                <a style={linkStyle} href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                    https://policies.google.com/privacy
                </a>
                ); MotoSwap (separate privacy policy applies); and any decentralised applications you interact with.
            </p>

            <h2 style={styles.h2}>13. CHANGES TO THIS PRIVACY POLICY</h2>
            <p style={styles.baseText}>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated
                Privacy Policy on our website and updating the &quot;Effective Date&quot; at the top of this document. For significant
                changes that materially affect your rights, we will provide thirty (30) days advance notice through the Wallet interface,
                our website, or other communication channels. Your continued use of the Wallet after the effective date of any
                modification constitutes acceptance of the modified Privacy Policy. If you do not agree to the modified Privacy Policy,
                you must cease using the Wallet before the effective date.
            </p>

            <h2 style={styles.h2}>14. CONTACT INFORMATION</h2>
            <p style={styles.baseText}>
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
            </p>
            <p style={styles.baseText}>
                ORANGE PILL LABS HOLDING LTD
                <br />
                Abu Dhabi Global Market, United Arab Emirates
                <br />
                Email: report@opnet.org
            </p>
            <p style={styles.baseText}>We will endeavour to respond to inquiries within a reasonable timeframe.</p>

            <h2 style={styles.h2}>15. JURISDICTION-SPECIFIC PROVISIONS</h2>

            <h3 style={styles.h3}>15.1 European Economic Area, United Kingdom, and Switzerland</h3>
            <p style={styles.baseText}>
                If you are located in the European Economic Area (&quot;EEA&quot;), United Kingdom, or Switzerland, the following
                additional provisions apply. Our legal bases for processing personal information include: performance of a contract when
                processing is necessary to provide the Wallet to you; legitimate interests when processing is necessary for our
                legitimate business interests such as improving the Wallet, provided those interests are not overridden by your rights;
                consent where you have provided consent to processing; and legal obligation when processing is necessary to comply with
                applicable law. You have the right to lodge a complaint with a supervisory authority in your jurisdiction if you believe
                we have violated your data protection rights.
            </p>

            <h3 style={styles.h3}>15.2 California</h3>
            <p style={styles.baseText}>
                If you are a California resident, the California Consumer Privacy Act (&quot;CCPA&quot;) provides you with additional
                rights. We do not sell personal information as defined under the CCPA. You have the right to: know what personal
                information we collect, use, disclose, and sell; request deletion of your personal information; opt out of the sale of
                personal information (though we do not sell personal information); and not be discriminated against for exercising your
                rights. To exercise your rights, contact us at report@opnet.org. We will verify your identity before responding to
                requests.
            </p>

            <h3 style={styles.h3}>15.3 United Arab Emirates</h3>
            <p style={styles.baseText}>
                This Privacy Policy is governed by the laws of Abu Dhabi Global Market, United Arab Emirates, including the ADGM Data
                Protection Regulations 2021. We process personal data in accordance with applicable UAE and ADGM data protection
                requirements.
            </p>

            {styles.hr ? <hr style={styles.hr} /> : null}

            <h2 style={styles.h2}>ACKNOWLEDGMENT</h2>
            <p style={styles.baseText}>
                BY INSTALLING, ACCESSING, OR USING OPWALLET, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THIS
                PRIVACY POLICY.
            </p>
        </>
    );
}
