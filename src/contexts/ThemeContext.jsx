import { useEffect, useMemo } from 'react';
import { ThemeContext } from './themeContext';

export const ThemeProvider = ({ children }) => {
  // Always use dark theme only

  const themeTokens = useMemo(() => ({
    dark: {
      '--bg-color': 'linear-gradient(135deg, #000000 0%, #0a0a0c 100%)',
      '--surface-color': 'rgba(28, 28, 30, 0.7)',
      '--card-bg': 'rgba(28, 28, 30, 0.6)',
      '--text-color': '#ffffff',
      '--text-primary': '#ffffff',
      '--text-secondary': '#e0e0e0',
      '--text-muted': '#8e8e93',
      '--border-color': 'rgba(255, 255, 255, 0.08)',
      '--glass-border': 'rgba(255, 255, 255, 0.1)',
      '--accent': '#FF3B30',
      '--accent-color': '#FF3B30',
      '--accent-hover': '#e6352a',
      '--success': '#10b981',
      '--error': '#ef4444',
      '--warning': '#f59e0b',
      '--modal-bg': 'rgba(10, 10, 12, 0.95)',
      '--modal-overlay': 'rgba(0, 0, 0, 0.7)',
      '--settings-sidebar-bg': 'rgba(0, 0, 0, 0.3)',
      '--button-bg': 'rgba(255, 255, 255, 0.05)',
      '--button-hover': 'rgba(255, 255, 255, 0.1)',
      '--input-bg': 'rgba(0, 0, 0, 0.3)',
      '--input-border': 'rgba(255, 255, 255, 0.1)'
    }
  }), []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');

    const tokens = themeTokens.dark;
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeTokens]);

  return (
    <ThemeContext.Provider value={{ theme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
