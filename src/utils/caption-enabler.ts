/**
 * Caption Enabler - Automatic caption/subtitle enabler for video platforms
 *
 * This module provides a lightweight service that automatically enables
 * captions/subtitles across different video platforms (YouTube, etc.).
 * It monitors page navigation and ensures captions are enabled when videos load.
 *
 * ## Architecture Overview
 *
 * The module follows a plugin-based architecture:
 * 1. **CaptionEnabler Interface**: Defines the contract for platform-specific implementations
 * 2. **Platform Enablers**: Concrete implementations (e.g., YouTubeEnabler)
 * 3. **Enabler Registry**: Centralized list of all available enablers
 * 4. **Initialization System**: Handles setup, monitoring, and cleanup
 *
 * ## Key Features
 *
 * - **Automatic Detection**: Identifies the current platform and applies appropriate enabler
 * - **SPA Support**: Monitors URL changes for Single Page Applications (YouTube, etc.)
 * - **Navigation Handling**: Responds to browser back/forward navigation
 * - **Smart State Management**: Only enables captions when explicitly disabled
 * - **Performance Optimized**: Uses efficient polling instead of expensive DOM observers
 * - **Memory Safe**: Proper cleanup prevents memory leaks
 *
 * ## Usage
 *
 * ```typescript
 * // Initialize once in your content script
 * import { initializeCaptionEnabler } from './caption-enabler';
 * initializeCaptionEnabler();
 * ```
 *
 * ## Adding New Platforms
 *
 * 1. Create a new enabler implementing the CaptionEnabler interface
 * 2. Add it to the CAPTION_ENABLERS array
 * 3. Test on the target platform
 *
 * Example:
 * ```typescript
 * const VimeoEnabler: CaptionEnabler = {
 *   name: 'Vimeo',
 *   canHandle: () => location.hostname.includes('vimeo.com'),
 *   areCaptionsEnabled: () => { ... },
 *   enableCaptions: async () => { ... }
 * };
 * ```
 *
 * @module caption-enabler
 * @author CapSummarize Extension
 * @version 1.0.0
 */

import { logger } from './logger';
/**
 * Represents the state of captions on a video platform
 * @enum {boolean | null}
 */
type CaptionState = boolean | null;

/**
 * Base interface for platform-specific caption enablers
 *
 * Each platform (YouTube, Vimeo, etc.) should implement this interface
 * to provide custom logic for detecting and enabling captions.
 *
 * @interface CaptionEnabler
 * @example
 * ```typescript
 * const customEnabler: CaptionEnabler = {
 *   name: 'CustomPlatform',
 *   canHandle: () => location.hostname.includes('custom.com'),
 *   areCaptionsEnabled: () => {
 *     // Check if captions are enabled
 *     return true;
 *   },
 *   enableCaptions: async () => {
 *     // Enable captions logic
 *     return true;
 *   }
 * };
 * ```
 */
export interface CaptionEnabler {
  /**
   * Human-readable name of the platform
   * @example "YouTube", "Vimeo", "Netflix"
   */
  readonly name: string;

  /**
   * Determines if this enabler can handle the current page
   * @returns {boolean} True if this enabler supports the current platform
   */
  canHandle(): boolean;

  /**
   * Checks the current state of captions on the page
   * @returns {CaptionState} True if enabled, false if disabled, null if unknown/unavailable
   */
  areCaptionsEnabled(): CaptionState;

  /**
   * Attempts to enable captions on the current video
   * @returns {Promise<boolean>} Promise that resolves to true if captions were successfully enabled
   * @throws May throw if the operation fails critically
   */
  enableCaptions(): Promise<boolean>;
}

/**
 * Configuration constants for timing and delays
 */
const TIMING = {
  /**
   * Time to wait for video player to be ready before enabling captions
   */
  PLAYER_READY_DELAY: 1000,

  /**
   * Time to wait for caption state to update after clicking button
   */
  STATE_UPDATE_DELAY: 300,

  /**
   * Time to wait after URL change before attempting to enable captions
   */
  URL_CHANGE_DELAY: 2000,

  /**
   * Interval for checking URL changes in SPA navigation
   */
  URL_CHECK_INTERVAL: 1000,
} as const;

