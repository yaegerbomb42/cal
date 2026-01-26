import { addDays, isValid, nextDay, parse, setHours, setMinutes, startOfDay } from 'date-fns';
import { sanitizeDraft } from '../utils/eventSchema';
import { aiEventEmitter } from './aiEventEmitter';
import { createWebLLMEvaluator } from './WebLLMEvaluator';

const DEFAULT_DURATION_MINUTES = 60;
const CONFIDENCE_THRESHOLD = 0.8;
const defaultEvaluator = createWebLLMEvaluator();

const DATE_PATTERNS = [
  { regex: /\btoday\b/i, resolve: (now) => startOfDay(now) },
  { regex: /\btomorrow\b/i, resolve: (now) => startOfDay(addDays(now, 1)) },
  {
    regex: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    resolve: (now, match) => nextDay(startOfDay(now), dayNameToIndex(match[1]))
  }
];

const TIME_RANGE_REGEX = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
const TIME_REGEX = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;

const LOCATION_HINTS = ['at', 'in', '@'];
const MEETING_HINTS = ['meeting', 'meet', 'call', 'sync', 'standup'];
const AMBIGUITY_HINTS = ['sometime', 'later', 'soon', 'this week', 'next week', 'sometime next'];

const dayNameToIndex = (dayName = '') => {
  const map = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  return map[dayName.toLowerCase()] ?? 0;
};

const stripNoise = (text) => text.replace(/[.,!?]/g, '').trim();

const extractExplicitDate = (input, now) => {
  for (const pattern of DATE_PATTERNS) {
    const match = input.match(pattern.regex);
    if (match) return pattern.resolve(now, match);
  }

  const numericMatch = input.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numericMatch) {
    const month = Number(numericMatch[1]);
    const day = Number(numericMatch[2]);
    const year = numericMatch[3] ? Number(numericMatch[3]) : now.getFullYear();
    const parsed = parse(`${month}/${day}/${year}`, 'M/d/yyyy', now);
    if (isValid(parsed)) return startOfDay(parsed);
  }

  const isoMatch = input.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const parsed = parse(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, 'yyyy-M-d', now);
    if (isValid(parsed)) return startOfDay(parsed);
  }

  const weekdayMatch = input.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (weekdayMatch) {
    return nextDay(startOfDay(now), dayNameToIndex(weekdayMatch[1]));
  }

  return startOfDay(now);
};

const extractTimeRange = (input) => {
  const match = input.match(TIME_RANGE_REGEX);
  if (!match) return null;

  return {
    start: { hours: to24Hour(match[1], match[3]), minutes: Number(match[2] || 0) },
    end: { hours: to24Hour(match[4], match[6] || match[3]), minutes: Number(match[5] || 0) }
  };
};

const extractTime = (input) => {
  const match = input.match(TIME_REGEX);
  if (!match) return null;
  return {
    hours: to24Hour(match[1], match[3]),
    minutes: Number(match[2] || 0)
  };
};

const to24Hour = (hour, meridiem) => {
  let value = Number(hour);
  if (!meridiem) return value;
  const lower = meridiem.toLowerCase();
  if (lower === 'pm' && value < 12) value += 12;
  if (lower === 'am' && value === 12) value = 0;
  return value;
};

const inferTitle = (text) => {
  const cleaned = stripNoise(
    text
      .replace(/\b(on|at|from|between|until|tomorrow|today|next|this|last)\b[\s\S]*/i, '')
      .replace(/\b(schedule|book|add|create|set up|remind me to)\b/i, '')
  );

  if (cleaned.length >= 3) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return '';
};

const buildRuleBasedDraft = (input, now = new Date()) => {
  const baseDate = extractExplicitDate(input, now);
  const range = extractTimeRange(input);
  const timeToken = extractTime(input);

  let start = null;
  let end = null;

  if (range) {
    start = setMinutes(setHours(baseDate, range.start.hours), range.start.minutes);
    end = setMinutes(setHours(baseDate, range.end.hours), range.end.minutes);
  } else if (timeToken) {
    start = setMinutes(setHours(baseDate, timeToken.hours), timeToken.minutes);
    end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
  }

  const title = inferTitle(input);

  return {
    title: title || undefined,
    start: start ? start.toISOString() : undefined,
    end: end ? end.toISOString() : undefined
  };
};

const hasExplicitTime = (input) => Boolean(input.match(TIME_RANGE_REGEX) || input.match(TIME_REGEX));

const hasExplicitDate = (input) => {
  return Boolean(
    input.match(/\btoday\b|\btomorrow\b|\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i) ||
      input.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/) ||
      input.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/) ||
      input.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  );
};

const hasLocationHint = (input) => LOCATION_HINTS.some((hint) => input.toLowerCase().includes(` ${hint} `));
const hasMeetingHint = (input) => MEETING_HINTS.some((hint) => input.toLowerCase().includes(hint));
const hasAmbiguityHint = (input) => AMBIGUITY_HINTS.some((hint) => input.toLowerCase().includes(hint));

