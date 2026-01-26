import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { addHours, format, parse, parseISO } from 'date-fns';
import { analyzeImage, validateEventForm, type EventFormValues } from '../../utils/formValidators';
import { useEventForm } from './useEventForm';
import './EventForm.css';

export type EventDataInput = Partial<EventFormValues> & {
  start?: string | Date;
  end?: string | Date;
};

export type EventFormProps = {
  eventData?: EventDataInput;
  mode: 'create' | 'edit';
  onSubmit: (data: EventFormValues) => void;
  onCancel?: () => void;
};

const DATE_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

const DEFAULT_EVENT_TYPES = ['Meeting', 'Reminder', 'Focus', 'Travel'];

const parseDateInput = (value: string) => parse(value, DATE_INPUT_FORMAT, new Date());

const normalizeDateValue = (value?: string | Date) => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const buildInitialValues = (eventData?: EventDataInput): EventFormValues => {
  const start = normalizeDateValue(eventData?.start);
  const end = normalizeDateValue(eventData?.end ?? addHours(start, 1));

  return {
    title: eventData?.title ?? '',
    description: eventData?.description ?? '',
    start,
    end,
    type: eventData?.type ?? DEFAULT_EVENT_TYPES[0],
    location: eventData?.location ?? '',
    imageUrl: eventData?.imageUrl ?? '',
    imageAlt: eventData?.imageAlt ?? '',
    imageMeta: eventData?.imageMeta ?? null,
  };
};

const EventForm = ({ eventData, mode, onSubmit, onCancel }: EventFormProps) => {
  const initialValues = useMemo(() => buildInitialValues(eventData), [eventData]);
  const { values, errors, setFieldValue, resetForm, handleSubmit, hasChanges } = useEventForm({
    initialValues,
    onSubmit,
    validate: validateEventForm,
  });
  const [imageStatus, setImageStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [imageError, setImageError] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [showImagePanel, setShowImagePanel] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && eventData) {
      resetForm(buildInitialValues(eventData));
      setImageStatus(eventData.imageUrl ? 'ready' : 'idle');
      setImageError('');
    }
  }, [eventData, mode, resetForm]);

  const onChangeDate = (key: 'start' | 'end') => (event: ChangeEvent<HTMLInputElement>) => {
    const nextDate = parseDateInput(event.target.value);
    setFieldValue(key, nextDate);
    if (key === 'start' && nextDate > values.end) {
      setFieldValue('end', addHours(nextDate, 1));
    }
  };

  const onImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageStatus('loading');
    setImageError('');

    try {
      const result = await analyzeImage(file);
      if (result.error) {
        setImageStatus('error');
        setImageError(result.error);
        setFieldValue('imageMeta', result.metadata ?? null);
        return;
      }

      setFieldValue('imageUrl', result.dataUrl);
      setFieldValue('imageAlt', result.altText);
      setFieldValue('imageMeta', result.metadata ?? null);
      setImageStatus('ready');
    } catch (error) {
      setImageStatus('error');
      setImageError(error instanceof Error ? error.message : 'Image analysis failed.');
    }
  };

  const onResetImage = () => {
    setFieldValue('imageUrl', '');
    setFieldValue('imageAlt', '');
    setFieldValue('imageMeta', null);
    setImageStatus('idle');
    setImageError('');
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <div className="event-form-grid">
        <label className="event-form-field">
          <span>Title</span>
          <input
            type="text"
            value={values.title}
            onChange={(event) => setFieldValue('title', event.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'event-title-error' : undefined}
            placeholder="Event title"
          />
          {errors.title && (
            <span id="event-title-error" className="event-form-error">
              {errors.title}
            </span>
          )}
        </label>

        <label className="event-form-field">
          <span>Type</span>
          <select value={values.type} onChange={(event) => setFieldValue('type', event.target.value)}>
            {DEFAULT_EVENT_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="event-form-field">
          <span>Start</span>
          <input
            type="datetime-local"
            value={format(values.start, DATE_INPUT_FORMAT)}
            onChange={onChangeDate('start')}
            aria-invalid={Boolean(errors.start)}
          />
          {errors.start && <span className="event-form-error">{errors.start}</span>}
        </label>

        <label className="event-form-field">
          <span>End</span>
          <input
            type="datetime-local"
            value={format(values.end, DATE_INPUT_FORMAT)}
            onChange={onChangeDate('end')}
            aria-invalid={Boolean(errors.end)}
          />
          {errors.end && <span className="event-form-error">{errors.end}</span>}
        </label>
      </div>

      <div className="event-form-accordion">
        <button
          type="button"
          className="accordion-toggle"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
        >
          Optional details
        </button>
        <div className={`accordion-content ${showDetails ? 'open' : ''}`}>
          <label className="event-form-field">
            <span>Description</span>
            <textarea
              rows={3}
              value={values.description}
              onChange={(event) => setFieldValue('description', event.target.value)}
              placeholder="Add a short agenda or notes"
            />
          </label>
          <label className="event-form-field">
            <span>Location</span>
            <input
              type="text"
              value={values.location}
              onChange={(event) => setFieldValue('location', event.target.value)}
              placeholder="Conference room, Zoom link, etc."
            />
          </label>
        </div>
      </div>

      <div className="event-form-accordion">
        <button
          type="button"
          className="accordion-toggle"
          onClick={() => setShowImagePanel((prev) => !prev)}
          aria-expanded={showImagePanel}
        >
          Image & metadata
        </button>
        <div className={`accordion-content ${showImagePanel ? 'open' : ''}`}>
          <div className="event-form-field">
            <span>Upload image</span>
            <input type="file" accept="image/*" onChange={onImageChange} />
            {imageError && <span className="event-form-error">{imageError}</span>}
            {errors.imageUrl && <span className="event-form-error">{errors.imageUrl}</span>}
          </div>

          {values.imageUrl && (
            <div className="event-form-image-preview">
              <img src={values.imageUrl} alt={values.imageAlt || 'Event'} />
              <div>
                <label className="event-form-field">
                  <span>Alt text</span>
                  <input
                    type="text"
                    value={values.imageAlt}
                    onChange={(event) => setFieldValue('imageAlt', event.target.value)}
                    placeholder="Describe the image"
                  />
                </label>
                <div className="event-form-meta">
                  <span>Status: {imageStatus}</span>
                  {values.imageMeta && (
                    <span>
                      {values.imageMeta.width ?? '—'}x{values.imageMeta.height ?? '—'} ·{' '}
                      {values.imageMeta.type ?? 'unknown'} ·{' '}
                      {values.imageMeta.size ? `${Math.round(values.imageMeta.size / 1024)}KB` : '—'}
                    </span>
                  )}
                </div>
                <button type="button" className="secondary" onClick={onResetImage}>
                  Remove image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {mode === 'edit' && !hasChanges && (
        <p className="event-form-warning">No changes detected. Update a field to enable save.</p>
      )}

      <div className="event-form-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={mode === 'edit' && !hasChanges}>
          {mode === 'edit' ? 'Save changes' : 'Create event'}
        </button>
      </div>
    </form>
  );
};

export default EventForm;
