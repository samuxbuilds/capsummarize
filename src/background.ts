/**
 * Background service worker for the CapSummarize browser extension.
 *
 * Main entry point for the Chrome extension's background script.
 * Coordinates extension functionality, handles events, and manages
 * communication between different components.
 *
 * Key responsibilities:
 * - Extension lifecycle events (install, startup, etc.)
 * - Tab management and VTT cache coordination
 * - Message routing between extension components
 * - Side panel state management
 * - VTT history and storage operations
 *
 * Dependencies:
 * - messageHandlers.ts: Central message dispatcher
 * - vttCacheManager.ts: VTT content caching and retrieval
 * - sidePanelManager.ts: Side panel state and lifecycle
 * - storageHelpers.ts: Storage key generation and utilities
 */

import { logger } from './utils/logger.js';
import { vttCacheManager } from './background/vttCacheManager.js';
import { setupMessageListener } from './background/messageHandlers.js';
import { sidePanelState } from './background/sidePanelManager.js';
import { MESSAGE_ACTIONS, UI_CONSTANTS } from './utils/constants.js';

/**
 * Handles extension action icon clicks to toggle the sidepanel.
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.windowId) return;

  try {
    const windowId = tab.windowId;
    const isOpen = sidePanelState.get(windowId) || false;

    if (isOpen) {
      // Close by opening and immediately closing - this triggers a toggle effect
      logger.log('[Background] 🔽 Toggling side panel closed for window:', windowId);
      // The side panel API doesn't have a direct close method, so we toggle state
      // The user can close it manually, and we'll track that via messages
      sidePanelState.set(windowId, false);

      // Send message to side panel to close itself
      chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.CLOSE_SIDE_PANEL }).catch(() => {
        // Side panel might not be listening, that's okay
      });

      logger.log('[Background] ✅ Close signal sent');
    } else {
      // Open the side panel
      logger.log('[Background] 🎯 Opening side panel for tab:', tab.id);
      await chrome.sidePanel.open({ tabId: tab.id });
      sidePanelState.set(windowId, true);
      logger.log('[Background] ✅ Side panel opened');
    }
  } catch (err) {
    logger.error('[Background] ❌ Failed to toggle side panel:', err);
  }
});

/**
 * Cleans up in-memory VTT cache when browser tabs are closed.
 */
chrome.tabs.onRemoved.addListener((tabId: number) => {
  vttCacheManager.clearTab(tabId);
});

/**
 * Automatically restores cached VTT data when tabs navigate or reload.
 */
chrome.tabs.onUpdated.addListener(
  async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    // Only process when page has finished loading
    if (changeInfo.status === 'complete' && tab.url) {
      const wasLoaded = await vttCacheManager.autoLoadForTab(tabId, tab.url);

      // Update badge if VTT was loaded
      if (wasLoaded) {
        chrome.action.setBadgeText({ text: UI_CONSTANTS.BADGE_TEXT_SUCCESS, tabId });
        chrome.action.setBadgeBackgroundColor({ color: UI_CONSTANTS.BADGE_COLOR_SUCCESS, tabId });
      }
    }
  }
);

/**
 * Listen for side panel close notifications to update state
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === MESSAGE_ACTIONS.SIDE_PANEL_CLOSED) {
    // Reset state for all windows (we don't know which window closed)
    sidePanelState.clear();
    logger.log('[Background] 🔽 Side panel closed, state reset');

    // Notify all tabs that side panel is closed
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, { action: MESSAGE_ACTIONS.SIDE_PANEL_CLOSED })
            .catch(() => {
              // Tab might not have content script, ignore
            });
        }
      });
    });

    sendResponse({ success: true });
    return true;
  }

  if (message.action === MESSAGE_ACTIONS.CLOSE_SIDE_PANEL) {
    // Request to close side panel from floating icon
    logger.log('[Background] 🔽 Close side panel requested');

    // Send message to side panel to close itself
    chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.CLOSE_SIDE_PANEL }).catch(() => {
      // Side panel might not be listening, that's okay
    });

    sendResponse({ success: true });
    return true;
  }

  return false;
});

/**
 * Clean up state when windows are closed
 */
chrome.windows.onRemoved.addListener((windowId: number) => {
  sidePanelState.delete(windowId);
  logger.log('[Background] 🪟 Window closed, cleaned up state:', windowId);
});

// Setup message listener
setupMessageListener();

logger.log('[Background] 🚀 Service worker initialized');
