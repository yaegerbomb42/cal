import { useRef, useMemo } from 'react';
import { eachDayOfInterval, format, startOfYear, endOfYear, getDay } from 'date-fns';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import './YearView.css';

const YearView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();
  const selectedYear = currentDate.getFullYear();
  const scrollRef = useRef(null);

  // Generate all days for the year
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfYear(new Date(selectedYear, 0, 1)),
      end: endOfYear(new Date(selectedYear, 0, 1))
    });
  }, [selectedYear]);

  // Calculate event intensity for each day
  const dayData = useMemo(() => {
    return days.map(day => {
      const count = getEventsForDate(day).length;
      let level = 0;
      if (count > 0) level = 1;
      if (count > 2) level = 2;
      if (count > 5) level = 3;
      if (count > 8) level = 4;
      return { day, count, level };
    });
  }, [days, getEventsForDate]);

  // Handlers
  const handleDayClick = (day) => {
    const selectedDate = new Date(day);
    selectedDate.setHours(9, 0, 0, 0);
    openEventModal({ start: selectedDate.toISOString() });
  };

  // Month Labels Positioning
  const monthLabels = useMemo(() => {
    const labels = [];
    let currentMonth = -1;
    days.forEach((day, index) => {
      if (day.getMonth() !== currentMonth) {
        currentMonth = day.getMonth();
        // Approximate column index (index / 7)
        const colIndex = Math.floor(index / 7);
        labels.push({
          label: format(day, 'MMM'),
          left: `${colIndex * 15}px`, // 12px width + 3px gap = 15px
          month: currentMonth
        });
      }
    });
    return labels;
  }, [days]);

  return (
    <div className="year-view">
      <div className="year-content-scroll" ref={scrollRef}>
        <div className="github-year-grid">

          {/* Month Labels */}
          <div className="months-label-row">
            {monthLabels.map((m, i) => (
              <span key={i} className="month-label-item" style={{ left: m.left }}>
                {m.label}
              </span>
            ))}
          </div>

          <div className="grid-body">
            {/* Day of Week Labels */}
            <div className="day-labels-col">
              <span className="weekday-label"></span>
              <span className="weekday-label">Mon</span>
              <span className="weekday-label"></span>
              <span className="weekday-label">Wed</span>
              <span className="weekday-label"></span>
              <span className="weekday-label">Fri</span>
              <span className="weekday-label"></span>
            </div>

            {/* The Grid */}
            <div className="squares-grid">
              {/* Insert padding days for alignment if year doesn't start on Sunday/Monday? 
                  With grid-auto-flow: column, we need strict ordering or empty cells. 
                  Actually, simple map is easiest. We iterate days.
              */}
              {/* Add offset empty squares for start of year */}
              {[...Array(getDay(days[0]))].map((_, i) => (
                <div key={`empty-${i}`} className="year-day-square level-0" style={{ visibility: 'hidden' }} />
              ))}

              {dayData.map(({ day, count, level }) => (
                <div
                  key={day.toISOString()}
                  className={`year-day-square level-${level}`}
                  onClick={() => handleDayClick(day)}
                  data-tooltip={`${count} events on ${format(day, 'MMM d, yyyy')}`}
                  title={`${count} events on ${format(day, 'MMM d, yyyy')}`}
                />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', justifyContent: 'flex-end' }}>
            <span>Less</span>
            <div className="year-day-square level-0" style={{ cursor: 'default' }} />
            <div className="year-day-square level-1" style={{ cursor: 'default' }} />
            <div className="year-day-square level-2" style={{ cursor: 'default' }} />
            <div className="year-day-square level-3" style={{ cursor: 'default' }} />
            <div className="year-day-square level-4" style={{ cursor: 'default' }} />
            <span>More</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default YearView;
