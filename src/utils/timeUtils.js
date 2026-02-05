/**
 * Time Snapping Utilities
 * Enforces 5-minute intervals for all event times
 */

/**
 * Rounds a Date object to the nearest 5-minute increment
 * @param {Date} date - The date to round
 * @returns {Date} - Date rounded to nearest :00, :05, :10, :15, etc.
 */
export const roundToNearest5Minutes = (date) => {
    const ms = 1000 * 60 * 5; // 5 minutes in milliseconds
    return new Date(Math.round(date.getTime() / ms) * ms);
};

/**
 * Rounds a Date object UP to the next 5-minute increment
 * @param {Date} date - The date to round up
 * @returns {Date} - Date rounded up to next :00, :05, :10, :15, etc.
 */
export const roundUpTo5Minutes = (date) => {
    const ms = 1000 * 60 * 5; // 5 minutes in milliseconds
    return new Date(Math.ceil(date.getTime() / ms) * ms);
};

/**
 * Rounds a Date object DOWN to the previous 5-minute increment
 * @param {Date} date - The date to round down
 * @returns {Date} - Date rounded down to previous :00, :05, :10, :15, etc.
 */
export const roundDownTo5Minutes = (date) => {
    const ms = 1000 * 60 * 5; // 5 minutes in milliseconds
    return new Date(Math.floor(date.getTime() / ms) * ms);
};

/**
 * Snaps a time string (HH:MM format) to the nearest 5-minute increment
 * @param {string} timeString - Time in "HH:MM" format
 * @returns {string} - Time snapped to 5-min increment
 */
export const snapTimeString = (timeString) => {
    if (!timeString || !timeString.includes(':')) return timeString;

    const [hours, minutes] = timeString.split(':').map(Number);
    const snappedMinutes = Math.round(minutes / 5) * 5;

    // Handle minute overflow
    if (snappedMinutes === 60) {
        const newHours = (hours + 1) % 24;
        return `${String(newHours).padStart(2, '0')}:00`;
    }

    return `${String(hours).padStart(2, '0')}:${String(snappedMinutes).padStart(2, '0')}`;
};

/**
 * Gets the current time rounded UP to the next 5-minute increment
 * Useful for default event start times
 * @returns {Date} - Current time rounded up to next 5-min increment
 */
export const getDefault5MinTime = () => {
    return roundUpTo5Minutes(new Date());
};

/**
 * Validates if a time string is aligned to 5-minute increments
 * @param {string} timeString - Time in "HH:MM" format
 * @returns {boolean} - True if time is :00, :05, :10, :15, etc.
 */
export const isValid5MinTime = (timeString) => {
    if (!timeString || !timeString.includes(':')) return false;

    const [, minutes] = timeString.split(':').map(Number);
    return minutes % 5 === 0;
};

/**
 * Formats a Date object to "HH:MM" string in 5-min increments
 * @param {Date} date - Date to format
 * @returns {string} - Time in "HH:MM" format, snapped to 5-min
 */
export const formatTo5MinTime = (date) => {
    const snappedDate = roundToNearest5Minutes(date);
    const hours = String(snappedDate.getHours()).padStart(2, '0');
    const minutes = String(snappedDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Validates and snaps a datetime string to 5-minute increments
 * @param {string} datetimeStr - ISO datetime string
 * @returns {string} - ISO datetime string with time snapped to 5-min
 */
export const snapDateTimeString = (datetimeStr) => {
    const date = new Date(datetimeStr);
    const snapped = roundToNearest5Minutes(date);
    return snapped.toISOString();
};
