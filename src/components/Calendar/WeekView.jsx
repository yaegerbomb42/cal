import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Copy, Trash2 } from 'lucide-react';
import { format, getWeek, setWeek, getYear } from 'date-fns';
import { endOfDay, getCurrentTimePosition, getDayHours, getEventPosition, getWeekDays, isToday, startOfDay, formatTime24 } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { cn, formatDuration, getEventColor } from '../../utils/helpers';
import { useHourScale } from '../../utils/useHourScale';
import { getEventOverlapLayout } from '../../utils/eventOverlap';
import ContextMenu from '../UI/ContextMenu';
import AIChatInput from '../UI/AIChatInput';
import NavigationDropdown from '../UI/NavigationDropdown';
import StandardViewHeader from '../Header/StandardViewHeader';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal, setCurrentDate } = useCalendar();
  const { events, updateEvent, getEventsForDate, deleteEvent } = useEvents();
  const MotionDiv = motion.div;
  const weekDays = getWeekDays(currentDate);
  const dayHours = getDayHours();
  const weekStart = startOfDay(weekDays[0]);
  const weekEnd = endOfDay(weekDays[weekDays.length - 1]);

  // Context Menu State
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
  const { pixelsPerHour, magnifyHour } = useHourScale({ containerRef: weekGridRef, offset: 24, fitToViewport: true });

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

  const handleDayAddEvent = (day) => {
    const startTime = new Date(day);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(10, 0, 0, 0);
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

  const showCurrentTime = weekDays.some(day => isToday(day));
  const currentTimePosition = showCurrentTime ? getCurrentTimePosition(pixelsPerHour) : null;
  const now = new Date();

  return (
    <div
      className="week-view"
      style={{
        '--hour-height': `${pixelsPerHour}px`,
        '--magnify-index': magnifyHour ?? -1
      }}
    >
      <StandardViewHeader
        onAIChatSubmit={({ text, files }) => {
          if (text) window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text } }));
          if (files?.length) window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
          window.dispatchEvent(new CustomEvent('calai-open'));
        }}
        centerContent={
          <div className="week-title-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <NavigationDropdown
              label="Week"
              value={getWeek(currentDate)}
              range={{ start: 1, end: 52 }}
              onChange={(weekNum) => {
                const newDate = setWeek(currentDate, weekNum);
                setCurrentDate(newDate);
              }}
              type="grid"
            />
            <span className="week-range" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
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
          <div key={day.toISOString()} className={cn('header-cell', isToday(day) && 'today')}>
            <div className="header-date-group">
              <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="day-num">{day.getDate()}</span>
            </div>
            <button
              className="quick-add-btn"
              onClick={() => handleDayAddEvent(day)}
              title="Add event"
            >
              <Plus size={14} />
            </button>
          </div>
        ))}
      </div>

      <div
        className="week-grid"
        ref={weekGridRef}
      // Mouse handlers for magnification (removed for cleaner logic if needed, but keeping scaling)
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
                    const { top, height: rawHeight } = getEventPosition(event, day, pixelsPerHour);
                    const height = Math.max(rawHeight * 0.7, 18);
                    const isPastEvent = new Date(event.end || event.start) < now;
                    const rowStart = Math.max(1, Math.floor(top) + 1);
                    const rowSpan = Math.max(18, Math.ceil(height));
                    const showLocation = height > 42;
                    const durationMinutes = (new Date(event.end) - new Date(event.start)) / (1000 * 60);
                    const isLongEvent = durationMinutes > 60;
                    const eventColor = event.color || getEventColor(event.category);

                    return (
                      <MotionDiv
                        key={event.id}
                        className={cn('week-event', isPastEvent && 'past', isLongEvent && 'long-event')}
                        style={{
                          backgroundColor: isLongEvent ? 'transparent' : eventColor,
                          '--event-color': eventColor,
                          borderLeft: event.priority === 'high' ? '3px solid #ef4444' : event.priority === 'medium' ? '3px solid #f97316' : undefined,
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
                          {formatTime24(new Date(event.start))} - {formatTime24(new Date(event.end))}
                          <span className="week-event-duration">· {formatDuration(event.start, event.end)}</span>
                        </div>
                        {showLocation && event.location && (
                          <div className="week-event-location">{event.location}</div>
                        )}
                      </MotionDiv>
                    );
                  })}
                </div>

                {/* Live time indicator for today */}
                {isToday(day) && (
                  <div
                    className="week-time-indicator"
                    style={{ top: `${getCurrentTimePosition(pixelsPerHour)}px` }}
                  >

                    <div className="week-time-indicator-line" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showCurrentTime && currentTimePosition !== null && (
          <div className="week-current-time" style={{ top: `${currentTimePosition}px` }}>
            <div className="current-time-line"></div>

            <div className="current-time-label">{formatTime24(new Date(currentTick))}</div>
          </div>
        )}

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
