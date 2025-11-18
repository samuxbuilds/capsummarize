import { marked } from 'marked';
import { animateProgress, copyToClipboard, hide, show, showToast } from './ui-utils.js';
import StorageUtils from '../utils/storage.js';
import { extractTextFromVTT } from '../utils/vtt.js';
import {
  openAndInject,
  getAvailableProviders,
  getProviderDisplayName,
  getProviderIcon,
  getProviderOriginPattern,
  isProviderURL,
  type Provider,
} from '../services/providerService.js';
import { getApiBaseUrl as getEnvApiBaseUrl } from '../config/env.js';
import { loadCustomVariants, loadUserPreferences, type CustomVariant } from './settings.js';
import { getPromptVariants as getPromptVariantsFromAPI } from '../utils/variantsCache.js';
import APIUtils from '../utils/api.js';
import {
  cachePrompts,
  loadCachedPrompts,
  hasFreshCache,
  hasReachedDailyLimit,
  getRemainingSummaries,
  getStoredLicenseValidation,
  incrementUsage,
  FREE_DAILY_LIMIT,
  type CachedPromptVariant,
} from '../utils/promptsCache.js';

/**
 * Summary message interface
 */
interface SummaryMessage {
  type: 'summary' | 'error' | 'loading';
  data?: {
    summary: string;
    variant: string;
    videoTitle?: string;
    readTime?: string;
    vtt?: string;
    url?: string;
  };
  error?: string;
}

/**
 * Cached DOM elements interface
 */
interface Elements {
  mainContent: HTMLElement | null;
  historySection: HTMLElement | null;
  historyList: HTMLElement | null;
  historyHeader: HTMLElement | null;
  historyChevron: SVGElement | null;
  clearHistoryBtn: HTMLButtonElement | null;
  readyState: HTMLElement | null;
  loadingState: HTMLElement | null;
  summaryState: HTMLElement | null;
  errorState: HTMLElement | null;
  noSubtitlesState: HTMLElement | null;
  progressBar: HTMLElement | null;
  progressText: HTMLElement | null;
  summaryContent: HTMLElement | null;
  variantBadge: HTMLElement | null;
  variantSelect: HTMLSelectElement | null;
  variantDescription: HTMLElement | null;
  readTime: HTMLElement | null;
  errorMessage: HTMLElement | null;
  settingsBtn: HTMLButtonElement | null;
  closeBtn: HTMLButtonElement | null;
  retryBtn: HTMLButtonElement | null;
  speakBtn: HTMLButtonElement | null;
  copyBtn: HTMLButtonElement | null;
  downloadBtn: HTMLButtonElement | null;
  questionInput: HTMLInputElement | null;
  askBtn: HTMLButtonElement | null;
  qaResponse: HTMLElement | null;
  qaAnswer: HTMLElement | null;
  qaSection: HTMLElement | null;
  clearQaBtn: HTMLButtonElement | null;
  variantHelp: HTMLElement | null;
  providerButtonsContainer: HTMLElement | null;
  summaryProviderButtonsContainer: HTMLElement | null;
  footer: HTMLElement | null;
}

/**
 * Prompt variant interface
 */
interface PromptVariant {
  variant: string;
  description: string;
  prompt: string;
}

/**
 * Cached elements
 */
let elements: Elements;
let currentSummary: string | null = null;
let currentVideoId: string | null = null;
let currentVtt: string | null = null;
let currentUrl: string | null = null;
let currentVariant: string = 'default';
let includeTimestampsPreference: boolean = false;
let isSpeaking: boolean = false;
let selectedHistoryId: string | null = null;

/**
 * Cache DOM elements on initialization
 */
function cacheElements(): void {
  const get = (id: string): HTMLElement | null => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`Element with id "${id}" not found`);
      return null;
    }
    return el;
  };

  elements = {
    mainContent: get('mainContent'),
    historySection: get('historySection'),
    historyList: get('historyList'),
    historyHeader: get('historyHeader'),
    historyChevron: get('historyChevron') as SVGElement | null,
    clearHistoryBtn: get('clearHistoryBtn') as HTMLButtonElement | null,
    readyState: get('readyState'),
    loadingState: get('loadingState'),
    summaryState: get('summaryState'),
    errorState: get('errorState'),
    noSubtitlesState: get('noSubtitlesState'),
    progressBar: get('progressBar'),
    progressText: get('progressText'),
    summaryContent: get('summaryContent'),
    variantBadge: get('variant'),
    variantSelect: get('variantSelect') as HTMLSelectElement | null,
    variantDescription: get('variantDescription'),
    readTime: get('readTime'),
    errorMessage: get('errorMessage'),
    settingsBtn: get('settingsBtn') as HTMLButtonElement | null,
    closeBtn: get('closeBtn') as HTMLButtonElement | null,
    retryBtn: get('retryBtn') as HTMLButtonElement | null,
    speakBtn: get('speakBtn') as HTMLButtonElement | null,
    copyBtn: get('copyBtn') as HTMLButtonElement | null,
    downloadBtn: get('downloadBtn') as HTMLButtonElement | null,
    questionInput: get('questionInput') as HTMLInputElement | null,
    askBtn: get('askBtn') as HTMLButtonElement | null,
    qaResponse: get('qaResponse'),
    qaAnswer: get('qaAnswer'),
    qaSection: get('qaSection'),
    clearQaBtn: get('clearQaBtn') as HTMLButtonElement | null,
    variantHelp: get('variantHelp'),
    providerButtonsContainer: get('providerButtonsContainer'),
    summaryProviderButtonsContainer: get('summaryProviderButtonsContainer'),
    footer: get('footer'),
  };
}

/**
 * Show ready state with variant selector and generate button
 */
