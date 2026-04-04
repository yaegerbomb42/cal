import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, ChevronLeft, ChevronRight, MousePointerClick, ArrowUp, ArrowDown, Plus, Sparkles } from 'lucide-react';
import { useCalendar } from '../../contexts/useCalendar';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { registerShortcut } from '../../utils/keyboardShortcuts';
import LiveClock from './LiveClock';
import DateNavigator from './DateNavigator';
import AIChatInput from '../UI/AIChatInput';
import CalCharacter from '../AI/CalCharacter';
import './Header.css';

const Header = ({ onOpenSettings, onOpenAIChat }) => {
  const { view, setView, goToToday, openEventModal } = useCalendar();
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

  const handleAIChatSubmit = ({ text, files }) => {
    if (text) window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text } }));
    if (files?.length) window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
    window.dispatchEvent(new CustomEvent('calai-open'));
  };

  return (
    <MotionHeader
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="header glass"
    >
      <div className="container" style={{ maxWidth: '100%', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* ROW 1: TOP LEVEL NAV */}
        <div className="header-row top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '16px' }}>
          
          {/* Top Left: Logo */}
          <div className="header-item-left" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={goToToday}
              title="Return to Today"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalCharacter emotion="happy" isTalking={false} size="mini" />
              </div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '-0.5px', margin: 0, color: 'var(--text-primary)' }}>CalAI</h1>
            </MotionButton>
          </div>

          {/* Top Center: AI Search */}
          <div className="header-item-center" style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center', maxWidth: '600px', minWidth: '200px' }}>
            <div style={{ width: '100%' }}>
              <AIChatInput
                onSubmit={handleAIChatSubmit}
                compact={true}
                hideCharacter={true}
              />
            </div>
          </div>

          {/* Top Right: Core Actions */}
          <div className="header-item-right" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openEventModal({ start: new Date() })}
              className="btn header-new-btn"
              title="Create New Event (Ctrl+N)"
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Plus size={16} />
              <span className="btn-text" style={{ marginLeft: '4px' }}>New</span>
            </MotionButton>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenSettings}
              className="settings-btn"
              title="Settings"
            >
              <Settings size={18} />
            </MotionButton>
          </div>

        </div>

        {/* ROW 2: BOTTOM LEVEL CONTEXT */}
        <div className="header-row bottom-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '16px', paddingLeft: '40px' }}>
          
          {/* Bottom Left: Time Context */}
          <div className="header-item-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <DateNavigator />
            <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>
              <LiveClock />
            </div>
          </div>

          {/* Bottom Right: Layout Context */}
          <div className="header-item-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="view-selector">
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

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenAIChat}
              className="btn header-chat-btn"
              title="Open AI Chat Sidebar"
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Sparkles size={14} />
              <span className="btn-text" style={{ marginLeft: '4px' }}>Chat Engine</span>
            </MotionButton>
          </div>

        </div>

      </div>
    </MotionHeader>
  );
};

export default Header;
