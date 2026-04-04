import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, RotateCcw, MousePointer, Palette } from 'lucide-react';
import './DesignStudio.css';

const DEFAULT_VARS = {
  '--bg-primary': '#F0F4F8',
  '--accent': '#FF3B30',
  '--glass-bg': 'rgba(230, 235, 245, 0.75)',
  '--backdrop-blur': '20px',
  '--border-radius': '16px',
  '--text-primary': '#000000'
};

const DesignStudio = ({ isOpen, onClose }) => {
  const MotionDiv = motion.div;
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('calai-custom-theme');
    return saved ? JSON.parse(saved) : { ...DEFAULT_VARS };
  });

  const [activeTab, setActiveTab] = useState('colors');
  const [isInspectorActive, setIsInspectorActive] = useState(false);

  // Apply theme to DOM
  useEffect(() => {
    Object.entries(theme).forEach(([key, value]) => {
      let formattedValue = value;
      if (key === '--backdrop-blur') formattedValue = `blur(${value})`;
      if (key === '--border-radius') formattedValue = `${value}px`;
      document.documentElement.style.setProperty(key, formattedValue);
    });
    localStorage.setItem('calai-custom-theme', JSON.stringify(theme));
  }, [theme]);

  // Inspector Logic
  useEffect(() => {
    if (!isInspectorActive) return;

    const handleMouseOver = (e) => {
      const target = e.target;
      if (target.closest('.design-studio-panel')) return;

      const rect = target.getBoundingClientRect();
      const overlay = document.getElementById('inspector-overlay');
      if (overlay) {
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.display = 'block';
      }
    };

    const handleMouseOut = () => {
      const overlay = document.getElementById('inspector-overlay');
      if (overlay) overlay.style.display = 'none';
    };

    const handleClick = (e) => {
        if (e.target.closest('.design-studio-panel')) return;
        e.preventDefault();
        e.stopPropagation();
        // Here we could extract styles of the clicked element
        console.log('Inspecting element:', e.target);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isInspectorActive]);

  const updateVar = (key, value) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const resetTheme = () => {
    setTheme({ ...DEFAULT_VARS });
  };

  if (!isOpen) return <div id="inspector-overlay" className="inspector-overlay"></div>;

  return (
    <>
      <div id="inspector-overlay" className="inspector-overlay"></div>
      
      <motion.div 
        className="design-studio-panel glass"
        initial={{ x: 350, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 350, opacity: 0 }}
      >
        <div className="design-studio-header">
          <h3>
            <Palette size={18} className="text-accent" />
            Visual Architect
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
                onClick={() => setIsInspectorActive(!isInspectorActive)}
                className={`icon-btn ${isInspectorActive ? 'active' : ''}`}
                title="Inspector Mode"
            >
                <MousePointer size={16} />
            </button>
            <button onClick={onClose} className="icon-btn">
                <X size={18} />
            </button>
          </div>
        </div>

        <div className="design-studio-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            className={`tab-btn ${activeTab === 'colors' ? 'active' : ''}`}
            onClick={() => setActiveTab('colors')}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', borderBottom: activeTab === 'colors' ? '2px solid var(--accent)' : 'none' }}
          >
            Palette
          </button>
          <button 
            className={`tab-btn ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('layout')}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', borderBottom: activeTab === 'layout' ? '2px solid var(--accent)' : 'none' }}
          >
            Structure
          </button>
        </div>

        <div className="design-studio-body">
          {activeTab === 'colors' && (
            <div className="design-studio-section">
              <h4>System Colors</h4>
              
              <div className="control-group">
                <div className="control-label">Background Primary <span>{theme['--bg-primary']}</span></div>
                <div className="control-input-row">
                  <input 
                    type="color" 
                    value={theme['--bg-primary']} 
                    onChange={(e) => updateVar('--bg-primary', e.target.value)}
                    style={{ flex: 1, height: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div className="control-group">
                <div className="control-label">Accent Priority <span>{theme['--accent']}</span></div>
                <div className="control-input-row">
                  <input 
                    type="color" 
                    value={theme['--accent']} 
                    onChange={(e) => updateVar('--accent', e.target.value)}
                    style={{ flex: 1, height: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div className="control-group">
                <div className="control-label">Text Primary <span>{theme['--text-primary']}</span></div>
                <div className="control-input-row">
                  <input 
                    type="color" 
                    value={theme['--text-primary']} 
                    onChange={(e) => updateVar('--text-primary', e.target.value)}
                    style={{ flex: 1, height: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="design-studio-section">
              <h4>Spatial Dynamics</h4>
              
              <div className="control-group">
                <div className="control-label">Edge Smoothing <span>{theme['--border-radius']}px</span></div>
                <input 
                  type="range" 
                  min="0" 
                  max="40" 
                  className="design-slider"
                  value={parseInt(theme['--border-radius'])} 
                  onChange={(e) => updateVar('--border-radius', e.target.value)} 
                />
              </div>

              <div className="control-group">
                <div className="control-label">Glass Blur Intensity <span>{theme['--backdrop-blur']}</span></div>
                <input 
                  type="range" 
                  min="0" 
                  max="40" 
                  className="design-slider"
                  value={parseInt(theme['--backdrop-blur'])} 
                  onChange={(e) => updateVar('--backdrop-blur', e.target.value)} 
                />
              </div>
            </div>
          )}
        </div>

        <div className="design-studio-footer">
          <button className="btn btn-sm" onClick={resetTheme} title="Factory Reset">
            <RotateCcw size={14} style={{ marginRight: '6px' }} />
            Reset
          </button>
          <button className="btn btn-sm btn-primary" onClick={onClose}>
            <Save size={14} style={{ marginRight: '6px' }} />
            Commit
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default DesignStudio;
