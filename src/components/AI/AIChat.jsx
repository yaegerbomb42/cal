import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, X, Sparkles } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { useEvents } from '../../contexts/EventsContext';
import { useCalendar } from '../../contexts/CalendarContext';
import { parseNaturalLanguageDate, parseNaturalLanguageTime } from '../../utils/dateUtils';
import './AIChat.css';

const AIChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm your AI calendar assistant. I can help you create events, check for conflicts, and manage your schedule. Try saying something like 'Schedule a meeting tomorrow at 2 PM' or 'What do I have next week?'"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const { events, addEvent } = useEvents();
  const { openEventModal } = useCalendar();

  useEffect(() => {
    // Check if Gemini is initialized
    const apiKey = localStorage.getItem('gemini-api-key');
    if (apiKey && geminiService.initialize(apiKey)) {
      setIsConnected(true);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleEventCreation = async (userMessage) => {
    try {
      const eventData = await geminiService.parseEventFromText(userMessage, events);
      
      // Check for conflicts
      const conflicts = await geminiService.checkConflicts(eventData, events);
      
      if (conflicts.length > 0) {
        addMessage('ai', `I found some scheduling conflicts. Here are some alternative times:\n\n${conflicts.map((alt, idx) => 
          `${idx + 1}. ${new Date(alt.start).toLocaleString()} - ${alt.reason}`
        ).join('\n')}\n\nWould you like me to create the event anyway or use one of these alternatives?`);
        return;
      }

      // Create the event
      const newEvent = addEvent(eventData);
      addMessage('ai', `Great! I've created your event "${eventData.title}" for ${new Date(eventData.start).toLocaleString()}. You can edit it by clicking on it in the calendar.`);
      
    } catch (error) {
      if (error.message.includes('Insufficient information')) {
        addMessage('ai', "I need more information to create this event. Could you please specify at least a title and time? For example: 'Schedule a team meeting tomorrow at 3 PM'");
      } else {
        addMessage('ai', "I had trouble creating that event. Could you try rephrasing it? For example: 'Schedule a doctor appointment next Friday at 10 AM'");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (!isConnected) {
      addMessage('ai', "I need a Gemini API key to help you. Please add your API key in the settings panel.");
      return;
    }

    const userMessage = inputValue.trim();
    addMessage('user', userMessage);
    setInputValue('');
    setIsLoading(true);

    try {
      // Check if the message is about creating an event
      const eventKeywords = ['schedule', 'create', 'add', 'book', 'appointment', 'meeting', 'reminder', 'event'];
      const isEventRequest = eventKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );

      if (isEventRequest) {
        await handleEventCreation(userMessage);
      } else {
        // General chat response
        const response = await geminiService.chatResponse(userMessage, events);
        addMessage('ai', response);
      }
    } catch (error) {
      addMessage('ai', "I'm having trouble responding right now. Please make sure your API key is valid and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    "Schedule a meeting tomorrow at 2 PM",
    "What do I have today?",
    "Create a reminder for next week",
    "Check for conflicts this afternoon"
  ];

  const handleQuickAction = (action) => {
    setInputValue(action);
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
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="ai-chat-modal glass-card"
        >
          <div className="chat-header">
            <div className="chat-title">
              <Sparkles className="ai-icon" size={20} />
              <h3>AI Assistant</h3>
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </div>
            </div>
            <button onClick={onClose} className="close-btn">
              <X size={20} />
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
                <div className="message-avatar">
                  {message.type === 'ai' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="message-content">
                  <p>{message.content}</p>
                  {message.timestamp && (
                    <span className="message-time">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="message ai"
              >
                <div className="message-avatar">
                  <Bot size={16} />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="quick-actions">
              <p className="quick-actions-title">Try these suggestions:</p>
              <div className="quick-action-buttons">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleQuickAction(action)}
                    className="quick-action-btn"
                  >
                    {action}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="chat-input-form">
            <div className="input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isConnected ? "Ask me about your calendar..." : "API key required in settings"}
                className="chat-input"
                disabled={!isConnected || isLoading}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!inputValue.trim() || !isConnected || isLoading}
                className="send-btn"
              >
                <Send size={18} />
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIChat;