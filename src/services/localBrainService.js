import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { logger } from '../utils/logger';

// Qwen2.5-3B-Instruct offers stronger reasoning while staying feasible for in-browser use.
const SELECTED_MODEL = "Qwen2.5-3B-Instruct-q4f16_1-MLC";
const LOCAL_BRAIN_PREF_KEY = "calai-prefer-local-brain";

const getTemporalContext = () => {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localTime = now.toLocaleString("en-US", {
        timeZone,
        dateStyle: "full",
        timeStyle: "long"
    });
    return {
        now,
        timeZone,
        localTime,
        iso: now.toISOString()
    };
};

const getGroundingPrompt = () => {
    const { timeZone, localTime, iso } = getTemporalContext();
    return `
You are Cal, a friendly calendar assistant.
Grounding:
- Current local date/time: ${localTime}
- Current ISO time: ${iso}
- User timezone: ${timeZone}
Use this grounding to interpret relative dates like "tomorrow" or "next Friday".
If a request is ambiguous, ask a concise follow-up question.`;
};

const readStoredPreference = () => {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem(LOCAL_BRAIN_PREF_KEY) === "true";
    } catch (error) {
        logger.warn('Local Brain: Unable to read preference', { error });
        return false;
    }
};

export const localBrainService = {
    engine: null,
    isLoaded: false,
    preferLocal: readStoredPreference(),
    loadProgressCallback: null,

    /**
     * Initialize the WebLLM engine.
     * @param {function} progressCallback - (progress) => void
     */
    async initialize(progressCallback) {
        if (this.isLoaded) return;

        // Respect user preference - do not load if not enabled
        if (!this.preferLocal) {
            logger.info('Local Brain: Skipped initialization (user preference is OFF)');
            return;
        }

        // 1. Try Chrome Built-in AI (window.ai) - Zero Download
        // Note: As of early 2025, usage is `await window.ai.languageModel.create()`
        if (window.ai && window.ai.languageModel) {
            try {
                const capabilities = await window.ai.languageModel.capabilities();
                if (capabilities.available !== 'no') {
                    this.engine = await window.ai.languageModel.create();
                    this.type = 'window.ai';
                    this.isLoaded = true;
                    logger.info('Local Brain: Using Chrome Built-in AI (Gemini Nano)');
                    return;
                }
            } catch (e) {
                logger.warn('Chrome AI failed, falling back to WebLLM', { error: e });
            }
        }

        // 2. Fallback to WebLLM (Downloadable Weights)
        // Check for WebGPU support
        if (!navigator.gpu) {
            throw new Error("WebGPU is not supported in this browser.");
        }

        this.loadProgressCallback = progressCallback;

        try {
            this.engine = await CreateMLCEngine(
                SELECTED_MODEL,
                {
                    initProgressCallback: (report) => {
                        if (this.loadProgressCallback) {
                            this.loadProgressCallback(report); // report: { progress: number, text: string }
                        }
                    }
                }
            );
            this.type = 'webllm';
            this.isLoaded = true;
            logger.info('Local Brain: Using WebLLM (Qwen 2.5 3B)');
        } catch (error) {
            logger.error('Failed to initialize Local Brain', { error });
            throw error;
        }
    },

    /**
     * Reset local brain engine
     */
    async unload() {
        if (this.engine) {
            await this.engine.unload();
            this.engine = null;
            this.isLoaded = false;
        }
    },

    setPreferLocal(preferLocal) {
        this.preferLocal = Boolean(preferLocal);
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(LOCAL_BRAIN_PREF_KEY, String(this.preferLocal));
        } catch (error) {
            logger.warn('Local Brain: Unable to save preference', { error });
        }
    },

    getPreferLocal() {
        return this.preferLocal;
    },

    /**
     * Chat with the local model.
     * @param {string} userMessage 
     * @param {Array} history - Optional previous messages
     */
    async chat(userMessage, systemInstruction = getGroundingPrompt()) {
        if (!this.isLoaded) throw new Error("Local Brain not loaded. Call initialize() first.");

        try {
            // Case 1: Chrome Built-in AI
            if (this.type === 'window.ai') {
                // window.ai doesn't always support system prompt in v1, usually just prompt
                // We prepend system instruction
                return await this.engine.prompt(`${systemInstruction}\n\nUser: ${userMessage}`);
            }

            // Case 2: WebLLM
            const personality = this.getPersonalitySystemPrompt();
            const fullSystem = `${systemInstruction}\n\n${personality}`;

            const messages = [
                { role: "system", content: fullSystem },
                { role: "user", content: userMessage }
            ];

            const reply = await this.engine.chat.completions.create({
                messages,
                temperature: 0.1, // Low temp for deterministic parsing tasks
                max_tokens: 500,
            });

            return reply.choices[0].message.content;
        } catch (error) {
            logger.error('Local Brain chat error', { error });
            throw error;
        }
    },

    /**
     * Parse natural language text into a JSON event using the local model.
     * This mimics the structure of geminiService.parseEventFromText
     */
    /**
     * Parse natural language text into a JSON event using the local model.
     * Uses Chain-of-Thought (CoT) and Regex Hints for better accuracy.
     */
    async parseEvent(text, hints = {}) {
        const { timeZone, localTime, iso } = getTemporalContext();

        // Construct detailed hints string
        let hintsContext = "";
        if (hints.start || hints.end || hints.title || hints.location) {
            hintsContext = `
HARDCODED HINTS (Trust these if the text is ambiguous):
- Detected Date/Time: ${hints.start ? new Date(hints.start).toLocaleString() : 'N/A'}
- Detected Title Keyword: "${hints.title || 'N/A'}"
- Detected Location: "${hints.location || 'N/A'}"
`;
        }

        const systemPrompt = `
${getGroundingPrompt()}

You are an intelligent event parser.
Current local date/time: ${localTime}
(ISO: ${iso})
User timezone: ${timeZone}

${hintsContext}

INSTRUCTIONS:
1. THINK FIRST: Analyze the user's input step-by-step.
   - Identify the Event Title (look for capitalized names like "PAWS" or "Lunch").
   - Identify Date & Time (convert "tomorrow", "next monday" to actual dates).
   - Identify Location and Category.
2. OUTPUT: Return a JSON object.

USER INPUT: "${text}"

RESPONSE FORMAT:
Think: [Your step-by-step reasoning here]
JSON: { "title": "...", "start": "ISO_STRING", "end": "ISO_STRING", "location": "...", "category": "..." }
`;

        // 1. Generate CoT Reaponse
        const response = await this.chat(text, systemPrompt);

        const parseJsonResponse = (candidate) => {
            // Try to find JSON block after "JSON:" or just the first JSON object
            const jsonMatch = candidate.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(candidate);
        };

        try {
            return parseJsonResponse(response);
        } catch {
            // Retry with stricter constraint if CoT format failed
            console.warn("Local Brain: parsed JSON failed, retrying with strict JSON prompt");
            try {
                const repairPrompt = `
STOP thinking. RETURN ONLY THE JSON OBJECT.
{ "title": "...", "start": "...", "end": "..." }`;
                const repaired = await this.chat(text, `${systemPrompt}\n\n${repairPrompt}`);
                return parseJsonResponse(repaired);
            } catch {
                logger.error('Failed to parse local brain response as JSON', { response });
                throw new Error("Local model failed to generate valid JSON");
            }
        }
    }
};
