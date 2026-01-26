import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Settings, ChevronLeft, ChevronRight, Send, Sparkles, ImagePlus } from 'lucide-react';
import { useCalendar } from '../../contexts/useCalendar';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { formatDate, formatFullDate, formatViewLabel } from '../../utils/dateUtils';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import SearchBar from '../Search/SearchBar';
import './Header.css';

const Header = ({ onOpenSettings, onOpenAI }) => {
  const [quickInput, setQuickInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const imageInputRef = useRef(null);
  const quickInputRef = useRef(null);
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
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (event.key.length !== 1) return;

      event.preventDefault();
      setQuickInput((prev) => `${prev}${event.key}`);
      quickInputRef.current?.focus();
      requestAnimationFrame(() => {
        const input = quickInputRef.current;
        if (input) {
          const end = input.value.length;
          input.setSelectionRange(end, end);
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleCalAIButtonClick = () => {
    setView(CALENDAR_VIEWS.DAY);
    goToToday();
    window.dispatchEvent(new CustomEvent('calai-navigate', { detail: { view: CALENDAR_VIEWS.DAY, date: new Date().toISOString() } }));
    onOpenAI();
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
          {/* Logo */}
          <div className="header-left">
            <MotionDiv
              whileHover={{ scale: 1.05 }}
              className="logo-section"
            >
              <Calendar className="logo-icon" size={28} />
              <div className="logo-text">
                <h1>CalAI</h1>
              </div>
            </MotionDiv>
          </div>

          {/* Navigation Controls & Title */}
          <div className="header-center">
            <div className="date-nav-wrapper">
              <div className="nav-controls">
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateDate(-1)}
                  className="btn nav-btn"
                  aria-label="Previous date"
                >
                  <ChevronLeft size={20} />
                </MotionButton>

                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateDate(1)}
                  className="btn nav-btn"
                  aria-label="Next date"
                >
                  <ChevronRight size={20} />
                </MotionButton>
              </div>

              <MotionButton
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={goToToday}
                className="btn today-cta"
                title="Jump to today"
                aria-label="Jump to today"
              >
                <Calendar size={16} />
                Today
              </MotionButton>

              <div className="header-title-group">
                <h2 className="header-title">{getHeaderTitle()}</h2>
                <p className="header-subtitle">{getViewLabel(activeViewLabel).replace(' View', '')}</p>
              </div>
            </div>
          </div>

          {/* View Controls and Actions */}
          <div className="header-right">
            <div className="view-utility-row">
              <div className="view-switch" role="tablist" aria-label="Calendar view">
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

              <form onSubmit={handleAICommand} className="quick-event-form inline">
                <Sparkles size={16} className="quick-event-icon" />
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Ask or add with Cal"
                  className="quick-event-input"
                  disabled={isProcessing}
                  ref={quickInputRef}
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
                <MotionButton
                  type="submit"
                  disabled={!quickInput.trim() || isProcessing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="quick-event-submit"
                >
                  <Send size={16} />
                </MotionButton>
              </form>
            </div>

            {/* Action Buttons */}
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
