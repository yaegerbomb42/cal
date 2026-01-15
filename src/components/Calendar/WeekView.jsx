import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getWeekDays, getDayHours, formatTime24, isToday } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn, getEventColor } from '../../utils/helpers';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();
  const [hoveredHour, setHoveredHour] = useState(null);
  const containerRef = useRef(null);

  const weekDays = getWeekDays(currentDate);
  const dayHours = getDayHours();
  const weekEventsCount = weekDays.reduce((total, day) => total + getEventsForDate(day).length, 0);

  // Current Time Indicator Logic
  const [currentTimePos, setCurrentTimePos] = useState(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const percentage = (minutes / 1440) * 100;
      setCurrentTimePos(percentage);
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

  const getScaleFactor = (hourNum) => {
    if (hoveredHour === null) return 1;
    const distance = Math.abs(hoveredHour - hourNum);

    // Fisheye Curve
    if (distance === 0) return 6;    // Active
    if (distance === 1) return 2.5;  // Neighbors
    if (distance === 2) return 1.5;  // Far neighbors
    if (distance === 3) return 1;    // Outer neighbors
    return 0.5;                      // Compressed
  };

  return (
    <div className="week-view" ref={containerRef}>
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

      {/* 24h Fisheye Grid - Relative positioning for Time Indicator */}
      <div className="week-grid" onMouseLeave={() => setHoveredHour(null)}>

        {/* Red Line Time Indicator */}
        {dayHours.map((hour) => {
          const hourNum = hour.getHours();
          const scale = getScaleFactor(hourNum);
          const isFocused = hoveredHour === hourNum;

          // Check if this hour contains the current time
          const now = new Date();
          const isCurrentHour = isToday(currentDate) && now.getHours() === hourNum;
          // Calculate percentage for top position (0-100%)
          const currentMinPercent = isCurrentHour ? (now.getMinutes() / 60) * 100 : 0;

          return (
            <div
              key={hourNum}
              className={cn('time-slot', isFocused && 'focused')}
              style={{
                flexGrow: scale,
              }}
              onMouseEnter={() => setHoveredHour(hourNum)}
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
                const dayEvents = getEventsForDate(day).filter(e => {
                  const start = new Date(e.start);
                  return start.getHours() === hourNum;
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
