/**
 * Location Lookup Service
 * Uses Gemini AI to resolve partial/vague location mentions into full addresses
 * and generates Google Maps links for events.
 */
import { geminiService } from './geminiService.js';
import { logger } from '../utils/logger.js';

class LocationService {
    /**
     * Resolve a partial location mention to a full address using AI
     * @param {string} locationText - User's location input (e.g., "doctor in orland")
     * @param {string} context - Additional context (event title, description)
     * @returns {Promise<{address: string, mapsUrl: string, confidence: string}>}
     */
    async resolveLocation(locationText, context = '') {
        if (!locationText || locationText.trim().length < 3) {
            return null;
        }

        // Check if it's already a full address (contains street number or zip)
        if (this._isFullAddress(locationText)) {
            return {
                address: locationText,
                mapsUrl: this._generateMapsUrl(locationText),
                confidence: 'high'
            };
        }

        // Use Gemini to resolve partial location
        if (geminiService.isInitialized) {
            try {
                return await this._resolveWithGemini(locationText, context);
            } catch (error) {
                logger.warn('Gemini location lookup failed', { error });
            }
        }

        // Fallback: return as-is with maps search URL
        return {
            address: locationText,
            mapsUrl: this._generateMapsUrl(locationText),
            confidence: 'low'
        };
    }

    /**
     * Use Gemini AI to look up and resolve a location
     */
    async _resolveWithGemini(locationText, context) {
        const model = geminiService.modelFlash || geminiService.modelPro;
        if (!model) {
            throw new Error('No Gemini model available');
        }

        const prompt = `
You are a location lookup assistant. Given a partial or vague location mention, determine the most likely full address.

User's location input: "${locationText}"
${context ? `Event context: "${context}"` : ''}

Instructions:
1. If this appears to be a business name or place type with a city (e.g., "doctor in orland", "starbucks near downtown chicago"), identify the most likely specific location.
2. If it's a well-known place or landmark, provide the full address.
3. If it's already a full address, return it as-is.
4. If the location is too vague to resolve, return what you have with low confidence.

IMPORTANT: Only return real, verified addresses for well-known businesses or landmarks. Do not make up specific addresses for generic searches like "doctor in orland" - instead return the search term with the city/area for Google Maps to handle.

Return ONLY a JSON object:
{
  "address": "Full address or best interpretation",
  "searchQuery": "Optimized search query for Google Maps",
  "confidence": "high" | "medium" | "low",
  "note": "Optional clarification"
}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                address: locationText,
                mapsUrl: this._generateMapsUrl(locationText),
                confidence: 'low'
            };
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const searchQuery = parsed.searchQuery || parsed.address || locationText;

        return {
            address: parsed.address || locationText,
            mapsUrl: this._generateMapsUrl(searchQuery),
            confidence: parsed.confidence || 'medium',
            note: parsed.note
        };
    }

    /**
     * Check if the text appears to be a full address
     */
    _isFullAddress(text) {
        // Contains street number pattern or zip code
        const streetPattern = /^\d+\s+\w+/;
        const zipPattern = /\d{5}(-\d{4})?/;
        return streetPattern.test(text) || zipPattern.test(text);
    }

    /**
     * Generate a Google Maps search URL
     */
    _generateMapsUrl(address) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }

    /**
     * Extract the Google Maps link from an event's location
     */
    getMapLink(location) {
        if (!location) return null;
        return this._generateMapsUrl(location);
    }
}

export const locationService = new LocationService();
