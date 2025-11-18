/**
 * VTT Cache Manager
 *
 * Manages in-memory and persistent storage of VTT subtitle content.
 * Provides efficient caching with automatic restoration from storage.
 */

import StorageUtils from '../utils/storage.js';
import { logger } from '../utils/logger.js';
import { getVttStorageKey, hashCaptionUrl } from './storageHelpers.js';

/**
 * Interface representing cached VTT (WebVTT) subtitle data for a browser tab.
 *
 * This interface encapsulates all the information needed to store and retrieve
 * video subtitle content, enabling efficient caching and reuse across browser sessions.
 */
export interface CachedVTT {
  /**
   * The URL of the VTT subtitle file
   */
  url: string;
  /**
   * The full text content of the VTT file
   */
  content: string;
  /**
   * Unix timestamp when this VTT data was cached
   */
  timestamp: number;
  /**
   * Hash of the caption URL for detecting changes in subtitle sources
   */
  captionUrlHash?: string;
  /**
   * The URL of the web page containing the video
   */
  pageUrl?: string;
}

/**
 * Maximum age for cached VTT content (7 days)
 */
const VTT_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * VTT Cache Manager class
 *
 * Manages in-memory cache and persistent storage for VTT subtitle content.
 */
export class VTTCacheManager {
  /**
   * In-memory cache mapping browser tab IDs to their VTT subtitle data.
   */
  private cache: Map<number, CachedVTT> = new Map();

  /**
   * Stores VTT content in both memory and persistent storage.
   *
   * @param tabId - Browser tab ID
   * @param vttUrl - URL of the VTT subtitle file
   * @param content - VTT content
   * @param pageUrl - URL of the page containing the video
   * @returns Promise resolving to success status
   */
  async storeVTT(
    tabId: number,
    vttUrl: string,
    content: string,
    pageUrl?: string
  ): Promise<boolean> {
    if (!content || content.length === 0) {
      logger.warn('[VTTCache] VTT content is empty, skipping');
      return false;
    }

    logger.log('[VTTCache] 🎯 Storing VTT:', {
      tabId,
      url: vttUrl.substring(0, 80),
      size: content.length,
    });

    // Generate caption URL hash
    const captionUrlHash = hashCaptionUrl(vttUrl);

    // Check if we already have cached data with different caption
    if (pageUrl) {
      const storageKey = getVttStorageKey(pageUrl);
      const existingCache = await StorageUtils.get<any>(storageKey);

      if (
        existingCache &&
        existingCache.captionUrlHash &&
        existingCache.captionUrlHash !== captionUrlHash
      ) {
        logger.log('[VTTCache] 🔄 Caption URL changed, updating cache...');
        logger.log('[VTTCache] Old hash:', existingCache.captionUrlHash);
        logger.log('[VTTCache] New hash:', captionUrlHash);
      }
    }

    // Store in memory cache
    this.cache.set(tabId, {
      url: vttUrl,
      content,
      timestamp: Date.now(),
      captionUrlHash,
      pageUrl,
    });

    // Persist to IndexedDB for future visits
    if (pageUrl) {
      const storageKey = getVttStorageKey(pageUrl);
      await StorageUtils.set(storageKey, {
        content,
        timestamp: Date.now(),
        videoUrl: pageUrl,
        captionUrl: vttUrl,
        captionUrlHash,
      }).catch((error: unknown) => {
        logger.error('[VTTCache] Failed to persist VTT content:', error);
      });

      logger.log('[VTTCache] 💾 VTT cached for page:', pageUrl);
      logger.log('[VTTCache] 🔑 Caption URL hash:', captionUrlHash);
    }

    return true;
  }

  /**
   * Retrieves VTT content for a tab, checking memory and storage.
   *
   * @param tabId - Browser tab ID
   * @param pageUrl - Optional page URL for storage lookup
   * @returns Promise resolving to CachedVTT or undefined
   */
  async getVTT(tabId: number, pageUrl?: string): Promise<CachedVTT | undefined> {
    // Check in-memory cache first
    let vttData = this.cache.get(tabId);

    // If not in memory, try to load from storage
    if (!vttData && pageUrl) {
      vttData = await this.loadFromStorage(tabId, pageUrl);
    }

    return vttData;
  }

