import { useState } from 'react';
import { Volume2, Mic, Zap, Settings as SettingsIcon } from 'lucide-react';
import { voiceAIService } from '../../services/voiceAIService';
import JarvisParticles from './JarvisParticles';
import './JarvisParticles.css';

/**
 * Voice Settings Component
 * 
 * Provides toggleable voice input/output settings with HAL personality
 */
const VoiceSettings = () => {
    const [voiceEnabled, setVoiceEnabled] = useState(voiceAIService.isEnabled);
    const [speakEnabled, setSpeakEnabled] = useState(true);
    const [voiceSpeed, setVoiceSpeed] = useState(voiceAIService.voiceSpeed);
    const [voicePitch, setVoicePitch] = useState(voiceAIService.voicePitch);
    const [isTesting, setIsTesting] = useState(false);

    const handleVoiceToggle = (enabled) => {
        setVoiceEnabled(enabled);
        voiceAIService.setEnabled(enabled);
    };

    const handleSpeedChange = (speed) => {
        setVoiceSpeed(speed);
        voiceAIService.setVoiceSpeed(speed);
    };

    const handlePitchChange = (pitch) => {
        setVoicePitch(pitch);
        voiceAIService.setVoicePitch(pitch);
    };

    const testHalVoice = async () => {
        setIsTesting(true);
        try {
            await voiceAIService.speakAsHal('greeting');
        } catch (error) {
            console.error('Voice test failed:', error);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="voice-settings-panel">
            <div className="voice-setting-row">
                <div className="voice-setting-label">
                    <h4>Voice Input</h4>
                    <p>Speak to Cal using your microphone</p>
                </div>
                <label className="voice-toggle">
                    <input
                        type="checkbox"
                        checked={voiceEnabled}
                        onChange={(e) => handleVoiceToggle(e.target.checked)}
                    />
                    <span className="voice-toggle-slider" />
                </label>
            </div>

            <div className="voice-setting-row">
                <div className="voice-setting-label">
                    <h4>Cal Speaks</h4>
                    <p>Cal responds with HAL-like voice</p>
                </div>
                <label className="voice-toggle">
                    <input
                        type="checkbox"
                        checked={speakEnabled}
                        onChange={(e) => setSpeakEnabled(e.target.checked)}
                    />
                    <span className="voice-toggle-slider" />
                </label>
            </div>

            <div className="voice-setting-row">
                <div className="voice-setting-label">
                    <h4>Voice Speed</h4>
                    <p>Slow (HAL) to Fast</p>
                </div>
                <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    className="voice-slider"
                />
            </div>

            <div className="voice-setting-row">
                <div className="voice-setting-label">
                    <h4>Voice Pitch</h4>
                    <p>Deep (HAL) to High</p>
                </div>
                <input
                    type="range"
                    min="0.3"
                    max="1.2"
                    step="0.1"
                    value={voicePitch}
                    onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                    className="voice-slider"
                />
            </div>

            <button
                onClick={testHalVoice}
                disabled={isTesting}
                className="hal-test-btn"
            >
                {isTesting ? 'Speaking...' : '"Hello, Dave. I\'m ready to help you manage your calendar."'}
            </button>

            {voiceAIService.isSupported ? (
                <p style={{ fontSize: '12px', color: '#10b981', textAlign: 'center', marginTop: '12px' }}>
                    ✓ Voice features supported in this browser
                </p>
            ) : (
                <p style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center', marginTop: '12px' }}>
                    ✗ Voice features not fully supported
                </p>
            )}
        </div>
    );
};

export { VoiceSettings, JarvisParticles };
export default VoiceSettings;
