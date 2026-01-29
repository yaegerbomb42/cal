import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, ImagePlus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { endOfDay, getCurrentTimePosition, getDayHours, getEventPosition, getWeekDays, isToday, startOfDay, formatTime24 } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { cn, formatDuration, getEventColor } from '../../utils/helpers';
import { useHourScale } from '../../utils/useHourScale';
import { getEventOverlapLayout } from '../../utils/eventOverlap';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal, navigateDate, goToToday } = useCalendar();
  // I will dispatch the event. The "openAI" panel visibility might need a global context trigger.
  // For now I will use window dispatch and assume strict separation.

  const { events, updateEvent, getEventsForDate } = useEvents();
  const MotionDiv = motion.div;
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
  const [draggedEvent, setDraggedEvent] = useState(null);
  const { pixelsPerHour, magnifyHour } = useHourScale({ containerRef: weekGridRef, offset: 24, fitToViewport: true });

  const [currentTick, setCurrentTick] = useState(Date.now());

  // AI Input State
  const [quickInput, setQuickInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const imageInputRef = useRef(null);
  const quickInputRef = useRef(null);

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
    startTime.setHours(9, 0, 0, 0); // Default to 9 AM
    const endTime = new Date(startTime);
    endTime.setHours(10, 0, 0, 0);
    openEventModal({ start: startTime, end: endTime });
  };

  // Drag-to-reschedule handlers
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

    const originalEvent = draggedEvent;
    const originalStart = new Date(originalEvent.start);
    const originalEnd = new Date(originalEvent.end);
    const duration = originalEnd - originalStart;

    const newStart = new Date(day);
    newStart.setHours(hour.getHours(), originalStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    updateEvent(originalEvent.id, {
      start: newStart.toISOString(),
      end: newEnd.toISOString()
    });

    setDraggedEvent(null);
  };

  // AI Handlers
  const handleAICommand = async (e) => {
    e.preventDefault();
    if (!quickInput.trim() || isProcessing) return;

    setIsProcessing(true);
    const userInput = quickInput.trim();
    setQuickInput('');

    try {
      // Dispatch event for AI handler
      // If we need to open the AI panel, we might need a way to do that.
      // Assuming 'calai-ping' listeners handle the details.
      window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text: userInput } }));
      window.dispatchEvent(new CustomEvent('calai-open')); // Custom event to request open?
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
    window.dispatchEvent(new CustomEvent('calai-open'));
    event.target.value = '';
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
      <div className="week-control-bar glass-card">
        <div className="week-nav-group">
          <button className="nav-icon-btn" onClick={() => navigateDate(-1)} title="Previous week">
            <ChevronLeft size={16} />
          </button>
          <button className="nav-today-btn" onClick={goToToday} title="Jump to today">
            Today
          </button>
          <button className="nav-icon-btn" onClick={() => navigateDate(1)} title="Next week">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="week-title-group">
          <span className="week-label">Week of</span>
          <span className="week-range">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}</span>
        </div>

        <form onSubmit={handleAICommand} className="week-ai-form">
          <Sparkles size={14} className="ai-icon" />
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Ask Cal..."
            className="ai-input"
            disabled={isProcessing}
            ref={quickInputRef}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleQuickImageUpload}
            hidden
          />
          <button
            type="button"
            className="ai-action-btn"
            onClick={() => imageInputRef.current?.click()}
            title="Upload image"
          >
            <ImagePlus size={14} />
          </button>
          <button
            type="submit"
            disabled={!quickInput.trim() || isProcessing}
            className="ai-submit-btn"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

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
                          gridColumnStart: column + 1,
                          gridColumnEnd: column + 2,
                          gridRow: `${rowStart} / span ${rowSpan}`,
                          zIndex: 5 + column,
                          cursor: 'grab'
                        }}
                        onClick={(e) => handleEventClick(event, e)}
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
            <div className="empty-subtitle">Tap + to add events</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeekView;
