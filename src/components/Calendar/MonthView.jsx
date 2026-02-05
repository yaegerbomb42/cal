import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { getMonthDays, isSameMonth, isToday, formatTime24 } from '../../utils/dateUtils';
import { format } from 'date-fns';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { cn, getEventColor } from '../../utils/helpers';
import AIChatInput from '../UI/AIChatInput';
import NavigationDropdown from '../UI/NavigationDropdown';
import StandardViewHeader from '../Header/StandardViewHeader';
import DayHoverPanel from './DayHoverPanel';
import './MonthView.css';

const MonthView = () => {
  const { currentDate, openEventModal, setCurrentDate } = useCalendar();
  const { getEventsForDate } = useEvents();
  const MotionDiv = motion.div;
  const now = new Date();

  // Hover state for day panels
  const [hoveredDay, setHoveredDay] = useState(null);
  const dayRefs = useRef({});

  const monthDays = getMonthDays(currentDate);
  const monthEventsCount = monthDays.reduce((total, day) => {
    return isSameMonth(day, currentDate) ? total + getEventsForDate(day).length : total;
  }, 0);

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    openEventModal(event);
  };

  const handleAddEventClick = (day, e) => {
    e.stopPropagation();
    openEventModal({
      start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0),
      end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0)
    });
  };

  return (
    <div className="month-view">
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                <option key={i} value={i}>{format(new Date(currentDate.getFullYear(), i, 1), 'MMMM')}</option>
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
        }
        rightContent={
          <span className="header-stat-pill" style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-muted)' }}>
            {`${monthEventsCount} event${monthEventsCount !== 1 ? 's' : ''}`}
          </span>
        }
        onAddEvent={() => openEventModal({ start: new Date() })}
      />

      {/* Calendar Grid */}
      <div className="month-grid">
        {monthDays.map((day) => {
          const dayEvents = getEventsForDate(day);

          return (
            <MotionDiv
              key={day.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'month-day',
                !isSameMonth(day, currentDate) && 'other-month',
                isToday(day) && 'today'
              )}
              onClick={() => {
                handleAddEventClick(day, { stopPropagation: () => { } });
              }}
              onMouseEnter={() => setHoveredDay(day.toISOString())}
              onMouseLeave={() => setHoveredDay(null)}
              ref={(el) => { dayRefs.current[day.toISOString()] = el; }}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <div className="day-heading">
                <div className="day-number">{format(day, 'd')}</div>
                <button
                  type="button"
                  className="day-add-btn"
                  onClick={(event) => handleAddEventClick(day, event)}
                  aria-label={`Add event on ${day.toDateString()}`}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <MotionDiv
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => handleEventClick(event, e)}
                    className={cn('day-event', new Date(event.end || event.start) < now && 'past')}
                    style={{ backgroundColor: event.color || getEventColor(event.category) }}
                  >
                    <span className="event-time">{formatTime24(new Date(event.start))}</span>
                    <span className="event-title">{event.title}</span>
                  </MotionDiv>
                ))}

                {dayEvents.length > 3 && (
                  <div className="more-events">
                    {`+${dayEvents.length - 3} more event${dayEvents.length - 3 !== 1 ? 's' : ''}`}
                  </div>
                )}
              </div>

              {/* Hover Panel */}
              <DayHoverPanel
                events={dayEvents}
                isVisible={hoveredDay === day.toISOString()}
                anchorRef={{ current: dayRefs.current[day.toISOString()] }}
                dayDate={day}
              />
            </MotionDiv>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
