import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, ChevronLeft, ChevronRight, MousePointerClick, Download } from 'lucide-react';
import { useCalendar } from '../../contexts/useCalendar';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import './Header.css';

const Header = ({ onOpenSettings, isZoomNavEnabled, onToggleZoomNav }) => {
  const { view, setView, goToToday, openEventModal, navigateDate } = useCalendar();
  const MotionHeader = motion.header;
  const MotionButton = motion.button;

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const viewButtons = [
    { key: CALENDAR_VIEWS.DAY, label: 'Day' },
    { key: CALENDAR_VIEWS.WEEK, label: 'Week' },
    { key: CALENDAR_VIEWS.MONTH, label: 'Month' },
    { key: CALENDAR_VIEWS.YEAR, label: 'Year' }
  ];

  useEffect(() => {
    const unregisterN = registerShortcut('n', () => {
      openEventModal();
    }, { ctrl: true });

    const unregisterT = registerShortcut('t', () => {
      goToToday();
    }, { ctrl: true });

    return () => {
      unregisterN();
      unregisterT();
    };
  }, [openEventModal, goToToday]);

  return (
    <MotionHeader
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="header glass"
    >
      <div className="container" style={{ maxWidth: '100%', padding: '0 16px' }}>
        <div className="header-content">
          {/* Left: Logo (Home Button) */}
          <div className="header-left">
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              className="logo-section"
              onClick={goToToday}
              title="Return to Today"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <img src="/logo.png" alt="CalAI" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <div className="logo-text">
                <h1 style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.5px' }}>CalAI</h1>
              </div>
            </MotionButton>
          </div>

          {/* Center: Navigation Controls */}
          <div className="header-center" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="nav-arrows" style={{ display: 'flex', gap: '4px' }}>
              <button className="nav-btn icon-only" onClick={() => navigateDate(-1)} style={{ borderRadius: '8px' }}><ChevronLeft size={18} /></button>
              <button className="nav-btn today-btn" onClick={goToToday} style={{ padding: '4px 12px', fontSize: '0.85rem', fontWeight: '500' }}>Today</button>
              <button className="nav-btn icon-only" onClick={() => navigateDate(1)} style={{ borderRadius: '8px' }}><ChevronRight size={18} /></button>
            </div>
          </div>

          {/* Right: View Selector & Settings */}
          <div className="header-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Download/Install Button */}
            {deferredPrompt && (
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleInstallClick}
                className="btn glass-btn"
                title="Download Standalone App"
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 59, 48, 0.15)',
                  border: '1px solid rgba(255, 59, 48, 0.3)',
                  color: '#FF3B30',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <Download size={16} />
                <span>Download App</span>
              </MotionButton>
            )}

            {/* Zoom Nav Toggle */}
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleZoomNav}
              className={`btn icon-only glass-btn ${isZoomNavEnabled ? 'active-nav-toggle' : ''}`}
              style={{
                background: isZoomNavEnabled ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                color: isZoomNavEnabled ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title={isZoomNavEnabled ? "Zoom Nav ON (Use Arrow Keys)" : "Zoom Nav OFF"}
            >
              <MousePointerClick size={16} />
            </MotionButton>

            <div className="view-selector glass-panel" style={{ background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '10px' }}>
              {viewButtons.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`view-btn ${view === key ? 'active' : ''}`}
                  style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                >
                  {label}
                </button>
              ))}
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenSettings}
              className="btn settings-btn icon-only"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Settings"
            >
              <Settings size={18} />
            </MotionButton>
          </div>
        </div>
      </div>
    </MotionHeader>
  );
};

export default Header;
