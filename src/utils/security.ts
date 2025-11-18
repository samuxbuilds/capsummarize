/**
 * Security utilities for input validation and sanitization
 *
 * Provides helper functions to validate and sanitize external data
 * to prevent XSS and injection attacks in compliance with
 * Chrome Web Store security policies.
 */

/**
 * Sanitizes text input to prevent XSS attacks
 * Removes script tags and dangerous HTML content
 *
 * @param input - Raw input string to sanitize
 * @returns Sanitized string safe for DOM insertion
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return (
    input
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove dangerous event handlers
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: URLs
      .replace(/javascript\s*:/gi, '')
      // Remove data: URLs with script content
      .replace(/data\s*:\s*(?!image\/)/gi, '')
      // Remove HTML comments that might hide scripts
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim()
  );
}

/**
 * Validates that a URL is safe for external requests
 * Allows HTTPS URLs for production and HTTP localhost for development
 *
 * @param url - URL to validate
 * @returns True if URL is safe for API requests
 */
export function isValidApiUrl(url: string): boolean {
  if (typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);

    // Allow localhost/127.0.0.1 for development (HTTP or HTTPS)
    const isLocalhost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]';

    if (isLocalhost) {
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }

    // For production, require HTTPS and capsummarize.app domain
    return parsed.protocol === 'https:' && parsed.hostname.includes('capsummarize.app');
  } catch {
    return false;
  }
}

/**
 * Sanitizes VTT content to prevent injection through subtitle files
 * Removes any potential script content from VTT subtitle data
 *
 * @param vttContent - Raw VTT content to sanitize
 * @returns Sanitized VTT content safe for processing
 */
export function sanitizeVTTContent(vttContent: string): string {
  if (typeof vttContent !== 'string') return '';

  return (
    vttContent
      // Remove any script-like content in VTT text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove dangerous HTML from subtitle text
      .replace(/<[^>]*>/g, '')
      // Limit content length to prevent DoS
      .substring(0, 1000000) // 1MB limit
      .trim()
  );
}

/**
 * Validates prompt content for AI provider injection
 * Ensures prompt content is safe text without executable code
 *
 * @param prompt - Prompt content to validate
 * @returns True if prompt is safe for injection
 */
export function isValidPrompt(prompt: string): boolean {
  if (typeof prompt !== 'string') return false;

  // Check length limits
  if (prompt.length === 0) return false;

  // Check for dangerous patterns
  const dangerousPatterns = [/<script/i, /javascript:/i, /data:.*script/i, /on\w+\s*=/i];

  return !dangerousPatterns.some((pattern) => pattern.test(prompt));
}

/**
 * Escapes HTML content for safe DOM insertion
 * Converts special characters to HTML entities
 *
 * @param content - Raw content to escape
 * @returns HTML-escaped content safe for innerHTML
 */
export function escapeHtml(content: string): string {
  if (typeof content !== 'string') return '';

  const div = document.createElement('div');
  div.textContent = content;
  return div.innerHTML;
}
