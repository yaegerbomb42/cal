// Recurring events utilities
export const RECURRENCE_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  WEEKDAYS: 'weekdays',
  CUSTOM: 'custom'
};

export const generateRecurringEvents = (baseEvent, recurrence, count = 10) => {
  if (!recurrence || recurrence.type === RECURRENCE_TYPES.NONE) {
    return [baseEvent];
  }

  const events = [baseEvent];
  const startDate = new Date(baseEvent.start);
  const endDate = new Date(baseEvent.end);
  const duration = endDate - startDate;

  for (let i = 1; i < count; i++) {
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    switch (recurrence.type) {
      case RECURRENCE_TYPES.DAILY:
        newStart.setDate(newStart.getDate() + i);
        newEnd.setDate(newEnd.getDate() + i);
        break;

      case RECURRENCE_TYPES.WEEKLY:
        newStart.setDate(newStart.getDate() + (i * 7));
        newEnd.setDate(newEnd.getDate() + (i * 7));
        break;

      case RECURRENCE_TYPES.MONTHLY:
        newStart.setMonth(newStart.getMonth() + i);
        newEnd.setMonth(newEnd.getMonth() + i);
        break;

      case RECURRENCE_TYPES.YEARLY:
        newStart.setFullYear(newStart.getFullYear() + i);
        newEnd.setFullYear(newEnd.getFullYear() + i);
        break;

      case RECURRENCE_TYPES.WEEKDAYS:
        let daysAdded = 0;
        let currentDate = new Date(startDate);
        while (daysAdded < i) {
          currentDate.setDate(currentDate.getDate() + 1);
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
            daysAdded++;
          }
        }
        newStart.setTime(currentDate.getTime());
        newEnd.setTime(newStart.getTime() + duration);
        break;

      default:
        return events;
    }

    events.push({
      ...baseEvent,
      id: `${baseEvent.id}_${i}`,
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
      recurring: {
        ...recurrence,
        baseId: baseEvent.id,
        occurrence: i
      }
    });
  }

  return events;
};

export const formatRecurrenceText = (recurrence) => {
  if (!recurrence || recurrence.type === RECURRENCE_TYPES.NONE) {
    return 'No recurrence';
  }

  switch (recurrence.type) {
    case RECURRENCE_TYPES.DAILY:
      return 'Daily';
    case RECURRENCE_TYPES.WEEKLY:
      return 'Weekly';
    case RECURRENCE_TYPES.MONTHLY:
      return 'Monthly';
    case RECURRENCE_TYPES.YEARLY:
      return 'Yearly';
    case RECURRENCE_TYPES.WEEKDAYS:
      return 'Weekdays';
    default:
      return 'Custom';
  }
};
