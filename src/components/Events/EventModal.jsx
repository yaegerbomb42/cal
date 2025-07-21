import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, MapPin, Clock, Tag, Palette } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import { useEvents } from '../../contexts/EventsContext';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { getEventColor } from '../../utils/helpers';
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
    color: '#6366f1'
  });

  const [isEditing, setIsEditing] = useState(false);

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
          color: selectedEvent.color || getEventColor(selectedEvent.category)
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
          color: '#6366f1'
        });
        setIsEditing(false);
      }
    }
  }, [selectedEvent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;

    const eventData = {
      ...formData,
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
      color: formData.color || getEventColor(formData.category)
    };

    if (isEditing && selectedEvent.id) {
      updateEvent(selectedEvent.id, eventData);
    } else {
      addEvent(eventData);
    }

    closeEventModal();
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
    { value: 'work', label: 'Work', color: '#3b82f6' },
    { value: 'personal', label: 'Personal', color: '#10b981' },
    { value: 'health', label: 'Health', color: '#f59e0b' },
    { value: 'social', label: 'Social', color: '#8b5cf6' },
    { value: 'travel', label: 'Travel', color: '#06b6d4' },
    { value: 'other', label: 'Other', color: '#6b7280' }
  ];

  const colorOptions = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#6b7280'
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => {
                    const category = e.target.value;
                    const color = categories.find(c => c.value === category)?.color || '#6366f1';
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