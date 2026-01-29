import { parseNaturalLanguageDate } from '../utils/dateUtils.js';
import { applyTimeToDate, extractDurationMinutes, parseTimeRangeToDates, parseTimeToken } from '../utils/timeParser.js';
import { sanitizeDraft } from '../utils/eventSchema.js';
import { getEventColor } from '../utils/helpers.js';
import { AIParseError, AIServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { geminiService } from './geminiService.js';
import { locationService } from './locationService.js';

const DEFAULT_DURATION_MINUTES = 60;

/**
 * @param {string} text
 * @returns {string}
 */
const inferTitle = (text) => {
  const cleaned = text
    .replace(/\b(on|at|from|between|until|tomorrow|today|next|this|last)\b[\s\S]*/i, '')
    .replace(/\b(schedule|book|add|create|set up|remind me to)\b/i, '')
    .trim();

  if (cleaned.length >= 3) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return '';
};

/**
 * @param {import('../types/calendar').DraftEvent} draft
 * @returns {import('../types/calendar').MissingEventField[]}
 */
export const listMissingFields = (draft) => {
  const missing = [];
  if (!draft.title) missing.push('title');
  if (!draft.start) missing.push('start');
  if (!draft.end) missing.push('end');
  return missing;
};

/**
 * @param {string} text
 * @returns {import('../types/calendar').DraftEvent}
 */
const buildLocalDraft = (text) => {
  const baseDate = parseNaturalLanguageDate(text);
  const range = parseTimeRangeToDates(text, baseDate);
  const duration = extractDurationMinutes(text) || DEFAULT_DURATION_MINUTES;

  let start = range.start;
  let end = range.end;

  if (!start) {
    const explicitToken = text.match(/\b(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)?.[0];
    const parsedTime = explicitToken ? parseTimeToken(explicitToken) : null;
    if (parsedTime) {
      start = applyTimeToDate(baseDate, parsedTime);
      end = new Date(start.getTime() + duration * 60 * 1000);
    }
  }

  if (start && !end) {
    end = new Date(start.getTime() + duration * 60 * 1000);
  }

  const inferredTitle = inferTitle(text);

  return {
    title: inferredTitle || undefined,
    start: start ? start.toISOString() : undefined,
    end: end ? end.toISOString() : undefined
  };
};

/**
 * @param {string} text
 * @returns {Promise<import('../types/calendar').EventDraftResult>}
 */
export const parseEventDraft = async (text) => {
  let draft = buildLocalDraft(text);
  let source = 'local';

  if (geminiService.isInitialized) {
    try {
      const parsed = await geminiService.parseEventFromText(text);
      draft = { ...draft, ...parsed };
      source = 'gemini';
    } catch (error) {
      if (error instanceof AIParseError || error instanceof AIServiceError) {
        logger.warn('Gemini parsing failed, using local draft', { message: error.message });
      } else {
        throw error;
      }
    }
  }

  draft = sanitizeDraft(draft);

  // Resolve location to full address with Google Maps link
  if (draft.location && draft.location.trim().length > 2) {
    try {
      const resolved = await locationService.resolveLocation(
        draft.location,
        draft.title || text
      );
      if (resolved) {
        draft.locationResolved = resolved.address;
        draft.mapsUrl = resolved.mapsUrl;
        draft.locationConfidence = resolved.confidence;
        // Update location if we got a higher confidence result
        if (resolved.confidence !== 'low' && resolved.address !== draft.location) {
          draft.location = resolved.address;
        }
      }
    } catch (error) {
      logger.warn('Location resolution failed', { error: error.message });
    }
  }

  const missingFields = listMissingFields(draft);

  return {
    status: missingFields.length ? 'needs_clarification' : 'draft',
    draft,
    missingFields,
    source
  };
};

/**
 * @param {import('../types/calendar').DraftEvent} draft
 * @param {import('../types/calendar').MissingEventField} field
 * @param {string} answer
 */
export const applyClarificationAnswer = (draft, field, answer) => {
  if (field === 'title') {
    const title = answer.trim();
    return { ...draft, title };
  }

  const baseDate = parseNaturalLanguageDate(answer);
  const range = parseTimeRangeToDates(answer, baseDate);

  if (field === 'start') {
    if (range.start) {
      const duration = draft.start && draft.end
        ? new Date(draft.end).getTime() - new Date(draft.start).getTime()
        : DEFAULT_DURATION_MINUTES * 60 * 1000;
      const start = range.start.toISOString();
      const end = new Date(range.start.getTime() + duration).toISOString();
      return { ...draft, start, end };
    }

    const token = answer.match(/\b(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)?.[0];
    const parsedTime = token ? parseTimeToken(token) : null;
    if (parsedTime) {
      const startDate = applyTimeToDate(baseDate, parsedTime);
      const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
      return { ...draft, start: startDate.toISOString(), end: endDate.toISOString() };
    }
  }

  if (field === 'end') {
    if (range.end) {
      return { ...draft, end: range.end.toISOString() };
    }

    const token = answer.match(/\b(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)?.[0];
    const parsedTime = token ? parseTimeToken(token) : null;
    if (parsedTime) {
      const endDate = applyTimeToDate(baseDate, parsedTime);
      return { ...draft, end: endDate.toISOString() };
    }
  }

  return draft;
};

/**
 * @param {import('../types/calendar').DraftEvent} draft
 */
export const finalizeDraft = (draft) => ({
  ...draft,
  title: draft.title?.trim() || 'New Event',
  description: draft.description || '',
  location: draft.location || '',
  category: draft.category || 'personal',
  recurring: draft.recurring || { type: 'none' },
  color: draft.color || getEventColor(draft.category || 'personal')
});
