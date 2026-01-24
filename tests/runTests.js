/* eslint-env node */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseTimeToken, extractDurationMinutes, parseTimeRangeToDates } from '../src/utils/timeParser.js';
import { validateEventInput } from '../src/utils/eventSchema.js';
import { parseEventDraft } from '../src/services/aiEventService.js';
import { formatViewLabel, getRelativeDayLabel } from '../src/utils/dateUtils.js';
import { paginateItems } from '../src/utils/pagination.js';
import { layoutOverlappingEvents } from '../src/utils/eventLayout.js';

const withFrozenTime = (isoString, fn) => {
  const RealDate = Date;
  const frozen = new RealDate(isoString);
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate(frozen);
      }
      return new RealDate(...args);
    }
    static now() {
      return frozen.getTime();
    }
  };
  try {
    fn();
  } finally {
    globalThis.Date = RealDate;
  }
};

const readSource = (relativePath) => {
  return fs.readFileSync(path.resolve(relativePath), 'utf-8');
};

const run = async () => {
  const time = parseTimeToken('3:30pm');
  assert.deepEqual(time, { hours: 15, minutes: 30 }, '3:30pm should parse to 15:30');

  const duration = extractDurationMinutes('for 1.5 hours');
  assert.equal(duration, 90, '1.5 hours should be 90 minutes');

  const baseDate = new Date('2025-01-10T00:00:00.000Z');
  const range = parseTimeRangeToDates('2pm-3:30pm', baseDate);
  assert.ok(range.start, 'Range should include a start date');
  assert.ok(range.end, 'Range should include an end date');
  const durationMs = range.end.getTime() - range.start.getTime();
  assert.equal(durationMs, 90 * 60 * 1000, 'Time range should be 90 minutes');

  const errors = validateEventInput({
    title: 'Test',
    start: '2025-01-10T10:00:00.000Z',
    end: '2025-01-10T09:00:00.000Z'
  });
  assert.ok(errors.length > 0, 'End before start should yield validation error');

  const draftResult = await parseEventDraft('Schedule lunch tomorrow at noon for 30 minutes');
  assert.equal(draftResult.status, 'draft', 'Draft should have enough info');
  assert.ok(draftResult.draft.title, 'Draft should have a title');
  assert.ok(draftResult.draft.start, 'Draft should have a start');
  assert.ok(draftResult.draft.end, 'Draft should have an end');

  const viewLabel = formatViewLabel(new Date('2026-01-23T12:00:00'), 'Day', 'en-US');
  assert.ok(viewLabel.includes('Day View'), 'View label should include view name');
  assert.ok(viewLabel.includes('2026'), 'View label should include year');

  withFrozenTime('2026-01-23T12:00:00', () => {
    assert.equal(getRelativeDayLabel(new Date('2026-01-23T08:00:00')), 'Today');
    assert.equal(getRelativeDayLabel(new Date('2026-01-24T08:00:00')), 'Tomorrow');
    assert.equal(getRelativeDayLabel(new Date('2026-01-22T08:00:00')), 'Yesterday');
  });

  const pagination = paginateItems([1, 2, 3, 4, 5, 6], 2, 5);
  assert.equal(pagination.page, 2, 'Pagination should clamp to page 2');
  assert.equal(pagination.items.length, 1, 'Pagination should return remaining items');

  const overlapEvents = [
    { id: 'a', start: '2026-01-01T09:00:00.000Z', end: '2026-01-01T10:00:00.000Z' },
    { id: 'b', start: '2026-01-01T09:30:00.000Z', end: '2026-01-01T10:30:00.000Z' },
    { id: 'c', start: '2026-01-01T11:00:00.000Z', end: '2026-01-01T12:00:00.000Z' }
  ];
  const layout = layoutOverlappingEvents(overlapEvents);
  assert.ok(layout.find(item => item.columns > 1), 'Overlapping events should yield multiple columns');

  const headerSource = readSource('src/components/Header/Header.jsx');
  assert.ok(headerSource.includes('Ask or add with Cal'), 'Header should include updated placeholder');
  assert.ok(headerSource.includes('Cal AI'), 'Header should include Cal AI label');

  const daySource = readSource('src/components/Calendar/DayView.jsx');
  assert.ok(daySource.includes('MAX_VISIBLE_EVENTS'), 'Day view should cap visible events');
  assert.ok(daySource.includes('Remaining'), 'Day view should show remaining count');

  const weekSource = readSource('src/components/Calendar/WeekView.jsx');
  assert.ok(weekSource.includes('layoutOverlappingEvents'), 'Week view should use overlap layout');
  assert.ok(weekSource.includes('week-event-duration'), 'Week view should show duration label');

  const monthSource = readSource('src/components/Calendar/MonthView.jsx');
  assert.ok(monthSource.includes('slice(0, 3)'), 'Month view should limit previews to 3');

  const yearSource = readSource('src/components/Calendar/YearView.jsx');
  assert.ok(yearSource.includes("mode === 'type'"), 'Year view should support type mode');
  assert.ok(yearSource.includes("mode === 'frequency'"), 'Year view should support frequency mode');

  const modalSource = readSource('src/components/Events/EventModal.jsx');
  assert.ok(modalSource.includes('Main details'), 'Event modal should render details panel');
  assert.ok(modalSource.includes('Schedule details'), 'Event modal should render schedule panel');
  assert.ok(modalSource.includes('Preferences'), 'Event modal should render preferences panel');

  const settingsSource = readSource('src/components/Settings/Settings.jsx');
  assert.ok(settingsSource.includes('Local Model Test Chat'), 'Settings should include local model test chat');

  console.log('All tests passed');
};

run().catch((error) => {
  console.error('Tests failed', error);
  globalThis.process.exit(1);
});