/**
 * CSS selectors for platform-specific elements
 */
const SELECTORS = {
  YOUTUBE_CAPTION_BUTTON: 'button.ytp-subtitles-button',
} as const;

/**
 * Utility function to create a promise-based delay
 *
 * @param {number} ms - Time to wait in milliseconds
 * @returns {Promise<void>} Promise that resolves after the specified delay
 * @example
 * ```typescript
 * await delay(1000); // Wait for 1 second
 * ```
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * YouTube Caption Enabler
 *
 * Handles automatic caption enabling for YouTube videos.
 * Works with YouTube's custom video player by interacting with
 * the subtitle button via its aria-pressed attribute.
 *
 * @implements {CaptionEnabler}
 * @example
 * ```typescript
 * if (YouTubeEnabler.canHandle()) {
 *   const enabled = await YouTubeEnabler.enableCaptions();
 *   logger.log('Captions enabled:', enabled);
 * }
 * ```
 */
export const YouTubeEnabler: CaptionEnabler = {
  name: 'YouTube',

  /**
   * Checks if the current page is a YouTube page
   * @returns {boolean} True if on youtube.com domain
   */
  canHandle: () =>
    location.hostname.includes('youtube.com') ||
    location.hostname.includes('drive.google.com') ||
    location.hostname.includes('sites.google.com'),

  /**
   * Checks if captions are currently enabled on YouTube
   * @returns {CaptionState} True if enabled, false if disabled, null if button not found
   */
  areCaptionsEnabled: () => {
    const captionButton = document.querySelector(SELECTORS.YOUTUBE_CAPTION_BUTTON);

    if (!captionButton) {
      return null; // Button not found, state unknown
    }

    const isPressed = captionButton.getAttribute('aria-pressed');
    return isPressed === 'true';
  },

  /**
   * Attempts to enable captions on the current YouTube video
   *
   * Process:
   * 1. Locates the caption button in the YouTube player
   * 2. Checks current state via aria-pressed attribute
   * 3. Clicks button only if captions are explicitly disabled
   * 4. Waits for state update and verifies success
   *
   * @returns {Promise<boolean>} True if captions are enabled (or already were), false otherwise
   */
  enableCaptions: async () => {
    const captionButton = document.querySelector(
      SELECTORS.YOUTUBE_CAPTION_BUTTON
    ) as HTMLElement | null;

    if (!captionButton) {
      logger.warn('[YouTubeEnabler] ⚠️  Caption button not found');
      return false;
    }

    const currentState = captionButton.getAttribute('aria-pressed');

    // Case 1: Captions are already enabled
    if (currentState === 'true') {
      logger.log('[YouTubeEnabler] ✅ Captions already enabled');
      return true;
    }

    // Case 2: Captions are explicitly disabled - enable them
    if (currentState === 'false') {
      logger.log('[YouTubeEnabler] 🖱️  Enabling captions...');

      // Wait for video player to be fully initialized
      await delay(TIMING.PLAYER_READY_DELAY);

      // Click the caption button
      captionButton.click();

      // Wait for state to update in the DOM
      await delay(TIMING.STATE_UPDATE_DELAY);

      // Verify the state change
      const newState = captionButton.getAttribute('aria-pressed') === 'true';
      const statusIcon = newState ? '✅' : '❌';
      const statusText = newState ? 'enabled' : 'failed';

      logger.log(`[YouTubeEnabler] ${statusIcon} Captions ${statusText}`);
      return newState;
    }

    // Case 3: Unknown state - skip to avoid unexpected behavior
    logger.warn('[YouTubeEnabler] ⚠️  Unknown caption state, skipping');
    return false;
  },
};

/**
 * Registry of all available caption enablers
 *
 * Add new platform-specific enablers to this array to support
 * additional video platforms. The first enabler whose canHandle()
 * method returns true will be used for the current page.
 *
 * @type {CaptionEnabler[]}
 */
