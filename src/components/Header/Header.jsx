import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings, ChevronLeft, ChevronRight, Send, Sparkles, ImagePlus, ChevronDown } from 'lucide-react';
import { useCalendar, CALENDAR_VIEWS } from '../../contexts/CalendarContext';
import { formatDate, formatFullDate, formatViewLabel } from '../../utils/dateUtils';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import SearchBar from '../Search/SearchBar';
import './Header.css';

const Header = ({ onOpenSettings, onOpenAI }) => {
  const [quickInput, setQuickInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const imageInputRef = useRef(null);
  const viewMenuRef = useRef(null);
  const { currentDate, view, setView, navigateDate, goToToday, openEventModal } = useCalendar();

  const viewButtons = [
    { key: CALENDAR_VIEWS.DAY, label: 'Day' },
    { key: CALENDAR_VIEWS.WEEK, label: 'Week' },
    { key: CALENDAR_VIEWS.MONTH, label: 'Month' },
    { key: CALENDAR_VIEWS.YEAR, label: 'Year' }
  ];

  const getHeaderTitle = () => {
    switch (view) {
      case CALENDAR_VIEWS.YEAR:
        return formatDate(currentDate, 'yyyy');
      case CALENDAR_VIEWS.MONTH:
        return formatDate(currentDate, 'MMMM yyyy');
      default:
        return formatFullDate(currentDate);
    }
  };

  const getViewLabel = (viewName) => {
    return formatViewLabel(currentDate, viewName);
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

  useEffect(() => {
    if (!isViewMenuOpen) return;
    const handleClickOutside = (event) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) {
        setIsViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isViewMenuOpen]);

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

  const handleQuickImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    onOpenAI();
    window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
    event.target.value = '';
  };

  const activeViewLabel = viewButtons.find((item) => item.key === view)?.label || 'View';

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="header glass"
    >
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
                  aria-label="Previous date"
                >
                  <ChevronLeft size={20} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToToday}
                  className="btn icon-link today-btn"
                  title="Jump to today"
                  aria-label="Jump to today"
                >
                  <Calendar size={18} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateDate(1)}
                  className="btn nav-btn"
                  aria-label="Next date"
                >
                  <ChevronRight size={20} />
                </motion.button>
              </div>

              <div className="header-title-group">
                <h2 className="header-title">{getHeaderTitle()}</h2>
              </div>
            </div>
          </div>

          {/* View Controls and Actions */}
          <div className="header-right">
            <div className="view-utility-row">
              <div className="view-dropdown" ref={viewMenuRef}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsViewMenuOpen((prev) => !prev)}
                  className="view-dropdown-trigger glass"
                  aria-haspopup="listbox"
                  aria-expanded={isViewMenuOpen}
                >
                  <div className="view-dropdown-label">
                    <span className="view-dropdown-title">{getViewLabel(activeViewLabel)}</span>
                    <span className="view-dropdown-subtitle">Select view</span>
                  </div>
                  <ChevronDown size={16} className={isViewMenuOpen ? 'rotate' : ''} />
                </motion.button>
                {isViewMenuOpen && (
                  <div className="view-dropdown-menu glass" role="listbox">
                    {viewButtons.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        role="option"
                        aria-selected={view === key}
                        className={`view-dropdown-option ${view === key ? 'active' : ''}`}
                        onClick={() => {
                          setView(key);
                          setIsViewMenuOpen(false);
                        }}
                      >
                        <span className="option-title">{label} View</span>
                        <span className="option-subtitle">{getViewLabel(label)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAICommand} className="quick-event-form inline">
                <Sparkles size={16} className="quick-event-icon" />
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Ask or add with Cal"
                  className="quick-event-input"
                  disabled={isProcessing}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleQuickImageUpload}
                  className="quick-event-image-input"
                />
                <button
                  type="button"
                  className="quick-event-image-btn"
                  onClick={() => imageInputRef.current?.click()}
                  title="Upload event image"
                >
                  <ImagePlus size={16} />
                </button>
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
                <span className="ai-label">Cal AI</span>
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
