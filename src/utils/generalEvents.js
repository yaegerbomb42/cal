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
    label: 'US Holidays',
    description: 'Federal holidays for this year and next',
    buildEvents: (year) => buildHolidayEventsForYear(year, 'us-holidays')
  },
  {
    id: 'nfl-season',
    label: 'NFL Season',
    description: 'Key NFL dates: kickoff, playoffs, Super Bowl',
    buildEvents: (year) => [
      buildAllDayEvent('NFL Season Kickoff', new Date(year, 8, 5), 'nfl-season'),
      buildAllDayEvent('NFL Wild Card Weekend', new Date(year + 1, 0, 11), 'nfl-season'),
      buildAllDayEvent('Super Bowl Sunday', new Date(year + 1, 1, 9), 'nfl-season')
    ]
  },
  {
    id: 'nba-season',
    label: 'NBA Season',
    description: 'Key NBA dates: tip-off, All-Star, Finals',
    buildEvents: (year) => [
      buildAllDayEvent('NBA Season Tip-Off', new Date(year, 9, 22), 'nba-season'),
      buildAllDayEvent('NBA All-Star Weekend', new Date(year + 1, 1, 14), 'nba-season'),
      buildAllDayEvent('NBA Finals Start', new Date(year + 1, 5, 1), 'nba-season')
    ]
  },
  {
    id: 'moon-phases',
    label: 'Moon Phases',
    description: 'Full moons and new moons throughout the year',
    buildEvents: (year) => {
      // Approximate moon phases (simplified)
      const phases = [];
      const baseFullMoon = new Date(year, 0, 13); // Approximate first full moon of year
      for (let i = 0; i < 12; i++) {
        const fullMoon = new Date(baseFullMoon);
        fullMoon.setDate(fullMoon.getDate() + (i * 29));
        phases.push(buildAllDayEvent('🌕 Full Moon', fullMoon, 'moon-phases'));

        const newMoon = new Date(fullMoon);
        newMoon.setDate(newMoon.getDate() + 14);
        phases.push(buildAllDayEvent('🌑 New Moon', newMoon, 'moon-phases'));
      }
      return phases;
    }
  }
];

export const buildGeneralEvents = (packId, years) => {
  const pack = GENERAL_EVENT_PACKS.find(item => item.id === packId);
  if (!pack) return [];
  return years.flatMap(year => pack.buildEvents(year));
};
