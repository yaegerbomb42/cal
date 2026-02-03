import { useState, useRef, useEffect, useCallback } from 'react';
import './ClockPicker.css';

/**
 * Dual-hand analog clock picker.
 * Allows dragging hour and minute hands independently.
 * Minutes snap to 5-minute intervals.
 */
const ClockPicker = ({ value, onChange, label = 'Time' }) => {
    // value: "HH:MM" string
    const [hours, setHours] = useState(9);
    const [minutes, setMinutes] = useState(0);
    const [draggingHand, setDraggingHand] = useState(null); // 'hours' | 'minutes' | null
    const clockRef = useRef(null);

    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':').map(Number);
            if (!isNaN(h)) setHours(h);
            if (!isNaN(m)) setMinutes(m);
        }
    }, [value]);

    const formatTime = (h, m) => {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return `${hh}:${mm}`;
    };

    const getAngle = (clientX, clientY) => {
        if (!clockRef.current) return 0;
        const rect = clockRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const x = clientX - centerX;
        const y = clientY - centerY;
        let angle = Math.atan2(x, -y) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        return angle;
    };

    const handleInteraction = useCallback((angle, hand) => {
        if (hand === 'hours') {
            let h = Math.round(angle / 30);
            if (h === 0) h = 12;

            const isPM = hours >= 12;
            let newH = h;

            if (isPM && h !== 12) newH = h + 12;
            else if (!isPM && h === 12) newH = 0;
            else if (isPM && h === 12) newH = 12;

            setHours(newH);
            onChange?.(formatTime(newH, minutes));
        } else if (hand === 'minutes') {
            let rawMin = Math.round(angle / 6);
            let snappedMin = Math.round(rawMin / 5) * 5;
            if (snappedMin === 60) snappedMin = 0;

            setMinutes(snappedMin);
            onChange?.(formatTime(hours, snappedMin));
        }
    }, [hours, minutes, onChange]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        if (!clockRef.current) return;
        const rect = clockRef.current.getBoundingClientRect();
        const dist = Math.sqrt(
            Math.pow(e.clientX - (rect.left + rect.width / 2), 2) +
            Math.pow(e.clientY - (rect.top + rect.height / 2), 2)
        );
        const radiusPercent = (dist / (rect.width / 2)) * 100;

        const hand = radiusPercent < 65 ? 'hours' : 'minutes';
        setDraggingHand(hand);

        const angle = getAngle(e.clientX, e.clientY);
        handleInteraction(angle, hand);
    };

    const handleMouseMove = useCallback((e) => {
        if (!draggingHand) return;
        const angle = getAngle(e.clientX, e.clientY);
        handleInteraction(angle, draggingHand);
    }, [draggingHand, handleInteraction]);

    const handleMouseUp = () => {
        setDraggingHand(null);
    };

    useEffect(() => {
        if (draggingHand) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [draggingHand, handleMouseMove]);

    const togglePeriod = () => {
        let newH = hours;
        if (hours >= 12) newH -= 12;
        else newH += 12;
        setHours(newH);
        onChange?.(formatTime(newH, minutes));
    };

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    const hourAngle = ((hours % 12) / 12) * 360;
    const minuteAngle = (minutes / 60) * 360;

    return (
        <div className="clock-picker">
            <div className="clock-header">
                <span className="clock-label">{label}</span>
                <div className="clock-digital-display">
                    <span>{String(displayHour).padStart(2, '0')}</span>
                    <span className="colon">:</span>
                    <span>{String(minutes).padStart(2, '0')}</span>
                    <button type="button" className="period-btn" onClick={togglePeriod}>
                        {period}
                    </button>
                </div>
            </div>

            <div
                className="clock-face"
                ref={clockRef}
                onMouseDown={handleMouseDown}
            >
                <div className="clock-center" />

                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => {
                    const angle = (m / 60) * 360 - 90;
                    return (
                        <div
                            key={`m-${m}`}
                            className={`clock-tick minute-tick ${minutes === m ? 'active' : ''}`}
                            style={{
                                left: `${50 + 40 * Math.cos(angle * Math.PI / 180)}%`,
                                top: `${50 + 40 * Math.sin(angle * Math.PI / 180)}%`
                            }}
                        >
                            {m % 15 === 0 ? m : '•'}
                        </div>
                    );
                })}

                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => {
                    const angle = (h / 12) * 360 - 90;
                    return (
                        <span
                            key={`h-${h}`}
                            className={`clock-number ${displayHour === h ? 'active' : ''}`}
                            style={{
                                left: `${50 + 26 * Math.cos(angle * Math.PI / 180)}%`,
                                top: `${50 + 26 * Math.sin(angle * Math.PI / 180)}%`
                            }}
                        >
                            {h}
                        </span>
                    );
                })}

                <div
                    className={`clock-hand hour-hand ${draggingHand === 'hours' ? 'dragging' : ''}`}
                    style={{ transform: `rotate(${hourAngle}deg)` }}
                />

                <div
                    className={`clock-hand minute-hand ${draggingHand === 'minutes' ? 'dragging' : ''}`}
                    style={{ transform: `rotate(${minuteAngle}deg)` }}
                />
            </div>
        </div>
    );
};

export default ClockPicker;
