import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Clock, Check, X, Zap, Calendar } from 'lucide-react';
import { format, startOfDay, setHours } from 'date-fns';
import { geminiService } from '../../services/geminiService';
import './SmartSchedulePortal.css';

const MotionDiv = motion.div;
const MotionButton = motion.button;

/**
 * MiniTimeline - Visual representation of the day's events and suggestions
 */
const MiniTimeline = ({ events, suggestions, preferredDate, onSelectSlot, selectedSuggestionIndex }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayStart = startOfDay(preferredDate);

    // Calculate Y position based on time (0-100%)
    const getY = (date) => {
        const d = new Date(date);
        const mins = d.getHours() * 60 + d.getMinutes();
        return (mins / (24 * 60)) * 100;
    };

    // Calculate Height based on duration
    const getHeight = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        const diff = (e - s) / (1000 * 60); // minutes
        return (diff / (24 * 60)) * 100;
    };

    return (
        <div className="mini-timeline-container">
            <div className="timeline-axis">
                {hours.filter(h => h % 3 === 0).map(h => (
                    <div key={h} className="axis-label" style={{ top: `${(h / 24) * 100}%` }}>
                        {format(setHours(dayStart, h), 'ha')}
                    </div>
                ))}
            </div>
            <div className="timeline-grid">
                {hours.map(h => (
                    <div key={h} className="grid-line" style={{ top: `${(h / 24) * 100}%` }} />
                ))}

                {/* Existing Events */}
                {events.map((event, idx) => {
                    const top = getY(event.start);
                    const height = getHeight(event.start, event.end);
                    return (
                        <div
                            key={`event-${idx}`}
                            className="timeline-event busy"
                            style={{ top: `${top}%`, height: `${height}%` }}
                            title={event.title}
                        >
                            <span className="event-mini-title">{event.title}</span>
                        </div>
                    );
                })}

                {/* Suggestions */}
                {suggestions.map((slot, idx) => {
                    const top = getY(slot.start);
                    const height = getHeight(slot.start, slot.end);
                    const isSelected = selectedSuggestionIndex === idx;

                    // Determine confidence class
                    const confidenceClass = slot.confidence >= 0.8
                        ? 'confidence-high'
                        : slot.confidence >= 0.5
                            ? 'confidence-medium'
                            : 'confidence-low';

                    return (
                        <motion.div
                            key={`suggest-${idx}`}
                            className={`timeline-event suggestion ${confidenceClass} ${isSelected ? 'selected' : ''}`}
                            style={{ top: `${top}%`, height: `${height}%` }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 0.6, scale: 1 }}
                            whileHover={{ opacity: 1, scale: 1.02 }}
                            onClick={() => onSelectSlot(slot, idx)}
                        >
                            <Zap size={10} />
                        </motion.div>
                    );
                })}

                {/* Current Time Indicator if same day */}
                {format(new Date(), 'yyyy-MM-dd') === format(preferredDate, 'yyyy-MM-dd') && (
                    <div className="timeline-now" style={{ top: `${getY(new Date())}%` }} />
                )}
            </div>
        </div>
    );
};

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
    preferredDate = new Date()
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Generate smart time suggestions based on event title and existing events
    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);

        const fetchSuggestions = async () => {
            try {
                const results = await geminiService.suggestOptimalSlot({
                    title: eventTitle,
                    preferredDate: preferredDate,
                    duration: 60 // Default, can be refined
                }, existingEvents);

                // Map results to include confidence if missing (standardize for UI)
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
    }, [isOpen, eventTitle, existingEvents, preferredDate]);

    const handleSelectSlot = (slot, index) => {
        setSelectedIndex(index);
        setTimeout(() => {
            onSelectSlot(slot.start, slot.end);
            onClose();
        }, 200);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <MotionDiv
                className="smart-schedule-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <MotionDiv
                    className="smart-schedule-portal"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="portal-header">
                        <div className="portal-title">
                            <Sparkles size={16} className="sparkle-icon" />
                            <span>Smart Suggestions</span>
                        </div>
                        <button className="portal-close" onClick={onClose}>
                            <X size={14} />
                        </button>
                    </div>

                    <div className="portal-content">
                        {isLoading ? (
                            <div className="portal-loading">
                                <div className="loading-spinner" />
                                <span>Analyzing schedule...</span>
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="portal-empty">
                                <Calendar size={24} />
                                <span>No available slots found</span>
                            </div>
                        ) : (
                            <div className="portal-layout">
                                <div className="suggestions-list">
                                    {suggestions.map((slot, index) => (
                                        <MotionButton
                                            key={index}
                                            className={`suggestion-card ${selectedIndex === index ? 'selected' : ''}`}
                                            onClick={() => handleSelectSlot(slot, index)}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className="suggestion-time">
                                                <Clock size={14} />
                                                <span>{format(slot.start, 'h:mm a')} - {format(slot.end, 'h:mm a')}</span>
                                            </div>
                                            <div className="suggestion-reason">{slot.reason}</div>
                                            <div className="suggestion-confidence">
                                                <div className="confidence-bar" style={{ width: `${slot.confidence * 100}%` }} />
                                                <Zap size={10} />
                                                <span>{Math.round(slot.confidence * 100)}%</span>
                                            </div>
                                            {selectedIndex === index && (
                                                <div className="selected-check">
                                                    <Check size={12} />
                                                </div>
                                            )}
                                        </MotionButton>
                                    ))}
                                </div>

                                <div className="portal-visualizer">
                                    <MiniTimeline
                                        events={existingEvents}
                                        suggestions={suggestions}
                                        preferredDate={preferredDate}
                                        onSelectSlot={handleSelectSlot}
                                        selectedSuggestionIndex={selectedIndex}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </MotionDiv>
            </MotionDiv>
        </AnimatePresence>
    );
};

export default SmartSchedulePortal;
