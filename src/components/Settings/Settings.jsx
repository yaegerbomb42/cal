import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Eye, EyeOff, ExternalLink, Trash2, Download, Upload, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { firebaseService } from '../../services/firebaseService';
import { useEvents } from '../../contexts/EventsContext';
import { downloadICS } from '../../utils/icsExport';
import { toastService } from '../../utils/toast';
import './Settings.css';

const Settings = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const { events, addEvent } = useEvents();

  useEffect(() => {
    const loadApiKey = async () => {
      // Try Firebase first
      try {
        const firebaseKey = await firebaseService.getApiKey();
        if (firebaseKey) {
          setApiKey(firebaseKey);
          testConnection(firebaseKey);
          return;
        }
      } catch (error) {
        console.log('Could not load API key from Firebase:', error);
      }

      // Fallback to localStorage
      const savedKey = localStorage.getItem('gemini-api-key');
      if (savedKey) {
        setApiKey(savedKey);
        testConnection(savedKey);

        // Try to sync to Firebase if available
        try {
          await firebaseService.saveApiKey(savedKey);
        } catch (error) {
          console.log('Could not sync API key to Firebase:', error);
        }
      }
    };

    loadApiKey();
  }, []);

  const testConnection = async (key) => {
    setIsTestingConnection(true);
    try {
      const success = geminiService.initialize(key);
      if (success) {
        // Test with a simple request
        await geminiService.chatResponse('Hello', []);
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (apiKey.trim()) {
      // Save to localStorage immediately
      localStorage.setItem('gemini-api-key', apiKey.trim());

      // Try to save to Firebase
      try {
        await firebaseService.saveApiKey(apiKey.trim());
      } catch (error) {
        console.log('Could not save API key to Firebase, localStorage backup available:', error);
      }

      testConnection(apiKey.trim());
    } else {
      // Clear from both localStorage and Firebase
      localStorage.removeItem('gemini-api-key');
      try {
        await firebaseService.saveApiKey('');
      } catch (error) {
        console.log('Could not clear API key from Firebase:', error);
      }
      setConnectionStatus(null);
    }
  };

  const handleClearApiKey = async () => {
    setApiKey('');
    localStorage.removeItem('gemini-api-key');
    try {
      await firebaseService.saveApiKey('');
    } catch (error) {
      console.log('Could not clear API key from Firebase:', error);
    }
    setConnectionStatus(null);
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

  const handleGoogleCalendarSync = () => {
    // Placeholder for actual Google Calendar OAuth flow
    toastService.info('Google Calendar Sync coming soon! This will allow 2-way sync.');
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
            {/* AI Configuration */}
            <section className="settings-section">
              <h4>
                <Key size={18} />
                AI Configuration
              </h4>
              <p className="section-description">
                Configure your Google Gemini API key to enable AI-powered features like natural language event creation and smart scheduling.
              </p>

              <div className="form-group">
                <label htmlFor="api-key">Gemini API Key</label>
                <div className="api-key-input">
                  <input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="toggle-visibility-btn"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="api-key-actions">
                  <button
                    onClick={handleSaveApiKey}
                    disabled={isTestingConnection}
                    className="btn btn-primary"
                  >
                    <Save size={16} />
                    {isTestingConnection ? 'Testing...' : 'Save & Test'}
                  </button>

                  <button
                    onClick={handleClearApiKey}
                    className="btn"
                  >
                    <Trash2 size={16} />
                    Clear
                  </button>
                </div>

                {connectionStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`connection-status ${connectionStatus}`}
                  >
                    {connectionStatus === 'success'
                      ? '✅ API key is valid and working!'
                      : '❌ Invalid API key or connection failed.'
                    }
                  </motion.div>
                )}

                <div className="api-help">
                  <p>
                    Don't have a Gemini API key?
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="api-link"
                    >
                      Get one free from Google AI Studio
                      <ExternalLink size={14} />
                    </a>
                  </p>
                </div>
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
                      <p className="small-text">Sync events both ways</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGoogleCalendarSync}
                    className="btn btn-primary"
                  >
                    Connect
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