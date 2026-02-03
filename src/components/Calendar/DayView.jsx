import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { format, getDayOfYear, setDayOfYear } from 'date-fns';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { cn, getEventColor, formatDuration } from '../../utils/helpers';
import {
  formatFullDate,
  formatTime,
  getDayHours,
  getEventPosition,
  getRelativeDayLabel,
  sortEventsByStart,
  isToday,
  getCurrentTimePosition
} from '../../utils/dateUtils';
import { Clock, Plus } from 'lucide-react';
import { useHourScale } from '../../utils/useHourScale';
import { getEventOverlapLayout } from '../../utils/eventOverlap';
import AIChatInput from '../UI/AIChatInput';
import NavigationDropdown from '../UI/NavigationDropdown';
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
  const { currentDate, openEventModal, setCurrentDate } = useCalendar();
  const { getEventsForDate } = useEvents();

  const MotionDiv = motion.div;
  const MotionButton = motion.button;
  const dayGridRef = useRef(null);

  const dayEvents = sortEventsByStart(getEventsForDate(currentDate));
  const now = new Date();
  const dayHours = getDayHours();
  const pixelsPerHour = useHourScale({ containerRef: dayGridRef, offset: 24, fitToViewport: false });
  const { items: dayLayout, maxOverlap } = getEventOverlapLayout(dayEvents);

  const [currentTick, setCurrentTick] = useState(Date.now());

  useEffect(() => {
    const updateTime = () => setCurrentTick(Date.now());
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const showCurrentTime = isToday(currentDate);
  const currentTimePosition = showCurrentTime ? getCurrentTimePosition(pixelsPerHour) : null;

  const handleAddEvent = () => {
    const startTime = new Date(currentDate);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    openEventModal({ start: startTime, end: endTime });
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="day-view"
    >
      <div className={cn('day-header', 'glass-card')} style={{ justifyContent: 'space-between', gap: '2rem' }}>

        {/* Left: AI */}
        <div className="day-ai-wrapper" style={{ width: '280px', flexShrink: 0 }}>
          <AIChatInput
            onSubmit={({ text, files }) => {
              if (text) {
                window.dispatchEvent(new CustomEvent('calai-navigate', { detail: { view: 'day', query: text } }));
              }
              if (files && files.length > 0) {
                window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
                window.dispatchEvent(new CustomEvent('calai-open'));
              }
            }}
            compact
          />
        </div>

        {/* Center: Day selection (Dense Grid) */}
        <div className="day-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'row', gap: '1rem' }}>
          <NavigationDropdown
            label="Day of Year"
            value={getDayOfYear(currentDate)}
            range={{ start: 1, end: 366 }}
            onChange={(dayNum) => {
              const newDate = setDayOfYear(currentDate, dayNum);
              setCurrentDate(newDate);
            }}
            type="grid" // Will be dense!
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className="day-name" style={{ fontSize: '0.9rem' }}>{getRelativeDayLabel(currentDate)}</div>
            <div className="day-date" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{formatFullDate(currentDate)}</div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="day-stats" style={{ width: '280px', justifyContent: 'flex-end', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="day-stat-pill" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {dayEvents.length} events
          </span>
          <button className="btn btn-primary day-add-btn" onClick={handleAddEvent}>
            <Plus size={16} /> Add
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
              {format(hour, 'h a').toLowerCase().replace(' ', '')}
            </div>
          ))}
        </div>

        <div className="day-grid-body">
          {dayHours.map((hour) => {
            const handleSlotClick = () => {
              const startTime = new Date(currentDate);
              startTime.setHours(hour.getHours(), 0, 0, 0);
              const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
              openEventModal({ start: startTime, end: endTime });
            };
            return (
              <div
                key={`hour-${hour.getHours()}`}
                className="day-hour-cell"
                onClick={handleSlotClick}
                title={`Add event at ${format(hour, 'h a')}`}
              />
            );
          })}

          <div className="day-events-layer" style={{ '--overlap-count': maxOverlap }}>
            {dayLayout.map(({ event, column }, index) => {
              const { top, height: rawHeight } = getEventPosition(event, currentDate, pixelsPerHour);
              const height = Math.max(rawHeight * 0.7, 18);
              const isPastEvent = new Date(event.end || event.start) < now;
              const rowStart = Math.max(1, Math.floor(top) + 1);
              const rowSpan = Math.max(18, Math.ceil(height));
              return (
                <MotionButton
                  key={event.id}
                  type="button"
                  className={cn('day-event-card', isPastEvent && 'past')}
                  style={{
                    gridColumnStart: column + 1,
                    gridColumnEnd: column + 2,
                    gridRow: `${rowStart} / span ${rowSpan}`,
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
                </MotionButton>
              );
            })}
          </div>

          {showCurrentTime && currentTimePosition !== null && (
            <div className="day-current-time" style={{ top: `${currentTimePosition}px` }}>
              <div className="current-time-line"></div>

              <div className="current-time-label">{format(currentTick, 'h:mm a')}</div>
            </div>
          )}

          {dayEvents.length === 0 && (
            <div className="day-empty-state">
              <div className="empty-title">No events scheduled</div>
              <div className="empty-subtitle">Add something for this day to get started.</div>
            </div>
          )}
        </div>
      </div>
    </MotionDiv>
  );
};

export default DayView;
