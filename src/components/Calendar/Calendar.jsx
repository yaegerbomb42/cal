import { motion, AnimatePresence } from 'framer-motion';
import { useCalendar } from '../../contexts/useCalendar';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import YearView from './YearView';
import './Calendar.css';

const Calendar = () => {
  const { view, setCurrentDate } = useCalendar();
  const MotionDiv = motion.div;

  const renderView = () => {
    switch (view) {
      case CALENDAR_VIEWS.DAY:
        return <DayView key="day" />;
      case CALENDAR_VIEWS.WEEK:
        return <WeekView key="week" />;
      case CALENDAR_VIEWS.MONTH:
        return <MonthView key="month" />;
      case CALENDAR_VIEWS.YEAR:
        return <YearView key="year" onYearChange={setCurrentDate} />;
      default:
        return <MonthView key="month" />;
    }
  };

  return (
    <div className="calendar-container">
      <AnimatePresence initial={false}>
        <MotionDiv
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="calendar-view"
        >
          {renderView()}
        </MotionDiv>
      </AnimatePresence>
    </div>
  );
};

export default Calendar;
