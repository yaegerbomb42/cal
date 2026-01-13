import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, X, Sparkles, Calendar, Check, Edit2, Trash2 } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { useEvents } from '../../contexts/EventsContext';
import './AIChat.css';

const AIChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello. I'm your calendar assistant. Paste an email, message, or simply type a request to schedule an event."
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);

  const messagesEndRef = useRef(null);
  const { events, addEvent } = useEvents();

  useEffect(() => {
    if (geminiService.isInitialized) {
      setIsConnected(true);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingEvent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (type, content) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const processInput = async (text) => {
    setIsLoading(true);
    try {
      // First, check if this looks like an event request
      const eventKeywords = ['schedule', 'create', 'add', 'book', 'appointment', 'meeting', 'reminder', 'event', 'tomorrow', 'next week', 'at'];
      const isEventRequest = eventKeywords.some(keyword => text.toLowerCase().includes(keyword)) || text.length > 20; // Assume longer text might be "paste" content

      if (isEventRequest) {
        // Try to parse it
        try {
          const eventData = await geminiService.parseEventFromText(text, events);

          // Check for conflicts
          const conflicts = await geminiService.checkConflicts(eventData, events);

          setPendingEvent({
            ...eventData,
            conflicts,
            originalText: text
          });

          addMessage('ai', "I've drafted this event for you. Does it look correct?");
        } catch (error) {
          // Fallback to chat if parsing fails but it seemed like an event
          const response = await geminiService.chatResponse(text, events);
          addMessage('ai', response);
        }
      } else {
        // General chat
        const response = await geminiService.chatResponse(text, events);
        addMessage('ai', response);
      }
    } catch (error) {
      addMessage('ai', "I encountered an error processing your request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmEvent = () => {
    if (!pendingEvent) return;

    addEvent(pendingEvent);
    addMessage('ai', `Confirmed. "${pendingEvent.title}" has been added to your calendar.`);
    setPendingEvent(null);
  };

  const handleDiscardEvent = () => {
    setPendingEvent(null);
    addMessage('ai', "Cancelled. What would you like to do instead?");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const text = inputValue.trim();
    setInputValue('');
    addMessage('user', text);

    await processInput(text);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ai-chat-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="ai-chat-sidebar glass-card"
        >
          <div className="chat-header">
            <div className="chat-title">
              <Sparkles className="ai-icon" size={18} />
              <h3>Assistant</h3>
            </div>
            <button onClick={onClose} className="close-btn">
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`message ${message.type}`}
              >
                <div className="message-content">
                  <p>{message.content}</p>
                </div>
              </motion.div>
            ))}

            {pendingEvent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="event-confirmation-card glass-card"
              >
                <div className="event-card-header">
                  <Calendar size={16} />
                  <span>New Event</span>
                </div>
                <h4>{pendingEvent.title}</h4>
                <p className="event-time">
                  {new Date(pendingEvent.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                {pendingEvent.description && <p className="event-desc">{pendingEvent.description}</p>}

                {pendingEvent.conflicts && pendingEvent.conflicts.length > 0 && (
                  <div className="conflict-warning">
                    ⚠️ {pendingEvent.conflicts.length} conflict(s) found
                  </div>
                )}

                <div className="event-card-actions">
                  <button onClick={handleDiscardEvent} className="btn-icon danger">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={handleConfirmEvent} className="btn-primary w-full">
                    <Check size={16} /> Add Event
                  </button>
                </div>
              </motion.div>
            )}

            {isLoading && (
              <div className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="chat-input-wrapper">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type or paste event details..."
              className="chat-input-field"
              autoFocus
            />
            <button type="submit" disabled={!inputValue.trim() || isLoading} className="chat-send-btn">
              <Send size={16} />
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIChat;