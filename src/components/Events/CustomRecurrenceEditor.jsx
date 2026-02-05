import { useState, useEffect, useCallback } from 'react';
import './CustomRecurrenceEditor.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQUENCIES = [
    { value: 'daily', label: 'Day(s)' },
    { value: 'weekly', label: 'Week(s)' },
    { value: 'monthly', label: 'Month(s)' },
    { value: 'yearly', label: 'Year(s)' }
];

const CustomRecurrenceEditor = ({ value, onChange }) => {
    const [frequency, setFrequency] = useState(value?.frequency || 'weekly');
    const [interval, setInterval] = useState(value?.interval || 1);
    const [daysOfWeek, setDaysOfWeek] = useState(value?.daysOfWeek || []);
    const [endType, setEndType] = useState(value?.endType || 'never');
    const [endDate, setEndDate] = useState(value?.endDate || '');
    const [endCount, setEndCount] = useState(value?.endCount || 10);

    const updateParent = useCallback(() => {
        const recurrence = {
            type: 'custom',
            interval,
            endType,
            frequency,
            ...(frequency === 'weekly' && daysOfWeek.length > 0 ? { daysOfWeek } : {}),
            ...(endType === 'date' && endDate ? { endDate } : {}),
            ...(endType === 'count' ? { endCount } : {})
        };
        onChange(recurrence);
    }, [frequency, interval, daysOfWeek, endType, endDate, endCount, onChange]);

    useEffect(() => {
        updateParent();
    }, [updateParent]);

    const toggleDay = (dayIndex) => {
        if (daysOfWeek.includes(dayIndex)) {
            setDaysOfWeek(daysOfWeek.filter(d => d !== dayIndex));
        } else {
            setDaysOfWeek([...daysOfWeek, dayIndex].sort());
        }
    };

    return (
        <div className="custom-recurrence-editor">
            <div className="recurrence-row">
                <span className="recurrence-label">Every</span>
                <input
                    type="number"
                    min={1}
                    max={99}
                    value={interval}
                    onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="interval-input"
                />
                <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="frequency-select"
                >
                    {FREQUENCIES.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
            </div>

            {frequency === 'weekly' && (
                <div className="days-row">
                    <span className="recurrence-label">On</span>
                    <div className="day-pills">
                        {DAYS.map((day, idx) => (
                            <button
                                key={day}
                                type="button"
                                className={`day-pill ${daysOfWeek.includes(idx) ? 'active' : ''}`}
                                onClick={() => toggleDay(idx)}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="end-row">
                <span className="recurrence-label">Ends</span>
                <select
                    value={endType}
                    onChange={(e) => setEndType(e.target.value)}
                    className="end-select"
                >
                    <option value="never">Never</option>
                    <option value="date">On date</option>
                    <option value="count">After</option>
                </select>

                {endType === 'date' && (
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="end-date-input"
                    />
                )}

                {endType === 'count' && (
                    <div className="end-count-wrapper">
                        <input
                            type="number"
                            min={1}
                            max={999}
                            value={endCount}
                            onChange={(e) => setEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="end-count-input"
                        />
                        <span className="occurrences-label">times</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomRecurrenceEditor;
