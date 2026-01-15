import { endOfDay, startOfDay } from 'date-fns';

/**
 * @param {import('../types/calendar').CalendarEvent[]} events
 * @param {Date} [now]
 */
export const getArchivedEvents = (events, now = new Date()) => {
  const todayStart = startOfDay(now);
  return events.filter(event => new Date(event.end || event.start) < todayStart);
};

/**
 * @param {import('../types/calendar').CalendarEvent[]} events
 * @param {Date} [now]
 */
export const getUpcomingEvents = (events, now = new Date()) => {
  return events.filter(event => new Date(event.start) >= now);
};

/**
 * @param {import('../types/calendar').CalendarEvent[]} events
 * @param {Date} [now]
 */
export const getActiveEvents = (events, now = new Date()) => {
  return events.filter(event => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return start <= now && now <= end;
  });
};

/**
 * @param {import('../types/calendar').CalendarEvent[]} events
 * @param {Date} start
 * @param {Date} end
 */
export const getEventsInRange = (events, start, end) => {
  return events.filter(event => {
    const eventStart = new Date(event.start);
    return eventStart >= start && eventStart <= endOfDay(end);
  });
};

/**
 * @param {import('../types/calendar').CalendarEvent[]} events
 */
export const sortEventsByStart = (events) => {
  return [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
};

/**
 * @param {import('../types/calendar').CalendarEvent[]} events
 * @param {number} [limit]
 */
export const summarizeEvents = (events, limit = 5) => {
  return events.slice(0, limit).map(event => {
    const start = new Date(event.start);
    const time = start.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `${event.title} (${time})`;
  });
};
