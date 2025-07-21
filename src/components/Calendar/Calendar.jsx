import { motion, AnimatePresence } from 'framer-motion';
import { useCalendar, CALENDAR_VIEWS } from '../../contexts/CalendarContext';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import './Calendar.css';

const Calendar = () => {
  const { view } = useCalendar();

  const renderView = () => {
    switch (view) {
      case CALENDAR_VIEWS.DAY:
        return <DayView key="day" />;
      case CALENDAR_VIEWS.WEEK:
        return <WeekView key="week" />;
      case CALENDAR_VIEWS.MONTH:
        return <MonthView key="month" />;
      default:
        return <MonthView key="month" />;
    }
  };

  return (
    <div className="calendar-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="calendar-view"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Calendar;