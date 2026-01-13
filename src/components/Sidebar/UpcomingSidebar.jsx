import { useEvents } from '../../contexts/EventsContext';
import { Calendar, Trash2, Edit2 } from 'lucide-react';
import './UpcomingSidebar.css';

const UpcomingSidebar = () => {
    const { events, deleteEvent, updateEvent } = useEvents();

    // Sort events by start date (ascending) and filter out past events
    const upcomingEvents = events
        .filter(event => new Date(event.start) > new Date())
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            deleteEvent(id);
        }
    };

    // Note: Edit functionality requires opening the modal, which needs state lifting or context update
    // For now, we'll just allow deletion, as editing is typically done by clicking the calendar event

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
                        <div key={event.id} className="upcoming-event-item">
                            <div className="event-date-badge">
                                <span className="month">
                                    {new Date(event.start).toLocaleString('default', { month: 'short' })}
                                </span>
                                <span className="day">
                                    {new Date(event.start).getDate()}
                                </span>
                            </div>

                            <div className="event-info">
                                <h4>{event.title}</h4>
                                <p className="time">
                                    {new Date(event.start).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            <div className="event-actions-hover">
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
