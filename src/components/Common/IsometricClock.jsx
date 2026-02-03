import React, { useRef, useEffect, useState } from 'react';
// removed motion import
import './IsometricClock.css';

const IsometricClock = ({ value, onChange, label }) => {
    // Value is date object or string? Usually time string "HH:mm" or Date.
    // Let's assume input is a Date object for ease, or we parse it.
    const [time, setTime] = useState(value instanceof Date ? value : new Date());

    // Update local state when prop changes
    useEffect(() => {
        if (value) setTime(value instanceof Date ? value : new Date(value));
    }, [value]);

    const clockRef = useRef(null);
    const [isDragging, setIsDragging] = useState(null); // 'hour' | 'minute' | null

    // Calculate angles
    const getAngles = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const minuteAngle = minutes * 6; // 360 / 60 = 6
        const hourAngle = (hours % 12) * 30 + minutes * 0.5; // 360 / 12 = 30
        return { hourAngle, minuteAngle };
    };

    const { hourAngle, minuteAngle } = getAngles(time);

    // Mouse/Touch handlers
    const onMouseDown = (hand, e) => {
        e.stopPropagation();
        setIsDragging(hand);
    };

    useEffect(() => {
        const handleInteraction = (e) => {
            if (!clockRef.current) return;

            // Get mouse/touch position
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const rect = clockRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Calculate angle from center
            const dx = clientX - centerX;
            const dy = clientY - centerY;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // Convert to degrees, adjust 0 to top
            if (angle < 0) angle += 360;

            const newDate = new Date(time);

            if (isDragging === 'minute') {
                const minute = Math.round(angle / 6); // 0-60
                newDate.setMinutes(minute);
            } else if (isDragging === 'hour') {
                // Logic for hours is tricky because of AM/PM and 12h wrap.
                // We'll keep the current AM/PM.
                let hour = Math.round(angle / 30); // 0-12
                if (hour === 0) hour = 12; // 12 at top

                // Preserve current AM/PM
                const currentHours = time.getHours();
                const isPM = currentHours >= 12;

                if (isPM && hour !== 12) hour += 12;
                else if (!isPM && hour === 12) hour = 0;

                newDate.setHours(hour);
            }

            setTime(newDate);
            onChange?.(newDate);
        };

        const handleUp = () => setIsDragging(null);
        const handleMove = (e) => {
            if (isDragging) {
                e.preventDefault(); // Prevent scroll on touch
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

    // Generate numbers
    const numbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    return (
        <div className="iso-clock-wrapper">
            <div className="iso-clock-label">{label}</div>
            <div className="iso-clock-container" ref={clockRef}>
                <div className="iso-clock-face">
                    {/* Numbers */}
                    {numbers.map((num, i) => (
                        <div
                            key={num}
                            className="iso-clock-number"
                            style={{
                                transform: `rotate(${i * 30}deg) translate(0, -38px) rotate(-${i * 30}deg)`
                            }}
                        >
                            {num}
                        </div>
                    ))}

                    {/* Center Pin */}
                    <div className="iso-clock-pin" />

                    {/* Hour Hand */}
                    <div
                        className={`iso-clock-hand hour-hand ${isDragging === 'hour' ? 'dragging' : ''}`}
                        style={{ transform: `rotate(${hourAngle}deg)` }}
                        onMouseDown={(e) => onMouseDown('hour', e)}
                        onTouchStart={(e) => onMouseDown('hour', e)}
                    >
                        <div className="hand-visual" />
                    </div>

                    {/* Minute Hand */}
                    <div
                        className={`iso-clock-hand minute-hand ${isDragging === 'minute' ? 'dragging' : ''}`}
                        style={{ transform: `rotate(${minuteAngle}deg)` }}
                        onMouseDown={(e) => onMouseDown('minute', e)}
                        onTouchStart={(e) => onMouseDown('minute', e)}
                    >
                        <div className="hand-visual" />
                    </div>
                </div>

                {/* Helper visual for current time text */}
                <div className="iso-clock-digital">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
};

export default IsometricClock;
