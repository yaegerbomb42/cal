
import { addMinutes, setHours, isBefore, startOfHour, addHours } from 'date-fns';

/**
 * Finds the next available time slot of a given duration.
 * Naive implementation: Scans from 'now' onwards in 30min increments.
 * Respects working hours (e.g., 9am - 6pm) if preferred, or just avoids conflicts.
 * 
 * @param {Array} events - List of existing events
 * @param {number} durationMinutes - Duration of the task
 * @param {Date} startFrom - When to start looking (default: now)
 * @returns {Object} { start: Date, end: Date }
 */
export const findNextFreeSlot = (events, durationMinutes = 30, startFrom = new Date()) => {
    let candidateStart = startOfHour(addMinutes(startFrom, 30)); // Start at next hour/half-hour

    // Safety break after 7 days
    const maxDate = new Date(startFrom);
    maxDate.setDate(maxDate.getDate() + 7);

    while (isBefore(candidateStart, maxDate)) {
        const candidateEnd = addMinutes(candidateStart, durationMinutes);

        // Simple 9am - 10pm constraints for "Smartness" (don't schedule at 3am)
        const hour = candidateStart.getHours();
        if (hour < 9 || hour >= 22) {
            candidateStart = addHours(candidateStart, 1);
            if (candidateStart.getHours() < 9) {
                candidateStart = setHours(candidateStart, 9);
            }
            continue;
        }

        // Check collision
        const hasConflict = events.some(event => {
            const eStart = new Date(event.start);
            const eEnd = new Date(event.end);
            return (
                (candidateStart < eEnd) && (candidateEnd > eStart)
            );
        });

        if (!hasConflict) {
            return {
                start: candidateStart.toISOString(),
                end: candidateEnd.toISOString()
            };
        }

        // Increment by 30 mins
        candidateStart = addMinutes(candidateStart, 30);
    }

    return null; // No slot found
};
