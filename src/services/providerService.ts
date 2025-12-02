import { logger } from '../utils/logger';
import { isValidPrompt } from '../utils/security.js';
import {
  providers,
  isImageCapableProvider,
  isVideoCapableProvider,
  type Provider,
} from '../config/providers.js';
import type { OutputType } from '../config/prompts.js';
import { grokPrePromptFn, grokImageModalFn, type ModeType } from '../config/prePromptScripts.js';

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
 * Get list of providers that support image generation
 */
export function getImageCapableProviders(): Provider[] {
  return getAvailableProviders().filter((p) => isImageCapableProvider(p));
}

/**
 * Get list of providers that support video generation
 */
export function getVideoCapableProviders(): Provider[] {
  return getAvailableProviders().filter((p) => isVideoCapableProvider(p));
}

/**
 * Get list of providers filtered by output type
 * For 'text': returns all providers
 * For 'image': returns only image-capable providers
 * For 'video': returns only video-capable providers
 */
export function getProvidersForOutputType(outputType: OutputType): Provider[] {
  if (outputType === 'video') {
    return getVideoCapableProviders();
  }
  if (outputType === 'image') {
    return getImageCapableProviders();
  }
  return getAvailableProviders();
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
    scira: 'Scira',
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
    const url = new URL(config.textConfig.url);
    return `${url.protocol}//${url.host}/*`;
  } catch (error) {
    console.warn('[Provider Service] Failed to parse provider URL', provider, error);
    return null;
  }
}

/**
 * Cache provider hostnames for faster URL checking
 * Extracted once at module load time instead of on every call
 * Includes both text and image URLs for comprehensive matching
 */
