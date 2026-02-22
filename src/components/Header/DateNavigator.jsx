import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useCalendar } from '../../contexts/useCalendar';
import { format } from 'date-fns';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';

const DateNavigator = () => {
    const {
        view,
        currentDate,
        navigateDate,
        goToToday
    } = useCalendar();
    const panRef = useRef(0);
    const MotionDiv = motion.div;

    const getLabel = () => {
        if (view === CALENDAR_VIEWS.DAY) return format(currentDate, 'MMMM d, yyyy');
        if (view === CALENDAR_VIEWS.MONTH) return format(currentDate, 'MMMM yyyy');
        if (view === CALENDAR_VIEWS.YEAR) return format(currentDate, 'yyyy');

        // Week view logic (simplified)
        if (view === CALENDAR_VIEWS.WEEK) {
            const start = new Date(currentDate);
            start.setDate(currentDate.getDate() - currentDate.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
        }
        return format(currentDate, 'MMMM yyyy');
    };

    return (
        <div className="date-navigator" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <button
                className="nav-btn today-btn"
                onClick={goToToday}
                style={{
                    padding: '4px 12px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: 'var(--accent)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '6px'
                }}
            >
                Today
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                    className="nav-btn icon-only"
                    onClick={() => navigateDate(-1)}
                    style={{ padding: '6px', borderRadius: '6px' }}
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    className="nav-btn icon-only"
                    onClick={() => navigateDate(1)}
                    style={{ padding: '6px', borderRadius: '6px' }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            <MotionDiv
                className="date-label"
                onPanStart={() => {
                    panRef.current = 0;
                }}
                onPan={(e, info) => {
                    panRef.current += info.delta.x;
                    const absOffset = Math.abs(info.offset.x);

                    let threshold = 40;
                    if (absOffset > 200) threshold = 8;
                    else if (absOffset > 100) threshold = 15;
                    else if (absOffset > 50) threshold = 25;

                    if (panRef.current >= threshold) {
                        navigateDate(1);
                        panRef.current -= threshold;
                    } else if (panRef.current <= -threshold) {
                        navigateDate(-1);
                        panRef.current += threshold;
                    }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                    minWidth: '140px',
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    padding: '0 8px',
                    cursor: 'ew-resize',
                    userSelect: 'none'
                }}
                title="Drag left/right to change date"
            >
                {getLabel()}
            </MotionDiv>
        </div>
    );
};

export default DateNavigator;
