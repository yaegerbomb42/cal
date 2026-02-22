import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Eye, EyeOff, ExternalLink, Download, Calendar as CalendarIcon, RefreshCw, CheckCircle, Check, LogOut, User, Sparkles, MessageSquare, Clock, Cpu, Zap, Globe } from 'lucide-react';
import { CloudDownloadOutlined, EventNoteOutlined } from '@mui/icons-material';
import { geminiService } from '../../services/geminiService';
import { localBrainService } from '../../services/localBrainService';
import { checkOllamaConnection, chatOllama } from '../../services/ollamaService';
import { firebaseService } from '../../services/firebaseService';
import { googleCalendarService } from '../../services/googleCalendarService';
import { useEvents } from '../../contexts/useEvents';
import { useAuth } from '../../contexts/useAuth';
import { useTheme } from '../../contexts/useTheme';
import { downloadICS } from '../../utils/icsExport';
import { GENERAL_EVENT_PACKS, buildGeneralEvents } from '../../utils/generalEvents';
import { logger } from '../../utils/logger';
import { toastService } from '../../utils/toast';
import './Settings.css';

// Helper for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

const Settings = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const MotionDiv = motion.div;
  const [activeTab, setActiveTab] = useState('account');

  // AI State
  const [aiProvider, setAiProvider] = useState('gemini'); // 'gemini' | 'local' | 'ollama'
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const savedApiKeyRef = useRef(null);

  // Ollama State
  const [ollamaConfig, setOllamaConfig] = useState({
    model: 'llama3',
    baseUrl: 'http://localhost:11434'
  });

  // AI Personality
  const [aiPersonality, setAiPersonalityState] = useState('professional');

  const setAiPersonality = (p) => {
    setAiPersonalityState(p);
    localStorage.setItem('calai-ai-personality', p);
    // Directly update services to avoid reload need
    if (window.geminiService) window.geminiService.setPersonality(p);
    if (window.localBrainService) window.localBrainService.setPersonality(p);
  };

  useEffect(() => {
    const stored = localStorage.getItem('calai-ai-personality');
    if (stored) setAiPersonalityState(stored);
  }, []);

  // Local Brain State
  const [localBrainProgress, setLocalBrainProgress] = useState(null);
  const [isLocalBrainLoaded, setIsLocalBrainLoaded] = useState(false);

  // Chat Test State
  const [testChatInput, setTestChatInput] = useState('');
  const [testChatHistory, setTestChatHistory] = useState([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatScrollRef = useRef(null);
  // eslint-disable-next-line no-undef
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

  // Priority Preferences State
  const [priorityPrefs, setPriorityPrefs] = useState({
    // Core Weights (0-100)
    urgencyWeight: 85,
    importanceWeight: 75,
    effortWeight: 60,
    energyMatchWeight: 70,

    // Energy Pattern
    peakEnergyTime: 'morning', // 'morning' | 'midday' | 'evening' | 'night'
    energyDips: ['afternoon'], // time periods when energy typically dips

    // Focus Preferences
    deepWorkDuration: 90, // minutes
    breakFrequency: 25, // minutes (pomodoro-style)
    preferUninterrupted: true,
    defaultReminder: 15, // minutes (new setting)

    // Category Priorities (1-5 ranking)
    categoryRanking: {
      work: 5,
      health: 4,
      personal: 3,
      learning: 3,
      social: 2
    },

    // Time Block Preferences
    morningFocus: 'deep_work', // 'deep_work' | 'meetings' | 'light_tasks' | 'flexible'
    afternoonFocus: 'meetings',
    eveningFocus: 'light_tasks',

    // AI Behavior
    autoReschedule: true, // "Smart Rescheduling (Requires user approval via chat w/ diff view, or manual placement)"
    smartReminders: true,
    conflictResolution: 'priority' // 'priority' | 'chronological' | 'ask'
  });

  // Load priority preferences on mount
  useEffect(() => {
    const loadPriorityPrefs = async () => {
      let stored = localStorage.getItem('calai-priority-prefs');
      if (stored) {
        setPriorityPrefs(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
      if (user) {
        try {
          const userData = await firebaseService.getUserData();
          if (userData?.priorityPrefs) {
            setPriorityPrefs(prev => ({ ...prev, ...userData.priorityPrefs }));
          }
        } catch { /* silent */ }
      }
    };
    if (isOpen) loadPriorityPrefs();
  }, [isOpen, user]);

  // Save priority preferences
  const savePriorityPrefs = async (newPrefs) => {
    setPriorityPrefs(newPrefs);
    localStorage.setItem('calai-priority-prefs', JSON.stringify(newPrefs));
    if (user) {
      try {
        await firebaseService.saveUserData({ priorityPrefs: newPrefs });
      } catch { /* silent */ }
    }
  };

  const updatePriorityPref = (key, value) => {
    const newPrefs = { ...priorityPrefs, [key]: value };
    savePriorityPrefs(newPrefs);
  };

  const { events, addEvent, deleteEventsByFilter } = useEvents();

  const tabs = [
    { id: 'account', label: 'Account', icon: User, color: '#6366f1' },
    { id: 'ai', label: 'Intelligence', icon: Cpu, color: '#8b5cf6' },
    { id: 'preferences', label: 'Config', icon: Zap, color: '#f59e0b' },
    { id: 'packs', label: 'Packs', icon: CalendarIcon, color: '#10b981' },
    { id: 'sync', label: 'Sync', icon: RefreshCw, color: '#06b6d4' },
    { id: 'data', label: 'Data', icon: Download, color: '#f43f5e' },
    { id: 'about', label: 'About', icon: Sparkles, color: '#ec4899' }
  ];

  // --- Initialization & Effects ---

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [testChatHistory]);

  // Calculate Storage Usage
  const [storageStats, setStorageStats] = useState({ size: 0, unit: 'B', percent: 0 });
  useEffect(() => {
    if (!events) return;
    const json = JSON.stringify(events);
    const bytes = new Blob([json]).size; // More accurate byte size

    let size = bytes;
    let unit = 'B';
    if (size > 1024 * 1024) {
      size = (size / (1024 * 1024)).toFixed(2);
      unit = 'MB';
    } else if (size > 1024) {
      size = (size / 1024).toFixed(2);
      unit = 'KB';
    } else {
      unit = 'B';
    }

    // Assuming 50MB "quota" for free tier/local storage safety
    const quota = 50 * 1024 * 1024;
    const percent = Math.min(100, (bytes / quota) * 100);

    setStorageStats({ size, unit, percent, rawBytes: bytes });
  }, [events, isOpen]);

  useEffect(() => {
    googleCalendarService.initialize().catch((error) => logger.error('GCal init error', { error }));
    const loadApiKey = async () => {
      if (user) {
        const savedKey = await firebaseService.getApiKey();
        if (savedKey) {
          savedApiKeyRef.current = savedKey;
          setHasSavedApiKey(true);
          if (aiProvider === 'gemini') {
            geminiService.initialize(savedKey);
            setConnectionStatus('success');
          }
          return;
        }
        setHasSavedApiKey(false);
      }
    };
    loadApiKey();
  }, [user, aiProvider]);

  useEffect(() => {
    setIsLocalBrainLoaded(localBrainService.isLoaded);
    if (localBrainService.getPreferLocal()) {
      setAiProvider('local');
    } else {
      setAiProvider('gemini');
    }
  }, [isOpen]);

  // Sync provider selection with service
  const handleProviderChange = (provider) => {
    setAiProvider(provider);
    if (provider === 'local') {
      localBrainService.setPreferLocal(true);
    } else {
      localBrainService.setPreferLocal(false);
    }
  };

  // --- Handlers ---

  const handleInitLocalBrain = async () => {
    try {
      setLocalBrainProgress({ text: "Initializing...", progress: 0 });
      await localBrainService.initialize((report) => {
        setLocalBrainProgress(report);
      });
      setIsLocalBrainLoaded(true);
      setLocalBrainProgress(null);
      toastService.success("Local Brain Ready!");
    } catch (error) {
      logger.error('Failed to load local brain', { error });
      toastService.error("Failed to load: " + error.message);
      setLocalBrainProgress(null);
    }
  };

  const handleUnloadBrain = async () => {
    await localBrainService.unload();
    setIsLocalBrainLoaded(false);
    toastService.info("Local brain unloaded.");
  };

  const testGeminiConnection = async () => {
    const keyToTest = apiKey.trim() || savedApiKeyRef.current;
    if (!keyToTest) return;
    setConnectionStatus(null);
    geminiService.initialize(keyToTest);
    try {
      const result = await geminiService.testConnection();
      if (result.success) {
        setConnectionStatus('success');
        toastService.success('Gemini Connected');
      }
    } catch (error) {
      setConnectionStatus('error');
      toastService.error(error.message);
    }
  };

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;
    try {
      if (user) await firebaseService.saveApiKey(trimmedKey);
      savedApiKeyRef.current = trimmedKey;
      setHasSavedApiKey(true);
      setApiKey('');
      setShowApiKey(false);
      await testGeminiConnection();
      toastService.success('API Key saved!');
    } catch {
      toastService.error('Failed to save key');
    }
  };

  const handleTestChatSubmit = async (e) => {
    e.preventDefault();
    if (!testChatInput.trim() || isChatProcessing) return;

    const message = testChatInput.trim();
    setTestChatInput('');
    setIsChatProcessing(true);

    const userMsg = { id: Date.now() + 'u', role: 'user', content: message };
    setTestChatHistory(prev => [...prev, userMsg]);

    try {
      let response = '';
      if (aiProvider === 'gemini') {
        if (!savedApiKeyRef.current && !apiKey) throw new Error("Gemini API Key missing");
        // FIX: Use the initialized service models instead of creating a new instance with hardcoded 'gemini-pro'
        const model = geminiService.modelFlash || geminiService.modelPro;

        if (model) {
          const result = await model.generateContent(message);
          response = result.response.text();
        } else {
          // Fallback: If service isn't fully ready but we have key, try init
          geminiService.initialize(savedApiKeyRef.current || apiKey);
          const fallbackModel = geminiService.modelFlash;
          if (fallbackModel) {
            const result = await fallbackModel.generateContent(message);
            response = result.response.text();
          } else {
            response = "Gemini service could not be initialized. Please check API Key.";
          }
        }
      }
      else if (aiProvider === 'ollama') {
        response = await chatOllama(
          [{ role: 'system', content: `You are a helpful calendar assistant. Your personality is: ${aiPersonality}` }, ...testChatHistory, userMsg],
          { baseUrl: ollamaConfig.baseUrl, model: ollamaConfig.model }
        );
      } else {
        if (!isLocalBrainLoaded) throw new Error("Local Brain not loaded");
        response = await localBrainService.chat(message, "You are a helpful assistant.");
      }

      setTestChatHistory(prev => [...prev, { id: Date.now() + 'a', role: 'ai', content: response, provider: aiProvider }]);
    } catch (error) {
      setTestChatHistory(prev => [...prev, { id: Date.now() + 'e', role: 'error', content: error.message }]);
    } finally {
      setIsChatProcessing(false);
    }
  };

  // --- Other Handlers ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGCalConnected, setIsGCalConnected] = useState(false);
  const [pendingGCalEvents, setPendingGCalEvents] = useState([]);
  const [selectedGCalEvents, setSelectedGCalEvents] = useState(new Set());
  const [generalEventPacks, setGeneralEventPacks] = useState({});

  useEffect(() => {
    const loadGeneralEvents = async () => {
      const localStored = localStorage.getItem('calai-general-event-packs');
      let stored = localStored ? JSON.parse(localStored) : {};
      if (user) {
        const userData = await firebaseService.getUserData();
        if (userData?.generalEventPacks) {
          stored = userData.generalEventPacks;
        }
      }
      setGeneralEventPacks(stored || {});
    };
    if (isOpen) {
      loadGeneralEvents();
    }
  }, [isOpen, user]);

  const handleToggleGeneralPack = async (packId, enabled) => {
    const updated = { ...generalEventPacks, [packId]: enabled };
    setGeneralEventPacks(updated);
    localStorage.setItem('calai-general-event-packs', JSON.stringify(updated));
    if (user) {
      await firebaseService.saveUserData({ generalEventPacks: updated });
    }

    if (enabled) {
      const currentYear = new Date().getFullYear();
      const generated = buildGeneralEvents(packId, [currentYear, currentYear + 1]);
      const existingKeys = new Set(events.map(event => `${event.title}-${event.start}-${event.autoPack || ''}`));
      for (const event of generated) {
        const key = `${event.title}-${event.start}-${event.autoPack}`;
        if (!existingKeys.has(key)) {
          await addEvent(event, { allowConflicts: true, skipConflictCheck: true, silent: true, skipNotifications: true });
        }
      }
      toastService.success('General events added to your calendar.');
      return;
    }

    deleteEventsByFilter(
      event => event.autoPack === packId,
      `General pack: ${packId}`,
      { skipConfirm: true, silent: true }
    );
    toastService.info('General events removed from your calendar.');
  };

  // Check Google Calendar connection on mount
  useEffect(() => {
    const checkGCalConnection = () => {
      const token = localStorage.getItem('gcal_access_token');
      setIsGCalConnected(!!token && googleCalendarService.isAuthorized);
    };
    checkGCalConnection();
  }, [isOpen]);

  const handleGoogleCalendarSync = async () => {
    setIsSyncing(true);
    try {
      await googleCalendarService.handleAuthClick();
      setIsGCalConnected(true);

      // Fetch events and show import selection
      setTimeout(async () => {
        try {
          const gEvents = await googleCalendarService.listUpcomingEvents();
          if (gEvents && gEvents.length > 0) {
            // Filter out already existing events
            const newEvents = gEvents.filter(evt =>
              !events.some(e => e.gcalId === evt.gcalId || (e.title === evt.title && e.start === evt.start))
            );

            if (newEvents.length > 0) {
              setPendingGCalEvents(newEvents);
              setSelectedGCalEvents(new Set(newEvents.map((_, i) => i))); // Select all by default
              toastService.info(`Found ${newEvents.length} events to import`);
            } else {
              toastService.success('Calendar synced - no new events');
            }
          } else {
            toastService.info('No events found in Google Calendar');
          }
        } catch (error) {
          logger.error('Failed to fetch Google Calendar events', { error });
          toastService.error('Failed to fetch events');
        } finally {
          setIsSyncing(false);
        }
      }, 1500);
    } catch (error) {
      logger.error('Google Calendar sync failed', { error });
      toastService.error('Sync failed');
      setIsSyncing(false);
    }
  };

  const handleImportSelectedEvents = () => {
    const eventsToImport = pendingGCalEvents.filter((_, i) => selectedGCalEvents.has(i));
    eventsToImport.forEach(evt => addEvent(evt));
    toastService.success(`Imported ${eventsToImport.length} events!`);
    setPendingGCalEvents([]);
    setSelectedGCalEvents(new Set());
  };

  const toggleEventSelection = (index) => {
    const newSelected = new Set(selectedGCalEvents);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedGCalEvents(newSelected);
  };

  const handleExportData = () => {
    const data = { events, exportDate: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastService.success('Calendar data exported successfully');
  };

  const handleExportICS = () => {
    try {
      downloadICS(events, `calendar-${new Date().toISOString().split('T')[0]}.ics`);
      toastService.success('Calendar exported as ICS file');
    } catch {
      toastService.error('Failed to export ICS file');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you absolutely sure? This will permanently delete your account and all calendar data. This action cannot be undone.')) {
      try {
        await firebaseService.deleteAccount();
        toastService.success('Account deleted successfully');
        onClose();
        window.location.reload(); // Refresh to clear state
      } catch (error) {
        logger.error('Failed to delete account', { error });
        toastService.error('Failed to delete account: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // --- Render Helpers ---

  const renderAITab = () => (
    <div className="content-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>

      {/* Part 1: Model Type Selection */}
      <div className="glass-card padding-lg">
        <div className="section-header mb-4">
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>1. Select Intelligence Engine</h3>
          <span className="text-muted text-xs">Choose the backend model for CalAI's brain</span>
        </div>
        <div className="provider-toggle" style={{ display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
          <button
            className={cn("provider-btn", aiProvider === 'gemini' && "active")}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', border: aiProvider === 'gemini' ? '1px solid var(--accent)' : '1px solid transparent', background: aiProvider === 'gemini' ? 'var(--accent)' : 'transparent', color: aiProvider === 'gemini' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => handleProviderChange('gemini')}
          >
            <Zap size={16} /> Gemini Pro
          </button>
          <button
            className={cn("provider-btn", aiProvider === 'ollama' && "active")}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', border: aiProvider === 'ollama' ? '1px solid var(--accent)' : '1px solid transparent', background: aiProvider === 'ollama' ? 'var(--accent)' : 'transparent', color: aiProvider === 'ollama' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => handleProviderChange('ollama')}
          >
            <Cpu size={16} /> Local Ollama
          </button>
          <button
            className={cn("provider-btn", aiProvider === 'local' && "active")}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', border: aiProvider === 'local' ? '1px solid var(--accent)' : '1px solid transparent', background: aiProvider === 'local' ? 'var(--accent)' : 'transparent', color: aiProvider === 'local' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => handleProviderChange('local')}
          >
            <Globe size={16} /> Browser WebGPU
          </button>
        </div>
      </div>

      {/* Part 2: API Key / System Configuration */}
      <div className="glass-card padding-lg">
        <div className="section-header mb-4">
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>2. Connection & Authentication</h3>
          <span className="text-muted text-xs">Configure your selected provider</span>
        </div>

        {aiProvider === 'gemini' && (
          <AnimatePresence mode="wait">
            <MotionDiv
              key={connectionStatus === 'success' ? 'connected' : 'setup'}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              {connectionStatus === 'success' && hasSavedApiKey ? (
                <div style={{ padding: '20px', borderRadius: '12px', background: 'linear-gradient(145deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.1) 100%)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="status-indicator-glow"><div className="dot"></div></div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Engine Online</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Key size={12} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>••••••••••••••••{savedApiKeyRef.current?.slice(-4) || 'TEST'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={testGeminiConnection} className="icon-action-btn" title="Test Connection"><RefreshCw size={16} /></button>
                    <button onClick={() => { setConnectionStatus(null); setHasSavedApiKey(false); }} className="icon-action-btn danger" title="Disconnect"><LogOut size={16} /></button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '0 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Key size={16} className="text-accent" style={{ opacity: 0.7 }} />
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your Gemini AI Studio Key"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '12px', width: '100%', outline: 'none', fontSize: '0.9rem' }}
                        autoComplete="off"
                      />
                      <button onClick={() => setShowApiKey(!showApiKey)} className="icon-btn hover-bg">
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!apiKey.trim()}
                      className="premium-btn"
                      style={{ padding: '0 24px', borderRadius: '8px', background: 'var(--accent)', color: 'white', fontWeight: 600, border: 'none', cursor: apiKey.trim() ? 'pointer' : 'not-allowed', opacity: apiKey.trim() ? 1 : 0.5 }}
                    >Authenticate</button>
                  </div>
                </div>
              )}
            </MotionDiv>
          </AnimatePresence>
        )}

        {aiProvider === 'ollama' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '20px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Model Name</label>
                <input value={ollamaConfig.model} onChange={(e) => setOllamaConfig(prev => ({ ...prev, model: e.target.value }))} placeholder="e.g. llama3, mistral" style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Base URL</label>
                <input value={ollamaConfig.baseUrl} onChange={(e) => setOllamaConfig(prev => ({ ...prev, baseUrl: e.target.value }))} placeholder="http://localhost:11434" style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>
            <button onClick={async () => { const connected = await checkOllamaConnection(ollamaConfig.baseUrl); toastService[connected ? 'success' : 'error'](connected ? 'Ollama Connected!' : 'Connection Failed'); }} style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>Test Connection</button>
          </div>
        )}

        {aiProvider === 'local' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}>
            <div style={{ flex: 1 }}>
              <select disabled={!isLocalBrainLoaded} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none' }}>
                <option>Qwen 2.5 (3B) - Optimized</option>
                <option>Llama 3 (Tiny) - Legacy</option>
              </select>
            </div>
            <div style={{ marginLeft: '16px' }}>
              {!isLocalBrainLoaded ? (
                <button onClick={handleInitLocalBrain} disabled={localBrainProgress} style={{ padding: '12px 24px', borderRadius: '8px', background: 'var(--accent)', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  {localBrainProgress ? `${Math.round(localBrainProgress.progress * 100)}%` : 'Load Model'}
                </button>
              ) : (
                <button onClick={handleUnloadBrain} style={{ padding: '12px 24px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>Unload Model</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Part 3: Personality Choice */}
      <div className="glass-card padding-lg">
        <div className="section-header mb-4">
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>3. Assistant Tone & Personality</h3>
          <span className="text-muted text-xs">How should Cal AI respond to you?</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { id: 'professional', label: 'Professional', desc: 'Direct, formal, structured.' },
            { id: 'your-bff', label: 'Best Friend', desc: 'Warm, supportive, casual.' },
            { id: 'creative', label: 'Creative', desc: 'Witty, lateral thinker.' },
            { id: 'spicy', label: 'Spicy / Edgy', desc: 'Sarcastic, humorous.' }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setAiPersonality(p.id)}
              style={{
                padding: '16px 12px', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer',
                background: aiPersonality === p.id ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.2)',
                border: aiPersonality === p.id ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
              }}
            >
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: aiPersonality === p.id ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: '8px' }}>{p.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Part 4: Testing Chat */}
      <div className="glass-card padding-lg">
        <div className="section-header mb-4">
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>4. Sandbox Test</h3>
          <span className="text-muted text-xs">Verify your connection and personality logic</span>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
          <div ref={chatScrollRef} style={{ height: '240px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testChatHistory.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px' }}>
                <MessageSquare size={24} opacity={0.5} />
                <span style={{ fontSize: '0.9rem' }}>Say hello to test your configuration.</span>
              </div>
            )}
            {testChatHistory.map(msg => (
              <div key={msg.id} style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: '12px', fontSize: '0.9rem', lineHeight: 1.4,
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '12px'
              }}>
                {msg.content}
              </div>
            ))}
            {isChatProcessing && <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Typing...</div>}
          </div>
          <form onSubmit={handleTestChatSubmit} style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <input
              value={testChatInput}
              onChange={e => setTestChatInput(e.target.value)}
              placeholder="Send a test message..."
              disabled={isChatProcessing || (aiProvider === 'local' && !isLocalBrainLoaded)}
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
            />
            <button type="submit" disabled={!testChatInput.trim() || isChatProcessing || (aiProvider === 'local' && !isLocalBrainLoaded)} style={{ background: 'transparent', border: 'none', padding: '0 20px', color: 'var(--accent)', cursor: (!testChatInput.trim() || isChatProcessing) ? 'not-allowed' : 'pointer', opacity: (!testChatInput.trim() || isChatProcessing) ? 0.5 : 1 }}>
              <Zap size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="settings-overlay"
        onClick={onClose}
      >
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="settings-modal pro-theme"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mesh-gradient"></div>

          <aside className="settings-sidebar">
            <div className="sidebar-header">
              <div className="logo-glow">
                <CalendarIcon size={24} color="#6366f1" />
              </div>
              <span>CalAI</span>
            </div>
            <nav className="sidebar-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  style={{ '--accent-color': tab.color }}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <MotionDiv layoutId="active-pill" className="active-pill" />
                  )}
                </button>
              ))}
            </nav>
            <div className="sidebar-footer">
              <button onClick={logout} className="logout-button">
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          <main className="settings-main">
            <header className="main-header">
              <div className="header-info">
                <h2>{tabs.find(t => t.id === activeTab)?.label}</h2>
              </div>
              <button onClick={onClose} className="close-button-alt">
                <X size={20} />
              </button>
            </header>

            <div className="tab-content-wrapper">
              <AnimatePresence mode="wait">
                <MotionDiv
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="tab-content height-100"
                >
                  {activeTab === 'ai' && renderAITab()}

                  {activeTab === 'data' && (
                    <div className="content-section">
                      <div className="glass-card padding-lg">
                        <h3>Data Export</h3>
                        <p className="text-muted">Download your calendar data to use elsewhere.</p>

                        <div className="storage-metric mt-4 mb-4" style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                            <span>Storage Used</span>
                            <span style={{ color: '#6366f1' }}>{storageStats.size} {storageStats.unit}</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(1, storageStats.percent)}%` }}
                              style={{ height: '100%', background: '#6366f1' }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span>Local Events: {events.length}</span>
                            <span>~50MB Limit</span>
                          </div>
                        </div>

                        <div className="actions-row mt-4">
                          <button onClick={handleExportData} className="feature-btn">
                            <CloudDownloadOutlined /> JSON
                          </button>
                          <button onClick={handleExportICS} className="feature-btn">
                            <EventNoteOutlined /> ICS
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'packs' && (
                    <div className="content-section">
                      <div className="glass-card padding-lg">
                        <h3>Calendar Packs</h3>
                        <p className="text-muted">Add curated event collections to your calendar automatically.</p>
                      </div>

                      <div className="packs-grid mt-4">
                        {GENERAL_EVENT_PACKS.map(pack => (
                          <div key={pack.id} className={`pack-card glass-card ${generalEventPacks[pack.id] ? 'active' : ''}`}>
                            <div className="pack-header">
                              <div className="pack-icon-wrapper">
                                {pack.id === 'us-holidays' && <img src="/icons/us-holidays.png" alt="US Holidays" className="pack-img-icon" />}
                                {pack.id === 'nfl-season' && <img src="/icons/nfl-season.png" alt="NFL" className="pack-img-icon" />}
                                {pack.id === 'nba-season' && <img src="/icons/nba-season.png" alt="NBA" className="pack-img-icon" />}
                                {pack.id === 'moon-phases' && <img src="/icons/moon-phases.png" alt="Moon" className="pack-img-icon" />}
                              </div>
                              <button
                                className={`pack-add-btn ${generalEventPacks[pack.id] ? 'added' : ''}`}
                                onClick={() => handleToggleGeneralPack(pack.id, !generalEventPacks[pack.id])}
                              >
                                {generalEventPacks[pack.id] ? '✓ Added' : '+ Add'}
                              </button>
                            </div>
                            <div className="pack-body">
                              <h4>{pack.label}</h4>
                              <p>{pack.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="info-box mt-4 neutral">
                        <CalendarIcon size={16} />
                        <p>Toggle packs to automatically populate your calendar.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'about' && (
                    <div className="content-section center-content">
                      <div className="about-minimal">
                        <CalendarIcon size={48} color="#6366f1" />
                        <h2>CalAI</h2>
                        <span className="version-tag">{appVersion}</span>
                        <p className="tagline">Intelligent Scheduling.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'account' && (
                    <div className="content-section">
                      <div className="glass-card padding-lg">
                        <div className="user-profile-header">
                          <div className="avatar-large">
                            {user?.photoURL ? <img src={user.photoURL} alt="User" /> : user?.email?.charAt(0)}
                          </div>
                          <div>
                            <h3>{user?.displayName || 'User'}</h3>
                            <p className="text-muted">{user?.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* User Stats Section */}
                      <div className="glass-card padding-lg">
                        <h4 className="mb-4">Your Stats</h4>
                        <div className="user-stats-grid">
                          <div className="stat-item">
                            <span className="stat-value">{events.length}</span>
                            <span className="stat-label">Lifetime Events</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-value">{storageStats.size} {storageStats.unit}</span>
                            <span className="stat-label">Storage Used</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-value">{Math.round((Date.now() - (user?.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now())) / (1000 * 60 * 60 * 24))}d</span>
                            <span className="stat-label">Days Active</span>
                          </div>
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="glass-card padding-lg">
                        <h4 className="mb-2">Account</h4>
                        <p className="text-muted text-sm mb-3">Manage your account settings and data.</p>
                        <div className="account-actions">
                          <button
                            className="btn btn-outline"
                            onClick={handleExportData}
                          >
                            Export My Data
                          </button>
                          <button
                            className="btn btn-danger-outline"
                            onClick={handleDeleteAccount}
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'preferences' && (
                    <div className="content-section preferences-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                      {/* Section: Work Rhythm */}
                      <div className="glass-card padding-lg">
                        <div className="section-header mb-4">
                          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '4px' }}>My Work Rhythm</h3>
                        </div>

                        <div className="rhythm-grid" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                          {/* Peak Energy */}
                          <div className="rhythm-item">
                            <label className="rhythm-label" style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 500 }}>When I'm most productive</label>
                            <div className="energy-blocks" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                              {[
                                { id: 'morning', icon: '☀️', label: 'Morning' },
                                { id: 'afternoon', icon: '🌤️', label: 'Afternoon' },
                                { id: 'evening', icon: '🌙', label: 'Evening' }
                              ].map(time => (
                                <button
                                  key={time.id}
                                  className={`energy-block ${priorityPrefs?.peakEnergyTime === time.id ? 'active' : ''}`}
                                  style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    padding: '16px 8px', borderRadius: '12px',
                                    background: priorityPrefs?.peakEnergyTime === time.id ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.2)',
                                    border: `1px solid ${priorityPrefs?.peakEnergyTime === time.id ? 'var(--accent)' : 'var(--glass-border)'}`,
                                    cursor: 'pointer', transition: 'all 0.2s', gap: '8px'
                                  }}
                                  onClick={() => updatePriorityPref('peakEnergyTime', time.id)}
                                >
                                  <span className="energy-icon" style={{ fontSize: '1.5rem' }}>{time.icon}</span>
                                  <span className="energy-name" style={{ fontSize: '0.9rem', color: priorityPrefs?.peakEnergyTime === time.id ? 'var(--text-primary)' : 'var(--text-muted)' }}>{time.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Focus Duration */}
                          <div className="rhythm-item">
                            <label className="rhythm-label" style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 500 }}>How long I can focus</label>
                            <div className="focus-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {[
                                { value: 25, label: 'Short bursts', desc: '25 min' },
                                { value: 45, label: 'Medium blocks', desc: '45 min' },
                                { value: 90, label: 'Deep sessions', desc: '90 min' }
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  className={`focus-option ${priorityPrefs.deepWorkDuration === opt.value ? 'active' : ''}`}
                                  style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '16px', borderRadius: '12px',
                                    background: priorityPrefs?.deepWorkDuration === opt.value ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.2)',
                                    border: `1px solid ${priorityPrefs?.deepWorkDuration === opt.value ? 'var(--accent)' : 'var(--glass-border)'}`,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                  }}
                                  onClick={() => updatePriorityPref('deepWorkDuration', opt.value)}
                                >
                                  <span className="focus-label" style={{ fontSize: '0.95rem', color: priorityPrefs?.deepWorkDuration === opt.value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{opt.label}</span>
                                  <span className="focus-time" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{opt.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quick Auto-Settings Panel */}
                          <div className="rhythm-item" style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>Focus Protection enabled</label>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Smart reschedule and interruption handling</span>
                              </div>
                              <div style={{ color: 'var(--accent)', fontSize: '0.85rem', padding: '4px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: '20px' }}>Active</div>
                            </div>

                            <div style={{ marginTop: '20px' }}>
                              <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>Default reminder time</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {[5, 10, 15, 30].map(min => (
                                  <button
                                    key={min}
                                    style={{
                                      padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem',
                                      background: priorityPrefs.defaultReminder === min ? 'var(--accent)' : 'rgba(0,0,0,0.3)',
                                      color: priorityPrefs.defaultReminder === min ? '#fff' : 'var(--text-muted)',
                                      border: '1px solid var(--glass-border)', cursor: 'pointer'
                                    }}
                                    onClick={() => updatePriorityPref('defaultReminder', min)}
                                  >
                                    {min}m
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Appearance Toggle - moved here from Account */}
                      <div className="glass-card padding-lg mt-3">
                        <div className="quick-setting-row">
                          <div className="setting-info">
                            <span className="setting-name">Appearance</span>
                            <span className="setting-desc">{isDark ? 'Dark mode enabled' : 'Light mode enabled'}</span>
                          </div>
                          <button onClick={toggleTheme} className="theme-toggle-btn">
                            {isDark ? '🌙 Dark' : '☀️ Light'}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                  {/* End Priority Section */}                {activeTab === 'sync' && (
                    <div className="content-section">
                      <div className="glass-card padding-lg row-between">
                        <div className="flex-row gap-md">
                          <div className="icon-box google"><CalendarIcon /></div>
                          <div>
                            <h4>Google Calendar</h4>
                            <p className="text-muted">
                              {isGCalConnected ? '✓ Connected' : 'Two-way sync'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleGoogleCalendarSync}
                          disabled={isSyncing || isGCalConnected}
                          className={`btn-connect ${isGCalConnected ? 'connected' : ''}`}
                        >
                          {isSyncing ? 'Syncing...' : isGCalConnected ? '✓ Synced' : 'Connect'}
                        </button>
                      </div>

                      {/* Import Events Modal */}
                      {pendingGCalEvents.length > 0 && (
                        <div className="glass-card padding-lg mt-4">
                          <h4>Import Events from Google Calendar</h4>
                          <p className="text-muted mb-3">Select events to add to your calendar:</p>

                          <div className="gcal-import-list">
                            {pendingGCalEvents.map((evt, index) => (
                              <label
                                key={index}
                                className={`gcal-event-item ${selectedGCalEvents.has(index) ? 'selected' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedGCalEvents.has(index)}
                                  onChange={() => toggleEventSelection(index)}
                                />
                                <div className="event-info">
                                  <span className="event-title">{evt.title}</span>
                                  <span className="event-time">
                                    {new Date(evt.start).toLocaleDateString()} • {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </div>

                          <div className="actions-row mt-4">
                            <button
                              className="feature-btn"
                              onClick={() => {
                                setPendingGCalEvents([]);
                                setSelectedGCalEvents(new Set());
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn-connect"
                              onClick={handleImportSelectedEvents}
                              disabled={selectedGCalEvents.size === 0}
                            >
                              Import {selectedGCalEvents.size} Event{selectedGCalEvents.size !== 1 ? 's' : ''}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </MotionDiv>
              </AnimatePresence>
            </div>
          </main>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence >
  );
};

export default Settings;
