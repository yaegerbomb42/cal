import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Eye, EyeOff, ExternalLink, Download, Calendar as CalendarIcon, RefreshCw, CheckCircle, LogOut, User, Sparkles, MessageSquare, Clock, Cpu, Zap, Globe } from 'lucide-react';
import { CloudDownloadOutlined, EventNoteOutlined } from '@mui/icons-material';
import { geminiService } from '../../services/geminiService';
import { localBrainService } from '../../services/localBrainService';
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
  const [aiProvider, setAiProvider] = useState('gemini'); // 'gemini' | 'local'
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const savedApiKeyRef = useRef(null);

  // Local Brain State
  const [localBrainProgress, setLocalBrainProgress] = useState(null);
  const [isLocalBrainLoaded, setIsLocalBrainLoaded] = useState(false);

  // Chat Test State
  const [testChatInput, setTestChatInput] = useState('');
  const [testChatHistory, setTestChatHistory] = useState([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatScrollRef = useRef(null);
  const [appVersion, setAppVersion] = useState('v1.2.4-beta');

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
    autoReschedule: true,
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

  useEffect(() => {
    if (isOpen) {
      fetch('/version.json')
        .then(res => res.json())
        .then(data => setAppVersion(`v${data.version} (${data.commit})`))
        .catch(() => { });
    }
  }, [isOpen]);

  const { events, addEvent, deleteEventsByFilter } = useEvents();

  const tabs = [
    { id: 'account', label: 'Account', icon: User, color: '#6366f1' },
    { id: 'ai', label: 'AI Engine', icon: Cpu, color: '#8b5cf6' },
    { id: 'priority', label: 'Priority', icon: Zap, color: '#f59e0b' },
    { id: 'packs', label: 'Cal Packs', icon: CalendarIcon, color: '#10b981' },
    { id: 'sync', label: 'Sync', icon: RefreshCw, color: '#06b6d4' },
    { id: 'data', label: 'Storage', icon: Download, color: '#f43f5e' },
    { id: 'about', label: 'About', icon: Sparkles, color: '#ec4899' }
  ];

  // --- Initialization & Effects ---

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [testChatHistory]);

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

  // --- Render Helpers ---

  const renderAITab = () => (
    <div className="ai-engine-layout">
      <div className="ai-config-panel glass-card">
        <div className="provider-toggle">
          <button
            className={cn("provider-btn", aiProvider === 'gemini' && "active")}
            onClick={() => handleProviderChange('gemini')}
          >
            <Zap size={16} /> Gemini 3.0 Flash
          </button>
          <button
            className={cn("provider-btn", aiProvider === 'local' && "active")}
            onClick={() => handleProviderChange('local')}
          >
            <Cpu size={16} /> Local Brain
          </button>
        </div>

        {aiProvider === 'gemini' ? (
          <div className="config-body">
            <div className="api-input-row">
              <div className="input-wrapper">
                <Key size={14} className="input-icon" />
                <input
                  type={showApiKey ? "text" : "password"}
                  value={showApiKey ? apiKey : (apiKey || (hasSavedApiKey ? '•'.repeat(20) : ''))}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Gemini API Key"
                />
                <button onClick={() => setShowApiKey(!showApiKey)} className="icon-btn">
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button onClick={handleSaveApiKey} disabled={!apiKey.trim()} className="save-btn pro-btn-primary">Save</button>
            </div>
            <div className="status-row">
              {connectionStatus === 'success' ? (
                <span className="status-badge success"><CheckCircle size={12} /> Connected</span>
              ) : (
                <span className="status-badge neutral">Not connected</span>
              )}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" className="link-text">Get API Key</a>
            </div>
          </div>
        ) : (
          <div className="config-body">
            <div className="model-select-row">
              <div className="select-wrapper">
                <Globe size={14} className="select-icon" />
                <select disabled={!isLocalBrainLoaded}>
                  <option>Qwen 2.5 (3B) - Optimized</option>
                  <option>Llama 3 (Tiny) - Legacy</option>
                </select>
              </div>
              {!isLocalBrainLoaded ? (
                <button onClick={handleInitLocalBrain} className="load-btn pro-btn-secondary" disabled={localBrainProgress}>
                  {localBrainProgress ? `${Math.round(localBrainProgress.progress * 100)}%` : 'Load Model'}
                </button>
              ) : (
                <button onClick={handleUnloadBrain} className="unload-btn danger-link">Unload</button>
              )}
            </div>
            {isLocalBrainLoaded && <div className="status-row"><span className="status-badge success"><CheckCircle size={12} /> Model Loaded</span></div>}
          </div>
        )}
      </div>

      <div className="ai-chat-panel glass-card">
        <div className="chat-header">
          <span>Live Test Environment</span>
          <span className="badge">{aiProvider}</span>
        </div>
        <div className="chat-viewport" ref={chatScrollRef}>
          {testChatHistory.length === 0 && (
            <div className="empty-chat">
              <MessageSquare size={24} />
              <p>Test the {aiProvider === 'gemini' ? 'Gemini' : 'Local'} model live.</p>
            </div>
          )}
          {testChatHistory.map(msg => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {isChatProcessing && <div className="chat-bubble ai typing">...</div>}
        </div>
        <form onSubmit={handleTestChatSubmit} className="chat-input-area">
          <input
            value={testChatInput}
            onChange={e => setTestChatInput(e.target.value)}
            placeholder={`Message ${aiProvider === 'gemini' ? 'Gemini' : 'Local Brain'}...`}
            disabled={isChatProcessing || (aiProvider === 'local' && !isLocalBrainLoaded)}
          />
          <button type="submit" disabled={!testChatInput.trim() || isChatProcessing || (aiProvider === 'local' && !isLocalBrainLoaded)}>
            <Zap size={16} />
          </button>
        </form>
      </div>
    </div >
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
                          <div key={pack.id} className="pack-card glass-card">
                            <div className="pack-header">
                              <div className="pack-icon-wrapper">
                                <svg viewBox="0 0 24 24" width="36" height="36" className="holiday-pack-icon">
                                  <rect x="2" y="6" width="14" height="12" rx="2" fill="rgba(16, 185, 129, 0.3)" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1" />
                                  <rect x="5" y="4" width="14" height="12" rx="2" fill="rgba(99, 102, 241, 0.3)" stroke="rgba(99, 102, 241, 0.6)" strokeWidth="1" />
                                  <rect x="8" y="2" width="14" height="12" rx="2" fill="rgba(244, 63, 94, 0.3)" stroke="rgba(244, 63, 94, 0.6)" strokeWidth="1" />
                                  <text x="15" y="10" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold">★</text>
                                </svg>
                              </div>
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={!!generalEventPacks[pack.id]}
                                  onChange={(e) => handleToggleGeneralPack(pack.id, e.target.checked)}
                                />
                                <span className="toggle-slider" />
                              </label>
                            </div>
                            <div className="pack-body">
                              <h4>{pack.label}</h4>
                              <p>{pack.description}</p>
                            </div>
                            <div className="pack-status">
                              {generalEventPacks[pack.id]
                                ? <span className="status-active">✓ Active</span>
                                : <span className="status-inactive">Not added</span>
                              }
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="info-box mt-4 neutral">
                        <CalendarIcon size={16} />
                        <p>Toggle packs on to add events to your calendar. Toggle off to remove them.</p>
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

                      <div className="glass-card padding-lg row-between">
                        <div>
                          <h4>Appearance</h4>
                          <p className="text-muted">Switch between light and dark themes.</p>
                        </div>
                        <button onClick={toggleTheme} className="theme-toggle-large">
                          {isDark ? 'Dark Mode' : 'Light Mode'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'priority' && (
                    <div className="content-section priority-section">

                      {/* Section 1: Core AI Tuning - Minimal & Impactful */}
                      <div className="glass-card padding-lg">
                        <div className="section-header mb-4">
                          <h3>Focus Intelligence</h3>
                          <span className="status-badge active">AI-Powered</span>
                        </div>

                        <div className="priority-slider-group mb-4">
                          <div className="flex-row justify-between mb-2">
                            <label className="font-medium">Structure vs. Flexibility</label>
                            <span className="text-muted small">
                              {priorityPrefs.conflictResolution === 'priority' ? 'Strict Schedule' : 'Adaptive Flow'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={priorityPrefs.urgencyWeight} // Reusing urgency as main 'strictness' proxy for now
                            onChange={(e) => updatePriorityPref('urgencyWeight', parseInt(e.target.value))}
                            className="priority-slider"
                          />
                        </div>

                        <div className="flex-row gap-lg mt-4">
                          {/* Peak Energy Selection */}
                          <div className="flex-1">
                            <label className="block mb-3 font-medium text-sm">Peak Energy</label>
                            <div className="energy-blocks compact">
                              {['morning', 'afternoon', 'evening'].map(time => (
                                <button
                                  key={time}
                                  className={`energy-block mini ${priorityPrefs.peakEnergyTime === time ? 'peak' : ''}`}
                                  onClick={() => updatePriorityPref('peakEnergyTime', time)}
                                  title={`I work best in the ${time}`}
                                >
                                  <span className="text-lg">
                                    {time === 'morning' && '☀️'}
                                    {time === 'afternoon' && '🌤️'}
                                    {time === 'evening' && '🌙'}
                                  </span>
                                  <span className="energy-label capitalize">{time}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Work Context Switch */}
                          <div className="flex-1">
                            <label className="block mb-3 font-medium text-sm">Focus Duration</label>
                            <div className="focus-toggle-group">
                              <button
                                className={`toggle-btn ${priorityPrefs.deepWorkDuration <= 45 ? 'selected' : ''}`}
                                onClick={() => updatePriorityPref('deepWorkDuration', 45)}
                              >
                                Sprints (45m)
                              </button>
                              <button
                                className={`toggle-btn ${priorityPrefs.deepWorkDuration > 45 ? 'selected' : ''}`}
                                onClick={() => updatePriorityPref('deepWorkDuration', 90)}
                              >
                                Deep (90m)
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: AI Autonomy - Consolidated */}
                      <div className="glass-card padding-lg mt-3">
                        <div className="flex-row justify-between align-center mb-1">
                          <h4>AI Autonomy</h4>
                          <div className="flex-row gap-sm text-muted">
                            <Zap size={14} />
                            <span className="text-xs">Auto-Optimizing</span>
                          </div>
                        </div>

                        <div className="ai-behavior-grid compact mt-3">
                          <label className="ai-behavior-row">
                            <span className="flex-1">
                              <span className="block font-medium">Smart Reschedule</span>
                              <span className="text-muted text-xs">Move flexible tasks when higher priorities arise</span>
                            </span>
                            <div className="toggle-switch-wrapper">
                              <input
                                type="checkbox"
                                checked={priorityPrefs.autoReschedule}
                                onChange={(e) => updatePriorityPref('autoReschedule', e.target.checked)}
                              />
                              <span className="track">
                                <span className="thumb" />
                              </span>
                            </div>
                          </label>

                          <label className="ai-behavior-row">
                            <span className="flex-1">
                              <span className="block font-medium">Protect Deep Work</span>
                              <span className="text-muted text-xs">Automatically group meetings to save focus time</span>
                            </span>
                            <div className="toggle-switch-wrapper">
                              <input
                                type="checkbox"
                                checked={priorityPrefs.preferUninterrupted}
                                onChange={(e) => updatePriorityPref('preferUninterrupted', e.target.checked)}
                              />
                              <span className="track">
                                <span className="thumb" />
                              </span>
                            </div>
                          </label>
                          <label className="ai-behavior-row">
                            <span className="flex-1">
                              <span className="block font-medium">Default Reminder</span>
                              <span className="text-muted text-xs">Minutes before event</span>
                            </span>
                            <div className="flex-row align-center gap-sm">
                              <input
                                type="number"
                                min="0"
                                step="5"
                                value={priorityPrefs.defaultReminder || 15}
                                onChange={(e) => updatePriorityPref('defaultReminder', parseInt(e.target.value))}
                                className="pref-input compact"
                                style={{ width: '50px', padding: '4px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--settings-border)', borderRadius: '6px', color: 'var(--text-primary)' }}
                              />
                              <span className="text-xs text-muted">min</span>
                            </div>
                          </label>
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
                          disabled={isSyncing}
                          className={`btn-connect ${isGCalConnected ? 'connected' : ''}`}
                        >
                          {isSyncing ? 'Syncing...' : isGCalConnected ? 'Sync Now' : 'Connect'}
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