const CAPTION_ENABLERS: readonly CaptionEnabler[] = [
  YouTubeEnabler,
  // Add more platform enablers here
  // Example: VimeoEnabler, NetflixEnabler, etc.
] as const;

/**
 * Finds and returns the appropriate caption enabler for the current platform
 *
 * @returns {CaptionEnabler | undefined} The matching enabler, or undefined if none found
 * @private
 */
function findEnabler(): CaptionEnabler | undefined {
  return CAPTION_ENABLERS.find((enabler) => enabler.canHandle());
}

/**
 * Attempts to enable captions once on the current page
 *
 * This function:
 * 1. Finds the appropriate enabler for the current platform
 * 2. Checks if captions are already enabled
 * 3. Enables captions only if they are explicitly disabled
 * 4. Skips if captions are already on or state is unknown
 *
 * @returns {Promise<void>} Promise that resolves when the attempt is complete
 * @private
 *
 * @example
 * ```typescript
 * // Called automatically on page load or navigation
 * await attemptEnableCaptions();
 * ```
 */
async function attemptEnableCaptions(): Promise<void> {
  logger.log('[CaptionEnabler] 🚀 Attempting to enable captions...');

  const enabler = findEnabler();

  if (!enabler) {
    logger.log('[CaptionEnabler] ⏭️  No enabler found for this platform');
    return;
  }

  const captionState = enabler.areCaptionsEnabled();

  // Captions already enabled - nothing to do
  if (captionState === true) {
    logger.log(`[CaptionEnabler] ✅ Captions already enabled on ${enabler.name}`);
    return;
  }

  // Captions explicitly disabled - enable them
  if (captionState === false) {
    logger.log(`[CaptionEnabler] 🎬 Enabling captions on ${enabler.name}...`);
    await enabler.enableCaptions();
    return;
  }

  // State unknown (null) - skip to avoid unexpected behavior
  logger.log(`[CaptionEnabler] ⚠️  Caption state unknown on ${enabler.name}, skipping`);
}

/**
 * Interface for managing cleanup state
 */
interface CleanupState {
  urlCheckInterval: ReturnType<typeof setInterval> | null;
  popstateHandler: (() => void) | null;
  unloadHandler: (() => void) | null;
}

/**
 * Global cleanup state for the caption enabler
 * Tracks all active listeners and intervals for proper cleanup
 */
const cleanupState: CleanupState = {
  urlCheckInterval: null,
  popstateHandler: null,
  unloadHandler: null,
};

/**
 * Cleans up all event listeners and intervals
 *
 * This function should be called when:
 * - The page is being unloaded
 * - The extension is being disabled
 * - Manual cleanup is needed
 *
 * Ensures no memory leaks by removing all listeners and clearing intervals.
 *
 * @returns {void}
 * @public
 */
function cleanup(): void {
  logger.log('[CaptionEnabler] 🧹 Starting cleanup...');

  // Clear URL monitoring interval
  if (cleanupState.urlCheckInterval) {
    clearInterval(cleanupState.urlCheckInterval);
    cleanupState.urlCheckInterval = null;
    logger.log('[CaptionEnabler]    ✓ Cleared URL check interval');
  }

  // Remove popstate event listener
  if (cleanupState.popstateHandler) {
    window.removeEventListener('popstate', cleanupState.popstateHandler);
    cleanupState.popstateHandler = null;
    logger.log('[CaptionEnabler]    ✓ Removed popstate listener');
  }

  // Remove unload event listener
  if (cleanupState.unloadHandler) {
    window.removeEventListener('unload', cleanupState.unloadHandler);
    cleanupState.unloadHandler = null;
    logger.log('[CaptionEnabler]    ✓ Removed unload listener');
  }

  logger.log('[CaptionEnabler] ✅ Cleanup completed');
}

/**
 * Sets up URL change monitoring for Single Page Applications (SPAs)
 *
 * Many video platforms (like YouTube) use client-side routing, which means
 * traditional page load events don't fire on navigation. This function sets up
 * efficient polling to detect URL changes and trigger caption enabling.
 *
 * @param {() => void} onUrlChange - Callback to execute when URL changes
 * @returns {void}
 * @private
 */
