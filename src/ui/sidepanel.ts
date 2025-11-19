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
import { loadCustomVariants, loadUserPreferences } from './settings.js';
import { getPromptVariants as getPromptVariantsFromAPI } from '../utils/variantsCache.js';
import {
  hasReachedDailyLimit,
  getRemainingSummaries,
  getStoredLicenseValidation,
  incrementUsage,
  FREE_DAILY_LIMIT,
} from '../utils/promptsCache.js';
import { state } from './state/sidePanelState.js';
import { HistoryList } from './components/HistoryList.js';
import { TTSController } from './components/TTSController.js';

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
  variantTrigger: HTMLButtonElement | null;
  variantTriggerText: HTMLElement | null;
  variantDropdown: HTMLElement | null;
  variantChevron: SVGElement | null;
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
 * Cached elements
 */
let elements: Elements;
let historyList: HistoryList;
let ttsController: TTSController;

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
    variantTrigger: get('variantTrigger') as HTMLButtonElement | null,
    variantTriggerText: get('variantTriggerText'),
    variantDropdown: get('variantDropdown'),
    variantChevron: get('variantChevron') as SVGElement | null,
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
  if (state.isSpeaking) {
    ttsController.stop();
  }

  state.currentSummary = summary;

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
      // Insert after variant selector
      const variantTrigger = document.getElementById('variantTrigger');
      if (variantTrigger && variantTrigger.parentElement && variantTrigger.parentElement.parentNode) {
        variantTrigger.parentElement.parentNode.insertBefore(usageDisplay, variantTrigger.parentElement.nextSibling);
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
    <div class="upgrade-prompt flex flex-col items-center justify-center p-6 text-center h-full animate-in fade-in zoom-in duration-300 overflow-y-auto">
      <div class="relative mb-6 group">
        <div class="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-slow"></div>
        <div class="w-16 h-16 bg-card border border-primary/30 rounded-2xl flex items-center justify-center relative shadow-[0_0_30px_rgba(34,211,238,0.15)] group-hover:shadow-[0_0_40px_rgba(34,211,238,0.25)] transition-all duration-500">
          <svg class="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
      </div>
      
      <h3 class="text-xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">Daily Limit Reached</h3>
      <p class="text-sm text-muted-foreground mb-6 max-w-[280px] leading-relaxed">
        You've hit the free limit of <span class="text-foreground font-medium">${FREE_DAILY_LIMIT} summaries</span> today.
      </p>
      
      <div class="card w-full max-w-sm text-left mb-4 border border-border/50 shadow-lg">
        <div class="p-5">
          <h2 class="text-sm font-semibold mb-4">Pro Lifetime Benefits</h2>

          <div class="space-y-3">
            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-foreground">Unlimited Summaries</p>
                <p class="text-xs text-muted-foreground">Unlimited video summaries with no daily limits</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-foreground">All Prompt Variants</p>
                <p class="text-xs text-muted-foreground">Access to all current and future summary styles</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-foreground">Priority Support</p>
                <p class="text-xs text-muted-foreground">Get priority help and feature requests</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-foreground">One-Time Purchase</p>
                <p class="text-xs text-muted-foreground">Lifetime access with no subscription fees</p>
              </div>
            </div>
          </div>

          <div class="mt-5 pt-4 border-t border-border">
            <a href="https://www.capsummarize.app/" target="_blank" 
               class="btn-primary w-full justify-center text-sm py-2.5 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all duration-300">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              Get Pro Lifetime License
            </a>
          </div>
        </div>
      </div>

      <button id="maybeLaterBtn" 
              class="text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-4 rounded-lg hover:bg-white/5">
        Maybe later
      </button>
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
  if (!state.currentSummary) return;

  const success = await copyToClipboard(state.currentSummary);
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
  if (!state.currentSummary) return;

  const blob = new Blob([state.currentSummary], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `summary-${state.currentVideoId || Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Summary downloaded', 2000, 'success');
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

    if (stored && stored.variant === state.currentVariant) {
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

  if (!state.currentVtt || selectedVariant === state.currentVariant) return;

  state.currentVariant = selectedVariant;

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
  if (state.isSpeaking) {
    ttsController.stop();
  }
}

/**
 * Handle Q&A question submission
 */
async function handleAskQuestion(): Promise<void> {
  if (!elements.questionInput || !elements.askBtn) return;

  const question = elements.questionInput.value.trim();

  if (!question || !state.currentVtt) {
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
        vtt: state.currentVtt,
        url: state.currentUrl,
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
 * Toggle custom variant dropdown
 */
function toggleVariantDropdown(): void {
  if (!elements.variantDropdown || !elements.variantChevron) return;

  const isHidden = elements.variantDropdown.classList.contains('hidden');

  if (isHidden) {
    // Open
    elements.variantDropdown.classList.remove('hidden');
    // Small delay to allow display:block to apply before opacity transition
    requestAnimationFrame(() => {
      if (elements.variantDropdown) {
        elements.variantDropdown.classList.remove('opacity-0', 'scale-95');
        elements.variantDropdown.classList.add('opacity-100', 'scale-100');
      }
    });
    elements.variantTrigger?.setAttribute('aria-expanded', 'true');
    if (elements.variantChevron) {
      elements.variantChevron.style.transform = 'rotate(180deg)';
    }
  } else {
    closeVariantDropdown();
  }
}

/**
 * Close custom variant dropdown
 */
function closeVariantDropdown(): void {
  if (!elements.variantDropdown || !elements.variantChevron) return;

  elements.variantDropdown.classList.remove('opacity-100', 'scale-100');
  elements.variantDropdown.classList.add('opacity-0', 'scale-95');

  setTimeout(() => {
    if (elements.variantDropdown) {
      elements.variantDropdown.classList.add('hidden');
    }
  }, 100); // Match transition duration

  elements.variantTrigger?.setAttribute('aria-expanded', 'false');
  if (elements.variantChevron) {
    elements.variantChevron.style.transform = 'rotate(0deg)';
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
 * Load available prompt variants from API with caching
 */
async function loadPromptVariants(): Promise<void> {
  if (!elements.variantDropdown) return;

  try {
    // Load user preferences to get default variant
    const userPreferences = await loadUserPreferences();
    const defaultVariant = userPreferences?.defaultVariant || 'default';
    state.includeTimestampsPreference = !!userPreferences?.includeTimestamps;

    // Load custom variants from IndexedDB
    const customVariants = await loadCustomVariants();

    // Clear existing options
    elements.variantDropdown.innerHTML = '';
    if (elements.variantSelect) {
      elements.variantSelect.innerHTML = '';
    }

    // Get system variants from API with caching
    console.log('[Sidepanel] Loading prompt variants from API...');
    const systemVariants = await getPromptVariantsFromAPI();

    const renderOption = (variant: any, isCustom: boolean) => {
      // Populate custom dropdown item
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.setAttribute('role', 'option');
      item.dataset.value = variant.variant;
      item.dataset.label = variant.label || variant.variant;
      item.dataset.prompt = variant.prompt;
      item.dataset.description = variant.description;

      if (variant.variant === defaultVariant) {
        item.setAttribute('aria-selected', 'true');
        item.classList.add('selected');
        // Update trigger text initially
        if (elements.variantTriggerText) {
          elements.variantTriggerText.textContent = variant.label || variant.variant;
        }
        state.currentVariant = variant.variant;
      }

      const label = variant.label || variant.variant;
      const customBadge = isCustom
        ? '<span class="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Custom</span>'
        : '';

      item.innerHTML = `
        <div class="font-medium text-sm text-foreground group-hover:text-primary transition-colors flex items-center">
          ${escapeHtml(label)}
          ${customBadge}
        </div>
        <div class="text-xs text-muted-foreground mt-0.5 leading-relaxed">${escapeHtml(variant.description)}</div>
      `;

      item.addEventListener('click', () => {
        handleVariantSelection(variant.variant, label);
      });

      elements.variantDropdown?.appendChild(item);

      // Keep hidden select synced for compatibility if needed
      if (elements.variantSelect) {
        const option = document.createElement('option');
        option.value = variant.variant;
        option.textContent = label;
        option.dataset.prompt = variant.prompt;
        if (variant.variant === defaultVariant) option.selected = true;
        elements.variantSelect.appendChild(option);
      }
    };

    // Render system variants
    systemVariants.forEach((variant) => renderOption(variant, false));

    // Add separator if there are custom variants (visual only in custom dropdown)
    if (customVariants.length > 0) {
      const separator = document.createElement('div');
      separator.className = 'dropdown-separator';
      separator.textContent = 'Custom Variants';
      elements.variantDropdown.appendChild(separator);
    }

    // Render custom variants
    customVariants.forEach((variant) => renderOption(variant, true));

    console.log(
      `[Sidepanel] Loaded ${systemVariants.length} system variants and ${customVariants.length} custom variants`
    );
  } catch (error) {
    console.error('[Sidepanel] Failed to load prompt variants:', error);
    showToast('Failed to load prompt variants', 3000, 'error');
  }
}

/**
 * Handle variant selection from custom dropdown
 */
function handleVariantSelection(variantId: string, label: string): void {
  // Update state
  if (!state.currentVtt || variantId === state.currentVariant) {
    // Just update UI if no VTT or same variant
    state.currentVariant = variantId;
    if (elements.variantTriggerText) elements.variantTriggerText.textContent = label;
    closeVariantDropdown();
    return;
  }

  state.currentVariant = variantId;
  if (elements.variantTriggerText) elements.variantTriggerText.textContent = label;

  // Sync hidden select
  if (elements.variantSelect) elements.variantSelect.value = variantId;

  // Close dropdown
  closeVariantDropdown();

  // Trigger regeneration
  handleVariantChange();
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
      state.currentVtt = response.vtt;
      state.currentUrl = response.url || currentTab.url || null;
      state.clearHistorySelection();
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
  if (state.isSpeaking) {
    ttsController.stop();
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
  if (!state.currentVtt) return null;
  const removeTimestamps = !state.includeTimestampsPreference;
  const transcript = extractTextFromVTT(state.currentVtt, removeTimestamps);
  return transcript && transcript.trim() ? transcript : null;
}

async function refreshUserPreferences(): Promise<void> {
  try {
    const preferences = await loadUserPreferences();
    state.includeTimestampsPreference = !!preferences?.includeTimestamps;
  } catch (error) {
    console.error('[Sidepanel] Failed to refresh user preferences:', error);
  }
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
      state.currentVtt = response.vtt;
      state.currentUrl = response.url || currentTab.url || null;
      state.clearHistorySelection();
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

    if (!state.selectedHistoryId) {
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
            if (summaryMsg.data.vtt) state.currentVtt = summaryMsg.data.vtt;
            if (summaryMsg.data.url) state.currentUrl = summaryMsg.data.url;
            if (summaryMsg.data.variant) state.currentVariant = summaryMsg.data.variant;

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
  if (elements.variantTrigger) {
    elements.variantTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVariantDropdown();
    });
  }

  document.addEventListener('click', (e) => {
    if (elements.variantDropdown && !elements.variantDropdown.classList.contains('hidden')) {
      const target = e.target as HTMLElement;
      if (
        !elements.variantDropdown.contains(target) &&
        !elements.variantTrigger?.contains(target)
      ) {
        closeVariantDropdown();
      }
    }
  });

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

  // Use HistoryList component
  historyList = new HistoryList(
    'historySection',
    'historyList',
    'historyChevron',
    'historyHeader',
    handleHistoryItemClick
  );

  // Use TTSController component
  ttsController = new TTSController('speakBtn', (isSpeaking) => {
    state.isSpeaking = isSpeaking;
  });

  // Hook up clear history button separately since it's outside the list
  if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.addEventListener('click', clearAllHistory);
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
      historyList.render(response.history);
    }
  } catch (err) {
    console.error('[Sidepanel] Failed to load history:', err);
  }
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
    state.currentVtt = historyItem.vttContent;
    state.currentUrl = historyItem.pageUrl;

    // Update UI to show selection
    state.clearHistorySelection();

    // Manually add selected class to the specific card in the DOM
    const selectedCard = document.querySelector(`[data-history-id="${historyId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }

    state.selectedHistoryId = historyId;

    // Show ready state so user can select variant and provider
    showReady();
    showToast('Video loaded - select a style and provider', 3000, 'success');
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
      historyList.clear();
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
        state.currentVtt = response.vtt;
        if (currentTab?.url) {
          state.currentUrl = currentTab.url;
        }
        state.clearHistorySelection();
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
        state.currentVideoId = videoId;
      }

      // Store VTT and URL for variant changes and Q&A
      if (data?.vtt) state.currentVtt = data.vtt;
      if (data?.url) state.currentUrl = data.url;

      switch (type) {
        case 'loading':
          showLoading();
          break;
        case 'summary':
          if (data) {
            state.currentVariant = data.variant || 'default';
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
