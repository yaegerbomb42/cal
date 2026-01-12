import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useEvents } from '../../contexts/EventsContext';
import { useCalendar } from '../../contexts/CalendarContext';
import './SearchBar.css';

const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const { searchEvents } = useEvents();
  const { openEventModal } = useCalendar();

  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchEvents(query);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query, searchEvents]);

  const handleResultClick = (event) => {
    openEventModal(event);
    setIsOpen(false);
    setQuery('');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="search-trigger"
        title="Search events (Ctrl+K)"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <div className="search-overlay" onClick={() => setIsOpen(false)}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events... (Ctrl+K)"
            className="search-input"
            autoFocus
          />
          <button
            onClick={() => {
              setIsOpen(false);
              setQuery('');
            }}
            className="search-close"
          >
            <X size={18} />
          </button>
        </div>

        {results.length > 0 && (
          <div className="search-results">
            {results.map((event) => (
              <div
                key={event.id}
                onClick={() => handleResultClick(event)}
                className="search-result-item"
              >
                <div className="result-title">{event.title}</div>
                <div className="result-meta">
                  {new Date(event.start).toLocaleString()} • {event.category}
                </div>
                {event.location && (
                  <div className="result-location">{event.location}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div className="search-no-results">No events found</div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
