import { useEvents } from '../../contexts/EventsContext';
import { Calendar, Trash2, Edit2 } from 'lucide-react';
import './UpcomingSidebar.css';

const UpcomingSidebar = () => {
    const { events, deleteEvent, deleteEventsByCategory, updateEvent } = useEvents();

    // Sort events by start date (ascending) and filter out past events
    const getTimeTil = (date) => {
        const diff = new Date(date) - new Date();
        const mins = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const years = Math.floor(days / 365);

        if (years >= 1) return `${years}y+`;
        if (days >= 1) return `${days}d til`;
        if (hours >= 1) return `${hours}h til`;
        return `${mins}m til`;
    };

    const upcomingEvents = events
        .filter(event => new Date(event.start) > new Date())
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    const handleDelete = (id) => {
        if (window.confirm('Delete this event?')) {
            deleteEvent(id);
        }
    };

    return (
        <div className="upcoming-sidebar glass-card">
            <div className="sidebar-header">
                <h3>Upcoming</h3>
                <span className="event-count">{upcomingEvents.length}</span>
            </div>

            <div className="upcoming-list">
                {upcomingEvents.length === 0 ? (
                    <div className="no-events">
                        <Calendar size={32} />
                        <p>No upcoming events</p>
                    </div>
                ) : (
                    upcomingEvents.map(event => (
                        <div key={event.id} className="upcoming-event-item" style={{ '--category-color': event.category === 'work' ? '#6366f1' : '#10b981' }}>
                            <div className="event-date-badge">
                                <span className="month">
                                    {new Date(event.start).toLocaleString('default', { month: 'short' })}
                                </span>
                                <span className="day">
                                    {new Date(event.start).getDate()}
                                </span>
                            </div>

                            <div className="event-info">
                                <div className="title-row">
                                    <h4>{event.title}</h4>
                                    <span className="time-til">{getTimeTil(event.start)}</span>
                                </div>
                                <div className="info-meta">
                                    <p className="time">
                                        {new Date(event.start).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {event.category && (
                                        <span className="category-tag">{event.category}</span>
                                    )}
                                </div>
                            </div>

                            <div className="event-actions-hover">
                                {event.category && (
                                    <button
                                        onClick={() => deleteEventsByCategory(event.category)}
                                        className="action-btn bulk"
                                        title={`Delete all ${event.category}`}
                                    >
                                        <Trash2 size={12} />
                                        <span>All</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(event.id)}
                                    className="action-btn delete"
                                    title="Delete event"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default UpcomingSidebar;
