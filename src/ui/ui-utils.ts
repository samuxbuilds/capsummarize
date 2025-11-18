/**
 * UI Utilities Module
 * Lightweight helpers for template cloning, event delegation, and DOM manipulation
 * Chrome Extension compatible - no inline scripts, CSP-safe
 */

/**
 * Show an element by removing 'hidden' class
 * @param element - Element to show
 */
export function show(element: HTMLElement | null): void {
  if (element instanceof HTMLElement) {
    element.classList.remove('hidden');
    element.removeAttribute('aria-hidden');
  }
}

/**
 * Hide an element by adding 'hidden' class
 * @param element - Element to hide
 */
export function hide(element: HTMLElement | null): void {
  if (element instanceof HTMLElement) {
    element.classList.add('hidden');
    element.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Animate progress bar
 * @param progressBar - Progress bar element
 * @param targetPercent - Target percentage (0-100)
 * @param duration - Animation duration in ms
 */
export function animateProgress(
  progressBar: HTMLElement | null,
  targetPercent: number,
  duration: number = 300
): void {
  if (!progressBar || !(progressBar instanceof HTMLElement)) return;

  const startWidth = parseFloat(progressBar.style.width) || 0;
  const startTime = performance.now();

  function updateProgress(currentTime: number) {
    if (!progressBar) return; // Guard clause for TypeScript

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentPercent = startWidth + (targetPercent - startWidth) * progress;

    progressBar.style.width = `${currentPercent}%`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(currentPercent)));

    if (progress < 1) {
      requestAnimationFrame(updateProgress);
    }
  }

  requestAnimationFrame(updateProgress);
}

/**
 * Copy text to clipboard (Chrome extension compatible)
 * @param text - Text to copy
 * @returns Promise resolving to success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('[UI-Utils] Copy to clipboard failed:', error);
    return false;
  }
}

/**
 * Calculate reading time for text
 * @param text - Text content
 * @param wordsPerMinute - Reading speed
 * @returns Reading time (e.g., "2 min read")
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): string {
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  return `${minutes} min read`;
}

/**
 * Show temporary notification/toast
 * @param message - Message to display
 * @param duration - Display duration in ms
 * @param type - Type: 'info', 'success', 'error'
 */
export function showToast(
  message: string,
  duration: number = 2000,
  type: 'info' | 'success' | 'error' = 'info'
): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  document.body.appendChild(toast);

  // Fade in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
}
