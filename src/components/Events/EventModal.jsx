import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, MapPin, Clock, Tag, Palette, Repeat, Bell, Check, ArrowLeft, ExternalLink, ChevronRight, Sparkles, MessageSquare, AlertTriangle, Zap } from 'lucide-react';
import Autocomplete from 'react-google-autocomplete';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { getEventColor } from '../../utils/helpers';
import { validateEvent } from '../../utils/eventValidator';
import { RECURRENCE_TYPES, formatRecurrenceText } from '../../utils/recurringEvents';
import { toastService } from '../../utils/toast';
import { ValidationError } from '../../utils/errors';
import { roundToNearest5Minutes, roundUpTo5Minutes } from '../../utils/timeUtils';
import './EventModal.css';

import SmartDateInput from '../Common/SmartDateInput';
import ClockPicker from '../Common/ClockPicker';
import SmartSchedulePortal from './SmartSchedulePortal';
import ConflictResolutionModal from './ConflictResolutionModal';
import CustomRecurrenceEditor from './CustomRecurrenceEditor';
import { CALENDAR_VIEWS } from '../../contexts/calendarViews';

const padTime = (value) => String(value).padStart(2, '0');

const toLocalInputValue = (date) => {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}T${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
};

// Now using imported roundToNearest5Minutes from timeUtils.js

const ensureValidStartTime = (date) => {
  const normalized = new Date(date);
  if (normalized.getHours() === 0 && normalized.getMinutes() === 0) {
    normalized.setHours(9, 0, 0, 0);
  }
  return normalized;
};

