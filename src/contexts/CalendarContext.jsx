import { useState } from 'react';
import { CalendarContext } from './calendarContext';
import { CALENDAR_VIEWS } from './calendarViews';

export const CalendarProvider = ({
  children,
  initialDate,
  initialView,
  initialSelectedEvent,
  initialEventModalOpen
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate ?? new Date());
  const [view, setView] = useState(initialView ?? CALENDAR_VIEWS.WEEK);
  const [selectedEvent, setSelectedEvent] = useState(initialSelectedEvent ?? null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(initialEventModalOpen ?? false);

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
