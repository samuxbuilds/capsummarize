/**
 * VTT History Manager
 *
 * Manages a LIFO (Last In First Out) history of detected VTT subtitles.
 * Stores video metadata for quick access and summary generation.
 */

import StorageUtils from './storage.js';
import { extractTextFromVTT } from './vtt.js';

const VTT_HISTORY_KEY = 'vttHistory';
const DEFAULT_MAX_HISTORY = 10;
const HISTORY_CONFIG_KEY = 'historyConfig';

/**
 * VTT History Item
 */
export interface VTTHistoryItem {
  id: string; // Unique identifier
  title: string; // Video title (first 25 words of transcript)
  pageUrl: string; // YouTube/video page URL
  captionUrl: string; // VTT file URL
  vttContent: string; // Full VTT content
  timestamp: number; // When detected
  favicon?: string; // Site favicon for display
}

/**
 * History Configuration
 */
export interface HistoryConfig {
  maxSize: number;
}

/**
 * Get history configuration
 */
export async function getHistoryConfig(): Promise<HistoryConfig> {
  try {
    const config = await StorageUtils.get<HistoryConfig>(HISTORY_CONFIG_KEY);
    return config || { maxSize: DEFAULT_MAX_HISTORY };
  } catch {
    return { maxSize: DEFAULT_MAX_HISTORY };
  }
}

/**
 * Update history configuration
 */
export async function updateHistoryConfig(config: Partial<HistoryConfig>): Promise<void> {
  const current = await getHistoryConfig();
  const updated = { ...current, ...config };
  await StorageUtils.set(HISTORY_CONFIG_KEY, updated);
}

/**
 * Generate a unique ID for history item
 */
function generateHistoryId(pageUrl: string, captionUrl: string, timestamp: number): string {
  return `${btoa(pageUrl).substring(0, 10)}_${timestamp}`;
}

/**
 * Extract first N words from VTT content as title
 */
function extractTitle(vttContent: string, maxWords: number = 25): string {
  try {
    const text = extractTextFromVTT(vttContent);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const titleWords = words.slice(0, maxWords);
    return titleWords.join(' ') + (words.length > maxWords ? '...' : '');
  } catch {
    return 'Untitled Video';
  }
}

/**
 * Get favicon URL for a page
 */
function getFaviconUrl(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    return `${url.protocol}//${url.hostname}/favicon.ico`;
  } catch {
    return '';
  }
}

/**
 * Add VTT to history (LIFO - newest first)
 */
export async function addToHistory(
  pageUrl: string,
  captionUrl: string,
  vttContent: string
): Promise<VTTHistoryItem> {
  const config = await getHistoryConfig();
  const history = await getHistory();

  const timestamp = Date.now();
  const id = generateHistoryId(pageUrl, captionUrl, timestamp);

  // Check if this exact video is already in history (by pageUrl)
  const existingIndex = history.findIndex((item) => item.pageUrl === pageUrl);

  const newItem: VTTHistoryItem = {
    id,
    title: extractTitle(vttContent),
    pageUrl,
    captionUrl,
    vttContent,
    timestamp,
    favicon: getFaviconUrl(pageUrl),
  };

  // Remove existing entry if found (will re-add at top)
  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  // Add to beginning (LIFO)
  history.unshift(newItem);

  // Enforce max size
  if (history.length > config.maxSize) {
    history.splice(config.maxSize);
  }

  await StorageUtils.set(VTT_HISTORY_KEY, history);

  return newItem;
}

/**
 * Get full history
 */
export async function getHistory(): Promise<VTTHistoryItem[]> {
  try {
    const history = await StorageUtils.get<VTTHistoryItem[]>(VTT_HISTORY_KEY);
    return history || [];
  } catch {
    return [];
  }
}

/**
 * Get history item by ID
 */
export async function getHistoryItem(id: string): Promise<VTTHistoryItem | null> {
  const history = await getHistory();
  return history.find((item) => item.id === id) || null;
}

/**
 * Remove history item by ID
 */
export async function removeHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => item.id !== id);
  await StorageUtils.set(VTT_HISTORY_KEY, filtered);
}

/**
 * Clear all history
 */
export async function clearHistory(): Promise<void> {
  await StorageUtils.set(VTT_HISTORY_KEY, []);
}

/**
 * Get history summary (with VTT content for preview generation)
 */
export async function getHistorySummary(): Promise<VTTHistoryItem[]> {
  const history = await getHistory();
  return history;
}
