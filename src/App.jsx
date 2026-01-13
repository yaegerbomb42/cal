import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { EventsProvider } from './contexts/EventsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Header from './components/Header/Header';
import Calendar from './components/Calendar/Calendar';
import EventModal from './components/Events/EventModal';
import AIChat from './components/AI/AIChat';
import Settings from './components/Settings/Settings';
import Toast from './components/Toast/Toast';
import UpcomingSidebar from './components/Sidebar/UpcomingSidebar';
import './App.css';

function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <EventsProvider>
          <CalendarProvider>
            <MainLayout />
          </CalendarProvider>
        </EventsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useEffect(() => {
    if (user) {
      // Initialize Gemini with user email for access control
      const authorized = geminiService.initialize(user.email);
      if (!authorized) {
        // Optional: Show warning about restricted access
        console.warn('AI features restricted for this account');
      }
    }
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="app-container"
      >
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
      </motion.div>
    </div>
  );
};

export default App;
