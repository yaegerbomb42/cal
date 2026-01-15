import { validateEventInput } from './eventSchema';
import { ValidationError } from './errors';

/**
 * @param {import('../types/calendar').EventInput} event
 */
export const validateEvent = (event) => {
  const errors = validateEventInput(event);
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * @param {import('../types/calendar').EventInput} event
 */
export const validateEventOrThrow = (event) => {
  const errors = validateEventInput(event);

  if (errors.length > 0) {
    throw new ValidationError(errors[0], errors, { errors });
  }

  return event;
};

/**
 * @param {import('../types/calendar').EventInput} newEvent
 * @param {import('../types/calendar').EventInput[]} existingEvents
 */
export const checkEventConflicts = (newEvent, existingEvents) => {
  const conflicts = [];
  const newStart = new Date(newEvent.start);
  const newEnd = new Date(newEvent.end);

  existingEvents.forEach(event => {
    if (event.id === newEvent.id) return; // Skip self

    const existingStart = new Date(event.start);
    const existingEnd = new Date(event.end);

    // Check for overlap
    if (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    ) {
      conflicts.push({
        event,
        type: 'overlap'
      });
    }
  });

  return conflicts;
};
