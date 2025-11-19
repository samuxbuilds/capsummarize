import { logger } from '../utils/logger';
import { isValidPrompt } from '../utils/security.js';
import { providers, type Provider } from '../config/providers.js';

/**
 * Supported AI providers - Exported from config
 */
export type { Provider };

/**
 * Get list of all available providers
 */
export function getAvailableProviders(): Provider[] {
  return Object.keys(providers) as Provider[];
}

/**
 * Get provider display name (capitalize and format)
 */
export function getProviderDisplayName(provider: Provider): string {
  const displayNames: Record<Provider, string> = {
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    grok: 'Grok',
    claude: 'Claude',
    meta: 'Meta AI',
    t3: 'T3 Chat',
    zAI: 'Z.AI',
    mistral: 'Mistral',
    perplexity: 'Perplexity',
    quillBot: 'QuillBot',
  };
  return displayNames[provider] || provider;
}

/**
 * Get provider icon URL
 */
export function getProviderIcon(provider: Provider): string {
  return providers[provider]?.icon || '';
}

/**
 * Resolve the origin pattern (protocol + host + /*) for a provider
 */
export function getProviderOriginPattern(provider: Provider): string | null {
  const config = providers[provider];
  if (!config) return null;

  try {
    const url = new URL(config.url);
    return `${url.protocol}//${url.host}/*`;
  } catch (error) {
    console.warn('[Provider Service] Failed to parse provider URL', provider, error);
    return null;
  }
}

/**
 * Cache provider hostnames for faster URL checking
 * Extracted once at module load time instead of on every call
 */
const providerHostnames = new Set(
  Object.values(providers)
    .map((provider) => {
      try {
        return new URL(provider.url).hostname;
      } catch (e) {
        return null;
      }
    })
    .filter((hostname): hostname is string => hostname !== null)
);

/**
 * Check if a given URL belongs to one of the AI providers
 * This is used to determine if we should skip updating the sidepanel state
 * when the user navigates to a provider URL
 *
 * Uses cached hostnames for O(1) lookup instead of O(n)
 */
export function isProviderURL(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return providerHostnames.has(url.hostname);
  } catch (e) {
    // Invalid URL
    return false;
  }
}

/**
 * Injects a prompt into the specified provider's input field and submits it.
 *
 * SECURITY & COMPLIANCE NOTES:
 * - Script injection is required for seamless AI provider integration
 * - User explicitly initiates action by clicking provider button in extension UI
 * - Only injects text content into existing input fields, no code execution
 * - Uses chrome.scripting.executeScript with isolated function scope
 * - No access to sensitive page data beyond input field manipulation
 * - Essential for core functionality: cross-provider AI summarization
 *
 * @param tabId - The ID of the tab where the provider is running.
 * @param provider - The provider to inject the prompt into.
 * @param prompt - The prompt to inject.
 */
