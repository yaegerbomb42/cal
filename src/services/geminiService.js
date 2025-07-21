import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseNaturalLanguageDate, parseNaturalLanguageTime } from '../utils/dateUtils';

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.isInitialized = false;
  }

  initialize(apiKey) {
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async parseEventFromText(text, existingEvents = []) {
    if (!this.isInitialized) {
      throw new Error('Gemini service not initialized');
    }

    const prompt = `
Parse the following text into a calendar event. Extract:
- title (required)
- description (optional)
- start date and time
- end date and time (if not specified, assume 1 hour duration)
- location (optional)
- category (work, personal, health, social, travel, or other)

Text: "${text}"

Current date and time: ${new Date().toISOString()}

Please respond with a JSON object in this exact format:
{
  "title": "Event Title",
  "description": "Event description",
  "start": "2024-01-01T09:00:00.000Z",
  "end": "2024-01-01T10:00:00.000Z",
  "location": "Location if specified",
  "category": "personal"
}

If the text doesn't contain enough information for a calendar event, respond with:
{"error": "Insufficient information for calendar event"}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const parsedEvent = JSON.parse(jsonMatch[0]);
      
      if (parsedEvent.error) {
        throw new Error(parsedEvent.error);
      }
      
      // Validate required fields
      if (!parsedEvent.title || !parsedEvent.start || !parsedEvent.end) {
        throw new Error('Missing required event fields');
      }
      
      return parsedEvent;
    } catch (error) {
      console.error('Error parsing event:', error);
      throw error;
    }
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

    const prompt = `
I have a scheduling conflict. Here's the new event:
${JSON.stringify(newEvent, null, 2)}

And here are the conflicting events:
${JSON.stringify(conflicts, null, 2)}

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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return [];
    }
  }

  async suggestEvents(context) {
    if (!this.isInitialized) {
      return [];
    }

    const prompt = `
Based on the following context, suggest 3-5 relevant calendar events:

Context: "${context}"
Current date: ${new Date().toISOString()}

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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error suggesting events:', error);
      return [];
    }
  }

  async chatResponse(message, events = []) {
    if (!this.isInitialized) {
      throw new Error('AI service not available');
    }

    const eventsContext = events.length > 0 ? 
      `Current events: ${JSON.stringify(events.slice(0, 10))}` : 
      'No current events';

    const prompt = `
You are a helpful calendar assistant. The user said: "${message}"

${eventsContext}

Current date: ${new Date().toISOString()}

Respond naturally and helpfully. You can:
- Help create, modify, or delete events
- Provide scheduling suggestions
- Answer questions about their calendar
- Give productivity tips

Keep responses concise and actionable.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();