async function showReady(): Promise<void> {
  hide(elements.loadingState);
  hide(elements.summaryState);
  hide(elements.errorState);
  hide(elements.noSubtitlesState);
  hide(elements.qaSection);
  hide(elements.footer); // Hide footer since custom provider was removed
  show(elements.readyState);

  // Update usage display
  await updateUsageDisplay();
}

/**
 * Show no subtitles found state
 */
function showNoSubtitles(): void {
  hide(elements.readyState);
  hide(elements.loadingState);
  hide(elements.summaryState);
  hide(elements.errorState);
  hide(elements.qaSection);
  hide(elements.footer);
  show(elements.noSubtitlesState);
}

/**
 * Show loading state with animated progress
 */
function showLoading(): void {
  hide(elements.readyState);
  hide(elements.summaryState);
  hide(elements.errorState);
  hide(elements.noSubtitlesState);
  hide(elements.qaSection);
  hide(elements.footer);
  show(elements.loadingState);

  // Animate progress bar
  const steps = [
    { progress: 30, text: '🎬 Extracting captions...', delay: 0 },
    { progress: 60, text: '🧠 Understanding video...', delay: 3000 },
    { progress: 85, text: '✨ Crafting your summary...', delay: 6000 },
  ];

  steps.forEach(({ progress, text, delay }) => {
    setTimeout(() => {
      animateProgress(elements.progressBar, progress, 500);
      if (elements.progressText) {
        elements.progressText.textContent = text;
      }
    }, delay);
  });
}

/**
 * Show summary state with content
 */
function showSummary(summary: string, variant: string, readTime?: string): void {
  hide(elements.readyState);
  hide(elements.loadingState);
  hide(elements.errorState);
  hide(elements.noSubtitlesState);
  hide(elements.footer); // Show footer for summary actions (speak, copy, download)
  show(elements.qaSection);

  // Stop TTS if speaking when loading new summary
  if (isSpeaking) {
    chrome.tts.stop();
    isSpeaking = false;
    updateSpeakButton(false);
  }

  currentSummary = summary;

  // Parse markdown and update content
  const parsedMarkdown = marked.parse(summary) as string;
  if (elements.summaryContent) {
    elements.summaryContent.innerHTML = parsedMarkdown;
  }
  if (elements.variantBadge) {
    elements.variantBadge.textContent = variant;
  }

  if (readTime) {
    if (elements.readTime) {
      elements.readTime.textContent = readTime;
    }
  } else {
    // Calculate read time based on word count (assuming 200 words per minute)
    const wordCount = summary.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / 200);
    if (elements.readTime) {
      elements.readTime.textContent = `${minutes} min read`;
    }
  }

  show(elements.summaryState);
}

/**
 * Update usage display in the UI
 */
async function updateUsageDisplay(): Promise<void> {
  try {
    const remaining = await getRemainingSummaries();
    const licenseValidation = await getStoredLicenseValidation();

    // Find or create usage display element
    let usageDisplay = document.getElementById('usageDisplay');

    if (!usageDisplay) {
      usageDisplay = document.createElement('div');
      usageDisplay.id = 'usageDisplay';
      usageDisplay.className =
        'text-xs text-muted-foreground px-3 py-1 bg-muted/50 rounded-md mb-3';

      // Insert after variant description
      const variantDescription = document.getElementById('variantDescription');
      if (variantDescription && variantDescription.parentNode) {
        variantDescription.parentNode.insertBefore(usageDisplay, variantDescription.nextSibling);
      }
    }

    if (licenseValidation.valid && licenseValidation.lifetime) {
      usageDisplay.textContent = 'Pro Lifetime - Unlimited summaries';
      usageDisplay.className = 'text-xs text-green-600 px-3 py-1 bg-green-50 rounded-md mb-3';
    } else if (remaining === Infinity) {
      usageDisplay.textContent = 'Pro - Unlimited summaries';
      usageDisplay.className = 'text-xs text-green-600 px-3 py-1 bg-green-50 rounded-md mb-3';
    } else {
      usageDisplay.textContent = `${remaining} of ${FREE_DAILY_LIMIT} summaries remaining today`;
      usageDisplay.className =
        remaining <= 2
          ? 'text-xs text-orange-600 px-3 py-1 bg-orange-50 rounded-md mb-3'
          : 'text-xs text-muted-foreground px-3 py-1 bg-muted/50 rounded-md mb-3';
    }
  } catch (error) {
    console.error('[Sidepanel] Failed to update usage display:', error);
  }
}

/**
 * Show upgrade to pro prompt when limit is reached
 */
function showUpgradePrompt(): void {
  hide(elements.readyState);
  hide(elements.loadingState);
  hide(elements.summaryState);
  hide(elements.errorState);
  hide(elements.noSubtitlesState);
  hide(elements.qaSection);

  // Create upgrade prompt HTML
  const upgradeHTML = `
    <div class="upgrade-prompt flex flex-col items-center justify-center p-8 text-center">
      <div class="mb-6">
        <svg class="w-16 h-16 text-primary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
        <h3 class="text-xl font-semibold mb-2">Daily Limit Reached</h3>
        <p class="text-muted-foreground mb-6">You've reached your free limit of ${FREE_DAILY_LIMIT} summaries per day.</p>
      </div>
      
      <div class="space-y-3 w-full max-w-sm">
        <a href="https://www.capsummarize.app/" target="_blank" 
           class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 w-full">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
          Upgrade to Pro Lifetime
        </a>
        
        <button id="maybeLaterBtn" 
                class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4 w-full">
          Maybe Later
        </button>
      </div>
      
      <p class="text-xs text-muted-foreground mt-6">
        Get unlimited summaries, custom variants, and priority support
      </p>
    </div>
  `;

  // Insert the upgrade prompt into the main content area
  if (elements.mainContent) {
    elements.mainContent.innerHTML = upgradeHTML;
    show(elements.mainContent);
  }

  // Add event listener for the "Maybe Later" button
  const maybeLaterBtn = document.getElementById('maybeLaterBtn') as HTMLButtonElement;
  if (maybeLaterBtn) {
    maybeLaterBtn.addEventListener('click', () => {
      showReady();
    });
  }
}

