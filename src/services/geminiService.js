import { GoogleGenerativeAI } from '@google/generative-ai';
import { localBrainService } from './localBrainService.js';
import { parseNaturalLanguageTime } from '../utils/dateUtils.js';
import { parseTimeRangeToDates } from '../utils/timeParser.js';
import { sanitizeDraft } from '../utils/eventSchema.js';
import { AIParseError, AIServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.modelPro = null;
    this.modelFlash = null;
    this.isInitialized = false;
    this.apiKey = null;
  }

  initialize(apiKey) {
    if (!apiKey) {
      logger.warn('Gemini API key not provided');
      this.isInitialized = false;
      return false;
    }

    try {
      this.apiKey = apiKey;
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      // Use stable Gemini 2.0 Flash model
      try {
        // Gemini 2.0 Flash - fast and capable
        this.modelFlash = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        this.modelPro = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      } catch (error) {
        logger.warn('Gemini 2.0 Flash failed, trying 1.5 Flash', { error });
        try {
          // Fallback to 1.5 Flash if 2.0 not available
          this.modelFlash = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          this.modelPro = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        } catch (fallbackError) {
          logger.warn('Gemini model initialization failed.', { error: fallbackError });
        }
      }
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize Gemini', { error });
      this.isInitialized = false;
      return false;
    }
  }

  async testConnection() {
    if (!this.isInitialized) {
      throw new AIServiceError('Service not initialized - please add your API key');
    }
    try {
      const result = await this.modelFlash.generateContent('Say "connected" in one word');
      const response = await result.response;
      return { success: true, message: response.text() };
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      if (errorMsg.includes('API_KEY_INVALID')) {
        throw new AIServiceError('Invalid API key - please check your key in Settings');
      } else if (errorMsg.includes('PERMISSION_DENIED')) {
        throw new AIServiceError('API key lacks permissions - enable Gemini API in Google Cloud');
      } else if (errorMsg.includes('QUOTA')) {
        throw new AIServiceError('API quota exceeded - try again later or upgrade your plan');
      }
      throw new AIServiceError(`Connection failed: ${errorMsg}`);
    }
  }

  async parseEventFromText(text) {
    const preferLocal = localBrainService.getPreferLocal?.();
    const canUseLocal = Boolean(preferLocal && localBrainService.isLoaded);

    if (!this.isInitialized && !localBrainService.isLoaded) {
      throw new AIServiceError('AI service not initialized. Connect Gemini API or load Offline Brain.');
    }

    if (canUseLocal) {
      try {
        const localResult = await localBrainService.parseEvent(text);
        return this.normalizeParsedEvent(localResult, text);
      } catch (error) {
        logger.warn('Preferred Offline Brain failed, falling back to Gemini.', { error });
        if (!this.isInitialized) {
          throw new AIParseError('Offline Brain failed to parse the request.');
        }
      }
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const prompt = `
Parse the following text into a calendar event. The text might be a casual request, a pasted email, or a message. Extract the most relevant event details:
- title (required, summarize the event if pasted from long text)
- description (optional, include key details)
- start date and time
- end date and time (if not specified, assume 1 hour duration unless context suggests otherwise)
- location (optional)
- category (work, personal, fun, hobby, task, todo, event, appointment, holiday, health, social, travel, or other)
- recurring (if the event repeats)

Text: "${text}"

Current ISO Time: ${now.toISOString()}
Current Date: ${now.toDateString()}
User Timezone: ${timeZone}

CRITICAL INSTRUCTIONS:
- The user is in ${timeZone}.
- If the user says "8am", they mean 8:00 AM in ${timeZone}.
- Output the 'start' and 'end' as ISO 8601 strings converted to UTC/Zulu time (ending in Z) that corresponds to the user's local time.
- Example: If user is in America/Chicago (UTC-6) and says "8am", user means 08:00 local, which is 14:00 UTC. The ISO string should be "...T14:00:00.000Z".
- If the user specifies a time range (e.g., 11:30 to 4pm), honor that range exactly.
- If a date is specified without a time, assume 12:00 PM local time.
- For day-specific recurring events (e.g., "every Monday"), set the start date to the NEXT occurrence of that day.

RECURRING EVENT PARSING:
- If the user says "every monday", "weekly", "repeating", "recurring", etc., extract the recurrence pattern.
- For "every Monday for 2 months", calculate the end date (2 months from now) OR count (approximately 8-9 occurrences).
- Common patterns: daily, weekly, biweekly, monthly, yearly.
- For weekly patterns on specific days, note which day(s).

Please respond with a JSON object in this exact format:
{
  "title": "Event Title",
  "description": "Event description",
  "start": "2024-01-01T14:00:00.000Z",
  "end": "2024-01-01T15:00:00.000Z",
  "location": "Location if specified",
  "category": "work",
  "recurring": {
    "type": "weekly",
    "interval": 1,
    "daysOfWeek": [1],
    "endDate": "2024-03-01T00:00:00.000Z",
    "count": 8
  }
}

RECURRING TYPES: "none", "daily", "weekly", "biweekly", "monthly", "yearly"
DAYS OF WEEK: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

If no recurrence, set "recurring": {"type": "none"}
If the text contains multiple potential events, just parse the first/primary one.
If the text doesn't contain enough information for a calendar event, respond with:
{"error": "Insufficient information for calendar event"}
`;

    try {
      // Use Flash for faster parsing
      const model = this.modelFlash || this.modelPro;
      if (!model) {
        throw new AIServiceError('Gemini model not available. Reconnect your API key.');
      }
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIParseError('No valid JSON found in response');
      }

      const parsedEvent = JSON.parse(jsonMatch[0]);

      if (parsedEvent.error) {
        throw new AIParseError(parsedEvent.error);
      }

      // Validate required fields
      if (!parsedEvent.title || !parsedEvent.start || !parsedEvent.end) {
        throw new AIParseError('Missing required event fields');
      }

      return this.normalizeParsedEvent(parsedEvent, text);
    } catch (error) {
      logger.error('Error parsing event with Gemini', { error });

      // FALLBACK: Local Brain
      if (localBrainService.isLoaded) {
        logger.info('Falling back to Offline Brain...');
        try {
          const localResult = await localBrainService.parseEvent(text);
          return this.normalizeParsedEvent(localResult, text);
        } catch (localError) {
          logger.error('Offline Brain failed', { error: localError });
        }
      }

      if (error instanceof AIParseError) {
        throw error;
      }

      throw new AIParseError('Unable to parse the event details.');
    }
  }

  async parseEventsFromImages(files) {
    if (!this.isInitialized) {
      throw new AIServiceError('AI service not initialized. Connect Gemini API to process images.');
    }

    if (!files || files.length === 0) {
      throw new AIParseError('No images provided for processing.');
    }

    const model = this.modelPro || this.modelFlash;
    if (!model) {
      throw new AIServiceError('Gemini model not available. Reconnect your API key.');
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const prompt = `
You are Cal, an expert calendar parser. Extract all event details from the provided images, including handwritten notes.
The images may include multiple events per image.

Return a JSON array. Each item must include:
- title
- description (optional)
- start (ISO 8601 UTC string)
- end (ISO 8601 UTC string)
- location (optional)
- category (work, personal, fun, hobby, task, todo, event, appointment, holiday, health, social, travel, other)

Rules:
- Interpret dates and times in the user's timezone: ${timeZone}.
- If a time is missing, assume 12:00 PM local.
- If an end time is missing, assume 1 hour duration.
- If the image contains no events, return [].
- Respond ONLY with JSON (no markdown, no extra text).
Current ISO Time: ${new Date().toISOString()}
`;

    const imageParts = await Promise.all(files.map(file => this.fileToGenerativePart(file)));
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const responseText = response.text();

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new AIParseError('No valid JSON array found in image response');
    }

    let parsedEvents = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsedEvents)) {
      throw new AIParseError('Image response did not return an array of events');
    }

    parsedEvents = parsedEvents
      .filter(event => event && event.start)
      .map(event => {
        const normalized = sanitizeDraft(this.normalizeParsedEvent(event, ''));
        if (!normalized.end) {
          const startDate = new Date(normalized.start);
          normalized.end = new Date(startDate.getTime() + 60 * 60 * 1000).toISOString();
        }
        return normalized;
      });

    return parsedEvents;
  }

  async fileToGenerativePart(file) {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const base64 = data.split(',')[1];
    return {
      inlineData: {
        data: base64,
        mimeType: file.type
      }
    };
  }

  async checkConflicts(newEvent, existingEvents) {
    if (!this.isInitialized) {
      return [];
    }

    const newStart = new Date(newEvent.start);
    const newEnd = new Date(newEvent.end);

    const conflicts = existingEvents.filter(event => {
      const existingStart = new Date(event.start);
      const existingEnd = new Date(event.end);

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });

    if (conflicts.length === 0) {
      return [];
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const prompt = `
I have a scheduling conflict. Here's the new event:
${JSON.stringify(newEvent, null, 2)}

And here are the conflicting events:
${JSON.stringify(conflicts, null, 2)}

User Timezone: ${timeZone}

Please suggest alternative times for the new event that don't conflict. Consider:
- Keep the same day if possible
- Suggest 2-3 alternative time slots
- Maintain the same duration
- Consider typical business hours and meal times

Respond with JSON array of suggested times:
[
  {
    "start": "2024-01-01T10:00:00.000Z",
    "end": "2024-01-01T11:00:00.000Z",
    "reason": "Moved 1 hour later to avoid conflict"
  }
]
`;

    try {
      // Use Flash for faster parsing
      const result = await this.modelFlash.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Error checking conflicts', { error });
      return [];
    }
  }

  async suggestEvents(context) {
    if (!this.isInitialized) {
      return [];
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const prompt = `
Based on the following context, suggest 3-5 relevant calendar events:

Context: "${context}"
Current date: ${new Date().toISOString()}
User Timezone: ${timeZone}

Consider:
- Time of day and week
- Work/life balance
- Common activities
- Seasonal relevance

Respond with JSON array:
[
  {
    "title": "Event Title",
    "description": "Brief description",
    "start": "2024-01-01T09:00:00.000Z",
    "end": "2024-01-01T10:00:00.000Z",
    "category": "personal",
    "priority": "medium"
  }
]
`;

    try {
      // Use Flash for faster parsing
      const result = await this.modelFlash.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Error suggesting events', { error });
      return [];
    }
  }

  async chatResponse(message, events = []) {
    const preferLocal = localBrainService.getPreferLocal?.();
    const canUseLocal = Boolean(preferLocal && localBrainService.isLoaded);

    if (!this.isInitialized && !canUseLocal) {
      throw new AIServiceError('AI service not available');
    }

    const eventsContext = events.length > 0 ?
      `Current upcoming events: ${JSON.stringify(events.slice(0, 15).map(e => ({ title: e.title, start: e.start, category: e.category })))}` :
      'No current upcoming events';

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const prompt = `
You are Cal, a friendly calendar assistant (Cal = calendar shorthand). The user said: "${message}"

${eventsContext}

Current date: ${new Date().toISOString()}
User Timezone: ${timeZone}

Respond in one of two ways:
1. NATURAL RESPONSE: If the user is just chatting or asking a simple question.
2. ACTION/QUERY JSON: If the user wants to PERFORM an action (delete, update) or QUERY their schedule (next appointment, free time, list birthdays).

If it's an action or query, respond with a JSON object ONLY:
{
  "type": "query" | "action" | "text",
  "intent": "next_appointment" | "delete_category" | "find_free_time" | "list_category" | "other",
  "category": "birthday" (if applicable),
  "answer": "Concise natural language answer/confirmation to show user"
}

Otherwise, respond with natural text.
Keep responses concise and actionable.
`;

    if (canUseLocal) {
      try {
        const response = await localBrainService.chat(message, prompt);
        return response;
      } catch (error) {
        logger.warn('Preferred Offline Brain failed, falling back to Gemini.', { error });
        if (!this.isInitialized) {
          throw new AIServiceError('Offline Brain unavailable.');
        }
      }
    }

    try {
      // Use Pro for better chat responses
      const result = await this.modelPro.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Error generating chat response', { error });
      throw new AIServiceError('Unable to generate chat response.');
    }
  }

  normalizeParsedEvent(parsedEvent, originalText) {
    if (!parsedEvent || !parsedEvent.start) {
      return parsedEvent;
    }

    const startDate = new Date(parsedEvent.start);
    const endDate = parsedEvent.end ? new Date(parsedEvent.end) : null;
    if (Number.isNaN(startDate.getTime())) {
      return parsedEvent;
    }

    const durationMs = endDate && !Number.isNaN(endDate.getTime())
      ? Math.max(endDate.getTime() - startDate.getTime(), 60 * 60 * 1000)
      : 60 * 60 * 1000;

    const explicitRange = parseTimeRangeToDates(originalText, startDate);
    if (explicitRange.start && explicitRange.end) {
      return {
        ...parsedEvent,
        start: explicitRange.start.toISOString(),
        end: explicitRange.end.toISOString()
      };
    }

    const timeMatch = this.extractExplicitTime(originalText);
    if (timeMatch) {
      const { hours, minutes } = parseNaturalLanguageTime(timeMatch);
      const localStart = new Date(startDate);
      const matches = localStart.getHours() === hours && localStart.getMinutes() === minutes;
      if (!matches) {
        const correctedStart = new Date(localStart);
        correctedStart.setHours(hours, minutes, 0, 0);
        const correctedEnd = new Date(correctedStart.getTime() + durationMs);
        return {
          ...parsedEvent,
          start: correctedStart.toISOString(),
          end: correctedEnd.toISOString()
        };
      }
    }

    if (!parsedEvent.end || Number.isNaN(endDate?.getTime())) {
      const fallbackEnd = new Date(startDate.getTime() + durationMs);
      return {
        ...parsedEvent,
        end: fallbackEnd.toISOString()
      };
    }

    if (endDate && endDate <= startDate) {
      const fallbackEnd = new Date(startDate.getTime() + durationMs);
      return {
        ...parsedEvent,
        end: fallbackEnd.toISOString()
      };
    }

    return parsedEvent;
  }

  extractExplicitTime(text) {
    if (!text) return null;
    const amPmMatch = text.match(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i);
    if (amPmMatch) return amPmMatch[0];
    const timeMatch = text.match(/\b\d{1,2}:\d{2}\b/);
    if (timeMatch) return timeMatch[0];
    return null;
  }
  async parseFocusPlan(text, currentEvents = []) {
    if (!this.isInitialized) {
      throw new AIServiceError('AI service not initialized.');
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();

    const prompt = `
    You are an expert productivity planner. The user wants to focus on the following tasks: "${text}"
    
    Current Time: ${now.toLocaleTimeString()}
    Existing Events: ${JSON.stringify(currentEvents.map(e => ({ start: e.start, end: e.end, title: e.title })))}
    
    1. Break down the request into a list of specific, distinct tasks.
    2. Assign a Priority to each: "high" (urgent/critical), "medium" (standard), "low" (nice to have).
    3. Estimate duration in minutes (default 30 if unsure).
    4. Suggest a specific start time for each task today, finding gaps in the Existing Events. PROHIBIT overlapping with existing events.
    
    Return ONLY a JSON array:
    [
      {
        "title": "Task Name",
        "description": "Brief rationale",
        "priority": "high",
        "estimatedMinutes": 30,
        "suggestedStart": "ISO_8601_STRING",
        "suggestedEnd": "ISO_8601_STRING"
      }
    ]
    `;

    try {
      const model = this.modelFlash || this.modelPro;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonMatch = response.text().match(/\[[\s\S]*\]/);

      if (!jsonMatch) throw new AIParseError('No JSON plan found');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Error parsing focus plan', { error });
      throw new AIParseError('Failed to generate focus plan.');
    }
  }

  /**
   * AI-powered slot picker - suggests optimal time slots based on calendar context
   * @param {Object} eventDetails - title, duration, category, preferred day
   * @param {Array} existingEvents - current calendar events for context
   * @returns {Array} - suggested time slots with reasoning
   */
  async suggestOptimalSlot(eventDetails, existingEvents = []) {
    // Try local brain first if preferred
    const preferLocal = localBrainService.getPreferLocal?.();
    if (preferLocal && localBrainService.isLoaded) {
      // Local model: use simple heuristics
      return this._localSlotSuggestion(eventDetails, existingEvents);
    }

    if (!this.isInitialized) {
      // Fallback to local heuristics
      return this._localSlotSuggestion(eventDetails, existingEvents);
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const targetDate = eventDetails.preferredDate || now;
    const duration = eventDetails.duration || 60; // minutes

    const prompt = `
You are Cal, a smart calendar AI. Suggest 3 optimal time slots for this event:

Event: "${eventDetails.title || 'Untitled Event'}"
Category: ${eventDetails.category || 'personal'}
Duration: ${duration} minutes
Preferred Date: ${targetDate.toDateString()}
User Timezone: ${timeZone}
Current Time: ${now.toISOString()}

Existing events on or near this date:
${JSON.stringify(existingEvents.slice(0, 10).map(e => ({
      title: e.title,
      start: e.start,
      end: e.end,
      category: e.category
    })), null, 2)}

Rules:
- Avoid conflicts with existing events
- Consider typical ${eventDetails.category === 'work' ? 'work hours (9am-6pm)' : 'waking hours (8am-10pm)'}
- Prioritize slots that give buffer time before/after meetings
- For focus/work tasks, prefer morning slots
- For social/fun events, prefer afternoon/evening

Return ONLY a JSON array:
[
  {
    "start": "ISO_8601_UTC_STRING",
    "end": "ISO_8601_UTC_STRING",
    "reason": "Brief explanation why this slot is optimal"
  }
]
`;

    try {
      const model = this.modelFlash || this.modelPro;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonMatch = response.text().match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        return this._localSlotSuggestion(eventDetails, existingEvents);
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Error suggesting optimal slots', { error });
      return this._localSlotSuggestion(eventDetails, existingEvents);
    }
  }

  /**
   * Local fallback slot suggestion using simple heuristics
   */
  _localSlotSuggestion(eventDetails, existingEvents) {
    const duration = eventDetails.duration || 60;
    const targetDate = new Date(eventDetails.preferredDate || new Date());
    const suggestions = [];

    // Generate 3 suggestions: morning, afternoon, and late afternoon
    const timeSlots = [
      { hour: 9, label: 'Morning focus time' },
      { hour: 14, label: 'Post-lunch productivity' },
      { hour: 16, label: 'Late afternoon slot' }
    ];

    for (const slot of timeSlots) {
      const start = new Date(targetDate);
      start.setHours(slot.hour, 0, 0, 0);
      const end = new Date(start.getTime() + duration * 60 * 1000);

      // Check for conflicts
      const hasConflict = existingEvents.some(e => {
        const eStart = new Date(e.start);
        const eEnd = new Date(e.end);
        return start < eEnd && end > eStart;
      });

      if (!hasConflict) {
        suggestions.push({
          start: start.toISOString(),
          end: end.toISOString(),
          reason: slot.label
        });
      }
    }

    // If all slots conflict, find first available gap
    if (suggestions.length === 0) {
      const start = new Date(targetDate);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + duration * 60 * 1000);
      suggestions.push({
        start: start.toISOString(),
        end: end.toISOString(),
        reason: 'First available slot'
      });
    }

    return suggestions;
  }
}

export const geminiService = new GeminiService();
