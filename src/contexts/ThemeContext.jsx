import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const THEMES = {
  MODERN: 'modern',    // Refined Dark (Default)
  NEON: 'neon',        // Cyberpunk / Neon Mode
  CEO: 'ceo',          // High Tech CEO (Carbon / Gold / Slate)
  QUANTUM: 'quantum',  // Animated / Glow Mode
  LIVING: 'living',    // Mouse-reactive / Gradient Mode
  ZEN: 'zen',          // Soft / Minimalist Mode
  LIGHT: 'light'       // Classic Light
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('calai-theme');
    return saved || THEMES.MODERN;
  });

  useEffect(() => {
    localStorage.setItem('calai-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    // Support legacy isDark for components that haven't migrated yet
    const isDark = theme !== THEMES.LIGHT;
    document.documentElement.classList.toggle('dark', isDark);
  }, [theme]);

  const toggleTheme = () => {
    const themes = Object.values(THEMES);
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      isDark: theme !== THEMES.LIGHT
    }}>
      {children}
    </ThemeContext.Provider>
  );
};