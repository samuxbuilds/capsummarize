/**
 * Storage helper utilities for managing cache keys and URL normalization.
 *
 * This module provides utilities for:
 * - Normalizing URLs for consistent storage keys
 * - Generating storage keys for summaries and VTT content
 * - Hashing caption URLs for change detection
 */

/**
 * Creates a stable, canonical URL representation suitable for use as storage keys.
 *
 * This ensures that different URLs pointing to the same resource (with varying
 * query parameters) are treated as identical for caching purposes.
 *
 * @param inputUrl - The URL to normalize
 * @returns Normalized URL string without query parameters or hash
 */
export function normalizeUrl(inputUrl: string): string {
  try {
    const u = new URL(inputUrl);
    u.hash = '';
    return u.toString();
  } catch {
    // If URL parsing fails, fallback to raw string
    return inputUrl;
  }
}

/**
 * Generates a unique storage key for caching video summaries.
 *
 * Creates a consistent key format that combines normalized URL and variant
 * information, enabling efficient storage and retrieval of summaries with
 * different processing options.
 *
 * @param url - The video page URL to generate key for
 * @param variant - Optional variant identifier for different summary types
 * @returns Storage key string for the summary cache
 */
export function getSummaryStorageKey(url: string, variant: string | undefined): string {
  const normalized = normalizeUrl(url);
  const variantPart = variant && variant.trim() ? variant.trim() : 'default';
  return `summary_${btoa(normalized)}_${variantPart}`;
}

/**
 * Generates a unique storage key for caching VTT subtitle data.
 *
 * Creates a consistent key format for storing and retrieving subtitle content
 * associated with specific video pages, enabling cross-session persistence.
 *
 * @param url - The video page URL to generate key for
 * @returns Storage key string for the VTT cache
 */
export function getVttStorageKey(url: string): string {
  const normalized = normalizeUrl(url);
  return `vtt_${btoa(normalized)}`;
}

/**
 * Generates a simple hash from a caption URL for change detection.
 *
 * Creates a numeric hash from the URL string to detect when video caption
 * sources change, enabling efficient cache invalidation without storing
 * full URLs in memory.
 *
 * @param url - The caption URL to hash
 * @returns Base36-encoded string representation of the hash
 */
export function hashCaptionUrl(url: string): string {
  // Simple hash function for URL (better than storing full URL)
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
