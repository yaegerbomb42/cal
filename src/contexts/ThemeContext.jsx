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
  PRO: 'pro'
};

export const ThemeProvider = ({ children }) => {
  // Always default to PRO, ignore localStorage
  const [theme] = useState(THEMES.PRO);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'pro');
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    // No-op or toast could go here, but UI button will be removed
    console.log("Theme is locked to Pro");
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: () => { }, // No-op
      toggleTheme,
      isDark: true
    }}>
      {children}
    </ThemeContext.Provider>
  );
};