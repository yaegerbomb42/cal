import { useEffect, useMemo, useRef, useState } from 'react';
import type { EventFormValues } from '../../utils/formValidators';
import './EventModals.css';

export type EventListItem = EventFormValues & { id?: string };

type EventCollectionsPanelProps = {
  upcomingEvents?: EventListItem[];
  archivedEvents?: EventListItem[];
  onDeleteEvents?: (events: EventListItem[]) => void;
};

const BulkDeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M3.5 6.5h6.2l.8 12.3H4.8L3.5 6.5zm6.7 0h6.2l-.8 12.3h-5.4l.7-12.3zm6.7 0h4.4l-.8 12.3h-3.7l.7-12.3zM9.5 6.5V4.8A1.8 1.8 0 0 1 11.3 3h1.4a1.8 1.8 0 0 1 1.8 1.8v1.7"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

type TypeDropdownProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
};

const TypeDropdown = ({ label, value, options, onChange }: TypeDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current || containerRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="event-type-dropdown" ref={containerRef}>
      <button
        type="button"
        className="event-type-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{value || label}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {isOpen && (
        <div className="event-type-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`event-type-option ${option === value ? 'active' : ''}`}
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const getTypeOptions = (events: EventListItem[]) => {
  const types = new Set<string>();
  events.forEach((event) => types.add(event.type));
  return ['All Types', ...Array.from(types).sort()];
};

const filterByType = (events: EventListItem[], selectedType: string) => {
  if (selectedType === 'All Types') return events;
  return events.filter((event) => event.type === selectedType);
};

const EventCollectionsPanel = ({ upcomingEvents = [], archivedEvents = [], onDeleteEvents }: EventCollectionsPanelProps) => {
  const [upcomingType, setUpcomingType] = useState('All Types');
  const [archivedType, setArchivedType] = useState('All Types');
  const [selectedUpcoming, setSelectedUpcoming] = useState<Set<string>>(new Set());
  const [selectedArchived, setSelectedArchived] = useState<Set<string>>(new Set());

  const upcomingOptions = useMemo(() => getTypeOptions(upcomingEvents), [upcomingEvents]);
  const archivedOptions = useMemo(() => getTypeOptions(archivedEvents), [archivedEvents]);

  const filteredUpcoming = useMemo(
    () => filterByType(upcomingEvents, upcomingType),
    [upcomingEvents, upcomingType],
  );
  const filteredArchived = useMemo(
    () => filterByType(archivedEvents, archivedType),
    [archivedEvents, archivedType],
  );

  const toggleSelection = (set: Set<string>, key: string, update: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    update(next);
  };

  const handleBulkDelete = (events: EventListItem[], selected: Set<string>, reset: () => void) => {
    if (!onDeleteEvents) return;
    const selectedEvents = events.filter((event, index) => selected.has(event.id ?? String(index)));
    if (!selectedEvents.length) return;
    const confirmed = window.confirm('Delete selected events?');
    if (!confirmed) return;
    onDeleteEvents(selectedEvents);
    reset();
  };

  const renderList = (
    title: string,
    events: EventListItem[],
    selected: Set<string>,
    setSelected: (next: Set<string>) => void,
    filterValue: string,
    setFilterValue: (value: string) => void,
    options: string[],
  ) => (
    <section className="event-collection">
      <div className="event-collection-header">
        <strong>{title}</strong>
        <div className="event-collection-actions">
          <TypeDropdown
            label={`${title} filter`}
            value={filterValue}
            options={options}
            onChange={setFilterValue}
          />
          <button
            type="button"
            className="bulk-delete-btn"
            disabled={selected.size === 0}
            onClick={() => handleBulkDelete(events, selected, () => setSelected(new Set()))}
          >
            <BulkDeleteIcon />
            Delete
          </button>
        </div>
      </div>
      <div className="event-collection-list">
        {events.length === 0 && <span>No events yet.</span>}
        {events.map((event, index) => {
          const key = event.id ?? String(index);
          return (
            <label key={key} className="event-collection-item">
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggleSelection(selected, key, setSelected)}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {event.imageUrl && <img src={event.imageUrl} alt={event.imageAlt || event.title} />}
                  <div>
                    <strong>{event.title || 'Untitled event'}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>{event.type}</div>
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {renderList(
        'Upcoming',
        filteredUpcoming,
        selectedUpcoming,
        setSelectedUpcoming,
        upcomingType,
        setUpcomingType,
        upcomingOptions,
      )}
      {renderList(
        'Archived',
        filteredArchived,
        selectedArchived,
        setSelectedArchived,
        archivedType,
        setArchivedType,
        archivedOptions,
      )}
    </div>
  );
};

export default EventCollectionsPanel;
