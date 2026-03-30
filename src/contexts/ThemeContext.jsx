import { useEffect, useMemo } from 'react';
import { ThemeContext } from './themeContext';

export const ThemeProvider = ({ children }) => {
  // Always use dark theme only

  const themeTokens = useMemo(() => ({
    light: {
      '--bg-color': '#F0F4F8',
      '--surface-color': 'rgba(255, 255, 255, 0.7)',
      '--card-bg': 'rgba(255, 255, 255, 0.8)',
      '--text-color': '#000000',
      '--text-primary': '#000000',
      '--text-secondary': '#000000',
      '--text-muted': 'rgba(0, 0, 0, 0.6)',
      '--border-color': 'rgba(0, 0, 0, 0.08)',
      '--glass-border': 'rgba(0, 0, 0, 0.08)',
      '--accent': '#FF3B30',
      '--accent-color': '#FF3B30',
      '--accent-hover': '#FF2D55',
      '--success': '#000000',
      '--error': '#FF3B30',
      '--warning': '#FF3B30',
      '--modal-bg': 'rgba(255, 255, 255, 0.95)',
      '--modal-overlay': 'rgba(0, 0, 0, 0.1)',
      '--settings-sidebar-bg': 'rgba(0, 0, 0, 0.05)',
      '--button-bg': 'rgba(0, 0, 0, 0.05)',
      '--button-hover': 'rgba(0, 0, 0, 0.1)',
      '--input-bg': 'rgba(0, 0, 0, 0.03)',
      '--input-border': 'rgba(0, 0, 0, 0.08)'
    }
  }), []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
    root.classList.add('light');

    const tokens = themeTokens.light;
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeTokens]);

  return (
    <ThemeContext.Provider value={{ theme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
};
