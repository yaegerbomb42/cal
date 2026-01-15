import { createContext, useContext, useState } from 'react';

const CalendarContext = createContext();

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

export const CALENDAR_VIEWS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year'
};

export const CalendarProvider = ({ children }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(CALENDAR_VIEWS.WEEK);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const navigateDate = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (view) {
        case CALENDAR_VIEWS.DAY:
          newDate.setDate(newDate.getDate() + direction);
          break;
        case CALENDAR_VIEWS.WEEK:
          newDate.setDate(newDate.getDate() + (direction * 7));
          break;
        case CALENDAR_VIEWS.MONTH:
          newDate.setMonth(newDate.getMonth() + direction);
          break;
        case CALENDAR_VIEWS.YEAR:
          newDate.setFullYear(newDate.getFullYear() + direction);
          break;
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const openEventModal = (event = null) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
    setIsEventModalOpen(false);
  };

  return (
    <CalendarContext.Provider value={{
      currentDate,
      setCurrentDate,
      view,
      setView,
      selectedEvent,
      isEventModalOpen,
      navigateDate,
      goToToday,
      openEventModal,
      closeEventModal
    }}>
      {children}
    </CalendarContext.Provider>
  );
};
