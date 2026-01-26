import PolicyLayout from './PolicyLayout';

const Terms = () => (
  <PolicyLayout
    title="Terms of Service"
    subtitle="Rules for using CalAI, including acceptable use and account responsibilities."
  >
    <h2>1. Account Responsibilities</h2>
    <p>
      You are responsible for maintaining the confidentiality of your credentials and for all activity under your
      account. Notify us promptly if you suspect unauthorized access.
    </p>

    <h2>2. Acceptable Use</h2>
    <p>
      You agree not to misuse the service, attempt to disrupt infrastructure, or upload unlawful content. We may
      suspend accounts that violate these standards.
    </p>

    <h2>3. AI Features</h2>
    <p>
      AI-generated suggestions are provided as scheduling assistance. You remain responsible for confirming event
      details, attendees, and commitments created through the assistant.
    </p>

    <h2>4. Integrations</h2>
    <p>
      When you connect third-party services (such as Google Calendar), you authorize CalAI to access the minimum
      scopes required to sync schedules. You can revoke access at any time through the provider or your settings.
    </p>

    <h2>5. Intellectual Property</h2>
    <p>
      CalAI and its branding are protected by applicable intellectual property laws. You may not copy, distribute,
      or reverse engineer any part of the service without permission.
    </p>

    <h2>6. Disclaimers</h2>
    <p>
      CalAI is provided on an “as is” and “as available” basis. We do not guarantee uninterrupted availability and
      are not liable for indirect or consequential damages, to the extent permitted by law.
    </p>

    <h2>7. Termination</h2>
    <p>
      You may stop using CalAI at any time. We may terminate or suspend accounts for violations of these terms or to
      protect platform integrity.
    </p>
  </PolicyLayout>
);

export default Terms;
