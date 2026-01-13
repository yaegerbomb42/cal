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
          if (gEvents) {
            setEvents(prevEvents => {
              const googleEventIds = new Set(gEvents.map(ge => ge.gcalId));
              const localGcalEvents = prevEvents.filter(e => e.gcalId);

              // 1. Find local events that were deleted on Google
              const deletedOnGoogle = localGcalEvents.filter(le => !googleEventIds.has(le.gcalId));

              // 2. Find Google events that aren't local yet
              const newOnGoogle = gEvents.filter(ge =>
                !prevEvents.some(le => le.gcalId === ge.gcalId || (le.title === ge.title && le.start === ge.start))
              );

              if (deletedOnGoogle.length > 0 || newOnGoogle.length > 0) {
                let updatedEvents = prevEvents.filter(le => !deletedOnGoogle.some(dl => dl.id === le.id));
                updatedEvents = [...updatedEvents, ...newOnGoogle];

                if (deletedOnGoogle.length > 0) {
                  toastService.info(`Synced ${deletedOnGoogle.length} deletions from Google Calendar`);
                }
                if (newOnGoogle.length > 0) {
                  toastService.success(`Synced ${newOnGoogle.length} new events from Google Calendar`);
                }

                return updatedEvents;
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

  const deleteEvent = async (id) => {
    const event = events.find(e => e.id === id);
    if (event) {
      // Cancel local reminders
      reminderService.cancelEventReminders(id);

      // Delete from Google Calendar if synced
      if (googleCalendarService.isAuthorized && event.gcalId) {
        try {
          await googleCalendarService.deleteEvent(event.gcalId);
        } catch (error) {
          console.error('Failed to delete from Google Calendar:', error);
        }
      }
    }

    setEvents(prev => prev.filter(event => event.id !== id));
    if (event) {
      toastService.success(`Event "${event.title}" deleted`);
    }
  };

  const deleteEventsByCategory = (category) => {
    const toDelete = events.filter(e => e.category?.toLowerCase() === category.toLowerCase());
    if (toDelete.length === 0) {
      toastService.info(`No events found in category "${category}"`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete all ${toDelete.length} events in "${category}"?`)) {
      toDelete.forEach(e => reminderService.cancelEventReminders(e.id));
      setEvents(prev => prev.filter(e => e.category?.toLowerCase() !== category.toLowerCase()));
      toastService.success(`Deleted ${toDelete.length} events from "${category}"`);
    }
  };

  const deleteEventsByFilter = (filterFn, label) => {
    const toDelete = events.filter(filterFn);
    if (toDelete.length === 0) {
      toastService.info(`No events found matching "${label}"`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete all ${toDelete.length} events matching "${label}"?`)) {
      toDelete.forEach(e => reminderService.cancelEventReminders(e.id));
      const idsToDelete = new Set(toDelete.map(e => e.id));
      setEvents(prev => prev.filter(e => !idsToDelete.has(e.id)));
      toastService.success(`Deleted ${toDelete.length} events matching "${label}"`);
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
      deleteEventsByCategory,
      deleteEventsByFilter,
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