const scoreDraftConfidence = ({ draft, input }) => {
  const titleScore = draft.title ? 0.2 : 0;
  const dateScore = hasExplicitDate(input) ? 0.3 : 0;
  const timeScore = hasExplicitTime(input) ? 0.3 : 0;
  const endScore = draft.end ? 0.1 : 0;
  const locationScore = hasLocationHint(input) ? 0.1 : 0;
  let score = titleScore + dateScore + timeScore + endScore + locationScore;

  if (hasAmbiguityHint(input)) score -= 0.1;

  return Math.max(0, Math.min(1, score));
};

const determineClarificationFields = ({ draft, input }) => {
  const missing = [];

  if (!draft.title) missing.push('title');
  if (!draft.start || !hasExplicitTime(input)) missing.push('start');
  if (!draft.end) missing.push('end');

  if (hasMeetingHint(input) && !draft.location) missing.push('location');

  return missing;
};

export const listClarificationFields = (draft, input) =>
  determineClarificationFields({ draft, input });

export const getClarificationPrompt = (field, { draft } = {}) => {
  const title = draft?.title ? ` for "${draft.title}"` : '';

  switch (field) {
    case 'title':
      return 'What should I call this event?';
    case 'start':
      return `What time should it start${title}?`;
    case 'end':
      return `What time should it end${title}?`;
    case 'location':
      return `Clarify the location${title}.`;
    default:
      return 'Could you share more details?';
  }
};

export const applyClarificationAnswer = (draft, field, answer) => {
  if (field === 'title') {
    const title = answer.trim();
    return { ...draft, title };
  }

  if (field === 'location') {
    const location = answer.trim();
    return { ...draft, location };
  }

  const baseDate = extractExplicitDate(answer, new Date());
  const range = extractTimeRange(answer);
  const token = extractTime(answer);

  if (field === 'start') {
    if (range?.start) {
      const start = setMinutes(setHours(baseDate, range.start.hours), range.start.minutes);
      const duration = draft.start && draft.end
        ? new Date(draft.end).getTime() - new Date(draft.start).getTime()
        : DEFAULT_DURATION_MINUTES * 60 * 1000;
      const end = new Date(start.getTime() + duration);
      return { ...draft, start: start.toISOString(), end: end.toISOString() };
    }

    if (token) {
      const start = setMinutes(setHours(baseDate, token.hours), token.minutes);
      const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
      return { ...draft, start: start.toISOString(), end: end.toISOString() };
    }
  }

  if (field === 'end') {
    if (range?.end) {
      const end = setMinutes(setHours(baseDate, range.end.hours), range.end.minutes);
      return { ...draft, end: end.toISOString() };
    }

    if (token) {
      const end = setMinutes(setHours(baseDate, token.hours), token.minutes);
      return { ...draft, end: end.toISOString() };
    }
  }

  return draft;
};

export const processEventInput = async (
  input,
  {
    geminiService,
    localBrainService,
    evaluator = defaultEvaluator,
    verbose = false,
    now = new Date()
  } = {}
) => {
  const baseDraft = buildRuleBasedDraft(input, now);
  let draft = { ...baseDraft };
  let source = 'rule';

  let benchmark = evaluator.getCached();
  if (!benchmark && localBrainService?.isLoaded) {
    benchmark = await evaluator.evaluate({ parseEvent: localBrainService.parseEvent.bind(localBrainService) });
  }

  const webLLMReady = Boolean(benchmark?.ready);

  if (webLLMReady && localBrainService?.isLoaded) {
    try {
      const parsed = await localBrainService.parseEvent(input);
      draft = { ...draft, ...parsed };
      source = 'webllm';
    } catch (error) {
      aiEventEmitter.emit('calai-webllm-error', { message: error.message });
    }
  } else if (geminiService?.isInitialized) {
    try {
      const parsed = await geminiService.parseEventFromText(input);
      draft = { ...draft, ...parsed };
      source = 'gemini';
    } catch (error) {
      aiEventEmitter.emit('calai-gemini-error', { message: error.message });
    }
  }

  const sanitized = sanitizeDraft({ ...draft });
  const confidence = scoreDraftConfidence({ draft: sanitized, input });
  const missingFields = determineClarificationFields({ draft: sanitized, input });

  if (confidence < CONFIDENCE_THRESHOLD && missingFields.length === 0) {
    if (!hasExplicitTime(input) || !sanitized.start) {
      missingFields.push('start');
    } else if (!hasExplicitDate(input)) {
      missingFields.push('start');
    } else if (!sanitized.title) {
      missingFields.push('title');
    } else if (hasMeetingHint(input) && !sanitized.location) {
      missingFields.push('location');
    } else {
      missingFields.push('title');
    }
  }

  const status = missingFields.length > 0 || confidence < CONFIDENCE_THRESHOLD
    ? 'needs_clarification'
    : 'draft';

  aiEventEmitter.emit('calai-event-processed', {
    input,
    source,
    confidence,
    missingFields,
    benchmark
  });

  return {
    status,
    draft: sanitized,
    missingFields,
    confidence,
    source,
    benchmark
  };
};
