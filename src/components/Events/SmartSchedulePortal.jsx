import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Clock, Check, X, Zap, Calendar } from 'lucide-react';
import { format, startOfDay, setHours } from 'date-fns';
import { geminiService } from '../../services/geminiService';
import './SmartSchedulePortal.css';

const MotionDiv = motion.div;
const MotionButton = motion.button;



/**
 * SmartSchedulePortal - AI-powered time slot suggestions
 * Shows suggested time slots based on event title and existing events
 */
// Embedded Smart Schedule Component
const SmartSchedulePortal = ({
    isOpen,
    onClose,
    onSelectSlot,
    eventTitle = '',
    existingEvents = [],
    preferredDate
}) => {
    // Ensure we have a valid date object and prevent infinite loops from unstable default props
    const timestamp = (preferredDate instanceof Date && !isNaN(preferredDate)) ? preferredDate.getTime() : 0;
    const safeDate = useMemo(() => {
        return timestamp ? new Date(timestamp) : new Date();
    }, [timestamp]);

    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Generate smart time suggestions
    useEffect(() => {
        if (!isOpen) return;
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
                setSuggestions(mapped);
            } catch (error) {
                console.error('Failed to fetch AI suggestions', error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSuggestions();
    }, [isOpen, eventTitle, existingEvents, safeDate]);

    const handleSelectSlot = (slot, index) => {
        setSelectedIndex(index);
        setTimeout(() => {
            onSelectSlot(slot.start, slot.end);
        }, 150);
    };

    // Manual Grid Click
    const handleManualGridClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percent = y / rect.height;
        const totalMinutes = 24 * 60;
        const clickedMinutes = percent * totalMinutes;

        const start = startOfDay(safeDate);
        start.setMinutes(clickedMinutes);
        // Round to nearest 15m
        const remainder = start.getMinutes() % 15;
        start.setMinutes(start.getMinutes() - remainder);

        const end = new Date(start);
        end.setHours(start.getHours() + 1); // Default 1 hour duration

        onSelectSlot(start, end);
    };

    if (!isOpen) return null;

    return (
        <MotionDiv
            className="smart-schedule-panel"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 320 }}
            exit={{ opacity: 0, width: 0 }}
        >
            <div className="panel-header">
                <div className="portal-title">
                    <Sparkles size={16} className="sparkle-icon" />
                    <span>Smart Schedule</span>
                </div>
                <button className="portal-close" onClick={onClose}>
                    <X size={14} />
                </button>
            </div>

            <div className="panel-content">
                {isLoading ? (
                    <div className="portal-loading">
                        <div className="loading-spinner" />
                        <span>Analyzing...</span>
                    </div>
                ) : (
                    <div className="panel-visualizer">
                        {/* Integrated Timeline & Suggestions */}
                        <div className="live-preview-container">
                            <div className="timeline-labels">
                                {Array.from({ length: 24 }).filter((_, i) => i % 2 === 0).map(h => (
                                    <div key={h} className="time-label" style={{ top: `${(h / 24) * 100}%` }}>
                                        {format(setHours(startOfDay(safeDate), h), 'h a')}
                                    </div>
                                ))}
                            </div>

                            <div className="timeline-track" onClick={handleManualGridClick}>
                                {/* Grid Lines */}
                                {Array.from({ length: 24 }).map(h => (
                                    <div key={h} className="track-line" style={{ top: `${(h / 24) * 100}%` }} />
                                ))}

                                {/* Existing Events */}
                                {existingEvents.map((event, idx) => {
                                    const start = new Date(event.start);
                                    const end = new Date(event.end);
                                    const dayStart = startOfDay(safeDate);
                                    const startMins = start.getHours() * 60 + start.getMinutes();
                                    const duration = (end - start) / (1000 * 60);
                                    const top = (startMins / (24 * 60)) * 100;
                                    const height = (duration / (24 * 60)) * 100;

                                    return (
                                        <div
                                            key={`ev-${idx}`}
                                            className="track-event existing"
                                            style={{
                                                top: `${top}%`,
                                                height: `${height}%`,
                                                backgroundColor: event.color
                                            }}
                                            title={event.title}
                                        >
                                            <span className="tiny-title">{event.title}</span>
                                        </div>
                                    );
                                })}

                                {/* Suggestions */}
                                {suggestions.map((slot, idx) => {
                                    const start = new Date(slot.start);
                                    const end = new Date(slot.end);
                                    const startMins = start.getHours() * 60 + start.getMinutes();
                                    const duration = (end - start) / (1000 * 60);
                                    const top = (startMins / (24 * 60)) * 100;
                                    const height = (duration / (24 * 60)) * 100;
                                    const isSelected = selectedIndex === idx;

                                    return (
                                        <motion.div
                                            key={`sug-${idx}`}
                                            className={`track-event suggestion ${isSelected ? 'selected' : ''}`}
                                            style={{ top: `${top}%`, height: `${height}%` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectSlot(slot, idx);
                                            }}
                                            whileHover={{ scale: 1.02, zIndex: 10 }}
                                        >
                                            <div className="suggestion-glow" />
                                            {isSelected && <Check size={12} className="check-icon" />}
                                        </motion.div>
                                    );
                                })}

                                {/* Current Time */}
                                {format(new Date(), 'yyyy-MM-dd') === format(safeDate, 'yyyy-MM-dd') && (
                                    <div className="now-line" style={{ top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / (24 * 60) * 100}%` }} />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MotionDiv>
    );
};

export default SmartSchedulePortal;
