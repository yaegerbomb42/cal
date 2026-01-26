import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('cal-theme');
    return stored || 'dark';
  });

  const themeTokens = useMemo(() => ({
    dark: {
      '--bg-color': '#0b1120',
      '--surface-color': '#0f172a',
      '--card-bg': 'rgba(15, 23, 42, 0.8)',
      '--text-color': '#f8fafc',
      '--muted-text': '#94a3b8',
      '--border-color': 'rgba(148, 163, 184, 0.2)',
      '--accent-color': '#6366f1'
    },
    light: {
      '--bg-color': '#f8fafc',
      '--surface-color': '#ffffff',
      '--card-bg': 'rgba(255, 255, 255, 0.9)',
      '--text-color': '#0f172a',
      '--muted-text': '#64748b',
      '--border-color': 'rgba(148, 163, 184, 0.35)',
      '--accent-color': '#4f46e5'
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
