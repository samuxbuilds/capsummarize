/**
 * Variants Cache Utility
 *
 * Handles caching of prompt variants from the API using IndexedDB.
 * Provides 24-hour TTL cache to avoid redundant API calls and improve performance.
 * Stores full prompt information including templates for offline use.
 */

import { logger } from './logger';
import StorageUtils from './storage.js';
import { api } from './api.js';

const VARIANTS_CACHE_KEY = 'prompt_variants_cache';
const CACHE_TTL_HOURS = 24; // 24 hours

interface PromptVariant {
  variant: string;
  label: string;
  description: string;
  prompt: string; // The actual prompt template
}

/**
 * Get prompt variants from API with caching
 *
 * First tries to load from IndexedDB cache. If cache is expired or doesn't exist,
 * fetches from API and caches the result for 24 hours. Includes full prompt templates.
 */
export async function getPromptVariants(): Promise<PromptVariant[]> {
  try {
    // Check if we have valid cached data
    const isExpired = await StorageUtils.isExpired(VARIANTS_CACHE_KEY, CACHE_TTL_HOURS);

    if (!isExpired) {
      // Use cached data
      const cachedVariants =
        await StorageUtils.getWithTimestamp<PromptVariant[]>(VARIANTS_CACHE_KEY);
      if (cachedVariants && cachedVariants.length > 0) {
        logger.info('Using cached prompt variants');
        return cachedVariants;
      }
    }

    // Cache miss or expired, fetch from API
    logger.info('Fetching prompt variants from API');
    const prompts = await api.getPrompts();

    // Transform API response to UI format, keeping the prompt template
    const variants: PromptVariant[] = prompts.map((prompt) => ({
      variant: prompt.variant,
      label: prompt.variant.charAt(0).toUpperCase() + prompt.variant.slice(1),
      description: prompt.description,
      prompt: prompt.prompt, // Store the actual prompt template
    }));

    // Cache the result with timestamp
    await StorageUtils.saveWithTimestamp(VARIANTS_CACHE_KEY, variants);
    logger.info(
      `Cached ${variants.length} prompt variants with templates for ${CACHE_TTL_HOURS} hours`
    );

    return variants;
  } catch (error) {
    logger.error('Failed to get prompt variants:', error);

    // Fallback to default variants if API fails
    logger.info('Using fallback prompt variants');
    return [
      {
        variant: 'default',
        label: 'Default',
        description: 'Balanced overview for general audiences',
        prompt: 'Create a balanced summary of the video content.',
      },
      {
        variant: 'educational',
        label: 'Educational',
        description: 'Structured learning with objectives and scholarly analysis',
        prompt: 'Create an educational summary with learning objectives.',
      },
      {
        variant: 'technical',
        label: 'Technical',
        description: 'Detailed analysis with code and implementation',
        prompt: 'Create a technical summary with implementation details.',
      },
    ];
  }
}

/**
 * Get a specific prompt template by variant name
 * Uses cached data when available, falls back to API if needed.
 */
export async function getPromptTemplate(variant: string): Promise<string | null> {
  try {
    const variants = await getPromptVariants();
    const found = variants.find((v) => v.variant === variant);
    return found ? found.prompt : null;
  } catch (error) {
    logger.error(`Failed to get prompt template for ${variant}:`, error);
    return null;
  }
}

/**
 * Clear cached variants (useful for testing or force refresh)
 */
export async function clearCachedVariants(): Promise<void> {
  try {
    await StorageUtils.remove(VARIANTS_CACHE_KEY);
    logger.info('Cached variants cleared');
  } catch (error) {
    logger.error('Failed to clear cached variants:', error);
  }
}

// Export the PromptVariant interface for use in other modules
export type { PromptVariant };
