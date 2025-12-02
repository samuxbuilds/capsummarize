/**
 * Variants Cache Utility
 *
 * Provides prompt variants from local configuration.
 * No backend API calls needed - all prompts are bundled with the extension.
 */

import { logger } from './logger';
import {
  isImageCapableProvider,
  isVideoCapableProvider,
  type OutputType,
  type AspectRatio,
} from '../config/prompts.js';
import {
  getPromptVariantsForUI,
  getTextPromptVariantsForUI,
  getImagePromptVariantsForUI,
  getVideoPromptVariantsForUI,
  getThumbnailPromptVariantsForUI,
  getNonThumbnailImagePromptVariantsForUI,
  getPromptTemplate as getLocalPromptTemplate,
  isImageVariant,
  isVideoVariant,
  isThumbnailVariant,
  addAspectRatioToPrompt,
} from '../config/promptHelpers.js';

interface PromptVariant {
  variant: string;
  label: string;
  description: string;
  prompt: string;
  outputType: OutputType;
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
        prompt:
          'Create a balanced summary of the video content.\n\n### SOURCE TRANSCRIPT\n{transcript}',
        outputType: 'text',
      },
    ];
  }
}

/**
 * Get text-only prompt variants (supported by all providers)
 */
export async function getTextPromptVariants(): Promise<PromptVariant[]> {
  try {
    const variants = getTextPromptVariantsForUI();
    logger.info(`Loaded ${variants.length} text prompt variants`);
    return variants;
  } catch (error) {
    logger.error('Failed to get text prompt variants:', error);
    return [
      {
        variant: 'default',
        label: 'Default',
        description: 'Balanced overview for general audiences',
        prompt:
          'Create a balanced summary of the video content.\n\n### SOURCE TRANSCRIPT\n{transcript}',
        outputType: 'text',
      },
    ];
  }
}

/**
 * Get image generation prompt variants (ChatGPT, Gemini, Grok only)
 */
export async function getImagePromptVariants(): Promise<PromptVariant[]> {
  try {
    const variants = getImagePromptVariantsForUI();
    logger.info(`Loaded ${variants.length} image prompt variants`);
    return variants;
  } catch (error) {
    logger.error('Failed to get image prompt variants:', error);
    return [];
  }
}

/**
 * Get video generation prompt variants (Gemini only, max 8 seconds)
 */
export async function getVideoPromptVariants(): Promise<PromptVariant[]> {
  try {
    const variants = getVideoPromptVariantsForUI();
    logger.info(`Loaded ${variants.length} video prompt variants`);
    return variants;
  } catch (error) {
    logger.error('Failed to get video prompt variants:', error);
    return [];
  }
}

/**
 * Get thumbnail-specific prompt variants
 */
export async function getThumbnailPromptVariants(): Promise<PromptVariant[]> {
  try {
    const variants = getThumbnailPromptVariantsForUI();
    logger.info(`Loaded ${variants.length} thumbnail prompt variants`);
    return variants;
  } catch (error) {
    logger.error('Failed to get thumbnail prompt variants:', error);
    return [];
  }
}

/**
 * Get non-thumbnail image prompt variants (infographic, comic, etc.)
 */
export async function getNonThumbnailImagePromptVariants(): Promise<PromptVariant[]> {
  try {
    const variants = getNonThumbnailImagePromptVariantsForUI();
    logger.info(`Loaded ${variants.length} non-thumbnail image prompt variants`);
    return variants;
  } catch (error) {
    logger.error('Failed to get non-thumbnail image prompt variants:', error);
    return [];
  }
}

/**
 * Get prompt variants filtered for a specific provider
 * Returns all text variants, plus image variants only if provider supports images
 */
export async function getPromptVariantsForProvider(provider: string): Promise<PromptVariant[]> {
  try {
    if (isImageCapableProvider(provider)) {
      // Provider supports images - return all variants
      return getPromptVariants();
    } else {
      // Provider doesn't support images - return text variants only
      return getTextPromptVariants();
    }
  } catch (error) {
    logger.error(`Failed to get variants for provider ${provider}:`, error);
    return getTextPromptVariants();
  }
}

/**
 * Check if a variant can be used with a specific provider
 */
export function canUseVariantWithProvider(variant: string, provider: string): boolean {
  if (isVideoVariant(variant)) {
    return isVideoCapableProvider(provider);
  }
  if (isImageVariant(variant)) {
    return isImageCapableProvider(provider);
  }
  return true; // All providers support text variants
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

// Re-export useful functions and types from prompts config
export {
  isImageCapableProvider,
  isVideoCapableProvider,
  isImageVariant,
  isVideoVariant,
  isThumbnailVariant,
  addAspectRatioToPrompt,
};
export type { OutputType, AspectRatio };

// Export the PromptVariant interface for use in other modules
export type { PromptVariant };
