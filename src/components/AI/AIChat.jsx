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
import CalCharacter from './CalCharacter';
import './AIChat.css';

const AIChat = ({ isOpen, onClose, initialMessage, onClearInitialMessage }) => {
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
  const [speakResponse, setSpeakResponse] = useState(false); // TTS Toggle
  const [lastProcessedInput, setLastProcessedInput] = useState(null);
  const [calEmotion, setCalEmotion] = useState('idle');
  const [calSpeech, setCalSpeech] = useState(null);

  const MotionDiv = motion.div;
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const { events, addEvent, deleteEventsByCategory } = useEvents();
  const { openEventModal } = useCalendar();

  // Process initial message from prop (race condition fix)
  useEffect(() => {
    if (initialMessage && !isLoading) {
      const msg = initialMessage;
      if (onClearInitialMessage) onClearInitialMessage(); // Clear FIRST
      addMessage('user', msg);
      processInput(msg);
    }
  }, [initialMessage, isLoading]);

  useEffect(() => {
    if (geminiService.isInitialized) {
      setIsConnected(true);
    }

    const handlePing = (e) => {
      // Only handle if already open; App.jsx handles the wake-up case
      if (!isOpen) return;

      const { text, response } = e.detail;
      if (!text || text === lastProcessedInput) return;

      setLastProcessedInput(text);
      addMessage('user', text);
      if (response) {
        handleAIResponse(response);
        return;
      }
      processInput(text);

      // Reset last input after a delay to allow same query later
      setTimeout(() => setLastProcessedInput(null), 2000);
    };

    window.addEventListener('calai-ping', handlePing);
    return () => window.removeEventListener('calai-ping', handlePing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processInput, lastProcessedInput, events, isOpen]);

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

  const lastProcessedRef = useRef(null); // Fix duplication

  // Gesture parsing helper
  const parseGesture = useCallback((content, type, context = {}) => {
    if (type !== 'ai' && type !== 'status') return;

    const text = content.toLowerCase();

    // Check for explicit gesture in AI response
    if (context.gesture) {
      setCalEmotion(context.gesture);
      if (context.speech) setCalSpeech(context.speech);
      return;
    }

    // Analyze content for contextual gestures
    if (text.includes('already have') || text.includes('duplicate')) {
      setCalEmotion('pointing-left');
      setCalSpeech('You already have that!');
    } else if (text.includes('created') || text.includes('added') || text.includes('scheduled')) {
      setCalEmotion('celebrating');
      setCalSpeech('Done!');
    } else if (text.includes('?') || text.includes('not sure') || text.includes('clarif')) {
      setCalEmotion('confused');
      setCalSpeech('Hmm...');
    } else if (text.includes('!') && (text.includes('great') || text.includes('perfect') || text.includes('nice'))) {
      setCalEmotion('excited');
      setCalSpeech('Awesome!');
    } else if (text.includes('error') || text.includes('problem') || text.includes('failed')) {
      setCalEmotion('surprised');
      setCalSpeech('Whoa!');
    } else if (text.includes('let me') || text.includes('checking') || text.includes('thinking')) {
      setCalEmotion('thinking');
    } else {
      // Idle with occasional bored state
      if (Math.random() < 0.1) {
        setCalEmotion('bored');
      }
    }
  }, []);

  const addMessage = (type, content, context = {}) => {
    // Prevent strict identical duplicates within 500ms
    if (lastProcessedRef.current === content) return;
    lastProcessedRef.current = content;
    setTimeout(() => { lastProcessedRef.current = null; }, 1000);

    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);

    // Trigger gesture based on message
    parseGesture(content, type, context);

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

  async function processInput(text) {
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

          // Smarter Prompting: Don't just say "What is the start time?"
          const field = draftResult.missingFields[0];
          let prompt = getClarificationPrompt(field, { draft: draftResult.draft });

          if (field === 'start') {
            prompt = "I need a date and time for this event. When should I schedule it?";
          }

          addMessage('ai', prompt);
          // Auto-speak if TTS enabled
          if (speakResponse) voiceAIService.speak(prompt);
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
  }

  async function handleAIResponse(response) {
    try {
      const cleanedResponse = sanitizeAIOutput(response);

      // Voice Output
      if (speakResponse) {
        voiceAIService.speak(cleanedResponse);
      }

      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0]);

          // Memory/Learning handling
          if (data.type === 'learn' || data.intent === 'set_memory') {
            const { memoryService } = await import('../../services/memoryService');
            if (data.fact) memoryService.addFact(data.fact);
          }

          if (data.type === 'action' && (data.intent === 'create_event' || data.intent === 'schedule_event')) {
            if (data.draft) {
              setPendingEvent(data.draft);
              if (data.answer) addMessage('ai', data.answer);
              return;
            }
          }

          if (data.answer) {
            addMessage('ai', data.answer);
            return;
          }
        } catch (e) {
          console.error("JSON parse error in AI response", e);
        }
      }

      addMessage('ai', response);
    } catch (error) {
      console.error('Chat processing error:', error);
      addMessage('ai', "I had trouble processing that response.");
    }
  }

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

    // Display images in chat immediately
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          addMessage('user-image', e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        addMessage('user', `[File: ${file.name}]`);
      }
    }

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
        {/* Cal character floating outside drawer */}
        <MotionDiv
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{
            position: 'absolute',
            right: '440px',
            bottom: '2rem',
            zIndex: 999,
            pointerEvents: 'none'
          }}
        >
          <CalCharacter isTalking={isLoading} emotion={isLoading ? 'thinking' : 'idle'} />
        </MotionDiv>

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

              <h3>Cal</h3>
              <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            </div>
            <button
              onClick={() => setSpeakResponse(!speakResponse)}
              className={`action-btn ${speakResponse ? 'active' : ''}`}
              title={speakResponse ? "Mute Voice" : "Enable Voice"}
              style={{ marginRight: '8px', color: speakResponse ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {speakResponse ? <Volume2 size={18} /> : <MicOff size={18} />}
            </button>
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
                className={`message ${message.type === 'user-image' ? 'user' : message.type}`}
              >
                <div className="message-content">
                  {message.type === 'user-image' ? (
                    <img src={message.content} alt="User upload" className="chat-uploaded-image" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '4px' }} />
                  ) : (
                    <p>{message.content}</p>
                  )}
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
                <div className="event-details-block" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Line 1: Date */}
                  <div className="detail-row" style={{ display: 'flex', alignItems: 'center', fontWeight: '600', color: 'var(--text-primary)' }}>
                    <Calendar size={14} style={{ marginRight: 8, opacity: 0.7 }} />
                    {new Date(pendingEvent.start).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>

                  {/* Line 2: Start Time */}
                  <div className="detail-row" style={{ marginLeft: '22px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    <span style={{ opacity: 0.7, marginRight: 4 }}>Start:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                      {new Date(pendingEvent.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Line 3: End Time */}
                  <div className="detail-row" style={{ marginLeft: '22px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    <span style={{ opacity: 0.7, marginRight: 8 }}>End:</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                      {new Date(pendingEvent.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Recurrence Block */}
                  {pendingEvent.recurring && pendingEvent.recurring.type !== 'none' && (
                    <div className="recurrence-section" style={{
                      marginTop: '12px',
                      marginInline: '12px',
                      padding: '10px',
                      background: 'rgba(99, 102, 241, 0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ background: 'var(--accent)', padding: '4px', borderRadius: '6px' }}>
                            <Sparkles size={10} style={{ color: 'white' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--accent)' }}>
                            REPEATS {pendingEvent.recurring.type.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                            const eventDay = new Date(pendingEvent.start).getDay();
                            const isActive = idx === eventDay;
                            return (
                              <div key={idx} style={{
                                width: '18px', height: '18px', fontSize: '9px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '4px',
                                background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                color: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                                fontWeight: 'bold'
                              }}>
                                {day}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location Row */}
                  <div className="location-section" style={{ marginTop: '12px', marginInline: '12px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '4px 8px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <span style={{ fontSize: '14px' }}>📍</span>
                      <input
                        type="text"
                        value={pendingEvent.location || ''}
                        onChange={(e) => setPendingEvent({ ...pendingEvent, location: e.target.value })}
                        placeholder="Add location..."
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-primary)',
                          padding: '4px 0',
                          fontSize: '0.85rem',
                          flex: 1,
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={async () => {
                          try {
                            const controller = new AbortController();
                            const timeout = setTimeout(() => controller.abort(), 5000);
                            setStatus('info', 'Searching map...');
                            const result = await Promise.race([
                              geminiService.chatResponse(`Find a map link or full address for "${pendingEvent.location || pendingEvent.title}". Return ONLY the link or address. If not found, say NOT_FOUND.`, []),
                              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                            ]);
                            clearTimeout(timeout);
                            if (result && result.trim() !== 'NOT_FOUND' && !result.includes('503')) {
                              setPendingEvent({ ...pendingEvent, location: result.trim() });
                              setStatus('success', 'Location found!');
                            } else {
                              setStatus('error', 'Location not found.');
                            }
                            setTimeout(() => setStatus(null, null), 2000);
                          } catch (err) {
                            setStatus('error', 'Lookup failed (Timeout).');
                            setTimeout(() => setStatus(null, null), 3000);
                          }
                        }}
                        style={{
                          fontSize: '9px',
                          fontWeight: '800',
                          color: 'var(--accent)',
                          padding: '4px 8px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          textTransform: 'uppercase'
                        }}
                      >
                        Lookup
                      </button>
                    </div>
                  </div>
                </div>
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
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-expand logic
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim() && !isLoading) {
                    handleSubmit(e);
                  }
                }
              }}
              placeholder="Chat with Cal..."
              className="chat-input-field"
              autoFocus
              rows={1}
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
