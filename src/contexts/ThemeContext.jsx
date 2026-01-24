import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { firebaseService } from '../services/firebaseService';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const THEMES = {
  CODEX: 'codex',
  PASTEL: 'pastel',
  WHITE: 'white'
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(THEMES.CODEX);
  const [isDark, setIsDark] = useState(true);
  const userIdRef = useRef(null);

  useEffect(() => {
    const applyTheme = (nextTheme) => {
      setThemeState(nextTheme);
      const nextIsDark = nextTheme === THEMES.CODEX;
      setIsDark(nextIsDark);
      document.documentElement.setAttribute('data-theme', nextTheme);
      document.documentElement.classList.toggle('dark', nextIsDark);
      localStorage.setItem('calai-theme', nextTheme);
    };

    const loadTheme = async () => {
      const stored = localStorage.getItem('calai-theme');
      let nextTheme = stored || THEMES.CODEX;

      if (userIdRef.current) {
        const userData = await firebaseService.getUserData();
        if (userData?.theme) {
          nextTheme = userData.theme;
        }
      }

      applyTheme(nextTheme);
    };

    const unsubscribe = firebaseService.onAuthStateChanged(async (user) => {
      userIdRef.current = user?.uid ?? null;
      await loadTheme();
    });

    loadTheme();
    return () => unsubscribe?.();
  }, []);

  const setTheme = async (nextTheme) => {
    if (!Object.values(THEMES).includes(nextTheme)) return;
    setThemeState(nextTheme);
    const nextIsDark = nextTheme === THEMES.CODEX;
    setIsDark(nextIsDark);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextIsDark);
    localStorage.setItem('calai-theme', nextTheme);
    if (userIdRef.current) {
      await firebaseService.saveUserData({ theme: nextTheme });
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme: () => { },
      isDark
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
