import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { cn, getEventColor, formatDuration } from '../../utils/helpers';
import {
  formatTime,
  getDayHours,
  getEventPosition,
  sortEventsByStart,
  getCurrentTimePosition
} from '../../utils/dateUtils';
import { Clock } from 'lucide-react';
import { useHourScale } from '../../utils/useHourScale';
import { getEventOverlapLayout } from '../../utils/eventOverlap';
import AIChatInput from '../UI/AIChatInput';
import NavigationDropdown from '../UI/NavigationDropdown';
import StandardViewHeader from '../Header/StandardViewHeader';
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
  const { getEventsForDate, updateEvent } = useEvents();

  const MotionDiv = motion.div;
  const MotionButton = motion.button;
  const dayGridRef = useRef(null);
  const [draggedEvent, setDraggedEvent] = useState(null);

  const dayEvents = sortEventsByStart(getEventsForDate(currentDate));
  const now = new Date();
  const dayHours = getDayHours();
  const pixelsPerHour = useHourScale({ containerRef: dayGridRef, offset: 24, fitToViewport: true });
  const { items: dayLayout, maxOverlap } = getEventOverlapLayout(dayEvents);

  const [currentTick, setCurrentTick] = useState(Date.now());

  useEffect(() => {
    const updateTime = () => setCurrentTick(Date.now());
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Always show current time bar regardless of which day is displayed
  const currentTimePosition = getCurrentTimePosition(pixelsPerHour);

  const handleAddEvent = () => {
    const startTime = new Date(currentDate);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    openEventModal({ start: startTime, end: endTime });
  };

  const handleDragStart = (event, e) => {
    setDraggedEvent(event);
    e.dataTransfer.setData('text/plain', event.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnCell = (hour, e) => {
    e.preventDefault();
    if (!draggedEvent) return;

    try {
      const originalEvent = draggedEvent;
      const originalStart = new Date(originalEvent.start);
      const originalEnd = new Date(originalEvent.end);
      const duration = originalEnd.getTime() - originalStart.getTime();

      const newStart = new Date(currentDate);
      newStart.setHours(hour.getHours(), originalStart.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      updateEvent(originalEvent.id, {
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      });
    } catch (err) {
      console.error('Failed to drop event:', err);
    } finally {
      setDraggedEvent(null);
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="day-view"
    >
      <StandardViewHeader
        onAIChatSubmit={({ text, files }) => {
          if (text) {
            window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text } }));
            window.dispatchEvent(new CustomEvent('calai-open'));
          }
          if (files && files.length > 0) {
            window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
            window.dispatchEvent(new CustomEvent('calai-open'));
          }
        }}
        centerContent={
          <div className="day-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <select
                value={currentDate.getDate()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="view-select-dropdown"
                style={{ padding: '2px 24px 2px 8px', fontSize: '0.9rem' }}
              >
                {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                  const dayNum = i + 1;
                  return <option key={dayNum} value={dayNum}>{dayNum}</option>;
                })}
              </select>
              <select
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="view-select-dropdown"
                style={{ padding: '2px 24px 2px 8px', fontSize: '0.9rem' }}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i}>{format(new Date(currentDate.getFullYear(), i, 1), 'MMM')}</option>
                ))}
              </select>
              <select
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="view-select-dropdown"
                style={{ padding: '2px 24px 2px 8px', fontSize: '0.9rem' }}
              >
                {[...Array(10)].map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          </div>
        }
        rightContent={
          <span className="day-stat-pill" style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-muted)' }}>
            {dayEvents.length} events
          </span>
        }
        onAddEvent={handleAddEvent}
      />

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
                className={cn('day-hour-cell', draggedEvent && 'drop-target')}
                onClick={handleSlotClick}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnCell(hour, e)}
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
                    backgroundColor: event.color || getEventColor(event.category),
                    cursor: 'grab'
                  }}
                  onClick={() => openEventModal(event)}
                  draggable
                  onDragStart={(e) => handleDragStart(event, e)}
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

          {currentTimePosition !== null && (
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
