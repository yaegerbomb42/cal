import { motion } from 'framer-motion';
import { getDayHours, formatTime, getEventPosition, isToday } from '../../utils/dateUtils';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { cn } from '../../utils/helpers';
import './DayView.css';

const DayView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();

  const dayHours = getDayHours();
  const dayEvents = getEventsForDate(currentDate);

  const handleTimeSlotClick = (hour) => {
    const startTime = new Date(currentDate);
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
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="day-view"
    >
      {/* Day Header */}
      <div className={cn(
        'day-header',
        'glass-card',
        isToday(currentDate) && 'today'
      )}>
        <div className="day-info">
          <div className="day-name">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className="day-date">
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
        <div className="day-stats">
          <div className="stat">
            <span className="stat-number">{dayEvents.length}</span>
            <span className="stat-label">Events</span>
          </div>
        </div>
      </div>

      {/* Day Grid */}
      <div className="day-grid">
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

        {/* Events Column */}
        <div className="events-column">
          {/* Hour Slots */}
          {dayHours.map((hour) => (
            <div
              key={hour.getHours()}
              onClick={() => handleTimeSlotClick(hour)}
              className="hour-slot"
            />
          ))}

          {/* Events Layer */}
          <div className="events-layer">
            {dayEvents.map((event, index) => {
              const { top, height } = getEventPosition(event, currentDate);
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.9, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, zIndex: 10 }}
                  onClick={() => handleEventClick(event)}
                  className="day-event glass-card"
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 40)}px`,
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
                    {event.location && (
                      <div className="event-location">
                        📍 {event.location}
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
        </div>
      </div>

      {/* Quick Add Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => openEventModal()}
        className="quick-add-btn btn-primary"
        title="Add Event"
      >
        +
      </motion.button>
    </motion.div>
  );
};

export default DayView;