// Custom Dropdown Component
const CustomSelect = ({ options, value, onChange }) => {
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

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="custom-select-container" ref={containerRef}>
      <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="selected-value">
          {selectedOption.color && (
            <span className="color-dot" style={{ backgroundColor: selectedOption.color }}></span>
          )}
          {selectedOption.label}
        </div>
        <ChevronRight size={14} className={`select-arrow ${isOpen ? 'open' : ''}`} />
      </div>
      {isOpen && (
        <div className="custom-select-options">
          {options.map(option => (
            <div
              key={option.value}
              className={`custom-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.color && (
                <span className="color-dot" style={{ backgroundColor: option.color }}></span>
              )}
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



// ... imports remain ...
import IsometricClock from '../Common/IsometricClock'; // NEW IMPORT

// ... helper functions ...

const EventModal = ({ isAIChatOpen }) => {
  // ... hooks and state ...
  const { selectedEvent, isEventModalOpen, closeEventModal, setDraftEvent } = useCalendar();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const MotionDiv = motion.div;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    category: 'personal',
    color: getEventColor('personal'),
    reminder: null,
    recurring: { type: RECURRENCE_TYPES.NONE }
  });

  // ... useEffects ... (Keep existing logic)
  const [isEditing, setIsEditing] = useState(false);
  const [isSmartScheduleOpen, setIsSmartScheduleOpen] = useState(false);

  // Live overlap detection
  const overlappingEvents = useMemo(() => {
    if (!formData.start || !formData.end) return [];
    const newStart = new Date(formData.start).getTime();
    const newEnd = new Date(formData.end).getTime();
    if (isNaN(newStart) || isNaN(newEnd)) return [];

    return events.filter(event => {
      // Skip the event being edited
      if (selectedEvent?.id && event.id === selectedEvent.id) return false;

      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();

      // Check overlap: events overlap if one starts before the other ends
      return newStart < eventEnd && newEnd > eventStart;
    });
  }, [formData.start, formData.end, events, selectedEvent?.id]);

  // Update draftEvent for blinking indicator in week view
  useEffect(() => {
    if (isEventModalOpen && formData.start) {
      setDraftEvent({
        title: formData.title,
        start: formData.start,
        end: formData.end
      });
    }
    return () => setDraftEvent(null);
  }, [isEventModalOpen, formData.title, formData.start, formData.end, setDraftEvent]);

  useEffect(() => {
    if (!isEventModalOpen) return;
    if (selectedEvent && selectedEvent.id) {
      setFormData({
        title: selectedEvent.title || '',
        description: selectedEvent.description || '',
        start: toLocalInputValue(new Date(selectedEvent.start)),
        end: toLocalInputValue(new Date(selectedEvent.end)),
        location: selectedEvent.location || '',
        category: selectedEvent.category || 'personal',
        color: selectedEvent.color || getEventColor(selectedEvent.category),
        reminder: selectedEvent.reminder || null,
        recurring: selectedEvent.recurring || { type: RECURRENCE_TYPES.NONE }
      });
      setIsEditing(true);
      return;
    }

    const baseDate = selectedEvent?.start ? new Date(selectedEvent.start) : new Date();
    const isEditing = selectedEvent && selectedEvent.id;

    let startTime;
    if (isEditing) {
      startTime = ensureValidStartTime(baseDate);
    } else if (selectedEvent?.start) {
      startTime = ensureValidStartTime(roundToNearest5Minutes(baseDate));
    } else {
      startTime = ensureValidStartTime(roundUpTo5Minutes(new Date()));
    }

    const endTime = (selectedEvent && selectedEvent.id && selectedEvent.end)
      ? new Date(selectedEvent.end)
      : new Date(startTime.getTime() + 60 * 60 * 1000); // Default: Start + 1 hour exactly

    setFormData({
      title: '',
      description: '',
      start: toLocalInputValue(startTime),
      end: toLocalInputValue(endTime),
      location: '',
      category: 'personal',
      color: getEventColor('personal'),
      reminder: null,
      recurring: { type: RECURRENCE_TYPES.NONE }
    });
  }, [selectedEvent, isEventModalOpen]);

  // ... handlers ... (Keep existing updateDateTime, handleSubmit, etc)
  const updateDateTime = (field, type, newValue) => {
    const currentIso = formData[field];
    const current = currentIso ? new Date(currentIso) : new Date();

    if (type === 'date' && newValue instanceof Date) {
      current.setFullYear(newValue.getFullYear());
      current.setMonth(newValue.getMonth());
      current.setDate(newValue.getDate());
    } else if (type === 'time') {
      // NewValue might be Date from IsometricClock
      if (newValue instanceof Date) {
        current.setHours(newValue.getHours());
        current.setMinutes(newValue.getMinutes());
      } else {
        // Fallback for string
        const [hours, minutes] = newValue.split(':').map(Number);
        current.setHours(hours);
        current.setMinutes(minutes);
      }
    }

    if (field === 'start') {
      const newDate = ensureValidStartTime(current);
      const isoVal = toLocalInputValue(newDate);
      setFormData(prev => {
        const newData = { ...prev, [field]: isoVal };
        const currentEnd = new Date(prev.end);
        if (currentEnd < newDate) {
          const diff = 60 * 60 * 1000;
          const newEnd = new Date(newDate.getTime() + diff);
          newData.end = toLocalInputValue(newEnd);
        }
        return newData;
      });
    } else {
      handleChange(field, toLocalInputValue(current));
    }
  };

  // ... Other handlers (handleChange, handleDurationChange, handleSubmit) ...
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDurationChange = (minutes) => {
    if (!formData.start) return;
    const start = new Date(formData.start);
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    setFormData(prev => ({
      ...prev,
      end: toLocalInputValue(end)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { toastService.error('Required'); return; }
    // ... (rest of logic same)
    const eventData = {
      ...formData,
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
      color: formData.color || getEventColor(formData.category)
    };
    const validation = validateEvent(eventData);
    if (!validation.isValid) { toastService.error(validation.errors[0]); return; }

    try {
      if (isEditing && selectedEvent.id) updateEvent(selectedEvent.id, eventData);
      else await addEvent(eventData, { allowConflicts: false });
      closeEventModal();
    } catch (error) {
      console.error(error);
      toastService.error('Error saving event');
    }
  };

  const handleDelete = () => {
    if (selectedEvent?.id) { deleteEvent(selectedEvent.id); closeEventModal(); }
  };

  const categories = [
    { value: 'work', label: 'Work', color: getEventColor('work') },
    { value: 'personal', label: 'Personal', color: getEventColor('personal') },
    { value: 'fun', label: 'Fun', color: getEventColor('fun') },
    { value: 'hobby', label: 'Hobby', color: getEventColor('hobby') },
    { value: 'task', label: 'Task', color: getEventColor('task') },
    { value: 'todo', label: 'To-Do', color: getEventColor('todo') },
    { value: 'event', label: 'Event', color: getEventColor('event') },
    { value: 'appointment', label: 'Appointment', color: getEventColor('appointment') },
    { value: 'holiday', label: 'Holiday', color: getEventColor('holiday') }
  ];

  if (!isEventModalOpen) return null;

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={closeEventModal}
      >
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className={`event-modal glass-card ${isSmartScheduleOpen ? 'smart-active' : ''} ${isAIChatOpen ? 'shifted-left' : ''}`}
        >
          {/* Header */}
          <div className="modal-header compact">
            <div className="modal-header-left">
              <h3>{isEditing ? 'Edit' : 'New Event'}</h3>
              {formData.start && (
                <span className="modal-header-date">
                  {new Date(formData.start).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', position: 'relative', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsSmartScheduleOpen(!isSmartScheduleOpen)}
                className={`smart-schedule-btn ${isSmartScheduleOpen ? 'active' : ''}`}
              >
                <Zap size={14} /> Smart Schedule
              </button>
              <button onClick={closeEventModal} className="close-btn"><X size={18} /></button>
            </div>
          </div>

          <div className="modal-body-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <form onSubmit={handleSubmit} className="modal-content-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr' }}>

              {/* Panel 1: Details */}
              <div className="modal-col details-panel">
                <div className="panel-header">
                  <MessageSquare size={16} /> <span>Details</span>
                </div>
                
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="title-input"
                  placeholder="Event Title"
                  autoFocus
                />

                <div className="form-group">
                  <label><Tag size={12} /> Category</label>
                  <CustomSelect
                    options={categories}
                    value={formData.category}
                    onChange={(val) => {
                      const category = val;
                      const color = categories.find(c => c.value === category)?.color || getEventColor('personal');
                      handleChange('category', category);
                      handleChange('color', color);
                    }}
                  />
                </div>

                <div className="form-group">
                  <label><MapPin size={12} /> Location</label>
                  <div className="location-input-wrapper">
                    <Autocomplete
                      apiKey={import.meta.env.GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      onPlaceSelected={(place) => {
                        if (place && place.formatted_address) {
                          handleChange('location', place.formatted_address);
                        } else if (place && place.name) {
                          handleChange('location', place.name);
                        }
                      }}
                      options={{ types: ['establishment', 'geocode'] }}
                      className="input compact"
                      placeholder="Search location..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label><MessageSquare size={12} /> Notes</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="textarea compact description-textarea"
                    placeholder="Add details..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Panel 2: Schedule */}
              <div className="modal-col schedule-panel">
                <div className="panel-header">
                  <Clock size={16} /> <span>Schedule</span>
                </div>

                <div className="date-pickers-row">
                  <div className="date-inputs-flex">
                    <div className="date-box">
                      <label>From</label>
                      <SmartDateInput
                        value={formData.start ? new Date(formData.start) : new Date()}
                        onChange={(date) => updateDateTime('start', 'date', date)}
                      />
                    </div>
                    <div className="date-sep">
                      <ChevronRight size={14} />
                    </div>
                    <div className="date-box">
                      <label>To</label>
                      <SmartDateInput
                        value={formData.end ? new Date(formData.end) : new Date()}
                        onChange={(date) => updateDateTime('end', 'date', date)}
                      />
                    </div>
                  </div>
                </div>

                <div className="iso-clocks-container">
                  <IsometricClock
                    label="Start"
                    value={formData.start ? new Date(formData.start) : new Date()}
                    onChange={(d) => updateDateTime('start', 'time', d)}
                  />
                  <IsometricClock
                    label="End"
                    value={formData.end ? new Date(formData.end) : new Date()}
                    onChange={(d) => updateDateTime('end', 'time', d)}
                  />
                </div>

                <div className="duration-pills">
                  {[15, 30, 60, 90, 120].map(m => (
                    <button key={m} type="button" onClick={() => handleDurationChange(m)} className="pill-btn">+{m}m</button>
                  ))}
                </div>
                
                {overlappingEvents.length > 0 && (
                  <div className="overlap-warning">
                    <AlertTriangle size={14} />
                    <span>Overlaps with {overlappingEvents.length} events</span>
                  </div>
                )}
              </div>

              {/* Panel 3: Preferences / Smart */}
              <div className="modal-col preferences-panel">
                <div className="panel-header">
                  <Zap size={16} /> <span>Intelligence</span>
                </div>

                <div className="preferences-section">
                  <label><Repeat size={12} /> Recurrence</label>
                  <select 
                    value={formData.recurring?.type} 
                    onChange={(e) => handleChange('recurring', { ...formData.recurring, type: e.target.value })} 
                    className="select-modern"
                  >
                    {Object.values(RECURRENCE_TYPES).map(t => (
                      <option key={t} value={t}>{formatRecurrenceText({ type: t })}</option>
                    ))}
                  </select>
                  
                  {formData.recurring?.type === 'custom' && (
                    <div className="custom-rec-mini">
                      <CustomRecurrenceEditor
                        value={formData.recurring}
                        onChange={(rec) => handleChange('recurring', rec)}
                      />
                    </div>
                  )}
                </div>

                <div className="preferences-section">
                  <label><Bell size={12} /> Reminder</label>
                  <select 
                    value={formData.reminder || ''} 
                    onChange={(e) => handleChange('reminder', e.target.value)}
                    className="select-modern"
                  >
                    <option value="">None</option>
                    <option value="5">5 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="1440">1 day before</option>
                  </select>
                </div>

                <div className="smart-planning-area">
                  <button
                    type="button"
                    onClick={() => setIsSmartScheduleOpen(!isSmartScheduleOpen)}
                    className={`smart-action-btn ${isSmartScheduleOpen ? 'active' : ''}`}
                  >
                    <Sparkles size={16} />
                    {isSmartScheduleOpen ? 'Hide Suggestions' : 'Find Best Slot'}
                  </button>
                  
                  {isSmartScheduleOpen && (
                    <div className="smart-inline-portal">
                      <SmartSchedulePortal
                        isOpen={true}
                        inline={true}
                        onClose={() => setIsSmartScheduleOpen(false)}
                        onSelectSlot={(start, end) => {
                          setFormData(prev => ({
                            ...prev,
                            start: toLocalInputValue(start),
                            end: toLocalInputValue(end)
                          }));
                        }}
                        eventTitle={formData.title}
                        existingEvents={events}
                        preferredDate={formData.start ? new Date(formData.start) : new Date()}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="modal-footer">
                <div className="footer-left">
                  {isEditing && (
                    <button type="button" onClick={handleDelete} className="btn-danger-minimal">
                      <Trash2 size={16} /> <span>Delete</span>
                    </button>
                  )}
                </div>
                <div className="footer-right">
                  <button type="button" onClick={closeEventModal} className="btn-secondary-minimal">Cancel</button>
                  <button type="submit" className="btn-primary-glow">
                    <Save size={16} /> {isEditing ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default EventModal;
