import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import './SmartDateInput.css';

const SmartDateInput = ({ value, onChange, label, autoFocus }) => {
    const [inputValue, setInputValue] = useState('');
    const [prediction, setPrediction] = useState(null);
    const [isValid, setIsValid] = useState(false);
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef(0);
    const dateStartRef = useRef(null);

    // Initialize input value from prop
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setInputValue(date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
                setIsValid(true);
            }
        }
    }, [value]);

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        dragStartRef.current = e.clientX;
        dateStartRef.current = new Date(value || new Date());
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!dateStartRef.current) return;
        const deltaX = e.clientX - dragStartRef.current;
        
        // Acceleration logic: 
        // Small drags ( < 20px ) = 0 days
        // 20-50px = 1-2 days
        // > 50px = square of distance multiplier
        const absDelta = Math.abs(deltaX);
        let daysToShift = 0;
        
        if (absDelta > 15) {
            const direction = deltaX > 0 ? 1 : -1;
            // Base shift: 1 day per 30px
            // Acceleration: add power of distance
            daysToShift = Math.floor((absDelta / 30) * (1 + (absDelta / 150))) * direction;
        }

        const newDate = new Date(dateStartRef.current);
        newDate.setDate(newDate.getDate() + daysToShift);
        
        // Only update if it's a different day, to avoid excessive re-render
        if (newDate.toDateString() !== new Date(value).toDateString()) {
            onChange(newDate);
            setInputValue(newDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // ... rest of parseDate, handleChange, commitDate, handleKeyDown ...
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
        const dateMatch = lowerText.match(/^([a-z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/i);
        if (dateMatch) {
            const monthStr = dateMatch[1];
            const day = parseInt(dateMatch[2]);
            const year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear;
            const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
            if (!isNaN(monthIndex)) {
                return new Date(year, monthIndex, day);
            }
        }

        const parsed = Date.parse(text);
        if (!isNaN(parsed)) return new Date(parsed);
        return null;
    };

    const handleChange = (e) => {
        const text = e.target.value;
        setInputValue(text);
        const parsed = parseDate(text);
        if (parsed && !isNaN(parsed.getTime())) {
            setPrediction(parsed);
            setIsValid(true);
        } else {
            setPrediction(null);
            setIsValid(false);
        }
    };

    const commitDate = () => {
        if (prediction) {
            onChange(prediction);
            setInputValue(prediction.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
            setPrediction(null);
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
        <div 
            className={`smart-date-input-container ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'ew-resize' }}
        >
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
                    onMouseDown={(e) => e.stopPropagation()} // Allow typing without dragging
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
