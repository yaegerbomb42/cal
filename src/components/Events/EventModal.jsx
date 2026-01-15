import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, MapPin, Clock, Tag, Palette, Repeat, Bell } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { getEventColor } from '../../utils/helpers';
import { validateEvent } from '../../utils/eventValidator';
import { RECURRENCE_TYPES, formatRecurrenceText } from '../../utils/recurringEvents';
import { toastService } from '../../utils/toast';
import './EventModal.css';

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

  useEffect(() => {
    if (selectedEvent) {
      if (selectedEvent.id) {
        // Editing existing event
        setFormData({
          title: selectedEvent.title || '',
          description: selectedEvent.description || '',
          start: new Date(selectedEvent.start).toISOString().slice(0, 16),
          end: new Date(selectedEvent.end).toISOString().slice(0, 16),
          location: selectedEvent.location || '',
          category: selectedEvent.category || 'personal',
          color: selectedEvent.color || getEventColor(selectedEvent.category),
          reminder: selectedEvent.reminder || null,
          recurring: selectedEvent.recurring || { type: RECURRENCE_TYPES.NONE }
        });
        setIsEditing(true);
      } else {
        // Creating new event
        const startTime = selectedEvent.start || new Date();
        const endTime = selectedEvent.end || new Date(startTime.getTime() + 60 * 60 * 1000);
        
        setFormData({
          title: '',
          description: '',
          start: startTime.toISOString().slice(0, 16),
          end: endTime.toISOString().slice(0, 16),
          location: '',
          category: 'personal',
          color: getEventColor('personal')
        });
        setIsEditing(false);
      }
    }
  }, [selectedEvent]);

  const handleDurationChange = (minutes) => {
    if (!formData.start) return;
    const start = new Date(formData.start);
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    setFormData(prev => ({
      ...prev,
      end: end.toISOString().slice(0, 16)
    }));
  };

  const handleSubmit = (e) => {
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

    // Validate
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
        addEvent(eventData, { allowConflicts: false });
      }
      closeEventModal();
    } catch (error) {
      // Error already handled in addEvent
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

  const categories = [
    { value: 'work', label: 'Work', color: getEventColor('work') },
    { value: 'personal', label: 'Personal', color: getEventColor('personal') },
    { value: 'fun', label: 'Fun', color: getEventColor('fun') },
    { value: 'hobby', label: 'Hobby', color: getEventColor('hobby') },
    { value: 'task', label: 'Task', color: getEventColor('task') },
    { value: 'todo', label: 'To-Do', color: getEventColor('todo') },
    { value: 'event', label: 'Event', color: getEventColor('event') },
    { value: 'appointment', label: 'Appointment', color: getEventColor('appointment') }
  ];

  const colorOptions = [
    getEventColor('work'),
    getEventColor('personal'),
    getEventColor('fun'),
    getEventColor('hobby'),
    getEventColor('task'),
    getEventColor('todo'),
    getEventColor('event'),
    getEventColor('appointment')
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
            <h3>{isEditing ? 'Edit Event' : 'Create Event'}</h3>
            <button
              onClick={closeEventModal}
              className="close-btn"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start">
                  <Clock size={16} />
                  Start Time
                </label>
                <input
                  id="start"
                  type="datetime-local"
                  value={formData.start}
                  onChange={(e) => handleChange('start', e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="end">End Time</label>
                <input
                  id="end"
                  type="datetime-local"
                  value={formData.end}
                  onChange={(e) => handleChange('end', e.target.value)}
                  className="input"
                  required
                />
              </div>
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

            {validationErrors.length > 0 && (
              <div className="validation-errors">
                {validationErrors.map((error, idx) => (
                  <div key={idx} className="error-message">{error}</div>
                ))}
              </div>
            )}

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
