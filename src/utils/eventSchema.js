export const EVENT_CATEGORIES = [
  'work',
  'personal',
  'fun',
  'hobby',
  'task',
  'todo',
  'event',
  'appointment',
  'health',
  'social',
  'travel',
  'other'
];

const isValidDateString = (value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

/**
 * @param {import('../types/calendar').EventInput} event
 */
export const validateEventInput = (event) => {
  const errors = [];

  if (!event.title || !event.title.trim()) {
    errors.push('Event title is required');
  }

  if (event.title && event.title.length > 200) {
    errors.push('Event title must be less than 200 characters');
  }

  if (event.description && event.description.length > 2000) {
    errors.push('Event description must be less than 2000 characters');
  }

  if (!event.start || !isValidDateString(event.start)) {
    errors.push('Start date is invalid');
  }

  if (!event.end || !isValidDateString(event.end)) {
    errors.push('End date is invalid');
  }

  if (event.category && !EVENT_CATEGORIES.includes(event.category)) {
    errors.push('Event category is invalid');
  }

  if (event.start && event.end) {
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (start >= end) {
      errors.push('End time must be after start time');
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (start < oneYearAgo) {
      errors.push('Events cannot be more than 1 year in the past');
    }

    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
    if (start > tenYearsFromNow) {
      errors.push('Events cannot be more than 10 years in the future');
    }
  }

  return errors;
};

/**
 * @param {import('../types/calendar').DraftEvent} draft
 * @returns {import('../types/calendar').DraftEvent}
 */
export const sanitizeDraft = (draft) => {
  const sanitized = { ...draft };

  if (sanitized.category && !EVENT_CATEGORIES.includes(sanitized.category)) {
    delete sanitized.category;
  }

  if (sanitized.start && !isValidDateString(sanitized.start)) {
    delete sanitized.start;
  }

  if (sanitized.end && !isValidDateString(sanitized.end)) {
    delete sanitized.end;
  }

  return sanitized;
};