/**
 * Show error state with message
 */
function showError(message: string): void {
  hide(elements.readyState);
  hide(elements.loadingState);
  hide(elements.summaryState);
  hide(elements.noSubtitlesState);
  hide(elements.qaSection);

  if (elements.errorMessage) {
    elements.errorMessage.textContent = message;
  }
  show(elements.errorState);
}

/**
 * Copy summary to clipboard
 */
async function handleCopy(): Promise<void> {
  if (!currentSummary) return;

  const success = await copyToClipboard(currentSummary);
  if (success) {
    showToast('Summary copied to clipboard', 2000, 'success');
  } else {
    showToast('Failed to copy summary', 2000, 'error');
  }
}

/**
 * Download summary as markdown file
 */
function handleDownload(): void {
  if (!currentSummary) return;

  const blob = new Blob([currentSummary], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `summary-${currentVideoId || Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Summary downloaded', 2000, 'success');
}

/**
 * Text-to-Speech: Read summary aloud with chunking for large texts
 */
function handleSpeak(): void {
  if (!currentSummary) {
    showToast('No summary available to read', 2000, 'error');
    return;
  }

  // If already speaking, stop
  if (isSpeaking) {
    chrome.tts.stop();
    isSpeaking = false;
    updateSpeakButton(false);
    showToast('Stopped reading', 2000, 'info');
    return;
  }

  // Clean the markdown for better TTS output
  const cleanText = cleanMarkdownForSpeech(currentSummary);

  // Start speaking
  isSpeaking = true;
  updateSpeakButton(true);
  showToast('Reading summary aloud...', 2000, 'info');

  // Use chunked TTS for large texts
  speakTextInChunks(cleanText, {
    voiceName: 'Google US English',
    lang: 'en-US',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    onComplete: () => {
      isSpeaking = false;
      updateSpeakButton(false);
      showToast('Finished reading', 2000, 'success');
    },
    onError: () => {
      isSpeaking = false;
      updateSpeakButton(false);
      showToast('Error reading summary', 2000, 'error');
    },
    onInterrupted: () => {
      isSpeaking = false;
      updateSpeakButton(false);
    },
  });
}

/**
 * Speak text in chunks to handle large content
 */
function speakTextInChunks(
  text: string,
  options: {
    voiceName?: string;
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    onComplete?: () => void;
    onError?: () => void;
    onInterrupted?: () => void;
  }
): void {
  const MAX_CHUNK_SIZE = 1800; // Safe chunk size for chrome.tts
  const {
    voiceName = 'Google US English',
    lang = 'en-US',
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    onComplete,
    onError,
    onInterrupted,
  } = options;

  // Split text into chunks at sentence boundaries when possible
  const chunks = splitTextIntoChunks(text, MAX_CHUNK_SIZE);
  let currentChunkIndex = 0;
  let wasInterrupted = false;

  function speakNextChunk(): void {
    if (!isSpeaking || wasInterrupted) {
      return;
    }

    if (currentChunkIndex >= chunks.length) {
      if (onComplete) onComplete();
      return;
    }

    const chunk = chunks[currentChunkIndex++] || '';

    const ttsOptions: any = {
      lang,
      rate,
      pitch,
      volume,
      enqueue: false,
      onEvent: (event: any) => {
        if (event.type === 'end') {
          // Speak next chunk
          speakNextChunk();
        } else if (event.type === 'interrupted' || event.type === 'cancelled') {
          wasInterrupted = true;
          if (onInterrupted) onInterrupted();
        } else if (event.type === 'error') {
          console.error('TTS error event:', event);
          wasInterrupted = true;
          if (onError) onError();
        }
      },
    };

    // Add voiceName only if provided
    if (voiceName) {
      ttsOptions.voiceName = voiceName;
    }

    chrome.tts.speak(chunk, ttsOptions, () => {
      if (chrome.runtime.lastError) {
        console.error('TTS callback error:', chrome.runtime.lastError.message);
        // Try web speech API as fallback
        if (chunk) {
          tryWebSpeechFallback(chunk, { lang, rate, pitch });
        }
      }
    });
  }

  // Start speaking the first chunk
  speakNextChunk();
}

/**
 * Split text into chunks at sentence boundaries when possible
 */
function splitTextIntoChunks(text: string, maxSize: number): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxSize) {
      chunks.push(remainingText);
      break;
    }

    // Try to find a sentence boundary within maxSize
    let splitIndex = maxSize;
    const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];

    // Look for the last sentence ending within the chunk
    let lastSentenceEnd = -1;
    for (const ending of sentenceEndings) {
      const index = remainingText.lastIndexOf(ending, maxSize);
      if (index > lastSentenceEnd && index > maxSize * 0.5) {
        // Only split at sentence if it's not too early (past 50% of maxSize)
        lastSentenceEnd = index + ending.length;
      }
    }

    if (lastSentenceEnd > 0) {
      splitIndex = lastSentenceEnd;
    } else {
      // If no sentence boundary found, try to split at a word boundary
      const lastSpace = remainingText.lastIndexOf(' ', maxSize);
      if (lastSpace > maxSize * 0.7) {
        // Only split at word if it's not too early (past 70% of maxSize)
        splitIndex = lastSpace + 1;
      }
    }

    chunks.push(remainingText.slice(0, splitIndex).trim());
    remainingText = remainingText.slice(splitIndex).trim();
  }

  return chunks;
}

/**
 * Fallback to Web Speech API if chrome.tts fails
 */
function tryWebSpeechFallback(
  text: string,
  options: { lang: string; rate: number; pitch: number }
): void {
  try {
    if (window && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang;
      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      window.speechSynthesis.speak(utterance);
      console.log('Using Web Speech API fallback');
    }
  } catch (error) {
    console.error('Web Speech API fallback failed:', error);
  }
}

/**
 * Clean markdown text for better TTS output
 */
function cleanMarkdownForSpeech(markdown: string): string {
  let text = markdown;

  // Remove markdown headings symbols but keep the text
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`(.+?)`/g, '$1');

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Remove emojis and special unicode symbols (they get read as descriptions by TTS)
  // This removes most common emojis, symbols, and pictographs
  text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
  text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols and Pictographs
  text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport and Map
  text = text.replace(/[\u{1F700}-\u{1F77F}]/gu, ''); // Alchemical Symbols
  text = text.replace(/[\u{1F780}-\u{1F7FF}]/gu, ''); // Geometric Shapes Extended
  text = text.replace(/[\u{1F800}-\u{1F8FF}]/gu, ''); // Supplemental Arrows-C
  text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols and Pictographs
  text = text.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Chess Symbols
  text = text.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Symbols and Pictographs Extended-A
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Misc symbols
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
  text = text.replace(/[\u{2300}-\u{23FF}]/gu, ''); // Misc Technical
  text = text.replace(/[\u{2B50}]/gu, ''); // Star and other symbols
  text = text.replace(/[\u{FE0F}]/gu, ''); // Variation Selector

  // Remove common symbols that TTS reads aloud
  text = text.replace(/[→←↑↓↔⇒⇐⇑⇓⇔]/g, ''); // Arrows
  text = text.replace(/[✓✔✕✖✗✘]/g, ''); // Check marks and X marks
  text = text.replace(/[★☆⭐]/g, ''); // Stars
  text = text.replace(/[♠♣♥♦]/g, ''); // Card suits
  text = text.replace(/[©®™]/g, ''); // Copyright, trademark
  text = text.replace(/[•◦▪▫]/g, ''); // Bullet variants
  text = text.replace(/[【】〖〗]/g, ''); // Special brackets

  // Convert bullet points to natural speech
  text = text.replace(/^[\*\-\+]\s+/gm, '');

  // Convert numbered lists to natural speech
  text = text.replace(/^\d+\.\s+/gm, '');

  // Remove horizontal rules
  text = text.replace(/^[-_*]{3,}$/gm, '');

  // Remove blockquote markers
  text = text.replace(/^>\s+/gm, '');

  // Clean up extra whitespace and punctuation
  text = text.replace(/\n\n+/g, '. ');
  text = text.replace(/\n/g, '. ');
  text = text.replace(/\s\s+/g, ' ');
  text = text.replace(/\.{2,}/g, '.');
  text = text.replace(/\.\s*\./g, '.');
  text = text.trim();

  return text;
}

/**
 * Update speak button icon based on speaking state
 */
function updateSpeakButton(speaking: boolean): void {
  if (!elements.speakBtn) return;

  const svg = elements.speakBtn.querySelector('svg');
  if (!svg) return;

  if (speaking) {
    // Change to stop icon
    elements.speakBtn.title = 'Stop reading';
    elements.speakBtn.setAttribute('aria-label', 'Stop reading aloud');
    svg.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z">
      </path>
    `;
  } else {
    // Change to play icon
    elements.speakBtn.title = 'Read summary aloud';
    elements.speakBtn.setAttribute('aria-label', 'Read summary aloud');
    svg.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z">
      </path>
    `;
  }
}

/**
 * Get the stored prompt template for the current variant
 */
async function getCurrentPromptTemplate(): Promise<string | null> {
  try {
    const stored = await StorageUtils.get<{
      template: string;
      variant: string;
      timestamp: number;
    }>('currentPromptTemplate');

    if (stored && stored.variant === currentVariant) {
      return stored.template;
    }

    // If no stored template or variant mismatch, get from current selection
    return getSelectedPromptTemplate();
  } catch (error) {
    console.error('[Sidepanel] Failed to get current prompt template:', error);
    return getSelectedPromptTemplate();
  }
}

/**
 * Get the prompt template for the currently selected variant
 */
function getSelectedPromptTemplate(): string | null {
  if (!elements.variantSelect) return null;

  const selectedOption = elements.variantSelect.selectedOptions[0];
  if (!selectedOption) return null;

  // For system variants, get the prompt from dataset
  const systemPrompt = selectedOption.dataset.prompt;
  if (systemPrompt) {
    return systemPrompt;
  }

  // For custom variants, get the prompt from dataset
  const customPrompt = selectedOption.dataset.prompt;
  if (customPrompt) {
    return customPrompt;
  }

  return null;
}

/**
 * Handle variant change - regenerate summary with new variant
 */
async function handleVariantChange(): Promise<void> {
  if (!elements.variantSelect) return;

  const selectedVariant = elements.variantSelect.value;

  // Update description text
  updateVariantDescription();

  if (!currentVtt || selectedVariant === currentVariant) return;

  currentVariant = selectedVariant;

  // Get the prompt template for the selected variant and store it
  const promptTemplate = getSelectedPromptTemplate();
  if (promptTemplate) {
    // Store the prompt template for use when generating summary
    await StorageUtils.set('currentPromptTemplate', {
      template: promptTemplate,
      variant: selectedVariant,
      timestamp: Date.now(),
    });
    console.log(`[Sidepanel] Stored prompt template for variant: ${selectedVariant}`);
  }

  // Stop TTS if speaking
  if (isSpeaking) {
    chrome.tts.stop();
    isSpeaking = false;
    updateSpeakButton(false);
  }
}

/**
 * Handle Q&A question submission
 */
async function handleAskQuestion(): Promise<void> {
  if (!elements.questionInput || !elements.askBtn) return;

  const question = elements.questionInput.value.trim();

  if (!question || !currentVtt) {
    showToast('Please enter a question', 2000, 'error');
    return;
  }

  try {
    elements.askBtn.disabled = true;
    elements.askBtn.textContent = 'Asking...';

    const response = await fetch(`${getEnvApiBaseUrl()}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vtt: currentVtt,
        url: currentUrl,
        question: question,
      }),
    });

    const data = await response.json();

    if (data.success && data.summary) {
      // Parse and show answer
      const parsedAnswer = marked.parse(data.summary) as string;
      if (elements.qaAnswer) {
        elements.qaAnswer.innerHTML = parsedAnswer;
      }
      if (elements.qaResponse) {
        show(elements.qaResponse);
      }
      showToast('Answer generated', 2000, 'success');
    } else {
      showError(data.error || 'Failed to generate answer');
    }
  } catch (error) {
    console.error('Failed to ask question:', error);
    showToast('Failed to communicate with API server', 2000, 'error');
  } finally {
    if (elements.askBtn) {
      elements.askBtn.disabled = false;
      elements.askBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
        </svg>
      `;
    }
  }
}

/**
 * Clear Q&A response
 */
function handleClearQa(): void {
  if (elements.questionInput) {
    elements.questionInput.value = '';
  }
  if (elements.qaAnswer) {
    elements.qaAnswer.innerHTML = '';
  }
  if (elements.qaResponse) {
    hide(elements.qaResponse);
  }
}

/**
 * Load available prompt variants from API with caching
 */
async function loadPromptVariants(): Promise<void> {
  if (!elements.variantSelect) return;

  try {
    // Load user preferences to get default variant
    const userPreferences = await loadUserPreferences();
    const defaultVariant = userPreferences?.defaultVariant || 'default';
    includeTimestampsPreference = !!userPreferences?.includeTimestamps;

    // Load custom variants from IndexedDB
    const customVariants = await loadCustomVariants();

    // Clear existing options
    if (elements.variantSelect) {
      elements.variantSelect.innerHTML = '';
    }

    // Get system variants from API with caching
    console.log('[Sidepanel] Loading prompt variants from API...');
    const systemVariants = await getPromptVariantsFromAPI();

    // Add system variants first
    systemVariants.forEach((variant) => {
      const option = document.createElement('option');
      option.value = variant.variant;
      option.textContent = variant.label;
      option.dataset.description = variant.description;
      option.dataset.prompt = variant.prompt; // Store the actual prompt template
      option.dataset.isCustom = 'false';

      // Select the user's preferred default variant
      if (variant.variant === defaultVariant) {
        option.selected = true;
        currentVariant = variant.variant;
      }

      elements.variantSelect?.appendChild(option);
    });

    // Add separator if there are custom variants
    if (customVariants.length > 0) {
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '── Custom Variants ──';
      elements.variantSelect.appendChild(separator);
    }

    // Add custom variants
    customVariants.forEach((variant) => {
      const option = document.createElement('option');
      option.value = variant.variant;
      option.textContent = variant.variant; // Use variant name as display text
      option.dataset.description = variant.description;
      option.dataset.prompt = variant.prompt;
      option.dataset.isCustom = 'true';

      // Select if this was the user's preferred variant
      if (variant.variant === defaultVariant) {
        option.selected = true;
        currentVariant = variant.variant;
      }

      elements.variantSelect?.appendChild(option);
    });

    // Update variant description
    updateVariantDescription();

    console.log(
      `[Sidepanel] Loaded ${systemVariants.length} system variants and ${customVariants.length} custom variants`
    );
  } catch (error) {
    console.error('[Sidepanel] Failed to load prompt variants:', error);
    showToast('Failed to load prompt variants', 3000, 'error');
  }
}

/**
 * Update the variant description based on selected option
 */
function updateVariantDescription(): void {
  if (!elements.variantSelect || !elements.variantDescription) return;

  const selectedOption = elements.variantSelect.selectedOptions[0];
  if (selectedOption && selectedOption.dataset.description) {
    elements.variantDescription.textContent = selectedOption.dataset.description;
  } else {
    elements.variantDescription.textContent = 'Select a summary style to see its description';
  }
}

/**
 * Retry after error - check for VTT and update state
 */
async function handleRetry(): Promise<void> {
  try {
    showLoading();

    // Get current tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab?.id) {
      showError('Unable to access current tab. Please try again.');
      return;
    }

    // Try to get VTT content from background
    const response = await chrome.runtime.sendMessage({
      action: 'getVTTContent',
      tabId: currentTab.id,
      tabUrl: currentTab.url,
    });

    if (response?.vtt) {
      // VTT found! Store it and show ready state
      currentVtt = response.vtt;
      currentUrl = response.url || currentTab.url;
      clearHistorySelection();
      console.log('[Sidepanel] ✅ VTT found on retry:', response.vtt.length, 'bytes');
      showReady();
      showToast('Subtitles found! Select a style and provider.', 2000, 'success');
    } else {
      // Still no VTT
      showError('No subtitles found. Please ensure the video has captions enabled.');
    }
  } catch (error) {
    console.error('[Sidepanel] Retry failed:', error);
    showError('Failed to check for subtitles. Please try again.');
  }
}

/**
 * Close side panel
 */
function handleClose(): void {
  // Stop TTS if speaking
  if (isSpeaking) {
    chrome.tts.stop();
    isSpeaking = false;
    updateSpeakButton(false);
  }

  // Notify background that panel is closing
  chrome.runtime.sendMessage({ action: 'sidePanelClosed' }).catch(() => {
    // Background might not be listening, that's okay
  });

  window.close();
}

/**
 * Get transcript text from VTT
 */
function getTranscriptText(): string | null {
  if (!currentVtt) return null;
  const removeTimestamps = !includeTimestampsPreference;
  const transcript = extractTextFromVTT(currentVtt, removeTimestamps);
  return transcript && transcript.trim() ? transcript : null;
}

async function refreshUserPreferences(): Promise<void> {
  try {
    const preferences = await loadUserPreferences();
    includeTimestampsPreference = !!preferences?.includeTimestamps;
  } catch (error) {
    console.error('[Sidepanel] Failed to refresh user preferences:', error);
  }
}

function clearHistorySelection(): void {
  selectedHistoryId = null;
  document.querySelectorAll('.history-card.selected').forEach((card) => {
    card.classList.remove('selected');
  });
}

async function refreshCurrentTabVTT(): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab?.id) {
      return false;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'getVTTContent',
      tabId: currentTab.id,
      tabUrl: currentTab.url,
    });

    if (response?.vtt) {
      currentVtt = response.vtt;
      currentUrl = response.url || currentTab.url || null;
      clearHistorySelection();
      console.log('[Sidepanel] 🔄 Refreshed VTT from active tab');
      return true;
    }
  } catch (error) {
    console.error('[Sidepanel] Failed to refresh current tab VTT:', error);
  }

  return false;
}

async function ensureProviderPermission(provider: Provider): Promise<boolean> {
  const originPattern = getProviderOriginPattern(provider);
  if (!originPattern) {
    return true;
  }

  try {
    const alreadyGranted = await chrome.permissions.contains({ origins: [originPattern] });
    if (alreadyGranted) {
      return true;
    }

    const granted = await chrome.permissions.request({ origins: [originPattern] });
    if (!granted) {
      showToast(`${getProviderDisplayName(provider)} permission denied`, 2500, 'error');
      return false;
    }

    showToast(`${getProviderDisplayName(provider)} enabled`, 2000, 'success');
    return true;
  } catch (error) {
    console.error('[Sidepanel] Failed to request provider permission:', error);
    showToast('Unable to request site permission', 2500, 'error');
    return false;
  }
}

/**
 * Open provider with injected prompt
 */
async function handleOpenProvider(provider: Provider): Promise<void> {
  try {
    // Check if user has reached daily limit
    const hasReachedLimit = await hasReachedDailyLimit();
    const licenseValidation = await getStoredLicenseValidation();

    if (hasReachedLimit && !licenseValidation.valid) {
      showUpgradePrompt();
      return;
    }

    await refreshUserPreferences();

    if (!selectedHistoryId) {
      await refreshCurrentTabVTT();
    }

    const transcript = getTranscriptText();
    if (!transcript) {
      showToast('No subtitles available to build prompt', 2000, 'error');
      return;
    }

    const prompt = elements.variantSelect
      ?.querySelector(`option[value="${elements.variantSelect.value}"]`)
      ?.getAttribute('data-prompt');
    const finalPrompt = `${prompt}\n\n${transcript}`;
    console.log('[Sidepanel] Composed prompt:', finalPrompt);

    // Increment usage count for non-licensed users
    if (!licenseValidation.valid) {
      await incrementUsage();
      // Update usage display to show new count
      await updateUsageDisplay();
    }

    const hasPermission = await ensureProviderPermission(provider);
    if (!hasPermission) {
      return;
    }

    await openAndInject(provider, finalPrompt);
    showToast('Opened provider', 2000, 'success');
  } catch (error) {
    console.error('[Sidepanel] Error opening provider:', error);
    showToast('Failed to open provider', 2000, 'error');
  }
}

/**
 * Update sidepanel state based on current VTT availability
 * Called when tab changes or VTT is detected on current tab
 */
async function updateSidepanelState(): Promise<void> {
  try {
    const hasVTT = await checkVTTStatus();

    // Cache DOM queries - check visibility state once
    const noSubtitlesVisible = !elements.noSubtitlesState?.classList.contains('hidden');
    const readyStateVisible = !elements.readyState?.classList.contains('hidden');
    const summaryStateVisible = !elements.summaryState?.classList.contains('hidden');
    const errorStateVisible = !elements.errorState?.classList.contains('hidden');

    // Only update if currently showing no subtitles state or ready state
    // Don't interrupt if showing a summary or error state
    if ((noSubtitlesVisible || readyStateVisible) && !summaryStateVisible && !errorStateVisible) {
      if (noSubtitlesVisible && hasVTT) {
        // VTT was found! Update to ready state
        console.log('[Sidepanel] VTT found, updating to ready state');
        showReady();
      } else if (readyStateVisible && !hasVTT) {
        // VTT was lost! Update to no subtitles state
        console.log('[Sidepanel] VTT lost, updating to no subtitles state');
        showNoSubtitles();
      }
    }
  } catch (error) {
    console.error('[Sidepanel] Error updating state:', error);
  }
}

/**
 * Listen for messages from popup or background
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: any) => {
    console.log('Side panel received message:', message);

    // Handle close request from background
    if (message.action === 'closeSidePanel') {
      window.close();
      return;
    }

    // Handle generic summary message
    if (message.type === 'summary' || message.type === 'loading' || message.type === 'error') {
      const summaryMsg = message as SummaryMessage;
      switch (summaryMsg.type) {
        case 'loading':
          showLoading();
          break;

        case 'summary':
          if (summaryMsg.data) {
            // Store VTT and URL for variant changes and Q&A
            if (summaryMsg.data.vtt) currentVtt = summaryMsg.data.vtt;
            if (summaryMsg.data.url) currentUrl = summaryMsg.data.url;
            if (summaryMsg.data.variant) currentVariant = summaryMsg.data.variant;

            showSummary(
              summaryMsg.data.summary,
              summaryMsg.data.variant || 'default',
              summaryMsg.data.readTime
            );
          }
          break;

        case 'error':
          showError(summaryMsg.error || 'An unexpected error occurred');
          break;

        default:
          console.warn('Unknown message type:', message);
      }
    }
    // Handle VTT found notification
    else if (message.action === 'vttFound') {
      console.log('[Sidepanel] VTT found on current tab, updating state...');
      void refreshCurrentTabVTT();
      updateSidepanelState();
    }
    // Handle history update notification
    else if (message.action === 'vttHistoryUpdated') {
      console.log('[Sidepanel] History updated, reloading...');
      loadHistory();
    }
  });
}

/**
 * Generate provider buttons dynamically
 */
function generateProviderButtons(): void {
  const containers = [elements.providerButtonsContainer, elements.summaryProviderButtonsContainer];

  containers.forEach((container) => {
    if (container) {
      container.innerHTML = ''; // Clear existing buttons

      const availableProviders = getAvailableProviders();

      availableProviders.forEach((provider) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'provider-icon-btn';
        button.setAttribute('aria-label', `Open ${getProviderDisplayName(provider)}`);
        button.setAttribute('title', getProviderDisplayName(provider));

        // Create image element for the icon
        const img = document.createElement('img');
        img.src = getProviderIcon(provider);
        img.alt = getProviderDisplayName(provider);
        img.className = 'provider-icon';

        button.appendChild(img);

        button.addEventListener('click', () => handleOpenProvider(provider));

        container.appendChild(button);
      });
    }
  });

  console.log('[Sidepanel] ✅ Generated provider buttons in all containers');
}

/**
 * Setup event listeners
 */
function setupEventListeners(): void {
  if (elements.variantSelect) {
    elements.variantSelect.addEventListener('change', handleVariantChange);
  }
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', () => {
      window.location.href = 'settings.html';
    });
  }
  if (elements.closeBtn) {
    elements.closeBtn.addEventListener('click', handleClose);
  }
  if (elements.retryBtn) {
    elements.retryBtn.addEventListener('click', handleRetry);
  }
  if (elements.speakBtn) {
    elements.speakBtn.addEventListener('click', handleSpeak);
  }
  if (elements.copyBtn) {
    elements.copyBtn.addEventListener('click', handleCopy);
  }
  if (elements.downloadBtn) {
    elements.downloadBtn.addEventListener('click', handleDownload);
  }
  if (elements.askBtn) {
    elements.askBtn.addEventListener('click', handleAskQuestion);
  }
  if (elements.clearQaBtn) {
    elements.clearQaBtn.addEventListener('click', handleClearQa);
  }
  if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.addEventListener('click', clearAllHistory);
  }

  // Toggle history section collapse/expand
  if (elements.historyHeader && elements.historyList && elements.historyChevron) {
    elements.historyHeader.addEventListener('click', () => {
      const isHidden = elements.historyList?.classList.contains('hidden');
      if (isHidden) {
        elements.historyList?.classList.remove('hidden');
        if (elements.historyChevron) {
          elements.historyChevron.style.transform = 'rotate(0deg)';
        }
      } else {
        elements.historyList?.classList.add('hidden');
        if (elements.historyChevron) {
          elements.historyChevron.style.transform = 'rotate(-90deg)';
        }
      }
    });
  }

  // Handle Enter key in question input
  if (elements.questionInput) {
    elements.questionInput.addEventListener('keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAskQuestion();
      }
    });
  }

  // Generate provider buttons dynamically
  generateProviderButtons();
}

/**
 * Check if VTT (subtitles) are available for the current tab
 */
async function checkVTTStatus(): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab?.id) {
      return false;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'getVTTStatus',
      tabId: currentTab.id,
    });

    return response?.hasVTT ?? false;
  } catch (error) {
    console.error('[Sidepanel] Error checking VTT status:', error);
    return false;
  }
}

/**
 * Load and display VTT history
 */
async function loadHistory(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getVTTHistory' });

    if (response?.success && response.history) {
      renderHistory(response.history);
    }
  } catch (err) {
    console.error('[Sidepanel] Failed to load history:', err);
  }
}

/**
 * Render history items
 */
function renderHistory(history: any[]): void {
  if (!history || history.length === 0) {
    if (elements.historySection) {
      elements.historySection.classList.add('hidden');
    }
    return;
  }

  if (elements.historySection) {
    elements.historySection.classList.remove('hidden');
  }
  if (elements.historyList) {
    // Check if the history list is currently expanded
    const isExpanded = !elements.historyList.classList.contains('hidden');

    elements.historyList.innerHTML = history
      .map((item) => createHistoryCard(item))
      .filter(Boolean)
      .join('');

    // Preserve the expanded/collapsed state, or collapse by default if first load
    if (!isExpanded) {
      elements.historyList.classList.add('hidden');
    }
  }
  if (elements.historyChevron && elements.historyList) {
    // Update chevron rotation based on current state
    const isExpanded = !elements.historyList.classList.contains('hidden');
    elements.historyChevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
  }

  // Attach click listeners
  if (elements.historyList) {
    elements.historyList.querySelectorAll('[data-history-id]').forEach((card: Element) => {
      card.addEventListener('click', () => {
        const historyId = card.getAttribute('data-history-id');
        if (historyId) {
          handleHistoryItemClick(historyId);
        }
      });
    });
  }
}

/**
 * Create HTML for a history card
 */
function createHistoryCard(item: any): string | null {
  // Extract text from VTT and get first few words
  let preview = '';

  // If no VTT content, return null
  if (!item.vttContent) {
    return null;
  }

  // Generate preview text
  if (item.vttContent) {
    const fullText = extractTextFromVTT(item.vttContent, true);
    if (fullText) {
      // Get first 30 words
      const words = fullText.trim().split(/\s+/).slice(0, 30);
      preview = words.join(' ') + (words.length >= 30 ? '...' : '');
    }
  }

  return `
    <div class="card hover:bg-card-hover cursor-pointer transition-colors history-card" data-history-id="${item.id}">
      <div class="flex flex-col gap-2 p-3">
        <p class="text-sm text-foreground line-clamp-2 leading-relaxed">${escapeHtml(preview)}</p>
      </div>
    </div>
  `;
}

/**
 * Handle history item click - select the video instead of auto-generating
 */
async function handleHistoryItemClick(historyId: string): Promise<void> {
  try {
    // Get full history item (with VTT content) from backend
    const historyItem = await chrome.runtime.sendMessage({
      action: 'getHistoryItem',
      historyId,
    });

    if (!historyItem?.vttContent) {
      showToast('Failed to load video data', 2000, 'error');
      return;
    }

    // Set current VTT and URL
    currentVtt = historyItem.vttContent;
    currentUrl = historyItem.pageUrl;

    // Update UI to show selection
    document.querySelectorAll('.history-card').forEach((card) => {
      card.classList.remove('selected');
    });

    const selectedCard = document.querySelector(`[data-history-id="${historyId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }

    selectedHistoryId = historyId;

    // Show ready state so user can select variant and provider
    showReady();
    showToast('Video loaded - select a summary style and provider', 3000, 'success');
  } catch (err) {
    console.error('[Sidepanel] Failed to load history item:', err);
    showToast('Failed to load video from history', 2000, 'error');
  }
}

/**
 * Clear all history
 */
async function clearAllHistory(): Promise<void> {
  const confirmed = confirm('Are you sure you want to clear all history?');
  if (!confirmed) return;

  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearVTTHistory' });

    if (response?.success) {
      if (elements.historySection) {
        elements.historySection.classList.add('hidden');
      }
      if (elements.historyList) {
        elements.historyList.innerHTML = '';
      }
      showToast('History cleared', 2000, 'success');
    } else {
      showToast('Failed to clear history', 3000, 'error');
    }
  } catch (err) {
    console.error('[Sidepanel] Failed to clear history:', err);
    showToast('Failed to clear history', 3000, 'error');
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Initialize side panel
 */
async function initialize(): Promise<void> {
  try {
    cacheElements();
    setupEventListeners();
    setupMessageListener();

    // Load available prompt variants
    await loadPromptVariants();

    // Update usage display
    await updateUsageDisplay();

    // Load VTT history
    await loadHistory();

    // Get current tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    // First, try to get VTT content from current tab
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getVTTContent',
        tabId: currentTab?.id,
        tabUrl: currentTab?.url,
      });

      if (response?.vtt) {
        currentVtt = response.vtt;
        if (currentTab?.url) {
          currentUrl = currentTab.url;
        }
        clearHistorySelection();
        console.log('[Sidepanel] Retrieved VTT from background:', response.vtt.length, 'bytes');
      }
    } catch (err) {
      console.log('[Sidepanel] Could not get VTT from background:', err);
    }

    // Check if there's a pending summary in storage
    const pendingSummary = await StorageUtils.get<any>('pendingSummary');

    if (pendingSummary) {
      const { type, data, error, videoId } = pendingSummary;

      if (videoId) {
        currentVideoId = videoId;
      }

      // Store VTT and URL for variant changes and Q&A
      if (data?.vtt) currentVtt = data.vtt;
      if (data?.url) currentUrl = data.url;

      switch (type) {
        case 'loading':
          showLoading();
          break;
        case 'summary':
          if (data) {
            currentVariant = data.variant || 'default';
            showSummary(data.summary, data.variant || 'default', data.readTime);
          }
          break;
        case 'error':
          showError(error || 'An unexpected error occurred');
          break;
      }

      // Clear pending summary
      await StorageUtils.remove('pendingSummary');
    } else {
      // No pending summary - check if VTT is available
      const hasVTT = await checkVTTStatus();

      if (hasVTT) {
        // Show ready state by default (user can then click generate)
        showReady();
      } else {
        // No subtitles found
        showNoSubtitles();
      }
    }
  } catch (error) {
    console.error('Failed to initialize side panel:', error);
    showError('Failed to initialize side panel. Please try again.');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

/**
 * Listen for active tab changes
 * When user switches tabs, update the sidepanel state based on VTT availability
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('[Sidepanel] Tab changed to:', activeInfo.tabId);

  try {
    // Get the tab info to check its URL
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // Skip updating if the new tab is a provider URL
    if (tab.url && isProviderURL(tab.url)) {
      console.log('[Sidepanel] New tab is a provider URL, skipping state update:', tab.url);
      return;
    }

    // Debounce the update to avoid multiple rapid checks
    clearTimeout((window as any).tabChangeTimeout);
    (window as any).tabChangeTimeout = setTimeout(() => {
      updateSidepanelState();
    }, 300);
  } catch (error) {
    console.error('[Sidepanel] Error in tab activation handler:', error);
  }
});

/**
 * Listen for tab updates (when page content changes)
 * This handles the case where a link opens a new page in the same tab
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only update when page finishes loading and we have a URL
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('[Sidepanel] Tab updated and page loaded:', tabId);

    // Skip updating if the URL is a provider URL (fast check, no async needed)
    if (isProviderURL(tab.url)) {
      console.log('[Sidepanel] Tab URL is a provider URL, skipping state update:', tab.url);
      return;
    }

    // Debounce the update
    clearTimeout((window as any).tabUpdateTimeout);
    (window as any).tabUpdateTimeout = setTimeout(() => {
      updateSidepanelState();
    }, 500);
  }
});

// Cleanup TTS when page unloads or becomes hidden
window.addEventListener('beforeunload', () => {
  if (isSpeaking) {
    chrome.tts.stop();
    isSpeaking = false;
  }
});

window.addEventListener('pagehide', () => {
  if (isSpeaking) {
    chrome.tts.stop();
    isSpeaking = false;
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && isSpeaking) {
    chrome.tts.stop();
    isSpeaking = false;
    updateSpeakButton(false);
  }
});
