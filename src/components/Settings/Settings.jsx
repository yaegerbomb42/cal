import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Eye, EyeOff, ExternalLink, Trash2, Download, Upload, Calendar as CalendarIcon, RefreshCw, CheckCircle, LogOut, User } from 'lucide-react';
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
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="settings-modal glass-card"
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
                <User size={18} />
                Account
              </h4>
              <div className="account-card glass-card">
                <div className="account-info">
                  <div className="user-avatar">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" />
                    ) : (
                      <div className="avatar-placeholder">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="user-details">
                    <span className="user-email">{user?.email}</span>
                    <span className="user-status">
                      {/* Checking if authorized for Gemini */}
                      {user?.email === 'yaeger.james42@gmail.com' ?
                        <span className="badge badge-pro">Pro Access</span> :
                        <span className="badge">Free Tier</span>
                      }
                    </span>
                  </div>
                </div>
                <button onClick={handleLogout} className="btn btn-danger btn-sm">
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </section>

            {/* AI Configuration */}
            <section className="settings-section">
              <h4>
                <Key size={18} />
                AI Configuration
              </h4>
              <p className="section-description">
                Enter your Google Gemini API key to enable AI features. The key is saved securely to your account.
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
                    <span>Connected</span>
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
                Need an API key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Get one from Google AI Studio <ExternalLink size={12} /></a>
              </div>
            </section>



            {/* Integrations */}
            <section className="settings-section">
              <h4>
                <RefreshCw size={18} />
                Integrations
              </h4>
              <p className="section-description">
                Connect with external services to sync your calendar.
              </p>

              <div className="integrations-list">
                <div className="integration-item glass-card">
                  <div className="integration-info">
                    <div className="integration-icon google-cal-icon">
                      <CalendarIcon size={20} />
                    </div>
                    <div>
                      <h5>Google Calendar</h5>
                      <p className="small-text">
                        {isGoogleConnected ? 'Connected & Synced' : 'Sync events both ways'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleGoogleCalendarSync}
                    disabled={isSyncing || isGoogleConnected}
                    className={`btn ${isGoogleConnected ? 'btn-success' : 'btn-primary'}`}
                  >
                    {isSyncing ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="animate-spin" size={14} /> Syncing...
                      </span>
                    ) : isGoogleConnected ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle size={14} /> Connected
                      </span>
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
                <Download size={18} />
                Data Management
              </h4>
              <p className="section-description">
                Export your calendar data for backup or import data from another calendar.
              </p>

              <div className="data-actions">
                <button
                  onClick={handleExportData}
                  className="btn"
                  title="Export as JSON"
                >
                  <Download size={16} />
                  Export JSON
                </button>

                <button
                  onClick={handleExportICS}
                  className="btn"
                  title="Export as ICS (for Google Calendar, Outlook, etc.)"
                >
                  <CalendarIcon size={16} />
                  Export ICS
                </button>

                <label className="btn file-input-label">
                  <Upload size={16} />
                  Import Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="file-input"
                  />
                </label>

                <button
                  onClick={handleClearAllData}
                  className="btn btn-danger"
                >
                  <Trash2 size={16} />
                  Clear All Data
                </button>
              </div>
            </section>

            {/* Statistics */}
            <section className="settings-section">
              <h4>Statistics</h4>
              <div className="stats-grid">
                <div className="stat-item glass-card">
                  <div className="stat-number">{events.length}</div>
                  <div className="stat-label">Total Events</div>
                </div>
                <div className="stat-item glass-card">
                  <div className="stat-number">
                    {events.filter(e => new Date(e.start) > new Date()).length}
                  </div>
                  <div className="stat-label">Upcoming Events</div>
                </div>
                <div className="stat-item glass-card">
                  <div className="stat-number">
                    {Math.round(
                      localStorage.getItem('calendar-events')?.length / 1024 || 0
                    )}KB
                  </div>
                  <div className="stat-label">Storage Used</div>
                </div>
              </div>
            </section>

            {/* About */}
            <section className="settings-section">
              <h4>About CalAI</h4>
              <p className="about-text">
                CalAI is a modern, AI-powered calendar application built with React and powered by Google's Gemini AI.
                It features a beautiful glassmorphism design, natural language event creation, and intelligent scheduling assistance.
              </p>
              <p className="version-text">Version 1.0.0</p>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence >
  );
};

export default Settings;