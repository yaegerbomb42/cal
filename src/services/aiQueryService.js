import { parseDateRangeFromText } from '../utils/dateRangeUtils.js';
import { getActiveEvents, getArchivedEvents, getEventsInRange, getUpcomingEvents, sortEventsByStart, summarizeEvents } from '../utils/eventQueries.js';
import { logger } from '../utils/logger.js';

/**
 * @param {string} text
 * @param {import('../types/calendar').CalendarEvent[]} events
 * @param {Date} [now]
 */
export const buildQueryResponse = (text, events, now = new Date()) => {
  const lower = text.toLowerCase();
  const dateRange = parseDateRangeFromText(text, now);

  if (lower.includes('archived') || lower.includes('past') || lower.includes('history') || lower.includes('previous')) {
    const archived = sortEventsByStart(getArchivedEvents(events, now));
    logger.info('AI query: archived events', { count: archived.length });

    if (archived.length === 0) {
      return "You don't have any archived events yet.";
    }

    const summary = summarizeEvents(archived, 5).join('; ');
    return `Here are your archived events: ${summary}. Want the full list?`;
  }

  if (lower.includes('now') || lower.includes('right now')) {
    const active = getActiveEvents(events, now);
    logger.info('AI query: active events', { count: active.length });
    if (active.length === 0) {
      return "You're free right now.";
    }
    const summary = summarizeEvents(active, 3).join('; ');
    return `You're currently in: ${summary}.`;
  }

  if (dateRange) {
    const ranged = sortEventsByStart(getEventsInRange(events, dateRange.start, dateRange.end));
    logger.info('AI query: date range', { label: dateRange.label, count: ranged.length });

    if (ranged.length === 0) {
      return `No events found for ${dateRange.label}.`;
    }

    const summary = summarizeEvents(ranged, 6).join('; ');
    return `Events for ${dateRange.label}: ${summary}.`;
  }

  if (lower.includes('next') && lower.includes('event')) {
    const upcoming = sortEventsByStart(getUpcomingEvents(events, now));
    logger.info('AI query: next event', { count: upcoming.length });
    if (upcoming.length === 0) {
      return "You don't have any upcoming events.";
    }
    const next = upcoming[0];
    const timeStr = new Date(next.start).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    return `Your next event is "${next.title}" on ${timeStr}.`;
  }

  if (lower.includes('upcoming') || lower.includes('soon')) {
    const upcoming = sortEventsByStart(getUpcomingEvents(events, now));
    logger.info('AI query: upcoming events', { count: upcoming.length });
    if (upcoming.length === 0) {
      return "You're all caught up—no upcoming events.";
    }
    const summary = summarizeEvents(upcoming, 5).join('; ');
    return `Upcoming events: ${summary}.`;
  }

  logger.info('AI query: fallback', { text });
  return "Tell me which time frame you want (today, this week, archived), and I'll list the events.";
};
