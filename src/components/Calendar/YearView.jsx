import { motion } from 'framer-motion';
import { eachDayOfInterval, format, startOfYear, getDay } from 'date-fns';
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
  const dayNum = day.getDate();

  return (
    <MotionButton
      type="button"
      className={cn(
        'year-day',
        count > 0 && 'has-events'
      )}
      style={style}
      onClick={() => onSelect(day)}
      whileHover={{ scale: 1.3, zIndex: 10 }}
      title={`${format(day, 'MMM d, yyyy')}: ${count} events`}
    >
      <span className="day-num">{dayNum}</span>
    </MotionButton>
  );
});

YearDayCell.displayName = 'YearDayCell';

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
    // Implementation of AI command handling if needed, or just standard integration
    // For now, consistent UI is the priority.
    setQuickInput('');
    setIsProcessing(false);
  };

  const handleAddEvent = () => {
    const now = new Date();
    const start = new Date(selectedYear, now.getMonth(), now.getDate(), 9, 0);
    openEventModal({ start: start.toISOString() });
  };
  // Generate all days for the year
  const yearDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfYear(currentDate),
      end: new Date(currentDate.getFullYear(), 11, 31)
    });
  }, [currentDate]);

  // Calculate stats
  const yearEventsCount = useMemo(() => {
    return yearDays.reduce((total, day) => total + getEventsForDate(day).length, 0);
  }, [yearDays, getEventsForDate]);

  const yearOptions = useMemo(() => {
    const baseYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => baseYear - 5 + index);
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
    selectedDay.setHours(9, 0, 0, 0);
    openEventModal({ start: selectedDay.toISOString() });
  };

  // Grid Construction helpers
  // We need to offset the start based on the day of week of Jan 1st
  const startDayOfWeek = getDay(startOfYear(currentDate)); // 0 (Sun) - 6 (Sat)
  // GitHub usually starts Mon? Or Sun. Let's assume Sun=0 is top row? 
  // GitHub: Mon(1), Wed(3), Fri(5) labels. 
  // Actually GitHub grid is column-flow. 
  // If Jan 1 is Wednesday (3), we need empty cells for Sun, Mon, Tue?
  // CSS Grid auto-flow column fills columns first. 
  // So Row 1 = Sun, Row 2 = Mon ... Row 7 = Sat.
  // If Jan 1 is Wed, it should be in Row 4 (index 3).
  // So we need 3 empty spacers.
  const spacers = Array.from({ length: startDayOfWeek });

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

      <div className="year-content glass-card">
        <div className="github-grid-container">
          {/* Day labels removed as requested */}
          <div className="github-grid">
            {spacers.map((_, i) => (
              <div key={`spacer-${i}`} className="year-day spacer" />
            ))}
            {yearDays.map((day) => {
              const events = getEventsForDate(day);
              return (
                <YearDayCell
                  key={day.toISOString()}
                  day={day}
                  count={events.length}
                  events={events}
                  onSelect={handleDaySelect}
                />
              );
            })}
          </div>
        </div>

        <div className="month-labels">
          {Array.from({ length: 12 }).map((_, i) => {
            const d = new Date(selectedYear, i, 1);
            return <span key={i}>{format(d, 'MMM')}</span>
          })}
        </div>
      </div>
    </div>
  );
};

export default YearView;
