import PolicyLayout from './PolicyLayout';

const Contact = () => (
  <PolicyLayout
    title="Contact"
    subtitle="Reach CalAI for support, privacy requests, or business inquiries."
  >
    <h2>Support</h2>
    <p>
      Email <strong>support@calai.app</strong> for product questions, billing, or technical help. We aim to respond
      within two business days.
    </p>

    <h2>Privacy & GDPR Requests</h2>
    <p>
      For data access, deletion, or portability requests, email <strong>privacy@calai.app</strong>. Please include
      the email associated with your account for verification.
    </p>

    <h2>Business & Partnerships</h2>
    <p>
      Reach out to <strong>partners@calai.app</strong> for integrations, calendar partnerships, or enterprise plans.
    </p>

    <h2>Office Hours</h2>
    <p>
      Monday–Friday, 9:00 AM–6:00 PM Pacific Time. We monitor urgent issues outside these hours when possible.
    </p>
  </PolicyLayout>
);

export default Contact;
