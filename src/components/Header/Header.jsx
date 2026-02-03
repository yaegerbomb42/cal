import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendar } from '../../contexts/useCalendar';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import './Header.css';

const Header = ({ onOpenSettings }) => {
  const { view, setView, goToToday, openEventModal, navigateDate } = useCalendar();
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
            <button className="nav-today-btn-header" onClick={goToToday}>Today</button>
            <div className="nav-arrows" style={{ display: 'flex', gap: '2px' }}>
              <button className="nav-btn icon-only" onClick={() => navigateDate(-1)}><ChevronLeft size={16} /></button>
              <button className="nav-btn icon-only" onClick={() => navigateDate(1)}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Right: View Dropdown & Settings */}
          <div className="header-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="view-dropdown-wrapper">
              <select
                value={view}
                onChange={(e) => setView(e.target.value)}
                className="view-select-dropdown"
              >
                {viewButtons.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

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