const providerHostnames = new Set(
  Object.values(providers)
    .flatMap((provider) => {
      const urls: string[] = [provider.textConfig.url];
      if (provider.imageConfig?.url) {
        urls.push(provider.imageConfig.url);
      }
      return urls.map((urlString) => {
        try {
          return new URL(urlString).hostname;
        } catch (e) {
          return null;
        }
      });
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
 * @param outputType - The output type (text, image, or video).
 * @param imageDataUrl - Optional base64 data URL of a reference image to inject.
 */
async function injectPrompt(
  tabId: number,
  provider: Provider,
  prompt: string,
  outputType: OutputType = 'text',
  imageDataUrl?: string
): Promise<void> {
  const config = providers[provider];

  // Select the appropriate mode config based on output type
  let modeConfig = config.textConfig;
  if (outputType === 'video' && config.videoConfig) {
    modeConfig = config.videoConfig;
  } else if (outputType === 'image' && config.imageConfig) {
    modeConfig = config.imageConfig;
  }

  // Security validation before script injection
  if (!isValidPrompt(prompt)) {
    throw new Error('Invalid prompt content for security reasons');
  }

  // Get selectors from the appropriate mode config
  const promptSelector = modeConfig.promptSelector;
  const submitSelector = modeConfig.submitSelector;
  // Convert undefined to null for serialization (undefined is not serializable in chrome.scripting.executeScript)
  const prePromptSelector = modeConfig.prePromptSelector ?? null;
  const prePromptProvider = modeConfig.prePromptProvider ?? null;
  const prePromptMode = modeConfig.prePromptMode ?? null;
  const imageData = imageDataUrl ?? null;
  const providerName = provider; // Pass provider name for provider-specific delays
  // Provider for image modal handler (when image triggers different UI like Grok modal)
  const imageModalProvider = modeConfig.imageModalProvider ?? null;

  // If there's a pre-prompt function to run (for complex interactions like dropdown selection), execute it first
  if (prePromptProvider && prePromptMode) {
    console.log(
      `[Provider Service] Running pre-prompt function for ${prePromptProvider} (${prePromptMode})`
    );
    try {
      // Execute pre-prompt function via chrome.scripting.executeScript (CSP-compliant)
      if (prePromptProvider === 'grok') {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: grokPrePromptFn,
          args: [prePromptMode as ModeType],
          world: 'MAIN',
        });
      }
      // Add more providers here as needed
      // Wait for UI to update after pre-prompt action
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (err) {
      console.error('[Provider Service] Pre-prompt function failed:', err);
    }
  }

  // For providers with image modal handling (like Grok):
  // 1. First inject the image into the contenteditable (which triggers the modal)
  // 2. Then use the modal handler to inject the prompt into the modal
  if (imageData && imageModalProvider) {
    console.log(`[Provider Service] Using image modal flow for ${imageModalProvider}`);

    // Step 1: Inject the image into the contenteditable div (this triggers the modal)
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (promptSelector: string, imageDataUrl: string) => {
        function dataURLtoBlob(dataURL: string): Blob {
          const arr = dataURL.split(',');
          const mimeMatch = arr[0]?.match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const base64Data = arr[1] || '';
          const bstr = atob(base64Data);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new Blob([u8arr], { type: mime });
        }

        // Wait for the contenteditable to appear
        let retries = 0;
        const maxRetries = 20;
        while (retries < maxRetries) {
          const el = document.querySelector(promptSelector) as HTMLElement | null;
          if (el) {
            console.log('[Provider Inject] Found contenteditable, pasting image...');
            el.focus();

            const blob = dataURLtoBlob(imageDataUrl);
            const file = new File([blob], 'reference-image.png', { type: blob.type });

            try {
              const clipboardData = new DataTransfer();
              clipboardData.items.add(file);

              const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: clipboardData,
              });

              el.dispatchEvent(pasteEvent);
              console.log('[Provider Inject] Image paste event dispatched');
              return true;
            } catch (e) {
              console.error('[Provider Inject] Paste failed:', e);
              return false;
            }
          }
          retries++;
          await new Promise((r) => setTimeout(r, 500));
        }
        console.error('[Provider Inject] Contenteditable not found after max retries');
        return false;
      },
      args: [promptSelector, imageData],
      world: 'MAIN',
    });

    // Wait for the modal to start appearing after image paste
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Now run the modal handler to inject prompt into the modal
    console.log(`[Provider Service] Running image modal handler for ${imageModalProvider}`);
    try {
      if (imageModalProvider === 'grok') {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: grokImageModalFn,
          args: [prompt],
          world: 'MAIN',
        });
      }
      // Add more providers here as needed
      return; // Image modal handler takes care of the rest
    } catch (err) {
      console.error('[Provider Service] Image modal handler failed:', err);
      // Fall through to regular injection as fallback
    }
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (
      promptSelector: string,
      submitSelector: string,
      text: string,
      prePromptSelector: string | null,
      imageDataUrl: string | null,
      providerName: string
    ) => {
      /**
       * Converts a base64 data URL to a Blob
       */
      function dataURLtoBlob(dataURL: string): Blob {
        const arr = dataURL.split(',');
        const mimeMatch = arr[0]?.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const base64Data = arr[1] || '';
        const bstr = atob(base64Data);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
      }

      /**
       * Injects an image into the chat input by finding and using file inputs
       * This is the most reliable cross-provider method
       */
      async function injectImage(targetEl: HTMLElement, imageDataUrl: string): Promise<boolean> {
        console.log('[Provider Inject] Attempting to inject image...');

        try {
          const blob = dataURLtoBlob(imageDataUrl);
          const file = new File([blob], 'reference-image.png', { type: blob.type });

          // Create a DataTransfer object with the file
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);

          try {
            const clipboardData = new DataTransfer();
            clipboardData.items.add(file);

            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: clipboardData,
            });

            targetEl.dispatchEvent(pasteEvent);
            console.log('[Provider Inject] Dispatched paste event on target');
          } catch (e) {
            console.log('[Provider Inject] Paste event failed:', e);
          }

          // Copy to clipboard as final fallback (user can manually paste)
          try {
            const pngBlob = new Blob([await blob.arrayBuffer()], { type: 'image/png' });
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
            console.log('[Provider Inject] 📋 Image copied to clipboard as fallback');
          } catch (e) {
            console.log('[Provider Inject] Clipboard fallback failed:', e);
          }

          return true;
        } catch (err) {
          console.error('[Provider Inject] Image injection failed:', err);
          return false;
        }
      }

      /**
       * Attempts to inject prompt into various provider input fields
       * Handles both textarea and contenteditable div elements
       */
      function injectPromptAndSubmit(
        promptSelector: string,
        submitSelector: string,
        text: string,
        prePromptSelector: string | null,
        imageDataUrl: string | null,
        providerName: string
      ) {
        console.log('[Provider Inject] Starting injection with selector:', promptSelector);
        console.log('[Provider Inject] Pre-prompt selector:', prePromptSelector);
        console.log('[Provider Inject] Has image:', !!imageDataUrl);
        console.log('[Provider Inject] Provider:', providerName);

        let retryCount = 0;
        const maxRetries = 30;
        const retryInterval = 1000;

        // If there's a pre-prompt selector (like clicking "Create Image" button), do it first
        function handlePrePromptAction(callback: () => void) {
          if (!prePromptSelector) {
            callback();
            return;
          }

          let prePromptRetry = 0;
          const maxPrePromptRetries = 15;
          const selectorToUse = prePromptSelector; // Capture for closure

          function attemptPrePrompt() {
            // Try multiple selectors (comma-separated)
            const selectors = selectorToUse.split(',').map((s) => s.trim());
            let prePromptBtn: HTMLElement | null = null;

            for (const selector of selectors) {
              prePromptBtn = document.querySelector(selector) as HTMLElement | null;
              if (prePromptBtn) break;
            }

            if (prePromptBtn) {
              console.log('[Provider Inject] Found pre-prompt button, clicking...');
              prePromptBtn.click();
              // Wait for UI to update after clicking
              setTimeout(callback, 1500);
            } else {
              prePromptRetry++;
              if (prePromptRetry < maxPrePromptRetries) {
                console.warn(
                  `[Provider Inject] Pre-prompt button not found (attempt ${prePromptRetry}/${maxPrePromptRetries}), retrying...`
                );
                setTimeout(attemptPrePrompt, 1000);
              } else {
                console.warn('[Provider Inject] Pre-prompt button not found, proceeding anyway...');
                callback();
              }
            }
          }

          attemptPrePrompt();
        }

        function attemptInject() {
          // Try to find the prompt input element
          const el = document.querySelector(promptSelector) as
            | HTMLTextAreaElement
            | HTMLInputElement
            | HTMLDivElement
            | null;

          if (!el) {
            retryCount++;
            console.warn(
              `[Provider Inject] Prompt element not found with selector "${promptSelector}" (attempt ${retryCount}/${maxRetries}), retrying in ${retryInterval}ms...`
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
            const maxSubmitRetries = 15;
            const submitInterval = 600;
            // Extra delay after button is enabled (for image attachment processing)
            const enabledButtonDelay = 3000;

            const attemptSubmit = (): void => {
              const submitBtn = document.querySelector(submitSelector) as
                | HTMLElement
                | SVGElement
                | null;

              if (submitBtn) {
                // Check if button is disabled
                const isDisabled =
                  submitBtn.hasAttribute('disabled') ||
                  submitBtn.getAttribute('aria-disabled') === 'true' ||
                  (submitBtn as HTMLButtonElement).disabled === true ||
                  submitBtn.classList.contains('disabled');

                if (isDisabled) {
                  // Button found but disabled, keep waiting
                  submitRetry++;
                  if (submitRetry < maxSubmitRetries) {
                    console.log(
                      `[Provider Inject] Submit button is disabled (attempt ${submitRetry}/${maxSubmitRetries}), waiting...`
                    );
                    setTimeout(attemptSubmit, submitInterval);
                  } else {
                    console.warn(
                      '[Provider Inject] Submit button still disabled after retries, attempting click anyway...'
                    );
                    (submitBtn as HTMLElement).click();
                  }
                  return;
                }

                // Button is enabled - wait extra time if we have an image
                if (imageDataUrl && submitRetry === 0) {
                  console.log(
                    `[Provider Inject] Submit button enabled, waiting ${enabledButtonDelay}ms for image to fully process...`
                  );
                  submitRetry = 1; // Mark that we've started the enabled wait
                  setTimeout(attemptSubmit, enabledButtonDelay);
                  return;
                }

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
                    `[Provider Inject] Submit button not found with selector "${submitSelector}" (attempt ${submitRetry}/${maxSubmitRetries}), retrying...`
                  );
                  setTimeout(attemptSubmit, submitInterval);
                } else {
                  console.warn('[Provider Inject] Submit button not found after retries.');
                }
              }
            };

            // If we have an image, inject it before submitting
            if (imageDataUrl) {
              console.log('[Provider Inject] Injecting reference image...');
              // Use a promise to handle async image injection
              injectImage(el, imageDataUrl)
                .then((success) => {
                  if (success) {
                    console.log('[Provider Inject] Image injection attempted');
                  } else {
                    console.warn('[Provider Inject] Image injection may not have worked');
                  }
                  // Give time for image to be processed before submitting
                  const imageSubmitDelay = 2000;
                  console.log(
                    `[Provider Inject] Waiting ${imageSubmitDelay}ms for image to attach (provider: ${providerName})`
                  );
                  setTimeout(attemptSubmit, imageSubmitDelay);
                })
                .catch((err) => {
                  console.error('[Provider Inject] Image injection error:', err);
                  // Still try to submit even if image fails
                  setTimeout(attemptSubmit, 700);
                });
            } else {
              // No image, proceed with normal submit timing
              // slight delay to let UI update before clicking submit
              setTimeout(attemptSubmit, 700);
            }
          } catch (err) {
            console.error('[Provider Inject] Unexpected error during injection:', err);
          }
        }

        // Start the injection process (with pre-prompt action if needed)
        handlePrePromptAction(attemptInject);
      }

      // Execute the injection
      injectPromptAndSubmit(
        promptSelector,
        submitSelector,
        text,
        prePromptSelector,
        imageDataUrl,
        providerName
      );
    },
    args: [promptSelector, submitSelector, prompt, prePromptSelector, imageData, providerName],
    world: 'MAIN',
  });
}

