import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Eye, EyeOff, ExternalLink, Trash2, Download, Upload, Calendar as CalendarIcon, RefreshCw, CheckCircle, LogOut, User, Sparkles } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { localBrainService } from '../../services/localBrainService';
import { firebaseService } from '../../services/firebaseService';
import { googleCalendarService } from '../../services/googleCalendarService';
import { useEvents } from '../../contexts/EventsContext';
import { useAuth } from '../../contexts/AuthContext';
import { downloadICS } from '../../utils/icsExport';
import { toastService } from '../../utils/toast';
import './Settings.css';

const Settings = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const savedApiKeyRef = useRef(null);

  // Google Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Local Brain State
  const [localBrainProgress, setLocalBrainProgress] = useState(null);
  const [isLocalBrainLoaded, setIsLocalBrainLoaded] = useState(false);
  const [preferLocalBrain, setPreferLocalBrain] = useState(false);
  const [localBrainTestStatus, setLocalBrainTestStatus] = useState('idle');
  const [localBrainTestResult, setLocalBrainTestResult] = useState('');

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
      console.error(error);
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
      console.error(error);
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
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      toastService.error(error.message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    googleCalendarService.initialize().catch(err => console.error("GCal init error", err));
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
      console.error('Failed to save API key:', error);
      toastService.error('Failed to save API key');
    } finally {
      setIsTestingConnection(false);
    }
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
            setIsGoogleConnected(true);
          }
        } catch (e) { console.error(e); } finally { setIsSyncing(false); }
      }, 2000);
    } catch (error) {
      console.error(error);
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
    } catch (error) { toastService.error('Failed to export ICS file'); }
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all calendar data? This action cannot be undone.')) {
      localStorage.removeItem('calendar-events');
      window.location.reload();
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="settings-overlay"
        onClick={onClose}
      >
        <motion.div
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
                    <motion.div
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
                <motion.div
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
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="content-section">
                      <div className="info-box">
                        <Sparkles size={20} className="sparkle-icon" />
                        <div>
                          <h4>Gemini 3.0 Pro</h4>
                          <p>Your calendar is powered by the latest frontier models for intelligent parsing and chat.</p>
                        </div>
                      </div>

                      <div className="form-group-alt">
                        <label>Gemini API Key</label>
                        <div className="pro-input-group">
                          <div className="input-container">
                            <Key size={16} className="input-icon-inner" />
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
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

                      <div className="info-box" style={{ marginTop: '16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles size={20} className="sparkle-icon" style={{ color: '#6366f1' }} />
                          <div>
                            <h4>Offline Backup Brain (Beta)</h4>
                            <p>Run a small AI model directly in your browser. Perfect for offline use or saving Gemini costs.</p>
                          </div>
                        </div>

                        {!isLocalBrainLoaded && !localBrainProgress && (
                          <div style={{ marginTop: '12px' }}>
                            <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>
                              Requires ~400MB download (first time only). Uses your device's GPU.
                            </p>
                            <button onClick={handleInitLocalBrain} className="pro-btn-secondary">
                              <Download size={14} /> Initialize Backup Brain
                            </button>
                          </div>
                        )}

                        {localBrainProgress && (
                          <div style={{ marginTop: '12px' }}>
                            <div className="pro-progress-bar">
                              <div className="progress-fill" style={{ width: `${localBrainProgress.progress * 100}%` }}></div>
                            </div>
                            <p style={{ fontSize: '11px', marginTop: '4px', color: '#ccc' }}>{localBrainProgress.text}</p>
                          </div>
                        )}

                        {isLocalBrainLoaded && (
                          <>
                            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="pro-status success"><CheckCircle size={14} /> Ready (Qwen 0.5B)</div>
                              <button onClick={handleUnloadBrain} className="danger-link" style={{ marginLeft: 'auto', fontSize: '11px' }}>
                                Unload
                              </button>
                            </div>
                            <p className="local-brain-note">Offline Brain is ready. Use it anytime by toggling the switch below.</p>
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
                              <h5>Example Test Chat</h5>
                              <p>Run a quick sample response to confirm the local model is working.</p>
                            </div>
                            <button
                              onClick={handleLocalBrainTest}
                              className="pro-btn-secondary"
                              disabled={localBrainTestStatus === 'loading'}
                            >
                              {localBrainTestStatus === 'loading' ? <RefreshCw className="animate-spin" size={14} /> : 'Run Test'}
                            </button>
                          </div>
                          {localBrainTestResult && (
                            <div className="local-brain-test-output">
                              <span className="label">Sample Response</span>
                              <p>{localBrainTestResult}</p>
                            </div>
                          )}
                          {localBrainTestStatus === 'error' && (
                            <p className="local-brain-test-error">We couldn't complete the test. Try loading the Offline Brain again.</p>
                          )}
                        </div>
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
                      <div className="grid-2">
                        <div className="pro-action-card" onClick={handleExportData}>
                          <Download size={24} />
                          <h5>Export JSON</h5>
                          <p>Backup all your events to a portable file.</p>
                        </div>
                        <div className="pro-action-card" onClick={handleExportICS}>
                          <CalendarIcon size={24} />
                          <h5>Export ICS</h5>
                          <p>Export in universal calendar format.</p>
                        </div>
                      </div>
                      <div className="danger-zone">
                        <button onClick={handleDeleteByName} className="btn-warning">
                          <Trash2 size={14} /> Delete Events by Name
                        </button>
                        <button onClick={handleClearAllData} className="danger-link">
                          <Trash2 size={14} /> Clear Local Data
                        </button>
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
                      <div className="upgrade-todo">
                        <h4>Cal Upgrade TODO</h4>
                        <ol>
                          <li>Route quick add input straight into Cal chat.</li>
                          <li>Correct explicit times so 1:45pm stays 1:45pm.</li>
                          <li>Open day view when clicking a date in month view.</li>
                          <li>Add AI draft editing before confirming events.</li>
                          <li>Refresh the event modal for faster edits.</li>
                          <li>Always-show trash controls in upcoming events.</li>
                          <li>Ensure AI-created events always carry times.</li>
                          <li>Expand category + color system to 8 tags.</li>
                          <li>Add category filters for upcoming events.</li>
                          <li>Enable quick edit actions from the upcoming list.</li>
                        </ol>
                      </div>
                      <div className="legal-links-alt">
                        <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                        <span>•</span>
                        <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                      </div>
                      <div className="feedback-section">
                        <p>Built with ❤️ by Yaegerbomb</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </motion.div>
      </motion.div>
    </AnimatePresence >
  );
};

export default Settings;
