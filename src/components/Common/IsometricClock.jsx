import React, { useRef, useEffect, useState } from 'react';
// removed motion import
import './IsometricClock.css';

const IsometricClock = ({ value, onChange, label }) => {
    const [time, setTime] = useState(value instanceof Date ? value : new Date());

    useEffect(() => {
        if (value) setTime(value instanceof Date ? value : new Date(value));
    }, [value]);

    const clockRef = useRef(null);
    const [isDragging, setIsDragging] = useState(null);

    const getAngles = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const minuteAngle = minutes * 6;
        // Hour Hand: Independent logic? No, usually follows minutes, but user requested independent setting?
        // Actually smooth movement is fine, but dragging logic should be separated.
        const hourAngle = (hours % 12) * 30 + (minutes * 0.5);
        return { hourAngle, minuteAngle };
    };

    const { hourAngle, minuteAngle } = getAngles(time);

    const toggleAmPm = (e) => {
        e.stopPropagation();
        const newDate = new Date(time);
        const hours = newDate.getHours();
        newDate.setHours(hours >= 12 ? hours - 12 : hours + 12);
        setTime(newDate);
        onChange?.(newDate);
    };

    useEffect(() => {
        const handleInteraction = (e) => {
            if (!clockRef.current) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const rect = clockRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = clientX - centerX;
            const dy = clientY - centerY;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;

            const newDate = new Date(time);

            if (isDragging === 'minute') {
                let minute = Math.round(angle / 6);
                minute = Math.round(minute / 5) * 5; // 5-min snap
                if (minute === 60) minute = 0;
                newDate.setMinutes(minute);
                // Do NOT change hours automatically when crossing 12 (independent feeling)
            } else if (isDragging === 'hour') {
                let hour = Math.round(angle / 30);
                if (hour === 0) hour = 12;

                // Preserve AM/PM
                const currentHours = time.getHours();
                const isPM = currentHours >= 12;
                if (isPM && hour !== 12) hour += 12;
                else if (!isPM && hour === 12) hour = 0;

                newDate.setHours(hour);
                // Preserve minutes (independent)
                newDate.setMinutes(time.getMinutes());
            }

            setTime(newDate);
            onChange?.(newDate);
        };

        const handleUp = () => setIsDragging(null);
        const handleMove = (e) => {
            if (isDragging) {
                e.preventDefault();
                handleInteraction(e);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, time, onChange]);

    const numbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const isPM = time.getHours() >= 12;
    const formattedTime = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // Helper to check if a number should be highlighted
    const isNumberActive = (num) => {
        // Match Hour
        const currentHour12 = time.getHours() % 12 || 12;
        const hourMatch = Math.abs(currentHour12 - num) < 0.5;

        // Match Minute (approximate to nearest 5-min slot)
        const minuteNum = Math.round(time.getMinutes() / 5);
        const minuteVal = minuteNum === 0 ? 12 : minuteNum;
        const minuteMatch = minuteVal === num;

        return hourMatch || minuteMatch;
    };

    return (
        <div className="iso-clock-wrapper">
            <div className="iso-clock-label">{label}</div>

            {/* Digital Display Above */}
            <div className="iso-clock-digital">
                {formattedTime}
            </div>

            <div className="iso-clock-container" ref={clockRef}>
                <div className="iso-clock-face">
                    {numbers.map((num, i) => (
                        <div
                            key={num}
                            className={`iso-clock-number ${isNumberActive(num) ? 'active-num' : ''}`}
                            style={{
                                transform: `rotate(${i * 30}deg) translate(0, -48px) rotate(-${i * 30}deg)`
                            }}
                        >
                            {num}
                        </div>
                    ))}
                    <div className="iso-clock-pin" />

                    {/* Internal AM/PM Removed */}

                    <div
                        className={`iso-clock-hand hour-hand ${isDragging === 'hour' ? 'dragging' : ''}`}
                        style={{ transform: `rotate(${hourAngle}deg)` }}
                        onMouseDown={(e) => { e.stopPropagation(); setIsDragging('hour'); }}
                        onTouchStart={(e) => { e.stopPropagation(); setIsDragging('hour'); }}
                    >
                        <div className="hand-visual" />
                    </div>

                    <div
                        className={`iso-clock-hand minute-hand ${isDragging === 'minute' ? 'dragging' : ''}`}
                        style={{ transform: `rotate(${minuteAngle}deg)` }}
                        onMouseDown={(e) => { e.stopPropagation(); setIsDragging('minute'); }}
                        onTouchStart={(e) => { e.stopPropagation(); setIsDragging('minute'); }}
                    >
                        <div className="hand-visual" />
                    </div>
                </div>
            </div>

            {/* AM/PM Slider Below */}
            <div
                className="iso-ampm-switch"
                data-ampm={isPM ? "PM" : "AM"}
                onClick={toggleAmPm}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="iso-ampm-slider" />
                <div className={`iso-ampm-option ${!isPM ? 'active' : ''}`}>AM</div>
                <div className={`iso-ampm-option ${isPM ? 'active' : ''}`}>PM</div>
            </div>
        </div>
    );
};

export default IsometricClock;
