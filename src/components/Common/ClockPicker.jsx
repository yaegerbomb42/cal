import { useState, useRef, useEffect } from 'react';
import './ClockPicker.css';

/**
 * Minimal analog clock time picker
 * Click/drag on the clock face to select hours, then minutes
 */
const ClockPicker = ({ value, onChange, label = 'Time' }) => {
    // value: "HH:MM" string
    // onChange: (timeString) => void

    const [hours, setHours] = useState(9);
    const [minutes, setMinutes] = useState(0);
    const [mode, setMode] = useState('hours'); // 'hours' | 'minutes'
    const [isDragging, setIsDragging] = useState(false);
    const clockRef = useRef(null);

    // Parse initial value
    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':').map(Number);
            if (!isNaN(h)) setHours(h);
            if (!isNaN(m)) setMinutes(m);
        }
    }, [value]);

    // Emit changes
    useEffect(() => {
        const h = String(hours).padStart(2, '0');
        const m = String(minutes).padStart(2, '0');
        onChange?.(`${h}:${m}`);
    }, [hours, minutes, onChange]);

    const getAngleFromPoint = (clientX, clientY) => {
        if (!clockRef.current) return 0;

        const rect = clockRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const x = clientX - centerX;
        const y = clientY - centerY;

        // Calculate angle in degrees (0 = top, clockwise)
        let angle = Math.atan2(x, -y) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        return angle;
    };

    const handleClockClick = (e) => {
        const angle = getAngleFromPoint(e.clientX, e.clientY);

        if (mode === 'hours') {
            // 12 hours = 360°, each hour = 30°
            let hour = Math.round(angle / 30);
            if (hour === 0) hour = 12;

            // Convert to 24h based on current hours (AM/PM preservation)
            if (hours >= 12 && hour !== 12) {
                hour += 12;
                if (hour === 24) hour = 12;
            } else if (hours < 12 && hour === 12) {
                hour = 0;
            } else if (hours < 12) {
                // Keep AM
            }

            setHours(hour > 23 ? hour - 12 : hour);
            setMode('minutes');
        } else {
            // 60 minutes = 360°, each minute = 6°
            // Snap to 5-minute intervals
            let minute = Math.round(angle / 6);
            if (minute >= 60) minute = 0;
            minute = Math.round(minute / 5) * 5;
            if (minute >= 60) minute = 0;

            setMinutes(minute);
            setMode('hours');
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        handleClockClick(e);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        handleClockClick(e);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging]);

    const togglePeriod = () => {
        if (hours >= 12) {
            setHours(hours - 12);
        } else {
            setHours(hours + 12);
        }
    };

    // Calculate hand position
    const hourAngle = mode === 'hours'
        ? ((hours % 12) / 12) * 360
        : ((hours % 12) / 12) * 360;
    const minuteAngle = (minutes / 60) * 360;

    // Active numbers for the clock face
    const hourNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    const displayHour = hours % 12 || 12;
    const period = hours >= 12 ? 'PM' : 'AM';

    return (
        <div className="clock-picker">
            <label className="clock-label">{label}</label>

            <div className="clock-display">
                <button
                    type="button"
                    className={`time-segment ${mode === 'hours' ? 'active' : ''}`}
                    onClick={() => setMode('hours')}
                >
                    {String(displayHour).padStart(2, '0')}
                </button>
                <span className="time-colon">:</span>
                <button
                    type="button"
                    className={`time-segment ${mode === 'minutes' ? 'active' : ''}`}
                    onClick={() => setMode('minutes')}
                >
                    {String(minutes).padStart(2, '0')}
                </button>
                <button
                    type="button"
                    className="period-toggle"
                    onClick={togglePeriod}
                >
                    {period}
                </button>
            </div>

            <div
                className="clock-face"
                ref={clockRef}
                onMouseDown={handleMouseDown}
            >
                {/* Clock numbers */}
                {mode === 'hours' ? (
                    hourNumbers.map((num) => {
                        const angle = (num / 12) * 360 - 90;
                        const radius = 70;
                        const x = 50 + radius * Math.cos((angle * Math.PI) / 180) / 1.2;
                        const y = 50 + radius * Math.sin((angle * Math.PI) / 180) / 1.2;
                        const isActive = (hours % 12 || 12) === num;

                        return (
                            <span
                                key={num}
                                className={`clock-number ${isActive ? 'active' : ''}`}
                                style={{ left: `${x}%`, top: `${y}%` }}
                            >
                                {num}
                            </span>
                        );
                    })
                ) : (
                    minuteNumbers.map((num) => {
                        const angle = (num / 60) * 360 - 90;
                        const radius = 70;
                        const x = 50 + radius * Math.cos((angle * Math.PI) / 180) / 1.2;
                        const y = 50 + radius * Math.sin((angle * Math.PI) / 180) / 1.2;
                        const isActive = minutes === num;

                        return (
                            <span
                                key={num}
                                className={`clock-number ${isActive ? 'active' : ''}`}
                                style={{ left: `${x}%`, top: `${y}%` }}
                            >
                                {String(num).padStart(2, '0')}
                            </span>
                        );
                    })
                )}

                {/* Clock hand */}
                <div
                    className="clock-hand"
                    style={{
                        transform: `rotate(${mode === 'hours' ? hourAngle : minuteAngle}deg)`,
                        height: mode === 'hours' ? '30%' : '40%'
                    }}
                />
                <div className="clock-center" />
            </div>
        </div>
    );
};

export default ClockPicker;