function setupUrlChangeMonitoring(onUrlChange: () => void): void {
  let lastUrl = location.href;

  // Poll for URL changes at regular intervals (low performance impact)
  cleanupState.urlCheckInterval = setInterval(() => {
    const currentUrl = location.href;

    if (currentUrl !== lastUrl) {
      logger.log('[CaptionEnabler] 🔄 URL changed detected');
      lastUrl = currentUrl;

      // Wait for new content to load before attempting to enable captions
      setTimeout(onUrlChange, TIMING.URL_CHANGE_DELAY);
    }
  }, TIMING.URL_CHECK_INTERVAL);

  logger.log('[CaptionEnabler] 👂 URL change monitoring started');
}

/**
 * Sets up browser navigation event listeners
 *
 * Listens for browser back/forward navigation (popstate events)
 * and triggers caption enabling after the page content loads.
 *
 * @param {() => void} onNavigation - Callback to execute on navigation
 * @returns {void}
 * @private
 */
function setupNavigationListeners(onNavigation: () => void): void {
  // Handle browser back/forward button navigation
  cleanupState.popstateHandler = () => {
    logger.log('[CaptionEnabler] ⬅️  Browser navigation detected');
    setTimeout(onNavigation, TIMING.URL_CHANGE_DELAY);
  };
  window.addEventListener('popstate', cleanupState.popstateHandler);

  // Handle page unload for cleanup
  cleanupState.unloadHandler = cleanup;
  window.addEventListener('unload', cleanupState.unloadHandler);

  logger.log('[CaptionEnabler] � Navigation listeners registered');
}

/**
 * Handles initial page load caption enabling
 *
 * Waits for DOM to be ready before attempting to enable captions.
 * If DOM is already loaded, attempts immediately.
 *
 * @returns {void}
 * @private
 */
function handleInitialLoad(): void {
  if (document.readyState === 'loading') {
    // DOM still loading - wait for it
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        void attemptEnableCaptions();
      },
      { once: true }
    );
    logger.log('[CaptionEnabler] ⏳ Waiting for DOM to load...');
  } else {
    // DOM already loaded - attempt immediately
    logger.log('[CaptionEnabler] 📄 DOM already loaded, attempting now...');
    void attemptEnableCaptions();
  }
}

/**
 * Initializes the caption enabler for the current page
 *
 * This is the main entry point for the caption enabler module.
 * Call this function once per page to set up automatic caption enabling.
 *
 * Features:
 * - Detects if the current platform is supported
 * - Enables captions on initial page load
 * - Monitors URL changes for SPA navigation (e.g., YouTube)
 * - Listens for browser back/forward navigation
 * - Automatically cleans up on page unload
 *
 * Performance considerations:
 * - Uses efficient polling (1 second interval) instead of expensive MutationObserver
 * - Minimal overhead on non-supported platforms (early exit)
 * - Proper cleanup prevents memory leaks
 *
 * @returns {void}
 * @public
 *
 * @example
 * ```typescript
 * // In your content script:
 * initializeCaptionEnabler();
 * ```
 */
export function initializeCaptionEnabler(): void {
  logger.log('[CaptionEnabler] 🎬 Starting initialization...');

  // Early exit if no enabler supports this platform
  const enabler = findEnabler();
  if (!enabler) {
    logger.log('[CaptionEnabler] ⏭️  Skipping - no enabler for this site');
    return;
  }

  logger.log(`[CaptionEnabler] ✨ Initializing for ${enabler.name}`);

  // Step 1: Handle initial page load
  handleInitialLoad();

  // Step 2: Monitor URL changes for SPA navigation
  setupUrlChangeMonitoring(() => {
    void attemptEnableCaptions();
  });

  // Step 3: Set up browser navigation listeners
  setupNavigationListeners(() => {
    void attemptEnableCaptions();
  });

  logger.log('[CaptionEnabler] ✅ Initialization complete');
}
