import { areIntervalsOverlapping, isWithinInterval } from 'date-fns';

type CalendarEvent = {
  start: string | Date;
  end?: string | Date;
};

type NormalizedEvent = {
  event: CalendarEvent;
  start: Date;
  end: Date;
};

const getSafeEventEnd = (event: CalendarEvent, start: Date) => {
  const rawEnd = new Date(event.end || event.start);
  if (Number.isNaN(rawEnd.getTime()) || rawEnd <= start) {
    return new Date(start.getTime() + 15 * 60 * 1000);
  }
  return rawEnd;
};

const normalizeEvents = (events: CalendarEvent[]) => {
  return events
    .map((event) => {
      const start = new Date(event.start);
      const end = getSafeEventEnd(event, start);
      return { event, start, end };
    })
    .filter((entry) => !Number.isNaN(entry.start.getTime()) && !Number.isNaN(entry.end.getTime()));
};

const eventsOverlap = (a: NormalizedEvent, b: NormalizedEvent) => {
  const intervalA = { start: a.start, end: a.end };
  const intervalB = { start: b.start, end: b.end };

  return (
    areIntervalsOverlapping(intervalA, intervalB) ||
    isWithinInterval(a.start, intervalB) ||
    isWithinInterval(b.start, intervalA)
  );
};

const getMaxConcurrent = (
  entry: NormalizedEvent,
  candidates: NormalizedEvent[],
  maxColumns: number
) => {
  const boundaries: { time: number; delta: number }[] = [];

  candidates.forEach((candidate) => {
    if (!eventsOverlap(entry, candidate)) return;
    boundaries.push({ time: candidate.start.getTime(), delta: 1 });
    boundaries.push({ time: candidate.end.getTime(), delta: -1 });
  });

  boundaries.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return b.delta - a.delta;
  });

  let active = 0;
  let maxActive = 1;
  boundaries.forEach((boundary) => {
    active += boundary.delta;
    maxActive = Math.max(maxActive, active);
  });

  return Math.min(maxActive, maxColumns);
};

export const getEventOverlapLayout = (
  events: CalendarEvent[],
  { maxColumns = 10 }: { maxColumns?: number } = {}
) => {
  const normalized = normalizeEvents(events);
  const sorted = [...normalized].sort((a, b) => {
    const diff = a.start.getTime() - b.start.getTime();
    if (diff !== 0) return diff;
    return b.end.getTime() - a.end.getTime();
  });

  const columnLastEvent: NormalizedEvent[] = [];

  const positioned = sorted.map((entry) => {
    let column = 0;
    while (column < maxColumns) {
      const last = columnLastEvent[column];
      if (!last || !eventsOverlap(entry, last)) {
        break;
      }
      column += 1;
    }

    if (column >= maxColumns) {
      column = maxColumns - 1;
    }

    columnLastEvent[column] = entry;

    return { ...entry, column };
  });

  const overlapCounts = positioned.map((entry) => {
    return Math.max(1, getMaxConcurrent(entry, normalized, maxColumns));
  });

  const maxOverlap = overlapCounts.reduce((max, value) => Math.max(max, value), 1);

  return {
    maxOverlap,
    items: positioned.map((entry, index) => ({
      event: entry.event,
      column: entry.column,
      columns: overlapCounts[index]
    }))
  };
};
