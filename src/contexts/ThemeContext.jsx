import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('cal-theme');
    return stored || 'dark';
  });

  const themeTokens = useMemo(() => ({
    dark: {
      '--bg-color': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      '--surface-color': 'rgba(30, 41, 59, 0.7)',
      '--card-bg': 'rgba(15, 23, 42, 0.6)',
      '--text-color': '#f8fafc',
      '--muted-text': '#94a3b8',
      '--border-color': 'rgba(148, 163, 184, 0.1)',
      '--accent-color': '#6366f1'
    },
    light: {
      '--bg-color': '#f8fafc',
      '--surface-color': '#ffffff',
      '--glass-bg': 'rgba(255, 255, 255, 0.75)',
      '--glass-border': 'rgba(0, 0, 0, 0.08)',
      '--card-bg': 'rgba(255, 255, 255, 0.9)',
      '--text-color': '#0f172a',
      '--muted-text': '#64748b',
      '--border-color': 'rgba(148, 163, 184, 0.35)',
      '--accent-color': '#4f46e5',
      '--accent-glow': 'rgba(79, 70, 229, 0.15)'
    }
  }), []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    const tokens = themeTokens[theme];
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    localStorage.setItem('cal-theme', theme);
  }, [theme, themeTokens]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark'
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
