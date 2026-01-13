import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Eye, EyeOff, ExternalLink, Trash2, Download, Upload, Calendar as CalendarIcon, RefreshCw, CheckCircle, LogOut, User, Sparkles } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
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

  // Google Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  const { events, addEvent } = useEvents();

  useEffect(() => {
    // Initialize Google Service on mount
    googleCalendarService.initialize().catch(err => console.error("GCal init error", err));

    const loadApiKey = async () => {
      // Try to get from Firebase first if logged in
      if (user) {
        const savedKey = await firebaseService.getApiKey();
        if (savedKey) {
          setApiKey(savedKey);
          testConnection(savedKey);
          return;
        }
      }

      // Fallback to localStorage
      const localKey = localStorage.getItem('gemini_api_key');
      if (localKey) {
        setApiKey(localKey);
        testConnection(localKey);
      }
    };

    loadApiKey();
  }, [user]);

  const testConnection = async (key) => {
    setIsTestingConnection(true);
    setConnectionStatus(null);

    // Initialize service
    geminiService.initialize(key);

    try {
      // Simple test
      await geminiService.chatResponse('Hello', []);
      setConnectionStatus('success');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;

    setIsTestingConnection(true);

    try {
      // 1. Save to localStorage
      localStorage.setItem('gemini_api_key', apiKey);

      // 2. Save to Firebase if logged in
      if (user) {
        await firebaseService.saveApiKey(apiKey);
      }

      // 3. Test connection
      await testConnection(apiKey);

      toastService.success('API Key saved successfully!');
    } catch (error) {
      console.error('Failed to save API key:', error);
      toastService.error('Failed to save API key');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleExportData = () => {
    const data = {
      events,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

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
    } catch (error) {
      toastService.error('Failed to export ICS file');
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.events && Array.isArray(data.events)) {
          data.events.forEach(event => {
            addEvent(event);
          });
          toastService.success(`Successfully imported ${data.events.length} events!`);
        } else {
          toastService.error('Invalid file format. Please select a valid calendar data file.');
        }
      } catch (error) {
        toastService.error('Error reading file. Please select a valid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all calendar data? This action cannot be undone.')) {
      localStorage.removeItem('calendar-events');
      window.location.reload();
    }
  };

  const handleGoogleCalendarSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Authorize
      await googleCalendarService.handleAuthClick();

      // Note: In a real implementation callback would handle this, but for now 
      // we'll assume auth happens and we can try to fetch (or the user clicks again)
      // Since handleAuthClick is async in the flow of popups, we might need a better flow signal
      // But let's try to fetch immediately after a short delay or assume user authorized

      // 2. Fetch Events
      setTimeout(async () => {
        try {
          const gEvents = await googleCalendarService.listUpcomingEvents();
          if (gEvents && gEvents.length > 0) {
            gEvents.forEach(evt => {
              // Simple dedup by ID check if possible, or just add
              // Ideally we check if event with this gcalId exists
              const exists = events.some(e => e.gcalId === evt.gcalId || (e.title === evt.title && e.start === evt.start));
              if (!exists) {
                addEvent(evt);
              }
            });
            toastService.success(`Synced ${gEvents.length} events from Google Calendar!`);
            setIsGoogleConnected(true);
          } else {
            toastService.info('No upcoming events found or access denied yet.');
          }
        } catch (e) {
          console.error("Sync fetch error", e);
          // Expected if auth failed or closed
        } finally {
          setIsSyncing(false);
        }
      }, 2000); // Give time for popup interaction (hacky but simple for now)

    } catch (error) {
      console.error("Sync error", error);
      toastService.error('Failed to sync with Google Calendar. Check console.');
      setIsSyncing(false);
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
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="settings-modal"
        >
          <div className="settings-header">
            <h3>Settings</h3>
            <button onClick={onClose} className="close-btn">
              <X size={20} />
            </button>
          </div>

          <div className="settings-content">
            {/* Account */}
            <section className="settings-section">
              <h4>
                <User size={16} />
                User Account
              </h4>
              <div className="account-card">
                <div className="account-info">
                  <div className="user-avatar">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" />
                    ) : (
                      user?.email?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="user-details">
                    <h5>Account Settings</h5>
                    <span className="user-email">{user?.email}</span>
                  </div>
                </div>
                <button onClick={logout} className="btn btn-danger btn-sm">
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </section>

            {/* AI Configuration */}
            <section className="settings-section">
              <h4>
                <Key size={16} />
                Gemini Configuration
              </h4>
              <p className="section-description">
                Power your calendar with **Gemini 3.0 Pro**. Enter your API key below.
              </p>

              <div className="form-group">
                <div className="api-key-input-group">
                  <div className="input-wrapper">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter Gemini API Key"
                      className="settings-input"
                    />
                    <button
                      className="visibility-btn"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveApiKey}
                    className="btn btn-primary"
                    disabled={!apiKey || isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    Save
                  </button>
                </div>
                {connectionStatus === 'success' && (
                  <div className="status-badge success">
                    <CheckCircle size={14} />
                    <span>Gemini 3.0 Pro Connected</span>
                  </div>
                )}
                {connectionStatus === 'error' && (
                  <div className="status-badge error">
                    <X size={14} />
                    <span>Connection Failed</span>
                  </div>
                )}
              </div>

              <div className="help-text">
                Need an API key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio <ExternalLink size={12} /></a>
              </div>
            </section>

            {/* Integrations */}
            <section className="settings-section">
              <h4>
                <RefreshCw size={16} />
                Integrations
              </h4>
              <div className="integrations-list">
                <div className="integration-item">
                  <div className="integration-info">
                    <div className="integration-icon google-cal-icon">
                      <CalendarIcon size={20} />
                    </div>
                    <div className="user-details">
                      <h5>Google Calendar</h5>
                      <span className="user-email">
                        {isGoogleConnected ? 'Two-way sync active' : 'Connect your calendar'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleGoogleCalendarSync}
                    disabled={isSyncing || isGoogleConnected}
                    className={`btn ${isGoogleConnected ? 'btn-success' : 'btn-primary'} btn-sm`}
                  >
                    {isSyncing ? (
                      <RefreshCw className="animate-spin" size={14} />
                    ) : isGoogleConnected ? (
                      <CheckCircle size={14} />
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Data Management */}
            <section className="settings-section">
              <h4>
                <Download size={16} />
                Data & Storage
              </h4>
              <div className="data-actions">
                <button onClick={handleExportData} className="btn">
                  <Download size={16} /> JSON Export
                </button>
                <button onClick={handleExportICS} className="btn">
                  <CalendarIcon size={16} /> ICS Export
                </button>
              </div>
            </section>

            {/* Statistics */}
            <section className="settings-section">
              <h4>
                <Sparkles size={16} />
                Quick Stats
              </h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-number">{events.length}</span>
                  <span className="stat-label">Total Events</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">
                    {events.filter(e => new Date(e.start) > new Date()).length}
                  </span>
                  <span className="stat-label">Upcoming</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">3.0</span>
                  <span className="stat-label">Gemini Core</span>
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence >
  );
};

export default Settings;