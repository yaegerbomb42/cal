/**
 * Cal Procedural Animation Controller
 * Creates infinite, natural-feeling idle animations with weighted gesture combinations
 * No repetitive patterns - Cal feels alive
 */

// ============================================================================
// ANIMATION PRIMITIVES - Individual body part animations
// ============================================================================

const EyePrimitives = {
    blink: { duration: 150, frames: ['closed', 'open'] },
    blinkSlow: { duration: 300, frames: ['closed', 'open'] },
    lookLeft: { duration: 400, offset: -5 },
    lookRight: { duration: 400, offset: 5 },
    lookUp: { duration: 400, offset: 0, variant: 'wide' },
    squint: { duration: 600, variant: 'squint' },
    widen: { duration: 300, variant: 'wide' }
};

const MouthPrimitives = {
    smile: { duration: 500, state: 'smile' },
    smileWide: { duration: 300, state: 'smile_wide' },
    neutral: { duration: 400, state: 'neutral' },
    talk1: { duration: 80, state: 'talk_open' },
    talk2: { duration: 80, state: 'talk_mid' },
    talk3: { duration: 80, state: 'talk_closed' },
    frown: { duration: 400, state: 'frown' },
    surprise: { duration: 200, state: 'surprise' }
};

const HeadPrimitives = {
    tiltLeft: { duration: 600, angle: -8 },
    tiltRight: { duration: 600, angle: 8 },
    nodDown: { duration: 300, angle: 10 },
    nodUp: { duration: 300, angle: -5 },
    turnLeft: { duration: 500, angle: -12 },
    turnRight: { duration: 500, angle: 12 },
    center: { duration: 400, angle: 0 }
};

const BodyPrimitives = {
    swayLeft: { duration: 800, angle: -3 },
    swayRight: { duration: 800, angle: 3 },
    bounce: { duration: 400, scale: 1.02 },
    lean: { duration: 600, angle: 5 },
    center: { duration: 500, angle: 0 }
};

const ArmPrimitives = {
    restLeft: { duration: 400, angle: 0 },
    restRight: { duration: 400, angle: 0 },
    raiseLeft: { duration: 300, angle: -45 },
    raiseRight: { duration: 300, angle: -45 },
    waveLeft: { duration: 200, angle: -60 },
    waveRight: { duration: 200, angle: -60 },
    pointLeft: { duration: 350, angle: -30 },
    pointRight: { duration: 350, angle: -30 },
    gestureSmallLeft: { duration: 250, angle: -15 },
    gestureSmallRight: { duration: 250, angle: -15 }
};

// ============================================================================
// WEIGHTED GESTURE GROUPS - Natural combinations that feel alive
// ============================================================================

const GestureGroups = {
    idle: {
        weight: 40,
        gestures: [
            { name: 'subtle_look', weight: 25, parts: { eyes: 'lookLeft', head: 'tiltLeft' } },
            { name: 'subtle_look_right', weight: 25, parts: { eyes: 'lookRight', head: 'tiltRight' } },
            { name: 'gentle_sway', weight: 20, parts: { body: 'swayLeft' } },
            { name: 'gentle_sway_right', weight: 20, parts: { body: 'swayRight' } },
            { name: 'blink_pause', weight: 30, parts: { eyes: 'blink' } },
            { name: 'curious_tilt', weight: 15, parts: { head: 'tiltRight', eyes: 'widen' } },
            { name: 'small_nod', weight: 10, parts: { head: 'nodDown' } },
            { name: 'return_center', weight: 20, parts: { head: 'center', body: 'center' } }
        ]
    },
    thinking: {
        weight: 20,
        gestures: [
            { name: 'ponder', weight: 30, parts: { head: 'tiltLeft', eyes: 'lookUp', armRight: 'gestureSmallRight' } },
            { name: 'consider', weight: 25, parts: { head: 'tiltRight', eyes: 'squint' } },
            { name: 'hmm', weight: 20, parts: { mouth: 'neutral', head: 'nodDown' } },
            { name: 'processing', weight: 25, parts: { eyes: 'blinkSlow', body: 'swayLeft' } }
        ]
    },
    talking: {
        weight: 25,
        gestures: [
            { name: 'speak_gesture', weight: 30, parts: { mouth: 'talk1', armRight: 'gestureSmallRight' } },
            { name: 'emphasize', weight: 25, parts: { mouth: 'talk2', head: 'nodDown', armLeft: 'gestureSmallLeft' } },
            { name: 'explain', weight: 25, parts: { mouth: 'talk1', body: 'lean' } },
            { name: 'conclude', weight: 20, parts: { mouth: 'smile', head: 'center' } }
        ]
    },
    excited: {
        weight: 15,
        gestures: [
            { name: 'happy_bounce', weight: 35, parts: { body: 'bounce', mouth: 'smileWide', eyes: 'widen' } },
            { name: 'celebrate', weight: 25, parts: { armLeft: 'raiseLeft', armRight: 'raiseRight', mouth: 'smileWide' } },
            { name: 'eager', weight: 25, parts: { body: 'lean', eyes: 'widen', head: 'nodDown' } },
            { name: 'pleased', weight: 15, parts: { mouth: 'smileWide', head: 'tiltRight' } }
        ]
    }
};

