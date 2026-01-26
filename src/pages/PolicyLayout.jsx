import { Link } from 'react-router-dom';
import ReactGoogleAdsense from 'react-google-adsense';
import './PolicyPages.css';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-0000000000000000';
const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT || '0000000000';

export const AdSlot = ({ className }) => (
  <div className={`policy-ad ${className || ''}`.trim()}>
    <ReactGoogleAdsense
      client={ADSENSE_CLIENT}
      slot={ADSENSE_SLOT}
      style={{ display: 'block' }}
      format="auto"
    />
  </div>
);

const PolicyLayout = ({ title, subtitle, children }) => (
  <div className="policy-page">
    <header className="policy-header">
      <Link to="/" className="policy-logo">CalAI</Link>
      <nav className="policy-nav">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/contact">Contact</Link>
      </nav>
    </header>

    <main className="policy-main">
      <section className="policy-hero">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>

      <AdSlot className="policy-ad--top" />

      <section className="policy-card">
        {children}
      </section>

      <AdSlot className="policy-ad--bottom" />
    </main>

    <footer className="policy-footer">
      <p>© {new Date().getFullYear()} CalAI. Built for AI-powered scheduling.</p>
    </footer>
  </div>
);

export default PolicyLayout;