/**
 * Opens a new tab for the specified provider and injects the prompt.
 *
 * @param provider - The provider to open and inject the prompt into.
 * @param prompt - The prompt to inject.
 * @param outputType - The output type (text, image, or video).
 * @param imageDataUrl - Optional base64 data URL of a reference image to inject.
 * @returns A Promise that resolves when the prompt is injected.
 */
export async function openAndInject(
  provider: Provider,
  prompt: string,
  outputType: OutputType = 'text',
  imageDataUrl?: string
): Promise<void> {
  const config = providers[provider];

  logger.log(
    `[Provider Service] Opening ${provider} (output type: ${outputType}) and injecting prompt...`
  );
  if (imageDataUrl) {
    logger.log(`[Provider Service] Reference image provided (${imageDataUrl.length} bytes)`);
  }

  // Determine the URL to use based on output type
  let modeConfig = config.textConfig;
  if (outputType === 'video' && config.videoConfig) {
    modeConfig = config.videoConfig;
    logger.log(`[Provider Service] Using video-specific URL: ${modeConfig.url}`);
  } else if (outputType === 'image' && config.imageConfig) {
    modeConfig = config.imageConfig;
    logger.log(`[Provider Service] Using image-specific URL: ${modeConfig.url}`);
  }

  const targetUrl = modeConfig.url;

  const tab = await chrome.tabs.create({ url: targetUrl });
  const tabId = tab.id;

  if (!tabId) {
    logger.error('[Provider Service] Failed to create tab');
    return;
  }

  // Wait for page to load before injecting
  // Use longer delay for image/video mode as some providers need more setup time
  const delay = outputType !== 'text' ? 3000 : 2000;

  setTimeout(async () => {
    try {
      await injectPrompt(tabId, provider, prompt, outputType, imageDataUrl);
      logger.log(`[Provider Service] Prompt injected into ${provider}`);
    } catch (error) {
      logger.error(`[Provider Service] Failed to inject prompt into ${provider}:`, error);
    }
  }, delay);
}

// Re-export for convenience
export { isImageCapableProvider, isVideoCapableProvider } from '../config/providers.js';
