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

const padTime = (value) => String(value).padStart(2, '0');

const toLocalInputValue = (date) => {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}T${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
};

// ... (rest of imports/constants)

const EventModal = () => {
  // ... (hooks)

  // Helper to update independent date or time parts
  const updateDateTime = (field, type, newValue) => {
    // field: 'start' | 'end'
    // type: 'date' (Date obj) | 'time' (string "HH:MM")
    const currentIso = formData[field];
    const current = currentIso ? new Date(currentIso) : new Date();

    if (type === 'date' && newValue instanceof Date) {
      current.setFullYear(newValue.getFullYear());
      current.setMonth(newValue.getMonth());
      current.setDate(newValue.getDate());
    } else if (type === 'time') {
      const [hours, minutes] = newValue.split(':').map(Number);
      current.setHours(hours);
      current.setMinutes(minutes);
    }

    // Ensure valid start/end relationship logic
    if (field === 'start') {
      // If start changed, ensure end is at least start + X? 
      // For now, raw update, but we might want to shift end if start > end?
      // Let's keep it simple: just update the field.
      // Validation handles invalid ranges on submit.
      // Or we can auto-shift end if start passes it.
      const newDate = ensureValidStartTime(current);
      handleChange(field, toLocalInputValue(newDate));

      // Auto-shift end if it becomes before start
      const currentEnd = new Date(formData.end);
      if (currentEnd < newDate) {
        const diff = 60 * 60 * 1000; // 1 hour default
        const newEnd = new Date(newDate.getTime() + diff);
        handleChange('end', toLocalInputValue(newEnd));
      }

    } else {
      handleChange(field, toLocalInputValue(current));
    }
  };

  // Extract time string "HH:MM" from ISO
  const getTimeString = (isoString) => {
    if (!isoString) return '09:00';
    const d = new Date(isoString);
    return `${padTime(d.getHours())}:${padTime(d.getMinutes())}`;
  };

  // ... (rest of render) ...

  {/* Date & Time Row - Smart Input Split */ }
  <div className="time-inputs-row">
    <div className="time-input-group" style={{ flex: 1.5 }}>
      <label>Start</label>
      <div className="flex-row gap-2">
        <div style={{ flex: 2 }}>
          <SmartDateInput
            value={formData.start ? new Date(formData.start) : new Date()}
            onChange={(date) => updateDateTime('start', 'date', date)}
            autoFocus={!isEditing}
          />
        </div>
        <div style={{ flex: 1 }}>
          <input
            type="time"
            value={getTimeString(formData.start)}
            onChange={(e) => updateDateTime('start', 'time', e.target.value)}
            className="clean-time-input"
          />
        </div>
      </div>
    </div>

    <div className="time-input-group" style={{ flex: 1.5 }}>
      <label>End</label>
      <div className="flex-row gap-2">
        <div style={{ flex: 2 }}>
          <SmartDateInput
            value={formData.end ? new Date(formData.end) : new Date()}
            onChange={(date) => updateDateTime('end', 'date', date)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <input
            type="time"
            value={getTimeString(formData.end)}
            onChange={(e) => updateDateTime('end', 'time', e.target.value)}
            className="clean-time-input"
          />
        </div>
      </div>
    </div>
  </div>
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



const EventModal = () => {
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

  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

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
      : new Date(startTime.getTime() + 60 * 60 * 1000);

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

  // Helper to update independent date or time parts
  const updateDateTime = (field, type, newValue) => {
    // field: 'start' | 'end'
    // type: 'date' (Date obj) | 'time' (string "HH:MM")
    const currentIso = formData[field];
    const current = currentIso ? new Date(currentIso) : new Date();

    if (type === 'date' && newValue instanceof Date) {
      current.setFullYear(newValue.getFullYear());
      current.setMonth(newValue.getMonth());
      current.setDate(newValue.getDate());
    } else if (type === 'time') {
      const [hours, minutes] = newValue.split(':').map(Number);
      current.setHours(hours);
      current.setMinutes(minutes);
    }

    // Ensure valid start/end relationship logic
    if (field === 'start') {
      const newDate = ensureValidStartTime(current);
      const isoVal = toLocalInputValue(newDate);

      // Manually update state to avoid race conditions or dependency loops
      setFormData(prev => {
        const newData = { ...prev, [field]: isoVal };

        // Auto-shift end if it becomes before start
        const currentEnd = new Date(prev.end);
        if (currentEnd < newDate) {
          const diff = 60 * 60 * 1000; // 1 hour default
          const newEnd = new Date(newDate.getTime() + diff);
          newData.end = toLocalInputValue(newEnd);
        }
        return newData;
      });

    } else {
      handleChange(field, toLocalInputValue(current));
    }
  };

  // Extract time string "HH:MM" from ISO
  const getTimeString = (isoString) => {
    if (!isoString) return '09:00';
    const d = new Date(isoString);
    return `${padTime(d.getHours())}:${padTime(d.getMinutes())}`;
  };



  const findNextSlot = async () => {
    const duration = formData.start && formData.end
      ? Math.round((new Date(formData.end) - new Date(formData.start)) / (60 * 1000))
      : 60;

    try {
      // Use AI-powered slot suggestion
      const { geminiService } = await import('../../services/geminiService');
      const suggestions = await geminiService.suggestOptimalSlot(
        {
          title: formData.title,
          category: formData.category,
          duration: duration,
          preferredDate: formData.start ? new Date(formData.start) : new Date()
        },
        events.slice(-50) // Recent events for context
      );

      if (suggestions && suggestions.length > 0) {
        const best = suggestions[0];
        setFormData(prev => ({
          ...prev,
          start: toLocalInputValue(new Date(best.start)),
          end: toLocalInputValue(new Date(best.end))
        }));
        toastService.success(`✨ ${best.reason || 'Found an optimal slot!'}`);
        return;
      }
    } catch {
      // Fallback to simple heuristic
    }

    // Simple fallback: find first 1h gap in next 7 days
    const now = new Date();
    now.setMinutes(0, 0, 0);
    let checkTime = new Date(now);
    checkTime.setHours(checkTime.getHours() + 1);

    for (let i = 0; i < 24 * 7; i++) {
      const slotEnd = new Date(checkTime.getTime() + duration * 60 * 1000);
      const hasConflict = events.some(e => {
        const s = new Date(e.start);
        const en = new Date(e.end);
        return (checkTime < en && slotEnd > s);
      });

      if (!hasConflict) {
        setFormData(prev => ({
          ...prev,
          start: toLocalInputValue(checkTime),
          end: toLocalInputValue(slotEnd)
        }));
        toastService.info("Found an available slot!");
        return;
      }
      checkTime.setHours(checkTime.getHours() + 1);
    }
    toastService.warning("No clear slots found in the next week.");
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

    if (!formData.title.trim()) {
      toastService.error('Event title is required');
      return;
    }

    const eventData = {
      ...formData,
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
      color: formData.color || getEventColor(formData.category)
    };

    const validation = validateEvent(eventData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toastService.error(validation.errors[0]);
      return;
    }

    setValidationErrors([]);

    try {
      if (isEditing && selectedEvent.id) {
        updateEvent(selectedEvent.id, eventData);
      } else {
        await addEvent(eventData, { allowConflicts: false });
      }
      closeEventModal();
    } catch (error) {
      if (error instanceof ValidationError) {
        setValidationErrors([error.message]);
        toastService.error(error.message);
        return;
      }
      toastService.error('Unable to save event. Please try again.');
    }
  };

  const handleDelete = () => {
    if (selectedEvent?.id) {
      deleteEvent(selectedEvent.id);
      closeEventModal();
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (field, value) => {
    const current = formData[field] ? new Date(formData[field]) : new Date();
    const [year, month, day] = value.split('-').map(Number);
    current.setFullYear(year, month - 1, day);
    if (!isEditing && field === 'start') {
      if (isToday(current)) {
        const rounded = ensureValidStartTime(roundToNearestFiveMinutes(current));
        handleChange(field, toLocalInputValue(rounded));
        return;
      }
      current.setHours(12, 0, 0, 0);
    }
    handleChange(field, toLocalInputValue(ensureValidStartTime(current)));
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
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="event-modal glass-card"
        >
          <div className="modal-header">
            <div>
              <h3>{isEditing ? 'Edit Event' : 'Create Event'}</h3>
              {/* Removed subtitle as requested */}
            </div>
            <button
              onClick={closeEventModal}
              className="close-btn"
              aria-label="Close event modal"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="modal-panels">
              {/* SECTION 1: MAIN DETAILS (Left/Top) */}
              <div className="modal-section" aria-label="Event details">
                <div className="form-group">
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="input"
                    placeholder="Event Title"
                    style={{ fontSize: '1.2rem', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, paddingLeft: 0 }}
                    required
                    autoFocus
                  />
                </div>

                {/* AI Fit Schedule Button */}
                <button
                  type="button"
                  onClick={findNextSlot}
                  className="ai-fit-schedule-btn"
                >
                  <div className="ai-fit-label">
                    <Sparkles size={16} className="text-accent" />
                    <span>Fit into schedule with AI</span>
                  </div>
                  <div className="mini-schedule-vis">
                    <div className="vis-slot" />
                    <div className="vis-slot busy" />
                    <div className="vis-slot" />
                    <div className="vis-slot suggestion" />
                    <div className="vis-slot busy" />
                    <div className="vis-slot" />
                  </div>
                </button>



                <div className="quick-durations">
                  {[15, 30, 45, 60, 90, 120].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleDurationChange(m)}
                      className="duration-chip"
                    >
                      +{m}m
                    </button>
                  ))}
                </div>

                {/* Recurrence Custom UI */}
                <div className="form-group mt-2">
                  <label><Repeat size={14} /> Recurrence</label>
                  <select
                    value={formData.recurring?.type || RECURRENCE_TYPES.NONE}
                    onChange={(e) => handleChange('recurring', { ...formData.recurring, type: e.target.value })}
                    className="select"
                  >
                    {Object.values(RECURRENCE_TYPES).map(type => (
                      <option key={type} value={type}>
                        {formatRecurrenceText({ type })}
                      </option>
                    ))}
                    <option value="custom">Custom Days</option>
                  </select>

                  {/* Custom Days Selector if Weekly/Custom */}
                  {(formData.recurring?.type === 'weekly' || formData.recurring?.type === 'custom') && (
                    <div className="recurrence-days-grid">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`day-toggle ${formData.recurring?.days?.includes(idx) ? 'selected' : ''}`}
                          onClick={() => {
                            const currentDays = formData.recurring?.days || [];
                            const newDays = currentDays.includes(idx)
                              ? currentDays.filter(d => d !== idx)
                              : [...currentDays, idx];
                            handleChange('recurring', { ...formData.recurring, type: 'weekly', days: newDays.sort() });
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* SECTION 2: CONTEXT (Bottom) */}
              <div className="modal-section" aria-label="Context">
                <div className="form-group">
                  <label><Tag size={14} /> Category (Auto-colors)</label>
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
                  <label>
                    <div className="flex-row gap-2 center-align">
                      <MapPin size={14} /> Location
                    </div>
                    {formData.location && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`} target="_blank" rel="noopener noreferrer" className="location-link-header">
                        <ExternalLink size={10} /> Open Map
                      </a>
                    )}
                  </label>
                  <input
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="input"
                    placeholder="Add location..."
                  />
                </div>

                {/* Date & Time Row - Smart Input Split */}
                <div className="time-inputs-row">
                  <div className="time-input-group" style={{ flex: 1.5 }}>
                    <label>Start</label>
                    <div className="flex-row gap-2">
                      <div style={{ flex: 2 }}>
                        <SmartDateInput
                          value={formData.start ? new Date(formData.start) : new Date()}
                          onChange={(date) => updateDateTime('start', 'date', date)}
                          autoFocus={!isEditing}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="time"
                          value={getTimeString(formData.start)}
                          onChange={(e) => updateDateTime('start', 'time', e.target.value)}
                          className="clean-time-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="time-input-group" style={{ flex: 1.5 }}>
                    <label>End</label>
                    <div className="flex-row gap-2">
                      <div style={{ flex: 2 }}>
                        <SmartDateInput
                          value={formData.end ? new Date(formData.end) : new Date()}
                          onChange={(date) => updateDateTime('end', 'date', date)}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="time"
                          value={getTimeString(formData.end)}
                          onChange={(e) => updateDateTime('end', 'time', e.target.value)}
                          className="clean-time-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label><MessageSquare size={14} /> Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="textarea"
                    placeholder="Add details..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="validation-errors" role="alert">
                {validationErrors.map((error, idx) => (
                  <div key={idx} className="error-message">{error}</div>
                ))}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-danger"
                  style={{ marginRight: 'auto' }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}

              <button
                type="button"
                onClick={closeEventModal}
                className="btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <Save size={16} />
                {isEditing ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </form>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default EventModal;
