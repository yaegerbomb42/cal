import { motion } from 'framer-motion';
import { getMonthDays, isSameMonth, isToday, formatTime24 } from '../../utils/dateUtils';
import { useCalendar, CALENDAR_VIEWS } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn, getEventColor } from '../../utils/helpers';
import './MonthView.css';

const MonthView = () => {
  const { currentDate, openEventModal, setView, setCurrentDate } = useCalendar();
  const { getEventsForDate } = useEvents();
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

  return (
    <div className="month-view">
      <div className="month-summary glass-card">
        <div className="month-summary-title">This Month</div>
        <div className="month-summary-stat">
          <span className="stat-number">{monthEventsCount}</span>
          <span className="stat-label">Events</span>
        </div>
      </div>

      {/* Week Day Headers */}
      <div className="month-header">
        {weekDays.map((day) => (
          <div key={day} className="week-day-header">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="month-grid">
        {monthDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <motion.div
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
              <div className="day-number">
                {day.getDate()}
              </div>

              <div className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => handleEventClick(event, e)}
                    className={cn('day-event', new Date(event.end || event.start) < now && 'past-event')}
                    style={{ backgroundColor: event.color || getEventColor(event.category) }}
                  >
                    <span className="event-time">{formatTime24(new Date(event.start))}</span>
                    <span className="event-title">{event.title}</span>
                  </motion.div>
                ))}
                
                {dayEvents.length > 3 && (
                  <div className="more-events">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
