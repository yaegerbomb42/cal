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
  const { theme, toggleTheme, isDark } = useTheme();
  const MotionDiv = motion.div;
  const [activeTab, setActiveTab] = useState('account');

  // AI State
  const [aiProvider, setAiProvider] = useState('gemini'); // 'gemini' | 'local'
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      fetch('/version.json')
        .then(res => res.json())
        .then(data => setAppVersion(`v${data.version} (${data.commit})`))
        .catch(err => console.log('Version fetch failed', err));
    }
  }, [isOpen]);

  const { events, addEvent, deleteEventsByFilter } = useEvents();

  const tabs = [
    { id: 'account', label: 'Account', icon: User, color: '#6366f1' },
    { id: 'ai', label: 'AI Engine', icon: Cpu, color: '#8b5cf6' },
    { id: 'sync', label: 'Sync', icon: RefreshCw, color: '#06b6d4' },
    { id: 'data', label: 'Storage', icon: Download, color: '#f43f5e' },
    { id: 'about', label: 'About', icon: Sparkles, color: '#10b981' }
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
    setIsTestingConnection(true);
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
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;
    setIsTestingConnection(true);
    try {
      if (user) await firebaseService.saveApiKey(trimmedKey);
      savedApiKeyRef.current = trimmedKey;
      setHasSavedApiKey(true);
      setApiKey('');
      setShowApiKey(false);
      await testGeminiConnection();
      toastService.success('API Key saved!');
    } catch (error) {
      toastService.error('Failed to save key');
    } finally {
      setIsTestingConnection(false);
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
        const model = geminiService.genAI?.getGenerativeModel({ model: "gemini-pro" });
        if (model) {
          const result = await model.generateContent(message);
          response = result.response.text();
        } else {
          response = "Gemini service not fully initialized.";
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

  const handleGoogleCalendarSync = async () => {
    setIsSyncing(true);
    try {
      await googleCalendarService.handleAuthClick();
      setTimeout(async () => {
        try {
          const gEvents = await googleCalendarService.listUpcomingEvents();
          if (gEvents && gEvents.length > 0) {
            gEvents.forEach(evt => {
              const exists = events.some(e => e.gcalId === evt.gcalId || (e.title === evt.title && e.start === evt.start));
              if (!exists) addEvent(evt);
            });
            toastService.success(`Synced ${gEvents.length} events!`);
          }
        } catch (error) {
          logger.error('Failed to sync Google Calendar events', { error });
        } finally {
          setIsSyncing(false);
        }
      }, 2000);
    } catch (error) {
      logger.error('Google Calendar sync failed', { error });
      toastService.error('Sync failed');
      setIsSyncing(false);
    }
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
            <Zap size={16} /> Gemini Pro
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
                        <div className="actions-row mt-4">
                          <button onClick={handleExportData} className="feature-btn">
                            <CloudDownloadOutlined /> JSON
                          </button>
                          <button onClick={handleExportICS} className="feature-btn">
                            <EventNoteOutlined /> ICS
                          </button>
                        </div>
                      </div>

                      <div className="info-box" style={{ marginTop: '16px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        <div>
                          <h4>General Event Packs</h4>
                          <p>Auto-add curated event collections like holidays.</p>
                        </div>
                      </div>

                      <div className="general-event-list">
                        {GENERAL_EVENT_PACKS.map(pack => (
                          <div key={pack.id} className="general-event-item">
                            <div className="pack-info">
                              <h6>{pack.label}</h6>
                              <p>{pack.description}</p>
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
                        ))}
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

                  {activeTab === 'sync' && (
                    <div className="content-section">
                      <div className="glass-card padding-lg row-between">
                        <div className="flex-row gap-md">
                          <div className="icon-box google"><CalendarIcon /></div>
                          <div>
                            <h4>Google Calendar</h4>
                            <p className="text-muted">Two-way sync</p>
                          </div>
                        </div>
                        <button
                          onClick={handleGoogleCalendarSync}
                          disabled={isSyncing}
                          className="btn-connect"
                        >
                          {isSyncing ? 'Syncing...' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  )}

                </MotionDiv>
              </AnimatePresence>
            </div>
          </main>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default Settings;
