import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn, getEventColor, formatDuration } from '../../utils/helpers';
import {
  countRemainingEvents,
  formatFullDate,
  formatTime,
  formatTime24,
  getDayHours,
  getEventPosition,
  getRelativeDayLabel,
  sortEventsByStart
} from '../../utils/dateUtils';
import { Clock, Plus } from 'lucide-react';
import { useHourScale } from '../../utils/useHourScale';
import { layoutOverlappingEvents } from '../../utils/eventLayout';
import './DayView.css';

const buildEventSnippet = (event) => {
  const pieces = [];
  if (event.category) {
    pieces.push(`${event.category.charAt(0).toUpperCase()}${event.category.slice(1)}`);
  }
  pieces.push(event.title || 'Untitled');
  if (event.location) {
    pieces.push(event.location);
  }
  if (event.reminder) {
    pieces.push(`${event.reminder}m reminder`);
  }
  return pieces.join(' · ');
};

const DayView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();
  const dayGridRef = useRef(null);

  const dayEvents = sortEventsByStart(getEventsForDate(currentDate));
  const now = new Date();
  const remainingCount = countRemainingEvents(dayEvents, now);
  const dayHours = getDayHours();
  const pixelsPerHour = useHourScale({ containerRef: dayGridRef, offset: 24, fitToViewport: true });

  const handleAddEvent = () => {
    const startTime = new Date(currentDate);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    openEventModal({ start: startTime, end: endTime });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="day-view"
    >
      <div className={cn('day-header', 'glass-card')}>
        <div className="day-info">
          <div className="day-name">{getRelativeDayLabel(currentDate)}</div>
          <div className="day-date">{formatFullDate(currentDate)}</div>
        </div>
        <div className="day-stats">
          <div className="stat">
            <span className="stat-number">{remainingCount}</span>
            <span className="stat-label">
              {`event${remainingCount !== 1 ? 's' : ''} remaining`}
            </span>
          </div>
          <div className="stat">
            <span className="stat-number">{dayEvents.length}</span>
            <span className="stat-label">
              {`event${dayEvents.length !== 1 ? 's' : ''} total`}
            </span>
          </div>
          <button className="btn btn-primary day-add-btn" onClick={handleAddEvent}>
            <Plus size={16} /> Add Event
          </button>
        </div>
      </div>

      <div
        className="day-grid glass-card"
        ref={dayGridRef}
        style={{ '--hour-height': `${pixelsPerHour}px` }}
        role="grid"
        aria-label="Day schedule"
      >
        <div className="day-time-column">
          {dayHours.map((hour) => (
            <div key={hour.getHours()} className="day-time-slot">
              {formatTime24(hour)}
            </div>
          ))}
        </div>

        <div className="day-grid-body">
          {dayHours.map((hour) => (
            <div key={`hour-${hour.getHours()}`} className="day-hour-cell" />
          ))}

          <div className="day-events-layer">
            {layoutOverlappingEvents(dayEvents).map(({ event, column, columns }, index) => {
              const { top, height: rawHeight } = getEventPosition(event, currentDate, pixelsPerHour);
              const height = Math.max(rawHeight * 0.7, 18);
              const isPastEvent = new Date(event.end || event.start) < now;
              const gap = 6;
              const width = `calc((100% / ${columns}) - ${gap}px)`;
              const left = `calc(${column} * (100% / ${columns}) + ${gap / 2}px)`;
              return (
                <motion.button
                  key={event.id}
                  type="button"
                  className={cn('day-event-card', isPastEvent && 'past-event')}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left,
                    width,
                    zIndex: 5 + column,
                    backgroundColor: event.color || getEventColor(event.category)
                  }}
                  onClick={() => openEventModal(event)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="event-time">
                    <Clock size={12} />
                    <span>
                      {formatTime(new Date(event.start))}–{formatTime(new Date(event.end))}
                    </span>
                    <span className="event-duration">{formatDuration(event.start, event.end)}</span>
                  </div>
                  <div className="event-snippet">{buildEventSnippet(event)}</div>
                </motion.button>
              );
            })}
          </div>

          {dayEvents.length === 0 && (
            <div className="day-empty-state">
              <div className="empty-title">No events scheduled</div>
              <div className="empty-subtitle">Add something for this day to get started.</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DayView;
