/**
 * Pre-Prompt Scripts
 *
 * Helper functions for each provider that need to run before prompt injection.
 * These handle complex UI interactions like dropdown selection, mode switching, etc.
 *
 * NOTE: These are actual functions (not strings) that get executed via
 * chrome.scripting.executeScript to comply with CSP policies.
 */

export type ModeType = 'image' | 'video';

/**
 * Grok model selector function
 * Selects image/video mode from the Radix dropdown menu
 */
export async function grokPrePromptFn(type: ModeType): Promise<void> {
  const trigger = document.querySelector('#model-select-trigger') as HTMLElement | null;
  if (!trigger) {
    console.warn('[Grok] Trigger not found');
    return;
  }
  if ((trigger.innerText || '').toLowerCase().includes(type)) {
    console.log('[Grok] Already selected:', type);
    return;
  }
  const r = trigger.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const seq = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
  seq.forEach((e) =>
    trigger.dispatchEvent(
      new PointerEvent(e, { bubbles: true, composed: true, clientX: cx, clientY: cy, pointerId: 1 })
    )
  );
  await new Promise((r) => setTimeout(r, 50));
  const menu = document.querySelector("[data-radix-menu-content],[role='menu']");
  if (!menu) {
    console.warn('[Grok] Menu not found');
    return;
  }
  const items = [...menu.querySelectorAll("[role='menuitem'],[data-radix-collection-item]")];
  const item = items.find((el) =>
    ((el as HTMLElement).innerText || '').toLowerCase().includes(type)
  ) as HTMLElement | undefined;
  if (!item) {
    console.warn('[Grok] No menu item matched:', type);
    return;
  }
  if (item.getAttribute('data-state') === 'on' || item.getAttribute('aria-checked') === 'true') {
    console.log('[Grok] Already selected inside menu:', type);
    return;
  }
  const rr = item.getBoundingClientRect();
  const tx = rr.left + rr.width / 2;
  const ty = rr.top + rr.height / 2;
  seq.forEach((e) =>
    item.dispatchEvent(
      new PointerEvent(e, { bubbles: true, composed: true, clientX: tx, clientY: ty, pointerId: 2 })
    )
  );
  console.log('[Grok] Selected:', type);
}

/**
 * Grok image modal handler function
 * When an image is attached to Grok's contenteditable div, it automatically opens a modal.
 * The image is already attached - we just need to wait for the modal and inject the prompt there.
 *
 * @param prompt - The prompt text to inject into the modal's textarea
 * @returns true if successful, false otherwise
 */
export async function grokImageModalFn(prompt: string): Promise<boolean> {
  const maxRetries = 15;
  const retryInterval = 2000; // 2 seconds

  // Selectors for the modal textarea and submit button
  const promptSelector =
    "textarea[aria-label='Make a video'], textarea[aria-label='Make an image']";
  const submitSelector = "button[aria-label='Make video'], button[aria-label='Make image']";

  console.log('[Grok Modal] Waiting for image modal to appear...');

  // Wait for the modal textarea to appear
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const textarea = document.querySelector(promptSelector) as HTMLTextAreaElement | null;

    if (textarea) {
      console.log('[Grok Modal] Found modal textarea, injecting prompt...');

      try {
        // Focus and inject text
        textarea.focus();

        // Use native setter for React compatibility
        const nativeSetter = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(textarea),
          'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(textarea, prompt);
        } else {
          textarea.value = prompt;
        }

        // Dispatch events to trigger React state updates
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[Grok Modal] Prompt injected, waiting for submit button...');

        // Wait a bit for the UI to update
        await new Promise((r) => setTimeout(r, 500));

        // Find and click submit button
        const submitBtn = document.querySelector(submitSelector) as HTMLButtonElement | null;
        if (submitBtn) {
          console.log('[Grok Modal] Found submit button, clicking...');
          submitBtn.click();
          return true;
        } else {
          console.warn('[Grok Modal] Submit button not found');
          return false;
        }
      } catch (err) {
        console.error('[Grok Modal] Error during injection:', err);
        return false;
      }
    }

    console.log(
      `[Grok Modal] Modal not found yet (attempt ${attempt}/${maxRetries}), waiting ${retryInterval}ms...`
    );
    await new Promise((r) => setTimeout(r, retryInterval));
  }

  console.error('[Grok Modal] Failed to find modal after max attempts');
  return false;
}

/**
 * Type for pre-prompt function
 */
export type PrePromptFn = (type: ModeType) => Promise<void>;

/**
 * Type for image modal handler function
 */
export type ImageModalFn = (prompt: string) => Promise<boolean>;

/**
 * Map of provider names to their pre-prompt functions
 */
export const prePromptFunctions: Record<string, PrePromptFn> = {
  grok: grokPrePromptFn,
};

/**
 * Map of provider names to their image modal handler functions
 */
export const imageModalFunctions: Record<string, ImageModalFn> = {
  grok: grokImageModalFn,
};
