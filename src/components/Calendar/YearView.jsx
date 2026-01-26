import { motion } from 'framer-motion';
import { eachDayOfInterval, endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { memo, useMemo, useState } from 'react';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { endOfDay, isSameMonth } from '../../utils/dateUtils';
import { cn } from '../../utils/helpers';
import './YearView.css';

const WEEK_START = 0;

const getMonthGrid = (date) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: WEEK_START });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_START });
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
};

const getIntensity = (count) => {
  if (count >= 5) return 4;
  if (count >= 3) return 3;
  if (count >= 2) return 2;
  if (count >= 1) return 1;
  return 0;
};

const buildSegmentGradient = (colors) => {
  if (colors.length === 0) return undefined;
  const unique = [...new Set(colors)];
  const segments = unique.slice(0, 4);
  const stop = 100 / segments.length;
  return `linear-gradient(90deg, ${segments
    .map((color, index) => `${color} ${index * stop}% ${(index + 1) * stop}%`)
    .join(', ')})`;
};

const YearDayCell = memo(({
  day,
  isCurrentMonth,
  count,
  intensity,
  mode,
  dayStyle,
  isPastDay,
  onSelect
}) => {
  return (
    <motion.button
      type="button"
      className={cn(
        'year-day',
        !isCurrentMonth && 'outside-month',
        count > 0 && 'has-events',
        isPastDay && count > 0 && 'past-event',
        mode === 'frequency' && intensity > 0 && `level-${intensity}`
      )}
      title={`${format(day, 'MMM d')} · ${count} event${count !== 1 ? 's' : ''}`}
      style={dayStyle}
      onClick={() => onSelect(day)}
      whileHover={{ scale: 1.08 }}
    >
      <span className="year-day-number">{day.getDate()}</span>
      {count > 0 && <span className="year-day-count">{count}</span>}
    </motion.button>
  );
});

YearDayCell.displayName = 'YearDayCell';

const YearView = ({ onYearChange }) => {
  const { currentDate, openEventModal, setCurrentDate } = useCalendar();
  const { getEventsForDate } = useEvents();
  const [mode, setMode] = useState('type');
  const selectedYear = currentDate.getFullYear();
  const now = new Date();

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => new Date(selectedYear, index, 1));
  }, [selectedYear]);

  const yearEventsCount = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    return eachDayOfInterval({ start: yearStart, end: yearEnd })
      .reduce((total, day) => total + getEventsForDate(day).length, 0);
  }, [currentDate, getEventsForDate]);

  const yearOptions = useMemo(() => {
    const baseYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, index) => baseYear - 10 + index);
  }, []);

  const handleYearSelect = (event) => {
    const nextYear = Number(event.target.value);
    const nextDate = new Date(currentDate);
    nextDate.setFullYear(nextYear);
    if (onYearChange) {
      onYearChange(nextDate);
    } else {
      setCurrentDate(nextDate);
    }
  };

  const handleDaySelect = (day) => {
    const selectedDay = new Date(day);
    selectedDay.setHours(12, 0, 0, 0);
    openEventModal({ start: selectedDay.toISOString() });
  };

  return (
    <div className="year-view">
      <div className="year-header glass-card">
        <div className="year-title">
          <h3>{format(currentDate, 'yyyy')}</h3>
          <span className="year-subtitle">Year Overview</span>
        </div>
        <div className="year-stats">
          <div className="stat">
            <span className="stat-number">
              {`${yearEventsCount} event${yearEventsCount !== 1 ? 's' : ''}`}
            </span>
            <span className="stat-label">this year</span>
          </div>
          <div className="year-mode-toggle" role="group" aria-label="Year color mode">
            <button
              type="button"
              className={cn('mode-btn', mode === 'type' && 'active')}
              onClick={() => setMode('type')}
            >
              Type
            </button>
            <button
              type="button"
              className={cn('mode-btn', mode === 'frequency' && 'active')}
              onClick={() => setMode('frequency')}
            >
              Frequency
            </button>
          </div>
          <label className="year-select">
            <span className="sr-only">Select year</span>
            <select value={selectedYear} onChange={handleYearSelect} aria-label="Select year">
              {yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="year-grid">
        {months.map((month) => {
          const monthDays = getMonthGrid(month);
          const monthLabel = format(month, 'MMM yyyy');
          return (
            <div key={month.toISOString()} className="year-month glass-card">
              <div className="year-month-title">{monthLabel}</div>
              <div className="year-month-grid">
                {monthDays.map((day) => {
                  const dayEvents = getEventsForDate(day);
                  const count = dayEvents.length;
                  const intensity = getIntensity(count);
                  const typeGradient = buildSegmentGradient(dayEvents.map(event => event.color).filter(Boolean));
                  const dayStyle = mode === 'type' && typeGradient ? { background: typeGradient } : undefined;
                  const isCurrentMonth = isSameMonth(day, month);
                  const isPastDay = endOfDay(day) < now;
                  return (
                    <YearDayCell
                      key={day.toISOString()}
                      day={day}
                      isCurrentMonth={isCurrentMonth}
                      count={count}
                      intensity={intensity}
                      mode={mode}
                      dayStyle={dayStyle}
                      isPastDay={isPastDay}
                      onSelect={handleDaySelect}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearView;
