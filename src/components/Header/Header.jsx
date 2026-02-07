import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, ChevronLeft, ChevronRight, MousePointerClick, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useCalendar } from '../../contexts/useCalendar';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import LiveClock from './LiveClock';
import DateNavigator from './DateNavigator';
import './Header.css';

const Header = ({ onOpenSettings }) => {
  const { view, setView, goToToday, openEventModal, navigateDate, isZoomMode, setIsZoomMode } = useCalendar();
  const MotionHeader = motion.header;
  const MotionButton = motion.button;

  /* Installation logic removed per user request */


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
              <img src="/logo.png?v=fixed" alt="CalAI" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
              <div className="logo-text">
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px' }}>CalAI</h1>
                <span style={{ fontSize: '9px', opacity: 0.5, marginLeft: 4 }}>HOME / TODAY</span>
              </div>
            </MotionButton>
          </div>

          <div className="header-center" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DateNavigator />
          </div>

          {/* Right: View Selector & Settings */}
          <div className="header-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Download/Install Button */}
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openEventModal({ start: new Date() })}
              className="btn btn-primary glass-btn"
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0 12px',
                height: '32px',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
              title="Create New Event (Ctrl+N)"
            >
              <Plus size={16} />
              <span>New</span>
            </MotionButton>
            <LiveClock />
            {/* Zoom Nav Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsZoomMode(!isZoomMode)}
                className={`btn icon-only glass-btn ${isZoomMode ? 'active-nav-toggle' : ''}`}
                style={{
                  background: isZoomMode ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  color: isZoomMode ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  width: 'auto',
                  padding: '0 8px',
                  height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title={isZoomMode ? "Zoom Nav ON (Use Arrow Keys)" : "Zoom Nav OFF"}
              >
                <MousePointerClick size={16} />
                <span style={{ fontSize: '10px', fontWeight: '700', marginLeft: '4px' }}>ZOOM</span>
              </MotionButton>

              {isZoomMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <button onClick={() => {
                    const viewOrder = [CALENDAR_VIEWS.DAY, CALENDAR_VIEWS.WEEK, CALENDAR_VIEWS.MONTH, CALENDAR_VIEWS.YEAR];
                    const idx = viewOrder.indexOf(view);
                    if (idx < 3) setView(viewOrder[idx + 1]);
                  }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}><ArrowUp size={12} /></button>
                  <button onClick={() => {
                    const viewOrder = [CALENDAR_VIEWS.DAY, CALENDAR_VIEWS.WEEK, CALENDAR_VIEWS.MONTH, CALENDAR_VIEWS.YEAR];
                    const idx = viewOrder.indexOf(view);
                    if (idx > 0) setView(viewOrder[idx - 1]);
                  }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}><ArrowDown size={12} /></button>
                </div>
              )}
            </div>

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
