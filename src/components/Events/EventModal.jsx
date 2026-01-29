import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, MapPin, Clock, Tag, Palette, Repeat, Bell, Check, ArrowLeft, ExternalLink, ChevronRight, Sparkles } from 'lucide-react';
import { useCalendar } from '../../contexts/useCalendar';
import { useEvents } from '../../contexts/useEvents';
import { getEventColor } from '../../utils/helpers';
import { validateEvent } from '../../utils/eventValidator';
import { RECURRENCE_TYPES, formatRecurrenceText } from '../../utils/recurringEvents';
import { toastService } from '../../utils/toast';
import { formatTime24, isToday } from '../../utils/dateUtils';
import { ValidationError } from '../../utils/errors';
import './EventModal.css';

const padTime = (value) => String(value).padStart(2, '0');

const toLocalInputValue = (date) => {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}T${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
};

const toLocalDateInput = (date) => {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`;
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

const ClockTimePicker = ({ label, value, onChange }) => {
  // ... existing ClockTimePicker code ...
  const clockRef = useRef(null);
  const [mode, setMode] = useState('hour');
  const [isDragging, setIsDragging] = useState(false);
  const modeRef = useRef('hour');
  const dragModeRef = useRef(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const dateValue = value ? new Date(value) : new Date();
  const hour = dateValue.getHours();
  const minute = dateValue.getMinutes();

  const hourAngle = ((hour % 12) / 12) * 360;
  const minuteAngle = (minute / 60) * 360;

  const updateTime = (nextHour, nextMinute) => {
    onChange({ hours: nextHour, minutes: nextMinute });
  };

  const setPickerMode = (nextMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  };

  const handleSelect = (clientX, clientY, targetMode = modeRef.current) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    const angle = Math.atan2(y, x);
    const degrees = (angle * 180) / Math.PI;
    const adjusted = (degrees + 90 + 360) % 360;

    if (targetMode === 'hour') {
      const baseHour = Math.round(adjusted / 30) % 12;
      const normalized = baseHour === 0 ? 12 : baseHour;
      const isPm = hour >= 12;
      const newHour = isPm ? (normalized % 12) + 12 : normalized % 12;
      updateTime(newHour, minute);
    } else {
      let newMinute = Math.round((adjusted / 360) * 60);
      newMinute = Math.round(newMinute / 5) * 5;
      if (newMinute === 60) newMinute = 0;
      updateTime(hour, newMinute);
    }
  };

  const getClosestHand = (degrees) => {
    const normalize = (angle) => (angle + 360) % 360;
    const diff = (a, b) => {
      const delta = Math.abs(normalize(a) - normalize(b));
      return Math.min(delta, 360 - delta);
    };
    const hourDiff = diff(degrees, hourAngle);
    const minuteDiff = diff(degrees, minuteAngle);
    return hourDiff <= minuteDiff ? 'hour' : 'minute';
  };

  const startDrag = (event, targetMode) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragModeRef.current = targetMode;
    setPickerMode(targetMode);
    setIsDragging(true);
    handleSelect(event.clientX, event.clientY, targetMode);
  };

  const handlePointerDown = (event) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const angle = Math.atan2(y, x);
    const degrees = (angle * 180) / Math.PI;
    const adjusted = (degrees + 90 + 360) % 360;
    const closest = getClosestHand(adjusted);
    startDrag(event, closest);
  };

  const handleHandPointerDown = (event, targetMode) => {
    startDrag(event, targetMode);
  };

  const handlePointerMove = (event) => {
    if (!isDragging) return;
    handleSelect(event.clientX, event.clientY, dragModeRef.current ?? modeRef.current);
  };

  const handlePointerUp = (event) => {
    setIsDragging(false);
    dragModeRef.current = null;
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  return (
    <div className="clock-picker">
      <div className="clock-picker-header">
        <span className="clock-label">{label}</span>
        <span className="clock-time-display">{formatTime24(dateValue)}</span>
      </div>
      <div
        className={`clock-face ${mode}`}
        ref={clockRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {[...Array(12)].map((_, idx) => {
          const angle = (idx / 12) * 360;
          const label = idx === 0 ? 12 : idx;
          return (
            <div
              key={`hour-${idx}`}
              className="clock-mark major"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <span className="mark-label">{label}</span>
            </div>
          );
        })}
        {[...Array(12)].map((_, idx) => (
          <div
            key={`minute-${idx}`}
            className="clock-minute-dot"
            style={{ transform: `rotate(${idx * 30}deg)` }}
          />
        ))}
        <div
          className={`clock-hand hour-hand ${mode === 'hour' ? 'active' : ''}`}
          style={{ transform: `rotate(${hourAngle}deg)` }}
          onPointerDown={(event) => handleHandPointerDown(event, 'hour')}
        >
          <span />
        </div>
        <div
          className={`clock-hand minute-hand ${mode === 'minute' ? 'active' : ''}`}
          style={{ transform: `rotate(${minuteAngle}deg)` }}
          onPointerDown={(event) => handleHandPointerDown(event, 'minute')}
        >
          <span />
        </div>
        <div className="clock-center" />
      </div>
      <div className="clock-picker-footer">
        <button
          type="button"
          className="clock-action-btn"
          onClick={() => {
            setPickerMode('hour');
            setIsDragging(false);
          }}
          disabled={mode === 'hour'}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="clock-mode-indicator">
          Drag either hand to refine time
        </div>
        <button
          type="button"
          className="clock-action-btn primary"
          onClick={() => {
            setIsDragging(false);
          }}
        >
          <Check size={14} />
          Done
        </button>
      </div>
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

  // Compute frequent event titles as templates
  const recentTemplates = [...new Set(events.slice(-50).map(e => e.title))]
    .filter(title => title && title.length > 2)
    .reverse()
    .slice(0, 8);

  const applyTemplate = (title) => {
    const templateEvent = events.findLast(e => e.title === title);
    if (!templateEvent) {
      setFormData(prev => ({ ...prev, title }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      title: templateEvent.title,
      description: templateEvent.description || '',
      category: templateEvent.category || 'personal',
      location: templateEvent.location || '',
      color: templateEvent.color || getEventColor(templateEvent.category)
    }));
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

  const handleTimeChange = (field, { hours, minutes }) => {
    const current = formData[field] ? new Date(formData[field]) : new Date();
    current.setHours(hours, minutes, 0, 0);
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

  const colorOptions = [
    getEventColor('work'),
    getEventColor('personal'),
    getEventColor('fun'),
    getEventColor('hobby'),
    getEventColor('task'),
    getEventColor('todo'),
    getEventColor('event'),
    getEventColor('appointment'),
    getEventColor('holiday')
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
              <p className="modal-subtitle">Plan it in seconds — everything is visible at once.</p>
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
              <div className="modal-section" aria-label="Event details">
                <h4 className="panel-title"><Tag size={14} /> Main details</h4>
                <div className="form-group">
                  <div className="template-chips-label">
                    <Repeat size={14} /> Repeat Previous
                  </div>
                  <div className="template-chips">
                    {recentTemplates.length > 0 ? (
                      recentTemplates.map(title => (
                        <button
                          key={title}
                          type="button"
                          className="chip"
                          onClick={() => applyTemplate(title)}
                        >
                          {title}
                        </button>
                      ))
                    ) : (
                      <span className="text-muted text-xs">No recent events yet</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="title">
                    <Tag size={16} />
                    Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="input"
                    placeholder="Event title"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={findNextSlot}
                  className="smart-schedule-btn"
                >
                  <Sparkles size={14} /> Find Best Available Slot
                </button>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="input textarea"
                    placeholder="Event description"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="location">
                    <div className="flex-row gap-2 center-align">
                      <MapPin size={16} />
                      Location
                    </div>
                    {formData.location && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`, '_blank')}
                        className="map-link-btn"
                        title="Open in Google Maps"
                      >
                        <ExternalLink size={12} /> Map
                      </button>
                    )}
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="input"
                    placeholder="Event location"
                  />
                </div>
              </div>

              <div className="modal-section" aria-label="Schedule details">
                <h4 className="panel-title"><Clock size={14} /> Schedule time</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="start-date">
                      <Clock size={16} />
                      Start Date
                    </label>
                    <input
                      id="start-date"
                      type="date"
                      value={formData.start ? toLocalDateInput(new Date(formData.start)) : ''}
                      onChange={(e) => handleDateChange('start', e.target.value)}
                      className="input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="end-date">End Date</label>
                    <input
                      id="end-date"
                      type="date"
                      value={formData.end ? toLocalDateInput(new Date(formData.end)) : ''}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="time-picker-grid">
                  <ClockTimePicker
                    label="Start Time"
                    value={formData.start}
                    onChange={(time) => handleTimeChange('start', time)}
                  />
                  <ClockTimePicker
                    label="End Time"
                    value={formData.end}
                    onChange={(time) => handleTimeChange('end', time)}
                  />
                </div>

                <div className="form-group quick-duration">
                  <label>Quick Duration</label>
                  <div className="duration-buttons">
                    {[15, 30, 60, 120].map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => handleDurationChange(minutes)}
                        className="duration-btn"
                      >
                        {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-section" aria-label="Event type">
                <h4 className="panel-title"><Palette size={14} /> Type & preferences</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
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
                      <Palette size={16} />
                      Color
                    </label>
                    <div className="color-picker">
                      {colorOptions.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleChange('color', color)}
                          className={`color-option ${formData.color === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <Repeat size={16} />
                      Recurrence
                    </label>
                    <select
                      value={formData.recurring?.type || RECURRENCE_TYPES.NONE}
                      onChange={(e) => handleChange('recurring', { type: e.target.value })}
                      className="input"
                    >
                      {Object.values(RECURRENCE_TYPES).map(type => (
                        <option key={type} value={type}>
                          {formatRecurrenceText({ type })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      <Bell size={16} />
                      Reminder
                    </label>
                    <select
                      value={formData.reminder || ''}
                      onChange={(e) => handleChange('reminder', e.target.value || null)}
                      className="input"
                    >
                      <option value="">No reminder</option>
                      <option value="5">5 minutes before</option>
                      <option value="15">15 minutes before</option>
                      <option value="30">30 minutes before</option>
                      <option value="60">1 hour before</option>
                      <option value="1440">1 day before</option>
                    </select>
                  </div>
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

            <div className="modal-actions">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-danger"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              )}

              <div className="action-buttons">
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
                  {isEditing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default EventModal;
