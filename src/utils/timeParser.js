import { addDays, setHours, setMinutes, startOfDay } from 'date-fns';

/**
 * @typedef {Object} ParsedTime
 * @property {number} hours
 * @property {number} minutes
 */

const TIME_RANGE_REGEX = /(\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b)\s*(?:-|to|until|–)\s*(\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b)/i;
const TIME_TOKEN_REGEX = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;

const normalizeHours = (hours, period) => {
  let normalized = hours;
  if (period) {
    const lower = period.toLowerCase();
    if (lower === 'pm' && normalized !== 12) {
      normalized += 12;
    }
    if (lower === 'am' && normalized === 12) {
      normalized = 0;
    }
  }
  return normalized;
};

/**
 * @param {string} token
 * @returns {ParsedTime | null}
 */
export const parseTimeToken = (token) => {
  if (!token) return null;
  const lower = token.toLowerCase();

  if (lower.includes('noon')) {
    return { hours: 12, minutes: 0 };
  }

  if (lower.includes('midnight')) {
    return { hours: 0, minutes: 0 };
  }

  const match = token.match(TIME_TOKEN_REGEX);
  if (!match) return null;

  const [, hoursRaw, minutesRaw, period] = match;
  const hours = normalizeHours(Number(hoursRaw), period);
  const minutes = minutesRaw ? Number(minutesRaw) : 0;

  return { hours, minutes };
};

/**
 * @param {string} text
 * @returns {{ startToken: string, endToken: string } | null}
 */
export const extractTimeRange = (text) => {
  const match = text.match(TIME_RANGE_REGEX);
  if (!match) return null;
  return { startToken: match[1], endToken: match[2] };
};

/**
 * @param {string} text
 * @returns {number | null}
 */
export const extractDurationMinutes = (text) => {
  const lower = text.toLowerCase();
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)\b/);
  const minMatch = lower.match(/(\d+)\s*(minute|minutes|min|mins)\b/);

  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    if (!Number.isNaN(hours)) {
      return Math.round(hours * 60);
    }
  }

  if (minMatch) {
    const minutes = Number(minMatch[1]);
    if (!Number.isNaN(minutes)) {
      return minutes;
    }
  }

  return null;
};

/**
 * @param {Date} baseDate
 * @param {ParsedTime} parsedTime
 * @returns {Date}
 */
export const applyTimeToDate = (baseDate, parsedTime) => {
  let date = startOfDay(baseDate);
  date = setHours(date, parsedTime.hours);
  date = setMinutes(date, parsedTime.minutes);
  return date;
};

/**
 * @param {string} text
 * @param {Date} baseDate
 * @returns {{ start: Date | null, end: Date | null }}
 */
export const parseTimeRangeToDates = (text, baseDate) => {
  const range = extractTimeRange(text);
  if (!range) {
    return { start: null, end: null };
  }

  const startParsed = parseTimeToken(range.startToken);
  const endParsed = parseTimeToken(range.endToken);
  if (!startParsed || !endParsed) {
    return { start: null, end: null };
  }

  const start = applyTimeToDate(baseDate, startParsed);
  let end = applyTimeToDate(baseDate, endParsed);

  if (end <= start) {
    end = addDays(end, 1);
  }

  return { start, end };
};
