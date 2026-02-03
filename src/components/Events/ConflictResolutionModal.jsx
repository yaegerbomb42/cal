import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, Calendar, AlertTriangle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import SmartSchedulePortal from './SmartSchedulePortal';
import './ConflictResolutionModal.css';

const MotionDiv = motion.div;
const MotionButton = motion.button;

/**
 * ConflictResolutionModal - Handle event scheduling conflicts
 * Shows conflicting events and provides options:
 * 1. Accept AI-suggested alternative slot
 * 2. Manually select a different time via SmartSchedulePortal
 * 3. Force add anyway (override)
 */
const ConflictResolutionModal = ({
    isOpen,
    onClose,
    newEvent,
    conflicts = [],
    aiSuggestions = [],
    onAcceptSuggestion,
    onManualSelect,
    onForceAdd
}) => {
    const [showSmartSchedule, setShowSmartSchedule] = useState(false);
    const bestSuggestion = aiSuggestions.length > 0 ? aiSuggestions[0] : null;

    if (!isOpen) return null;

    const handleAcceptSuggestion = () => {
        if (bestSuggestion) {
            onAcceptSuggestion(bestSuggestion.start, bestSuggestion.end);
            onClose();
        }
    };

    const handleManualSelection = (start, end) => {
        onManualSelect(start, end);
        setShowSmartSchedule(false);
        onClose();
    };

    const handleForceAdd = () => {
        onForceAdd();
        onClose();
    };

    return (
        <AnimatePresence>
            <MotionDiv
                className="conflict-modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <MotionDiv
                    className="conflict-modal"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="conflict-modal-header">
                        <div className="conflict-header-content">
                            <AlertTriangle size={20} className="warning-icon" />
                            <div>
                                <h2>Schedule Conflict Detected</h2>
                                <p>The new event overlaps with existing events</p>
                            </div>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Conflict Comparison */}
                    <div className="conflict-body">
                        <div className="conflict-grid">
                            {/* New Event */}
                            <div className="conflict-card new-event">
                                <div className="card-label">New Event</div>
                                <div className="event-title">{newEvent.title || 'Untitled Event'}</div>
                                <div className="event-time">
                                    <Calendar size={14} />
                                    <span>
                                        {format(new Date(newEvent.start), 'MMM d, yyyy')} at{' '}
                                        {format(new Date(newEvent.start), 'h:mm a')} -{' '}
                                        {format(new Date(newEvent.end), 'h:mm a')}
                                    </span>
                                </div>
                                {newEvent.category && (
                                    <div className="event-category">{newEvent.category}</div>
                                )}
                            </div>

                            {/* Conflicts */}
                            <div className="conflict-card conflicts-list">
                                <div className="card-label">Conflicts With ({conflicts.length})</div>
                                <div className="conflicts-scroll">
                                    {conflicts.map((event, idx) => (
                                        <div key={idx} className="conflict-item">
                                            <div className="conflict-item-title">{event.title}</div>
                                            <div className="conflict-item-time">
                                                {format(new Date(event.start), 'h:mm a')} -{' '}
                                                {format(new Date(event.end), 'h:mm a')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* AI Suggestion */}
                        {bestSuggestion && (
                            <div className="ai-suggestion-box">
                                <div className="suggestion-header">
                                    <Sparkles size={16} />
                                    <span>AI Recommendation</span>
                                    <span className="confidence-badge">
                                        {Math.round(bestSuggestion.confidence * 100)}% confidence
                                    </span>
                                </div>
                                <div className="suggestion-content">
                                    <div className="suggestion-time">
                                        {format(new Date(bestSuggestion.start), 'MMM d')} at{' '}
                                        {format(new Date(bestSuggestion.start), 'h:mm a')} -{' '}
                                        {format(new Date(bestSuggestion.end), 'h:mm a')}
                                    </div>
                                    <div className="suggestion-reason">{bestSuggestion.reason}</div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="conflict-actions">
                            {bestSuggestion && (
                                <MotionButton
                                    className="action-btn primary"
                                    onClick={handleAcceptSuggestion}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Check size={16} />
                                    Accept AI Suggestion
                                </MotionButton>
                            )}
                            <MotionButton
                                className="action-btn secondary"
                                onClick={() => setShowSmartSchedule(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Calendar size={16} />
                                Choose Another Time
                            </MotionButton>
                            <MotionButton
                                className="action-btn danger"
                                onClick={handleForceAdd}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Add Anyway (Override)
                            </MotionButton>
                        </div>
                    </div>
                </MotionDiv>

                {/* Smart Schedule Portal for Manual Selection */}
                {showSmartSchedule && (
                    <SmartSchedulePortal
                        isOpen={showSmartSchedule}
                        onClose={() => setShowSmartSchedule(false)}
                        onSelectSlot={handleManualSelection}
                        eventTitle={newEvent.title}
                        existingEvents={conflicts}
                        preferredDate={new Date(newEvent.start)}
                    />
                )}
            </MotionDiv>
        </AnimatePresence>
    );
};

export default ConflictResolutionModal;
