import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { CalendarProvider } from './contexts/CalendarContext.jsx';
import { EventsProvider } from './contexts/EventsContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useAuth } from './contexts/useAuth';
import Login from './components/Auth/Login';
import Header from './components/Header/Header';
import Calendar from './components/Calendar/Calendar';
import EventModal from './components/Events/EventModal';
import AIChat from './components/AI/AIChat';
import Settings from './components/Settings/Settings';
import Toast from './components/Toast/Toast';
import UpcomingSidebar from './components/Sidebar/UpcomingSidebar';
import ThemeBackground from './components/Common/ThemeBackground';
import { geminiService } from './services/geminiService';
import { localBrainService } from './services/localBrainService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import './App.css';

function App() {
  const MotionDiv = motion.div;

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={(
              <AuthProvider>
                <EventsProvider>
                  <CalendarProvider>
                    <MainLayout />
                  </CalendarProvider>
                </EventsProvider>
              </AuthProvider>
            )}
          />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const MotionDiv = motion.div;

  // Sidebar Resize Logic (Percentage Based)
  const [sidebarPercent, setSidebarPercent] = useState(30); // Default 30% width (more room for Upcoming)
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  const startResizing = useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      // Calculate from the RIGHT edge (sidebar width)
      const newWidth = containerRect.right - mouseMoveEvent.clientX;
      const containerWidth = containerRect.width;
      const newPercent = (newWidth / containerWidth) * 100;

      // Limits: 15% to 50%
      if (newPercent > 15 && newPercent < 50) {
        setSidebarPercent(newPercent);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    const initializeAI = async () => {
      let key = null;
      if (user) {
        const { firebaseService } = await import('./services/firebaseService');
        key = await firebaseService.getApiKey();
      }

      if (key) {
        geminiService.initialize(key);
      }

      // Attempt to initialize Local Brain (checks for Chrome Built-in AI)
      localBrainService.initialize();
    };

    initializeAI();

    const handleAIOpen = () => setIsAIChatOpen(true);
    window.addEventListener('calai-open', handleAIOpen);
    return () => window.removeEventListener('calai-open', handleAIOpen);
  }, [user]);

  // Global keyboard capture - typing anywhere focuses Cal input
  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      // Ignore if already in an input, textarea, or contenteditable
      const target = e.target;
      const tagName = target.tagName?.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea' || target.isContentEditable;

      // Ignore modifier keys, special keys, and if in modal/input
      const isTypingKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

      if (isInput || !isTypingKey) return;

      // Check if any modal is open (settings, event modal)
      const hasOpenModal = document.querySelector('.modal-overlay, .settings-overlay');
      if (hasOpenModal) return;

      // Open AI chat and dispatch focus event with the typed character
      setIsAIChatOpen(true);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('calai-focus', { detail: { key: e.key } }));
      }, 100);
    };

    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="app-container"
      >
        <ThemeBackground />
        <Header
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAI={() => setIsAIChatOpen(true)}
        />

        <main
          className="main-content"
          ref={containerRef}
        >
          <div className="calendar-container" style={{ flex: `1 1 calc(${100 - sidebarPercent}% - 6px)` }}>
            <Calendar />
          </div>

          <div
            className="resize-handle"
            onMouseDown={startResizing}
          >
            <div className="resize-line" />
          </div>

          <div className="sidebar-container" style={{ width: `${sidebarPercent}%`, flexShrink: 0 }}>
            <UpcomingSidebar />
          </div>
        </main>

        <EventModal />

        <AIChat
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
        />

        <Settings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        <Toast />
      </MotionDiv>
    </div>
  );
};

export default App;
