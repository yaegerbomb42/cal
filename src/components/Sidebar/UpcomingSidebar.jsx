import { useState } from 'react';
import { useEvents } from '../../contexts/EventsContext';
import { useCalendar } from '../../contexts/CalendarContext';
import { Calendar, Trash2, Archive, History, X, Search, Edit2 } from 'lucide-react';
import { getEventColor } from '../../utils/helpers';
import './UpcomingSidebar.css';

const UpcomingSidebar = () => {
    const { events, deleteEvent, deleteEventsByName } = useEvents();
    const { openEventModal } = useCalendar();
    const [viewMode, setViewMode] = useState('upcoming'); // 'upcoming' | 'archive'
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteSearch, setDeleteSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Sort events logic
    const now = new Date();

    const getTimeLabel = (date) => {
        const diff = new Date(date) - now;
        const isPast = diff < 0;
        const absDiff = Math.abs(diff);

        const mins = Math.floor(absDiff / (1000 * 60));
        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const years = Math.floor(days / 365);

        if (isPast) {
            if (years >= 1) return `${years}y ago`;
            if (days >= 1) return `${days}d ago`;
            if (hours >= 1) return `${hours}h ago`;
            return `${mins}m ago`;
        } else {
            if (years >= 1) return `${years}y+`;
            if (days >= 1) return `${days}d til`;
            if (hours >= 1) return `${hours}h til`;
            return `${mins}m til`;
        }
    };

    const displayEvents = events
        .filter(event => {
            const eventStart = new Date(event.start);
            const inRange = viewMode === 'upcoming'
                ? eventStart >= now
                : eventStart < now;
            const matchesCategory = categoryFilter === 'all'
                ? true
                : (event.category || 'personal') === categoryFilter;
            return inRange && matchesCategory;
        })
        .sort((a, b) => {
            const dateA = new Date(a.start);
            const dateB = new Date(b.start);
            // Upcoming: Ascending (soonest first)
            // Archive: Descending (most recent first)
            return viewMode === 'upcoming'
                ? dateA - dateB
                : dateB - dateA;
        });

    const handleDeleteClick = (id) => {
        if (window.confirm('Delete this event?')) {
            deleteEvent(id);
        }
    };

    const handleBulkDelete = () => {
        if (!deleteSearch.trim()) return;
        if (window.confirm(`Delete ALL events matching "${deleteSearch}"? This cannot be undone.`)) {
            deleteEventsByName(deleteSearch);
            setDeleteSearch('');
            setShowDeleteModal(false);
        }
    };

    return (
        <div className="upcoming-sidebar glass-card">
            <div className="sidebar-header">
                <div className="header-title-row">
                    <h3>{viewMode === 'upcoming' ? 'Upcoming' : 'Archive'}</h3>
                    <div className="header-actions">
                        <button
                            onClick={() => setViewMode(viewMode === 'upcoming' ? 'archive' : 'upcoming')}
                            className={`icon-btn ${viewMode === 'archive' ? 'active' : ''}`}
                            title={viewMode === 'upcoming' ? "View Past Events" : "View Upcoming"}
                        >
                            {viewMode === 'upcoming' ? <History size={16} /> : <Calendar size={16} />}
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(!showDeleteModal)}
                            className={`icon-btn ${showDeleteModal ? 'active-red' : ''}`}
                            title="Delete by Name"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                {!showDeleteModal && (
                    <span className="event-count">{displayEvents.length} events</span>
                )}
            </div>

            {!showDeleteModal && (
                <div className="category-filters">
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'work', label: 'Work' },
                        { value: 'personal', label: 'Personal' },
                        { value: 'fun', label: 'Fun' },
                        { value: 'hobby', label: 'Hobby' },
                        { value: 'task', label: 'Task' },
                        { value: 'todo', label: 'To-Do' },
                        { value: 'event', label: 'Event' },
                        { value: 'appointment', label: 'Appointment' }
                    ].map(filter => (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() => setCategoryFilter(filter.value)}
                            className={`filter-chip ${categoryFilter === filter.value ? 'active' : ''}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Delete By Name Modal/Area */}
            {showDeleteModal && (
                <div className="delete-modal-area fade-in">
                    <div className="delete-input-wrapper">
                        <Search size={14} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Event name to delete..."
                            value={deleteSearch}
                            onChange={(e) => setDeleteSearch(e.target.value)}
                            className="delete-input"
                        />
                        <button onClick={() => setShowDeleteModal(false)} className="close-btn">
                            <X size={14} />
                        </button>
                    </div>
                    <button
                        disabled={!deleteSearch.trim()}
                        onClick={handleBulkDelete}
                        className="delete-confirm-btn"
                    >
                        Delete All Matches
                    </button>
                    <p className="delete-hint">Deletes ALL events with this title.</p>
                </div>
            )}

            <div className="upcoming-list">
                {displayEvents.length === 0 ? (
                    <div className="no-events">
                        {viewMode === 'upcoming' ? <Calendar size={32} /> : <Archive size={32} />}
                        <p>{viewMode === 'upcoming' ? 'No upcoming events' : 'No past events'}</p>
                    </div>
                ) : (
                    displayEvents.map(event => (
                        <div
                            key={event.id}
                            className="upcoming-event-item"
                            style={{ '--category-color': getEventColor(event.category) }}
                        >
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
                                    <span className="time-til">{getTimeLabel(event.start)}</span>
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

                            <div className="event-actions">
                                <button
                                    onClick={() => openEventModal(event)}
                                    className="action-btn edit"
                                    title="Edit event"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(event.id)}
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
