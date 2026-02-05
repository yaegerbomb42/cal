/**
 * Cal Animation System
 * Provides bone-based animation controls for the Cal character
 * Allows custom commands from Gemini like "head_angle:10,eye_left:wander,duration:2"
 */

export class CalAnimationSystem {
    constructor() {
        this.animationQueue = [];
        this.isPlaying = false;
    }

    /**
     * Parse a custom animation command string
     * Format: "bone_name:value,duration:seconds,easing:type"
     * Example: "head_angle:15,left_eye:wander,duration:2"
     */
    parseCommand(commandString) {
        const commands = {};
        const parts = commandString.split(',');

        parts.forEach(part => {
            const [key, value] = part.split(':').map(s => s.trim());
            if (key && value) {
                commands[key] = value;
            }
        });

        return commands;
    }

    /**
     * Execute an animation sequence
     * @param {Array} sequence - Array of animation steps
     * @param {Function} updateCallback - Function to call with bone states
     */
    async executeSequence(sequence, updateCallback) {
        for (const step of sequence) {
            const duration = step.duration || 1000;
            updateCallback(step.bones);
            await this.sleep(duration);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Predefined animation sequences
     */
    static animations = {
        // Simple head movements
        nod: [
            { bones: { headAngle: 10 }, duration: 300 },
            { bones: { headAngle: -5 }, duration: 300 },
            { bones: { headAngle: 0 }, duration: 200 }
        ],

        shake: [
            { bones: { headAngle: -15 }, duration: 200 },
            { bones: { headAngle: 15 }, duration: 200 },
            { bones: { headAngle: -10 }, duration: 150 },
            { bones: { headAngle: 10 }, duration: 150 },
            { bones: { headAngle: 0 }, duration: 200 }
        ],

        // Wave animation
        wave: [
            { bones: { rightArmAngle: -45 }, duration: 300 },
            { bones: { rightArmAngle: -30 }, duration: 200 },
            { bones: { rightArmAngle: -45 }, duration: 200 },
            { bones: { rightArmAngle: -30 }, duration: 200 },
            { bones: { rightArmAngle: 0 }, duration: 300 }
        ],

        // Dance animation
        dance: [
            { bones: { bodyAngle: -5, leftArmAngle: -30, rightArmAngle: 30 }, duration: 300 },
            { bones: { bodyAngle: 5, leftArmAngle: 30, rightArmAngle: -30 }, duration: 300 },
            { bones: { bodyAngle: -5, leftArmAngle: -30, rightArmAngle: 30 }, duration: 300 },
            { bones: { bodyAngle: 5, leftArmAngle: 30, rightArmAngle: -30 }, duration: 300 },
            { bones: { bodyAngle: 0, leftArmAngle: 0, rightArmAngle: 0 }, duration: 300 }
        ],

        // Walk away animation
        walk_away: [
            { bones: { leftFootAngle: -15, rightFootAngle: 5, bodyAngle: 3 }, duration: 400 },
            { bones: { leftFootAngle: 5, rightFootAngle: -15, bodyAngle: -3 }, duration: 400 },
            { bones: { leftFootAngle: -15, rightFootAngle: 5, bodyAngle: 3 }, duration: 400 },
            { bones: { leftFootAngle: 5, rightFootAngle: -15, bodyAngle: -3 }, duration: 400 },
            { bones: { leftFootAngle: 0, rightFootAngle: 0, bodyAngle: 0 }, duration: 300 }
        ],

        // Think animation
        think: [
            { bones: { headAngle: -10, rightArmAngle: -45 }, duration: 500 },
            { bones: { leftEyeState: 'closed', rightEyeState: 'closed' }, duration: 1000 },
            { bones: { leftEyeState: 'open', rightEyeState: 'open' }, duration: 500 },
            { bones: { headAngle: 0, rightArmAngle: 0 }, duration: 400 }
        ],

        // Celebrate animation
        celebrate: [
            { bones: { leftArmAngle: -60, rightArmAngle: -60, mouthState: 'smile_wide' }, duration: 200 },
            { bones: { bodyAngle: -5 }, duration: 150 },
            { bones: { bodyAngle: 5 }, duration: 150 },
            { bones: { bodyAngle: -5 }, duration: 150 },
            { bones: { bodyAngle: 0 }, duration: 150 },
            { bones: { leftArmAngle: 0, rightArmAngle: 0, mouthState: 'smile' }, duration: 300 }
        ],

        // Eye movements
        look_left: [
            { bones: { leftEyeOffset: -5, rightEyeOffset: -5 }, duration: 300 },
            { bones: { leftEyeOffset: 0, rightEyeOffset: 0 }, duration: 1500 }
        ],

        look_right: [
            { bones: { leftEyeOffset: 5, rightEyeOffset: 5 }, duration: 300 },
            { bones: { leftEyeOffset: 0, rightEyeOffset: 0 }, duration: 1500 }
        ],

        blink: [
            { bones: { leftEyeState: 'closed', rightEyeState: 'closed' }, duration: 100 },
            { bones: { leftEyeState: 'open', rightEyeState: 'open' }, duration: 100 }
        ]
    };

    /**
     * Get a predefined animation by name
     */
    static getAnimation(name) {
        return CalAnimationSystem.animations[name] || CalAnimationSystem.animations.nod;
    }
}

export default CalAnimationSystem;
