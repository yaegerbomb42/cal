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

const RECURRENCE_PATTERNS = [
  { regex: /\bevery\s+day\b/i, type: 'daily' },
  { regex: /\bdaily\b/i, type: 'daily' },
  { regex: /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, type: 'weekly' },
  { regex: /\bweekly\b/i, type: 'weekly' },
  { regex: /\b(once|1)\s+a\s+week\b/i, type: 'weekly' }
];

const extractRecurrence = (input) => {
  for (const pattern of RECURRENCE_PATTERNS) {
    const match = input.match(pattern.regex);
    if (match) {
      if (pattern.type === 'weekly' && match[1]) {
        // "every monday" -> specific day
        return { type: 'weekly', daysOfWeek: [dayNameToIndex(match[1])] };
      }
      return { type: pattern.type };
    }
  }
  return null;
};

const inferTitle = (text) => {
  // 1. Strip time/date references (existing logic)
  let cleaned = text
    .replace(TIME_RANGE_REGEX, '')
    .replace(TIME_REGEX, '')
    .replace(/\b(on|at|from|between|until|tomorrow|today|next|this|last)\b[\s\S]*/i, '') // Aggressive date stripping
    .replace(new RegExp(DATE_PATTERNS.map(p => p.regex.source).join('|'), 'gi'), '');

  // 2. Strip recurrence phrases
  RECURRENCE_PATTERNS.forEach(p => {
    cleaned = cleaned.replace(p.regex, '');
  });

  // 3. Strip verb prefixes
  cleaned = cleaned
    .replace(/\b(schedule|book|add|create|set up|remind me to)\b/i, '')
    .replace(/\b(recurring|repeating|event|called|named|titled)\b/i, ''); // Remove "called" e.g. "called PAWS"

  cleaned = stripNoise(cleaned);

  if (cleaned.length >= 2) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return '';
};

const extractLocation = (input) => {
  const locationRegex = /(?:^|\s)(?:at|in|@)\s+([^\n,.;]+?)(?=\s+(?:on|tomorrow|today|next|this|at|from|between|until|for|with)\b|$)/i;
  const match = input.match(locationRegex);
  if (!match) return null;

  const candidate = match[1].trim();
  if (!candidate) return null;
  if (TIME_REGEX.test(candidate) || TIME_RANGE_REGEX.test(candidate)) return null;
  return candidate;
};

const buildRuleBasedDraft = (input, now = new Date()) => {
  const baseDate = extractExplicitDate(input, now);
  const range = extractTimeRange(input);
  const timeToken = extractTime(input);
  const location = extractLocation(input);
  const recurrence = extractRecurrence(input);

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

  // If we found a recurrence like "every monday", ensure start date matches that day
  if (recurrence?.type === 'weekly' && recurrence.daysOfWeek?.length > 0) {
    const targetDay = recurrence.daysOfWeek[0];
    const currentDay = baseDate.getDay();
    if (currentDay !== targetDay) {
      // Adjust baseDate to the next instance of that day
      // Note: This modifies 'start' if it was already set based on baseDate
      const daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd > 0 && start) {
        const newStart = addDays(start, daysToAdd);
        start = newStart;
        end = new Date(newStart.getTime() + (end.getTime() - start.getTime()));
      }
    }
  }

  return {
    title: title || undefined,
    start: start ? start.toISOString() : undefined,
    end: end ? end.toISOString() : undefined,
    location: location || undefined,
    recurring: recurrence || undefined
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

const hasLocationHint = (input) => Boolean(extractLocation(input));
const hasMeetingHint = (input) => MEETING_HINTS.some((hint) => input.toLowerCase().includes(hint));
const hasAmbiguityHint = (input) => AMBIGUITY_HINTS.some((hint) => input.toLowerCase().includes(hint));

const scoreDraftConfidence = ({ draft, input }) => {
  const titleScore = draft.title ? 0.2 : 0;
  const dateScore = hasExplicitDate(input) ? 0.3 : 0;
  const timeScore = hasExplicitTime(input) ? 0.3 : 0;
  const endScore = draft.end ? 0.1 : 0;
  const locationScore = draft.location || hasLocationHint(input) ? 0.1 : 0;
  let score = titleScore + dateScore + timeScore + endScore + locationScore;

  if (hasAmbiguityHint(input)) score -= 0.1;

  return Math.max(0, Math.min(1, score));
};

const determineClarificationFields = ({ draft, input }) => {
  const missing = [];

  if (!draft.title) missing.push('title');
  if (!draft.start || !hasExplicitTime(input)) missing.push('start');
  if (!draft.end) missing.push('end');

  if ((hasMeetingHint(input) || hasLocationHint(input)) && !draft.location) missing.push('location');

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

  const preferLocal = localBrainService?.getPreferLocal?.() ?? false;

  // PRIORITY: Cloud First (unless local is strictly preferred)
  // If user explicitly wants local, try local first.
  // Otherwise, use cloud if available.
  const tryCloudFirst = !preferLocal && geminiService?.isInitialized;

  if (tryCloudFirst) {
    try {
      const parsed = await geminiService.parseEventFromText(input);
      draft = { ...draft, ...parsed };
      source = 'gemini';
    } catch (error) {
      aiEventEmitter.emit('calai-gemini-error', { message: error.message });
      // Fallback to local if cloud fails
      if (webLLMReady && localBrainService?.isLoaded) {
        try {
          const parsed = await localBrainService.parseEvent(input, baseDraft);
          draft = { ...draft, ...parsed };
          source = 'webllm';
        } catch (e) {
          aiEventEmitter.emit('calai-webllm-error', { message: e.message });
        }
      }
    }
  } else if (webLLMReady && localBrainService?.isLoaded) {
    // Prefer Local or Cloud not available
    try {
      // Pass baseDraft (regex heuristics) as hints to the local brain
      const parsed = await localBrainService.parseEvent(input, baseDraft);
      draft = { ...draft, ...parsed };
      source = 'webllm';
    } catch (error) {
      aiEventEmitter.emit('calai-webllm-error', { message: error.message });
      // Fallback to cloud
      if (geminiService?.isInitialized) {
        try {
          const parsed = await geminiService.parseEventFromText(input);
          draft = { ...draft, ...parsed };
          source = 'gemini';
        } catch (e) {
          aiEventEmitter.emit('calai-gemini-error', { message: e.message });
        }
      }
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
