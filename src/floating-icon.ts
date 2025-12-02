/**
 * Floating Icon Module
 * Displays a floating robot icon (🤖) when VTT subtitles are detected.
 * Clicking the icon toggles the side panel for generating summaries.
 *
 * Note: This icon is shown based on the vttFound event, not DOM selectors.
 */

import { logger } from './utils/logger';

const SPARKLES_ICON_SVG = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    style="width: 32px; height: 32px;"
  >
    <path
      d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
    ></path>
  </svg>
`;

// NOTE: Removed X/Grok specific icon and styles — only keeping YouTube handling here

// Track side panel state
let isSidePanelOpen = false;
// Track injection state to prevent duplicates
let isInjecting = false;

/**
 * Creates and injects a floating robot icon into the page
 * The icon appears when VTT subtitles are detected and toggles the side panel on click
 */
export function injectFloatingIcon(): void {
  // Prevent multiple injections
  if (document.getElementById('ai-summary-floating-icon')) {
    logger.log('[Floating Icon] Icon already exists');
    return;
  }

  if (isInjecting) {
    logger.log('[Floating Icon] Injection already in progress, skipping');
    return;
  }

  isInjecting = true;
  const onComplete = () => {
    isInjecting = false;
  };

  function setupYouTubePlacement(
    element: HTMLElement,
    inlineStyleFn: (element: HTMLElement) => void,
    fallbackMount: () => void,
    onComplete: () => void
  ): boolean {
    if (!location.hostname.includes('youtube.com')) {
      return false;
    }

    const selectors = [
      'ytd-watch-metadata #top-level-buttons-computed',
      '#above-the-fold #top-level-buttons-computed',
      '#top-level-buttons-computed',
    ];

    // Try to find any of the selectors
    const tryMount = (): boolean => {
      for (const selector of selectors) {
        const container = document.querySelector<HTMLElement>(selector);
        if (container) {
          inlineStyleFn(element);
          const firstButton = container.firstElementChild;
          container.insertBefore(element, firstButton ?? null);
          onComplete();
          return true;
        }
      }
      return false;
    };

    if (tryMount()) return true;

    // Poll for element instead of observing entire body
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds total
    const interval = setInterval(() => {
      attempts++;
      if (tryMount()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        if (!element.isConnected) {
          fallbackMount();
        }
        onComplete();
      }
    }, 500);

    return true;
  }

  function applyYouTubeButtonStyles(element: HTMLElement): void {
    element.innerHTML = `
    <span class="ai-summary-inline-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:rgba(248,250,252,0.15);color:#f4a7d8;">
      ${SPARKLES_ICON_SVG}
    </span>
    <span class="ai-summary-inline-label" style="font-size:14px;font-weight:600;color:#f8fafc;letter-spacing:0.01em;">Summarize</span>
  `;

    element.setAttribute(
      'style',
      `
      position: static;
      width: auto;
      height: auto;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px 16px;
      margin-right: 8px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(244, 114, 182, 0.22), rgba(6, 182, 212, 0.28));
      border: 1px solid rgba(244, 114, 182, 0.6);
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.35);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `
    );

    element.onmouseenter = () => {
      element.style.transform = 'translateY(-1px) scale(1.01)';
      element.style.boxShadow = '0 6px 22px rgba(236, 72, 153, 0.4)';
    };

    element.onmouseleave = () => {
      element.style.transform = 'scale(1)';
      element.style.boxShadow = '0 4px 18px rgba(15, 23, 42, 0.35)';
    };

    element.dataset.variant = 'youtube-inline';
  }

  // Removed X/Twitter placement — this module now only handles YouTube and a floating icon

  // Removed X/Twitter button styles — not used here anymore

  function setupTwitterPlacement(
    element: HTMLElement,
    inlineStyleFn: (element: HTMLElement) => void,
    fallbackMount: () => void,
    onComplete: () => void
  ): boolean {
    if (!location.hostname.includes('x.com') && !location.hostname.includes('twitter.com')) {
      return false;
    }

    // User requested to place before the "Grok actions" button
    // We look for the button with aria-label="Grok actions"
    const _selectors = [
      'button[aria-label="Grok actions"]',
      '[data-testid="GrokDrawerHeader"] button', // Fallback to buttons in header
    ];

    const tryAttach = (): boolean => {
      // First try to find the specific Grok actions button
      const grokButton = document.querySelector('button[aria-label="Grok actions"]');

      if (grokButton) {
        // We want to insert BEFORE this button's container if possible, or just before the button itself.
        // Looking at the structure provided:
        // <div class="css-175oi2r r-18u37iz r-1h0z5md"><button ...>
        // The button is inside a div. We should probably insert before that div if we can find it,
        // or just before the button if it's a direct child of a flex container.

        const parent = grokButton.parentElement;
        if (parent) {
          // Check if parent is the flex container holding the buttons
          // The structure shows:
          // <div class="css-175oi2r r-1awozwy r-18u37iz r-1cmwbt1 r-1wtj0ep">
          //   <div class="css-175oi2r r-18u37iz r-1h0z5md"><button ...></div>
          //   <div class="css-175oi2r r-1awozwy r-6koalj r-18u37iz">...</div>
          // </div>

          // So we likely want to insert before the parent of the button (the div wrapper)
          // if that parent is a child of the main row.

          const grandParent = parent.parentElement;
          if (grandParent) {
            inlineStyleFn(element);
            grandParent.insertBefore(element, parent);
            return true;
          }

          // Fallback: insert before the button directly
          inlineStyleFn(element);
          parent.insertBefore(element, grokButton);
          return true;
        }
      }

      // Fallback to previous method if specific button not found
      const header = document.querySelector('[data-testid="GrokDrawerHeader"]');
      if (header) {
        inlineStyleFn(element);
        if (header.firstChild) {
          header.insertBefore(element, header.firstChild);
        } else {
          header.appendChild(element);
        }
        return true;
      }

      return false;
    };

    if (tryAttach()) {
      onComplete();
      return true;
    }

    // Poll for element
    let attempts = 0;
    const maxAttempts = 10; // 5 seconds
    const interval = setInterval(() => {
      attempts++;
      if (tryAttach()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        if (!element.isConnected) {
          fallbackMount();
        }
        onComplete();
      }
    }, 500);

    return true;
  }

  function applyTwitterButtonStyles(element: HTMLElement): void {
    element.innerHTML = `
      <span class="ai-summary-inline-icon" style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;">
        ${SPARKLES_ICON_SVG}
      </span>
      <span class="ai-summary-inline-label" style="font-size:14px;font-weight:700;margin-left:6px;">Summarize</span>
    `;

    // X Style: Text + Icon, similar to "Post" or other actions
    element.setAttribute(
      'style',
      `
        position: static;
        width: auto;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(239, 243, 244, 0.1); /* Subtle background */
        border: 1px solid rgba(239, 243, 244, 0.2);
        color: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 100;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      `
    );

    // Force color to match X's text color
    element.style.color = 'rgba(239, 243, 244, 1.0)';

    element.onmouseenter = () => {
      element.style.background = 'rgba(239, 243, 244, 0.2)';
    };

    element.onmouseleave = () => {
      element.style.background = 'rgba(239, 243, 244, 0.1)';
    };

    element.dataset.variant = 'twitter-inline';
  }

  function setupUdemyPlacement(
    element: HTMLElement,
    inlineStyleFn: (element: HTMLElement) => void,
    fallbackMount: () => void,
    onComplete: () => void
  ): boolean {
    if (!location.hostname.includes('udemy.com')) {
      return false;
    }

    const selectors = [
      '[data-purpose="video-controls"]',
      'div[class*="control-bar--control-bar"]',
      '.shaka-controls-container',
      '.video-controls',
    ];

    const tryAttach = (): boolean => {
      for (const selector of selectors) {
        const container = document.querySelector<HTMLElement>(selector);
        if (!container) continue;

        inlineStyleFn(element);
        if (container.children.length > 0) {
          container.insertBefore(element, container.lastElementChild);
        } else {
          container.appendChild(element);
        }
        return true;
      }
      return false;
    };

    if (tryAttach()) {
      onComplete();
      return true;
    }

    // Poll for element
    let attempts = 0;
    const maxAttempts = 10; // 5 seconds
    const interval = setInterval(() => {
      attempts++;
      if (tryAttach()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        if (!element.isConnected) {
          fallbackMount();
        }
        onComplete();
      }
    }, 500);

    return true;
  }

  function applyUdemyButtonStyles(element: HTMLElement): void {
    element.innerHTML = `
      <span class="ai-summary-inline-icon" style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;">
        ${SPARKLES_ICON_SVG}
      </span>
      <span class="ai-summary-inline-label" style="font-size:14px;font-weight:700;letter-spacing:0.02em;">Summarize</span>
    `;

    // Udemy Style: Dark, clean, often white text on dark bg
    element.setAttribute(
      'style',
      `
        position: static;
        width: auto;
        height: auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        height: 32px; /* Match common button height */
        margin-right: 8px;
        border-radius: 4px; /* Udemy uses squarer buttons usually */
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Open Sans', -apple-system, sans-serif;
        font-weight: 700;
        z-index: 100;
      `
    );

    element.onmouseenter = () => {
      element.style.background = 'rgba(255, 255, 255, 0.3)';
    };

    element.onmouseleave = () => {
      element.style.background = 'rgba(255, 255, 255, 0.2)';
    };

    element.dataset.variant = 'udemy-inline';
  }

  function setupCourseraPlacement(
    element: HTMLElement,
    inlineStyleFn: (element: HTMLElement) => void,
    fallbackMount: () => void,
    onComplete: () => void
  ): boolean {
    if (!location.hostname.includes('coursera.org')) {
      return false;
    }

    const selectors = [
      '.rc-VideoControls',
      '.c-video-controls',
      '.video-js .vjs-control-bar',
      'div[class*="video-controls"]',
    ];

    const tryAttach = (): boolean => {
      for (const selector of selectors) {
        const container = document.querySelector<HTMLElement>(selector);
        if (!container) continue;

        inlineStyleFn(element);
        container.appendChild(element);
        return true;
      }
      return false;
    };

    if (tryAttach()) {
      onComplete();
      return true;
    }

    // Poll for element
    let attempts = 0;
    const maxAttempts = 10; // 5 seconds
    const interval = setInterval(() => {
      attempts++;
      if (tryAttach()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        if (!element.isConnected) {
          fallbackMount();
        }
        onComplete();
      }
    }, 500);

    return true;
  }

  function applyCourseraButtonStyles(element: HTMLElement): void {
    element.innerHTML = `
      <span class="ai-summary-inline-icon" style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;">
        ${SPARKLES_ICON_SVG}
      </span>
      <span class="ai-summary-inline-label" style="font-size:14px;font-weight:600;">Summarize</span>
    `;

    // Coursera Style: Blue/White theme
    element.setAttribute(
      'style',
      `
        position: static;
        width: auto;
        height: auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        margin-left: 8px;
        border-radius: 4px;
        background: #0056D2; /* Coursera Blue */
        border: none;
        color: #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Source Sans Pro', -apple-system, sans-serif;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `
    );

    element.onmouseenter = () => {
      element.style.background = '#00419e';
    };

    element.onmouseleave = () => {
      element.style.background = '#0056D2';
    };

    element.dataset.variant = 'coursera-inline';
  }

  try {
    // Create the floating icon container
    const floatingIcon = document.createElement('div');
    floatingIcon.id = 'ai-summary-floating-icon';
    floatingIcon.setAttribute('role', 'button');
    floatingIcon.setAttribute('aria-label', 'CapSummarize');
    floatingIcon.setAttribute('tabindex', '0');
    floatingIcon.className =
      'w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-fuchsia-500/20 border border-fuchsia-400/50';

    floatingIcon.innerHTML = SPARKLES_ICON_SVG;

    // Add click handler
    floatingIcon.addEventListener('click', handleFloatingIconClick);
    floatingIcon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFloatingIconClick();
      }
    });

    const mountFloatingIcon = (): void => {
      addFloatingGlowLayer(floatingIcon);
      applyFloatingIconStyles(floatingIcon);
      if (!floatingIcon.isConnected) {
        document.body.appendChild(floatingIcon);
      }
    };

    if (
      setupYouTubePlacement(floatingIcon, applyYouTubeButtonStyles, mountFloatingIcon, onComplete)
    ) {
      logger.log('[Floating Icon] 🎯 YouTube placement initialized');
      return;
    }

    if (setupUdemyPlacement(floatingIcon, applyUdemyButtonStyles, mountFloatingIcon, onComplete)) {
      logger.log('[Floating Icon] 🎯 Udemy placement initialized');
      return;
    }

    if (
      setupCourseraPlacement(floatingIcon, applyCourseraButtonStyles, mountFloatingIcon, onComplete)
    ) {
      logger.log('[Floating Icon] 🎯 Coursera placement initialized');
      return;
    }

    if (
      setupTwitterPlacement(floatingIcon, applyTwitterButtonStyles, mountFloatingIcon, onComplete)
    ) {
      logger.log('[Floating Icon] 🎯 Twitter/X placement initialized');
      return;
    }

    mountFloatingIcon();
    onComplete();

    logger.log('[Floating Icon] ✅ Floating icon injected successfully');
  } catch (err) {
    logger.error('[Floating Icon] ❌ Failed to inject floating icon:', err);
    isInjecting = false;
  }
}