  /**
   * Loads VTT content from persistent storage into memory cache.
   *
   * @param tabId - Browser tab ID
   * @param pageUrl - Page URL for storage lookup
   * @returns Promise resolving to CachedVTT or undefined
   */
  async loadFromStorage(tabId: number, pageUrl: string): Promise<CachedVTT | undefined> {
    try {
      const storageKey = getVttStorageKey(pageUrl);
      const cachedVtt = await StorageUtils.get<any>(storageKey);

      if (cachedVtt && cachedVtt.content) {
        // Check if cached VTT is still valid
        const now = Date.now();
        const age = now - (cachedVtt.timestamp || 0);

        if (age < VTT_CACHE_MAX_AGE) {
          logger.log('[VTTCache] 📂 Loading cached VTT from storage for:', pageUrl);
          logger.log('[VTTCache] 🔑 Caption URL hash:', cachedVtt.captionUrlHash);

          // Populate in-memory cache
          const vttData: CachedVTT = {
            url: cachedVtt.captionUrl || cachedVtt.videoUrl || pageUrl,
            content: cachedVtt.content,
            timestamp: cachedVtt.timestamp,
            captionUrlHash: cachedVtt.captionUrlHash,
            pageUrl: pageUrl,
          };

          this.cache.set(tabId, vttData);
          logger.log('[VTTCache] ✅ Restored VTT from cache');

          return vttData;
        } else {
          logger.log('[VTTCache] ⏰ Cached VTT expired, removing...');
          await StorageUtils.remove(storageKey);
        }
      }
    } catch (error) {
      logger.error('[VTTCache] Error loading cached VTT:', error);
    }

    return undefined;
  }

  /**
   * Checks if VTT content is available for a tab.
   *
   * @param tabId - Browser tab ID
   * @param pageUrl - Optional page URL for storage lookup
   * @returns Promise resolving to boolean indicating availability
   */
  async hasVTT(tabId: number, pageUrl?: string): Promise<boolean> {
    // Check in-memory cache first
    let hasVTT = this.cache.has(tabId);

    // If not in memory, try to load from storage
    if (!hasVTT && pageUrl) {
      const vttData = await this.loadFromStorage(tabId, pageUrl);
      hasVTT = !!vttData;
    }

    return hasVTT;
  }

  /**
   * Removes VTT content from memory cache.
   *
   * @param tabId - Browser tab ID
   */
  clearTab(tabId: number): void {
    this.cache.delete(tabId);
    logger.log('[VTTCache] 🗑️ Cleared cache for tab', tabId);
  }

  /**
   * Gets all cached tab IDs (for debugging).
   *
   * @returns Array of tab IDs
   */
  getCachedTabIds(): number[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Auto-loads VTT from storage when a tab is updated/reloaded.
   *
   * @param tabId - Browser tab ID
   * @param tabUrl - Page URL
   * @returns Promise resolving to boolean indicating if VTT was loaded
   */
  async autoLoadForTab(tabId: number, tabUrl: string): Promise<boolean> {
    // Skip if already in cache
    if (this.cache.has(tabId)) {
      return false;
    }

    try {
      const storageKey = getVttStorageKey(tabUrl);
      const cachedVtt = await StorageUtils.get<any>(storageKey);

      if (cachedVtt && cachedVtt.content) {
        // Check if cached VTT is still valid
        const now = Date.now();
        const age = now - (cachedVtt.timestamp || 0);

        if (age < VTT_CACHE_MAX_AGE) {
          logger.log('[VTTCache] 🔄 Auto-loading cached VTT for tab', tabId);
          logger.log('[VTTCache] 📍 Page URL:', tabUrl);
          logger.log('[VTTCache] 🔑 Caption hash:', cachedVtt.captionUrlHash);

          // Populate in-memory cache
          this.cache.set(tabId, {
            url: cachedVtt.captionUrl || cachedVtt.videoUrl || tabUrl,
            content: cachedVtt.content,
            timestamp: cachedVtt.timestamp,
            captionUrlHash: cachedVtt.captionUrlHash,
            pageUrl: tabUrl,
          });

          logger.log('[VTTCache] ✅ Auto-restored VTT from cache');
          return true;
        } else {
          logger.log('[VTTCache] ⏰ Cached VTT expired for:', tabUrl);
          await StorageUtils.remove(storageKey);
        }
      }
    } catch (error) {
      logger.error('[VTTCache] Error auto-loading cached VTT:', error);
    }

    return false;
  }
}

// Export singleton instance
export const vttCacheManager = new VTTCacheManager();
