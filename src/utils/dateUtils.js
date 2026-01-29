import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addDays,
  subDays,
  isToday,
  getWeek,
  startOfDay,
  endOfDay
} from 'date-fns';

export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
  return format(date, formatStr);
};

export const formatFullDate = (date, locale = undefined) => {
  return new Intl.DateTimeFormat(locale || undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export const formatViewLabel = (date, viewName, locale = undefined) => {
  const datePart = new Intl.DateTimeFormat(locale || undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
  return `${datePart} · ${viewName} View`;
};

export const formatTime = (date) => {
  return format(date, 'h:mm a');
};

export const formatTime24 = (date) => {
  return format(date, 'h:mm a');
};

export const getWeekDays = (date) => {
  const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
};

export const getMonthDays = (date) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
};

export const getDayHours = () => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const hour = new Date();
    hour.setHours(i, 0, 0, 0);
    hours.push(hour);
  }
  return hours;
};

export const getDayHoursWithHalf = () => {
  const slots = [];
  for (let i = 0; i < 24; i++) {
    // Full hour
    const hour = new Date();
    hour.setHours(i, 0, 0, 0);
    slots.push({ time: hour, isHalfHour: false });

    // Half hour
    const halfHour = new Date();
    halfHour.setHours(i, 30, 0, 0);
    slots.push({ time: halfHour, isHalfHour: true });
  }
  return slots;
};

export const getCurrentTimePosition = (pixelsPerHour = 36) => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes / 60) * pixelsPerHour;
};

export const isBusinessHour = (hour) => {
  const hourNum = hour.getHours();
  return hourNum >= 9 && hourNum < 18; // 9 AM to 6 PM
};

export const isDateInRange = (date, start, end) => {
  return date >= start && date <= end;
};

export const getEventPosition = (event, dayStart, pixelsPerHour = 36) => {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);

  const minutesFromDayStart = (eventStart.getHours() * 60) + eventStart.getMinutes();
  const duration = (eventEnd - eventStart) / (1000 * 60); // duration in minutes

  const top = (minutesFromDayStart / 60) * pixelsPerHour;
  const minHeight = Math.max(pixelsPerHour * 0.45, 12);
  const height = Math.max((duration / 60) * pixelsPerHour, minHeight);

  return { top, height };
};

export const getRelativeDayLabel = (date, locale = undefined) => {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffMs = target - today;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return new Intl.DateTimeFormat(locale || undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export const sortEventsByStart = (events) => {
  return [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
};

export const countRemainingEvents = (events, now = new Date()) => {
  return events.filter(event => new Date(event.end || event.start) >= now).length;
};

export const createTimeSlot = (date, hour, minute = 0) => {
  const newDate = new Date(date);
  newDate.setHours(hour, minute, 0, 0);
  return newDate;
};

export const parseNaturalLanguageDate = (text) => {
  // Simple natural language parsing - can be enhanced
  const now = new Date();
  const lowerText = text.toLowerCase();
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  if (lowerText.includes('today')) {
    return new Date();
  }

  if (lowerText.includes('tomorrow')) {
    return addDays(now, 1);
  }

  if (lowerText.includes('yesterday')) {
    return subDays(now, 1);
  }

  if (lowerText.includes('next week')) {
    return addDays(now, 7);
  }

  const nextWeekdayMatch = lowerText.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextWeekdayMatch) {
    const targetIndex = weekdays.indexOf(nextWeekdayMatch[1]);
    const currentIndex = now.getDay();
    const delta = (7 - currentIndex + targetIndex) % 7 || 7;
    return addDays(now, delta);
  }

  const thisWeekdayMatch = lowerText.match(/\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (thisWeekdayMatch) {
    const targetIndex = weekdays.indexOf(thisWeekdayMatch[1]);
    const currentIndex = now.getDay();
    const delta = (7 - currentIndex + targetIndex) % 7;
    return addDays(now, delta);
  }

  // Try to parse standard date formats
  const dateMatch = text.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    return new Date(year || now.getFullYear(), month - 1, day);
  }

  return now;
};

export const parseNaturalLanguageTime = (text) => {
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let [, hours, minutes = '0', period] = timeMatch;
    hours = parseInt(hours);
    minutes = parseInt(minutes);

    if (period) {
      if (period.toLowerCase() === 'pm' && hours !== 12) {
        hours += 12;
      } else if (period.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
    }

    return { hours, minutes };
  }

  return { hours: 9, minutes: 0 }; // default to 9 AM
};

export {
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  getWeek
};
