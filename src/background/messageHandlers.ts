/**
 * Message Handlers
 *
 * Central dispatcher for all Chrome extension messages.
 * Routes messages to appropriate handler functions.
 */

import { logger } from '../utils/logger.js';
import StorageUtils from '../utils/storage.js';
import {
  addToHistory,
  clearHistory,
  getHistoryItem,
  getHistorySummary,
} from '../utils/vttHistory.js';
import { sidePanelState } from './sidePanelManager.js';
import { getVttStorageKey } from './storageHelpers.js';
import { vttCacheManager } from './vttCacheManager.js';
import { MESSAGE_ACTIONS } from '../utils/constants.js';

/**
 * Response type for message handlers
 */
export interface MessageResponse {
  success: boolean;
  summary?: string;
  answer?: string;
  vtt?: string;
  url?: string;
  error?: string;
  hasVTT?: boolean;
}

/**
 * Handles VTT found message from content script.
 *
 * @param tabId - Browser tab ID
 * @param message - Message data containing url, content, pageUrl
 * @param sendResponse - Response callback
 */
export async function handleVTTFound(
  tabId: number,
  message: any,
  sendResponse: (response: any) => void
): Promise<void> {
  const { url, content, pageUrl } = message;

  if (!content || content.trim().length === 0) {
    logger.log('[MessageHandlers] ❌ Empty VTT content received, ignoring.');
    return;
  }

  // Store in cache
  const success = await vttCacheManager.storeVTT(tabId, url, content, pageUrl);

  // Add to history
  try {
    const historyItem = await addToHistory(pageUrl, url, content);
    logger.log('[MessageHandlers] Added to history:', historyItem.id);

    // Notify sidepanel if it's open
    try {
      chrome.runtime
        .sendMessage({
          action: MESSAGE_ACTIONS.VTT_HISTORY_UPDATED,
          historyItem: {
            id: historyItem.id,
            title: historyItem.title,
            pageUrl: historyItem.pageUrl,
            timestamp: historyItem.timestamp,
            favicon: historyItem.favicon,
          },
        })
        .catch(() => {
          // Sidepanel might not be open, that's okay
        });
    } catch {
      // Ignore if sidepanel is not listening
    }
  } catch (err) {
    logger.error('[MessageHandlers] Failed to add to history:', err);
  }

  sendResponse({ success });
}

/**
 * Handles VTT status check request.
 *
 * @param tabId - Browser tab ID
 * @param sendResponse - Response callback
 */
export async function handleGetVTTStatus(
  tabId: number | undefined,
  sendResponse: (response: { hasVTT: boolean }) => void
): Promise<void> {
  if (!tabId) {
    sendResponse({ hasVTT: false });
    return;
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    const hasVTT = await vttCacheManager.hasVTT(tabId, tab.url);

    logger.log('[MessageHandlers] VTT status check for tab', tabId, ':', hasVTT);
    logger.log('[MessageHandlers] Current cache keys:', vttCacheManager.getCachedTabIds());

    sendResponse({ hasVTT });
  } catch (error) {
    logger.error('[MessageHandlers] Error checking VTT status:', error);
    sendResponse({ hasVTT: false });
  }
}

/**
 * Handles VTT content retrieval request.
 *
 * @param tabId - Browser tab ID
 * @param tabUrl - Tab URL for storage lookup
 * @param sendResponse - Response callback
 */
export async function handleGetVTTContent(
  tabId: number | undefined,
  tabUrl: string | undefined,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    if (!tabId && !tabUrl) {
      sendResponse({ success: false, error: 'No tab context' });
      return;
    }

    const vttData = tabId ? await vttCacheManager.getVTT(tabId, tabUrl) : undefined;
    let content = vttData?.content;
    const url = tabUrl;

    if (!content && tabUrl) {
      try {
        const storageKey = getVttStorageKey(tabUrl);
        const cachedVtt = await StorageUtils.get<{ content?: string }>(storageKey);
        if (cachedVtt?.content) {
          content = cachedVtt.content;
        }
      } catch {
        // Ignore storage errors, will return 'No VTT found'
      }
    }

    if (!content) {
      sendResponse({ success: false, error: 'No VTT found' });
      return;
    }

    sendResponse({ success: true, vtt: content, url });
  } catch (error) {
    sendResponse({ success: false, error: 'Failed to get VTT' });
  }
}

