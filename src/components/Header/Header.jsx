import { motion } from 'framer-motion';
import { Calendar, Settings, Moon, Sun, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCalendar, CALENDAR_VIEWS } from '../../contexts/CalendarContext';
import { formatDate } from '../../utils/dateUtils';
import './Header.css';

const Header = ({ onOpenSettings, onOpenAI }) => {
  const { isDark, toggleTheme } = useTheme();
  const { currentDate, view, setView, navigateDate, goToToday } = useCalendar();

  const viewButtons = [
    { key: CALENDAR_VIEWS.DAY, label: 'Day' },
    { key: CALENDAR_VIEWS.WEEK, label: 'Week' },
    { key: CALENDAR_VIEWS.MONTH, label: 'Month' }
  ];

  const getHeaderTitle = () => {
    switch (view) {
      case CALENDAR_VIEWS.DAY:
        return formatDate(currentDate, 'EEEE, MMMM d, yyyy');
      case CALENDAR_VIEWS.WEEK:
        return formatDate(currentDate, 'MMMM yyyy');
      case CALENDAR_VIEWS.MONTH:
        return formatDate(currentDate, 'MMMM yyyy');
      default:
        return formatDate(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="header glass"
    >
      <div className="container">
        <div className="header-content">
          {/* Logo and Title */}
          <div className="header-left">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="logo-section"
            >
              <Calendar className="logo-icon" size={28} />
              <h1>CalAI</h1>
            </motion.div>
          </div>

          {/* Navigation Controls */}
          <div className="header-center">
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

            <h2 className="header-title">{getHeaderTitle()}</h2>
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
                  className={`view-btn ${view === key ? 'active' : ''}`}
                >
                  {label}
                </motion.button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenAI}
                className="btn ai-btn"
                title="AI Assistant"
              >
                <span className="ai-icon">🤖</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="btn theme-btn"
                title="Toggle Theme"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
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