/**
 * @typedef {'debug'|'info'|'warn'|'error'} LogLevel
 */

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [CalAI] [${level.toUpperCase()}] ${message}`;
};

/**
 * @param {LogLevel} level
 * @param {string} message
 * @param {Record<string, unknown>} [metadata]
 */
const log = (level, message, metadata = {}) => {
  const formatted = formatMessage(level, message);
  if (level === 'error') {
    console.error(formatted, metadata);
    return;
  }
  if (level === 'warn') {
    console.warn(formatted, metadata);
    return;
  }
  if (level === 'debug') {
    console.debug(formatted, metadata);
    return;
  }
  console.info(formatted, metadata);
};

export const logger = {
  debug: (message, metadata) => log('debug', message, metadata),
  info: (message, metadata) => log('info', message, metadata),
  warn: (message, metadata) => log('warn', message, metadata),
  error: (message, metadata) => log('error', message, metadata)
};
