import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Copy, Trash2, Clock, MapPin, AlertCircle } from 'lucide-react';
import { format, getWeek } from 'date-fns';
import { endOfDay, getDayHours, getWeekDays, isToday, startOfDay, formatTime24 } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { cn, getEventColor } from '../../utils/helpers';
import { useHourScale } from '../../utils/useHourScale';
import { getEventOverlapLayout } from '../../utils/eventOverlap';
import ContextMenu from '../UI/ContextMenu';
import StandardViewHeader from '../Header/StandardViewHeader';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal, setCurrentDate, draftEvent } = useCalendar();
  const { events, updateEvent, getEventsForDate, deleteEvent } = useEvents();
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
      <StandardViewHeader
        onAIChatSubmit={({ text, files }) => {
          if (text) window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text } }));
          if (files?.length) window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
          window.dispatchEvent(new CustomEvent('calai-open'));
        }}
        centerContent={
          <div className="week-title-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <select
              value={getWeek(currentDate)}
              onChange={(e) => {
                const newWeekNum = parseInt(e.target.value);
                const currentWeekNum = getWeek(currentDate);
                const diff = newWeekNum - currentWeekNum;
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() + diff * 7);
                setCurrentDate(newDate);
              }}
              className="view-select-dropdown"
              style={{ padding: '2px 24px 2px 8px', fontSize: '0.9rem' }}
            >
              {[...Array(53)].map((_, i) => {
                const weekNum = i + 1;
                return <option key={weekNum} value={weekNum}>Week {weekNum}</option>;
              })}
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </span>
          </div>
        }
        rightContent={
          <span className="week-stat-pill" style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-muted)' }}>
            {weekEventsCount} events
          </span>
        }
        onAddEvent={() => openEventModal({ start: new Date() })}
      />

      <div className="week-header glass-card">
        <div className="header-cell gutter"></div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className={cn('header-cell', isToday(day) && 'today')} style={{ textAlign: 'center' }}>
            <div className="header-date-group" style={{ justifyContent: 'center' }}>
              <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
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
            >
              {format(hour, 'h a').toLowerCase().replace(' ', '')}
            </div>
          ))}
        </div>

        <div className="week-days-grid">
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
                    const rowStart = minutesFromDayStart + 1;
                    const rowSpan = Math.max(15, durationMinutes);
                    const showLocation = durationMinutes >= 45;
                    const isLongEvent = durationMinutes > 60;
                    const eventColor = event.color || getEventColor(event.category);

                    return (
                      <MotionDiv
                        key={event.id}
                        className={cn('week-event', isPastEvent && 'past', isLongEvent && 'long-event')}
                        style={{
                          '--event-color': eventColor,
                          borderLeft: event.priority === 'high' ? '4px solid #ef4444' : event.priority === 'medium' ? '4px solid #f97316' : `4px solid ${eventColor}`,
                          gridColumnStart: column + 1,
                          gridColumnEnd: column + 2,
                          gridRow: `${rowStart} / span ${rowSpan}`,
                          zIndex: 5 + column,
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
                        <div className="week-event-title">{event.title || 'Untitled'}</div>
                        <div className="week-event-time">
                          <Clock size={10} />
                          {format(new Date(event.start), 'h:mm a')}
                        </div>
                        {showLocation && event.location && (
                          <div className="week-event-location">
                            <MapPin size={10} />
                            {event.location}
                          </div>
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

                {/* Live time indicator with absolute accuracy */}
                {isToday(day) && (() => {
                  const nowTick = new Date(currentTick);
                  const minutes = nowTick.getHours() * 60 + nowTick.getMinutes();
                  const percent = (minutes / 1440) * 100;
                  return (
                    <div className="week-time-indicator-grid-container">
                      <div
                        className="week-time-indicator"
                        style={{ top: `${percent}%` }}
                      >
                        <div className="week-time-indicator-line" />
                      </div>
                    </div>
                  );
                })()}

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
                        right: '4px'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', padding: '4px' }}>
                        {draftEvent.title || 'New Event'}
                      </span>
                    </div>
                  );
                })()}
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
