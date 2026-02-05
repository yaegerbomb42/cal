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
        {
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
        }

      case RECURRENCE_TYPES.CUSTOM:
        {
          const interval = recurrence.interval || 1;
          const freq = recurrence.frequency || 'weekly';
          const daysOfWeek = recurrence.daysOfWeek || [];

          if (freq === 'daily') {
            newStart.setDate(newStart.getDate() + (i * interval));
            newEnd.setDate(newEnd.getDate() + (i * interval));
          } else if (freq === 'weekly') {
            if (daysOfWeek.length > 0) {
              // Find the next valid day of week
              let occurrences = 0;
              let currentDate = new Date(startDate);
              currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

              while (occurrences < i) {
                if (daysOfWeek.includes(currentDate.getDay())) {
                  occurrences++;
                  if (occurrences === i) break;
                }
                currentDate.setDate(currentDate.getDate() + 1);

                // Check if we crossed a week boundary with interval > 1
                const weeksDiff = Math.floor((currentDate - startDate) / (7 * 24 * 60 * 60 * 1000));
                if (weeksDiff > 0 && weeksDiff % interval !== 0) {
                  // Skip to next valid week
                  const daysToSkip = (interval - (weeksDiff % interval)) * 7;
                  currentDate.setDate(currentDate.getDate() + daysToSkip);
                }
              }

              newStart.setTime(currentDate.getTime());
              newStart.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
              newEnd.setTime(newStart.getTime() + duration);
            } else {
              // No specific days, just every N weeks
              newStart.setDate(newStart.getDate() + (i * 7 * interval));
              newEnd.setDate(newEnd.getDate() + (i * 7 * interval));
            }
          } else if (freq === 'monthly') {
            newStart.setMonth(newStart.getMonth() + (i * interval));
            newEnd.setMonth(newEnd.getMonth() + (i * interval));
          } else if (freq === 'yearly') {
            newStart.setFullYear(newStart.getFullYear() + (i * interval));
            newEnd.setFullYear(newEnd.getFullYear() + (i * interval));
          }

          // Check end conditions
          if (recurrence.endType === 'count' && i >= recurrence.endCount) {
            return events;
          }
          if (recurrence.endType === 'date' && newStart > new Date(recurrence.endDate)) {
            return events;
          }
          break;
        }

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
    case RECURRENCE_TYPES.CUSTOM:
      {
        const interval = recurrence.interval || 1;
        const freq = recurrence.frequency || 'weekly';
        const days = recurrence.daysOfWeek || [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let text = `Every ${interval > 1 ? interval + ' ' : ''}${freq.replace('ly', '')}${interval > 1 ? 's' : ''}`;

        if (freq === 'weekly' && days.length > 0) {
          text += ` on ${days.map(d => dayNames[d]).join(', ')}`;
        }

        if (recurrence.endType === 'count') {
          text += ` (${recurrence.endCount}x)`;
        } else if (recurrence.endType === 'date' && recurrence.endDate) {
          text += ` until ${new Date(recurrence.endDate).toLocaleDateString()}`;
        }

        return text;
      }
    default:
      return 'Custom';
  }
};
