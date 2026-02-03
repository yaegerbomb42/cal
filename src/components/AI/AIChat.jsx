import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, Calendar, Check, Edit2, Trash2, AlertTriangle, ImagePlus, Mic, MicOff, Volume2 } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { localBrainService } from '../../services/localBrainService';
import { voiceAIService } from '../../services/voiceAIService';
import { useEvents } from '../../contexts/useEvents';
import { useCalendar } from '../../contexts/useCalendar';
import { detectIntent } from '../../services/aiIntentService';
import { buildQueryResponse } from '../../services/aiQueryService';
import { finalizeDraft } from '../../services/aiEventService';
import { applyClarificationAnswer, getClarificationPrompt, listClarificationFields, processEventInput } from '../../ai/AiProcessor';
import { sanitizeAIOutput } from '../../ai/OutputSanitizer';
import { AIParseError, AIServiceError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import JarvisParticles from '../VoiceAI/JarvisParticles';
import './AIChat.css';

const AIChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hey, I'm Cal! Ready to help. What would you like me to schedule?"
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
  const [isLocalMode] = useState(localBrainService.getPreferLocal());
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [, setIsSpeaking] = useState(false);


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
  }, [events]); // Kept [events] as requested, though linter suggests adding handleAIResponse/processInput. Suppressing or assuming stable refs.

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingEvent, clarificationState]);

  // Voice input handler
  useEffect(() => {
    const handleVoiceResult = (e) => {
      if (e.detail.isFinal) {
        const transcript = e.detail.transcript;
        setInputValue(transcript);
        setIsVoiceListening(false);
        // Optional: auto-submit after voice input
        // processInput(transcript);
      }
    };

    const handleVoiceEnd = () => setIsVoiceListening(false);
    const handleSpeechStart = () => setIsSpeaking(true);
    const handleSpeechEnd = () => setIsSpeaking(false);

    window.addEventListener('calai-voice-result', handleVoiceResult);
    window.addEventListener('calai-voice-end', handleVoiceEnd);
    window.addEventListener('calai-speech-start', handleSpeechStart);
    window.addEventListener('calai-speech-end', handleSpeechEnd);

    return () => {
      window.removeEventListener('calai-voice-result', handleVoiceResult);
      window.removeEventListener('calai-voice-end', handleVoiceEnd);
      window.removeEventListener('calai-speech-start', handleSpeechStart);
      window.removeEventListener('calai-speech-end', handleSpeechEnd);
    };
  }, []);

  // Global keyboard capture - focus input and prepend typed character
  const inputRef = useRef(null);
  useEffect(() => {
    const handleFocus = (e) => {
      const key = e.detail?.key;
      if (inputRef.current) {
        inputRef.current.focus();
        if (key && key.length === 1) {
          setInputValue(prev => key + prev);
        }
      }
    };
    window.addEventListener('calai-focus', handleFocus);
    return () => window.removeEventListener('calai-focus', handleFocus);
  }, []);

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

    // Auto Problematicness Detection
    await checkProblematicness(finalized, conflicts);

    setPendingEvent({ ...finalized, conflicts, originalText: text });
    setClarificationState(null);
    addMessage('ai', "I've got everything I need. Does this event look right?");
  };

  const checkProblematicness = async (event, conflicts) => {
    if (conflicts && conflicts.length > 0) {
      addMessage('ai', `⚠️ Heads up: This conflicts with ${conflicts.length} existing event(s). Shall I continue?`);
      voiceAIService.speakAsHal('conflict');
    }

    const start = new Date(event.start);
    const hours = start.getHours();
    if (hours >= 22 || hours <= 5) {
      addMessage('ai', "🌙 This is a bit late/early, Dave. Are you sure you want this on your schedule?");
    }
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

  const handleAIResponse = async (response) => {
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

        if (data.intent === 'find_slots') {
          addMessage('ai', data.answer || "Searching for optimal slots...");

          // Fetch suggestions
          const range = await geminiService.parseFuzzyDateRange(data.context || 'next month');
          const suggestions = await geminiService.suggestOptimalSlot({
            title: 'Suggested Event',
            rangeStart: range?.start,
            rangeEnd: range?.end,
            context: data.context
          }, events);

          if (suggestions && suggestions.length > 0) {
            // Dispatch highlight event
            window.dispatchEvent(new CustomEvent('CALAI_HIGHLIGHT_SLOTS', {
              detail: {
                slots: suggestions,
                context: data.context
              }
            }));
            addMessage('ai', `I found ${suggestions.length} optimal slots. I've highlighted them on your calendar.`);
          } else {
            addMessage('ai', "I couldn't find any specific slots matching that range.");
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

  /* File Processing */
  const processFiles = useCallback(async (files) => {
    if (files.length === 0) return;
    setIsImageProcessing(true);
    setStatus('info', 'Analyzing files with Gemini 3...');
    try {
      const parsedEvents = await geminiService.parseEventsFromFiles(files);
      if (parsedEvents.length === 0) {
        addMessage('ai', "I checked those files but couldn't find any clear calendar events.");
      } else {
        const drafts = parsedEvents.map(event => ({
          ...finalizeDraft(event),
          evidence: event.evidence // Preserve evidence
        }));
        addMessage('ai', `I found ${drafts.length} event${drafts.length === 1 ? '' : 's'}. Please confirm them below.`);
        setImageDrafts(prev => [...prev, ...drafts]);
      }
    } catch (error) {
      if (error instanceof AIParseError || error instanceof AIServiceError) {
        addMessage('ai', error.message);
      } else {
        logger.error('File parsing error', { error });
        addMessage('ai', 'I hit a snag reading those files. Ensure they are valid documents or images.');
      }
      setStatus('error', 'Analysis failed');
    } finally {
      setIsImageProcessing(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      setStatus(null, null);
    }
  }, []); // Add dependencies if needed, but empty is safe for now as helpers are imported

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    await processFiles(files);
  };

  /* Drag & Drop Handlers */
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  useEffect(() => {
    const handleExternalUpload = (event) => {
      const files = Array.from(event.detail?.files || []);
      if (files.length === 0) return;
      processFiles(files);
    };
    window.addEventListener('calai-image-upload', handleExternalUpload);
    return () => window.removeEventListener('calai-image-upload', handleExternalUpload);
  }, [processFiles]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ai-chat-overlay"
        onClick={onClose}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`ai-chat-sidebar glass-card ${isDragging ? 'drag-active' : ''}`}
        >
          {isDragging && (
            <div className="drag-overlay">
              <div className="drag-content">
                <ImagePlus size={48} className="text-accent mb-2" />
                <h3>Drop files to analyze</h3>
                <p>Images, PDFs, Text</p>
              </div>
            </div>
          )}

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
                  <span>Batch Review ({imageDrafts.length})</span>
                </div>
                <p className="event-desc">Confirm all events extracted from your files.</p>
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
                  <Sparkles size={14} className="text-accent" />
                  <span>AI Analysis</span>
                </div>
                <h4>{draft.title}</h4>
                <p className="event-time">
                  {new Date(draft.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>

                {draft.evidence && (
                  <div className="ai-evidence-box">
                    <strong>Why:</strong> "{draft.evidence}"
                  </div>
                )}

                {draft.description && <p className="event-desc">{draft.description}</p>}

                <div className="event-card-actions">
                  <button onClick={() => handleEditImageEvent(index)} className="btn-icon" aria-label="Edit draft">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDiscardImageEvent(index)} className="btn-icon danger" aria-label="Discard draft">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => handleConfirmImageEvent(index)} className="btn-primary w-full">
                    <Check size={16} /> Add
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
              accept=".pdf,.txt,.md,.csv,image/*"
              multiple
              onChange={handleFileUpload}
              className="chat-image-input"
            />
            {!isLocalMode && (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="chat-upload-btn"
                disabled={isImageProcessing || isLoading}
                title="Upload files"
              >
                <ImagePlus size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isVoiceListening) {
                  voiceAIService.stopListening();
                  setIsVoiceListening(false);
                } else {
                  voiceAIService.startListening();
                  setIsVoiceListening(true);
                }
              }}
              className={`chat-mic-btn ${isVoiceListening ? 'listening' : ''}`}
              title={isVoiceListening ? 'Stop listening' : 'Voice input'}
            >
              {isVoiceListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Chat with Cal..."
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
