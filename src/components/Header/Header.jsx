import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useCalendar } from '../../contexts/useCalendar';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { formatViewLabel } from '../../utils/dateUtils';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import SearchBar from '../Search/SearchBar';
import './Header.css';

const Header = ({ onOpenSettings, onOpenAI }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { currentDate, view, setView, navigateDate, goToToday, openEventModal } = useCalendar();
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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

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

  const handleCalAIButtonClick = () => {
    // User requested: "clicking the cal ai button shouldnt change from month week day or between it should maintain the current view"
    // Previously: setView(CALENDAR_VIEWS.DAY); goToToday();
    // Now: Just open AI
    onOpenAI();
    window.dispatchEvent(new CustomEvent('calai-navigate', { detail: { view, date: currentDate.toISOString() } }));
  };

  const activeViewLabel = viewButtons.find((item) => item.key === view)?.label || 'Day';

  return (
    <MotionHeader
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="header glass"
    >
      <div className="container">
        <div className="header-content">
          {/* Left: Logo, Time, Date */}
          <div className="header-left">
            <MotionDiv
              whileHover={{ scale: 1.05 }}
              className="logo-section"
            >
              <Calendar className="logo-icon" size={24} />
              <div className="logo-text">
                <h1>CalAI</h1>
                <div className="header-datetime">
                  <span className="current-time">{format(currentTime, 'h:mm a')}</span>
                  <span className="current-date">{format(currentTime, 'EEE, MMM d')}</span>
                </div>
              </div>
            </MotionDiv>
          </div>

          {/* Center: Navigation Controls (Arrows + Today) */}
          <div className="header-center">
            <div className="nav-controls">
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateDate(-1)}
                className="btn nav-btn"
                aria-label="Previous date"
              >
                <ChevronLeft size={18} />
              </MotionButton>

              <MotionButton
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={goToToday}
                className="btn today-cta"
                title="Jump to today"
              >
                Today
              </MotionButton>

              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateDate(1)}
                className="btn nav-btn"
                aria-label="Next date"
              >
                <ChevronRight size={18} />
              </MotionButton>
            </div>
          </div>

          {/* Right: View Switcher & Actions (No AI Input here anymore) */}
          <div className="header-right">
            <div className="view-switch" role="tablist">
              {viewButtons.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  className={`view-switch-btn ${view === key ? 'active' : ''}`}
                  onClick={() => setView(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="action-buttons">
              <SearchBar />

              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCalAIButtonClick}
                className="btn ai-btn logo-btn"
                title="AI Assistant"
              >
                <span className="ai-label">Cal AI</span>
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
      </div>
    </MotionHeader>
  );
};

export default Header;
