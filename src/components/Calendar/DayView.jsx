import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { cn, getEventColor } from '../../utils/helpers';
import {
  formatTime,
  getDayHours,
  sortEventsByStart
} from '../../utils/dateUtils';
import { Clock, MapPin } from 'lucide-react';
import { useHourScale } from '../../utils/useHourScale';
import { getEventOverlapLayout } from '../../utils/eventOverlap';
import './DayView.css';



const DayView = () => {
  const { currentDate, openEventModal, isArchiveMode } = useCalendar();
  const { getEventsForDate, updateEvent, archiveEvent } = useEvents();

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
              const start = new Date(event.start);
              const end = new Date(event.end);
              const minutesFromDayStart = start.getHours() * 60 + start.getMinutes();
              const durationMinutes = Math.max(15, (end.getTime() - start.getTime()) / (1000 * 60));

              const isPastEvent = end < now;
              const rowStart = minutesFromDayStart + 1;
              const rowSpan = Math.ceil(durationMinutes);

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
                  onClick={(e) => {
                    if (isArchiveMode) {
                      e.stopPropagation();
                      archiveEvent(event.id);
                    } else {
                      openEventModal(event);
                    }
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(event, e)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="event-time" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Clock size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: '500' }}>
                      {formatTime(new Date(event.start))} - {formatTime(new Date(event.end))}
                    </span>
                  </div>
                  <div className="event-snippet" style={{ fontSize: '0.75rem', fontWeight: '600', lineHeight: '1.2', marginTop: '2px', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {event.title || 'Untitled'}
                  </div>
                  {event.location && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="event-location-link"
                      onClick={(e) => { e.stopPropagation(); }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '4px', color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.65rem', fontWeight: '500' }}
                    >
                      <MapPin size={10} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        whiteSpace: 'normal',
                        pointerEvents: 'none'
                      }}>
                        {event.location}
                      </span>
                    </a>
                  )}
                </MotionButton>
              );
            })}

            {/* Live time indicator with absolute accuracy */}
            {(() => {
              const nowTick = new Date(currentTick);
              const hours = nowTick.getHours();
              const minutes = nowTick.getMinutes();
              const seconds = nowTick.getSeconds();

              // Exact position based on hour map
              const exactTop = (hours * pixelsPerHour) + ((minutes / 60) * pixelsPerHour) + ((seconds / 3600) * pixelsPerHour);

              return (
                <div className="day-time-indicator-grid-container">
                  <div
                    className="day-current-time-grid"
                    style={{ top: `${exactTop}px` }}
                  >
                    <div className="current-time-line"></div>
                  </div>
                </div>
              );
            })()}
          </div>

          {dayEvents.length === 0 && (
            <div className="week-empty-state">
              <div className="empty-title">No events scheduled</div>
              <div className="empty-subtitle">Tap + to add events</div>
            </div>
          )}
        </div>
      </div>
    </MotionDiv>
  );
};

export default DayView;
