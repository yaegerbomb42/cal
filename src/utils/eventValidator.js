// Event validation utilities
export const validateEvent = (event) => {
  const errors = [];

  if (!event.title || !event.title.trim()) {
    errors.push('Event title is required');
  }

  if (!event.start) {
    errors.push('Start date and time are required');
  }

  if (!event.end) {
    errors.push('End date and time are required');
  }

  if (event.start && event.end) {
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (isNaN(start.getTime())) {
      errors.push('Invalid start date');
    }

    if (isNaN(end.getTime())) {
      errors.push('Invalid end date');
    }

    if (start >= end) {
      errors.push('End time must be after start time');
    }

    // Check if event is too far in the past (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (start < oneYearAgo) {
      errors.push('Events cannot be more than 1 year in the past');
    }

    // Check if event is too far in the future (more than 10 years)
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
    if (start > tenYearsFromNow) {
      errors.push('Events cannot be more than 10 years in the future');
    }
  }

  if (event.title && event.title.length > 200) {
    errors.push('Event title must be less than 200 characters');
  }

  if (event.description && event.description.length > 2000) {
    errors.push('Event description must be less than 2000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

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
