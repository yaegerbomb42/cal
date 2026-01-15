import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings, ChevronLeft, ChevronRight, Send, Sparkles } from 'lucide-react';
import { useCalendar, CALENDAR_VIEWS } from '../../contexts/CalendarContext';
import { formatDate } from '../../utils/dateUtils';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import SearchBar from '../Search/SearchBar';
import './Header.css';

const Header = ({ onOpenSettings, onOpenAI }) => {
  const [quickInput, setQuickInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentDate, view, setView, navigateDate, goToToday, openEventModal } = useCalendar();

  const viewButtons = [
    { key: CALENDAR_VIEWS.DAY, label: 'Day' },
    { key: CALENDAR_VIEWS.WEEK, label: 'Week' },
    { key: CALENDAR_VIEWS.MONTH, label: 'Month' }
  ];

  const getHeaderTitle = () => {
    switch (view) {
      case CALENDAR_VIEWS.DAY:
        return formatDate(currentDate, 'MMMM yyyy'); // Title checks month/year
      case CALENDAR_VIEWS.WEEK:
        return formatDate(currentDate, 'MMMM yyyy');
      case CALENDAR_VIEWS.MONTH:
        return formatDate(currentDate, 'MMMM yyyy');
      default:
        return formatDate(currentDate, 'MMMM yyyy');
    }
  };

  const getSubTitle = () => {
    if (view === CALENDAR_VIEWS.DAY) {
      return formatDate(currentDate, 'EEEE, d');
    }
    return null;
  };

  useEffect(() => {
    // Register keyboard shortcuts
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

  const handleAICommand = async (e) => {
    e.preventDefault();
    if (!quickInput.trim() || isProcessing) return;

    setIsProcessing(true);
    const userInput = quickInput.trim();
    setQuickInput('');

    try {
      onOpenAI();
      window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text: userInput } }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="header glass"
    >
      {/* Quick Event Input */}
      <div className="quick-event-bar">
        <div className="container">
          <form onSubmit={handleAICommand} className="quick-event-form">
            <Sparkles size={18} className="quick-event-icon" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Ask Cal or quick add... (e.g. 'Coffee with Sam tomorrow at 9am')"
              className="quick-event-input"
              disabled={isProcessing}
            />
            <motion.button
              type="submit"
              disabled={!quickInput.trim() || isProcessing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="quick-event-submit"
            >
              <Send size={16} />
            </motion.button>
          </form>
        </div>
      </div>

      <div className="container">
        <div className="header-content">
          {/* Logo */}
          <div className="header-left">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="logo-section"
            >
              <Calendar className="logo-icon" size={28} />
              <div className="logo-text">
                <h1>CalAI</h1>
              </div>
            </motion.div>
          </div>

          {/* Navigation Controls & Title */}
          <div className="header-center">
            <div className="date-nav-wrapper">
              <div className="nav-controls">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateDate(-1)}
                  className="btn nav-btn"
                >
                  <ChevronLeft size={20} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToToday}
                  className="btn btn-primary today-btn"
                >
                  Today
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateDate(1)}
                  className="btn nav-btn"
                >
                  <ChevronRight size={20} />
                </motion.button>
              </div>

              <div className="header-title-group">
                <h2 className="header-title">{getHeaderTitle()}</h2>
                {getSubTitle() && <span className="header-subtitle">{getSubTitle()}</span>}
              </div>
            </div>
          </div>

          {/* View Controls and Actions */}
          <div className="header-right">
            {/* View Switcher */}
            <div className="view-switcher glass">
              {viewButtons.map(({ key, label }) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView(key)}
                  className={`view - btn ${view === key ? 'active' : ''} `}
                >
                  {label}
                </motion.button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <SearchBar />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenAI}
                className="btn ai-btn logo-btn"
                title="AI Assistant"
              >
                <img src="/ai-logo.png" alt="AI" className="ai-btn-logo" />
                <span className="ai-label">AI</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenSettings}
                className="btn settings-btn"
                title="Settings"
              >
                <Settings size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
