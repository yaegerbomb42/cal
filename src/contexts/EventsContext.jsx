import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { firebaseService } from '../services/firebaseService';
import { debounce } from '../utils/helpers';
import { validateEvent, checkEventConflicts } from '../utils/eventValidator';
import { toastService } from '../utils/toast';
import { reminderService } from '../services/reminderService';
import { googleCalendarService } from '../services/googleCalendarService';

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

  // Poll Google Calendar for updates
  useEffect(() => {
    let intervalId;

    const syncGoogleEvents = async () => {
      if (googleCalendarService.isAuthorized) {
        try {
          const gEvents = await googleCalendarService.listUpcomingEvents();
          if (gEvents && gEvents.length > 0) {
            setEvents(prevEvents => {
              const newEvents = [...prevEvents];
              let hasChanges = false;

              gEvents.forEach(gEvent => {
                // Check if event already exists (deduplication)
                // We look for either a matching gcalId OR a matching title/start time pair
                const exists = newEvents.some(e =>
                  (e.gcalId && e.gcalId === gEvent.gcalId) ||
                  (!e.gcalId && e.title === gEvent.title && e.start === gEvent.start)
                );

                if (!exists) {
                  newEvents.push(gEvent);
                  hasChanges = true;
                }
              });

              if (hasChanges) {
                // If we added events, trigger a save
                // We can't call debouncedFirebaseSave directly inside the state updater safely without care
                // So we just return the new state, and let the main useEffect handle persistence
                return newEvents;
              }
              return prevEvents;
            });
          }
        } catch (error) {
          console.error("Auto-sync failed", error);
        }
      }
    };

    // Initial sync
    syncGoogleEvents();

    // Poll every 5 minutes
    intervalId = setInterval(syncGoogleEvents, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

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

  // Debounced Firebase save function
  const debouncedFirebaseSave = useCallback(
    debounce(async (eventsToSave) => {
      try {
        await firebaseService.saveEvents(eventsToSave);
      } catch (error) {
        console.log('Could not save to Firebase, localStorage backup available:', error);
        toastService.warning('Could not sync to cloud. Data saved locally.');
      }
    }, 1000),
    []
  );

  // Save events to both Firebase and localStorage
  useEffect(() => {
    if (!isLoading && events.length >= 0) {
      // Save to localStorage immediately
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

      // Debounced Firebase save
      debouncedFirebaseSave(events);
    }
  }, [events, isLoading, debouncedFirebaseSave]);

  const addEvent = async (event, options = {}) => {
    // Validate event
    const validation = validateEvent(event);
    if (!validation.isValid) {
      toastService.error(validation.errors[0]);
      throw new Error(validation.errors[0]);
    }

    // Check conflicts if not disabled
    if (!options.skipConflictCheck) {
      const conflicts = checkEventConflicts(event, events);
      if (conflicts.length > 0 && !options.allowConflicts) {
        toastService.warning(`This event conflicts with ${conflicts.length} existing event(s)`);
        return null;
      }
    }

    const newEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      ...event
    };

    setEvents(prev => [...prev, newEvent]);
    toastService.success(`Event "${newEvent.title}" created successfully`);

    // Sync to Google Calendar if connected
    if (googleCalendarService.isAuthorized) {
      try {
        await googleCalendarService.addEvent(newEvent);
      } catch (error) {
        console.error('Failed to sync to Google Calendar:', error);
      }
    }

    // Schedule reminder if set
    if (newEvent.reminder) {
      reminderService.updateEventReminders(newEvent);
    }

    // Send notification (fire-and-forget)
    import('../services/notificationService').then(({ notificationService }) => {
      notificationService.sendEventNotification(newEvent).catch(error => {
        console.log('Could not send notification:', error);
      });
    }).catch(error => {
      console.log('Could not load notification service:', error);
    });

    return newEvent;
  };

  const updateEvent = (id, updates) => {
    const existingEvent = events.find(e => e.id === id);
    if (!existingEvent) {
      toastService.error('Event not found');
      return;
    }

    const updatedEvent = { ...existingEvent, ...updates };
    const validation = validateEvent(updatedEvent);

    if (!validation.isValid) {
      toastService.error(validation.errors[0]);
      return;
    }

    // Check conflicts
    const conflicts = checkEventConflicts(updatedEvent, events.filter(e => e.id !== id));
    if (conflicts.length > 0) {
      toastService.warning(`This update creates conflicts with ${conflicts.length} event(s)`);
    }

    setEvents(prev => prev.map(event =>
      event.id === id ? updatedEvent : event
    ));

    // Update reminders
    reminderService.updateEventReminders(updatedEvent);

    toastService.success('Event updated successfully');
  };

  const deleteEvent = (id) => {
    const event = events.find(e => e.id === id);

    // Cancel reminders
    if (event) {
      reminderService.cancelEventReminders(id);
    }

    setEvents(prev => prev.filter(event => event.id !== id));
    if (event) {
      toastService.success(`Event "${event.title}" deleted`);
    }
  };

  const searchEvents = (query) => {
    if (!query || !query.trim()) return events;
    const lowerQuery = query.toLowerCase();
    return events.filter(event =>
      event.title?.toLowerCase().includes(lowerQuery) ||
      event.description?.toLowerCase().includes(lowerQuery) ||
      event.location?.toLowerCase().includes(lowerQuery) ||
      event.category?.toLowerCase().includes(lowerQuery)
    );
  };

  const filterEvents = (filters) => {
    let filtered = events;

    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.startDate) {
      filtered = filtered.filter(e => new Date(e.start) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      filtered = filtered.filter(e => new Date(e.start) <= new Date(filters.endDate));
    }

    if (filters.search) {
      filtered = searchEvents(filters.search);
    }

    return filtered;
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
      searchEvents,
      filterEvents,
      isLoading
    }}>
      {children}
    </EventsContext.Provider>
  );
};