// ============================================================================
// PROCEDURAL ANIMATION CONTROLLER
// ============================================================================

class ProceduralAnimationController {
    constructor() {
        this.currentState = this.getDefaultState();
        this.targetState = { ...this.currentState };
        this.isRunning = false;
        this.isTalking = false;
        this.talkFrameIndex = 0;
        this.lastGesture = null;
        this.gestureHistory = [];
        this.callbacks = [];
        this.transitionSpeed = 0.15; // Lerp factor for smooth transitions
    }

    getDefaultState() {
        return {
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
        };
    }

    // Weighted random selection - avoids repeating recent gestures
    selectWeightedGesture(group) {
        const gestures = GestureGroups[group].gestures;
        const totalWeight = gestures.reduce((sum, g) => {
            // Reduce weight if recently used
            const penalty = this.gestureHistory.includes(g.name) ? 0.3 : 1;
            return sum + (g.weight * penalty);
        }, 0);

        let random = Math.random() * totalWeight;
        for (const gesture of gestures) {
            const penalty = this.gestureHistory.includes(gesture.name) ? 0.3 : 1;
            random -= gesture.weight * penalty;
            if (random <= 0) {
                // Track history (keep last 5)
                this.gestureHistory.push(gesture.name);
                if (this.gestureHistory.length > 5) this.gestureHistory.shift();
                return gesture;
            }
        }
        return gestures[0];
    }

    // Select which group to animate from
    selectGestureGroup() {
        if (this.isTalking) return 'talking';

        const groups = Object.keys(GestureGroups);
        const totalWeight = groups.reduce((sum, g) => sum + GestureGroups[g].weight, 0);
        let random = Math.random() * totalWeight;

        for (const group of groups) {
            random -= GestureGroups[group].weight;
            if (random <= 0) return group;
        }
        return 'idle';
    }

    // Apply gesture parts to target state
    applyGesture(gesture) {
        const { parts } = gesture;

        if (parts.eyes) {
            const eye = EyePrimitives[parts.eyes];
            if (eye.offset !== undefined) {
                this.targetState.leftEyeOffset = eye.offset;
                this.targetState.rightEyeOffset = eye.offset;
            }
            if (eye.frames) {
                this.targetState.leftEyeState = eye.frames[0];
                this.targetState.rightEyeState = eye.frames[0];
                // Schedule eye open
                setTimeout(() => {
                    this.targetState.leftEyeState = 'open';
                    this.targetState.rightEyeState = 'open';
                }, eye.duration);
            }
            if (eye.variant) {
                this.targetState.leftEyeState = eye.variant;
                this.targetState.rightEyeState = eye.variant;
            }
        }

        if (parts.mouth) {
            const mouth = MouthPrimitives[parts.mouth];
            this.targetState.mouthState = mouth.state;
        }

        if (parts.head) {
            const head = HeadPrimitives[parts.head];
            this.targetState.headAngle = head.angle;
        }

        if (parts.body) {
            const body = BodyPrimitives[parts.body];
            if (body.angle !== undefined) this.targetState.bodyAngle = body.angle;
            if (body.scale !== undefined) this.targetState.bodyScale = body.scale;
        }

        if (parts.armLeft) {
            const arm = ArmPrimitives[parts.armLeft];
            this.targetState.leftArmAngle = arm.angle;
        }

        if (parts.armRight) {
            const arm = ArmPrimitives[parts.armRight];
            this.targetState.rightArmAngle = arm.angle;
        }
    }

    // Smooth interpolation between current and target
    lerp(current, target, factor) {
        return current + (target - current) * factor;
    }

    // Update current state towards target (called each frame)
    updateState() {
        const speed = this.transitionSpeed;

        this.currentState.headAngle = this.lerp(this.currentState.headAngle, this.targetState.headAngle, speed);
        this.currentState.bodyAngle = this.lerp(this.currentState.bodyAngle, this.targetState.bodyAngle, speed);
        this.currentState.leftEyeOffset = this.lerp(this.currentState.leftEyeOffset, this.targetState.leftEyeOffset, speed);
        this.currentState.rightEyeOffset = this.lerp(this.currentState.rightEyeOffset, this.targetState.rightEyeOffset, speed);
        this.currentState.leftArmAngle = this.lerp(this.currentState.leftArmAngle, this.targetState.leftArmAngle, speed);
        this.currentState.rightArmAngle = this.lerp(this.currentState.rightArmAngle, this.targetState.rightArmAngle, speed);
        this.currentState.bodyScale = this.lerp(this.currentState.bodyScale, this.targetState.bodyScale, speed);

        // Eye and mouth states are discrete
        this.currentState.leftEyeState = this.targetState.leftEyeState;
        this.currentState.rightEyeState = this.targetState.rightEyeState;
        this.currentState.mouthState = this.targetState.mouthState;

        return { ...this.currentState };
    }