async function injectPrompt(tabId: number, provider: Provider, prompt: string): Promise<void> {
  const config = providers[provider];

  // Security validation before script injection
  if (!isValidPrompt(prompt)) {
    throw new Error('Invalid prompt content for security reasons');
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (promptSelector: string, submitSelector: string, text: string) => {
      /**
       * Attempts to inject prompt into various provider input fields
       * Handles both textarea and contenteditable div elements
       */
      function injectPromptAndSubmit(promptSelector: string, submitSelector: string, text: string) {
        console.log('[Provider Inject] Starting injection with selector:', promptSelector);

        let retryCount = 0;
        const maxRetries = 30;
        const retryInterval = 1000; // 1 second

        async function attemptInject() {
          // Try to find the prompt input element
          const el = document.querySelector(promptSelector) as
            | HTMLTextAreaElement
            | HTMLInputElement
            | HTMLDivElement
            | null;

          if (!el) {
            retryCount++;
            console.warn(
              `[Provider Inject] Prompt element not found (attempt ${retryCount}/${maxRetries}), retrying...`
            );
            if (retryCount < maxRetries) {
              setTimeout(attemptInject, retryInterval);
            } else {
              console.error('[Provider Inject] Failed to find prompt element after max attempts');
            }
            return;
          }

          console.log('[Provider Inject] Found prompt element:', el.tagName);

          try {
            el.focus();

            // If it's an <input> or <textarea>, set value via native setter so React notices
            if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
              console.log('[Provider Inject] Injecting text into input/textarea');

              // Use native setter to avoid bypassing React's value tracker
              const nativeSetter = Object.getOwnPropertyDescriptor(
                Object.getPrototypeOf(el),
                'value'
              )?.set;
              if (nativeSetter) {
                nativeSetter.call(el, text);
              } else {
                // fallback
                (el as any).value = text;
              }

              // dispatch events React listens for
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              // contentEditable (div) path
              console.log('[Provider Inject] Injecting text into contenteditable element');

              // place caret at the end
              const range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);

              // Try execCommand first (simulates user typing/paste)
              let didInsert = false;
              try {
                // execCommand inserts like real user input and is often honoured by React
                document.execCommand('insertText', false, text);
                didInsert = true;
              } catch (err) {
                // ignore and fallback
                console.warn(
                  '[Provider Inject] execCommand failed, falling back to direct text set',
                  err
                );
              }

              if (!didInsert) {
                // direct set (and keep caret at end)
                el.textContent = text;
              }

              // Dispatch modern events that apps commonly listen for
              // beforeinput
              const before = new InputEvent('beforeinput', {
                bubbles: true,
                cancelable: true,
                composed: true,
                inputType: 'insertText',
                data: text,
              });
              el.dispatchEvent(before);

              // input
              const inputEv = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                composed: true,
                inputType: 'insertText',
                data: text,
              });
              el.dispatchEvent(inputEv);

              // change (some frameworks pick this up)
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }

            console.log('[Provider Inject] Prompt injected successfully, waiting to submit...');

            // try to submit (with its own retry loop)
            let submitRetry = 0;
            const maxSubmitRetries = 10;
            const submitInterval = 600;

            function attemptSubmit() {
              const submitBtn = document.querySelector(submitSelector) as
                | HTMLElement
                | SVGElement
                | null;

              if (submitBtn) {
                console.log('[Provider Inject] Found submit button, clicking...');
                // If it's an SVG inside a button, click the button
                if (
                  submitBtn instanceof HTMLButtonElement ||
                  submitBtn instanceof HTMLAnchorElement
                ) {
                  (submitBtn as HTMLElement).click();
                } else if (submitBtn instanceof SVGElement) {
                  const parent = submitBtn.closest(
                    'button, a, div[role="button"]'
                  ) as HTMLElement | null;
                  parent?.click();
                } else {
                  // generic element
                  (submitBtn as HTMLElement).click();
                }
              } else {
                submitRetry++;
                if (submitRetry < maxSubmitRetries) {
                  console.warn(
                    `[Provider Inject] Submit button not found (attempt ${submitRetry}/${maxSubmitRetries}), retrying...`
                  );
                  setTimeout(attemptSubmit, submitInterval);
                } else {
                  console.warn('[Provider Inject] Submit button not found after retries.');
                }
              }
            }

            // slight delay to let UI update before clicking submit
            setTimeout(attemptSubmit, 700);
          } catch (err) {
            console.error('[Provider Inject] Unexpected error during injection:', err);
          }
        }

        // Start the injection attempt
        attemptInject();
      }

      // Example usage (replace with your values)
      injectPromptAndSubmit(promptSelector, submitSelector, text);
    },
    args: [config.promptSelector, config.submitSelector, prompt],
    world: 'MAIN',
  });
}

/**
 * Opens a new tab for the specified provider and injects the prompt.
 *
 * @param provider - The provider to open and inject the prompt into.
 * @param prompt - The prompt to inject.
 * @returns A Promise that resolves when the prompt is injected.
 */
export async function openAndInject(provider: Provider, prompt: string): Promise<void> {
  const config = providers[provider];

  logger.log(`[Provider Service] Opening ${provider} and injecting prompt...`);

  const tab = await chrome.tabs.create({ url: config.url });
  const tabId = tab.id;

  if (!tabId) {
    logger.error('[Provider Service] Failed to create tab');
    return;
  }

  // Wait for page to load before injecting
  setTimeout(async () => {
    try {
      await injectPrompt(tabId, provider, prompt);
      logger.log(`[Provider Service] Prompt injected into ${provider}`);
    } catch (error) {
      logger.error(`[Provider Service] Failed to inject prompt into ${provider}:`, error);
    }
  }, 2000);
}
