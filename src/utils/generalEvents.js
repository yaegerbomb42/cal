import { getEventColor } from './helpers.js';

const buildAllDayEvent = (title, date, packId) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    category: 'holiday',
    color: getEventColor('holiday'),
    autoPack: packId,
    description: '',
    location: ''
  };
};

const getNthWeekdayOfMonth = (year, month, weekday, occurrence) => {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (weekday - firstDay.getDay() + 7) % 7;
  const day = 1 + firstWeekday + (occurrence - 1) * 7;
  return new Date(year, month, day);
};

const getLastWeekdayOfMonth = (year, month, weekday) => {
  const lastDay = new Date(year, month + 1, 0);
  const offset = (lastDay.getDay() - weekday + 7) % 7;
  return new Date(year, month, lastDay.getDate() - offset);
};

const buildHolidayEventsForYear = (year, packId) => ([
  buildAllDayEvent("New Year's Day", new Date(year, 0, 1), packId),
  buildAllDayEvent('Martin Luther King Jr. Day', getNthWeekdayOfMonth(year, 0, 1, 3), packId),
  buildAllDayEvent('Presidents Day', getNthWeekdayOfMonth(year, 1, 1, 3), packId),
  buildAllDayEvent('Memorial Day', getLastWeekdayOfMonth(year, 4, 1), packId),
  buildAllDayEvent('Independence Day', new Date(year, 6, 4), packId),
  buildAllDayEvent('Labor Day', getNthWeekdayOfMonth(year, 8, 1, 1), packId),
  buildAllDayEvent('Thanksgiving', getNthWeekdayOfMonth(year, 10, 4, 4), packId),
  buildAllDayEvent('Christmas Day', new Date(year, 11, 25), packId)
]);

export const GENERAL_EVENT_PACKS = [
  {
    id: 'us-holidays',
    label: 'US Federal Holidays',
    description: 'Auto-add major public holidays for this year and next.',
    buildEvents: (year) => buildHolidayEventsForYear(year, 'us-holidays')
  }
];

export const buildGeneralEvents = (packId, years) => {
  const pack = GENERAL_EVENT_PACKS.find(item => item.id === packId);
  if (!pack) return [];
  return years.flatMap(year => pack.buildEvents(year));
};
