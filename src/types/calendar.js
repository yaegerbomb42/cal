/**
 * @typedef {'work'|'personal'|'fun'|'hobby'|'task'|'todo'|'event'|'appointment'|'health'|'social'|'travel'|'other'} EventCategory
 */

/**
 * @typedef {Object} Recurrence
 * @property {'none'|'daily'|'weekly'|'monthly'|'yearly'} type
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

export {}; // Ensures this file is treated as a module.
