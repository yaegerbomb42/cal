import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Clock, Check, X, Zap, Calendar } from 'lucide-react';
import { format, startOfDay, startOfWeek, addDays } from 'date-fns';
import { geminiService } from '../../services/geminiService';
import './SmartSchedulePortal.css';

const MotionDiv = motion.div;
const MotionButton = motion.button;



/**
 * SmartSchedulePortal - AI-powered time slot suggestions
 * Shows suggested time slots based on event title and existing events
 */
const SmartSchedulePortal = ({
    isOpen,
    onClose,
    onSelectSlot,
    eventTitle = '',
    existingEvents = [],
    preferredDate,
    autoPlanPreview = null, // Array of { todo, slot }
    inline = false
}) => {
    // Ensure we have a valid date object and prevent infinite loops from unstable default props
    const timestamp = (preferredDate instanceof Date && !isNaN(preferredDate)) ? preferredDate.getTime() : 0;
    const safeDate = useMemo(() => {
        return timestamp ? new Date(timestamp) : new Date();
    }, [timestamp]);

    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const isBulkMode = !!autoPlanPreview;

    // Generate smart time suggestions
    useEffect(() => {
        if (!isOpen) return;

        // Debounce the API call to prevent rate limiting (429 errors)
        const timeoutId = setTimeout(() => {
            setIsLoading(true);
            const fetchSuggestions = async () => {
                try {
                    const results = await geminiService.suggestOptimalSlot({
                        title: eventTitle,
                        preferredDate: safeDate,
                        duration: 60
                    }, existingEvents);

                    const mapped = Array.isArray(results) ? results.map((r, i) => ({
                        ...r,
                        start: new Date(r.start),
                        end: new Date(r.end),
                        confidence: r.confidence || (0.95 - (i * 0.1)),
                        reason: r.reason || 'AI optimized slot'
                    })).filter(r => !isNaN(r.start.getTime()) && !isNaN(r.end.getTime())) : [];

                    if (mapped.length > 0) {
                        setSuggestions(mapped);
                    }
                } catch (error) {
                    console.error('Failed to fetch AI suggestions', error);
                    setSuggestions([]);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchSuggestions();
        }, 1000); // Wait 1 second after typing/opening before calling API

        return () => clearTimeout(timeoutId);

    }, [isOpen, eventTitle, existingEvents, safeDate]);



    // Calculate the week days for the mini grid
    const weekStart = startOfWeek(safeDate, { weekStartsOn: 0 }); // Sunday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    if (!isOpen) return null;

    return (
        <MotionDiv
            className={`smart-schedule-panel ${inline ? 'inline-mode' : 'portal-mode'} mini-week-mode`}
            initial={{ opacity: 0, scale: inline ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: inline ? 1 : 0.95 }}
            style={{ width: '100%', height: inline ? '100%' : 'auto' }}
        >
            <div className="panel-header">
                <div className="portal-title">
                    <Sparkles size={16} className="sparkle-icon" />
                    <span>{isBulkMode ? 'Auto-Plan Preview' : 'Smart Schedule'}</span>
                </div>
                {isBulkMode && (
                    <button 
                        className="confirm-all-btn"
                        style={{
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                            marginRight: '12px'
                        }}
                        onClick={() => onSelectSlot(autoPlanPreview.map(p => ({
                            ...p.todo,
                            start: p.slot.start,
                            end: p.slot.end,
                            category: 'task'
                        })))}
                    >
                        <Check size={14} /> Schedule All
                    </button>
                )}
                <button className="portal-close" onClick={onClose}>
                    <X size={16} />
                </button>
            </div>

            <div className="panel-content mini-week-content">
                {isLoading ? (
                    <div className="portal-loading">
                        <div className="loading-spinner" />
                        <span>Analyzing Week...</span>
                    </div>
                ) : (
                    <div className="mini-week-grid">
                        {/* Headers */}
                        <div className="mini-week-headers">
                            <div className="time-spacer"></div>
                            {weekDays.map((date, i) => (
                                <div key={`header-${i}`} className={`mini-day-header ${format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'today' : ''}`}>
                                    <span className="day-name">{format(date, 'EE')}</span>
                                    <span className="day-number">{format(date, 'd')}</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid Body */}
                        <div className="mini-week-body">
                            {/* Y-Axis Time Labels */}
                            <div className="mini-timeline-labels">
                                {Array.from({ length: 12 }, (_, i) => i * 2).map((h) => (
                                    <div key={h} className="mini-time-label" style={{ top: `${(h / 24) * 100}%` }}>
                                        {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                                    </div>
                                ))}
                            </div>

                            {/* 7 Day Columns */}
                            <div className="mini-days-container">
                                {weekDays.map((date, dayIndex) => {
                                    const dayStart = startOfDay(date);

                                    // Filter events for this day
                                    const dayEvents = existingEvents.filter(ev => {
                                        const evStart = new Date(ev.start);
                                        return evStart >= dayStart && evStart < addDays(dayStart, 1);
                                    });

                                    // Filter suggestions for this day
                                    const daySuggestions = suggestions.filter(sug => {
                                        const sugStart = new Date(sug.start);
                                        return sugStart >= dayStart && sugStart < addDays(dayStart, 1);
                                    });

                                    return (
                                        <div 
                                            key={`col-${dayIndex}`} 
                                            className="mini-day-column"
                                            onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const y = e.clientY - rect.top;
                                                const percent = y / rect.height;
                                                const totalMinutes = Math.floor(percent * 24 * 60);
                                                
                                                // Round to nearest 15 mins for better UX
                                                const roundedMinutes = Math.round(totalMinutes / 15) * 15;
                                                const hours = Math.floor(roundedMinutes / 60);
                                                const mins = roundedMinutes % 60;

                                                const start = new Date(dayStart);
                                                start.setHours(hours, mins, 0, 0);
                                                
                                                const end = new Date(start);
                                                end.setHours(start.getHours() + 1); // Default 1hr duration
                                                
                                                onSelectSlot(start, end);
                                                onClose();
                                            }}
                                        >
                                            {/* Hourly Grid Lines */}
                                            {Array.from({ length: 24 }).map((_, h) => (
                                                <div key={`grid-${h}`} className="mini-grid-line" style={{ top: `${(h / 24) * 100}%` }} />
                                            ))}

                                            {/* Render Existing Events */}
                                            {dayEvents.map((event, idx) => {
                                                const start = new Date(event.start);
                                                const startMins = start.getHours() * 60 + start.getMinutes();
                                                const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60);

                                                return (
                                                    <div
                                                        key={`ev-${idx}`}
                                                        className="mini-event"
                                                        style={{
                                                            top: `${(startMins / (24 * 60)) * 100}%`,
                                                            height: `${(duration / (24 * 60)) * 100}%`,
                                                            backgroundColor: event.color || 'var(--accent)'
                                                        }}
                                                    />
                                                );
                                            })}

                                            {/* Render Bulk Previews */}
                                            {isBulkMode && autoPlanPreview.map((item, idx) => {
                                                const start = new Date(item.slot.start);
                                                if (start.toDateString() !== dayStart.toDateString()) return null;
                                                const startMins = start.getHours() * 60 + start.getMinutes();
                                                const duration = (new Date(item.slot.end) - start) / (1000 * 60);

                                                return (
                                                    <motion.div
                                                        key={`bulk-${idx}`}
                                                        className="mini-suggestion bulk-preview"
                                                        style={{
                                                            top: `${(startMins / (1440)) * 100}%`,
                                                            height: `${(duration / (1440)) * 100}%`,
                                                            backgroundColor: 'rgba(99, 102, 241, 0.4)',
                                                            border: '2px dashed var(--accent)',
                                                            zIndex: 15
                                                        }}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                    >
                                                        <div className="mini-suggestion-glow" />
                                                        <span className="mini-suggestion-label">{item.todo.text}</span>
                                                    </motion.div>
                                                );
                                            })}

                                            {daySuggestions.map((slot, idx) => {
                                                const start = new Date(slot.start);
                                                const startMins = start.getHours() * 60 + start.getMinutes();
                                                const duration = (new Date(slot.end) - new Date(slot.start)) / (1000 * 60);

                                                return (
                                                    <motion.div
                                                        key={`sug-${idx}`}
                                                        className="mini-suggestion"
                                                        style={{
                                                            top: `${(startMins / (1440)) * 100}%`,
                                                            height: `${(duration / (1440)) * 100}%`
                                                        }}
                                                        whileHover={{ scale: 1.05, zIndex: 10 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelectSlot(start, new Date(slot.end));
                                                            onClose();
                                                        }}
                                                        title={slot.reason || 'AI suggested slot'}
                                                    >
                                                        <div className="mini-suggestion-glow" />
                                                        <span className="mini-suggestion-label">
                                                            {format(start, 'h:mm a')}
                                                        </span>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MotionDiv>
    );
};

export default SmartSchedulePortal;
