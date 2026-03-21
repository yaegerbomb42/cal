import { useEffect, useState, useRef, useMemo } from 'react';
import { useEvents } from '../../contexts/useEvents';
import { useCalendar } from '../../contexts/useCalendar';
import { Calendar, Trash2, Archive, History, X, Search, Edit2, Zap, CheckCircle, Circle, Plus, AlertCircle, ChevronDown, Check, Sparkles, MapPin, Clock, Layout } from 'lucide-react';
import { getEventColor } from '../../utils/helpers';
import { paginateItems } from '../../utils/pagination';
import { isToday, endOfDay } from 'date-fns';
import './UpcomingSidebar.css';

import { toastService } from '../../utils/toast';
import { firebaseService } from '../../services/firebaseService';
import { useAuth } from '../../contexts/useAuth';

const CustomMultiSelect = ({ options, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        let newValues;
        if (value === 'all') {
            newValues = ['all'];
        } else {
            // If selecting a specific value, remove 'all'
            const withoutAll = selectedValues.filter(v => v !== 'all');
            if (withoutAll.includes(value)) {
                newValues = withoutAll.filter(v => v !== value);
            } else {
                newValues = [...withoutAll, value];
            }
            // If nothing left, default to all
            if (newValues.length === 0) newValues = ['all'];
        }
        onChange(newValues);
    };

    const getDisplayLabel = () => {
        if (selectedValues.includes('all')) return 'All Categories';
        if (selectedValues.length === 1) {
            const opt = options.find(o => o.value === selectedValues[0]);
            return opt ? opt.label : 'Select...';
        }
        return `${selectedValues.length} Selected`;
    };

    return (
        <div className="custom-multiselect" ref={containerRef}>
            <button className="multiselect-trigger" onClick={() => setIsOpen(!isOpen)}>
                <span>{getDisplayLabel()}</span>
                <ChevronDown size={14} className={`arrow ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <div className="multiselect-dropdown">
                    {options.map(option => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                className={`multiselect-option ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleOption(option.value)}
                            >
                                <div className="option-label">
                                    {option.color && <span className="color-dot" style={{ background: option.color }} />}
                                    {option.label}
                                </div>
                                {isSelected && <Check size={14} />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const TASK_SUGGESTIONS = [
    { text: 'Deep Work Session', icon: <Zap size={14} /> },
    { text: 'Review & Respond to Emails', icon: <Archive size={14} /> },
    { text: 'Admin & Operations', icon: <Layout size={14} /> },
    { text: 'Quick Health Break / Walk', icon: <Zap size={14} /> },
    { text: 'Project Deep Dive', icon: <Sparkles size={14} /> },
    { text: 'Daily Standup / Sync', icon: <Clock size={14} /> },
    { text: 'Content Creation / Writing', icon: <Edit2 size={14} /> }
];

const UpcomingSidebar = () => {
    const { events, deleteEvent, deleteEventsByName, updateEvent, unarchiveEvent } = useEvents();
    const { openEventModal, setAutoPlanPreview, isArchiveMode, setIsArchiveMode } = useCalendar();
    const { user } = useAuth(); // Needed for persistence

    // View States
    const [viewMode, setViewMode] = useState('upcoming'); // 'upcoming', 'focus', 'archive', 'bulk-trash'

    // Filter State - Default to 'all' or load from persistence handled in Effect
    const [categoryFilters, setCategoryFilters] = useState(['all']);

    // ... existing list states ...
    const [page, setPage] = useState(1);
    const [deleteSearch, setDeleteSearch] = useState('');
    const pageSize = 5;

    // Quick Add Focus
    const [quickAddText, setQuickAddText] = useState('');
    const [pendingTodos, setPendingTodos] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef(null);

    // Click outside handler for task suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load Filters from Persistence
    useEffect(() => {
        const loadFilters = async () => {
            if (user) {
                const userData = await firebaseService.getUserData();
                if (userData?.categoryFilters && Array.isArray(userData.categoryFilters)) {
                    setCategoryFilters(userData.categoryFilters);
                }
            }
        };
        loadFilters();
    }, [user]);

    const handleFilterChange = async (newFilters) => {
        setCategoryFilters(newFilters);
        if (user) {
            await firebaseService.saveUserData({ categoryFilters: newFilters });
        }
    };

    // ... helper functions ...

    // Removed toggleFocusMode as it is now part of viewMode

    // --- Helpers ---
    const now = useMemo(() => new Date(), []); // Stable reference for memoization

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

    // --- Standard List Logic ---
    const displayEvents = useMemo(() => {
        return events
            .filter(event => {
                // If we are in Archive view, show ONLY archived events
                if (viewMode === 'archive') return event.isArchived;

                // For all other views, EXCLUDE archived events
                if (event.isArchived) return false;

                const eventStart = new Date(event.start);
                const inRange = viewMode === 'upcoming'
                    ? eventStart >= now
                    : true; // focus and bulk trash don't use this list

                const matchesCategory = categoryFilters.includes('all')
                    ? true
                    : categoryFilters.includes(event.category || 'personal');

                return inRange && matchesCategory;
            })
            .sort((a, b) => {
                const dateA = new Date(a.start);
                const dateB = new Date(b.start);
                return viewMode === 'upcoming' ? dateA - dateB : dateB - dateA;
            });
    }, [events, viewMode, categoryFilters, now]); // removed 'now' to prevent re-calc every second if parent rerenders, though 'now' is local constant so it changes every render anyway. Ideally 'now' should be stable or just new Date() inside.
    // Actually, since 'UpcomingSidebar' renders, 'now' is new. If we include 'now' in deps, it breaks memo. 
    // We should capture 'now' effectively or just accept it. 
    // Better: use a reference time that updates less frequently if needed, or just let it slide since events change rarely.
    // I will exclude 'now' and let it use the closure's 'now' which might be stale if strict, but 'events' changing is the main trigger.
    // Wait, if I exclude 'now', and only 'events' change, it uses the 'now' from when memo was created. That's fine.

    const pagination = useMemo(() => paginateItems(displayEvents, page, pageSize), [displayEvents, page, pageSize]);
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;
    const paginatedEvents = pagination.items;

    // --- Focus Mode Logic ---
    // Filter for TODAY only
    const todayEvents = useMemo(() => {
        return events
            .filter(event => isToday(new Date(event.start)))
            .sort((a, b) => new Date(a.start) - new Date(b.start));
    }, [events]);

    const handleToggleComplete = (event) => {
        // Toggle completed status. If it doesn't exist, it starts as true.
        updateEvent(event.id, { completed: !event.completed });
    };

    const handleSmartFocusSubmit = (e) => {
        e.preventDefault();
        if (!quickAddText.trim()) return;

        // Accumulate todos in local state before scheduling
        setPendingTodos(prev => [...prev, { id: Date.now().toString(), text: quickAddText.trim() }]);
        setQuickAddText('');
    };

    const handleAutoPlan = async () => {
        if (pendingTodos.length === 0) return;

        try {
            const { findNextFreeSlot } = await import('../../utils/scheduler');
            const previewSlots = [];
            let workingEvents = [...events];

            for (const todo of pendingTodos) {
                // Try today first
                let slot = findNextFreeSlot(workingEvents, 30, now, endOfDay(now));
                
                // If not found today, search the next 7 days
                if (!slot) {
                    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    slot = findNextFreeSlot(workingEvents, 45, now, weekEnd);
                }

                if (slot) {
                    previewSlots.push({ todo, slot });
                    // Add to working events so next todo doesn't overlap with this suggested slot
                    workingEvents.push({ ...todo, start: slot.start, end: slot.end });
                }
            }

            if (previewSlots.length > 0) {
                setAutoPlanPreview(previewSlots);
                toastService.success(`AI found slots for ${previewSlots.length} tasks`);
            } else {
                toastService.info('No optimal space found for remaining tasks today');
            }
        } catch (error) {
            console.error("Auto Plan Error:", error);
        }
    };

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
    }, [viewMode, categoryFilters]);

    const handleDeleteClick = (id) => {
        if (window.confirm('Delete this event?')) {
            deleteEvent(id);
        }
    };

    const handleBulkDelete = () => {
        if (!deleteSearch.trim()) return;
        if (window.confirm(`Permanently delete all events titled "${deleteSearch}"? This cannot be undone.`)) {
            deleteEventsByName(deleteSearch);
            setDeleteSearch('');
        }
    };

    return (
        <div className={`upcoming-sidebar glass-card ${viewMode === 'focus' ? 'focus-mode-sidebar' : ''}`}>
            {isArchiveMode && (
                <div className="archive-mode-banner" style={{
                    padding: '10px',
                    margin: '0 0 1rem 0',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div className="pulse-red" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444' }}>Eraser Mode Active</span>
                    <button 
                        onClick={() => setIsArchiveMode(false)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="sidebar-header">
                <div className="header-title-row">
                    <h3>
                        {viewMode === 'upcoming' && 'Upcoming'}
                        {viewMode === 'focus' && 'Focus Mode'}
                        {viewMode === 'archive' && 'Archive'}
                        {viewMode === 'bulk-trash' && 'Bulk Delete'}
                    </h3>
                </div>

                {/* Unified Navigation - Centered & Reordered */}
                <div className="sidebar-nav-row">
                    <button
                        className={`nav-btn-item ${viewMode === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setViewMode('upcoming')}
                        title="Upcoming Events"
                    >
                        <Calendar size={18} />
                    </button>
                    <button
                        className={`nav-btn-item ${viewMode === 'focus' ? 'active' : ''}`}
                        onClick={() => setViewMode('focus')}
                        title="Focus Mode"
                    >
                        <Zap size={18} />
                    </button>
                    <button
                        className={`nav-btn-item ${viewMode === 'archive' ? 'active' : ''}`}
                        onClick={() => setViewMode('archive')}
                        title="Archive"
                    >
                        <Archive size={18} />
                    </button>
                    <button
                        className={`nav-btn-item ${isArchiveMode ? 'active archive-active' : ''}`}
                        onClick={() => setIsArchiveMode(!isArchiveMode)}
                        title="Archive Mode (Click events to delete)"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        className={`nav-btn-item ${viewMode === 'bulk-trash' ? 'active' : ''}`}
                        onClick={() => {
                            setViewMode('bulk-trash');
                            setIsArchiveMode(false);
                        }}
                        title="Trash / Bulk Delete"
                    >
                        {/* Soul Fade Trash Icon */}
                        <div className="nav-icon-wrapper">
                            <img
                                src="/bulk-delete-icon.png?v=fixed_v7"
                                alt="Bulk Delete"
                                className="bulk-trash-img"
                            />
                        </div>
                    </button>
                </div>

                {viewMode !== 'bulk-trash' && viewMode !== 'focus' && (
                    <span className="event-count" style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        {displayEvents.length} events
                    </span>
                )}
            </div>

            {/* --- FOCUS MODE VIEW --- */}
            {viewMode === 'focus' && (
                <div className="focus-mode-content fade-in">
                    <div className="focus-header-actions">
                        <button
                            className="pro-btn-secondary small"
                            onClick={handleAutoPlan}
                            disabled={pendingTodos.length === 0}
                            style={{ opacity: pendingTodos.length === 0 ? 0.5 : 1, width: '100%', justifyContent: 'center', marginBottom: '1rem' }}
                        >
                            <Sparkles size={14} className="text-accent" /> Smart Schedule {pendingTodos.length > 0 && `(${pendingTodos.length})`}
                        </button>
                    </div>

                    {/* Quick Add Bar with Suggestions */}
                    <form 
                        onSubmit={handleSmartFocusSubmit} 
                        className="focus-quick-add"
                        ref={suggestionsRef}
                    >
                        <Plus size={16} className="quick-add-icon" />
                        <input
                            type="text"
                            placeholder="Add task to auto-plan..."
                            value={quickAddText}
                            onChange={(e) => {
                                setQuickAddText(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            className="quick-add-input"
                        />
                        
                        {showSuggestions && (
                            <div className="task-suggestions-dropdown">
                                {TASK_SUGGESTIONS
                                    .filter(s => s.text.toLowerCase().includes(quickAddText.toLowerCase()))
                                    .map((suggestion, idx) => (
                                        <div 
                                            key={idx} 
                                            className="suggestion-item"
                                            onClick={() => {
                                                setQuickAddText(suggestion.text);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <span className="suggestion-icon">{suggestion.icon}</span>
                                            <span>{suggestion.text}</span>
                                        </div>
                                    ))}
                                {quickAddText && (
                                    <div 
                                        className="suggestion-item manual-entry"
                                        onClick={() => setShowSuggestions(false)}
                                    >
                                        <Plus size={14} className="suggestion-icon" />
                                        <span>Use "{quickAddText}"</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>

                    {/* Pending Todos to be Scheduled */}
                    {pendingTodos.length > 0 && (
                        <div className="pending-todos" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending To Schedule</div>
                            {pendingTodos.map(todo => (
                                <div key={todo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', marginBottom: '4px', fontSize: '0.85rem' }}>
                                    <span>{todo.text}</span>
                                    <button
                                        onClick={() => setPendingTodos(prev => prev.filter(t => t.id !== todo.id))}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Today's Scheduled Checklist */}
                    <div className="focus-list" style={{ marginTop: pendingTodos.length > 0 ? '1rem' : '0' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Schedule</div>
                        {todayEvents.length === 0 ? (
                            <div className="focus-empty">
                                <CheckCircle size={32} className="text-muted" />
                                <p>No events for today!</p>
                            </div>
                        ) : (
                            todayEvents.map(event => (
                                <div key={event.id} className={`focus-item ${event.completed ? 'completed' : ''}`}>
                                    <button
                                        className="check-btn"
                                        onClick={() => handleToggleComplete(event)}
                                        title={event.completed ? "Mark as pending" : "Mark as done"}
                                    >
                                        {event.completed ?
                                            <CheckCircle size={20} className="checked-icon" /> :
                                            <Circle size={20} className="unchecked-icon" />
                                        }
                                    </button>

                                    <div className="focus-item-content">
                                        <div className="focus-item-top">
                                            <span className={`focus-title ${event.completed ? 'strikethrough' : ''}`}>
                                                {event.title}
                                            </span>
                                            {event.priority && (
                                                <span className={`priority-indicator ${event.priority}`}>
                                                    {event.priority === 'high' ? '!!!' : event.priority === 'medium' ? '!!' : '!'}
                                                </span>
                                            )}
                                        </div>
                                        <span className="focus-time">
                                            {new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <button onClick={() => openEventModal(event)} className="focus-edit-btn">
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* --- STANDARD LIST VIEW --- */}
            {(viewMode === 'upcoming' || viewMode === 'archive') && (
                <>
                    <div className="filter-container" style={{ padding: '0 1rem 0.75rem 1rem' }}>
                        <CustomMultiSelect
                            options={[
                                { value: 'all', label: 'All Categories' },
                                { value: 'work', label: 'Work', color: getEventColor('work') },
                                { value: 'personal', label: 'Personal', color: getEventColor('personal') },
                                { value: 'fun', label: 'Fun', color: getEventColor('fun') },
                                { value: 'task', label: 'Task', color: getEventColor('task') },
                                { value: 'event', label: 'Event', color: getEventColor('event') }
                            ]}
                            selectedValues={categoryFilters}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="upcoming-list">
                        {displayEvents.length === 0 ? (
                            <div className="no-events">
                                {viewMode === 'upcoming' ? <Calendar size={32} /> : <Archive size={32} />}
                                <p>{viewMode === 'upcoming' ? 'No upcoming events' : 'No past events'}</p>
                            </div>
                        ) : (
                            paginatedEvents.map(event => {
                                const isPastEvent = new Date(event.end || event.start) < now;
                                return (
                                    <div
                                        key={event.id}
                                        className={`upcoming-event-item ${isPastEvent ? 'past-event' : ''}`}
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
                                            {/* Single line attempt: Title ... Meta */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', width: '100%' }}>
                                                <span className={`event-title ${event.completed ? 'strikethrough' : ''}`}>
                                                    {event.title}
                                                </span>

                                                <div className="event-meta-inline">
                                                    <span className="time-til">{getTimeLabel(event.start)}</span>
                                                    {event.category && (
                                                        <span className="category-tag">{event.category}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expandable Content on Hover */}
                                            <div className="event-description-collapse">
                                                <div className="event-description-content">
                                                    <div style={{ fontWeight: '500', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                        {new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                    </div>
                                                    {event.location && (
                                                        <a
                                                            href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="event-location"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MapPin size={12} />
                                                            {event.location}
                                                        </a>
                                                    )}
                                                    {event.description && (
                                                        <div style={{ marginTop: '6px' }}>{event.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="event-actions">
                                            {viewMode === 'archive' ? (
                                                <button
                                                    onClick={() => unarchiveEvent(event.id)}
                                                    className="action-btn edit"
                                                    title="Restore event"
                                                    style={{ color: '#22c55e' }}
                                                >
                                                    <History size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openEventModal(event)}
                                                    className="action-btn edit"
                                                    title="Edit event"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                                <button
                                                    onClick={() => {
                                                        if (viewMode === 'archive' ? window.confirm('Permanently delete this archived event?') : true) {
                                                            handleDeleteClick(event.id);
                                                        }
                                                    }}
                                                    className="action-btn delete"
                                                    title="Delete event"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {displayEvents.length > pageSize && (
                        <div className="pagination-controls" role="navigation" aria-label="Upcoming events pagination">
                            <button
                                type="button"
                                className="pagination-btn"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Prev
                            </button>
                            <span className="pagination-status">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                type="button"
                                className="pagination-btn"
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* --- BULK DELETE VIEW --- */}
            {viewMode === 'bulk-trash' && (
                <div className="delete-modal-area fade-in">
                    <div className="delete-header" style={{ marginBottom: '1rem' }}>
                        <span className="delete-title" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Bulk delete by name</span>
                    </div>
                    <div className="delete-input-wrapper">
                        <Search size={14} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Enter exact event title"
                            value={deleteSearch}
                            onChange={(e) => setDeleteSearch(e.target.value)}
                            className="delete-input"
                        />
                    </div>
                    <button
                        disabled={!deleteSearch.trim()}
                        onClick={handleBulkDelete}
                        className="delete-confirm-btn"
                    >
                        Delete matching events
                    </button>
                    {/* Minimalist - No hint text */}
                </div>
            )}
        </div>
    );
};

export default UpcomingSidebar;
