import { useMemo } from 'react';
import { startOfMonth, endOfMonth, getDay, getDaysInMonth, format, isToday } from 'date-fns';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import './YearView.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MiniMonth = ({ year, monthIndex, getEventsForDate, openEventModal }) => {
  const daysInMonth = getDaysInMonth(new Date(year, monthIndex));
  const firstDay = getDay(new Date(year, monthIndex, 1)); // 0=Sun

  const cells = useMemo(() => {
    const result = [];
    // Empty leading cells for alignment
    for (let i = 0; i < firstDay; i++) {
      result.push({ empty: true, key: `pad-${i}` });
    }
    // Actual day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, monthIndex, d);
      const count = getEventsForDate(date).length;
      let level = 0;
      if (count > 0) level = 1;
      if (count > 2) level = 2;
      if (count > 5) level = 3;
      if (count > 8) level = 4;
      result.push({ empty: false, key: d, day: d, date, count, level, today: isToday(date) });
    }
    return result;
  }, [year, monthIndex, daysInMonth, firstDay, getEventsForDate]);

  const handleDayClick = (date) => {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    openEventModal({ start: d.toISOString() });
  };

  return (
    <div className="year-mini-month">
      <div className="year-mini-month-header">{MONTH_NAMES[monthIndex]}</div>
      <div className="year-mini-month-grid">
        {cells.map((cell) =>
          cell.empty ? (
            <div key={cell.key} className="year-day-cell empty" />
          ) : (
            <div
              key={cell.key}
              className={`year-day-cell level-${cell.level}${cell.today ? ' today' : ''}`}
              onClick={() => handleDayClick(cell.date)}
              title={`${cell.count} event${cell.count !== 1 ? 's' : ''} on ${format(cell.date, 'MMM d, yyyy')}`}
            >
              <span className="year-day-num">{cell.day}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
};

const YearView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();
  const selectedYear = currentDate.getFullYear();

  return (
    <div className="year-view">
      <div className="year-content-scroll">
        <div className="year-months-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <MiniMonth
              key={i}
              year={selectedYear}
              monthIndex={i}
              getEventsForDate={getEventsForDate}
              openEventModal={openEventModal}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="year-legend">
          <span>Less</span>
          <div className="year-day-cell level-0 legend" />
          <div className="year-day-cell level-1 legend" />
          <div className="year-day-cell level-2 legend" />
          <div className="year-day-cell level-3 legend" />
          <div className="year-day-cell level-4 legend" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default YearView;
