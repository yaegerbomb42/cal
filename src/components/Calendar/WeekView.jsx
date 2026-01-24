import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { endOfDay, getCurrentTimePosition, getDayHours, getEventPosition, getWeekDays, isToday, startOfDay, formatTime24 } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn, formatDuration, getEventColor } from '../../utils/helpers';
import { useHourScale } from '../../utils/useHourScale';
import { layoutOverlappingEvents } from '../../utils/eventLayout';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { events, getEventsForDate } = useEvents();
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

  const weekGridRef = useRef(null);
  const [magnifyHour, setMagnifyHour] = useState(null);
  const pixelsPerHour = useHourScale({ containerRef: weekGridRef, offset: 24, fitToViewport: true });

  const [currentTick, setCurrentTick] = useState(Date.now());

  useEffect(() => {
    const updateTime = () => setCurrentTick(Date.now());
    updateTime();
    const interval = setInterval(updateTime, 60000);
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
  const now = new Date();

  const handleGridMouseMove = (event) => {
    if (!weekGridRef.current) return;
    const rect = weekGridRef.current.getBoundingClientRect();
    const localY = event.clientY - rect.top;
    const slotHeight = rect.height / 24;
    const hour = Math.min(23, Math.max(0, Math.floor(localY / slotHeight)));
    setMagnifyHour(hour);
  };

  const handleGridMouseLeave = () => {
    setMagnifyHour(null);
  };

  const getMagnifyClass = (hourValue) => {
    if (magnifyHour === null || magnifyHour === undefined) return '';
    const distance = Math.abs(hourValue - magnifyHour);
    if (distance < 0.25) return 'magnify-core';
    if (distance < 0.75) return 'magnify-near';
    if (distance < 1.5) return 'magnify-far';
    return '';
  };

  return (
    <div
      className="week-view"
      style={{
        '--hour-height': `${pixelsPerHour}px`,
        '--magnify-index': magnifyHour ?? -1
      }}
    >
      <div className="week-summary glass-card">
        <div className="week-summary-title">This Week</div>
        <div className="week-summary-stat">
          <span className="stat-number">{weekEventsCount}</span>
          <span className="stat-label">Events</span>
        </div>
      </div>

      <div className="week-header glass-card">
        <div className="header-cell gutter"></div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className={cn('header-cell', isToday(day) && 'today')}>
            <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span className="day-num">{day.getDate()}</span>
          </div>
        ))}
      </div>

      <div
        className="week-grid"
        ref={weekGridRef}
        onMouseMove={handleGridMouseMove}
        onMouseLeave={handleGridMouseLeave}
      >
        <div className="week-time-column">
          {dayHours.map((hour) => (
            <div
              key={`time-${hour.getHours()}`}
              className={cn('week-time-slot', getMagnifyClass(hour.getHours()))}
            >
              {formatTime24(hour)}
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
                    className={cn('week-hour-cell', getMagnifyClass(hour.getHours()))}
                    onClick={() => handleTimeSlotClick(day, hour)}
                  />
                ))}

                <div className="week-events-layer">
                  {layoutOverlappingEvents(dayEvents).map(({ event, column, columns }, index) => {
                    const { top, height: rawHeight } = getEventPosition(event, day, pixelsPerHour);
                    const height = Math.max(rawHeight * 0.7, 18);
                    const isPastEvent = new Date(event.end || event.start) < now;
                    const width = `${100 / columns}%`;
                    const left = `calc(${column * (100 / columns)}% + 2px)`;
                    return (
                      <motion.div
                        key={event.id}
                        className={cn('week-event', isPastEvent && 'past-event')}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: event.color || getEventColor(event.category),
                          width,
                          left
                        }}
                        onClick={(e) => handleEventClick(event, e)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="week-event-title">{event.title}</div>
                        {height > 24 && (
                          <div className="week-event-time">
                            {formatTime24(new Date(event.start))} - {formatTime24(new Date(event.end))}
                            <span className="week-event-duration">· {formatDuration(event.start, event.end)}</span>
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
