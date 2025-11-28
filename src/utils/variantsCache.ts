/**
 * Variants Cache Utility
 *
 * Provides prompt variants from local configuration.
 * No backend API calls needed - all prompts are bundled with the extension.
 */

import { logger } from './logger';
import { getPromptVariantsForUI, getPromptTemplate as getLocalPromptTemplate } from '../config/prompts.js';

interface PromptVariant {
  variant: string;
  label: string;
  description: string;
  prompt: string;
}

/**
 * Get prompt variants from local configuration
 *
 * Returns all available prompt variants from the bundled configuration.
 * No API calls or caching needed - prompts are always available locally.
 */
export async function getPromptVariants(): Promise<PromptVariant[]> {
  try {
    const variants = getPromptVariantsForUI();
    logger.info(`Loaded ${variants.length} prompt variants from local config`);
    return variants;
  } catch (error) {
    logger.error('Failed to get prompt variants:', error);

    // Fallback to minimal defaults if something goes wrong
    return [
      {
        variant: 'default',
        label: 'Default',
        description: 'Balanced overview for general audiences',
        prompt: 'Create a balanced summary of the video content.\n\n### SOURCE TRANSCRIPT\n{transcript}',
      },
    ];
  }
}

/**
 * Get a specific prompt template by variant name
 */
export async function getPromptTemplate(variant: string): Promise<string | null> {
  try {
    const template = getLocalPromptTemplate(variant);
    return template ? template.prompt : null;
  } catch (error) {
    logger.error(`Failed to get prompt template for ${variant}:`, error);
    return null;
  }
}

/**
 * Clear cached variants - no-op since we use local config
 * Kept for API compatibility
 */
export async function clearCachedVariants(): Promise<void> {
  logger.info('clearCachedVariants called - no-op with local config');
}

// Export the PromptVariant interface for use in other modules
export type { PromptVariant };
