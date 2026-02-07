import { useState, useEffect } from 'react';

const LiveClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div
            className="live-clock"
            style={{
                fontVariantNumeric: 'tabular-nums',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.05)'
            }}
        >
            {time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </div>
    );
};

export default LiveClock;
