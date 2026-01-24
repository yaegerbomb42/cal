import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

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
