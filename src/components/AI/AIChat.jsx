import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, Calendar, Check, Trash2, Volume2, VolumeX, Mic, MicOff, ImagePlus, ExternalLink, Clock, Type } from 'lucide-react';
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
import CalCharacter from './CalCharacter';
import SentenceGraph from './SentenceGraph';
import './AIChat.css';

const AIChat = ({ isOpen, onClose, initialMessage, onClearInitialMessage }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hey, I'm Cal! Ready to help. What would you like me to schedule?"
    }
  ]);
  const [chatHistory, setChatHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);
  const [imageDrafts, setImageDrafts] = useState([]);
  const [clarificationState, setClarificationState] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [listenMode, setListenMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // eslint-disable-line no-unused-vars
  const [speakResponse, setSpeakResponse] = useState(false);
  const [fullSpeechText, setFullSpeechText] = useState('');
  const [currentSpeechIndex, setCurrentSpeechIndex] = useState(0);
  const [lastProcessedInput, setLastProcessedInput] = useState(null);
  const [calEmotion, setCalEmotion] = useState('idle');
  const [showProof, setShowProof] = useState(false);

  const [chatConfig, setChatConfig] = useState(() => {
    const saved = localStorage.getItem('cal-chat-config');
    return saved ? JSON.parse(saved) : { x: 0, y: 0, width: 420, height: 600 };
  });

  useEffect(() => {
    const config = localStorage.getItem('cal-chat-config');
    if (config) setChatConfig(JSON.parse(config));
  }, []);

  const saveConfig = (newConfig) => {
    const updated = { ...chatConfig, ...newConfig };
    setChatConfig(updated);
    localStorage.setItem('cal-chat-config', JSON.stringify(updated));
  };

  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const { events, addEvent } = useEvents();
  const { openEventModal } = useCalendar();

  const setStatus = (type, message) => {
    if (!type) {
      setStatusMessage(null);
      return;
    }
    setStatusMessage({ type, message });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const lastProcessedRef = useRef(null);

  const parseGesture = useCallback((content, type, context = {}) => {
    if (type !== 'ai' && type !== 'status') return;
    const text = content.toLowerCase();
    if (context.gesture) {
      setCalEmotion(context.gesture);
      return;
    }
    if (text.includes('already have') || text.includes('duplicate')) {
      setCalEmotion('pointing-left');
    } else if (text.includes('created') || text.includes('added') || text.includes('scheduled')) {
      setCalEmotion('celebrating');
    } else if (text.includes('?') || text.includes('not sure') || text.includes('clarif')) {
      setCalEmotion('confused');
    } else if (text.includes('!') && (text.includes('great') || text.includes('perfect') || text.includes('nice'))) {
      setCalEmotion('excited');
    } else if (text.includes('error') || text.includes('problem') || text.includes('failed')) {
      setCalEmotion('surprised');
    } else if (text.includes('let me') || text.includes('checking') || text.includes('thinking')) {
      setCalEmotion('thinking');
    } else {
      setCalEmotion(Math.random() < 0.1 ? 'bored' : 'idle');
    }
  }, []);

  const addMessage = useCallback((type, content, context = {}) => {
    if (lastProcessedRef.current === content) return;
    lastProcessedRef.current = content;
    setTimeout(() => { lastProcessedRef.current = null; }, 1000);

    const newMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    parseGesture(content, type, context);
    return newMessage;
  }, [parseGesture]);

  const checkProblematicness = useCallback(async (event, conflicts) => {
    if (conflicts && conflicts.length > 0) {
      addMessage('ai', `⚠️ Heads up: This conflicts with ${conflicts.length} existing event(s). Shall I continue?`);
    }
    const start = new Date(event.start);
    const hours = start.getHours();
    if (hours >= 22 || hours <= 5) {
      addMessage('ai', "🌙 This is a bit late/early. Are you sure you want this on your schedule?");
    }
  }, [addMessage]);

  const processClarification = useCallback(async (text) => {
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
    await checkProblematicness(finalized, conflicts);

    setPendingEvent({ ...finalized, conflicts, originalText: text, graphData: updatedDraft.graphData || draft.graphData });
    setClarificationState(null);
    addMessage('ai', "I've got everything I need. Does this event look right?");
  }, [clarificationState, events, addMessage, checkProblematicness]);

  const handleAIResponse = useCallback(async (response) => {
    try {
      const cleanedResponse = sanitizeAIOutput(response);

      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0]);
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
          logger.error("JSON parse error in AI response", { error: e });
        }
      }
      addMessage('ai', response);
    } catch (error) {
      logger.error('Chat processing error:', { error });
      addMessage('ai', "I had trouble processing that response.");
    }
  }, [addMessage]);

  const processInput = useCallback(async (text) => {
    setIsLoading(true);
    try {
      if (clarificationState) {
        await processClarification(text);
        return;
      }
      const intent = detectIntent(text);
      if (intent === 'event_query') {
        const response = buildQueryResponse(text, events);
        addMessage('ai', response);
        return;
      }
      if (intent === 'event_create') {
        const draftResult = await processEventInput(text, { geminiService, localBrainService });
        if (draftResult.status === 'needs_clarification') {
          setClarificationState({ draft: draftResult.draft, missingFields: draftResult.missingFields });
          const field = draftResult.missingFields[0];
          let prompt = getClarificationPrompt(field, { draft: draftResult.draft });
          if (field === 'start') prompt = "I need a date and time for this event. When should I schedule it?";
          addMessage('ai', prompt);
          return;
        }
        const finalized = finalizeDraft(draftResult.draft);
        const conflicts = await geminiService.checkConflicts(finalized, events);
        try {
          await addEvent(finalized, { allowConflicts: true });
          let responseMsg = `I've added "${finalized.title}" to your calendar!`;
          if (conflicts && conflicts.length > 0) responseMsg += ` ⚠️ Note: This conflicts with ${conflicts.length} existing event(s).`;
          addMessage('ai', responseMsg);
        } catch (err) {
          addMessage('ai', err.message || 'Something went wrong while saving the event.');
        }
        return;
      }
      const response = await geminiService.chatResponse(text, chatHistory, events);
      const aiText = sanitizeAIOutput(response, { input: text });
      setChatHistory(prev => [...prev, { isUser: true, text }, { isUser: false, text: aiText }]);
      handleAIResponse(aiText);
    } catch (error) {
      logger.error('Input processing error', { error });
      addMessage('ai', 'I encountered an error processing your request.');
    } finally {
      setIsLoading(false);
    }
  }, [clarificationState, events, addMessage, handleAIResponse, processClarification, addEvent, chatHistory]);

  const handleConfirmEvent = async () => {
    if (!pendingEvent) return;
    try {
      await addEvent(pendingEvent, { allowConflicts: true });
      addMessage('ai', `Confirmed. "${pendingEvent.title}" has been added.`);
      setPendingEvent(null);
    } catch (error) {
       logger.error('Event save error', { error });
       addMessage('ai', 'Something went wrong while saving.');
    }
  };

  const handleEditDraft = () => {
    if (!pendingEvent) return;
    openEventModal(pendingEvent);
    setPendingEvent(null);
  };
  
  const handleDiscardEvent = () => {
    setPendingEvent(null);
    addMessage('ai', 'Cancelled.');
  };

  const handleConfirmImageEvent = async (index) => {
    const draft = imageDrafts[index];
    try {
      await addEvent(draft, { allowConflicts: true });
      setImageDrafts(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      logger.error('Image event save error', { error });
      addMessage('ai', 'Error adding event.');
    }
  };

  const handleEditImageEvent = (index) => {
    const draft = imageDrafts[index];
    openEventModal(draft);
    setImageDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const handleDiscardImageEvent = (index) => {
    setImageDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = useCallback(async (files) => {
    if (files.length === 0) return;
    setIsImageProcessing(true);
    setStatus('info', 'Analyzing files...');
    try {
      const result = await geminiService.parseEventsFromImages(files, "");
      if (result.events && result.events.length > 0) {
        const drafts = result.events.map(event => finalizeDraft(event));
        setImageDrafts(prev => [...prev, ...drafts]);
        addMessage('ai', `I found ${drafts.length} potential events.`);
      } else {
        addMessage('ai', "No clear events found in those files.");
      }
    } catch (error) {
      logger.error('File parsing error', { error });
      addMessage('ai', 'Snag reading files.');
    } finally {
      setIsImageProcessing(false);
      setStatus(null, null);
    }
  }, [addMessage]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue.trim();
    setInputValue('');
    addMessage('user', text);
    await processInput(text);
  };

  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  useEffect(() => {
    if (initialMessage && !isLoading) {
      const msg = initialMessage;
      if (onClearInitialMessage) onClearInitialMessage();
      addMessage('user', msg);
      processInput(msg);
    }
  }, [initialMessage, isLoading, onClearInitialMessage, processInput, addMessage]);

  useEffect(() => {
    if (geminiService.isInitialized) setIsConnected(true);
    const handlePing = (e) => {
      if (!isOpen) return;
      const { text, response } = e.detail;
      if (!text || text === lastProcessedInput) return;
      setLastProcessedInput(text);
      addMessage('user', text);
      if (response) handleAIResponse(response);
      else processInput(text);
      setTimeout(() => setLastProcessedInput(null), 2000);
    };
    const handleGesture = (e) => {
      if (e.detail?.gesture) setCalEmotion(e.detail.gesture);
    };
    window.addEventListener('calai-ping', handlePing);
    window.addEventListener('calai-gesture', handleGesture);
    return () => {
      window.removeEventListener('calai-ping', handlePing);
      window.removeEventListener('calai-gesture', handleGesture);
    };
  }, [processInput, lastProcessedInput, isOpen, handleAIResponse, addMessage]);

  useEffect(() => { scrollToBottom(); }, [messages, pendingEvent, clarificationState, imageDrafts]);

  useEffect(() => {
    const handleVoiceResult = (e) => {
      if (e.detail.isFinal) {
        const transcript = e.detail.transcript;
        if (listenMode) {
          addMessage('user', transcript);
          processInput(transcript);
        } else {
          setInputValue(transcript);
        }
      }
    };
    const handleSpeechStart = (e) => { setIsSpeaking(true); setFullSpeechText(e.detail?.text || ''); setCurrentSpeechIndex(0); };
    const handleSpeechEnd = () => { setIsSpeaking(false); setTimeout(() => setFullSpeechText(''), 1000); };
    const handleWord = (e) => { if (e.detail?.charIndex !== undefined) setCurrentSpeechIndex(e.detail.charIndex + e.detail.charLength); };

    window.addEventListener('calai-voice-result', handleVoiceResult);
    window.addEventListener('calai-speech-start', handleSpeechStart);
    window.addEventListener('calai-speech-end', handleSpeechEnd);
    window.addEventListener('calai-speech-word', handleWord);
    return () => {
      window.removeEventListener('calai-voice-result', handleVoiceResult);
      window.removeEventListener('calai-speech-start', handleSpeechStart);
      window.removeEventListener('calai-speech-end', handleSpeechEnd);
      window.removeEventListener('calai-speech-word', handleWord);
    };
  }, [addMessage, listenMode, processInput]);

  const inputRef = useRef(null);
  useEffect(() => {
    const handleFocus = (e) => {
      const key = e.detail?.key;
      inputRef.current?.focus();
      if (key && key.length === 1) setInputValue(prev => key + prev);
    };
    window.addEventListener('calai-focus', handleFocus);
    return () => window.removeEventListener('calai-focus', handleFocus);
  }, []);

  const handleResize = useCallback((e) => {
    e.preventDefault();
    const startWidth = chatConfig.width;
    const startHeight = chatConfig.height;
    const startX = e.clientX;
    const startY = e.clientY;
    const onMouseMove = (me) => {
      const newWidth = Math.max(320, Math.min(800, startWidth + (me.clientX - startX)));
      const newHeight = Math.max(400, Math.min(900, startHeight + (me.clientY - startY)));
      setChatConfig(prev => ({ ...prev, width: newWidth, height: newHeight }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      localStorage.setItem('cal-chat-config', JSON.stringify(chatConfig));
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [chatConfig]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ai-chat-overlay"
        onClick={onClose}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <motion.div
          drag
          dragMomentum={false}
          onDragEnd={(e, info) => {
            const newX = chatConfig.x + info.offset.x;
            const newY = chatConfig.y + info.offset.y;
            saveConfig({ x: newX, y: newY });
          }}
          initial={false}
          animate={{ x: chatConfig.x, y: chatConfig.y, width: chatConfig.width, height: chatConfig.height }}
          transition={{ type: 'spring', stiffness: 600, damping: 40, mass: 1 }}
          onClick={(e) => e.stopPropagation()}
          className={`ai-chat-sidebar glass-card ${isDragging ? 'drag-active' : ''}`}
          style={{ position: 'absolute', right: '1.5rem', top: '1.5rem' }}
        >
          <div className="resize-handle" onMouseDown={handleResize} />
          
          <div className="chat-header">
            <div className="chat-title">
              <button 
                onClick={() => { setMessages([{ id: 1, type: 'ai', content: "Cleared." }]); setChatHistory([]); }} 
                className="action-btn"
                title="Clear Chat"
              ><X size={16} /></button>
              <h3 style={{ margin: 0 }}>Cal</h3>
              <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button onClick={() => setSpeakResponse(!speakResponse)} className={`header-action-btn ${speakResponse ? 'active' : ''}`} title="Toggle Voice Output"><Volume2 size={16} /></button>
              <button
                onClick={() => {
                  const newMode = !listenMode;
                  setListenMode(newMode);
                  if (newMode) voiceAIService.startListening();
                  else voiceAIService.stopListening();
                }}
                className={`header-action-btn ${listenMode ? 'active' : ''}`}
                title="Toggle Listen Mode"
              >
                {listenMode ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button onClick={onClose} className="close-btn" title="Close"><X size={18} /></button>
            </div>
          </div>

          {statusMessage && (
            <div className={`chat-status ${statusMessage.type}`}>
              <AlertTriangle size={14} /> {statusMessage.message}
            </div>
          )}

          <div className="chat-messages">
            <div className="cal-character-bg">
              <CalCharacter emotion={isLoading || isImageProcessing ? 'processing' : calEmotion} isFocus={false} />
            </div>

            {messages.map((message) => (
              <motion.div key={message.id} className={`message ${message.type === 'user-image' ? 'user' : message.type}`}>
                <div className="message-content">
                  {message.type === 'user-image' ? <img src={message.content} className="chat-uploaded-image" alt="upload" /> : <p>{message.content}</p>}
                </div>
              </motion.div>
            ))}

            {pendingEvent && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="event-confirmation-card glass-card">
                <h4>{pendingEvent.title}</h4>
                <div className="event-details-block" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                     <div>📅 {new Date(pendingEvent.start).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                     {pendingEvent.location && <div>📍 {pendingEvent.location}</div>}
                </div>
                <div className="event-card-actions" style={{ marginTop: '12px' }}>
                  <button onClick={handleEditDraft} className="btn-icon"><Edit2 size={16} /></button>
                  <button onClick={handleDiscardEvent} className="btn-icon danger"><Trash2 size={16} /></button>
                  <button onClick={handleConfirmEvent} className="btn-primary w-full"><Check size={16} /> Confirm</button>
                </div>
                {pendingEvent.graphData && (
                  <div style={{ marginTop: '12px' }}>
                    <button onClick={() => setShowProof(!showProof)} className="proof-toggle-btn w-full">
                      <Sparkles size={12} style={{ marginRight: 6 }} />
                      {showProof ? 'Hide' : 'View'} Reasoning Link
                    </button>
                    {showProof && <SentenceGraph data={pendingEvent.graphData} />}
                  </div>
                )}
              </motion.div>
            )}

            {imageDrafts.map((draft, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="event-confirmation-card glass-card">
                <div className="event-card-header"><Sparkles size={14} className="text-accent" /> <span>Extracted Event</span></div>
                <h4>{draft.title}</h4>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{new Date(draft.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                <div className="event-card-actions" style={{ marginTop: '8px' }}>
                  <button onClick={() => handleConfirmImageEvent(index)} className="btn-primary w-full"><Check size={16} /> Add</button>
                  <button onClick={() => handleEditImageEvent(index)} className="btn-icon"><Edit2 size={16} /></button>
                  <button onClick={() => handleDiscardImageEvent(index)} className="btn-icon danger"><Trash2 size={16} /></button>
                </div>
              </motion.div>
            ))}

            {(isLoading || isImageProcessing) && (
              <div className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
            )}

            <AnimatePresence>
              {fullSpeechText && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="integrated-subtitles">
                  <span className="spoken-text">{fullSpeechText.substring(0, currentSpeechIndex)}</span>
                  <span className="unspoken-text">{fullSpeechText.substring(currentSpeechIndex)}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="chat-input-wrapper">
            <input ref={imageInputRef} type="file" multiple accept="image/*, .pdf, .text" onChange={handleFileUpload} style={{ display: 'none' }} />
            <button type="button" onClick={() => imageInputRef.current?.click()} className="chat-upload-btn" disabled={isImageProcessing}><ImagePlus size={16} /></button>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Chat with Cal..."
              className="chat-input-field"
              rows={1}
            />
            <button type="submit" disabled={!inputValue.trim() || isLoading} className="chat-send-btn"><Send size={16} /></button>
            {isDragging && <div className="drag-overlay"><div className="drag-content"><ImagePlus size={32} /><h3>Drop to Analyze</h3></div></div>}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIChat;
