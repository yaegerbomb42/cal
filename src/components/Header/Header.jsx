import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings, Moon, Sun, Menu, ChevronLeft, ChevronRight, Send, Sparkles, Zap, Wind, User, Activity } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCalendar, CALENDAR_VIEWS } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { formatDate } from '../../utils/dateUtils';
import { geminiService } from '../../services/geminiService';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import SearchBar from '../Search/SearchBar';
import './Header.css';

const Header = ({ onOpenSettings, onOpenAI }) => {
  const [quickInput, setQuickInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { addEvent } = useEvents();
  const { theme, toggleTheme } = useTheme();
  const { currentDate, view, setView, navigateDate, goToToday, openEventModal } = useCalendar();

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
      // First, get AI's interpretation of the input
      const aiResponse = await geminiService.chatResponse(userInput, events);
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        // If it's a query or high-intent action, open the sidebar and "ping" it
        // We'll use a custom event or shared state if possible, but for now
        // onOpenAI will trigger the sidebar, and we can rely on the user seeing the result there
        // or actually, we can just open the AI chat which will see the new message
        onOpenAI();
        // The AIChat component will need to see this new interaction
        // We can dispatch a custom event that AIChat listens to
        window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text: userInput, response: aiResponse } }));
      } else {
        // If it looks like a simple event request, try parsing and adding directly
        const eventData = await geminiService.parseEventFromText(userInput, []);
        addEvent(eventData, { allowConflicts: false });
      }
    } catch (error) {
      console.error('Error processing AI command:', error);
      // Fallback: just open AI chat
      onOpenAI();
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
              placeholder="Ask AI or quick add... (e.g. 'Coffee with Sam tomorrow at 9am')"
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
          {/* Logo and Title */}
          <div className="header-left">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="logo-section"
            >
              <Calendar className="logo-icon" size={28} />
              <div className="logo-text">
                <h1>CalAI</h1>
                <span className="current-date-badge">{formatDate(new Date(), 'MMM d, yyyy')}</span>
              </div>
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
                onClick={toggleTheme}
                className="btn theme-btn"
                title={`Theme: ${theme}`}
              >
                {theme === 'modern' && <Moon size={18} />}
                {theme === 'neon' && <Sparkles size={18} style={{ color: '#00f2ff' }} />}
                {theme === 'ceo' && <User size={18} style={{ color: '#eab308' }} />}
                {theme === 'quantum' && <Zap size={18} className="animate-pulse" style={{ color: '#8b5cf6' }} />}
                {theme === 'living' && <Activity size={18} className="animate-pulse" style={{ color: '#f472b6' }} />}
                {theme === 'zen' && <Wind size={18} style={{ color: '#10b981' }} />}
                {theme === 'light' && <Sun size={18} />}
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