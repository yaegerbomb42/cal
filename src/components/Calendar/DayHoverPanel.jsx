import { useState, useRef, useEffect } from 'react';
import { formatTime24 } from '../../utils/dateUtils';
import './DayHoverPanel.css';

/**
 * DayHoverPanel - Shows event list when hovering a day cell
 * Position: below the day cell, flips above if near viewport bottom
 */
const DayHoverPanel = ({ events, isVisible, anchorRef }) => {
    const panelRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0, flipAbove: false });

    useEffect(() => {
        if (!isVisible || !anchorRef?.current || !panelRef.current) return;

        const anchorRect = anchorRef.current.getBoundingClientRect();
        const panelHeight = panelRef.current.offsetHeight || 120;
        const viewportHeight = window.innerHeight;

        // Check if panel would go off-screen at bottom
        const spaceBelow = viewportHeight - anchorRect.bottom - 8;
        const flipAbove = spaceBelow < panelHeight && anchorRect.top > panelHeight;

        setPosition({
            top: flipAbove ? -panelHeight - 4 : anchorRect.height + 4,
            left: 0,
            flipAbove
        });
    }, [isVisible, events, anchorRef]);

    if (!isVisible || events.length === 0) return null;

    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return (
        <div
            ref={panelRef}
            className={`day-hover-panel ${position.flipAbove ? 'flip-above' : ''}`}
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`
            }}
        >
            <div className="hover-panel-header">
                {events.length} event{events.length !== 1 ? 's' : ''}
            </div>
            <div className="hover-panel-events">
                {sortedEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="hover-event-item">
                        <span className="hover-event-time">
                            {formatTime24(new Date(event.start))}
                            {event.end && ` – ${formatTime24(new Date(event.end))}`}
                        </span>
                        <span className="hover-event-title">{event.title || 'Untitled'}</span>
                    </div>
                ))}
                {events.length > 5 && (
                    <div className="hover-more">+{events.length - 5} more</div>
                )}
            </div>
        </div>
    );
};

export default DayHoverPanel;
