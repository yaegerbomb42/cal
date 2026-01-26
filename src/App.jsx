import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { EventsProvider } from './contexts/EventsContext';
import { AuthProvider } from './contexts/AuthContext';
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
      // This is a zero-cost check if window.ai exists.
      localBrainService.initialize();
    };

    initializeAI();
  }, [user]);

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

        <main className="main-content">
          <div className="sidebar-container">
            <UpcomingSidebar />
          </div>
          <div className="calendar-container">
            <Calendar />
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
