import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { voiceAIService } from '../../services/voiceAIService';
import './JarvisParticles.css';

/**
 * Jarvis-like Particle Visualization Component
 * 
 * Features:
 * - Live word-computed particle animation
 * - Responds to Cal's speech in real-time
 * - Microphone input visualization
 */
const JarvisParticles = ({ isActive, isSpeaking, onTranscript, className }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const particlesRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const [isListening, setIsListening] = useState(false);
    const [currentWord, setCurrentWord] = useState('');
    const [amplitude, setAmplitude] = useState(0);

    // Particle configuration
    const config = {
        particleCount: 120,
        baseRadius: 80,
        maxRadius: 150,
        baseColor: { r: 99, g: 102, b: 241 }, // Indigo
        activeColor: { r: 59, g: 130, b: 246 }, // Blue
        speakingColor: { r: 245, g: 158, b: 11 }, // Amber/Gold
    };

    // Initialize particles
    const initParticles = useCallback((canvas) => {
        const particles = [];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < config.particleCount; i++) {
            const angle = (i / config.particleCount) * Math.PI * 2;
            const radius = config.baseRadius + Math.random() * 20;

            particles.push({
                angle,
                baseRadius: radius,
                currentRadius: radius,
                targetRadius: radius,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                size: 2 + Math.random() * 2,
                speed: 0.5 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                opacity: 0.3 + Math.random() * 0.7,
            });
        }

        particlesRef.current = particles;
    }, [config.particleCount, config.baseRadius]);

    // Animation loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const time = Date.now() / 1000;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw glow effect
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, config.maxRadius
        );

        const color = isSpeaking ? config.speakingColor :
            isActive ? config.activeColor : config.baseColor;

        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.05)`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, config.maxRadius, 0, Math.PI * 2);
        ctx.fill();

        // Update and draw particles
        particlesRef.current.forEach((particle, i) => {
            // Compute target radius based on audio amplitude
            const wordInfluence = currentWord.length * 2;
            const audioInfluence = amplitude * 50;
            const breathEffect = Math.sin(time * particle.speed + particle.phase) * 10;

            particle.targetRadius = particle.baseRadius + breathEffect +
                (isActive ? 15 : 0) +
                (isSpeaking ? audioInfluence + wordInfluence : 0);

            // Smooth interpolation
            particle.currentRadius += (particle.targetRadius - particle.currentRadius) * 0.1;

            // Update position
            const orbitSpeed = isSpeaking ? 0.3 : 0.1;
            particle.angle += orbitSpeed * 0.01 * particle.speed;

            particle.x = centerX + Math.cos(particle.angle) * particle.currentRadius;
            particle.y = centerY + Math.sin(particle.angle) * particle.currentRadius;

            // Draw particle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity})`;
            ctx.fill();

            // Draw connections to nearby particles
            if (i % 3 === 0) {
                const nextParticle = particlesRef.current[(i + 3) % particlesRef.current.length];
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(nextParticle.x, nextParticle.y);
                ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        });

        // Draw center orb
        const orbRadius = 20 + (isSpeaking ? amplitude * 10 : 0);
        const orbGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, orbRadius
        );
        orbGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`);
        orbGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`);
        orbGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
        ctx.fill();

        animationRef.current = requestAnimationFrame(animate);
    }, [isActive, isSpeaking, currentWord, amplitude, config]);

    // Handle voice events
    useEffect(() => {
        const handleSpeechStart = () => setAmplitude(0.5);
        const handleSpeechWord = (e) => setCurrentWord(e.detail.word || '');
        const handleSpeechEnd = () => {
            setAmplitude(0);
            setCurrentWord('');
        };
        const handleVoiceStart = () => setIsListening(true);
        const handleVoiceEnd = () => setIsListening(false);
        const handleVoiceResult = (e) => {
            if (e.detail.isFinal && onTranscript) {
                onTranscript(e.detail.transcript);
            }
        };

        window.addEventListener('calai-speech-start', handleSpeechStart);
        window.addEventListener('calai-speech-word', handleSpeechWord);
        window.addEventListener('calai-speech-end', handleSpeechEnd);
        window.addEventListener('calai-voice-start', handleVoiceStart);
        window.addEventListener('calai-voice-end', handleVoiceEnd);
        window.addEventListener('calai-voice-result', handleVoiceResult);

        return () => {
            window.removeEventListener('calai-speech-start', handleSpeechStart);
            window.removeEventListener('calai-speech-word', handleSpeechWord);
            window.removeEventListener('calai-speech-end', handleSpeechEnd);
            window.removeEventListener('calai-voice-start', handleVoiceStart);
            window.removeEventListener('calai-voice-end', handleVoiceEnd);
            window.removeEventListener('calai-voice-result', handleVoiceResult);
        };
    }, [onTranscript]);

    // Canvas setup and animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const size = Math.min(300, window.innerWidth * 0.8);
            canvas.width = size;
            canvas.height = size;
            initParticles(canvas);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animate, initParticles]);

    const toggleMic = () => {
        if (isListening) {
            voiceAIService.stopListening();
        } else {
            voiceAIService.startListening();
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`jarvis-container ${className || ''}`}
            >
                <canvas ref={canvasRef} className="jarvis-canvas" />

                <div className="jarvis-controls">
                    <button
                        onClick={toggleMic}
                        className={`jarvis-mic-btn ${isListening ? 'listening' : ''}`}
                        title={isListening ? 'Stop listening' : 'Start listening'}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                </div>

                {currentWord && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="jarvis-word-display"
                    >
                        {currentWord}
                    </motion.div>
                )}

                {isListening && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="jarvis-listening-indicator"
                    >
                        Listening...
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default JarvisParticles;
