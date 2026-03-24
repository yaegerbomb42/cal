import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Copy, Trash2, Clock, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { endOfDay, getDayHours, getWeekDays, isToday, startOfDay } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { cn, getEventColor } from '../../utils/helpers';
import { useHourScale } from '../../utils/useHourScale';
import { getEventOverlapLayout } from '../../utils/eventOverlap';
import ContextMenu from '../UI/ContextMenu';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal, draftEvent, smartSuggestions, setSmartSuggestions, setSmartScheduleDraft, smartScheduleDraft, isArchiveMode } = useCalendar();
  const { events, updateEvent, getEventsForDate, deleteEvent, archiveEvent } = useEvents();
  const MotionDiv = motion.div;
  const weekDays = getWeekDays(currentDate);
  const dayHours = getDayHours();
  const weekStart = startOfDay(weekDays[0]);
  const weekEnd = endOfDay(weekDays[weekDays.length - 1]);

  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e, event) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options: [
        { label: 'Edit Event', icon: <Edit2 size={16} />, action: () => openEventModal(event) },
        { label: 'Duplicate', icon: <Copy size={16} />, action: () => handleDuplicateEvent(event) },
        { label: 'Delete', icon: <Trash2 size={16} />, danger: true, action: () => deleteEvent(event.id) }
      ]
    });
  };

  const handleDuplicateEvent = (event) => {
    if (updateEvent) {
      openEventModal({ ...event, id: undefined, title: `${event.title} (Copy)` });
    }
  };

  const weekEvents = events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= weekEnd && eventEnd >= weekStart;
  });
  const weekEventsCount = weekEvents.length;

  const weekGridRef = useRef(null);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const pixelsPerHour = useHourScale({ containerRef: weekGridRef, offset: 32, fitToViewport: false, minPixels: 60 });

  const [currentTick, setCurrentTick] = useState(Date.now());

  useEffect(() => {
    const updateTime = () => setCurrentTick(Date.now());
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTimeSlotClick = (day, hour) => {
    // If we're in smart suggestion mode, ignore normal empty clicks, or cancel
    if (smartSuggestions) {
      return;
    }
    const startTime = new Date(day);
    startTime.setHours(hour.getHours(), 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);
    openEventModal({ start: startTime, end: endTime });
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    if (isArchiveMode) {
      archiveEvent(event.id);
    } else {
      openEventModal(event);
    }
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

  const handleDropOnCell = (day, hour, e) => {
    e.preventDefault();
    if (!draggedEvent) return;
    try {
      const originalEvent = draggedEvent;
      const originalStart = new Date(originalEvent.start);
      const originalEnd = new Date(originalEvent.end);
      const duration = originalEnd.getTime() - originalStart.getTime();

      const newStart = new Date(day);
      if (isNaN(newStart.getTime())) throw new Error("Invalid drop day");

      newStart.setHours(hour.getHours(), originalStart.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      updateEvent(originalEvent.id, {
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      });
    } catch (err) {
      console.error("Failed to drop event:", err);
    } finally {
      setDraggedEvent(null);
    }
  };

  const now = new Date();

  return (
    <div
      className="week-view"
      style={{
        '--hour-height': `${pixelsPerHour}px`,
      }}
    >
      <div className="week-header glass-card">
        <div className="header-cell gutter"></div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className={cn('header-cell', isToday(day) && 'today')} style={{ textAlign: 'center' }}>
            <div className="header-date-group" style={{ justifyContent: 'center', gap: '6px' }}>
              <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="day-num" style={{ fontWeight: '700' }}>{day.getDate()}</span>
            </div>
          </div>
        ))}
      </div>

      <div
        className="week-grid"
        ref={weekGridRef}
        style={{ '--hour-height': `${pixelsPerHour}px` }}
      >
        <div className="week-time-column">
          {dayHours.map((hour) => (
            <div
              key={`time-${hour.getHours()}`}
              className={cn('week-time-slot')}
              style={{ height: pixelsPerHour }}
            >
              {format(hour, 'h a').toLowerCase().replace(' ', '')}
            </div>
          ))}
        </div>

        <div className="week-days-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {/* Centralized Time Indicator Layer */}
          {(() => {
            const todayIndex = weekDays.findIndex(day => isToday(day));
            if (todayIndex === -1) return null;

            const nowTick = new Date(currentTick);
            const hours = nowTick.getHours();
            const minutes = nowTick.getMinutes();
            const seconds = nowTick.getSeconds();
            const exactTop = (hours * pixelsPerHour) + ((minutes / 60) * pixelsPerHour) + ((seconds / 3600) * pixelsPerHour);

            return (
              <div className="week-time-indicator-layer">
                <div
                  className="week-time-indicator-full-line"
                  style={{ top: `${exactTop}px` }}
                >
                  <div 
                    className="week-time-indicator-dot" 
                    style={{ left: `calc(${(todayIndex / 7) * 100}% - 5px)` }}
                  />
                </div>
              </div>
            );
          })()}
          {weekDays.map((day) => {
            const dayEvents = getEventsForDate(day);
            const { items: dayLayout, maxOverlap } = getEventOverlapLayout(dayEvents);
            return (
              <div key={day.toISOString()} className={cn('week-day-column', isToday(day) && 'today')}>
                {dayHours.map((hour) => (
                  <div
                    key={hour.getHours()}
                    className={cn('week-hour-cell', draggedEvent && 'drop-target')}
                    onClick={() => handleTimeSlotClick(day, hour)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnCell(day, hour, e)}
                  />
                ))}

                <div className="week-events-layer" style={{ '--overlap-count': maxOverlap }}>
                  {dayLayout.map(({ event, column }, index) => {
                    const isPastEvent = new Date(event.end || event.start) < now;
                    const eventStart = new Date(event.start);
                    const minutesFromDayStart = (eventStart.getHours() * 60) + eventStart.getMinutes();
                    const durationMinutes = (new Date(event.end) - eventStart) / (1000 * 60);
                    const rowStart = Math.max(1, (minutesFromDayStart || 0) + 1);
                    const rowSpan = Math.max(15, Math.ceil(durationMinutes || 0));
                    const showLocation = (durationMinutes || 0) >= 45;
                    const isLongEvent = (durationMinutes || 0) > 60;
                    const eventColor = event.color || getEventColor(event.category);

                    return (
                      <MotionDiv
                        key={event.id}
                        className={cn('week-event', isPastEvent && 'past', isLongEvent && 'long-event')}
                        style={{
                          '--event-color': eventColor,
                          borderLeft: event.priority === 'high' ? '4px solid #ef4444' : event.priority === 'medium' ? '4px solid #f97316' : `4px solid ${eventColor}`,
                          gridColumnStart: (column || 0) + 1,
                          gridColumnEnd: (column || 0) + 2,
                          gridRow: `${rowStart} / span ${rowSpan}`,
                          zIndex: 5 + (column || 0),
                          cursor: 'grab'
                        }}
                        onClick={(e) => handleEventClick(event, e)}
                        onContextMenu={(e) => handleContextMenu(e, event)}
                        draggable
                        onDragStart={(e) => handleDragStart(event, e)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="week-event-title" style={{ fontSize: '0.75rem', fontWeight: '600', lineHeight: '1.2', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.title || 'Untitled'}</div>
                        <div className="week-event-time" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px', fontSize: '0.65rem', fontWeight: '500' }}>
                          <Clock size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                          {format(new Date(event.start), 'h:mm a')}
                        </div>
                        {showLocation && event.location && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="week-event-location"
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
                        {event.priority === 'high' && (
                          <div style={{ position: 'absolute', top: 4, right: 4, color: 'white' }}>
                            <AlertCircle size={10} />
                          </div>
                        )}
                      </MotionDiv>
                    );
                  })}
                </div>



                {/* Draft event blinking indicator */}
                {draftEvent && draftEvent.start && (() => {
                  const draftStart = new Date(draftEvent.start);
                  const draftEnd = draftEvent.end ? new Date(draftEvent.end) : new Date(draftStart.getTime() + 60 * 60 * 1000);
                  const isSameDay = draftStart.toDateString() === day.toDateString();
                  if (!isSameDay) return null;

                  const hour = draftStart.getHours();
                  const minutes = draftStart.getMinutes();
                  const durationMinutes = (draftEnd - draftStart) / (1000 * 60);
                  const topPercent = ((hour * 60 + minutes) / 1440) * 100;
                  const heightPercent = (durationMinutes / 1440) * 100;

                  return (
                    <div
                      className="draft-event-indicator"
                      style={{
                        top: `${topPercent}%`,
                        height: `${heightPercent}%`,
                        left: '4px',
                        right: '4px',
                        zIndex: 10
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', padding: '4px' }}>
                        {draftEvent.title || 'New Event'}
                      </span>
                    </div>
                  );
                })()}

                {/* Smart Suggestions Blinking Indicators */}
                {smartSuggestions && smartSuggestions.length > 0 && smartSuggestions.map((slot, idx) => {
                  const sugStart = new Date(slot.start);
                  const sugEnd = new Date(slot.end);
                  const isSameDay = sugStart.toDateString() === day.toDateString();
                  if (!isSameDay) return null;

                  const hour = sugStart.getHours();
                  const minutes = sugStart.getMinutes();
                  const durationMinutes = (sugEnd - sugStart) / (1000 * 60);
                  const topPercent = ((hour * 60 + minutes) / 1440) * 100;
                  const heightPercent = (durationMinutes / 1440) * 100;

                  return (
                    <MotionDiv
                      key={`sug-wv-${idx}`}
                      className="smart-suggestion-indicator"
                      style={{
                        top: `${topPercent}%`,
                        height: `${heightPercent}%`,
                        left: '2px',
                        right: '2px',
                        zIndex: 100
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Close smart suggestions mode
                        setSmartSuggestions(null);
                        // Re-open event modal with the new times + the old draft
                        if (smartScheduleDraft) {
                          openEventModal({
                            ...smartScheduleDraft,
                            start: slot.start,
                            end: slot.end
                          });
                          // clear it out
                          setSmartScheduleDraft(null);
                        } else {
                          openEventModal({ start: slot.start, end: slot.end });
                        }
                      }}
                    >
                      <div className="suggestion-glow-layer"></div>
                      <span className="suggestion-text">Top Pick: {slot.reason || 'AI Optimized'}</span>
                    </MotionDiv>
                  );
                })}
              </div>
            );
          })}
        </div>

        {weekEventsCount === 0 && (
          <div className="week-empty-state">
            <div className="empty-title">No events scheduled</div>
            <div className="empty-subtitle">Tap + to add events</div>
          </div>
        )}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            options={contextMenu.options}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    </div>
  );
};

export default WeekView;
