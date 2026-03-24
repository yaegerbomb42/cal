import { useMemo, useState } from 'react';
import { startOfYear, endOfYear, eachDayOfInterval, getDay, getDaysInMonth, format, isToday, startOfWeek, getWeek } from 'date-fns';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { LayoutGrid, GitBranch } from 'lucide-react';
import './YearView.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// ─── Classic Monthly Grid ───
const MiniMonth = ({ year, monthIndex, getEventsForDate, openEventModal }) => {
  const daysInMonth = getDaysInMonth(new Date(year, monthIndex));
  const firstDay = getDay(new Date(year, monthIndex, 1));

  const cells = useMemo(() => {
    const result = [];
    for (let i = 0; i < firstDay; i++) {
      result.push({ empty: true, key: `pad-${i}` });
    }
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

// ─── Git-Style Contribution Graph ───
const ContributionGraph = ({ year, getEventsForDate, openEventModal }) => {
  const data = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });

    // Group by week (column) and day-of-week (row)
    const weeks = [];
    let currentWeek = [];

    // Pad the first week
    const firstDayOfWeek = getDay(yearStart); // 0=Sun
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    allDays.forEach((date) => {
      const count = getEventsForDate(date).length;
      let level = 0;
      if (count > 0) level = 1;
      if (count > 2) level = 2;
      if (count > 5) level = 3;
      if (count > 8) level = 4;

      currentWeek.push({ date, count, level, today: isToday(date) });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return weeks;
  }, [year, getEventsForDate]);

  // Determine month label positions
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    data.forEach((week, weekIdx) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const month = firstDay.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTH_NAMES[month], weekIdx });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [data]);

  const handleClick = (day) => {
    if (!day) return;
    const d = new Date(day.date);
    d.setHours(9, 0, 0, 0);
    openEventModal({ start: d.toISOString() });
  };

  return (
    <div className="contribution-graph">
      {/* Month labels */}
      <div className="contrib-month-labels">
        <div className="contrib-day-label-spacer" />
        {monthLabels.map((ml, i) => (
          <span
            key={i}
            className="contrib-month-label"
            style={{ gridColumnStart: ml.weekIdx + 2 }}
          >
            {ml.month}
          </span>
        ))}
      </div>

      <div className="contrib-body">
        {/* Day labels (Mon, Wed, Fri) */}
        <div className="contrib-day-labels">
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="contrib-day-label">{label}</span>
          ))}
        </div>

        {/* The grid */}
        <div className="contrib-grid" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
          {data.map((week, wIdx) =>
            week.map((day, dIdx) => (
              <div
                key={`${wIdx}-${dIdx}`}
                className={`contrib-cell ${day ? `level-${day.level}` : 'empty'} ${day?.today ? 'today' : ''}`}
                style={{ gridColumn: wIdx + 1, gridRow: dIdx + 1 }}
                onClick={() => handleClick(day)}
                title={day ? `${day.count} event${day.count !== 1 ? 's' : ''} on ${format(day.date, 'MMM d, yyyy')}` : ''}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Year View ───
const YearView = () => {
  const { currentDate, openEventModal } = useCalendar();
  const { getEventsForDate } = useEvents();
  const selectedYear = currentDate.getFullYear();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'graph'

  return (
    <div className="year-view">
      {/* Mode Toggle */}
      <div className="year-view-toggle">
        <button
          className={`year-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
          title="Monthly Grid"
        >
          <LayoutGrid size={16} />
          <span>Grid</span>
        </button>
        <button
          className={`year-toggle-btn ${viewMode === 'graph' ? 'active' : ''}`}
          onClick={() => setViewMode('graph')}
          title="Contribution Graph"
        >
          <GitBranch size={16} />
          <span>Graph</span>
        </button>
      </div>

      <div className="year-content-scroll">
        {viewMode === 'grid' ? (
          <>
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
          </>
        ) : (
          <>
            <ContributionGraph
              year={selectedYear}
              getEventsForDate={getEventsForDate}
              openEventModal={openEventModal}
            />

            {/* Legend */}
            <div className="year-legend">
              <span>Less</span>
              <div className="contrib-cell level-0 legend" />
              <div className="contrib-cell level-1 legend" />
              <div className="contrib-cell level-2 legend" />
              <div className="contrib-cell level-3 legend" />
              <div className="contrib-cell level-4 legend" />
              <span>More</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default YearView;
