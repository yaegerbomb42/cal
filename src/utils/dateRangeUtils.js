import { addDays, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';

/**
 * @typedef {{ start: Date, end: Date, label: string }} DateRange
 */

/**
 * @param {Date} date
 * @returns {DateRange}
 */
export const getDayRange = (date) => ({
  start: startOfDay(date),
  end: endOfDay(date),
  label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
});

/**
 * @param {Date} date
 * @param {string} label
 * @returns {DateRange}
 */
export const getWeekRange = (date, label = 'this week') => ({
  start: startOfWeek(date, { weekStartsOn: 0 }),
  end: endOfWeek(date, { weekStartsOn: 0 }),
  label
});

/**
 * @param {Date} date
 * @param {string} label
 * @returns {DateRange}
 */
export const getMonthRange = (date, label = 'this month') => ({
  start: startOfMonth(date),
  end: endOfMonth(date),
  label
});

/**
 * @param {string} text
 * @param {Date} now
 * @returns {DateRange | null}
 */
export const parseDateRangeFromText = (text, now = new Date()) => {
  const lower = text.toLowerCase();

  if (lower.includes('today')) {
    return getDayRange(now);
  }

  if (lower.includes('tomorrow')) {
    return getDayRange(addDays(now, 1));
  }

  if (lower.includes('yesterday')) {
    return getDayRange(subDays(now, 1));
  }

  if (lower.includes('next week')) {
    const nextWeekStart = addDays(startOfWeek(now, { weekStartsOn: 0 }), 7);
    return getWeekRange(nextWeekStart, 'next week');
  }

  if (lower.includes('last week') || lower.includes('previous week')) {
    const lastWeekStart = subDays(startOfWeek(now, { weekStartsOn: 0 }), 7);
    return getWeekRange(lastWeekStart, 'last week');
  }

  if (lower.includes('this week')) {
    return getWeekRange(now, 'this week');
  }

  if (lower.includes('next month')) {
    const nextMonth = addDays(endOfMonth(now), 1);
    return getMonthRange(nextMonth, 'next month');
  }

  if (lower.includes('last month') || lower.includes('previous month')) {
    const lastMonth = subMonths(now, 1);
    return getMonthRange(lastMonth, 'last month');
  }

  if (lower.includes('this month')) {
    return getMonthRange(now, 'this month');
  }

  return null;
};
