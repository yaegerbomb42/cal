import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Qwen2.5-0.5B-Instruct is a very small (~350MB) model good for basic instruction following
const SELECTED_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

export const localBrainService = {
    engine: null,
    isLoaded: false,
    loadProgressCallback: null,

    /**
     * Initialize the WebLLM engine.
     * @param {function} progressCallback - (progress) => void
     */
    async initialize(progressCallback) {
        if (this.isLoaded) return;

        // 1. Try Chrome Built-in AI (window.ai) - Zero Download
        // Note: As of early 2025, usage is `await window.ai.languageModel.create()`
        if (window.ai && window.ai.languageModel) {
            try {
                const capabilities = await window.ai.languageModel.capabilities();
                if (capabilities.available !== 'no') {
                    this.engine = await window.ai.languageModel.create();
                    this.type = 'window.ai';
                    this.isLoaded = true;
                    console.log("Local Brain: Using Chrome Built-in AI (Gemini Nano)");
                    return;
                }
            } catch (e) {
                console.warn("Chrome AI failed, falling back to WebLLM", e);
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
            console.log("Local Brain: Using WebLLM (Qwen 0.5B)");
        } catch (error) {
            console.error("Failed to initialize Local Brain:", error);
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

    /**
     * Chat with the local model.
     * @param {string} userMessage 
     * @param {Array} history - Optional previous messages
     */
    async chat(userMessage, systemInstruction = "You are a helpful assistant.") {
        if (!this.isLoaded) throw new Error("Local Brain not loaded. Call initialize() first.");

        try {
            // Case 1: Chrome Built-in AI
            if (this.type === 'window.ai') {
                // window.ai doesn't always support system prompt in v1, usually just prompt
                // We prepend system instruction
                return await this.engine.prompt(`${systemInstruction}\n\nUser: ${userMessage}`);
            }

            // Case 2: WebLLM
            const messages = [
                { role: "system", content: systemInstruction },
                { role: "user", content: userMessage }
            ];

            const reply = await this.engine.chat.completions.create({
                messages,
                temperature: 0.1, // Low temp for deterministic parsing tasks
                max_tokens: 500,
            });

            return reply.choices[0].message.content;
        } catch (error) {
            console.error("Local Brain chat error:", error);
            throw error;
        }
    },

    /**
     * Parse natural language text into a JSON event using the local model.
     * This mimics the structure of geminiService.parseEventFromText
     */
    async parseEvent(text) {
        const systemPrompt = `
      You are an event parser. User input will be a natural language description of a calendar event.
      Extract: title, start (ISO string), end (ISO string), description, location.
      Current Date: ${new Date().toISOString()}
      Return ONLY valid JSON.
      Example:
      User: "Lunch with Bob tomorrow at 12pm"
      JSON: { "title": "Lunch with Bob", "start": "...", "end": "..." }
    `;

        const response = await this.chat(text, systemPrompt);

        // Attempt to extract JSON from response
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(response);
        } catch {
            console.error("Failed to parse local brain response as JSON", response);
            throw new Error("Local model failed to generate valid JSON");
        }
    }
};
