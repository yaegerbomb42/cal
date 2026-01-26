import PolicyLayout from './PolicyLayout';

const Privacy = () => (
  <PolicyLayout
    title="Privacy Policy"
    subtitle="How CalAI collects, uses, and protects data for AI-powered scheduling."
  >
    <h2>1. Information We Collect</h2>
    <p>
      CalAI collects account identifiers (such as email and display name), calendar metadata, and settings required
      to deliver scheduling features. Event details you create are stored with your account and shared only with
      services you explicitly connect.
    </p>

    <h2>2. How We Use Data</h2>
    <p>
      We use your data to deliver calendar functionality, improve AI scheduling accuracy, provide support, and keep
      the service secure. We do not sell personal information to third parties.
    </p>

    <h2>3. Legal Bases for Processing</h2>
    <p>
      We process data under contractual necessity (providing the service), legitimate interest (service improvement),
      and consent (optional integrations and marketing). You may withdraw consent at any time.
    </p>

    <h2>4. Cookies & Advertising</h2>
    <p>
      We use cookies for authentication, preferences, and analytics. Google AdSense may use cookies or device
      identifiers to personalize ads. You can manage ad personalization in Google Ads Settings or your browser.
    </p>

    <h2>5. Data Retention</h2>
    <p>
      We retain data while your account is active or as needed to provide services. You can request deletion, and we
      will remove or anonymize data within a reasonable timeframe unless legal obligations apply.
    </p>

    <h2>6. Your Rights</h2>
    <ul>
      <li>Access, correct, export, or delete your data.</li>
      <li>Restrict or object to processing in certain circumstances.</li>
      <li>Receive data portability where applicable.</li>
    </ul>

    <h2>7. Security</h2>
    <p>
      We use encryption in transit, secure storage for credentials, and access controls. API keys are masked in the
      UI and stored securely to reduce exposure risk.
    </p>

    <h2>8. Contact</h2>
    <p>
      For privacy requests, contact <strong>privacy@calai.app</strong> or visit our Contact page.
    </p>
  </PolicyLayout>
);

export default Privacy;
