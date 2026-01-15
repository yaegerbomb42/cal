import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getWeekDays, getDayHours, formatTime24, getEventPosition, getCurrentTimePosition, isToday } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn, getEventColor } from '../../utils/helpers';
import { useHourScale } from '../../utils/useHourScale';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();
  const weekDays = getWeekDays(currentDate);
  const dayHours = getDayHours();
  const weekEventsCount = weekDays.reduce((total, day) => total + getEventsForDate(day).length, 0);

  const weekGridRef = useRef(null);
  const pixelsPerHour = useHourScale({ containerRef: weekGridRef, minPixels: 16, maxPixels: 48, offset: 24 });

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

  const showCurrentTime = weekDays.some(day => isToday(day));
  const currentTimePosition = showCurrentTime ? getCurrentTimePosition(pixelsPerHour) : null;

  return (
    <div className="week-view" style={{ '--hour-height': `${pixelsPerHour}px` }}>
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

      <div className="week-grid" ref={weekGridRef}>
        <div className="week-time-column">
          {dayHours.map((hour) => (
            <div key={hour.getHours()} className="week-time-slot">
              <span className="time-label">{formatTime24(hour)}</span>
            </div>
          ))}
        </div>

        <div className="week-days-grid">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDate(day);
            return (
              <div key={day.toISOString()} className={cn('week-day-column', isToday(day) && 'today')}>
                {dayHours.map((hour) => (
                  <div
                    key={hour.getHours()}
                    className="week-hour-cell"
                    onClick={() => handleTimeSlotClick(day, hour)}
                  />
                ))}

                <div className="week-events-layer">
                  {dayEvents.map((event, index) => {
                    const { top, height } = getEventPosition(event, day, pixelsPerHour);

                    return (
                      <motion.div
                        key={event.id}
                        className="week-event"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: event.color || getEventColor(event.category)
                        }}
                        onClick={(e) => handleEventClick(event, e)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="week-event-title">{event.title}</div>
                        {height > 40 && (
                          <div className="week-event-time">
                            {formatTime24(new Date(event.start))} - {formatTime24(new Date(event.end))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {showCurrentTime && currentTimePosition !== null && (
          <div className="week-current-time" style={{ top: `${currentTimePosition}px` }}>
            <div className="current-time-line"></div>
            <div className="current-time-circle"></div>
            <div className="current-time-label">{formatTime24(new Date(currentTick))}</div>
          </div>
        )}

        {weekEventsCount === 0 && (
          <div className="week-empty-state">
            <div className="empty-title">No events scheduled</div>
            <div className="empty-subtitle">Tap an hour cell to add something for this week.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeekView;
