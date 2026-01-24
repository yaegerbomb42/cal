/**
 * @typedef {'event_create'|'event_query'|'general'} AIIntent
 */

const EVENT_CREATE_KEYWORDS = [
  'add',
  'create',
  'schedule',
  'book',
  'set up',
  'plan',
  'remind',
  'meeting',
  'call',
  'appointment',
  'reserve'
];

const EVENT_QUERY_KEYWORDS = [
  'what',
  'show',
  'list',
  'do i have',
  'calendar',
  'schedule',
  'upcoming',
  'appointment',
  'next appointment',
  'today',
  'tomorrow',
  'this week',
  'next week',
  'last week',
  'archived',
  'past',
  'previous',
  'history',
  'free time',
  'available',
  'busy'
];

/**
 * @param {string} text
 * @returns {AIIntent}
 */
export const detectIntent = (text) => {
  const lower = text.toLowerCase();

  const isCreate = EVENT_CREATE_KEYWORDS.some(keyword => lower.includes(keyword));
  const isQuery = EVENT_QUERY_KEYWORDS.some(keyword => lower.includes(keyword));

  if (isCreate && !isQuery) {
    return 'event_create';
  }

  if (isQuery && !isCreate) {
    return 'event_query';
  }

  if (isCreate && isQuery) {
    if (lower.includes('add') || lower.includes('create') || lower.includes('schedule')) {
      return 'event_create';
    }
    return 'event_query';
  }

  return 'general';
};
