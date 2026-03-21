/**
 * Voice AI Service - HAL 9000 "Dave" Personality
 * 
 * Features:
 * - Speech-to-text input (Web Speech API)
 * - Text-to-speech output with HAL personality
 * - Voice settings and preferences
 * - Wake word detection ("Hey Cal")
 */

class VoiceAIService {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.recognition = null;
        this.wakeWordRecognition = null;
        this.isListening = false;
        this.isWakeWordListening = false;
        this.isEnabled = this.loadPreference('voice-enabled', false);
        this.isWakeWordEnabled = this.loadPreference('wake-word-enabled', false);
        this.personality = 'professional';
        this.voiceSpeed = 0.85;
        this.voicePitch = 0.7;
        
        this.initRecognition();
        this.initWakeWord();
    }

    loadPreference(key, defaultValue) {
        try {
            const stored = localStorage.getItem(`calai-${key}`);
            return stored !== null ? JSON.parse(stored) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    savePreference(key, value) {
        localStorage.setItem(`calai-${key}`, JSON.stringify(value));
    }

    initRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            window.dispatchEvent(new CustomEvent('calai-voice-start'));
        };

        this.recognition.onend = () => {
            this.isListening = false;
            window.dispatchEvent(new CustomEvent('calai-voice-end'));
            if (this.isWakeWordEnabled) {
                setTimeout(() => this.startWakeWord(), 500);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            window.dispatchEvent(new CustomEvent('calai-voice-error', { detail: event.error }));
        };

        this.recognition.onresult = (event) => {
            const results = Array.from(event.results);
            const transcript = results
                .map(result => result[0].transcript)
                .join('');

            const isFinal = results.some(result => result.isFinal);

            window.dispatchEvent(new CustomEvent('calai-voice-result', {
                detail: { transcript, isFinal }
            }));
        };
    }

    initWakeWord() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.wakeWordRecognition = new SpeechRecognition();
        this.wakeWordRecognition.continuous = true;
        this.wakeWordRecognition.interimResults = true;
        this.wakeWordRecognition.lang = 'en-US';

        this.wakeWordRecognition.onresult = (event) => {
            const results = Array.from(event.results);
            const transcript = results[results.length - 1][0].transcript.toLowerCase();

            if (transcript.includes('hey cal') || transcript.includes('okay cal')) {
                window.dispatchEvent(new CustomEvent('calai-wake-word-detected'));
                this.wakeWordRecognition.stop(); // Stop wake word to start main listening
                this.startListening();
            }
        };

        this.wakeWordRecognition.onend = () => {
            if (this.isWakeWordEnabled && !this.isListening) {
                try { this.wakeWordRecognition.start(); } catch { /* ignore */ }
            }
        };
    }

    startListening() {
        if (!this.recognition || this.isListening) return false;
        if (this.wakeWordRecognition) {
            try { this.wakeWordRecognition.stop(); } catch { /* ignore */ }
        }

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start recognition:', error);
            return false;
        }
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return;
        this.recognition.stop();
    }

    startWakeWord() {
        if (!this.wakeWordRecognition || this.isWakeWordListening || this.isListening) return;
        this.isWakeWordEnabled = true;
        this.savePreference('wake-word-enabled', true);
        try {
            this.wakeWordRecognition.start();
            this.isWakeWordListening = true;
        } catch { /* ignore */ }
    }

    stopWakeWord() {
        this.isWakeWordEnabled = false;
        this.savePreference('wake-word-enabled', false);
        try {
            this.wakeWordRecognition.stop();
            this.isWakeWordListening = false;
        } catch { /* ignore */ }
    }

    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            this.synthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = options.rate ?? this.voiceSpeed;
            utterance.pitch = options.pitch ?? this.voicePitch;
            utterance.volume = options.volume ?? 1.0;

            const voices = this.synthesis.getVoices();
            const preferredVoices = ['Google UK English Male', 'Alex', 'Daniel', 'Microsoft David'];
            const selectedVoice = voices.find(v => preferredVoices.some(pv => v.name.includes(pv))) || voices[0];

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.onstart = () => {
                window.dispatchEvent(new CustomEvent('calai-speech-start', { detail: { text } }));
            };

            utterance.onboundary = (event) => {
                window.dispatchEvent(new CustomEvent('calai-speech-word', {
                    detail: {
                        word: text.substring(event.charIndex, event.charIndex + event.charLength),
                        charIndex: event.charIndex,
                        charLength: event.charLength
                    }
                }));
            };

            utterance.onend = () => {
                window.dispatchEvent(new CustomEvent('calai-speech-end'));
                resolve();
            };

            utterance.onerror = (event) => {
                window.dispatchEvent(new CustomEvent('calai-speech-error', { detail: event.error }));
                reject(event.error);
            };

            this.synthesis.speak(utterance);
        });
    }

    setPersonality(personality) {
        this.personality = personality;
        
        // Dynamic voice parameters based on personality
        switch(personality) {
            case 'your-bff':
                this.voiceSpeed = 1.05;
                this.voicePitch = 1.2;
                break;
            case 'creative':
                this.voiceSpeed = 0.95;
                this.voicePitch = 1.1;
                break;
            case 'spicy':
                this.voiceSpeed = 1.0;
                this.voicePitch = 0.85;
                break;
            case 'professional':
            default:
                this.voiceSpeed = 0.85;
                this.voicePitch = 0.7;
                break;
        }
    }

    speakAsCal(scenario, customText = null) {
        if (customText) return this.speak(customText);

        const responses = {
            greeting: "Hey! I'm Cal. Ready to make some magic happen?",
            error: "Something went wrong in my digital brain. My bad!",
            confirm: "Done! It's on the calendar.",
            conflict: "Wait, you've got something else then. Want me to find another spot?",
            complete: "All set!",
            thinking: "Let me think...",
            cantUnderstand: "I didn't quite catch that. Say again?",
            goodbye: "Catch you later!"
        };

        let text = responses[scenario] || responses.greeting;
        
        // Personality injections
        if (this.personality === 'your-bff' && (scenario === 'confirm' || scenario === 'complete')) {
            text = "Yesss! All added. I'm so excited for this! ✨";
        } else if (this.personality === 'spicy' && scenario === 'greeting') {
            text = "Hey there. Ready for some hot scheduling? 😏";
        }

        return this.speak(text);
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.savePreference('voice-enabled', enabled);
    }

    setVoiceSpeed(speed) {
        this.voiceSpeed = speed;
        this.savePreference('voice-speed', speed);
    }

    setVoicePitch(pitch) {
        this.voicePitch = pitch;
        this.savePreference('voice-pitch', pitch);
    }

    get isSupported() {
        return !!this.synthesis && !!this.recognition;
    }
}

export const voiceAIService = new VoiceAIService();