/**
 * Handles side panel open/toggle request.
 *
 * @param tabId - Browser tab ID
 * @param sendResponse - Response callback
 */
export function handleOpenSidePanel(tabId: number, sendResponse: (response: any) => void): void {
  try {
    // CRITICAL: Call sidePanel.open() immediately without any async operations
    // to preserve the user gesture context from the content script click
    logger.log('[MessageHandlers] 🎯 Opening side panel for tab:', tabId);

    // Open the side panel synchronously
    chrome.sidePanel
      .open({ tabId })
      .then(() => {
        logger.log('[MessageHandlers] ✅ Side panel opened successfully');

        // Now get window info for state tracking (after the panel is already opening)
        chrome.tabs.get(tabId, (tab) => {
          if (tab.windowId) {
            sidePanelState.set(tab.windowId, true);
          }
          sendResponse({ success: true, action: 'opened' });
        });
      })
      .catch((err: Error) => {
        logger.error('[MessageHandlers] ❌ Failed to open side panel:', err);
        sendResponse({ success: false, error: err.message || String(err) });
      });
  } catch (err) {
    logger.error('[MessageHandlers] ❌ Exception opening side panel:', err);
    sendResponse({ success: false, error: String(err) });
  }
}

/**
 * Main message listener setup
 *
 * Routes incoming messages to appropriate handlers.
 */
export function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ): boolean | void => {
      // VTT Found: Content script detected a subtitle file
      if (message.action === MESSAGE_ACTIONS.VTT_FOUND && sender.tab?.id) {
        handleVTTFound(sender.tab.id, message, sendResponse);
        return true; // Keep async channel open
      }

      // Get VTT Status: Popup requesting VTT detection status
      if (message.action === MESSAGE_ACTIONS.GET_VTT_STATUS) {
        handleGetVTTStatus(message.tabId || sender.tab?.id, sendResponse);
        return true; // Keep async channel open
      }

      // Get VTT Content: Popup requesting raw VTT text
      if (message.action === MESSAGE_ACTIONS.GET_VTT_CONTENT) {
        handleGetVTTContent(
          message.tabId || sender.tab?.id,
          message.tabUrl || sender.tab?.url,
          sendResponse
        );
        return true; // Keep async channel open
      }

      // Open Side Panel: Floating icon or other component requests side panel
      if (
        message.action === MESSAGE_ACTIONS.OPEN_SIDE_PANEL ||
        message.action === MESSAGE_ACTIONS.OPEN_SIDE_PANEL_FROM_CONTENT
      ) {
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) {
          sendResponse({ success: false, error: 'No tab ID available' });
          return false;
        }
        handleOpenSidePanel(tabId, sendResponse);
        return true; // Keep async channel open for the response
      }

      // Side Panel Closed: Notification from side panel that it was closed
      if (message.action === MESSAGE_ACTIONS.SIDE_PANEL_CLOSED) {
        // This is handled in background.ts
        return false;
      }

      // Get VTT History: Request history summary
      if (message.action === MESSAGE_ACTIONS.GET_VTT_HISTORY) {
        getHistorySummary()
          .then((history) => {
            sendResponse({ success: true, history });
          })
          .catch((err) => {
            sendResponse({ success: false, error: String(err) });
          });
        return true; // Keep async channel open
      }

      // Get History Item: Request full history item including VTT content
      if (message.action === MESSAGE_ACTIONS.GET_HISTORY_ITEM) {
        getHistoryItem(message.historyId)
          .then((item) => {
            if (item) {
              sendResponse({ success: true, ...item });
            } else {
              sendResponse({ success: false, error: 'History item not found' });
            }
          })
          .catch((err) => {
            sendResponse({ success: false, error: String(err) });
          });
        return true; // Keep async channel open
      }

      // Clear VTT History: Remove all history items
      if (message.action === MESSAGE_ACTIONS.CLEAR_VTT_HISTORY) {
        clearHistory()
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((err) => {
            sendResponse({ success: false, error: String(err) });
          });
        return true; // Keep async channel open
      }
    }
  );
}