function addFloatingGlowLayer(element: HTMLElement): void {
  if (document.getElementById('ai-summary-floating-icon-glow')) {
    return;
  }

  const glowLayer = document.createElement('span');
  glowLayer.id = 'ai-summary-floating-icon-glow';
  glowLayer.setAttribute('aria-hidden', 'true');
  glowLayer.setAttribute(
    'style',
    `
      position: absolute;
      inset: -16px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(244, 114, 182, 0.6) 0%, rgba(236, 72, 153, 0.15) 55%, rgba(15, 23, 42, 0.08) 100%);
      opacity: 0.5;
      pointer-events: none;
      filter: blur(18px);
      transition: opacity 0.3s ease, filter 0.3s ease;
      z-index: -1;
    `
  );
  element.style.position = 'relative';
  element.insertAdjacentElement('afterbegin', glowLayer);
}

/**
 * Applies CSS styles to the floating icon element
 * Creates a floating animation and positioning
 */
function applyFloatingIconStyles(element: HTMLElement): void {
  const styles = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, rgba(244, 114, 182, 0.18), rgba(192, 132, 252, 0.22));
    border: 1.5px solid rgba(240, 171, 252, 0.7);
    border-radius: 16px;
    backdrop-filter: blur(22px) saturate(160%);
    -webkit-backdrop-filter: blur(22px) saturate(160%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    cursor: pointer;
    color: #f472b6;
    box-shadow:
      0 0 2px rgba(255, 255, 255, 0.35),
      0 0 18px rgba(244, 114, 182, 0.4),
      0 18px 40px rgba(15, 23, 42, 0.65);
    filter: drop-shadow(0 12px 30px rgba(2, 6, 23, 0.55));
    transition: all 0.3s ease;
    z-index: 2147483647;
    user-select: none;
    -webkit-user-select: none;
    overflow: visible;
  `;

  element.setAttribute('style', styles);
  element.dataset.variant = 'floating';

  // Add hover effect
  element.addEventListener('mouseenter', () => {
    element.style.transform = 'scale(1.06) translateY(-6px)';
    element.style.boxShadow =
      '0 0 4px rgba(255, 255, 255, 0.6), 0 0 24px rgba(244, 114, 182, 0.55), 0 24px 48px rgba(15, 23, 42, 0.7)';
    element.style.filter = 'drop-shadow(0 16px 32px rgba(2, 6, 23, 0.65))';
  });

  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1)';
    element.style.boxShadow =
      '0 0 2px rgba(255, 255, 255, 0.35), 0 0 18px rgba(244, 114, 182, 0.4), 0 18px 40px rgba(15, 23, 42, 0.65)';
    element.style.filter = 'drop-shadow(0 12px 30px rgba(2, 6, 23, 0.55))';
  });
}

/**
 * Handles the click event on the floating icon
 * Opens the side panel by sending a message to the background script
 */
function handleFloatingIconClick(): void {
  try {
    logger.log('[Floating Icon] 🖱️ Icon clicked, opening side panel...');

    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      logger.error('[Floating Icon] ❌ Extension context invalidated. Please reload the page.');
      showReloadNotification();
      return;
    }

    // Check if sidepanel is already open
    if (isSidePanelOpen) {
      // Close side panel
      logger.log('[Floating Icon] 🔽 Closing side panel...');
      chrome.runtime.sendMessage({ action: 'closeSidePanel' }, (response) => {
        if (chrome.runtime.lastError) {
          logger.error(
            '[Floating Icon] ⚠️ Failed to close side panel:',
            chrome.runtime.lastError.message
          );
          return;
        }

        if (response?.success) {
          logger.log('[Floating Icon] ✅ Side panel closed successfully');
          isSidePanelOpen = false;
          updateIconAppearance(false);
        } else {
          logger.error('[Floating Icon] ⚠️ Failed to close side panel:', response?.error);
        }
      });
      return;
    }

    // Send message to background to open side panel
    // IMPORTANT: This must be called synchronously from the click handler
    // to preserve the user gesture context
    chrome.runtime.sendMessage(
      {
        action: 'openSidePanelFromContent',
      },
      (response) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || '';
          logger.error('[Floating Icon] ⚠️ Failed to open side panel:', errorMsg);

          // Check if it's because of invalidated context
          if (errorMsg.includes('Extension context invalidated')) {
            showReloadNotification();
          }
          return;
        }

        if (response?.success) {
          logger.log('[Floating Icon] ✅ Side panel opened successfully');
          isSidePanelOpen = true;
          updateIconAppearance(true);
        } else {
          logger.error('[Floating Icon] ⚠️ Failed to open side panel:', response?.error);
        }
      }
    );
  } catch (err) {
    logger.error(
      '[Floating Icon] ❌ Error handling click:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Updates the icon appearance based on side panel state
 */
function updateIconAppearance(isOpen: boolean): void {
  const icon = document.getElementById('ai-summary-floating-icon');
  if (!icon) return;

  if (icon.dataset.variant === 'youtube-inline') {
    icon.style.background = isOpen
      ? 'linear-gradient(135deg, rgba(244, 114, 182, 0.3), rgba(6, 182, 212, 0.35))'
      : 'linear-gradient(135deg, rgba(244, 114, 182, 0.22), rgba(6, 182, 212, 0.28))';
    icon.style.borderColor = isOpen ? 'rgba(248, 250, 252, 0.9)' : 'rgba(244, 114, 182, 0.6)';
    icon.style.boxShadow = isOpen
      ? '0 6px 24px rgba(236, 72, 153, 0.45)'
      : '0 4px 18px rgba(15, 23, 42, 0.35)';
    icon.style.transform = isOpen ? 'scale(1.02)' : 'scale(1)';
    return;
  }

  if (icon.dataset.variant === 'udemy-inline') {
    icon.style.background = isOpen ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)';
    icon.style.borderColor = isOpen ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
    icon.style.transform = isOpen ? 'scale(1.02)' : 'scale(1)';
    return;
  }

  if (icon.dataset.variant === 'coursera-inline') {
    icon.style.background = isOpen ? '#00419e' : '#0056D2';
    icon.style.transform = isOpen ? 'scale(1.02)' : 'scale(1)';
    return;
  }

  if (icon.dataset.variant === 'twitter-inline') {
    icon.style.background = isOpen
      ? 'rgba(249, 24, 128, 0.15)' // X pinkish accent
      : 'transparent';
    icon.style.color = isOpen ? '#f91880' : 'rgba(239, 243, 244, 1.0)';
    icon.style.transform = isOpen ? 'scale(1.1)' : 'scale(1)';
    return;
  }

  // The X-related variant was removed — we only support YouTube inline and floating variants here

  icon.style.background = isOpen
    ? 'linear-gradient(135deg, rgba(244, 114, 182, 0.28), rgba(192, 132, 252, 0.32))'
    : 'linear-gradient(135deg, rgba(244, 114, 182, 0.18), rgba(192, 132, 252, 0.22))';
  icon.style.borderColor = 'rgba(240, 171, 252, 0.7)';
  icon.style.boxShadow = isOpen
    ? '0 0 10px rgba(240, 171, 252, 1), 0 0 26px rgba(244, 114, 182, 0.65), 0 26px 52px rgba(15, 23, 42, 0.6)'
    : '0 0 2px rgba(255, 255, 255, 0.35), 0 0 18px rgba(244, 114, 182, 0.4), 0 18px 40px rgba(15, 23, 42, 0.65)';
  icon.style.filter = isOpen
    ? 'drop-shadow(0 18px 36px rgba(2, 6, 23, 0.7))'
    : 'drop-shadow(0 12px 30px rgba(2, 6, 23, 0.55))';

  const glow = document.getElementById('ai-summary-floating-icon-glow');
  if (glow) {
    glow.style.opacity = isOpen ? '0.65' : '0.5';
    glow.style.filter = isOpen ? 'blur(20px) brightness(1.1)' : 'blur(18px) brightness(1)';
  }
}

/**
 * Shows a notification to reload the page when extension context is invalidated
 */
function showReloadNotification(): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'ai-summary-reload-notification';
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">⚠️</span>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Extension Updated</div>
        <div style="font-size: 13px; opacity: 0.9;">Please reload this page to continue using CapSummarize</div>
      </div>
    </div>
  `;

  // Apply styles
  const styles = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    max-width: 350px;
    cursor: pointer;
    transition: all 0.3s ease;
  `;

  notification.setAttribute('style', styles);

  // Add hover effect
  notification.addEventListener('mouseenter', () => {
    notification.style.transform = 'scale(1.02)';
    notification.style.boxShadow = '0 6px 24px rgba(255, 107, 107, 0.5)';
  });

  notification.addEventListener('mouseleave', () => {
    notification.style.transform = 'scale(1)';
    notification.style.boxShadow = '0 4px 20px rgba(255, 107, 107, 0.4)';
  });

  // Click to reload
  notification.addEventListener('click', () => {
    window.location.reload();
  });

  // Append to body
  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

/**
 * Removes the floating icon from the page
 */
export function removeFloatingIcon(): void {
  const icon = document.getElementById('ai-summary-floating-icon');
  if (icon) {
    icon.remove();
    logger.log('[Floating Icon] ✅ Floating icon removed');
  }
}

/**
 * Setup message listener to track side panel state
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'sidePanelClosed') {
    isSidePanelOpen = false;
    updateIconAppearance(false);
    logger.log('[Floating Icon] Side panel closed externally');
  }
});
