import { IMAGE_CAPABLE_PROVIDERS, VIDEO_CAPABLE_PROVIDERS } from '../utils/constants.js';
import type { ModeType } from './prePromptScripts.js';

/**
 * Configuration for text/image mode selectors
 */

export interface ModeConfig {
  /**
   * URL to open for this mode
   */
  url: string;
  /**
   * Selector for the prompt input field
   */
  promptSelector: string;
  /**
   * Selector for the submit button
   */
  submitSelector: string;
  /**
   * Selector to click before entering prompt (e.g., "Create Image" button in Gemini)
   */
  prePromptSelector?: string;
  /**
   * Provider name for pre-prompt function lookup (e.g., 'grok' for dropdown selection)
   * The function will be executed via chrome.scripting.executeScript to comply with CSP
   */
  prePromptProvider?: string;
  /**
   * Mode type for pre-prompt function ('image' or 'video')
   */
  prePromptMode?: ModeType;
  /**
   * Provider name for image modal handler (when image attachment triggers a different UI)
   * The function will be executed via chrome.scripting.executeScript to comply with CSP
   */
  imageModalProvider?: string;
}

/**
 * Provider configuration with URLs and selectors for prompt injection
 */
export interface ProviderConfig {
  /**
   * Provider icon path
   */
  icon: string;
  /**
   * Text summarization configuration (required for all providers)
   */
  textConfig: ModeConfig;
  /**
   * Image generation configuration (only for image-capable providers)
   */
  imageConfig?: ModeConfig;
  /**
   * Video generation configuration (only for video-capable providers)
   */
  videoConfig?: ModeConfig;
}

/**
 * Supported AI providers
 */
export type Provider =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'grok'
  | 'meta'
  | 'mistral'
  | 'perplexity'
  | 't3'
  | 'zAI'
  | 'quillBot';

/**
 * Check if a provider supports image generation
 */
export function isImageCapableProvider(provider: Provider | string): boolean {
  return (IMAGE_CAPABLE_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * Check if a provider supports video generation
 */
export function isVideoCapableProvider(provider: Provider | string): boolean {
  return (VIDEO_CAPABLE_PROVIDERS as readonly string[]).includes(provider);
}

export const providers: Record<Provider, ProviderConfig> = {
  chatgpt: {
    icon: '../ui/llm-providers/chatgpt.svg',
    textConfig: {
      url: 'https://chatgpt.com/',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[data-testid="send-button"]',
    },
    imageConfig: {
      // ChatGPT handles image generation directly - same interface
      url: 'https://chatgpt.com/',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[data-testid="send-button"]',
    },
  },
  gemini: {
    icon: '../ui/llm-providers/gemini.svg',
    textConfig: {
      url: 'https://gemini.google.com/app',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[aria-label="Send message"]',
    },
    imageConfig: {
      url: 'https://gemini.google.com/app',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[aria-label="Send message"]',
      // Need to click "Create Image" button first
      prePromptSelector: 'button[aria-label*="Create Image"]',
    },
    videoConfig: {
      url: 'https://gemini.google.com/app',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[aria-label="Send message"]',
      // Need to click "Create video" button first
      prePromptSelector: 'button[aria-label*="Create video"]',
    },
  },
  grok: {
    icon: '../ui/llm-providers/grok.svg',
    textConfig: {
      url: 'https://grok.com/',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[aria-label="Submit"]',
    },
    imageConfig: {
      url: 'https://grok.com/imagine/',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[aria-label="Submit"]',
      prePromptProvider: 'grok',
      prePromptMode: 'image',
      imageModalProvider: 'grok',
    },
    videoConfig: {
      url: 'https://grok.com/imagine/',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[aria-label="Submit"]',
      prePromptProvider: 'grok',
      prePromptMode: 'video',
      imageModalProvider: 'grok',
    },
  },
  claude: {
    icon: '../ui/llm-providers/claude.svg',
    textConfig: {
      url: 'https://claude.ai/new',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[aria-label="Send message"]',
    },
    // Claude doesn't support image generation
  },
  perplexity: {
    icon: '../ui/llm-providers/perplexity.svg',
    textConfig: {
      url: 'https://www.perplexity.ai/',
      promptSelector: '#ask-input',
      submitSelector: 'button[data-testid="submit-button"]',
    },
  },
  mistral: {
    icon: '../ui/llm-providers/mistral.svg',
    textConfig: {
      url: 'https://chat.mistral.ai/chat',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector: 'button[type="submit"]',
    },
  },
  meta: {
    icon: '../ui/llm-providers/meta.svg',
    textConfig: {
      url: 'https://www.meta.ai/',
      promptSelector: 'div[contenteditable="true"]',
      submitSelector:
        'div[data-pagelet="KadabraPrivateComposer"] div[role="button"]:not([aria-haspopup="menu"]):last-of-type',
    },
  },
  zAI: {
    icon: '../ui/llm-providers/zai.svg',
    textConfig: {
      url: 'https://chat.z.ai/',
      promptSelector: '#chat-input',
      submitSelector: '#send-message-button',
    },
  },
  t3: {
    icon: '../ui/llm-providers/t3.webp',
    textConfig: {
      url: 'https://t3.chat/',
      promptSelector: '#chat-input',
      submitSelector: 'button[type="submit"]',
    },
  },
  quillBot: {
    icon: '../ui/llm-providers/quillBot.png',
    textConfig: {
      url: 'https://quillbot.com/ai-chat',
      promptSelector: 'textarea[data-testid="ai-chat-input"]',
      submitSelector: 'button[data-testid="quill-chat-send-button"]',
    },
  },
};
