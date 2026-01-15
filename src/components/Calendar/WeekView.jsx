import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getWeekDays, getDayHours, formatTime24, isToday, startOfDay, endOfDay } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn, getEventColor } from '../../utils/helpers';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { events } = useEvents();
  const weekDays = getWeekDays(currentDate);
  const dayHours = getDayHours();
  const weekStart = startOfDay(weekDays[0]);
  const weekEnd = endOfDay(weekDays[weekDays.length - 1]);
  const weekEvents = events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= weekEnd && eventEnd >= weekStart;
  });
  const weekEventsCount = weekEvents.length;

  // Current Time Indicator Logic
  const [currentTick, setCurrentTick] = useState(Date.now());

  useEffect(() => {
    const updateTime = () => {
      setCurrentTick(Date.now());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const handleTimeSlotClick = (day, hour) => {
    const startTime = new Date(day);
    startTime.setHours(hour.getHours(), 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);
    openEventModal({ start: startTime, end: endTime });
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    openEventModal(event);
  };

  return (
    <div className="week-view">
      <div className="week-summary glass-card">
        <div className="week-summary-title">This Week</div>
        <div className="week-summary-stat">
          <span className="stat-number">{weekEventsCount}</span>
          <span className="stat-label">Events</span>
        </div>
      </div>

      {/* Header */}
      <div className="week-header glass-card">
        <div className="header-cell gutter"></div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className={cn('header-cell', isToday(day) && 'today')}>
            <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span className="day-num">{day.getDate()}</span>
          </div>
        ))}
      </div>

      {/* 24h Grid - Relative positioning for Time Indicator */}
      <div className="week-grid">

        {/* Red Line Time Indicator */}
        {dayHours.map((hour) => {
          const hourNum = hour.getHours();

          // Check if this hour contains the current time
          const now = new Date(currentTick);
          const isCurrentHour = isToday(currentDate) && now.getHours() === hourNum;
          // Calculate percentage for top position (0-100%)
          const currentMinPercent = isCurrentHour ? (now.getMinutes() / 60) * 100 : 0;

          return (
            <div
              key={hourNum}
              className="time-slot"
            >
              <div className="time-label">
                {formatTime24(hour)}
              </div>

              {/* Time Line (only if current hour) */}
              {isCurrentHour && (
                <div
                  className="current-time-line"
                  style={{ top: `${currentMinPercent}%` }}
                >
                  <div className="current-time-circle" />
                  <div className="current-time-label">
                    {formatTime24(now)}
                  </div>
                </div>
              )}

              {weekDays.map((day) => {
                const dayStart = startOfDay(day);
                const dayEnd = endOfDay(day);
                const slotStart = new Date(dayStart);
                slotStart.setHours(hourNum, 0, 0, 0);
                const slotEnd = new Date(slotStart);
                slotEnd.setHours(hourNum + 1);
                const dayEvents = weekEvents.filter((event) => {
                  const eventStart = new Date(event.start);
                  const eventEnd = new Date(event.end);

                  if (eventStart > dayEnd || eventEnd < dayStart) {
                    return false;
                  }

                  const displayStart = eventStart < dayStart ? dayStart : eventStart;
                  return displayStart >= slotStart && displayStart < slotEnd;
                });

                return (
                  <div
                    key={day.toISOString()}
                    className="day-column"
                    onClick={() => handleTimeSlotClick(day, hour)}
                  >
                    {dayEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        className="event-chip"
                        style={{
                          backgroundColor: event.color || getEventColor(event.category)
                        }}
                        onClick={(e) => handleEventClick(event, e)}
                        layout // Animate layout changes
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        {event.title}
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;
