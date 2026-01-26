import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Eye, EyeOff, ExternalLink, Download, Calendar as CalendarIcon, RefreshCw, CheckCircle, LogOut, User, Sparkles, MessageSquare, Clock } from 'lucide-react';
import { CloudDownloadOutlined, DeleteOutline, DeleteSweepOutlined, EventNoteOutlined } from '@mui/icons-material';
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

const Settings = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const MotionDiv = motion.div;
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const savedApiKeyRef = useRef(null);

  // Google Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // Local Brain State
  const [localBrainProgress, setLocalBrainProgress] = useState(null);
  const [isLocalBrainLoaded, setIsLocalBrainLoaded] = useState(false);
  const [preferLocalBrain, setPreferLocalBrain] = useState(false);
  const [localBrainTestStatus, setLocalBrainTestStatus] = useState('idle');
  const [localBrainTestResult, setLocalBrainTestResult] = useState('');
  const [localBrainTestInput, setLocalBrainTestInput] = useState('');
  const [localBrainChatHistory, setLocalBrainChatHistory] = useState([]);
  const [localBrainNow, setLocalBrainNow] = useState(() => new Date());
  const [storageMeta, setStorageMeta] = useState({ count: 0, lastUpdated: null });
  const [generalEventPacks, setGeneralEventPacks] = useState({});

  const handleInitLocalBrain = async () => {
    try {
      setLocalBrainProgress({ text: "Starting...", progress: 0 });
      await localBrainService.initialize((report) => {
        setLocalBrainProgress(report);
      });
      setIsLocalBrainLoaded(true);
      setLocalBrainProgress(null);
      toastService.success("Offline Backup Brain Ready!");
    } catch (error) {
      logger.error('Failed to load offline brain', { error });
      toastService.error("Failed to load offline brain: " + error.message);
      setLocalBrainProgress(null);
    }
  };

  const handleUnloadBrain = async () => {
    await localBrainService.unload();
    setIsLocalBrainLoaded(false);
    toastService.info("Offline brain unloaded to free memory.");
  };

  const handlePreferLocalBrain = (enabled) => {
    setPreferLocalBrain(enabled);
    localBrainService.setPreferLocal(enabled);
    if (enabled && !localBrainService.isLoaded) {
      toastService.info("Load the Offline Brain to route chats locally.");
    }
  };

  const handleLocalBrainTest = async () => {
    if (!localBrainService.isLoaded) {
      toastService.error("Offline Brain isn't loaded yet.");
      return;
    }
    setLocalBrainTestStatus('loading');
    setLocalBrainTestResult('');
    try {
      const response = await localBrainService.chat(
        'Write a friendly one-sentence confirmation that the local model is working.',
        'You are Cal, a friendly calendar assistant.'
      );
      setLocalBrainTestResult(response);
      setLocalBrainTestStatus('success');
    } catch (error) {
      logger.error('Offline Brain test failed', { error });
      setLocalBrainTestStatus('error');
      toastService.error('Offline Brain test failed: ' + error.message);
    }
  };

  const [activeTab, setActiveTab] = useState('account');
  const { events, addEvent, deleteEventsByFilter } = useEvents();

  const tabs = [
    { id: 'account', label: 'Account', icon: User, color: '#6366f1' },
    { id: 'ai', label: 'AI Engine', icon: Sparkles, color: '#8b5cf6' },
    { id: 'sync', label: 'Sync', icon: RefreshCw, color: '#06b6d4' },
    { id: 'data', label: 'Storage', icon: Download, color: '#f43f5e' },
    { id: 'about', label: 'About', icon: CheckCircle, color: '#10b981' }
  ];

  const testConnection = async (keyOverride) => {
    const candidateKey = (keyOverride ?? apiKey).trim();
    const keyToTest = candidateKey || savedApiKeyRef.current;
    if (!keyToTest) {
      toastService.error('Add a Gemini API key to test the connection.');
      return;
    }
    setIsTestingConnection(true);
    setConnectionStatus(null);
    geminiService.initialize(keyToTest);
    try {
      const result = await geminiService.testConnection();
      if (result.success) {
        setConnectionStatus('success');
        toastService.success('Connection successful: ' + result.message);
      }
    } catch (error) {
      logger.error('Connection test failed', { error });
      setConnectionStatus('error');
      toastService.error(error.message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    googleCalendarService.initialize().catch((error) => logger.error('GCal init error', { error }));
    const loadApiKey = async () => {
      if (user) {
        const savedKey = await firebaseService.getApiKey();
        if (savedKey) {
          savedApiKeyRef.current = savedKey;
          setHasSavedApiKey(true);
          testConnection(savedKey);
          return;
        }
        setHasSavedApiKey(false);
      }
    };
    loadApiKey();
  }, [user]);

  useEffect(() => {
    setIsLocalBrainLoaded(localBrainService.isLoaded);
    setPreferLocalBrain(localBrainService.getPreferLocal());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLocalBrainNow(new Date());
  }, [isOpen]);

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

  useEffect(() => {
    const updateStorageMeta = () => {
      const stored = localStorage.getItem('calendar-events');
      const parsed = stored ? JSON.parse(stored) : [];
      const lastUpdated = localStorage.getItem('calendar-events-updated');
      setStorageMeta({
        count: parsed.length,
        lastUpdated: lastUpdated ? new Date(lastUpdated) : null
      });
    };
    if (isOpen) {
      updateStorageMeta();
    }
  }, [isOpen, events]);

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

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;
    setIsTestingConnection(true);
    try {
      if (user) {
        await firebaseService.saveApiKey(trimmedKey);
      }
      savedApiKeyRef.current = trimmedKey;
      setHasSavedApiKey(true);
      setApiKey('');
      setShowApiKey(false);
      await testConnection(trimmedKey);
      toastService.success('API Key saved successfully!');
    } catch (error) {
      logger.error('Failed to save API key', { error });
      toastService.error('Failed to save API key');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const maskedApiValue = showApiKey
    ? apiKey
    : apiKey || (hasSavedApiKey ? '********' : '');

  const handleApiKeyChange = (value) => {
    if (!showApiKey && hasSavedApiKey && value.includes('*')) {
      const cleaned = value.replace(/\*/g, '');
      setApiKey(cleaned);
      return;
    }
    setApiKey(value);
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

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all calendar data? This action cannot be undone.')) {
      localStorage.removeItem('calendar-events');
      localStorage.removeItem('calendar-events-updated');
      window.location.reload();
    }
  };

  const handleLocalBrainChatSubmit = async (event) => {
    event.preventDefault();
    if (!localBrainTestInput.trim()) return;
    if (!localBrainService.isLoaded) {
      toastService.error("Offline Brain isn't loaded yet.");
      return;
    }
    const message = localBrainTestInput.trim();
    const timestamp = new Date();
    const nonce = Math.random().toString(36).slice(2, 8);
    setLocalBrainChatHistory(prev => [
      ...prev,
      { id: `${timestamp.getTime()}-user`, role: 'user', content: message, timestamp }
    ]);
    setLocalBrainTestInput('');
    setLocalBrainTestStatus('loading');
    try {
      const response = await localBrainService.chat(
        `${message}\n\nInclude this nonce in your reply: ${nonce}`,
        'You are Cal, a friendly calendar assistant. Include the nonce exactly as provided.'
      );
      setLocalBrainChatHistory(prev => [
        ...prev,
        {
          id: `${Date.now()}-ai`,
          role: 'ai',
          content: response,
          timestamp: new Date(),
          model: localBrainService.type || 'local'
        }
      ]);
      setLocalBrainTestStatus('success');
    } catch (error) {
      logger.error('Offline Brain chat failed', { error });
      setLocalBrainTestStatus('error');
      toastService.error('Offline Brain test failed: ' + error.message);
    }
  };

  const handleDeleteByName = () => {
    const nameToDelete = prompt("Enter the exact name of the events you want to delete (e.g., 'Happy Birthday'):");
    if (!nameToDelete || !nameToDelete.trim()) return;

    const count = events.filter(e => e.title?.toLowerCase() === nameToDelete.trim().toLowerCase()).length;

    if (count === 0) {
      toastService.info(`No events found with name "${nameToDelete}"`);
      return;
    }

    if (window.confirm(`Found ${count} events named "${nameToDelete}". Are you sure you want to delete ALL of them? This action cannot be undone.`)) {
      deleteEventsByFilter(e => e.title?.toLowerCase() === nameToDelete.trim().toLowerCase(), `"${nameToDelete}"`);
    }
  };

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
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="settings-modal pro-theme"
        >
          <div className="mesh-gradient"></div>

          <aside className="settings-sidebar">
            <div className="sidebar-header">
              <div className="logo-glow">
                <CalendarIcon size={24} color="#6366f1" />
              </div>
              <span>CalAI Settings</span>
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
                    <MotionDiv
                      layoutId="active-pill"
                      className="active-pill"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
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
                <p>Manage your {activeTab} preferences and data.</p>
              </div>
              <button onClick={onClose} className="close-button-alt">
                <X size={20} />
              </button>
            </header>

            <div className="tab-content-wrapper">
              <AnimatePresence mode="wait">
                <MotionDiv
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="tab-content"
                >
                  {activeTab === 'account' && (
                    <div className="content-section">
                      <div className="pro-card">
                        <div className="pro-user-info">
                          <div className="pro-avatar">
                            {user?.photoURL ? <img src={user.photoURL} alt="" /> : user?.email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="pro-user-details">
                            <h3>{user?.displayName || 'User'}</h3>
                            <p>{user?.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="stats-row">
                        <div className="mini-stat">
                          <span className="val">{events.length}</span>
                          <span className="lbl">Total Events</span>
                        </div>
                        <div className="mini-stat">
                          <span className="val">{events.filter(e => new Date(e.start) > new Date()).length}</span>
                          <span className="lbl">Upcoming</span>
                        </div>
                        <div className="mini-stat">
                          <span className="val">Pro</span>
                          <span className="lbl">Engine</span>
                        </div>
                      </div>

                      <div className="pro-card theme-card">
                        <div>
                          <h4>Theme Preference</h4>
                          <p>Toggle light or dark mode across the workspace.</p>
                        </div>
                        <button
                          type="button"
                          onClick={toggleTheme}
                          className="theme-toggle-button"
                          aria-pressed={isDark}
                        >
                          <span className="theme-toggle-label">{isDark ? 'Dark' : 'Light'} Mode</span>
                          <span className="theme-toggle-meta">Current: {theme}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="content-section ai-settings">
                      <div className="ai-settings-grid">
                        <section className="ai-card">
                          <div className="ai-card-header">
                            <Sparkles size={20} className="sparkle-icon" />
                            <div>
                              <h4>Gemini Pro</h4>
                              <p>Connect Gemini to power scheduling, smart parsing, and assistant replies.</p>
                            </div>
                          </div>

                          <div className="form-group-alt">
                            <label>Gemini API Key</label>
                            <div className="pro-input-group">
                              <div className="input-container">
                                <Key size={16} className="input-icon-inner" />
                                <input
                                  type={showApiKey ? "text" : "password"}
                                  value={maskedApiValue}
                                  onChange={(e) => handleApiKeyChange(e.target.value)}
                                  placeholder={hasSavedApiKey ? "Stored securely in your account" : "sk-..."}
                                />
                                <button onClick={() => setShowApiKey(!showApiKey)} className="eye-toggle">
                                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                              <button
                                onClick={() => testConnection()}
                                disabled={(!apiKey.trim() && !hasSavedApiKey) || isTestingConnection}
                                className="pro-btn-secondary"
                                style={{ marginRight: '8px' }}
                              >
                                {isTestingConnection ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                Test
                              </button>
                              <button
                                onClick={handleSaveApiKey}
                                disabled={!apiKey.trim() || isTestingConnection}
                                className="pro-btn-primary"
                              >
                                <Save size={16} />
                                Save
                              </button>
                            </div>
                            {hasSavedApiKey && (
                              <div className="pro-status success" style={{ marginTop: '8px' }}>
                                <CheckCircle size={14} /> Saved key is hidden for security.
                              </div>
                            )}
                            {connectionStatus === 'success' && (
                              <div className="pro-status success"><CheckCircle size={14} /> Gemini 3.0 Connected</div>
                            )}
                            {connectionStatus === 'error' && (
                              <div className="pro-status error" style={{ color: '#f43f5e' }}>X Connection Failed</div>
                            )}
                          </div>
                          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="external-link-alt">
                            Get your key from Google AI Studio <ExternalLink size={14} />
                          </a>
                        </section>

                        <section className="ai-card">
                          <details className="ai-accordion">
                            <summary>
                              <div className="ai-accordion-title">
                                <Sparkles size={18} />
                                <div>
                                  <h4>Offline Backup Brain (Beta)</h4>
                                  <p>Run a compact model locally for offline coverage and cost control.</p>
                                </div>
                              </div>
                              <span className="ai-accordion-meta">Local model controls</span>
                            </summary>
                            <div className="ai-accordion-body">
                              {!isLocalBrainLoaded && !localBrainProgress && (
                                <div className="ai-inline-note">
                                  <p>
                                    Requires ~1.5GB download the first time. Uses your device GPU and stays on-device.
                                  </p>
                                  <button onClick={handleInitLocalBrain} className="pro-btn-secondary">
                                    <Download size={14} /> Initialize Backup Brain
                                  </button>
                                </div>
                              )}

                              {localBrainProgress && (
                                <div>
                                  <div className="pro-progress-bar">
                                    <div className="progress-fill" style={{ width: `${localBrainProgress.progress * 100}%` }}></div>
                                  </div>
                                  <p style={{ fontSize: '11px', marginTop: '4px', color: '#ccc' }}>{localBrainProgress.text}</p>
                                </div>
                              )}

                              {isLocalBrainLoaded && (
                                <>
                                  <div className="ai-inline-status">
                                    <div className="pro-status success"><CheckCircle size={14} /> Ready (Qwen 2.5 3B)</div>
                                    <button onClick={handleUnloadBrain} className="danger-link">
                                      Unload
                                    </button>
                                  </div>
                                  <p className="local-brain-note">Offline Brain is ready. Toggle below to route chats locally.</p>
                                </>
                              )}

                              <div className="local-brain-toggle">
                                <div>
                                  <h5>Prefer Offline Brain</h5>
                                  <p>Route chats + event parsing to the local model even if Gemini is connected.</p>
                                </div>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={preferLocalBrain}
                                    onChange={(e) => handlePreferLocalBrain(e.target.checked)}
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>

                              <div className="local-brain-test">
                                <div className="local-brain-test-header">
                                  <div>
                                    <h5>Local Model Test Chat</h5>
                                    <p>Send a message and confirm live generation.</p>
                                  </div>
                                  <button
                                    onClick={handleLocalBrainTest}
                                    className="pro-btn-secondary"
                                    disabled={localBrainTestStatus === 'loading'}
                                  >
                                    {localBrainTestStatus === 'loading' ? <RefreshCw className="animate-spin" size={14} /> : 'Run Test'}
                                  </button>
                                </div>
                                <div className="local-brain-meta">
                                  <div className="meta-item">
                                    <Clock size={14} />
                                    <span>{localBrainNow.toLocaleString()}</span>
                                  </div>
                                  <div className="meta-item">
                                    <MessageSquare size={14} />
                                    <span>Model: {localBrainService.type || 'local'}</span>
                                  </div>
                                </div>
                                {localBrainTestResult && (
                                  <div className="local-brain-test-output">
                                    <span className="label">Sample Response</span>
                                    <p>{localBrainTestResult}</p>
                                  </div>
                                )}
                                <form onSubmit={handleLocalBrainChatSubmit} className="local-brain-chat-form">
                                  <input
                                    type="text"
                                    value={localBrainTestInput}
                                    onChange={(e) => setLocalBrainTestInput(e.target.value)}
                                    placeholder="Send a message to the local model..."
                                    className="local-brain-input"
                                  />
                                  <button type="submit" className="pro-btn-primary" disabled={localBrainTestStatus === 'loading'}>
                                    {localBrainTestStatus === 'loading' ? <RefreshCw className="animate-spin" size={14} /> : 'Send'}
                                  </button>
                                </form>
                                <div className="local-brain-chat-log">
                                  {localBrainChatHistory.map(entry => (
                                    <div key={entry.id} className={`chat-entry ${entry.role}`}>
                                      <div className="chat-entry-header">
                                        <span className="role">{entry.role === 'ai' ? 'Cal' : 'You'}</span>
                                        <span className="timestamp">{entry.timestamp.toLocaleTimeString()}</span>
                                      </div>
                                      <p>{entry.content}</p>
                                      {entry.role === 'ai' && entry.model && (
                                        <span className="chat-model">{entry.model}</span>
                                      )}
                                    </div>
                                  ))}
                                  {localBrainTestStatus === 'loading' && (
                                    <div className="chat-entry ai">
                                      <div className="chat-entry-header">
                                        <span className="role">Cal</span>
                                        <span className="timestamp">Generating...</span>
                                      </div>
                                      <p className="streaming-indicator">Streaming response…</p>
                                    </div>
                                  )}
                                </div>
                                {localBrainTestStatus === 'error' && (
                                  <p className="local-brain-test-error">We couldn't complete the test. Try loading the Offline Brain again.</p>
                                )}
                              </div>
                            </div>
                          </details>
                        </section>

                        <section className="ai-card ai-card-wide">
                          <div className="ai-card-header">
                            <Sparkles size={18} />
                            <div>
                              <h4>Engine Guidance</h4>
                              <p>CalAI uses your connected services to improve scheduling and data safety.</p>
                            </div>
                          </div>
                          <div className="ai-guidance">
                            <div className="ai-guidance-item">
                              <span className="ai-guidance-title">Privacy-first flows</span>
                              <p>Keys are stored securely and never displayed once saved. Local Brain stays on-device.</p>
                            </div>
                            <div className="ai-guidance-item">
                              <span className="ai-guidance-title">Smart parsing</span>
                              <p>Natural language commands become structured events with timezone-aware defaults.</p>
                            </div>
                            <div className="ai-guidance-item">
                              <span className="ai-guidance-title">Cost controls</span>
                              <p>Use the Offline Brain to save API credits while preserving the assistant flow.</p>
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  )}

                  {activeTab === 'sync' && (
                    <div className="content-section">
                      <div className="pro-integration-card">
                        <div className="integration-header">
                          <div className="icon-container google">
                            <CalendarIcon size={24} />
                          </div>
                          <div className="integration-meta">
                            <h4>Google Calendar</h4>
                            <p>{googleCalendarService.isAuthorized ? 'Two-way synchronization active' : 'Connect to sync your schedules'}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleGoogleCalendarSync}
                          disabled={isSyncing}
                          className={`pro-button ${googleCalendarService.isAuthorized ? 'connected' : ''}`}
                        >
                          {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : googleCalendarService.isAuthorized ? <CheckCircle size={16} /> : 'Connect Now'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'data' && (
                    <div className="content-section">
                      <div className="storage-summary glass-card">
                        <div>
                          <h4>Local Event Storage</h4>
                          <p>Review and manage the on-device calendar cache.</p>
                        </div>
                        <div className="storage-meta">
                          <div>
                            <span className="storage-count">{storageMeta.count}</span>
                            <span className="storage-label">Stored events</span>
                          </div>
                          <div>
                            <span className="storage-label">Last updated</span>
                            <span className="storage-date">
                              {storageMeta.lastUpdated ? storageMeta.lastUpdated.toLocaleString() : 'No local data'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="storage-actions-grid">
                        <button type="button" onClick={handleExportData} className="storage-action-button">
                          <CloudDownloadOutlined fontSize="small" />
                          <div>
                            <span>Export JSON</span>
                            <small>Download a full calendar backup.</small>
                          </div>
                        </button>
                        <button type="button" onClick={handleExportICS} className="storage-action-button">
                          <EventNoteOutlined fontSize="small" />
                          <div>
                            <span>Export ICS</span>
                            <small>Share events with other calendars.</small>
                          </div>
                        </button>
                      </div>
                      <div className="storage-actions">
                        <button type="button" onClick={handleDeleteByName} className="storage-action-button warning">
                          <DeleteSweepOutlined fontSize="small" />
                          <div>
                            <span>Delete by Name</span>
                            <small>Remove repeated events by exact title.</small>
                          </div>
                        </button>
                        <button type="button" onClick={handleClearAllData} className="storage-action-button danger">
                          <DeleteOutline fontSize="small" />
                          <div>
                            <span>Clear Local Events</span>
                            <small>Reset cached data on this device.</small>
                          </div>
                        </button>
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
                            <div>
                              <h5>{pack.label}</h5>
                              <p>{pack.description}</p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={Boolean(generalEventPacks?.[pack.id])}
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
                    <div className="content-section about-content">
                      <div className="about-branding">
                        <div className="logo-large">
                          <CalendarIcon size={48} color="#6366f1" />
                        </div>
                        <h3>CalAI</h3>
                        <p>Version 2.0.1 (Nitro)</p>
                      </div>
                      <div className="about-details">
                        <h4>Professional AI Calendar</h4>
                        <p>
                          CalAI is a dedicated AI calendar designed for teams and professionals who need fast, reliable
                          scheduling. It blends real-time calendaring with AI-driven parsing so every commitment stays
                          aligned and searchable.
                        </p>
                        <ul>
                          <li>AI-first scheduling with verified parsing and timezone awareness.</li>
                          <li>Offline Backup Brain to keep planning available without connectivity.</li>
                          <li>Secure storage for API credentials with masked UI protection.</li>
                          <li>Integrated Google Calendar sync plus export-ready formats.</li>
                        </ul>
                      </div>
                      <div className="legal-links-alt">
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                        <span>•</span>
                        <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                        <span>•</span>
                        <a href="/contact" target="_blank" rel="noopener noreferrer">Contact</a>
                      </div>
                      <div className="feedback-section">
                        <p>Built with ❤️ by Yaegerbomb</p>
                      </div>
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
