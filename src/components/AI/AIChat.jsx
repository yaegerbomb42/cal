import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, Calendar, Check, Edit2, Trash2, AlertTriangle, ImagePlus } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { localBrainService } from '../../services/localBrainService';
import { useEvents } from '../../contexts/useEvents';
import { useCalendar } from '../../contexts/useCalendar';
import { detectIntent } from '../../services/aiIntentService';
import { buildQueryResponse } from '../../services/aiQueryService';
import { finalizeDraft } from '../../services/aiEventService';
import { applyClarificationAnswer, getClarificationPrompt, listClarificationFields, processEventInput } from '../../ai/AiProcessor';
import { sanitizeAIOutput } from '../../ai/OutputSanitizer';
import { AIParseError, AIServiceError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import './AIChat.css';

const AIChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hey! I’m Cal — short for calendar. Tell me what you need scheduled, and I’ll draft it for you."
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);
  const [imageDrafts, setImageDrafts] = useState([]);
  const [clarificationState, setClarificationState] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);

  const MotionDiv = motion.div;
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const { events, addEvent, deleteEventsByCategory } = useEvents();
  const { openEventModal } = useCalendar();

  useEffect(() => {
    if (geminiService.isInitialized) {
      setIsConnected(true);
    }

    const handlePing = (e) => {
      const { text, response } = e.detail;
      addMessage('user', text);
      if (response) {
        handleAIResponse(response);
        return;
      }
      processInput(text);
    };

    window.addEventListener('calai-ping', handlePing);
    return () => window.removeEventListener('calai-ping', handlePing);
  }, [events]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingEvent, clarificationState]);

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

  const setStatus = (type, message) => {
    if (!type) {
      setStatusMessage(null);
      return;
    }
    setStatusMessage({ type, message });
  };

  const processClarification = async (text) => {
    if (!clarificationState) return;
    const { draft, missingFields } = clarificationState;
    const currentField = missingFields[0];

    const updatedDraft = applyClarificationAnswer(draft, currentField, text);
    const remainingFields = listClarificationFields(updatedDraft, text);

    if (remainingFields.length > 0) {
      const nextField = remainingFields[0];
      setClarificationState({ draft: updatedDraft, missingFields: remainingFields });
      addMessage('ai', getClarificationPrompt(nextField, { draft: updatedDraft }));
      return;
    }

    const finalized = finalizeDraft(updatedDraft);
    const conflicts = await geminiService.checkConflicts(finalized, events);
    setPendingEvent({ ...finalized, conflicts, originalText: text });
    setClarificationState(null);
    addMessage('ai', "I've got everything I need. Does this event look right?");
  };

  const processInput = async (text) => {
    setIsLoading(true);
    setStatus(null, null);

    try {
      if (clarificationState) {
        await processClarification(text);
        return;
      }

      const intent = detectIntent(text);
      logger.info('AI intent detected', { intent });

      if (intent === 'event_query') {
        const response = buildQueryResponse(text, events);
        addMessage('ai', response);
        return;
      }

      if (intent === 'event_create') {
        const draftResult = await processEventInput(text, { geminiService, localBrainService });

        if (draftResult.status === 'needs_clarification') {
          setClarificationState({ draft: draftResult.draft, missingFields: draftResult.missingFields });
          addMessage('ai', getClarificationPrompt(draftResult.missingFields[0], { draft: draftResult.draft }));
          return;
        }

        const finalized = finalizeDraft(draftResult.draft);
        const conflicts = await geminiService.checkConflicts(finalized, events);
        setPendingEvent({ ...finalized, conflicts, originalText: text });
        addMessage('ai', "I've drafted this event for you. Does it look correct?");
        return;
      }

      const response = await geminiService.chatResponse(text, events);
      handleAIResponse(sanitizeAIOutput(response, { input: text }));
    } catch (error) {
      if (error instanceof AIParseError) {
        addMessage('ai', "I couldn't parse that event yet. Could you rephrase with a time or date?");
        return;
      }
      if (error instanceof AIServiceError) {
        addMessage('ai', error.message);
        return;
      }
      if (error instanceof ValidationError) {
        addMessage('ai', error.message);
        return;
      }
      logger.error('AI processing error', { error });
      addMessage('ai', 'I encountered an error processing your request. Please try again.');
      setStatus('error', 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIResponse = (response) => {
    try {
      const cleanedResponse = sanitizeAIOutput(response);
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.type === 'action' && data.intent === 'delete_category' && data.category) {
          addMessage('ai', data.answer || `Checking for ${data.category} events to delete...`);
          setTimeout(() => deleteEventsByCategory(data.category), 500);
          return;
        }

        if (data.type === 'query' && data.intent === 'next_appointment') {
          const upcoming = [...events]
            .filter(e => new Date(e.start) > new Date())
            .sort((a, b) => new Date(a.start) - new Date(b.start));

          if (upcoming.length > 0) {
            const next = upcoming[0];
            const timeStr = new Date(next.start).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
            addMessage('ai', `Your next appointment is "${next.title}" on ${timeStr}.`);
          } else {
            addMessage('ai', "You don't have any upcoming appointments scheduled.");
          }
          return;
        }

        if (data.answer) {
          addMessage('ai', data.answer);
          return;
        }
      }
      addMessage('ai', cleanedResponse);
    } catch {
      addMessage('ai', response);
    }
  };

  const handleConfirmEvent = async () => {
    if (!pendingEvent) return;

    const { conflicts: _conflicts, originalText: _originalText, ...eventData } = pendingEvent;
    try {
      await addEvent(eventData, { allowConflicts: true });
      addMessage('ai', `Confirmed. "${pendingEvent.title}" has been added to your calendar.`);
      setPendingEvent(null);
      setStatus('success', 'Event added');
    } catch (error) {
      if (error instanceof ValidationError) {
        addMessage('ai', error.message);
        return;
      }
      addMessage('ai', 'Something went wrong while saving the event.');
    }
  };

  const handleConfirmImageEvent = async (index) => {
    const draft = imageDrafts[index];
    if (!draft) return;
    try {
      await addEvent(draft, { allowConflicts: true });
      addMessage('ai', `Added "${draft.title}" from your image.`);
      setImageDrafts(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      if (error instanceof ValidationError) {
        addMessage('ai', error.message);
        return;
      }
      addMessage('ai', 'Something went wrong while saving the image event.');
    }
  };

  const handleConfirmAllImageEvents = async () => {
    if (imageDrafts.length === 0) return;
    const drafts = [...imageDrafts];
    try {
      for (const draft of drafts) {
        await addEvent(draft, { allowConflicts: true });
      }
      addMessage('ai', `Added ${drafts.length} events from your images.`);
      setImageDrafts([]);
    } catch (error) {
      if (error instanceof ValidationError) {
        addMessage('ai', error.message);
        return;
      }
      addMessage('ai', 'Something went wrong while adding image events.');
    }
  };

  const handleEditImageEvent = (index) => {
    const draft = imageDrafts[index];
    if (!draft) return;
    openEventModal(draft);
    setImageDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const handleDiscardImageEvent = (index) => {
    setImageDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditDraft = () => {
    if (!pendingEvent) return;
    const { conflicts: _conflicts, originalText: _originalText, ...eventData } = pendingEvent;
    openEventModal(eventData);
    setPendingEvent(null);
  };

  const handleDiscardEvent = () => {
    setPendingEvent(null);
    addMessage('ai', 'Cancelled. What would you like to do instead?');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const text = inputValue.trim();
    setInputValue('');
    addMessage('user', text);

    await processInput(text);
  };

  const processImageFiles = async (files) => {
    if (files.length === 0) return;
    setIsImageProcessing(true);
    setStatus('info', 'Processing images with Gemini 3...');
    try {
      const parsedEvents = await geminiService.parseEventsFromImages(files);
      const drafts = parsedEvents.map(event => finalizeDraft(event));
      if (drafts.length === 0) {
        addMessage('ai', "I couldn't find any events in those images. Want to try another?");
      } else {
        addMessage('ai', `I found ${drafts.length} event${drafts.length === 1 ? '' : 's'} from your images. Review below.`);
        setImageDrafts(prev => [...prev, ...drafts]);
      }
    } catch (error) {
      if (error instanceof AIParseError || error instanceof AIServiceError) {
        addMessage('ai', error.message);
      } else {
        logger.error('Image parsing error', { error });
        addMessage('ai', 'I hit an error reading that image. Try a clearer screenshot.');
      }
      setStatus('error', 'Image processing failed');
    } finally {
      setIsImageProcessing(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      setStatus(null, null);
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    await processImageFiles(files);
  };

  useEffect(() => {
    const handleExternalImageUpload = (event) => {
      const files = Array.from(event.detail?.files || []);
      if (files.length === 0) return;
      processImageFiles(files);
    };
    window.addEventListener('calai-image-upload', handleExternalImageUpload);
    return () => window.removeEventListener('calai-image-upload', handleExternalImageUpload);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ai-chat-overlay"
        onClick={onClose}
      >
        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="ai-chat-sidebar glass-card"
        >
          <div className="chat-header">
            <div className="chat-title">
              <Sparkles className="ai-icon" size={18} />
              <h3>Cal</h3>
              <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            </div>
            <button onClick={onClose} className="close-btn" aria-label="Close Cal chat">
              <X size={18} />
            </button>
          </div>

          {statusMessage && (
            <div className={`chat-status ${statusMessage.type}`}>
              <AlertTriangle size={14} />
              {statusMessage.message}
            </div>
          )}

          <div className="chat-messages" aria-live="polite">
            {messages.map((message) => (
              <MotionDiv
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`message ${message.type}`}
              >
                <div className="message-content">
                  <p>{message.content}</p>
                </div>
              </MotionDiv>
            ))}

            {pendingEvent && (
              <MotionDiv
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
                  <button onClick={handleEditDraft} className="btn-icon" aria-label="Edit draft">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={handleDiscardEvent} className="btn-icon danger" aria-label="Discard draft">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={handleConfirmEvent} className="btn-primary w-full">
                    <Check size={16} /> Add Event
                  </button>
                </div>
              </MotionDiv>
            )}

            {imageDrafts.length > 0 && (
              <MotionDiv
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="event-confirmation-card glass-card image-event-batch"
              >
                <div className="event-card-header">
                  <Calendar size={16} />
                  <span>Image Events</span>
                </div>
                <p className="event-desc">Review and confirm each image-derived event.</p>
                <div className="image-event-actions">
                  <button onClick={handleConfirmAllImageEvents} className="btn-primary w-full">
                    <Check size={16} /> Add All
                  </button>
                </div>
              </MotionDiv>
            )}

            {imageDrafts.map((draft, index) => (
              <MotionDiv
                key={`${draft.title}-${draft.start}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="event-confirmation-card glass-card"
              >
                <div className="event-card-header">
                  <Calendar size={16} />
                  <span>Image Draft</span>
                </div>
                <h4>{draft.title}</h4>
                <p className="event-time">
                  {new Date(draft.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                {draft.description && <p className="event-desc">{draft.description}</p>}
                <div className="event-card-actions">
                  <button onClick={() => handleEditImageEvent(index)} className="btn-icon" aria-label="Edit image draft">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDiscardImageEvent(index)} className="btn-icon danger" aria-label="Discard image draft">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => handleConfirmImageEvent(index)} className="btn-primary w-full">
                    <Check size={16} /> Add Event
                  </button>
                </div>
              </MotionDiv>
            ))}

            {isLoading && (
              <div className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="chat-input-wrapper">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="chat-image-input"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="chat-upload-btn"
              disabled={isImageProcessing || isLoading}
              title="Upload event images"
            >
              <ImagePlus size={16} />
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Just chat with Cal"
              className="chat-input-field"
              autoFocus
            />
            <button type="submit" disabled={!inputValue.trim() || isLoading} className="chat-send-btn">
              <Send size={16} />
            </button>
          </form>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default AIChat;
