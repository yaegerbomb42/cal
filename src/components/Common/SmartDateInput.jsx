import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import './SmartDateInput.css';

const SmartDateInput = ({ value, onChange, label, autoFocus }) => {
    const [inputValue, setInputValue] = useState('');
    const [prediction, setPrediction] = useState(null);
    const [isValid, setIsValid] = useState(false);
    const inputRef = useRef(null);

    // Initialize input value from prop
    useEffect(() => {
        if (value && !inputValue) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                // Format as "Month DD, YYYY" for display
                setInputValue(date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                setIsValid(true);
            }
        }
    }, [value, inputValue]);

    const parseDate = (text) => {
        if (!text) return null;
        const lowerText = text.toLowerCase().trim();
        const now = new Date();
        const currentYear = now.getFullYear();

        // 1. "Today", "Tomorrow", "Tmrw"
        if (lowerText === 'today') return now;
        if (lowerText === 'tomorrow' || lowerText === 'tmrw') {
            const d = new Date(now);
            d.setDate(d.getDate() + 1);
            return d;
        }

        // 2. Next [Day] (e.g. "next friday")
        const weekDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const nextDayMatch = lowerText.match(/^next\s+(mon|tue|wed|thu|fri|sat|sun)[a-z]*$/i);
        if (nextDayMatch) {
            const dayName = nextDayMatch[1].toLowerCase().slice(0, 3);
            const targetDay = weekDays.indexOf(dayName);
            const currentDay = now.getDay();
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7; // Next week
            const d = new Date(now);
            d.setDate(d.getDate() + daysToAdd);
            return d;
        }

        // 3. Simple Month Date Year (e.g. "march 1", "mar 1 2024")
        // Regex matches: Month (full or 3 chars) + space + Day + optional Year
        const dateMatch = lowerText.match(/^([a-z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/i);
        if (dateMatch) {
            const monthStr = dateMatch[1];
            const day = parseInt(dateMatch[2]);
            const year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear;

            // Check if month is valid
            const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
            if (!isNaN(monthIndex)) {
                const d = new Date(year, monthIndex, day);
                // If no year specified and date is in past, maybe they meant next year? 
                // (Optional logic, for now stick to current year unless specified)
                if (!dateMatch[3] && d < now && (now - d > 86400000 * 30)) {
                    // If it looks like it was months ago, maybe next year?
                    // Skipping this for simplicity as per requirement "default to current views day" roughly
                }
                return d;
            }
        }

        // 4. ISO or Slash dates (MM/DD, YYYY-MM-DD) handled by Date.parse fallback
        const parsed = Date.parse(text);
        if (!isNaN(parsed)) {
            return new Date(parsed);
        }

        return null;
    };

    const handleChange = (e) => {
        const text = e.target.value;
        setInputValue(text);

        const parsed = parseDate(text);
        if (parsed && !isNaN(parsed.getTime())) {
            setPrediction(parsed);
            setIsValid(true);
            // Optional: Auto-emit change? usually better on blur or enter to prevent jumping
        } else {
            setPrediction(null);
            setIsValid(false);
        }
    };

    const commitDate = () => {
        if (prediction) {
            setInputValue(prediction.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
            // Preserve time from original value if it exists, or toggle to start of day
            // But for this modal, let's just pass the date part mostly, parent handles time with separate input
            // Actually parent expects ISO string usually or Date object. 
            // Let's pass the Date object and let parent format.
            onChange(prediction);
            setPrediction(null); // Clear prediction visualization as it's now the value
        } else {
            // If invalid, revert or clear?
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitDate();
            inputRef.current?.blur();
        }
    };

    return (
        <div className="smart-date-input-container">
            {label && <label className="smart-date-label">{label}</label>}
            <div className="input-wrapper">
                <CalendarIcon size={14} className="input-icon" />
                <input
                    ref={inputRef}
                    type="text"
                    className={`smart-input ${isValid ? 'valid' : ''}`}
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={commitDate}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: 'March 1', 'Tomorrow', 'Next Mon'"
                    autoFocus={autoFocus}
                />
                {prediction && inputValue.toLowerCase() !== prediction.toLocaleDateString().toLowerCase() && (
                    <div className="prediction-ghost">
                        {prediction.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                )}
                {isValid && <div className="valid-indicator"><Check size={12} /></div>}
            </div>
        </div>
    );
};

export default SmartDateInput;
