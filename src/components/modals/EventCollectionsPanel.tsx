import { useMemo, useState } from 'react';
import type { EventFormValues } from '../../utils/formValidators';
import './EventModals.css';

export type EventListItem = EventFormValues & { id?: string };

type EventCollectionsPanelProps = {
  upcomingEvents?: EventListItem[];
  archivedEvents?: EventListItem[];
  onDeleteEvents?: (events: EventListItem[]) => void;
};

const BulkDeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4 7h6l1 12H5L4 7zm9 0h6l-1 12h-6l1-12zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

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
          <select
            className="event-type-filter"
            aria-label={`${title} filter`}
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="bulk-delete-btn"
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
