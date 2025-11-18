/**
 * Prompt Template Utilities
 *
 * Helper functions for working with cached prompt templates.
 * Provides utilities for formatting and using prompt templates with LLM providers.
 */

import { getPromptTemplate } from './variantsCache.js';
import { IndexedDBStorage } from './storage.js';

/**
 * Format a prompt template with transcript content
 *
 * @param template - The prompt template from the API
 * @param transcript - The video transcript content
 * @returns Formatted prompt ready for LLM
 */
export function formatPromptTemplate(template: string, transcript: string): string {
  // Replace common template variables
  let formatted = template.replace(/\{transcript\}/g, transcript);
  formatted = formatted.replace(/\{content\}/g, transcript);
  formatted = formatted.replace(/\{video_content\}/g, transcript);

  return formatted;
}

/**
 * Get and format the current prompt template for LLM usage
 *
 * @param variant - The prompt variant name
 * @param transcript - The video transcript content
 * @returns Formatted prompt ready for LLM or null if not found
 */
export async function getFormattedPromptForLLM(
  variant: string,
  transcript: string
): Promise<string | null> {
  try {
    const template = await getPromptTemplate(variant);
    if (!template) {
      console.error(`No prompt template found for variant: ${variant}`);
      return null;
    }

    return formatPromptTemplate(template, transcript);
  } catch (error) {
    console.error(`Failed to get formatted prompt for variant ${variant}:`, error);
    return null;
  }
}

/**
 * Store the current prompt template for offline use
 *
 * @param variant - The variant name
 * @param template - The prompt template
 */
export async function cachePromptTemplate(variant: string, template: string): Promise<void> {
  try {
    await IndexedDBStorage.set(`prompt_template_${variant}`, {
      template,
      variant,
      cachedAt: Date.now(),
    });
  } catch (error) {
    console.error(`Failed to cache prompt template for ${variant}:`, error);
  }
}

/**
 * Get cached prompt template for offline use
 *
 * @param variant - The variant name
 * @returns Cached template or null if not found
 */
export async function getCachedPromptTemplate(variant: string): Promise<string | null> {
  try {
    const cached = await IndexedDBStorage.get<{
      template: string;
      variant: string;
      cachedAt: number;
    }>(`prompt_template_${variant}`);

    return cached ? cached.template : null;
  } catch (error) {
    console.error(`Failed to get cached prompt template for ${variant}:`, error);
    return null;
  }
}

/**
 * Clear all cached prompt templates
 */
export async function clearCachedPromptTemplates(): Promise<void> {
  try {
    const allKeys = await IndexedDBStorage.getAllKeys();
    const promptTemplateKeys = allKeys.filter((key: string) => key.startsWith('prompt_template_'));

    if (promptTemplateKeys.length > 0) {
      await IndexedDBStorage.remove(promptTemplateKeys);
      console.log(`Cleared ${promptTemplateKeys.length} cached prompt templates`);
    }
  } catch (error) {
    console.error('Failed to clear cached prompt templates:', error);
  }
}
