import { useState, useMemo } from 'react';
import { Check, X, Clock, Sparkles } from 'lucide-react';
import './ScheduleSuggestionPanel.css';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ScheduleSuggestionPanel = ({ suggestions = [], onSelect, onDismiss, onManual, weekStart }) => {
    const [selectedIndex, setSelectedIndex] = useState(null);

    const weekDays = useMemo(() => {
        const days = [];
        const start = new Date(weekStart);
        start.setDate(start.getDate() - start.getDay());
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            days.push(day);
        }
        return days;
    }, [weekStart]);

    const suggestionSlots = useMemo(() => {
        return suggestions.map((s, idx) => {
            const startDate = new Date(s.start);
            return {
                ...s,
                idx,
                dayIndex: startDate.getDay(),
                hour: startDate.getHours(),
                top: (startDate.getHours() - 8) * 40
            };
        });
    }, [suggestions]);

    const handleSelect = (slot) => {
        setSelectedIndex(slot.idx);
        onSelect({ start: slot.start, end: slot.end });
    };

    if (!suggestions || suggestions.length === 0) return null;

    return (
        <div className="schedule-suggestion-panel">
            <div className="suggestion-header">
                <div className="suggestion-title">
                    <Sparkles size={14} />
                    <span>Suggested Times</span>
                </div>
                <div className="suggestion-actions">
                    <button className="suggestion-btn manual" onClick={onManual}>
                        <Clock size={12} /> Pick manually
                    </button>
                    <button className="suggestion-btn dismiss" onClick={onDismiss}>
                        <X size={12} />
                    </button>
                </div>
            </div>

            <div className="week-grid-mini">
                <div className="grid-header">
                    <div className="time-gutter" />
                    {weekDays.map((day, i) => (
                        <div key={i} className="day-header">
                            <span className="day-name">{DAYS[i]}</span>
                            <span className="day-num">{day.getDate()}</span>
                        </div>
                    ))}
                </div>

                <div className="grid-body">
                    <div className="time-labels">
                        {HOURS.filter((_, i) => i % 2 === 0).map(h => (
                            <div key={h} className="time-label">
                                {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
                            </div>
                        ))}
                    </div>

                    <div className="slots-container">
                        {HOURS.map(h => (
                            <div key={h} className="hour-line" style={{ top: (h - 8) * 40 }} />
                        ))}

                        {suggestionSlots.map((slot) => (
                            <button
                                key={slot.idx}
                                className={`suggestion-slot ${selectedIndex === slot.idx ? 'selected' : ''}`}
                                style={{
                                    top: slot.top,
                                    left: `calc(${slot.dayIndex} * (100% / 7))`,
                                    width: 'calc(100% / 7 - 4px)'
                                }}
                                onClick={() => handleSelect(slot)}
                            >
                                <span className="slot-time">
                                    {new Date(slot.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </span>
                                {selectedIndex === slot.idx && <Check size={12} className="check-icon" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="suggestion-footer">
                <span className="suggestion-hint">Click a slot to select, or pick your own time</span>
            </div>
        </div>
    );
};

export default ScheduleSuggestionPanel;
