import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { EventsProvider } from './contexts/EventsContext';
import Header from './components/Header/Header';
import Calendar from './components/Calendar/Calendar';
import EventModal from './components/Events/EventModal';
import AIChat from './components/AI/AIChat';
import Settings from './components/Settings/Settings';
import Toast from './components/Toast/Toast';
import './App.css';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <ThemeProvider>
      <EventsProvider>
        <CalendarProvider>
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
                <div className="container">
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
        </CalendarProvider>
      </EventsProvider>
    </ThemeProvider>
  );
}

export default App;
