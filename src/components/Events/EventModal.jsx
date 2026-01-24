import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, MapPin, Clock, Tag, Palette, Repeat, Bell, Check, ArrowLeft, CalendarRange, SlidersHorizontal } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
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

const ClockTimePicker = ({ label, value, onChange }) => {
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
  const { addEvent, updateEvent, deleteEvent } = useEvents();

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
  const [activeSection, setActiveSection] = useState('details');

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
      setActiveSection('details');
      return;
    }

    const baseDate = selectedEvent?.start ? new Date(selectedEvent.start) : new Date();
    const isDefaultToday = selectedEvent?.start ? isToday(baseDate) : true;
    const startTime = selectedEvent?.start
      ? baseDate
      : (isDefaultToday ? roundToNearestFiveMinutes(baseDate) : new Date(baseDate.setHours(12, 0, 0, 0)));
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
    setIsEditing(false);
    setActiveSection('details');
  }, [selectedEvent, isEventModalOpen]);

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
        const rounded = roundToNearestFiveMinutes(current);
        handleChange(field, toLocalInputValue(rounded));
        return;
      }
      current.setHours(12, 0, 0, 0);
    }
    handleChange(field, toLocalInputValue(current));
  };

  const handleTimeChange = (field, { hours, minutes }) => {
    const current = formData[field] ? new Date(formData[field]) : new Date();
    current.setHours(hours, minutes, 0, 0);
    handleChange(field, toLocalInputValue(current));
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

  const sections = [
    { id: 'details', label: 'Details', icon: Tag },
    { id: 'schedule', label: 'Schedule', icon: CalendarRange },
    { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal }
  ];

  if (!isEventModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={closeEventModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="event-modal glass-card"
        >
          <div className="modal-header">
            <div>
              <h3>{isEditing ? 'Edit Event' : 'Create Event'}</h3>
              <p className="modal-subtitle">Plan it in seconds — no scrolling required.</p>
            </div>
            <button
              onClick={closeEventModal}
              className="close-btn"
              aria-label="Close event modal"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-tabs" role="tablist" aria-label="Event form sections">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === section.id}
                  className={`modal-tab ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon size={14} />
                  {section.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <AnimatePresence mode="wait">
              {activeSection === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="modal-section"
                  role="tabpanel"
                >
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
                      <MapPin size={16} />
                      Location
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
                </motion.div>
              )}

              {activeSection === 'schedule' && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="modal-section"
                  role="tabpanel"
                >
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
                </motion.div>
              )}

              {activeSection === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="modal-section"
                  role="tabpanel"
                >
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="category">Category</label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => {
                          const category = e.target.value;
                          const color = categories.find(c => c.value === category)?.color || getEventColor('personal');
                          handleChange('category', category);
                          handleChange('color', color);
                        }}
                        className="input"
                      >
                        {categories.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                      <div className="category-pills">
                        {categories.map(category => (
                          <button
                            key={category.value}
                            type="button"
                            className={`category-pill ${formData.category === category.value ? 'active' : ''}`}
                            style={{ '--pill-color': category.color }}
                            onClick={() => {
                              handleChange('category', category.value);
                              handleChange('color', category.color);
                            }}
                          >
                            {category.label}
                          </button>
                        ))}
                      </div>
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
                </motion.div>
              )}
            </AnimatePresence>

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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EventModal;
