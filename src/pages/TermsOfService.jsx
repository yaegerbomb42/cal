import PolicyLayout from './PolicyLayout';

const TermsOfService = () => (
  <PolicyLayout
    title="Terms of Service"
    subtitle="The rules that govern use of CalAI, including acceptable use and account responsibilities."
  >
    <h2>1. Account Responsibilities</h2>
    <p>
      You are responsible for maintaining the confidentiality of your account credentials and for all activities
      performed under your account. Notify us promptly if you suspect unauthorized access.
    </p>

    <h2>2. Acceptable Use</h2>
    <p>
      You agree not to misuse the service, attempt to disrupt infrastructure, or upload unlawful content. CalAI
      reserves the right to suspend accounts that violate these standards.
    </p>

    <h2>3. AI Features</h2>
    <p>
      AI-generated insights are provided as scheduling assistance. You remain responsible for verifying event
      accuracy, attendee details, and any external commitments created via the assistant.
    </p>

    <h2>4. Integrations</h2>
    <p>
      When you connect external services (such as Google Calendar), you authorize CalAI to access only the scopes
      required to sync schedules. You can revoke access at any time via the provider or your settings.
    </p>

    <h2>5. Intellectual Property</h2>
    <p>
      CalAI and its branding are protected by applicable intellectual property laws. You may not copy, distribute,
      or reverse engineer any part of the service without written permission.
    </p>

    <h2>6. Disclaimer & Liability</h2>
    <p>
      CalAI is provided on an “as is” basis. We are not liable for indirect or consequential damages arising from
      use of the service, to the extent permitted by law.
    </p>

    <h2>7. Termination</h2>
    <p>
      You may stop using CalAI at any time. We may terminate or suspend accounts for violations of these terms or
      to protect platform integrity.
    </p>
  </PolicyLayout>
);

export default TermsOfService;
