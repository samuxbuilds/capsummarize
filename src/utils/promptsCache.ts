/**
 * Prompts Cache and Usage Tracking Utility
 *
 * Handles caching of prompt variants from API to avoid repeated calls
 * and tracks daily usage limits for summary generation.
 */

import StorageUtils from './storage.js';
import { APIUtils } from './api.js';

/**
 * Cached prompt variant interface
 */
export interface CachedPromptVariant {
  variant: string;
  description: string;
  prompt: string;
  cachedAt: number;
}

/**
 * Usage tracking interface
 */
export interface DailyUsage {
  date: string; // YYYY-MM-DD format
  count: number;
}

/**
 * License validation response
 */
export interface LicenseValidation {
  valid: boolean;
  lifetime: boolean;
  expiresAt?: string;
  error?: string;
}

export const PROMPTS_CACHE_KEY = 'promptsCache';
export const USAGE_TRACKING_KEY = 'dailyUsage';
export const LICENSE_KEY = 'licenseKey';
export const FREE_DAILY_LIMIT = 24;

/**
 * Cache prompts from API to IndexedDB
 */
export async function cachePrompts(
  prompts: Array<{ variant: string; description: string; prompt: string }>
): Promise<void> {
  try {
    const cachedPrompts: CachedPromptVariant[] = prompts.map((prompt) => ({
      ...prompt,
      cachedAt: Date.now(),
    }));

    await StorageUtils.set(PROMPTS_CACHE_KEY, cachedPrompts);
    console.log('[PromptsCache] Cached prompts:', cachedPrompts.length);
  } catch (error) {
    console.error('[PromptsCache] Failed to cache prompts:', error);
  }
}

/**
 * Load cached prompts from IndexedDB
 */
export async function loadCachedPrompts(): Promise<CachedPromptVariant[]> {
  try {
    const cached = await StorageUtils.get<CachedPromptVariant[]>(PROMPTS_CACHE_KEY);

    if (!cached) {
      return [];
    }

    // Check if cache is stale (older than 24 hours)
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const validPrompts = cached.filter((prompt) => now - prompt.cachedAt < twentyFourHours);

    // If we filtered out stale prompts, update the cache
    if (validPrompts.length !== cached.length) {
      await StorageUtils.set(PROMPTS_CACHE_KEY, validPrompts);
    }

    return validPrompts;
  } catch (error) {
    console.error('[PromptsCache] Failed to load cached prompts:', error);
    return [];
  }
}

/**
 * Check if we have fresh cached prompts (less than 24 hours old)
 */
export async function hasFreshCache(): Promise<boolean> {
  const cached = await loadCachedPrompts();
  return cached.length > 0;
}

/**
 * Get today's usage tracking
 */
export async function getTodayUsage(): Promise<DailyUsage> {
  try {
    const today = new Date().toISOString().split('T')[0]!; // YYYY-MM-DD
    const allUsage = (await StorageUtils.get<DailyUsage[]>(USAGE_TRACKING_KEY)) || [];

    let todayUsage = allUsage.find((usage) => usage.date === today);

    if (!todayUsage) {
      todayUsage = { date: today, count: 0 };
    }

    return todayUsage;
  } catch (error) {
    console.error('[PromptsCache] Failed to get today usage:', error);
    const today = new Date().toISOString().split('T')[0]!;
    return { date: today, count: 0 };
  }
}

/**
 * Increment today's usage count
 */
export async function incrementUsage(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]!;
    const allUsage = (await StorageUtils.get<DailyUsage[]>(USAGE_TRACKING_KEY)) || [];

    let todayUsage = allUsage.find((usage) => usage.date === today);

    if (todayUsage) {
      todayUsage.count++;
    } else {
      todayUsage = { date: today, count: 1 };
      allUsage.push(todayUsage);
    }

    // Keep only last 30 days of usage data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]!;

    const filteredUsage = allUsage.filter((usage) => usage.date >= thirtyDaysAgoStr);

    await StorageUtils.set(USAGE_TRACKING_KEY, filteredUsage);
    console.log('[PromptsCache] Usage incremented for today:', todayUsage.count);
  } catch (error) {
    console.error('[PromptsCache] Failed to increment usage:', error);
  }
}

/**
 * Check if user has reached daily limit
 */
