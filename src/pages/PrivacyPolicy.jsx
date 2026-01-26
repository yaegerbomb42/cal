import PolicyLayout from './PolicyLayout';

const PrivacyPolicy = () => (
  <PolicyLayout
    title="Privacy Policy"
    subtitle="How CalAI protects your data, supports GDPR rights, and explains advertising usage."
  >
    <h2>1. Data We Collect</h2>
    <p>
      We collect account identifiers (email, display name), calendar metadata, and preference settings needed to
      deliver scheduling features. Event content you create is stored within your account and synchronized only
      with connected services you authorize.
    </p>

    <h2>2. Legal Basis for Processing (GDPR)</h2>
    <p>
      CalAI processes data under legitimate interest (service improvement), contractual necessity (delivering the
      calendar), and consent (optional integrations, marketing communications). You may withdraw consent at any time.
    </p>

    <h2>3. Cookies & Advertising</h2>
    <p>
      We use cookies to maintain sessions, remember settings, and measure performance. Ads served through Google
      AdSense may use cookies or device identifiers to personalize ads. You can adjust ad personalization through
      Google’s Ads Settings or opt out via your browser controls.
    </p>

    <h2>4. Data Retention</h2>
    <p>
      We retain account data while your account remains active. If you delete your account or request removal, we
      remove or anonymize stored data within a commercially reasonable timeframe unless legal obligations require
      retention.
    </p>

    <h2>5. Your Rights</h2>
    <ul>
      <li>Access, correct, or export your data.</li>
      <li>Request deletion or restriction of processing.</li>
      <li>Object to processing based on legitimate interest.</li>
      <li>Receive your data in a portable format.</li>
    </ul>

    <h2>6. Security</h2>
    <p>
      We employ encryption in transit, secure storage for credentials, and access controls. API keys are masked in
      the UI and stored securely to reduce exposure risk.
    </p>

    <h2>7. Contact</h2>
    <p>
      For privacy requests or GDPR inquiries, email <strong>privacy@calai.app</strong> or visit the Contact page.
    </p>
  </PolicyLayout>
);

export default PrivacyPolicy;
