/**
 * Service to interact with a local Ollama instance.
 * Defaults to http://localhost:11434
 */

export const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
export const OLLAMA_DEFAULT_MODEL = 'llama3';

export const checkOllamaConnection = async (baseUrl = OLLAMA_DEFAULT_URL) => {
    try {
        const response = await fetch(`${baseUrl}/api/tags`);
        return response.ok;
    } catch (error) {
        console.error("Ollama connection failed:", error);
        return false;
    }
};

export const generateOllamaCompletion = async (prompt, options = {}) => {
    const baseUrl = options.baseUrl || OLLAMA_DEFAULT_URL;
    const model = options.model || OLLAMA_DEFAULT_MODEL;

    try {
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    ...options.modelOptions
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("Ollama generation error:", error);
        throw error;
    }
};

export const chatOllama = async (messages, options = {}) => {
    const baseUrl = options.baseUrl || OLLAMA_DEFAULT_URL;
    const model = options.model || OLLAMA_DEFAULT_MODEL;

    try {
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false,
                options: {
                    temperature: 0.7,
                    ...options.modelOptions
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.message.content;
    } catch (error) {
        console.error("Ollama chat error:", error);
        throw error;
    }
};
