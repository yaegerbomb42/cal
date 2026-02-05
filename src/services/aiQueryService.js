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
      return "Looks like you're starting fresh! No archived events yet—but that just means exciting things are ahead. 🌟";
    }

    const summary = summarizeEvents(archived, 5).join('; ');
    return `Here's a walk down memory lane! Your past events include: ${summary}. Want me to dig deeper?`;
  }

  if (lower.includes('now') || lower.includes('right now')) {
    const active = getActiveEvents(events, now);
    logger.info('AI query: active events', { count: active.length });
    if (active.length === 0) {
      return "You're completely free right now! 🎉 Perfect time for a coffee break, a quick walk, or maybe planning something fun?";
    }
    const summary = summarizeEvents(active, 3).join('; ');
    return `You're in the middle of: ${summary}. Hope it's going great! Need anything while you're at it?`;
  }

  if (dateRange) {
    const ranged = sortEventsByStart(getEventsInRange(events, dateRange.start, dateRange.end));
    logger.info('AI query: date range', { label: dateRange.label, count: ranged.length });

    if (ranged.length === 0) {
      return `Your ${dateRange.label} is wide open! ☀️ That's a blank canvas—want me to help you plan something?`;
    }

    const summary = summarizeEvents(ranged, 6).join('; ');
    return `Here's what's on your plate for ${dateRange.label}: ${summary}. Looking manageable! Anything you'd like to add or change?`;
  }

  if (lower.includes('next') && (lower.includes('event') || lower.includes('appointment'))) {
    const upcoming = sortEventsByStart(getUpcomingEvents(events, now));
    logger.info('AI query: next event', { count: upcoming.length });
    if (upcoming.length === 0) {
      return "No upcoming events on the horizon! 🌅 Your schedule is refreshingly open. Want to add something?";
    }
    const next = upcoming[0];
    const timeStr = new Date(next.start).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    return `Coming up next: "${next.title}" on ${timeStr}. I'll make sure you don't miss it! 📅`;
  }

  if (lower.includes('upcoming') || lower.includes('soon')) {
    const upcoming = sortEventsByStart(getUpcomingEvents(events, now));
    logger.info('AI query: upcoming events', { count: upcoming.length });
    if (upcoming.length === 0) {
      return "You're all caught up—nothing on the calendar right now! 🙌 Enjoy the breathing room, or let me know if you want to schedule something.";
    }
    const summary = summarizeEvents(upcoming, 5).join('; ');
    return `Here's what's coming your way: ${summary}. You've got this! Need any adjustments?`;
  }

  logger.info('AI query: fallback', { text });
  return "I'm here to help! Just tell me a time frame—like 'today', 'this week', or 'next month'—and I'll show you what's scheduled. Or ask me anything about your calendar! 📆";
};