    // Talking mouth animation
    updateTalkingMouth() {
        if (!this.isTalking) return;

        const talkFrames = ['talk_open', 'talk_mid', 'talk_closed', 'talk_mid'];
        this.targetState.mouthState = talkFrames[this.talkFrameIndex % talkFrames.length];

        // Natural rhythm variation
        const variation = Math.random() > 0.7 ? 2 : 1;
        this.talkFrameIndex += variation;
    }

    // Start talking animation
    startTalking() {
        this.isTalking = true;
        this.talkFrameIndex = 0;
    }

    // Stop talking, return to smile
    stopTalking() {
        this.isTalking = false;
        this.targetState.mouthState = 'smile';
    }

    // Main animation loop
    start(onUpdate) {
        if (this.isRunning) return;
        this.isRunning = true;

        let lastGestureTime = 0;
        let nextGestureDelay = this.getRandomDelay();

        const animate = (timestamp) => {
            if (!this.isRunning) return;

            // Check if time for new gesture
            if (timestamp - lastGestureTime > nextGestureDelay) {
                const group = this.selectGestureGroup();
                const gesture = this.selectWeightedGesture(group);
                this.applyGesture(gesture);
                this.lastGesture = gesture;

                lastGestureTime = timestamp;
                nextGestureDelay = this.getRandomDelay();
            }

            // Update talking mouth if active
            if (this.isTalking && timestamp % 100 < 20) {
                this.updateTalkingMouth();
            }

            // Smooth state update
            const state = this.updateState();
            onUpdate(state);

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    // Random delay with natural variation (800ms - 3000ms)
    getRandomDelay() {
        const base = 1200;
        const variance = 1800;
        return base + Math.random() * variance;
    }

    stop() {
        this.isRunning = false;
    }

    // Force a specific emotion/animation
    setEmotion(emotion) {
        switch (emotion) {
            case 'happy':
                this.applyGesture(GestureGroups.excited.gestures[0]);
                break;
            case 'thinking':
                this.applyGesture(GestureGroups.thinking.gestures[0]);
                break;
            case 'confused':
                this.targetState.headAngle = -15;
                this.targetState.leftEyeState = 'squint';
                this.targetState.rightEyeState = 'wide';
                break;
            case 'idle':
            default:
                this.targetState = this.getDefaultState();
                break;
        }
    }
}

// ============================================================================
// CONTINUOUS PARTICLE SYSTEM - Never-resetting orbital flow
// ============================================================================

class ContinuousParticleSystem {
    constructor(particleCount = 8) {
        this.particles = [];
        this.startTime = Date.now();

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                id: i,
                // Each particle has unique orbital properties
                orbitRadius: 45 + Math.random() * 20,
                orbitSpeed: 0.0005 + Math.random() * 0.0003,
                orbitOffset: (i / particleCount) * Math.PI * 2,
                verticalWobble: 0.3 + Math.random() * 0.4,
                verticalSpeed: 0.001 + Math.random() * 0.0005,
                size: 3 + Math.random() * 4,
                opacity: 0.4 + Math.random() * 0.3,
                color: this.getParticleColor(i)
            });
        }
    }

    getParticleColor(index) {
        const colors = ['#a855f7', '#06b6d4', '#f97316', '#ec4899', '#8b5cf6', '#22d3ee'];
        return colors[index % colors.length];
    }

    // Get current positions for all particles (continuous, no reset)
    getPositions(centerX = 60, centerY = 80) {
        const elapsed = Date.now() - this.startTime;

        return this.particles.map(p => {
            // Continuous orbital motion
            const angle = p.orbitOffset + (elapsed * p.orbitSpeed);
            const verticalOffset = Math.sin(elapsed * p.verticalSpeed) * p.verticalWobble * 15;

            return {
                id: p.id,
                x: centerX + Math.cos(angle) * p.orbitRadius,
                y: centerY + Math.sin(angle) * p.orbitRadius * 0.6 + verticalOffset,
                size: p.size,
                opacity: p.opacity + Math.sin(elapsed * 0.001 + p.id) * 0.1,
                color: p.color,
                rotation: angle * (180 / Math.PI)
            };
        });
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    ProceduralAnimationController,
    ContinuousParticleSystem,
    EyePrimitives,
    MouthPrimitives,
    HeadPrimitives,
    BodyPrimitives,
    ArmPrimitives,
    GestureGroups
};

export default ProceduralAnimationController;
