import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';

export const ThemeProvider = ({ children }) => {
  const [theme] = useState('dark');

  const themeTokens = useMemo(() => ({
    dark: {
      '--bg-color': 'linear-gradient(135deg, #000000 0%, #0a0a0c 100%)',
      '--surface-color': 'rgba(28, 28, 30, 0.7)',
      '--card-bg': 'rgba(28, 28, 30, 0.6)',
      '--text-color': '#ffffff',
      '--muted-text': '#8e8e93',
      '--border-color': 'rgba(255, 255, 255, 0.08)',
      '--accent-color': '#FF3B30'
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
    <ThemeContext.Provider value={{
      theme: 'dark',
      setTheme: () => { },
      toggleTheme: () => { },
      isDark: true
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
