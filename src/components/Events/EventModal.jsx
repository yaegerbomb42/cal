import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, MapPin, Clock, Tag, Palette, Repeat, Bell, Check, ArrowLeft, ExternalLink, ChevronRight, Sparkles, MessageSquare } from 'lucide-react';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { getEventColor } from '../../utils/helpers';
import { validateEvent } from '../../utils/eventValidator';
import { RECURRENCE_TYPES, formatRecurrenceText } from '../../utils/recurringEvents';
import { toastService } from '../../utils/toast';
import { isToday } from '../../utils/dateUtils';
import { ValidationError } from '../../utils/errors';
import './EventModal.css';

import SmartDateInput from '../Common/SmartDateInput';
import ClockPicker from '../Common/ClockPicker';
import SmartSchedulePortal from './SmartSchedulePortal';
import ConflictResolutionModal from './ConflictResolutionModal';
import { geminiService } from '../../services/geminiService';

const padTime = (value) => String(value).padStart(2, '0');

const toLocalInputValue = (date) => {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}T${padTime(date.getMinutes())}`;
};

const roundToNearestFiveMinutes = (date) => {
  const rounded = new Date(date);
  const minutes = Math.round(rounded.getMinutes() / 5) * 5;
  rounded.setMinutes(minutes === 60 ? 0 : minutes, 0, 0);
  if (minutes === 60) {
    rounded.setHours(rounded.getHours() + 1);
  }
  return rounded;
};

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

const EventModal = () => {
  // ... hooks and state ...
  const { selectedEvent, isEventModalOpen, closeEventModal } = useCalendar();
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
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSmartScheduleOpen, setIsSmartScheduleOpen] = useState(false);

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
    const isDefaultToday = selectedEvent?.start ? isToday(baseDate) : true;
    const startTime = selectedEvent?.start
      ? ensureValidStartTime(baseDate)
      : ensureValidStartTime(isDefaultToday ? roundToNearestFiveMinutes(baseDate) : new Date(baseDate.setHours(12, 0, 0, 0)));
    const endTime = selectedEvent?.end
      ? new Date(selectedEvent.end)
      : new Date(startTime.getTime() + 60 * 60 * 1000); // Default: Start + 1 hour

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
    setValidationErrors([]);
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
      end: end.toISOString().slice(0, 16)
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
          className="event-modal glass-card single-screen"
        >
          {/* Header */}
          <div className="modal-header compact">
            <h3>{isEditing ? 'Edit' : 'New Event'}</h3>
            <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
              <button type="button" onClick={() => setIsSmartScheduleOpen(!isSmartScheduleOpen)} className="icon-btn" title="AI Schedule">
                <Sparkles size={16} className="text-accent" />
              </button>
              <SmartSchedulePortal
                isOpen={isSmartScheduleOpen}
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
              <button onClick={closeEventModal} className="close-btn"><X size={18} /></button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="modal-content-grid">

            {/* Left Column: Details */}
            <div className="modal-col left-col">
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="title-input"
                placeholder="Event Title"
                autoFocus
              />

              <div className="form-row">
                <div className="form-group flex-1">
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
              </div>

              <div className="form-group">
                <label>
                  <span className="flex-center gap-2"><MapPin size={12} /> Location</span>
                  {formData.location && <a href={`https://www.google.com/maps?q=${formData.location}`} target="_blank" rel="noreferrer" className="link-icon"><ExternalLink size={10} /></a>}
                </label>
                <input value={formData.location} onChange={(e) => handleChange('location', e.target.value)} className="input compact" placeholder="Add location..." />
              </div>

              <div className="form-group flex-1">
                <label><MessageSquare size={12} /> Description</label>
                <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} className="textarea compact" placeholder="Notes..." />
              </div>

              <div className="recurrence-compact">
                <label><Repeat size={12} /> Repeat</label>
                <select value={formData.recurring?.type} onChange={(e) => handleChange('recurring', { ...formData.recurring, type: e.target.value })} className="select compact">
                  {Object.values(RECURRENCE_TYPES).map(t => <option key={t} value={t}>{formatRecurrenceText({ type: t })}</option>)}
                </select>
              </div>

              {validationErrors.length > 0 && (
                <div className="validation-errors" role="alert" style={{ marginTop: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.5rem' }}>
                  {validationErrors.map((error, idx) => (
                    <div key={idx} className="error-message" style={{ color: '#fca5a5', fontSize: '0.8rem' }}>{error}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Time & Clocks */}
            <div className="modal-col right-col">
              <div className="date-pickers-row">
                <SmartDateInput
                  value={formData.start ? new Date(formData.start) : new Date()}
                  onChange={(date) => updateDateTime('start', 'date', date)}
                  compact
                />
                <span className="arrow-sep">→</span>
                <SmartDateInput
                  value={formData.end ? new Date(formData.end) : new Date()}
                  onChange={(date) => updateDateTime('end', 'date', date)}
                  compact
                />
              </div>

              <div className="iso-clocks-container">
                <IsometricClock
                  label="Start Time"
                  value={formData.start ? new Date(formData.start) : new Date()}
                  onChange={(d) => updateDateTime('start', 'time', d)}
                />
                <IsometricClock
                  label="End Time"
                  value={formData.end ? new Date(formData.end) : new Date()}
                  onChange={(d) => updateDateTime('end', 'time', d)}
                />
              </div>

              <div className="duration-pills">
                {[15, 30, 60, 90].map(m => (
                  <button key={m} type="button" onClick={() => handleDurationChange(m)} className="pill-btn">+{m}m</button>
                ))}
              </div>
            </div>

          </form>

          {/* Footer Actions */}
          <div className="modal-footer">
            {isEditing && <button type="button" onClick={handleDelete} className="btn-icon danger"><Trash2 size={16} /></button>}
            <div className="flex-gap">
              <button type="button" onClick={closeEventModal} className="btn text-only">Cancel</button>
              <button type="submit" className="btn primary">Save</button>
            </div>
          </div>

        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default EventModal;
