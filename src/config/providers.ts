/**
 * Provider configuration with URLs and selectors for prompt injection
 */
export interface ProviderConfig {
  url: string;
  icon: string;
  promptSelector: string;
  submitSelector: string;
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

export const providers: Record<Provider, ProviderConfig> = {
  chatgpt: {
    url: 'https://chatgpt.com/',
    promptSelector: 'div[contenteditable="true"]',
    submitSelector: 'button[data-testid="send-button"]',
    icon: '../ui/llm-providers/chatgpt.svg',
  },
  gemini: {
    url: 'https://gemini.google.com/app',
    promptSelector: 'div[contenteditable="true"]',
    submitSelector: 'button[aria-label="Send message"]',
    icon: '../ui/llm-providers/gemini.svg',
  },
  claude: {
    url: 'https://claude.ai/new',
    promptSelector: 'div[contenteditable="true"]',
    submitSelector: 'button[aria-label="Send message"]',
    icon: '../ui/llm-providers/claude.svg',
  },
  perplexity: {
    url: 'https://www.perplexity.ai/',
    promptSelector: '#ask-input',
    submitSelector: 'button[data-testid="submit-button"]',
    icon: '../ui/llm-providers/perplexity.svg',
  },
  grok: {
    url: 'https://grok.com/',
    promptSelector: 'div[contenteditable="true"]',
    submitSelector: 'button[aria-label="Submit"]',
    icon: '../ui/llm-providers/grok.svg',
  },
  mistral: {
    url: 'https://chat.mistral.ai/chat',
    promptSelector: 'div[contenteditable="true"]',
    submitSelector: 'button[type="submit"]',
    icon: '../ui/llm-providers/mistral.svg',
  },
  meta: {
    url: 'https://www.meta.ai/',
    promptSelector: 'div[contenteditable="true"]',
    submitSelector:
      'div[data-pagelet="KadabraPrivateComposer"] div[role="button"]:not([aria-haspopup="menu"]):last-of-type',
    icon: '../ui/llm-providers/meta.svg',
  },
  zAI: {
    url: 'https://chat.z.ai/',
    promptSelector: '#chat-input',
    submitSelector: '#send-message-button',
    icon: '../ui/llm-providers/zai.svg',
  },
  t3: {
    url: 'https://t3.chat/',
    promptSelector: '#chat-input',
    submitSelector: 'button[type="submit"]',
    icon: '../ui/llm-providers/t3.webp',
  },
  quillBot: {
    url: 'https://quillbot.com/ai-chat',
    promptSelector: 'textarea[data-testid="ai-chat-input"]',
    submitSelector: 'button[data-testid="quill-chat-send-button"]',
    icon: '../ui/llm-providers/quillBot.png',
  },
};
