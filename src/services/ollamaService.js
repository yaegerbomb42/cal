/**
 * Service to interact with a local Ollama instance.
 * In dev mode, requests are proxied through Vite to avoid CORS issues.
 * Defaults to http://localhost:11434
 */

export const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
export const OLLAMA_DEFAULT_MODEL = 'llama3';

/**
 * Resolves the effective Ollama base URL.
 * If the user configured the default localhost URL and we're in dev mode,
 * route through the Vite proxy to dodge browser CORS restrictions.
 */
const resolveOllamaUrl = (baseUrl) => {
    const isDefault = !baseUrl || baseUrl === OLLAMA_DEFAULT_URL || baseUrl === 'http://127.0.0.1:11434';
    const isDev = import.meta.env?.DEV;
    if (isDefault && isDev) {
        return '/ollama-proxy';
    }
    return baseUrl || OLLAMA_DEFAULT_URL;
};

export const checkOllamaConnection = async (baseUrl = OLLAMA_DEFAULT_URL) => {
    try {
        const url = resolveOllamaUrl(baseUrl);
        const response = await fetch(`${url}/api/tags`);
        return response.ok;
    } catch (error) {
        console.error("Ollama connection failed:", error);
        return false;
    }
};

export const generateOllamaCompletion = async (prompt, options = {}) => {
    const url = resolveOllamaUrl(options.baseUrl);
    const model = options.model || OLLAMA_DEFAULT_MODEL;

    try {
        const response = await fetch(`${url}/api/generate`, {
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
    const url = resolveOllamaUrl(options.baseUrl);
    const model = options.model || OLLAMA_DEFAULT_MODEL;

    try {
        const response = await fetch(`${url}/api/chat`, {
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
