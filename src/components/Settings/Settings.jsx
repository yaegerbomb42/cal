import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Save, Eye, EyeOff, ExternalLink, Trash2, Download, Upload } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { useEvents } from '../../contexts/EventsContext';
import './Settings.css';

const Settings = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [exportData, setExportData] = useState('');
  
  const { events, addEvent } = useEvents();

  useEffect(() => {
    // Load saved API key
    const savedKey = localStorage.getItem('gemini-api-key');
    if (savedKey) {
      setApiKey(savedKey);
      testConnection(savedKey);
    }
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

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini-api-key', apiKey.trim());
      testConnection(apiKey.trim());
    } else {
      localStorage.removeItem('gemini-api-key');
      setConnectionStatus(null);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('gemini-api-key');
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
          alert(`Successfully imported ${data.events.length} events!`);
        } else {
          alert('Invalid file format. Please select a valid calendar data file.');
        }
      } catch (error) {
        alert('Error reading file. Please select a valid JSON file.');
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
                >
                  <Download size={16} />
                  Export Data
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
    </AnimatePresence>
  );
};

export default Settings;