import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWeekDays, getDayHours, formatTime, isToday } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn } from '../../utils/helpers';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();
  const [hoveredHour, setHoveredHour] = useState(null);

  const weekDays = getWeekDays(currentDate);
  const dayHours = getDayHours();

  const handleTimeSlotClick = (day, hour) => {
    const startTime = new Date(day);
    startTime.setHours(hour.getHours(), 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    openEventModal({
      start: startTime,
      end: endTime
    });
  };

  const handleEventClick = (event) => {
    openEventModal(event);
  };

  return (
    <div className="week-view">
      {/* Week Header */}
      <div className="week-header">
        <div className="time-gutter"></div>
        {weekDays.map((day, index) => (
          <motion.div
            key={day.toISOString()}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'week-day-header',
              isToday(day) && 'today'
            )}
          >
            <div className="day-name">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="day-date">
              {day.getDate()}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 24-Hour Fisheye Grid */}
      <div
        className="week-grid-fisheye"
        onMouseLeave={() => setHoveredHour(null)}
      >
        {dayHours.map((hour) => {
          const hourNum = hour.getHours();
          const isFocused = hoveredHour === hourNum;
          const isNear = hoveredHour !== null && Math.abs(hoveredHour - hourNum) === 1;

          return (
            <div
              key={hourNum}
              className={cn(
                "hour-row",
                isFocused && "row-focused",
                isNear && "row-near"
              )}
              onMouseEnter={() => setHoveredHour(hourNum)}
            >
              {/* Time Label */}
              <div className="time-cell">
                <span className="time-label">
                  {formatTime(hour).replace(':00', '')}
                </span>
              </div>

              {/* Day Cells */}
              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day).filter(e => {
                  const start = new Date(e.start);
                  return start.getHours() === hourNum;
                });

                return (
                  <div
                    key={day.toISOString()}
                    className="day-cell"
                    onClick={() => handleTimeSlotClick(day, hour)}
                  >
                    {dayEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        layoutId={event.id}
                        className="event-chip"
                        style={{ '--event-color': event.color || '#6366f1' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                      >
                        <span className="event-title">{event.title}</span>
                        {isFocused && event.description && (
                          <span className="event-desc-preview">{event.description.substring(0, 30)}...</span>
                        )}
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