/**
 * Environment configuration for the browser extension
 *
 * Since browser extensions cannot directly access process.env,
 * we use build-time replacement and runtime detection.
 */

// Production configuration
const PRODUCTION_CONFIG = {
  API_BASE_URL: 'https://api.capsummarize.app', // Production API
  NODE_ENV: 'production',
} as const;

/**
 * Get current environment configuration
 * Uses build-time replacement or runtime detection
 */
export function getEnv() {
  // Runtime detection for browser extension: default to production configuration
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return PRODUCTION_CONFIG;
  }

  // Server-side or other contexts
  if (typeof process !== 'undefined' && process.env) {
    return {
      API_BASE_URL: process.env.API_BASE_URL || PRODUCTION_CONFIG.API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV || PRODUCTION_CONFIG.NODE_ENV,
    };
  }

  // Fallback to production to ensure secure defaults
  return PRODUCTION_CONFIG;
}

/**
 * Get API base URL for current environment
 */
export function getApiBaseUrl(): string {
  return getEnv().API_BASE_URL;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}
