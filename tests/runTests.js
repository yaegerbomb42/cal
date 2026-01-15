import assert from 'node:assert/strict';
import { parseTimeToken, extractDurationMinutes, parseTimeRangeToDates } from '../src/utils/timeParser.js';
import { validateEventInput } from '../src/utils/eventSchema.js';
import { parseEventDraft } from '../src/services/aiEventService.js';

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

  console.log('All tests passed');
};

run().catch((error) => {
  console.error('Tests failed', error);
  process.exit(1);
});
