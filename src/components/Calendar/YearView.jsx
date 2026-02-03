import { motion } from 'framer-motion';
import { eachDayOfInterval, format, endOfMonth, startOfMonth, getDay } from 'date-fns';
import { Plus, Sparkles } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { cn, getEventColor } from '../../utils/helpers';
import './YearView.css';

const MotionButton = motion.button;

const getEventColorSplit = (events) => {
  if (!events || events.length === 0) return null;

  const counts = {};
  events.forEach(e => {
    const color = e.color || getEventColor(e.category);
    counts[color] = (counts[color] || 0) + 1;
  });

  const colors = Object.keys(counts);
  if (colors.length === 1) return { backgroundColor: colors[0] };

  const total = events.length;
  let currentPos = 0;
  const stops = colors.map(color => {
    const share = (counts[color] / total) * 100;
    const stop = `${color} ${currentPos}% ${currentPos + share}%`;
    currentPos += share;
    return stop;
  });

  return { background: `linear-gradient(135deg, ${stops.join(', ')})` };
};

const YearDayCell = memo(({ day, count, events, onSelect }) => {
  const style = getEventColorSplit(events);

  return (
    <MotionButton
      type="button"
      className={cn(
        'year-day',
        count > 0 && 'has-events'
      )}
      style={style}
      onClick={() => onSelect(day)}
      whileHover={{ scale: 1.2, zIndex: 10 }}
      title={`${format(day, 'MMM d')}: ${count} events`}
    >
      {count > 0 && (
        <span className="event-count-badge">{count}</span>
      )}
    </MotionButton>
  );
});

YearDayCell.displayName = 'YearDayCell';

const MonthGrid = ({ monthDate, getEventsForDate, onDaySelect }) => {
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate)
    });
  }, [monthDate]);

  const startDay = getDay(startOfMonth(monthDate)); // 0-6
  const spacers = Array.from({ length: startDay });

  return (
    <div className="month-block">
      <h4 className="month-title">{format(monthDate, 'MMMM')}</h4>
      <div className="month-days-grid">
        {/* Day Headers (S M T W T F S) */}
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="day-header">{d}</span>
        ))}

        {spacers.map((_, i) => (
          <div key={`spacer-${i}`} className="year-day spacer" />
        ))}

        {days.map(day => {
          const events = getEventsForDate(day);
          return (
            <YearDayCell
              key={day.toISOString()}
              day={day}
              count={events.length}
              events={events}
              onSelect={onDaySelect}
            />
          );
        })}
      </div>
    </div>
  );
};

const YearView = ({ onYearChange }) => {
  const { currentDate, openEventModal, setCurrentDate } = useCalendar();
  const { getEventsForDate } = useEvents();
  const [quickInput, setQuickInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const selectedYear = currentDate.getFullYear();

  const handleAICommand = async (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    setIsProcessing(true);
    // Placeholder logic utilizing variables to satisfy lint
    setTimeout(() => {
      setIsProcessing(false);
      setQuickInput('');
    }, 500);
  };

  const handleAddEvent = () => {
    const now = new Date();
    const start = new Date(selectedYear, now.getMonth(), now.getDate(), 9, 0);
    openEventModal({ start: start.toISOString() });
  };

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(selectedYear, i, 1));
  }, [selectedYear]);

  const yearEventsCount = useMemo(() => {
    // Rough estimate or exact count
    let total = 0;
    months.forEach(m => {
      const days = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) });
      days.forEach(d => total += getEventsForDate(d).length);
    });
    return total;
  }, [months, getEventsForDate]);

  const yearOptions = useMemo(() => {
    const baseYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => baseYear - 5 + index);
  }, []);

  const handleYearSelect = (event) => {
    const nextYear = Number(event.target.value);
    const nextDate = new Date(currentDate);
    nextDate.setFullYear(nextYear);
    setCurrentDate(nextDate);
    onYearChange?.(nextDate);
  };

  const handleDaySelect = (day) => {
    const selectedDay = new Date(day);
    selectedDay.setHours(9, 0, 0, 0);
    openEventModal({ start: selectedDay.toISOString() });
  };

  return (
    <div className="year-view">
      <div className="year-header glass-card">
        <div className="year-title-group">
          <span className="year-subtitle">{selectedYear} Cal</span>
        </div>

        <form onSubmit={handleAICommand} className="year-ai-form">
          <Sparkles size={14} className="ai-icon" />
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Ask Cal..."
            className="ai-input"
            disabled={isProcessing}
          />
        </form>

        <div className="year-controls">
          <button className="btn btn-primary year-add-btn" onClick={handleAddEvent}>
            <Plus size={16} /> Add Event
          </button>
          <div className="year-stat">
            <span className="count">{yearEventsCount}</span>
            <span className="label">Total Events</span>
          </div>

          <select
            value={selectedYear}
            onChange={handleYearSelect}
            className="year-dropdown"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="year-content-scroll">
        <div className="months-grid-layout">
          {months.map(month => (
            <MonthGrid
              key={month.toISOString()}
              monthDate={month}
              getEventsForDate={getEventsForDate}
              onDaySelect={handleDaySelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default YearView;
