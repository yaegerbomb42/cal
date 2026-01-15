import { motion } from 'framer-motion';
import { startOfYear, endOfYear, startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { isSameMonth } from '../../utils/dateUtils';
import { cn } from '../../utils/helpers';
import './YearView.css';

const WEEK_START = 0;

const getCalendarWeeks = (date) => {
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);
  const calendarStart = startOfWeek(yearStart, { weekStartsOn: WEEK_START });
  const calendarEnd = endOfWeek(yearEnd, { weekStartsOn: WEEK_START });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
};

const getIntensity = (count) => {
  if (count >= 5) return 4;
  if (count >= 3) return 3;
  if (count >= 2) return 2;
  if (count >= 1) return 1;
  return 0;
};

const withAlpha = (hex, alpha) => {
  if (!hex) return undefined;
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const YearView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

  const weeks = getCalendarWeeks(currentDate);
  const yearEventsCount = weeks.reduce((total, week) => {
    return total + week.reduce((sum, day) => sum + getEventsForDate(day).length, 0);
  }, 0);

  return (
    <div className="year-view">
      <div className="year-header glass-card">
        <div className="year-title">
          <h3>{format(currentDate, 'yyyy')}</h3>
          <span className="year-subtitle">Year Overview</span>
        </div>
        <div className="year-stats">
          <div className="stat">
            <span className="stat-number">{yearEventsCount}</span>
            <span className="stat-label">Events</span>
          </div>
        </div>
      </div>

      <div className="year-grid glass-card">
        <div className="year-month-labels">
          {weeks.map((week, index) => {
            const month = week[0];
            const label = monthFormatter.format(month);
            const showLabel = index === 0 || !isSameMonth(month, weeks[index - 1][0]);
            return (
              <span key={`${label}-${index}`} className={cn('month-label', showLabel && 'visible')}>
                {showLabel ? label : ''}
              </span>
            );
          })}
        </div>

        <div className="year-weeks">
          {weeks.map((week, index) => (
            <div key={`week-${index}`} className="year-week-column">
              {week.map((day) => {
                const dayEvents = getEventsForDate(day);
                const count = dayEvents.length;
                const intensity = getIntensity(count);
                const primaryColor = dayEvents[0]?.color;
                const dayStyle = primaryColor ? {
                  backgroundColor: withAlpha(primaryColor, 0.22),
                  borderColor: withAlpha(primaryColor, 0.55)
                } : undefined;
                return (
                  <motion.div
                    key={day.toISOString()}
                    className={cn('year-day', count > 0 && 'has-events', intensity > 0 && `level-${intensity}`)}
                    title={`${format(day, 'MMM d')} · ${count} event${count === 1 ? '' : 's'}`}
                    style={dayStyle}
                    onClick={() => {
                      const selectedDay = new Date(day);
                      selectedDay.setHours(12, 0, 0, 0);
                      openEventModal({ start: selectedDay.toISOString() });
                    }}
                    whileHover={{ scale: 1.15 }}
                  >
                    {count > 0 && <span className="year-day-count">{count}</span>}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="year-legend">
          <span>Less</span>
          <div className="legend-scale">
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className={cn('legend-dot', level > 0 && `level-${level}`)} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default YearView;
