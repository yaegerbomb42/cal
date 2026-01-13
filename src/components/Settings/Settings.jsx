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

  const [activeTab, setActiveTab] = useState('account');
  const { events, addEvent, deleteEventsByFilter } = useEvents();

  const tabs = [
    { id: 'account', label: 'Account', icon: User, color: '#6366f1' },
    { id: 'ai', label: 'AI Engine', icon: Sparkles, color: '#8b5cf6' },
    { id: 'sync', label: 'Sync', icon: RefreshCw, color: '#06b6d4' },
    { id: 'data', label: 'Storage', icon: Download, color: '#f43f5e' },
    { id: 'about', label: 'About', icon: CheckCircle, color: '#10b981' }
  ];

  const testConnection = async (key) => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    geminiService.initialize(key);
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
          setApiKey(savedKey);
          testConnection(savedKey);
          return;
        }
      }
      const localKey = localStorage.getItem('gemini_api_key');
      if (localKey) {
        setApiKey(localKey);
        testConnection(localKey);
      }
    };
    loadApiKey();
  }, [user]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setIsTestingConnection(true);
    try {
      localStorage.setItem('gemini_api_key', apiKey);
      if (user) {
        await firebaseService.saveApiKey(apiKey);
      }
      await testConnection(apiKey);
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
                              placeholder="sk-..."
                            />
                            <button onClick={() => setShowApiKey(!showApiKey)} className="eye-toggle">
                              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <button
                            onClick={() => testConnection(apiKey)}
                            disabled={!apiKey || isTestingConnection}
                            className="pro-btn-secondary"
                            style={{ marginRight: '8px' }}
                          >
                            {isTestingConnection ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                            Test
                          </button>
                          <button
                            onClick={handleSaveApiKey}
                            disabled={!apiKey || isTestingConnection}
                            className="pro-btn-primary"
                          >
                            <Save size={16} />
                            Save
                          </button>
                        </div>
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