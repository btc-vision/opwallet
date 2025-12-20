import React, { type CSSProperties } from 'react';
import { Button, Column, Content, Layout, Logo, Row } from '@/ui/components';

const TermsOfServicePane = () => {
    // Outer wrapper ensures we NEVER exceed the container height.
    const outerStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        minHeight: 0, // important for nested flex layouts
        display: 'flex',
        flexDirection: 'column'
    };

    const scrollStyle: CSSProperties = {
        width: '100%',
        flex: '1 1 auto',
        minHeight: 0, // important: allows the scroll area to shrink
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: 18
    };

    // Layout / surface
    const wrapStyle: CSSProperties = {
        width: '100%',
        maxWidth: 920,
        margin: '0 auto'
    };

    const cardStyle: CSSProperties = {
        width: '100%',
        borderRadius: 18,
        padding: '22px 18px',
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
    };

    // Typography (smaller, tuned for dark-grey backgrounds)
    const baseText: CSSProperties = {
        color: 'rgba(255,255,255,0.84)',
        fontSize: 13,
        lineHeight: 1.68,
        letterSpacing: '0.01em',
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
    };

    const h1Style: CSSProperties = {
        ...baseText,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        margin: '0 0 6px 0',
        color: 'rgba(255,255,255,0.94)'
    };

    const metaStyle: CSSProperties = {
        ...baseText,
        margin: 0,
        fontSize: 12,
        color: 'rgba(255,255,255,0.62)'
    };

    const h2Style: CSSProperties = {
        ...baseText,
        fontSize: 15,
        fontWeight: 800,
        margin: '18px 0 8px 0',
        color: 'rgba(255,255,255,0.92)'
    };

    const h3Style: CSSProperties = {
        ...baseText,
        fontSize: 13,
        fontWeight: 800,
        margin: '12px 0 6px 0',
        color: 'rgba(255,255,255,0.88)'
    };

    const pStyle: CSSProperties = { ...baseText, margin: '8px 0' };
    const ulStyle: CSSProperties = { ...baseText, margin: '8px 0', paddingLeft: 18 };
    const liStyle: CSSProperties = { ...baseText, margin: '6px 0' };

    const hrStyle: CSSProperties = {
        border: 0,
        borderTop: '1px solid rgba(255,255,255,0.10)',
        margin: '18px 0'
    };

    const linkStyle: CSSProperties = {
        color: 'rgba(147,197,253,0.95)',
        textDecoration: 'underline',
        textUnderlineOffset: 3
    };

    const subtleCalloutStyle: CSSProperties = {
        marginTop: 16,
        padding: '12px 12px',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(0,0,0,0.18)'
    };

    return (
        <Layout>
            <Content preset="middle">
                <Column fullX style={outerStyle}>
                    {/* Fixed header area (logo) */}
                    <Row justifyCenter style={{ paddingTop: 6, paddingBottom: 6, flex: '0 0 auto' }}>
                        <Logo preset="large" />
                    </Row>

                    {/* Scrollable area (terms + button) */}
                    <div style={scrollStyle}>
                        <Column gap="xl" mt="xxl" style={{ paddingBottom: 6 }}>
                            <div style={wrapStyle}>
                                <div style={cardStyle}>
                                    <header>
                                        <h1 style={h1Style}>Terms of Service for OPNET</h1>
                                        <p style={metaStyle}>
                                            <strong style={{ color: 'rgba(255,255,255,0.78)' }}>Effective Date:</strong>{' '}
                                            April 20, 2025
                                        </p>
                                    </header>

                                    <p style={pStyle}>
                                        This Terms of Service document (<strong>“Terms”</strong>) is a legal agreement
                                        between you (<strong>“User”</strong> or <strong>“you”</strong>) and{' '}
                                        <strong>ORANGE PILL LABS HOLDING LTD</strong> (doing business as{' '}
                                        <strong>OPNET</strong>), which owns and operates the website{' '}
                                        <a href="https://opnet.org" style={linkStyle} target="_blank" rel="noreferrer">
                                            opnet.org
                                        </a>{' '}
                                        and related services (collectively, the <strong>“Service”</strong> or{' '}
                                        <strong>“Site”</strong>). By accessing or using the Service, you agree to be
                                        bound by these Terms. If you do not agree with any part of these Terms, you must
                                        not use or access the Service.
                                    </p>

                                    <hr style={hrStyle} />

                                    <section>
                                        <h2 style={h2Style}>1. Acceptance of Terms</h2>
                                        <p style={pStyle}>
                                            By using the Service in any manner, you acknowledge that you have read,
                                            understood, and agree to these Terms, as well as all other operating rules,
                                            policies, and procedures that we may publish on the Site (including a
                                            Privacy Policy, once available). These Terms apply to all users of the
                                            Service. If you are using the Service on behalf of an organization, you
                                            represent that you have the authority to bind that organization to these
                                            Terms.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>2. Eligibility</h2>

                                        <h3 style={h3Style}>2.1 Minimum Age:</h3>
                                        <p style={pStyle}>
                                            You must be at least 18 years of age (or the age of majority in your
                                            jurisdiction, if higher) to access or use this Service. By using the
                                            Service, you represent and warrant that you meet this age requirement. If
                                            you are under 18, you are not permitted to use the Service.
                                        </p>

                                        <h3 style={h3Style}>2.2 Legal Capacity:</h3>
                                        <p style={pStyle}>
                                            You further represent that you are legally competent and have the full
                                            right, power, and authority to enter into and comply with these Terms. You
                                            are not a person barred from using the Service under the laws of any
                                            applicable jurisdiction (for example, due to sanctions or legal
                                            restrictions).
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>3. Account Registration and Access</h2>

                                        <h3 style={h3Style}>3.1 Third-Party Login:</h3>
                                        <p style={pStyle}>
                                            To use certain features of OPNET, you may need to create an account or log
                                            in via a third-party service. OPNET currently allows login using X (formerly
                                            Twitter) or an <strong>OP_WALLET</strong> authentication. When logging in
                                            through such a service, you authorize OPNET to access certain information
                                            from that account as permitted by the provider and by you. We will only
                                            retrieve and use information that is publicly available or otherwise
                                            authorized by you (for example, your public profile or handle on X, or your
                                            public wallet address from OP_WALLET).
                                        </p>

                                        <h3 style={h3Style}>3.2 Account Security:</h3>
                                        <p style={pStyle}>
                                            You are responsible for maintaining the confidentiality and security of any
                                            credentials (such as your Twitter login or wallet credentials) you use to
                                            access the Service. Do not share your private keys, passwords, or login
                                            information with anyone. OPNET will never ask for your private wallet keys.
                                            You are fully responsible for all activities that occur under your account
                                            or through your wallet connection. If you suspect any unauthorized use of
                                            your account or security breach, you must notify OPNET immediately.
                                        </p>

                                        <h3 style={h3Style}>3.3 Accurate Information:</h3>
                                        <p style={pStyle}>
                                            You agree to provide true, current, and complete information about yourself
                                            when logging in or participating in the Service, and to update such
                                            information as necessary. If any information provided by you is untrue,
                                            inaccurate, not current, or incomplete, OPNET reserves the right to suspend
                                            or terminate your account and refuse any and all current or future use of
                                            the Service.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>4. User Conduct and Use of the Service</h2>
                                        <p style={pStyle}>
                                            By accessing OPNET, you agree to use the Service only for lawful purposes
                                            and in compliance with these Terms. You also understand and agree that:
                                        </p>

                                        <ul style={ulStyle}>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    Voluntary Participation:
                                                </strong>{' '}
                                                You are not required or obligated to perform any tasks, activities, or
                                                actions on the Site. Any participation in challenges, testnet
                                                activities, or other tasks offered by OPNET is completely voluntary and
                                                at your own discretion and risk. You may choose whether or not to
                                                participate in any given activity, and you can stop participating at any
                                                time without penalty (aside from losing eligibility for any potential
                                                rewards tied to that activity).
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    Prohibited Conduct:
                                                </strong>{' '}
                                                You will not engage in any behavior that violates any law, infringes
                                                anyone’s rights, or interferes with the proper functioning of the
                                                Service. For example, you agree not to: (a) use the Service for any
                                                unlawful, fraudulent, or malicious purpose; (b) attempt to hack,
                                                disrupt, or compromise the security or integrity of the Service or any
                                                networks or servers connected to the Service; (c) impersonate any person
                                                or entity or misrepresent your affiliation with any person or entity
                                                while using the Service; (d) input or upload any content to the Service
                                                that is illegal, harmful, or violates the rights of others (including
                                                any intellectual property or privacy rights); or (e) engage in any other
                                                activity that could interfere with other users’ enjoyment of the Service
                                                or with OPNET’s ability to provide the Service.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    No Exploitation of System:
                                                </strong>{' '}
                                                You agree not to exploit, cheat, or misuse the Service or any reward
                                                system. This includes refraining from using bots, scripts, or any
                                                automated means to manipulate your activity or Points (as defined
                                                below), creating multiple accounts for the same person to gain an unfair
                                                advantage, or any other behavior that OPNET deems to be abusive or
                                                contrary to the spirit of the platform.
                                            </li>
                                        </ul>

                                        <p style={pStyle}>
                                            Any violation of the above conditions may result in immediate termination of
                                            your access to the Service, removal of Points (if any) and rewards, and
                                            potential legal action if warranted.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>5. Testnet Reward System (Points)</h2>
                                        <p style={pStyle}>
                                            OPNET may offer a point-based reward system (<strong>“Points”</strong>) to
                                            incentivize and recognize user participation in certain testnet activities
                                            or tasks on the platform. By participating in the testnet reward program,
                                            you acknowledge and agree to the following:
                                        </p>

                                        <ul style={ulStyle}>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    Points Have No Monetary Value:
                                                </strong>{' '}
                                                Points are purely a form of virtual recognition within the OPNET testnet
                                                environment. Points are not currency or property, and they have no cash
                                                or monetary value. Points cannot be sold, transferred outside of the
                                                Service, or exchanged for cash, crypto, or any goods or services outside
                                                of the OPNET platform. Points do not represent any ownership stake or
                                                equity in OPNET or any related project.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    No Guarantee of Future Airdrop or Benefits:
                                                </strong>{' '}
                                                While OPNET may, at its sole discretion, choose to use Points as a basis
                                                for distributing rewards (for example, a future token airdrop or other
                                                benefit), there is absolutely no guarantee or warranty that any such
                                                airdrop, token distribution, or reward will ever occur. Under no
                                                circumstances should you interpret the accumulation of Points as a
                                                promise, guarantee, or entitlement to receive any tokens,
                                                cryptocurrency, financial reward, or any other benefit. OPNET makes no
                                                commitment that Points will be redeemable for anything of value now or
                                                in the future.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    OPNET’s Discretion on Rewards:
                                                </strong>{' '}
                                                OPNET reserves the right to determine if, when, and how any rewards
                                                might be given to users. If an airdrop or reward distribution is
                                                conducted in the future, the terms, eligibility, amount, and form of
                                                such distribution will be decided exclusively by OPNET. These Terms do
                                                not constitute a contract for a future reward. Participation in the
                                                testnet or earning Points is voluntary and does not create any
                                                contractual right or expectation of compensation.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    Modification or Deletion of Points:
                                                </strong>{' '}
                                                OPNET reserves full rights to update, modify, adjust, or delete user
                                                Points balances at its sole discretion. We may add or subtract Points
                                                from your account, or eliminate your Points balance entirely, at any
                                                time and for any reason, including but not limited to: technical errors,
                                                system maintenance, suspected fraudulent activity or gaming of the
                                                system, user inactivity, rule changes in the reward program, or
                                                termination of the testnet or reward system. OPNET may also decide to
                                                discontinue or terminate the Points reward system (in whole or in part)
                                                at any time without notice. In the event of any update or reset of
                                                Points, you acknowledge that you have no property or vested rights in
                                                the Points and agree that OPNET will have no liability for any loss of
                                                Points or perceived loss of value.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    No Warranty on Point System:
                                                </strong>{' '}
                                                OPNET provides the Points and reward system on an “as-is” basis with no
                                                warranties (see Disclaimer of Warranties below). We do not warrant that
                                                the Points tracking system will be accurate or error-free. It is
                                                possible that Points may not be recorded properly, or may be lost or
                                                altered due to bugs, technical issues, or events beyond our control.
                                                OPNET is not liable for any error or omission in the tracking or
                                                tallying of Points.
                                            </li>
                                        </ul>

                                        <p style={pStyle}>
                                            In summary, the testnet Points are a gratuitous incentive mechanism. You
                                            should not rely on Points for any future benefit. Participating in the
                                            Points system or any testnet task is entirely at your own risk and
                                            discretion.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>6. Data Collection and Privacy</h2>
                                        <p style={pStyle}>
                                            Your privacy is important to us. OPNET’s approach to data collection for
                                            this Service is minimalistic. By using the Service, you acknowledge and
                                            agree to the following practices:
                                        </p>

                                        <ul style={ulStyle}>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    No Personal Data Collection:
                                                </strong>{' '}
                                                OPNET does not require or collect any personal identifying information
                                                (such as your real name, address, or government ID) from you in order to
                                                use the Service.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    Third-Party Login Information:
                                                </strong>{' '}
                                                If you choose to log in via X (formerly Twitter) or via OP_WALLET, we
                                                may receive limited information from those services. From X we might
                                                receive your public profile information (such as your username/handle
                                                and profile picture) as permitted by X’s API and your privacy settings.
                                                From an OP_WALLET login, we may receive your public wallet address or
                                                public key.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    Public Keys and Activity Tracking:
                                                </strong>{' '}
                                                The platform may store your blockchain wallet’s public key or public
                                                address and associate it with your account in order to track your
                                                testnet activities and allocate Points or rewards.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    Use of Google Analytics:
                                                </strong>{' '}
                                                We use Google Analytics (a web analytics service provided by Google) or
                                                similar analytics tools to collect information about how users interact
                                                with the Site via cookies and similar technologies.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    No Sharing of Personal Info:
                                                </strong>{' '}
                                                We do not sell or share personal information with third parties for
                                                marketing. We may share aggregated, anonymized usage statistics.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    Future Privacy Policy:
                                                </strong>{' '}
                                                A separate, detailed Privacy Policy may be published in the future and
                                                incorporated by reference.
                                            </li>
                                            <li style={liStyle}>
                                                <strong style={{ color: 'rgba(255,255,255,0.92)' }}>
                                                    External Services and OAuth:
                                                </strong>{' '}
                                                When you use third-party services (like X/Twitter or OP_WALLET) you are
                                                subject to those third parties’ terms and privacy policies. OPNET is not
                                                responsible for their practices.
                                            </li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>7. Intellectual Property and Content</h2>

                                        <h3 style={h3Style}>7.1 OPNET Intellectual Property:</h3>
                                        <p style={pStyle}>
                                            The Service (including all content, text, graphics, software, code,
                                            features, and design elements, as well as the compilation and arrangement
                                            thereof) is owned by or licensed to ORANGE PILL LABS HOLDING LTD and is
                                            protected by copyright, trademark, and other intellectual property laws. All
                                            trademarks, logos, and service marks displayed on the Site (including
                                            “OPNET” and any related logos or designs) are the property of OPNET or their
                                            respective third-party owners.
                                        </p>

                                        <h3 style={h3Style}>7.2 Personal Use License:</h3>
                                        <p style={pStyle}>
                                            Subject to your compliance with these Terms, OPNET grants you a limited,
                                            non-exclusive, non-transferable, revocable license to access and use the
                                            Service for your personal, non-commercial use only.
                                        </p>

                                        <h3 style={h3Style}>7.3 User Contributions:</h3>
                                        <p style={pStyle}>
                                            If you submit or post any content on the Site (“User Contributions”), you
                                            retain ownership of any intellectual property rights in that content.
                                            However, by submitting any User Contribution, you grant OPNET a worldwide,
                                            royalty-free, perpetual, irrevocable, non-exclusive, sublicensable and
                                            transferable license to use it in connection with operating and promoting
                                            the Service.
                                        </p>

                                        <h3 style={h3Style}>7.4 Open Source Components:</h3>
                                        <p style={pStyle}>
                                            If the Service includes any open source software or components, those
                                            components may be licensed under their own respective open source licenses,
                                            which will govern your use of those components.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>8. Disclaimer of Warranties</h2>
                                        <p style={pStyle}>
                                            The Service is provided on an “AS IS” and “AS AVAILABLE” basis, without any
                                            warranties of any kind, either express or implied. To the fullest extent
                                            permitted by applicable law, OPNET disclaims all warranties of any kind,
                                            whether express, implied, or statutory.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>9. Limitation of Liability</h2>
                                        <p style={pStyle}>
                                            To the maximum extent permitted by law, in no event shall OPNET or related
                                            parties be liable for any damages arising out of or in connection with your
                                            use of (or inability to use) the Service. If liability is found, OPNET’s
                                            total liability is limited to the amount (if any) that you paid to OPNET for
                                            use of the Service or USD $100, whichever is less.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>10. Indemnification</h2>
                                        <p style={pStyle}>
                                            You agree to indemnify, defend, and hold harmless OPNET and related parties
                                            from and against claims, damages, obligations, losses, liabilities, costs or
                                            debt, and expenses (including reasonable attorney’s fees) arising from or
                                            related to your use of the Service, violation of these Terms, violation of
                                            law or rights, User Contributions, or interactions/transactions.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>11. Changes to Terms</h2>
                                        <p style={pStyle}>
                                            OPNET reserves the right to update, revise, or change these Terms at any
                                            time. The revised Terms will be effective immediately upon posting unless
                                            otherwise specified. Your continued use of the Service after any changes
                                            signifies your acceptance of the revised Terms.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>12. Termination</h2>
                                        <p style={pStyle}>
                                            We may suspend or terminate your access to the Service at any time and for
                                            any reason. You may discontinue access at any time. Upon termination, your
                                            right to use the Service will immediately cease and you may lose access to
                                            Points, data, or content without compensation.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>13. Governing Law and Dispute Resolution</h2>
                                        <p style={pStyle}>
                                            These Terms are governed by and construed in accordance with the laws of Abu
                                            Dhabi, UAE. Any dispute arising out of or relating to these Terms or the use
                                            of the Service that cannot be resolved amicably shall be subject to the
                                            exclusive jurisdiction of the courts of Abu Dhabi, UAE. To the extent
                                            permitted, both parties waive jury trial and class/collective actions.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 style={h2Style}>14. Miscellaneous Provisions</h2>
                                        <p style={pStyle}>
                                            These Terms constitute the entire agreement between you and OPNET regarding
                                            the Service. If any provision is held to be invalid or unenforceable, the
                                            remaining provisions remain in full force and effect.
                                        </p>
                                    </section>

                                    <div style={subtleCalloutStyle}>
                                        <p style={{ ...pStyle, margin: 0, color: 'rgba(255,255,255,0.82)' }}>
                                            By using OPNET, you acknowledge that you have read and understand these
                                            Terms and agree to be bound by them. If you have any questions or concerns
                                            about these Terms, please contact OPNET through our official channels before
                                            proceeding.
                                        </p>
                                    </div>

                                    <Row justifyCenter style={{ marginTop: 18 }}>
                                        <Button preset="approval" onClick={() => window.history.back()}>Back</Button>
                                    </Row>
                                </div>
                            </div>
                        </Column>
                    </div>
                </Column>
            </Content>
        </Layout>
    );
};

export default TermsOfServicePane;
