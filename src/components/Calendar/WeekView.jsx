import { motion } from 'framer-motion';
import { getWeekDays, getDayHours, formatTime, getEventPosition, isToday } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn } from '../../utils/helpers';
import './WeekView.css';

const WeekView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();

  const weekDays = getWeekDays(currentDate);
  const dayHours = getDayHours();

  const handleTimeSlotClick = (day, hour) => {
    const startTime = new Date(day);
    startTime.setHours(hour.getHours(), 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    openEventModal({
      start: startTime,
      end: endTime
    });
  };

  const handleEventClick = (event) => {
    openEventModal(event);
  };

  return (
    <div className="week-view">
      {/* Week Header */}
      <div className="week-header">
        <div className="time-gutter"></div>
        {weekDays.map((day, index) => (
          <motion.div
            key={day.toISOString()}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'week-day-header',
              'glass-card',
              isToday(day) && 'today'
            )}
          >
            <div className="day-name">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="day-date">
              {day.getDate()}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Week Grid */}
      <div className="week-grid">
        {/* Time Column */}
        <div className="time-column">
          {dayHours.map((hour) => (
            <div key={hour.getHours()} className="time-slot">
              <span className="time-label">
                {formatTime(hour)}
              </span>
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {weekDays.map((day, dayIndex) => {
          const dayEvents = getEventsForDate(day);
          
          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: dayIndex * 0.05 }}
              className="day-column"
            >
              {/* Hour Slots */}
              {dayHours.map((hour) => (
                <div
                  key={hour.getHours()}
                  onClick={() => handleTimeSlotClick(day, hour)}
                  className="hour-slot"
                />
              ))}

              {/* Events */}
              <div className="events-layer">
                {dayEvents.map((event) => {
                  const { top, height } = getEventPosition(event, day);
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02, zIndex: 10 }}
                      onClick={() => handleEventClick(event)}
                      className="week-event glass-card"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: event.color || '#6366f1'
                      }}
                    >
                      <div className="event-content">
                        <div className="event-title">{event.title}</div>
                        {event.description && (
                          <div className="event-description">
                            {event.description}
                          </div>
                        )}
                        <div className="event-time">
                          {formatTime(new Date(event.start))} - {formatTime(new Date(event.end))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;