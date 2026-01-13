import { useState } from 'react';
import { motion } from 'framer-motion';
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
    openEventModal({ start: startTime, end: endTime });
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    openEventModal(event);
  };

  const getScaleFactor = (hourNum) => {
    if (hoveredHour === null) return 1;
    const distance = Math.abs(hoveredHour - hourNum);
    if (distance === 0) return 2.5;
    if (distance === 1) return 1.5;
    if (distance === 2) return 1.2;
    return 0.8;
  };

  return (
    <div className="week-view-compact">
      {/* Header */}
      <div className="week-header-compact">
        <div className="time-gutter-compact"></div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className={cn('day-header-compact', isToday(day) && 'today')}>
            <span className="day-name-compact">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span className="day-num-compact">{day.getDate()}</span>
          </div>
        ))}
      </div>

      {/* 24h Grid - No Scroll */}
      <div className="week-grid-compact" onMouseLeave={() => setHoveredHour(null)}>
        {dayHours.map((hour) => {
          const hourNum = hour.getHours();
          const scale = getScaleFactor(hourNum);
          const isFocused = hoveredHour === hourNum;

          return (
            <div
              key={hourNum}
              className={cn('hour-row-compact', isFocused && 'focused')}
              style={{
                flex: scale,
                transition: 'flex 0.2s ease-out'
              }}
              onMouseEnter={() => setHoveredHour(hourNum)}
            >
              <div className="time-cell-compact">
                <span className={cn('time-label-compact', isFocused && 'time-focused')}>
                  {formatTime(hour).replace(':00', '')}
                </span>
              </div>

              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day).filter(e => {
                  const start = new Date(e.start);
                  return start.getHours() === hourNum;
                });

                return (
                  <div
                    key={day.toISOString()}
                    className="day-cell-compact"
                    onClick={() => handleTimeSlotClick(day, hour)}
                  >
                    {dayEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        className="event-chip-compact"
                        style={{ backgroundColor: event.color || 'var(--accent)' }}
                        onClick={(e) => handleEventClick(event, e)}
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="event-title-compact">{event.title}</span>
                        {isFocused && event.description && (
                          <span className="event-desc-compact">{event.description.slice(0, 50)}</span>
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