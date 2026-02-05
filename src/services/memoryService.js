import { logger } from '../utils/logger';

const MEMORY_STORAGE_KEY = 'calai-user-memory';

class MemoryService {
    constructor() {
        this.memory = this.loadMemory();
    }

    loadMemory() {
        try {
            const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {
                facts: [],       // General user facts like "I like Starbucks"
                preferences: {}, // UI/UX preferences
                lessons: [],     // AI-learned patterns like "Meetings usually last 45m"
                locations: {}    // Named locations mapping: "gym" -> "Gold's Gym, NYC"
            };
        } catch (e) {
            logger.error('Failed to load memory', e);
            return { facts: [], preferences: {}, lessons: [], locations: {} };
        }
    }

    saveMemory() {
        try {
            localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memory));
        } catch (e) {
            logger.error('Failed to save memory', e);
        }
    }

    addFact(fact) {
        if (!this.memory.facts.includes(fact)) {
            this.memory.facts.push(fact);
            this.saveMemory();
        }
    }

    setNamedLocation(name, address) {
        this.memory.locations[name.toLowerCase()] = address;
        this.saveMemory();
    }

    getNamedLocation(name) {
        return this.memory.locations[name.toLowerCase()];
    }

    getMemoryContext() {
        let context = "USER KNOWLEDGE:\n";
        if (this.memory.facts.length > 0) {
            context += `- Facts: ${this.memory.facts.join(', ')}\n`;
        }
        const locations = Object.entries(this.memory.locations);
        if (locations.length > 0) {
            context += "- Known Locations:\n";
            locations.forEach(([name, addr]) => {
                context += `  * ${name}: ${addr}\n`;
            });
        }
        return context;
    }

    // Clear memory for privacy/restart
    clearMemory() {
        this.memory = { facts: [], preferences: {}, lessons: [], locations: {} };
        this.saveMemory();
    }
}

export const memoryService = new MemoryService();
