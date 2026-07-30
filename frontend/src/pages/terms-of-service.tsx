import React from 'react';
import './legal.css';

const TermsOfServicePage: React.FC = () => (
  <main className="legal-page" role="main">
    <article className="legal-page-card">
      <h1>Terms of Service</h1>
      <p className="legal-page-meta"><strong>Last updated:</strong> 30 July 2026</p>
      <p>These Terms govern your use of Sparklane Personal Assistant (the “Service”), operated by Spark Lane Dev. By using the Service, you agree to these Terms and our <a href="/privacy">Privacy Policy</a>.</p>
      <h2>Eligibility and account</h2>
      <p>You must be aged 18 or over and able to form a legally binding agreement to use the Service. You sign in using Google and are responsible for your account, your Google account security, and accurate information.</p>
      <h2>The Service</h2>
      <p>The Service provides Google Calendar integration, time logging, to-do lists, meal-planning information, and budget tracking. It is provided free of charge and is not currently a paid subscription service. Features may change, be suspended, or be discontinued.</p>
      <h2>Google services</h2>
      <p>Calendar features use Google APIs and require the permissions you approve. Google’s applicable terms and policies also apply. You can revoke access through your Google account settings.</p>
      <h2>Your content and responsibility</h2>
      <p>You retain ownership of information you enter. You are responsible for information you upload or enter, for having the right to submit it, and for keeping copies of anything important. To request removal of information, contact <a href="mailto:emma@sparklane.dev">emma@sparklane.dev</a>.</p>
      <h2>Acceptable use</h2>
      <p>You must not break the law, access another person’s account, interfere with or reverse engineer the Service where prohibited by law, distribute malware or harmful content, or use another person’s information without authority.</p>
      <h2>Not professional advice</h2>
      <p>The Service is a personal productivity tool. Its calendar, budgeting, meal-planning, and other information is general information, not financial, medical, nutritional, legal, or other professional advice.</p>
      <h2>Availability, termination, and ownership</h2>
      <p>We do not promise uninterrupted or error-free operation. We may suspend or terminate access to protect the Service, investigate misuse, comply with law, address security issues, or discontinue the Service. We and our licensors own the Service, including its software, design, branding, and original content.</p>
      <h2>Disclaimers and limitation of liability</h2>
      <p>To the fullest extent permitted by law, the Service is provided on an “as is” and “as available” basis. We are not liable for indirect, incidental, special, consequential, or loss-of-profit damages. Our total liability is limited to the amount paid for the Service in the preceding twelve months, or £100 if you paid nothing. Nothing excludes liability that cannot legally be excluded.</p>
      <h2>Changes and governing law</h2>
      <p>We may update these Terms and will update the date above. Continued use after the effective date means you accept them. These Terms are governed by the laws of England and Wales, with the courts of England and Wales having non-exclusive jurisdiction where legally permitted.</p>
      <p className="legal-page-contact">Questions can be sent to <a href="mailto:emma@sparklane.dev">emma@sparklane.dev</a>.</p>
    </article>
  </main>
);

export default TermsOfServicePage;
