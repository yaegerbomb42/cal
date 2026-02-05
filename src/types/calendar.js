/**
 * @typedef {'work'|'personal'|'fun'|'hobby'|'task'|'todo'|'event'|'appointment'|'holiday'|'health'|'social'|'travel'|'other'} EventCategory
 */

/**
 * @typedef {Object} Recurrence
 * @property {'none'|'daily'|'weekly'|'monthly'|'yearly'|'weekdays'|'custom'} type
 * @property {number} [interval] - Every N (days/weeks/months/years)
 * @property {number[]} [daysOfWeek] - 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
 * @property {'never'|'date'|'count'} [endType] - When to stop recurring
 * @property {string} [endDate] - ISO date string (if endType='date')
 * @property {number} [endCount] - Number of occurrences (if endType='count')
 */

/**
 * @typedef {Object} EventInput
 * @property {string} title
 * @property {string} [description]
 * @property {string} start
 * @property {string} end
 * @property {string} [location]
 * @property {EventCategory} [category]
 * @property {string} [color]
 * @property {string|null} [reminder]
 * @property {Recurrence} [recurring]
 */

/**
 * @typedef {EventInput & {
 *  id: string,
 *  createdAt: string,
 *  gcalId?: string
 * }} CalendarEvent
 */

/**
 * @typedef {Object} DraftEvent
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [start]
 * @property {string} [end]
 * @property {string} [location]
 * @property {EventCategory} [category]
 * @property {string} [color]
 * @property {string|null} [reminder]
 * @property {Recurrence} [recurring]
 */

/**
 * @typedef {'title'|'start'|'end'} MissingEventField
 */

/**
 * @typedef {Object} EventDraftResult
 * @property {'draft'|'needs_clarification'} status
 * @property {DraftEvent} draft
 * @property {MissingEventField[]} missingFields
 * @property {string} source
 */

export { }; // Ensures this file is treated as a module.
