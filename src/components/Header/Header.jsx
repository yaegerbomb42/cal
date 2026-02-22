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
      <div className="container" style={{ maxWidth: '100%', padding: '0 16px' }}>
        <div className="header-content">
          {/* Left: Logo (Home Button) & AI Chat */}
          <div className="header-left">
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              className="logo-section"
              onClick={goToToday}
              title="Return to Today"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', position: 'relative', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalCharacter emotion="idle" isTalking={false} size="mini" />
              </div>
              <div className="logo-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <h1 style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.5px', margin: 0, lineHeight: 1 }}>CalAI</h1>
                <span style={{ fontSize: '8px', opacity: 0.5, letterSpacing: '0.5px', marginTop: '2px' }}>HOME / TODAY</span>
              </div>
            </MotionButton>

            {/* Current Time Display (Moved from right) */}
            <LiveClock />

            {/* AI Chat Input - Restored */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '0px' }}>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenAIChat}
                className="btn glass-btn"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
                title="Open AI Chat Sidebar"
              >
                <Sparkles size={16} />
              </MotionButton>
              <div style={{ width: '320px' }}>
                <AIChatInput
                  onSubmit={handleAIChatSubmit}
                  compact={true}
                  hideCharacter={true}
                />
              </div>
            </div>
          </div>

          <div className="header-center" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DateNavigator />
          </div>

          {/* Right: View Selector & Settings */}
          <div className="header-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* New Event Button */}
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
