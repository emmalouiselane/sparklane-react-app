import React from 'react';
import './legal.css';

const PrivacyPolicyPage: React.FC = () => (
  <main className="legal-page" role="main">
    <article className="legal-page-card">
      <h1>Privacy Policy</h1>
      <p className="legal-page-meta"><strong>Last updated:</strong> 30 July 2026</p>
      <p>Spark Lane Dev operates Sparklane Personal Assistant (the “Service”). This policy explains what personal information we collect, why we use it, how it is shared, and the choices available to you.</p>
      <h2>Who is responsible for your information?</h2>
      <p>Spark Lane Dev is responsible for personal information processed through the Service. Contact <a href="mailto:emma@sparklane.dev">emma@sparklane.dev</a> with privacy questions or requests.</p>
      <h2>Information we collect</h2>
      <ul><li>Google account information, including your name, email address, profile photo, and account identifier.</li><li>Google Calendar events that you ask the Service to display or create.</li><li>Time logs, to-do items, budget settings and payments, and other information you enter.</li><li>Encrypted Google tokens, session identifiers, expiry information, and basic technical/request logs.</li><li>A necessary HTTP-only session cookie used to keep you signed in; it is not used for advertising.</li></ul>
      <h2>How we use and share information</h2>
      <p>We use information to authenticate you, provide the Service’s calendar, time-log, to-do, and budgeting features, save information you ask us to save, maintain security, troubleshoot problems, and comply with legal obligations.</p>
      <p>We do not sell or rent personal information. Information may be processed by Google, hosting and infrastructure providers, or authorities where required by law or necessary to protect rights and safety.</p>
      <h2>Google API data</h2>
      <p>We use information received from Google APIs only to provide the Google-connected features visible in the Service. We do not sell Google user data or use it for advertising, credit assessment, or unrelated purposes. Our use follows the <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener noreferrer">Google API Services User Data Policy</a>, including its Limited Use requirements.</p>
      <h2>Retention, responsibility, and removal</h2>
      <p>The Service is provided free of charge. We retain information while your account is active and as reasonably necessary for service, security, disputes, or legal obligations. You are responsible for information you upload or enter and should keep copies of anything important.</p>
      <p>To request access, correction, export, or removal of your account or uploaded information, contact <a href="mailto:emma@sparklane.dev">emma@sparklane.dev</a>. We may verify your identity and retain limited information where legally required.</p>
      <h2>Age requirement</h2>
      <p>The Service is intended only for individuals aged 18 and over. We do not knowingly provide the Service to anyone under 18.</p>
      <h2>Security and changes</h2>
      <p>We use authenticated access, HTTP-only session cookies, access controls, and encryption for stored Google tokens. No internet service can guarantee absolute security. We may update this policy when the Service or our processing changes.</p>
      <p className="legal-page-contact">Questions can be sent to <a href="mailto:emma@sparklane.dev">emma@sparklane.dev</a>.</p>
    </article>
  </main>
);

export default PrivacyPolicyPage;
