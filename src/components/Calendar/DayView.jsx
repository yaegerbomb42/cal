import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn, getEventColor, formatDuration } from '../../utils/helpers';
import { countRemainingEvents, formatFullDate, formatTime, getRelativeDayLabel, sortEventsByStart } from '../../utils/dateUtils';
import { Clock, Plus } from 'lucide-react';
import './DayView.css';

const MAX_VISIBLE_EVENTS = 30;

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
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [layout, setLayout] = useState({ base: 36, expanded: 48, compressed: 32 });
  const listRef = useRef(null);

  const dayEvents = sortEventsByStart(getEventsForDate(currentDate));
  const now = new Date();
  const remainingCount = countRemainingEvents(dayEvents, now);
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const updateLayout = () => {
      const available = container.clientHeight;
      const count = Math.max(visibleEvents.length, 1);
      const base = Math.max(22, Math.min(46, available / count));
      const expanded = Math.min(base * 1.4, base + 20);
      const compressed = count > 1 ? Math.max(18, (available - expanded) / (count - 1)) : base;
      setLayout({ base, expanded, compressed });
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(container);
    return () => observer.disconnect();
  }, [visibleEvents.length, currentDate]);

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
            <span className="stat-label">Remaining</span>
          </div>
          <div className="stat">
            <span className="stat-number">{dayEvents.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <button className="btn btn-primary day-add-btn" onClick={handleAddEvent}>
            <Plus size={16} /> Add Event
          </button>
        </div>
      </div>

      <div className="day-list-wrapper glass-card" ref={listRef}>
        {visibleEvents.length === 0 ? (
          <div className="day-empty-state">
            <div className="empty-title">No events scheduled</div>
            <div className="empty-subtitle">Add something for this day to get started.</div>
          </div>
        ) : (
          <div className="day-list" role="list">
            {visibleEvents.map((event, index) => {
              const isPastEvent = new Date(event.end || event.start) < now;
              const height = hoveredIndex === null
                ? layout.base
                : hoveredIndex === index
                  ? layout.expanded
                  : layout.compressed;

              return (
                <button
                  key={event.id}
                  type="button"
                  className={cn('day-event-card', isPastEvent && 'past-event', hoveredIndex === index && 'is-focused')}
                  style={{
                    height: `${height}px`,
                    borderColor: event.color || getEventColor(event.category)
                  }}
                  onClick={() => openEventModal(event)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                >
                  <div className="event-time">
                    <Clock size={12} />
                    <span>
                      {formatTime(new Date(event.start))}–{formatTime(new Date(event.end))}
                    </span>
                    <span className="event-duration">{formatDuration(event.start, event.end)}</span>
                  </div>
                  <div className="event-snippet">{buildEventSnippet(event)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {dayEvents.length > MAX_VISIBLE_EVENTS && (
        <div className="day-overflow-hint">
          Showing {MAX_VISIBLE_EVENTS} of {dayEvents.length} events
        </div>
      )}
    </motion.div>
  );
};

export default DayView;
