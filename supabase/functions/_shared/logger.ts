type LogData = Record<string, unknown>;

function formatLog(level: string, message: string, data?: LogData): string {
  const logEntry: LogData = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(data || {}),
  };
  return JSON.stringify(logEntry);
}

export const logger = {
  debug: (message: string, data?: LogData): void => {
    console.log(formatLog('debug', message, data));
  },
  info: (message: string, data?: LogData): void => {
    console.log(formatLog('info', message, data));
  },
  warn: (message: string, data?: LogData): void => {
    console.warn(formatLog('warn', message, data));
  },
  error: (message: string, data?: LogData): void => {
    console.error(formatLog('error', message, data));
  },
};
