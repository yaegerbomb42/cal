import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { logger } from '../utils/logger';
import './PolicyPages.css';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-0000000000000000';
const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT || '0000000000';
const ADSENSE_SCRIPT_ID = 'google-ads-sdk';
const ADSENSE_SCRIPT_SRC = '//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

const ensureAdsenseScript = () => {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById(ADSENSE_SCRIPT_ID);
  if (existing) return existing;

  const script = document.createElement('script');
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.src = ADSENSE_SCRIPT_SRC;
  document.body.appendChild(script);
  return script;
};

export const AdSlot = ({ className }) => {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const script = ensureAdsenseScript();

    const pushAd = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        logger.warn('Adsense failed to load', { error });
      }
    };

    if (!script) {
      return undefined;
    }

    if (script.dataset.loaded === 'true') {
      pushAd();
      return undefined;
    }

    const handleLoad = () => {
      script.dataset.loaded = 'true';
      pushAd();
    };

    script.addEventListener('load', handleLoad, { once: true });

    return () => {
      script.removeEventListener('load', handleLoad);
    };
  }, []);

  return (
    <div className={`policy-ad ${className || ''}`.trim()}>
      <ins
        className="adsbygoogle"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        style={{ display: 'block' }}
      />
    </div>
  );
};

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
