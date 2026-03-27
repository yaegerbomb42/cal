/**
 * CRITICAL: NEVER USE ANY MODEL OTHER THAN 'gemini-3-flash-preview' (Gemini 3 Flash Preview).
 * This is a hardcoded requirement. Do not downgrade to older models (2.0/1.5).
 * Uses the NEW @google/genai SDK.
 */
import { GoogleGenAI } from '@google/genai';
import { localBrainService } from './localBrainService.js';
import { parseNaturalLanguageTime } from '../utils/dateUtils.js';
import { parseTimeRangeToDates } from '../utils/timeParser.js';
import { sanitizeDraft } from '../utils/eventSchema.js';
import { AIParseError, AIServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const ENFORCED_MODEL = 'gemini-3-flash-preview';

export class GeminiService {
  constructor() {
    this.ai = null;
    this.isInitialized = false;
    this.apiKey = null;
    this.personality = 'professional'; // Default personality
  }

  setPersonality(personality) {
    this.personality = personality;
  }

  getPersonalitySystemPrompt() {
    const prompts = {
      professional: "You are Cal, an expert executive assistant. Be concise, logical, and treat every task as high-priority business. No casual language. Focus on efficiency and results. Always refer to yourself as Cal.",
      'your-bff': "You are Cal, the user's best friend! Be super excited about their plans. Use phrases like 'Ooo I love that place!' and 'That sounds amazing!' Be gossipy and fun. Show enthusiasm for everything! Use emojis ✨💖.",
      creative: "You are Cal, a philosopher-comedian hybrid. Channel Socrates, Carl Marx, Chris Rock, and George Carlin. Find interesting connections between ideas, make witty observations, and joke about everything. Look for deeper meanings and cultural commentary. Be witty and profound.",
      spicy: `You are Cal, a r-rated adult comedy writer helping with calendar events. Make explicit sexual jokes and innuendos about EVERY event. Be raunchy and crude. Use explicit language like: ass, tits, dick, pussy, fuck, horny, wet, hard, cum. Make it dirty AF. Every response should be sexually charged.`
    };
    return prompts[this.personality] || prompts.professional;
  }

  initialize(apiKey) {
    const FALLBACK_KEY = import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    const finalKey = apiKey || FALLBACK_KEY;

    if (!finalKey) {
      logger.warn('Gemini API key not provided');
      this.isInitialized = false;
      return false;
    }

    try {
      this.apiKey = finalKey;
      this.ai = new GoogleGenAI({
        apiKey: this.apiKey,
        httpOptions: { apiVersion: 'v1alpha' }
      });
      this.isInitialized = true;
      logger.info(`Gemini initialized with model: ${ENFORCED_MODEL}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize Gemini', { error });
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Internal helper: calls the new @google/genai SDK.
   * Accepts text prompt or full contents array.
   */
  async _generate(promptOrContents, config = {}) {
    if (!this.ai) throw new AIServiceError('Gemini not initialized');
    const contents = typeof promptOrContents === 'string'
      ? [{ role: 'user', parts: [{ text: promptOrContents }] }]
      : promptOrContents;
    const response = await this.ai.models.generateContent({
      model: ENFORCED_MODEL,
      contents,
      config,
    });
    return response.text;
  }

  async testConnection() {
    if (!this.isInitialized) {
      throw new AIServiceError('Service not initialized - please add your API key');
    }
    try {
      const text = await this._generate('Say "connected" in one word');
      return { success: true, message: text };
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

  async parseEventFromText(text, hints = null) {
    const preferLocal = localBrainService.getPreferLocal?.();
    const canUseLocal = Boolean(preferLocal && localBrainService.isLoaded);

    if (!this.isInitialized && !localBrainService.isLoaded) {
      throw new AIServiceError('AI service not initialized. Connect Gemini API or load Offline Brain.');
    }

    if (canUseLocal) {
      try {
        const localResult = await localBrainService.parseEvent(text, hints);
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
- title: The ACTUAL EVENT NAME, not the command. See TITLE EXTRACTION RULES below.
- description: Full details, context, and original text if complex.
- start date and time
- end date and time (if not specified, assume 1 hour duration or standard duration for the complexity)
- location: Extract the FULL address if possible, or a specific building/room name/city.
- category (work, personal, fun, hobby, task, todo, event, appointment, holiday, health, social, travel, or other)
- recurring (if the event repeats)

Text: "${text}"

Current ISO Time: ${now.toISOString()}
Current Date: ${now.toDateString()}
User Timezone: ${timeZone}

TITLE EXTRACTION RULES (HIGHEST PRIORITY - FOLLOW EXACTLY):
The title is ONLY the event name itself. Follow these rules in order:

RULE 1: If text contains "called X" or "named X" or "titled X" → title is ONLY "X"
RULE 2: If text contains "for X" at the end → title is likely "X"  
RULE 3: Otherwise, extract the activity/purpose (e.g., "meeting", "dentist", "gym")

STOP WORDS TO REMOVE FROM TITLE (never include these):
- Time words: "hour", "minute", "now", "today", "tomorrow", "starting", "at", "in an", "in a"
- Command words: "create", "add", "schedule", "book", "set", "make", "please", "ok", "bro"
- Filler words: "an event", "a meeting", "called", "named", "titled"

${hints ? `
HINTS FROM LOCAL RULE-BASED PARSER (USE THESE TO GUIDE YOUR EXTRACTION):
${JSON.stringify(hints, null, 2)}
` : ''}

EXAMPLES (study these carefully):
| User Input | CORRECT Title | WRONG Title |
|------------|---------------|-------------|
| "create an event in an hour called Test" | "Test" | "An in an hour called Test" ❌ |
| "add a 1 hour event called PAWS" | "PAWS" | "1 hour event called PAWS" ❌ |
| "schedule meeting tomorrow named Sync" | "Sync" | "meeting tomorrow named Sync" ❌ |
| "book 2 hours for Gym" | "Gym" | "2 hours for Gym" ❌ |
| "dentist at 3pm" | "Dentist" | "dentist at 3pm" ❌ |

CRITICAL INSTRUCTIONS:
- The user is in ${timeZone}.
- If the user says "8am", they mean 8:00 AM in ${timeZone}.
- Output the 'start' and 'end' as ISO 8601 strings converted to UTC/Zulu time (ending in Z) that corresponds to the user's local time.
- Example: If user is in America/Chicago (UTC-6) and says "8am", user means 08:00 local, which is 14:00 UTC. The ISO string should be "...T14:00:00.000Z".
- If the user specifies a time range (e.g., 11:30 to 4pm), honor that range exactly.
- If the user specifies a time range (e.g., 11:30 to 4pm), honor that range exactly.
- If a date is specified without a time, assume 12:00 PM local time.
- For day-specific recurring events (e.g., "every Monday"), set the start date to the EXT occurrence of that day on or after the mentioned start date.

RECURRING EVENT PARSING:
- Pattern: "every monday for the next two months" ->
  - "type": "weekly"
  - "daysOfWeek": [1]
  - "endDate": [Calculate date ~60 days from start] OR "count": 8
- Pattern: "every day" -> "type": "daily"
- Pattern: "every 2 weeks" -> "interval": 2, "type": "weekly"

Please respond with a JSON object in this exact format:
{
  "title": "Event Title",
  "description": "Event description",
  "start": "ISO_UTC_STRING",
  "end": "ISO_UTC_STRING",
  "location": "Location if specified",
  "category": "work",
  "recurring": {
    "type": "weekly",
    "interval": 1,
    "daysOfWeek": [1],
    "endDate": "ISO_UTC_STRING",
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
      if (!this.ai) {
        throw new AIServiceError('Gemini model not available. Reconnect your API key.');
      }

      const responseText = await this._generate(prompt, {
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 2048 },
      });

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
        logger.info('Cloud AI failed, auto-falling back to Offline Brain...');
        // Notify user about the automatic switch
        window.dispatchEvent(new CustomEvent('toast', {
          detail: {
            message: "Cloud AI failed. Switched to Offline Brain.",
            type: "info"
          }
        }));

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

  async parseEventsFromImages(files, chatContext = "") {
    if (!this.isInitialized) {
      throw new AIServiceError('AI service not initialized. Connect Gemini API to process images.');
    }

    if (!files || files.length === 0) {
      throw new AIParseError('No images provided for processing.');
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const prompt = `
You are Cal, an expert calendar parser and visual analyzer. 

TASK 1: Extract all event details from the provided images. 
TASK 2: If NO events are found, summarize the image content and explain its relevance to the current chat context: "${chatContext}".

Return a JSON object:
{
  "events": [
    {
      "title": "String",
      "description": "String",
      "start": "ISO_8601_UTC",
      "end": "ISO_8601_UTC",
      "location": "String",
      "category": "String"
    }
  ],
  "summary": "String (only if events is empty)",
  "analysis": "String (brief note about what you saw)"
}

Rules:
- Interpret dates and times in the user's timezone: ${timeZone}.
- If the image contains no events, return {"events": [], "summary": "...", "analysis": "..."}.
- Respond ONLY with JSON.
Current ISO Time: ${new Date().toISOString()}
`;

    const imageParts = await Promise.all(files.map(file => this.fileToGenerativePart(file)));
    const contents = [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }];
    const responseText = await this._generate(contents);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new AIParseError('No valid JSON found in image response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (result.events && result.events.length > 0) {
      result.events = result.events
        .filter(event => event && event.start)
        .map(event => {
          const normalized = sanitizeDraft(this.normalizeParsedEvent(event, ''));
          if (!normalized.end) {
            const startDate = new Date(normalized.start);
            normalized.end = new Date(startDate.getTime() + 60 * 60 * 1000).toISOString();
          }
          return normalized;
        });
    }

    return result;
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
      const responseText = await this._generate(prompt);

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
      const responseText = await this._generate(prompt);

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

  async chatResponse(message, history = [], events = []) {
    const preferLocal = localBrainService.getPreferLocal?.();
    const canUseLocal = Boolean(preferLocal && localBrainService.isLoaded);

    if (!this.isInitialized && !canUseLocal) {
      throw new AIServiceError('AI service not available');
    }

    const { memoryService } = await import('./memoryService.js');
    const memoryContext = memoryService.getMemoryContext();

    const eventsContext = events.length > 0 ?
      `ALL CALENDAR DATA (Events & Tasks): ${JSON.stringify(events.map(e => ({ title: e.title, start: e.start, location: e.location, category: e.category })))}` :
      'No current events or tasks found in the calendar.';

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const systemPrompt = `
${this.getPersonalitySystemPrompt()}

You are a proactive partner in managing the user's life. 
You can see ALL events and tasks in their calendar.

USER CONTEXT & MEMORY:
${memoryContext}

CALENDAR CONTEXT:
${eventsContext}

Current date: ${new Date().toISOString()}
Timezone: ${timeZone}

RESPONSE RULES:
1. BE CONVERSATIONAL: Acknowledge details warmly.
2. LEARN: Acknowledge "Remember that..." and I will tag it.
3. BE SMART: Use memory and calendar context to resolve ambiguity.
4. OUTPUT FORMAT:
   - Wrap logic in JSON if performing an action:
     {
       "type": "query" | "action" | "text" | "learn",
       "intent": "next_appointment" | "delete_event" | "create_event" | "free_time" | "set_memory",
       "draft": { ...event details... },
       "fact": "Fact to remember",
       "answer": "Your friendly response"
     }
   - Otherwise, respond with natural text.
`;

    if (canUseLocal) {
      try {
        const response = await localBrainService.chat(message, systemPrompt);
        return response;
      } catch (error) {
        logger.warn('Preferred Offline Brain failed, falling back to Gemini.', { error });
      }
    }

    try {
      // Build contents array with history
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.map(msg => ({
          role: msg.isUser ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      return await this._generate(contents);
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

    // const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
      const responseText = await this._generate(prompt);
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

      if (!jsonMatch) throw new AIParseError('No JSON plan found');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Error parsing focus plan', { error });
      throw new AIParseError('Failed to generate focus plan.');
    }
  }

  /**
   * AI-powered slot picker - suggests optimal time slots based on calendar context
   * @param {Object} eventDetails - title, duration, category, preferred day, userPreferences
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
    const prefs = eventDetails.userPreferences || {};

    // NEW: Handle explicitly fuzzy ranges if provided
    const rangeStart = eventDetails.rangeStart ? new Date(eventDetails.rangeStart) : targetDate;
    const rangeEnd = eventDetails.rangeEnd ? new Date(eventDetails.rangeEnd) : new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days if no range

    const prompt = `
You are Cal, an expert level calendar AI with a deep understanding of productivity and human scheduling psychology.
The user wants to schedule an event.
Event Title: "${eventDetails.title || 'Untitled Event'}"
Category: ${eventDetails.category || 'personal'}
Duration: ${duration} minutes
Context/Range: "${eventDetails.context || 'near future'}"
Search Range: ${rangeStart.toDateString()} to ${rangeEnd.toDateString()}
User Timezone: ${timeZone}
Current Time: ${now.toISOString()}

User Productivity Preferences:
- Peak Energy: ${prefs.peakEnergyTime || 'morning'}
- Morning Focus: ${prefs.morningFocus || 'deep_work'}
- Afternoon Focus: ${prefs.afternoonFocus || 'meetings'}
- Evening Focus: ${prefs.eveningFocus || 'light_tasks'}
- Prefer Uninterrupted: ${prefs.preferUninterrupted ? 'Yes' : 'No'}

Existing Events:
${JSON.stringify(existingEvents.slice(0, 50).map(e => ({
      title: e.title,
      start: e.start,
      end: e.end
    })), null, 2)}

Task: Suggest 3-5 optimal time slots.
Logic Principles:
1. Avoid ALL conflicts.
2. Context & Energy Mapping: 
   - If Title/Category is "Deep Work" or high-effort, prioritize slots in the user's "${prefs.peakEnergyTime || 'morning'}" or designated "focus" blocks.
   - If title is low-effort (e.g., "Check email"), prefer "light_tasks" slots.
   - If "Meeting", prefer the user's "meetings" block.
3. Flow Optimization: Avoid creating "Swiss Cheese" schedules (tiny 15-30 min gaps). Favor keeping deep work blocks together.
4. Reasoning: Provide a brief, "human" explanation for why this slot is good, EXPLICITLY MENTIONING how it fits their productivity profile (e.g., "Gives you a solid focus block during your peak morning energy").

Return ONLY a JSON array:
[
  {
    "start": "ISO_8601_UTC_STRING",
    "end": "ISO_8601_UTC_STRING",
    "reason": "Expert reasoning",
    "confidence": 0.95
  }
]
`;

    try {
      const responseText = await this._generate(prompt);
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);

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
   * Helper to parse "March" or "Next Week" into a date range
   */
  async parseFuzzyDateRange(text) {
    if (!this.isInitialized) return null;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const prompt = `
     Convert the following time reference into a start and end ISO date range.
     Text: "${text}"
     Current Date: ${new Date().toISOString()}
     Timezone: ${timeZone}
     
     Return JSON: {"start": "ISO", "end": "ISO"}
     If no specific range, return null.
     `;
    try {
      const txt = await this._generate(prompt);
      const match = txt.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch { return null; }
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
