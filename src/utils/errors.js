/**
 * @typedef {Record<string, unknown>} ErrorMetadata
 */

export class CalError extends Error {
  /**
   * @param {string} message
   * @param {ErrorMetadata} [metadata]
   */
  constructor(message, metadata = {}) {
    super(message);
    this.name = 'CalError';
    this.metadata = metadata;
  }
}

export class ValidationError extends CalError {
  /**
   * @param {string} message
   * @param {string[]} [issues]
   * @param {ErrorMetadata} [metadata]
   */
  constructor(message, issues = [], metadata = {}) {
    super(message, metadata);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class AIServiceError extends CalError {
  /**
   * @param {string} message
   * @param {ErrorMetadata} [metadata]
   */
  constructor(message, metadata = {}) {
    super(message, metadata);
    this.name = 'AIServiceError';
  }
}

export class AIParseError extends CalError {
  /**
   * @param {string} message
   * @param {ErrorMetadata} [metadata]
   */
  constructor(message, metadata = {}) {
    super(message, metadata);
    this.name = 'AIParseError';
  }
}