export async function hasReachedDailyLimit(): Promise<boolean> {
  const todayUsage = await getTodayUsage();
  const licenseValidation = await getStoredLicenseValidation();

  // If user has lifetime license, no limits
  if (licenseValidation.valid && licenseValidation.lifetime) {
    return false;
  }

  return todayUsage.count >= FREE_DAILY_LIMIT;
}

/**
 * Get remaining summaries for today
 */
export async function getRemainingSummaries(): Promise<number> {
  const todayUsage = await getTodayUsage();
  const licenseValidation = await getStoredLicenseValidation();

  // If user has lifetime license, unlimited
  if (licenseValidation.valid && licenseValidation.lifetime) {
    return Infinity;
  }

  return Math.max(0, FREE_DAILY_LIMIT - todayUsage.count);
}

/**
 * Store license key and validation
 */
export async function storeLicenseKey(
  licenseKey: string,
  validation: LicenseValidation
): Promise<void> {
  try {
    await StorageUtils.set(LICENSE_KEY, {
      key: licenseKey,
      validation,
      validatedAt: Date.now(),
    });
    console.log('[PromptsCache] License key stored:', validation.valid ? 'valid' : 'invalid');
  } catch (error) {
    console.error('[PromptsCache] Failed to store license key:', error);
  }
}

/**
 * Get stored license validation
 */
export async function getStoredLicenseValidation(): Promise<LicenseValidation> {
  try {
    const stored = await StorageUtils.get<{
      key: string;
      validation: LicenseValidation;
      validatedAt: number;
    }>(LICENSE_KEY);

    if (!stored) {
      return { valid: false, lifetime: false };
    }

    // Check if validation is stale (older than 7 days for non-lifetime licenses)
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (!stored.validation.lifetime && now - stored.validatedAt > sevenDays) {
      // Validation expired, mark as invalid
      return { valid: false, lifetime: false };
    }

    return stored.validation;
  } catch (error) {
    console.error('[PromptsCache] Failed to get stored license validation:', error);
    return { valid: false, lifetime: false };
  }
}

/**
 * Get stored license key
 */
export async function getStoredLicenseKey(): Promise<string | null> {
  try {
    const stored = await StorageUtils.get<{
      key: string;
      validation: LicenseValidation;
      validatedAt: number;
    }>(LICENSE_KEY);

    return stored?.key || null;
  } catch (error) {
    console.error('[PromptsCache] Failed to get stored license key:', error);
    return null;
  }
}

/**
 * Validate license key with server and store it
 */
export async function validateAndStoreLicenseKey(
  licenseKey: string,
  email?: string
): Promise<LicenseValidation> {
  try {
    const api = new APIUtils();
    const validation = await api.validateLicense(licenseKey, email);

    // Store the license key and validation result
    await storeLicenseKey(licenseKey, validation);

    return validation;
  } catch (error) {
    console.error('[PromptsCache] Failed to validate license key:', error);
    const errorValidation: LicenseValidation = {
      valid: false,
      lifetime: false,
      error: error instanceof Error ? error.message : 'Failed to validate license',
    };

    // Store the failed validation attempt
    await storeLicenseKey(licenseKey, errorValidation);

    return errorValidation;
  }
}

/**
 * Clear stored license key and validation
 */
export async function clearLicenseKey(): Promise<void> {
  try {
    await StorageUtils.remove(LICENSE_KEY);
    console.log('[PromptsCache] License key cleared');
  } catch (error) {
    console.error('[PromptsCache] Failed to clear license key:', error);
    throw error;
  }
}

/**
 * Clear cached prompts (force fresh fetch next time)
 */
export async function clearPromptCache(): Promise<void> {
  try {
    await StorageUtils.remove(PROMPTS_CACHE_KEY);
    console.log('[PromptsCache] Prompt cache cleared');
  } catch (error) {
    console.error('[PromptsCache] Failed to clear prompt cache:', error);
  }
}

/**
 * Clear usage data (for testing or reset)
 */
export async function clearUsageData(): Promise<void> {
  try {
    await StorageUtils.remove(USAGE_TRACKING_KEY);
    console.log('[PromptsCache] Usage data cleared');
  } catch (error) {
    console.error('[PromptsCache] Failed to clear usage data:', error);
  }
}
