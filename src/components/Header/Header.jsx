import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings, ChevronLeft, ChevronRight, MousePointerClick, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useCalendar } from '../../contexts/useCalendar';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import './Header.css';

const Header = ({ onOpenSettings, isZoomNavEnabled, onToggleZoomNav }) => {
  const { view, setView, goToToday, openEventModal, navigateDate } = useCalendar();
  const { toggleTheme, isDark } = useTheme();
  const MotionHeader = motion.header;
  const MotionDiv = motion.div;
  const MotionButton = motion.button;

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
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Calendar className="logo-icon" size={20} />
              <div className="logo-text">
                <h1>CalAI</h1>
              </div>
            </MotionButton>
          </div>

          {/* Center: Navigation Controls */}
          <div className="header-center" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="nav-arrows" style={{ display: 'flex', gap: '2px' }}>
              <button className="nav-btn icon-only" onClick={() => navigateDate(-1)}><ChevronLeft size={16} /></button>
              <button className="nav-btn icon-only" onClick={() => navigateDate(1)}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Right: View Selector & Settings */}
          <div className="header-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

            <div className="view-selector glass-panel">
              {viewButtons.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`view-btn ${view === key ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="btn icon-only glass-btn"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
                color: isDark ? '#fbbf24' : '#64748b'
              }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </MotionButton>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenSettings}
              className="btn settings-btn"
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
