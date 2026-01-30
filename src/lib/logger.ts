const isDev = import.meta.env.DEV;

type LogArgs = unknown[];

export const logger = {
  debug: (...args: LogArgs): void => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: LogArgs): void => {
    console.log('[INFO]', ...args);
  },
  warn: (...args: LogArgs): void => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: LogArgs): void => {
    console.error('[ERROR]', ...args);
  },
};
