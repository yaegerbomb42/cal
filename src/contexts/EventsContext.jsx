import { createContext, useContext, useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

const EventsContext = createContext();

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};

const STORAGE_KEY = 'calendar-events';

export const EventsProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Firebase and load events
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      
      // Initialize Firebase
      firebaseService.initialize();
      
      try {
        // Try to load from Firebase first
        const firebaseEvents = await firebaseService.getEvents();
        
        if (firebaseEvents && firebaseEvents.length > 0) {
          setEvents(firebaseEvents);
          // Sync to localStorage as backup
          localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseEvents));
        } else {
          // Fallback to localStorage
          const localEvents = localStorage.getItem(STORAGE_KEY);
          const parsedEvents = localEvents ? JSON.parse(localEvents) : [];
          setEvents(parsedEvents);
          
          // If we have local events, sync them to Firebase
          if (parsedEvents.length > 0) {
            try {
              await firebaseService.saveEvents(parsedEvents);
            } catch (error) {
              console.log('Could not sync local events to Firebase:', error);
            }
          }
        }
      } catch (error) {
        console.log('Firebase not available, using localStorage:', error);
        // Fallback to localStorage only
        const localEvents = localStorage.getItem(STORAGE_KEY);
        setEvents(localEvents ? JSON.parse(localEvents) : []);
      }
      
      setIsLoading(false);
    };

    initializeData();
  }, []);

  // Save events to both Firebase and localStorage
  useEffect(() => {
    if (!isLoading && events.length >= 0) {
      // Save to localStorage immediately
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      
      // Try to save to Firebase
      firebaseService.saveEvents(events).catch(error => {
        console.log('Could not save to Firebase, localStorage backup available:', error);
      });
    }
  }, [events, isLoading]);

  const addEvent = (event) => {
    const newEvent = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...event
    };
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  };

  const updateEvent = (id, updates) => {
    setEvents(prev => prev.map(event => 
      event.id === id ? { ...event, ...updates } : event
    ));
  };

  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getEventsForRange = (startDate, endDate) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart >= startDate && eventStart <= endDate;
    });
  };

  return (
    <EventsContext.Provider value={{
      events,
      addEvent,
      updateEvent,
      deleteEvent,
      getEventsForDate,
      getEventsForRange,
      isLoading
    }}>
      {children}
    </EventsContext.Provider>
  );
};