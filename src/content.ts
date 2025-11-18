/**
 * Content Script - Manifest V3 Compatible
 *
 * This content script acts as a bridge between the page context and the extension's
 * background service worker. It injects the interceptor script into the page and
 * relays intercepted VTT subtitle content to the background script.
 *
 * Architecture:
 * - Runs in isolated content script context (limited DOM/window access)
 * - Injects interceptor.js into page context (full window/native API access)
 * - Listens for postMessage events from the injected interceptor
 * - Forwards VTT content to background via chrome.runtime.sendMessage
 * - Implements duplicate filtering for thumbnail VTT files
 *
 * Communication Flow:
 * Page Context (interceptor.js) -> window.postMessage ->
 * Content Script (this file) -> chrome.runtime.sendMessage ->
 * Background Script (service worker)
 *
 * @module content
 */

import { initializeCaptionEnabler } from './utils/caption-enabler.js';
import { injectFloatingIcon } from './floating-icon.js';
import { logger } from './utils/logger';
import { isThumbnailVTT } from './utils/vtt.js';

/**
 * Injects the interceptor script into the page context
 *
 * The interceptor must run in the page's context (not isolated content script context)
 * to have access to native fetch() and XMLHttpRequest before they're called by the page.
 * This function creates a <script> tag pointing to the interceptor.js file.
 *
 * The injected script:
 * - Overrides window.fetch and XMLHttpRequest
 * - Detects VTT subtitle file requests
 * - Posts VTT content back via window.postMessage
 *
 * Error handling:
 * - Logs success/failure of injection
 * - Attempts to append to document.head or documentElement
 * - Reports the URL being injected for debugging
 *
 * @returns void
 */
function injectInterceptor(): void {
  try {
    const url = chrome.runtime.getURL('interceptor.js');

    logger.log('[Content Script] 🔧 Attempting to inject interceptor from:', url);

    const alreadyInjected =
      !!document.querySelector('script[data-vtt-interceptor="true"]') ||
      Array.from(document.scripts).some((s) => s.src === url);
    if (alreadyInjected) {
      logger.log('[Content Script] ⏭️ Interceptor already injected, skipping');
      return;
    }

    const script = document.createElement('script');

    script.src = url;
    script.type = 'text/javascript';
    script.async = false;
    script.setAttribute('data-vtt-interceptor', 'true');
    script.id = 'vtt-interceptor-script';

    script.onload = () => {
      logger.log('[Content Script] ✅ Interceptor injected successfully');
      // Don't remove the script, let it run
    };

    script.onerror = (error) => {
      logger.error('[Content Script] ❌ Failed to inject interceptor:', error);
      logger.error('[Content Script] 📍 Attempted URL:', url);
    };

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(script);
      logger.log('[Content Script] 📤 Script appended to DOM');
    } else {
      logger.error('[Content Script] ❌ Could not find document.head or documentElement');
    }
  } catch (err) {
    logger.error('[Content Script] ❌ Exception during injection:', err);
  }
}

/**
 * Message listener for intercepted VTT content from the page context
 *
 * The injected interceptor script uses window.postMessage to send VTT content
 * from the page context to this content script. This listener:
 *
 * 1. Validates message source (must be from same window)
 * 2. Filters out thumbnail VTT files (sprite sheets for video previews)
 * 3. Forwards valid subtitle VTT content to background script
 *
 * Security:
 * - Only accepts messages from the same window (event.source === window)
 * - Validates message type before processing
 *
 * Message Format:
 * {
 *   type: 'VTT_INTERCEPTOR_FOUND',
 *   url: string,      // URL where VTT was fetched from
 *   content: string   // The actual VTT subtitle content
 * }
 *
 * @param event - MessageEvent from window.postMessage
 */
window.addEventListener('message', (event: MessageEvent) => {
  // Security check: only accept messages from the same window
  if (event.source !== window) return;

  // Process VTT interceptor messages
  if (event.data.type === 'VTT_INTERCEPTOR_FOUND') {
    const { url, content } = event.data;

    // Additional filtering: Skip thumbnail VTT files at content script level
    // This provides a second layer of defense in case interceptor missed it
    if (isThumbnailVTT(content)) {
      logger.log(
        '[Content Script] ⏭️  Skipping thumbnail VTT (detected in content script):',
        content.length,
        'bytes'
      );
      return;
    }

    logger.log('[Content Script] 📨 Received VTT from interceptor:', content.length, 'bytes');
    logger.log('[Content Script] 📍 VTT content:', content);

    // Inject the floating robot icon when captions are found
    try {
      injectFloatingIcon();
    } catch (err) {
      logger.error('[Content Script] Failed to inject floating icon:', err);
    }

    // Forward valid VTT content to background script
    try {
      chrome.runtime.sendMessage({
        action: 'vttFound',
        url,
        content,
        pageUrl: window.location.href,
      });
    } catch (err) {
      logger.error('[Content Script] Failed to send message to background:', err);
    }
  }
});

/**
 * Attempts to inject the interceptor script with retry logic
 *
 * The interceptor must be injected as early as possible to intercept network
 * requests before the page makes them. This function:
 *
 * - Checks if document is ready for script injection
 * - Retries injection if document isn't ready (with 100ms delay)
 * - Ensures interceptor is loaded before page makes subtitle requests
 *
 * Timing is critical: if injected too late, the page may have already
 * fetched subtitles and the interceptor will miss them.
 *
 * @returns void
 */
function tryInjectInterceptor(): void {
  try {
    logger.log('[Content Script] 🚀 Initializing interceptor injection...');

    // Try multiple times in case document isn't ready
    if (!document.documentElement) {
      logger.log('[Content Script] ⏳ Document not ready, retrying...');
      setTimeout(tryInjectInterceptor, 100);
      return;
    }

    injectInterceptor();
  } catch (err) {
    logger.error('[Content Script] Error in tryInjectInterceptor:', err);
  }
}

/**
 * Initialization: Inject interceptor as early as possible
 *
 * Strategy:
 * - If document is still loading, wait for DOMContentLoaded event
 * - Also try injecting immediately (in case we're very early in page lifecycle)
 * - If document is already loaded, inject immediately
 *
 * This dual approach ensures the interceptor is loaded ASAP regardless of
 * when the content script executes relative to page load.
 */
if (document.readyState === 'loading') {
  // Document still loading - wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', tryInjectInterceptor, { once: true });
  // Also try immediately in case we can inject even earlier
  tryInjectInterceptor();
} else {
  // Document already loaded - inject immediately
  tryInjectInterceptor();
}

initializeCaptionEnabler();
