/**
 * Usage Tracking Utility
 *
 * Tracks daily summary usage for analytics purposes.
 * This is a free extension with unlimited summaries - no limits enforced.
 */

import StorageUtils from './storage.js';

/**
 * Usage tracking interface
 */
export interface DailyUsage {
  date: string; // YYYY-MM-DD format
  count: number;
}

export const USAGE_TRACKING_KEY = 'dailyUsage';

/**
 * Get today's usage tracking (for analytics)
 */
export async function getTodayUsage(): Promise<DailyUsage> {
  try {
    const today = new Date().toISOString().split('T')[0]!;
    const allUsage = (await StorageUtils.get<DailyUsage[]>(USAGE_TRACKING_KEY)) || [];

    let todayUsage = allUsage.find((usage) => usage.date === today);

    if (!todayUsage) {
      todayUsage = { date: today, count: 0 };
    }

    return todayUsage;
  } catch (error) {
    console.error('[UsageTracking] Failed to get today usage:', error);
    const today = new Date().toISOString().split('T')[0]!;
    return { date: today, count: 0 };
  }
}

/**
 * Increment today's usage count (for analytics)
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
    console.log('[UsageTracking] Usage incremented for today:', todayUsage.count);
  } catch (error) {
    console.error('[UsageTracking] Failed to increment usage:', error);
  }
}

/**
 * Clear usage data (for testing or reset)
 */
export async function clearUsageData(): Promise<void> {
  try {
    await StorageUtils.remove(USAGE_TRACKING_KEY);
    console.log('[UsageTracking] Usage data cleared');
  } catch (error) {
    console.error('[UsageTracking] Failed to clear usage data:', error);
  }
}
