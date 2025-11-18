/**
 * Development-only logging service
 * Logs are only shown in development mode and stripped out in production
 */

// Check if we're in development mode
const isDevelopment = (): boolean => {
  // For browser extension, check if manifest is not in production
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    // In development, the extension ID might be different or we can check environment
    return !chrome.runtime.id.includes('production') || process.env.NODE_ENV === 'development';
  }

  // For server-side code
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  }

  // Fallback: assume development
  return true;
};

const DEV_MODE = isDevelopment();

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private shouldLog(): boolean {
    // TODO - Check If is there any way to check if we are in development mode
    return false;
  }

  private formatMessage(level: LogLevel, ...args: any[]): [string, ...any[]] {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return [prefix, ...args];
  }

  log(...args: any[]): void {
    if (this.shouldLog()) {
      console.log(...this.formatMessage('log', ...args));
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog()) {
      console.info(...this.formatMessage('info', ...args));
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog()) {
      console.warn(...this.formatMessage('warn', ...args));
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog()) {
      console.error(...this.formatMessage('error', ...args));
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog()) {
      console.debug(...this.formatMessage('debug', ...args));
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const log = (...args: any[]) => logger.log(...args);
export const info = (...args: any[]) => logger.info(...args);
export const warn = (...args: any[]) => logger.warn(...args);
export const error = (...args: any[]) => logger.error(...args);
export const debug = (...args: any[]) => logger.debug(...args);
