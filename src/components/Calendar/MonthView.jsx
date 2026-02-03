import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { getMonthDays, isSameMonth, isToday, formatTime24 } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import { cn, getEventColor } from '../../utils/helpers';
import AIChatInput from '../UI/AIChatInput';
import './MonthView.css';

const MonthView = () => {
  const { currentDate, openEventModal, setView, setCurrentDate } = useCalendar();
  const { getEventsForDate } = useEvents();
  const MotionDiv = motion.div;
  const now = new Date();

  const monthDays = getMonthDays(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthEventsCount = monthDays.reduce((total, day) => {
    return isSameMonth(day, currentDate) ? total + getEventsForDate(day).length : total;
  }, 0);

  const handleDayClick = (day) => {
    setCurrentDate(day);
    setView(CALENDAR_VIEWS.DAY);
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    openEventModal(event);
  };

  const handleDayDoubleClick = (day) => {
    openEventModal({
      start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0),
      end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0)
    });
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
      <div className="month-summary glass-card">
        <div className="month-info">
          <div className="month-label">Month</div>
          <div className="month-summary-title">{format(currentDate, 'MMMM yyyy')}</div>
        </div>

        <div className="month-ai-wrapper" style={{ flex: 1, padding: '0 20px' }}>
          <AIChatInput
            onSubmit={({ text, files }) => {
              if (text) {
                window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text } }));
                window.dispatchEvent(new CustomEvent('calai-open'));
              }
              if (files && files.length > 0) {
                window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
                window.dispatchEvent(new CustomEvent('calai-open'));
              }
            }}
            compact
          />
        </div>

        <div className="month-actions">
          <button className="btn btn-primary month-add-btn" onClick={() => openEventModal({ start: new Date() })}>
            <Plus size={16} /> Add Event
          </button>
          <div className="month-summary-stat">
            {`${monthEventsCount} event${monthEventsCount !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="month-grid">
        {monthDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <MotionDiv
              key={day.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              onClick={() => handleDayClick(day)}
              onDoubleClick={() => handleDayDoubleClick(day)}
              className={cn(
                'month-day',
                'glass-card',
                !isCurrentMonth && 'other-month',
                isDayToday && 'today',
                dayEvents.length > 0 && 'has-events'
              )}
            >
              <div className="day-heading">
                <div className="day-number">
                  {day.getDate()}
                </div>
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
            </MotionDiv>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
