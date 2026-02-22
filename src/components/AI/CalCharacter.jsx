import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ProceduralAnimationController, ContinuousParticleSystem } from '../../utils/ProceduralAnimationController';
import './CalCharacter.css';

/**
 * Cal Character - Procedural Animation System
 * Features:
 * - Infinite idle animations with weighted gesture combinations
 * - Continuous particle flow (never resets)
 * - Talking mouth sync for chat responses
 * - Eyes and mouth properly positioned in head
 * - Natural, lifelike movements
 */
const CalCharacter = ({
    isTalking = false,
    emotion = 'idle',
    size = 'normal'
}) => {
    // Animation state
    const [animState, setAnimState] = useState({
        headAngle: 0,
        bodyAngle: 0,
        leftEyeState: 'open',
        rightEyeState: 'open',
        leftEyeOffset: 0,
        rightEyeOffset: 0,
        mouthState: 'smile',
        leftArmAngle: 0,
        rightArmAngle: 0,
        bodyScale: 1
    });

    // Particle positions
    const [particles, setParticles] = useState([]);

    // Controllers
    const animController = useRef(null);
    const particleSystem = useRef(null);
    const particleAnimFrame = useRef(null);

    const isMini = size === 'mini';

    // Initialize controllers
    useEffect(() => {
        animController.current = new ProceduralAnimationController();
        particleSystem.current = new ContinuousParticleSystem(8);

        // Start procedural animation
        animController.current.start((state) => {
            setAnimState(state);
        });

        // Continuous particle update
        const updateParticles = () => {
            if (particleSystem.current) {
                setParticles(particleSystem.current.getPositions(60, 80));
            }
            particleAnimFrame.current = requestAnimationFrame(updateParticles);
        };
        updateParticles();

        return () => {
            if (animController.current) animController.current.stop();
            if (particleAnimFrame.current) cancelAnimationFrame(particleAnimFrame.current);
        };
    }, []);

    // Handle talking state changes
    useEffect(() => {
        if (!animController.current) return;

        if (isTalking) {
            animController.current.startTalking();
        } else {
            animController.current.stopTalking();
        }
    }, [isTalking]);

    // Handle emotion changes
    useEffect(() => {
        if (!animController.current) return;
        animController.current.setEmotion(emotion);
    }, [emotion]);

    // Eye rendering - fixed positioning inside head
    const renderEye = useCallback((state, offset, baseX, baseY) => {
        // Eye positions relative to head center
        const x = baseX + offset;
        let d = "";

        if (state === 'closed') {
            d = `M${x},${baseY} Q${x + 9},${baseY} ${x + 18},${baseY}`;
        } else if (state === 'squint') {
            d = `M${x},${baseY} Q${x + 9},${baseY - 2} ${x + 18},${baseY}`;
        } else {
            // Default open or wide eyes
            const curve = state === 'wide' ? -10 : -6;
            d = `M${x},${baseY} Q${x + 9},${baseY + curve} ${x + 18},${baseY}`;
        }

        return (
            <motion.path
                initial={{ d }}
                animate={{ d }}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#eyeGlow)"
                transition={{ duration: 0.15 }}
            />
        );
    }, []);

    // Mouth rendering - with talking frames
    const renderMouth = useCallback((state) => {
        let d = "";
        let fill = "none";
        let strokeWidth = 2.5;
        let opacity = 1;

        switch (state) {
            case 'talk_open':
                d = `M 42,60 Q 50,68 58,60 Q 50,52 42,60`;
                fill = "#00e5ff";
                strokeWidth = 0;
                opacity = 0.9;
                break;
            case 'talk_mid':
                d = `M 44,60 Q 50,65 56,60 Q 50,55 44,60`;
                fill = "#00e5ff";
                strokeWidth = 0;
                opacity = 0.9;
                break;
            case 'talk_closed':
                d = `M 42,60 Q 50,60 58,60`; // Use Q to match segment count
                strokeWidth = 2;
                break;
            case 'smile_wide':
                d = `M 38,58 Q 50,68 62,58`;
                strokeWidth = 3;
                break;
            case 'neutral':
                d = `M 40,60 Q 50,60 60,60`;
                break;
            case 'surprise':
                d = `M 45,60 Q 50,69 55,60 Q 50,51 45,60`;
                break;
            case 'frown':
                d = `M 40,62 Q 50,55 60,62`;
                break;
            case 'smile':
            default:
                d = `M 40,59 Q 50,65 60,59`;
                break;
        }

        return (
            <motion.path
                initial={{ d, fill, strokeWidth, opacity }}
                animate={{ d, fill, strokeWidth, opacity }}
                stroke="#00e5ff"
                strokeLinecap="round"
                filter="url(#eyeGlow)"
                transition={{ duration: 0.15 }}
            />
        );
    }, []);

    // Calculate dimensions
    const dimensions = isMini
        ? { viewBox: "0 0 100 130", width: 36, height: 47 }
        : { viewBox: "0 0 100 130", width: 140, height: 182 };

    return (
        <div className={`cal-character-procedural ${isMini ? 'cal-mini' : ''}`}>
            <svg
                viewBox={dimensions.viewBox}
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: dimensions.width, height: dimensions.height, overflow: 'visible' }}
            >
                <defs>
                    {/* Glow filters */}
                    <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="bodyGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="3" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Body gradient */}
                    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>

                    {/* Head gradient */}
                    <linearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4338ca" />
                        <stop offset="100%" stopColor="#2e1065" />
                    </linearGradient>
                </defs>

                {/* Continuous particles */}
                {particles.map(p => (
                    <motion.ellipse
                        key={p.id}
                        cx={p.x}
                        cy={p.y}
                        rx={p.size * (isMini ? 0.3 : 0.6)}
                        ry={p.size * (isMini ? 0.5 : 1)}
                        fill={p.color}
                        opacity={p.opacity}
                        style={{ rotate: p.rotation }}
                    />
                ))}

                {/* Body */}
                <motion.ellipse
                    cx={50}
                    cy={95}
                    rx={22}
                    ry={28}
                    fill="url(#bodyGrad)"
                    filter={!isMini ? "url(#bodyGlow)" : undefined}
                    animate={{
                        rotate: animState.bodyAngle,
                        scaleY: animState.bodyScale
                    }}
                    style={{ transformOrigin: '50px 95px' }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                />

                {/* Arms (normal size only) */}
                {!isMini && (
                    <>
                        <motion.rect
                            x={22}
                            y={78}
                            width={7}
                            height={22}
                            rx={3.5}
                            fill="url(#bodyGrad)"
                            animate={{ rotate: animState.leftArmAngle }}
                            style={{ transformOrigin: '25px 78px' }}
                            transition={{ type: 'spring', stiffness: 180, damping: 15 }}
                        />
                        <motion.rect
                            x={71}
                            y={78}
                            width={7}
                            height={22}
                            rx={3.5}
                            fill="url(#bodyGrad)"
                            animate={{ rotate: animState.rightArmAngle }}
                            style={{ transformOrigin: '75px 78px' }}
                            transition={{ type: 'spring', stiffness: 180, damping: 15 }}
                        />
                    </>
                )}

                {/* Head group - contains face elements */}
                <motion.g
                    animate={{ rotate: animState.headAngle }}
                    style={{ transformOrigin: '50px 40px' }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                >
                    {/* Head/Visor */}
                    <rect
                        x={22}
                        y={15}
                        width={56}
                        height={50}
                        rx={16}
                        fill="url(#headGrad)"
                        stroke="#6366f1"
                        strokeWidth="2"
                        filter={!isMini ? "url(#bodyGlow)" : undefined}
                    />

                    {/* Eyes - positioned inside head */}
                    {renderEye(animState.leftEyeState, animState.leftEyeOffset, 28, 38)}
                    {renderEye(animState.rightEyeState, animState.rightEyeOffset, 54, 38)}

                    {/* Mouth - positioned inside head */}
                    {renderMouth(animState.mouthState)}
                </motion.g>
            </svg>
        </div>
    );
};

export default CalCharacter;
