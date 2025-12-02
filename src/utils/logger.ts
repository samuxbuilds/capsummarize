/**
 * Development-only logging service
 * Logs are only shown in development mode and stripped out in production
 */

// Check if we're in development mode
const isDevelopment = (): boolean => {
  // In the browser extension context, process.env.NODE_ENV is replaced by the build script
  // We can trust this value to be 'development' or 'production'
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development';
  }

  // Fallback for safety - default to false (production) if we can't determine
  return false;
};

const DEV_MODE = isDevelopment();

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private shouldLog(): boolean {
    return DEV_MODE;
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
    // Always show warnings, even in production, as they indicate potential issues
    console.warn(...this.formatMessage('warn', ...args));
  }

  error(...args: any[]): void {
    // Always show errors, even in production, as they indicate critical issues
    console.error(...this.formatMessage('error', ...args));
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
