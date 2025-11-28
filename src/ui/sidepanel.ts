import { marked } from 'marked';
import { animateProgress, hide, show, showToast } from './ui-utils.js';
import { logger } from '../utils/logger.js';
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
import { loadCustomVariants, loadUserPreferences } from './settings.js';
import { getPromptVariants } from '../utils/variantsCache.js';
import {
  incrementUsage,
} from '../utils/promptsCache.js';
import { state } from './state/sidePanelState.js';
import { HistoryList } from './components/HistoryList.js';

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
  readTime: HTMLElement | null;
  errorMessage: HTMLElement | null;
  settingsBtn: HTMLButtonElement | null;
  closeBtn: HTMLButtonElement | null;
  retryBtn: HTMLButtonElement | null;
  providerButtonsContainer: HTMLElement | null;
  summaryProviderButtonsContainer: HTMLElement | null;
}

/**
 * Cached elements
 */
let elements: Elements;
let historyList: HistoryList;

/**
 * Cache DOM elements on initialization
 */
function cacheElements(): void {
  const get = (id: string): HTMLElement | null => {
    const el = document.getElementById(id);
    if (!el) {
      logger.warn(`Element with id "${id}" not found`);
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
    readTime: get('readTime'),
    errorMessage: get('errorMessage'),
    settingsBtn: get('settingsBtn') as HTMLButtonElement | null,
    closeBtn: get('closeBtn') as HTMLButtonElement | null,
    retryBtn: get('retryBtn') as HTMLButtonElement | null,
    providerButtonsContainer: get('providerButtonsContainer'),
    summaryProviderButtonsContainer: get('summaryProviderButtonsContainer'),
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
  show(elements.readyState);
}

/**
 * Show no subtitles found state
 */
function showNoSubtitles(): void {
  hide(elements.readyState);
  hide(elements.loadingState);
  hide(elements.summaryState);
  hide(elements.errorState);
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
 * Show error state with message
 */
function showError(message: string): void {
  hide(elements.readyState);
  hide(elements.loadingState);
  hide(elements.summaryState);
  hide(elements.noSubtitlesState);

  if (elements.errorMessage) {
    elements.errorMessage.textContent = message;
  }
  show(elements.errorState);
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
    logger.error('[Sidepanel] Failed to get current prompt template:', error);
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
    logger.info(`[Sidepanel] Stored prompt template for variant: ${selectedVariant}`);
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
    logger.info('[Sidepanel] Loading prompt variants from API...');
    const systemVariants = await getPromptVariants();

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

    logger.info(
      `[Sidepanel] Loaded ${systemVariants.length} system variants and ${customVariants.length} custom variants`
    );
  } catch (error) {
    logger.error('[Sidepanel] Failed to load prompt variants:', error);
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
      logger.info('[Sidepanel] ✅ VTT found on retry:', response.vtt.length, 'bytes');
      showReady();
      showToast('Subtitles found! Select a style and provider.', 2000, 'success');
    } else {
      // Still no VTT
      showError('No subtitles found. Please ensure the video has captions enabled.');
    }
  } catch (error) {
    logger.error('[Sidepanel] Retry failed:', error);
    showError('Failed to check for subtitles. Please try again.');
  }
}

/**
 * Close side panel
 */
function handleClose(): void {
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
    logger.error('[Sidepanel] Failed to refresh user preferences:', error);
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
      logger.info('[Sidepanel] 🔄 Refreshed VTT from active tab');
      return true;
    }
  } catch (error) {
    logger.error('[Sidepanel] Failed to refresh current tab VTT:', error);
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
    logger.error('[Sidepanel] Failed to request provider permission:', error);
    showToast('Unable to request site permission', 2500, 'error');
    return false;
  }
}

/**
 * Open provider with injected prompt
 */
async function handleOpenProvider(provider: Provider): Promise<void> {
  try {
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
    logger.info('[Sidepanel] Composed prompt:', finalPrompt);

    // Track usage for analytics
    await incrementUsage();

    const hasPermission = await ensureProviderPermission(provider);
    if (!hasPermission) {
      return;
    }

    await openAndInject(provider, finalPrompt);
    showToast('Opened provider', 2000, 'success');
  } catch (error) {
    logger.error('[Sidepanel] Error opening provider:', error);
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
        logger.info('[Sidepanel] VTT found, updating to ready state');
        showReady();
      } else if (readyStateVisible && !hasVTT) {
        // VTT was lost! Update to no subtitles state
        logger.info('[Sidepanel] VTT lost, updating to no subtitles state');
        showNoSubtitles();
      }
    }
  } catch (error) {
    logger.error('[Sidepanel] Error updating state:', error);
  }
}

/**
 * Listen for messages from popup or background
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: any) => {
    logger.info('Side panel received message:', message);

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
          logger.warn('Unknown message type:', message);
      }
    }
    // Handle VTT found notification
    else if (message.action === 'vttFound') {
      logger.info('[Sidepanel] VTT found on current tab, updating state...');
      void refreshCurrentTabVTT();
      updateSidepanelState();
    }
    // Handle history update notification
    else if (message.action === 'vttHistoryUpdated') {
      logger.info('[Sidepanel] History updated, reloading...');
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

  logger.info('[Sidepanel] ✅ Generated provider buttons in all containers');
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

  // Use HistoryList component
  historyList = new HistoryList(
    'historySection',
    'historyList',
    'historyChevron',
    'historyHeader',
    handleHistoryItemClick
  );

  // Hook up clear history button separately since it's outside the list
  if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.addEventListener('click', clearAllHistory);
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
    logger.error('[Sidepanel] Error checking VTT status:', error);
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
    logger.error('[Sidepanel] Failed to load history:', err);
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
    logger.error('[Sidepanel] Failed to load history item:', err);
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
    logger.error('[Sidepanel] Failed to clear history:', err);
    showToast('Failed to clear history', 3000, 'error');
  }
}

/**
 * Initialize side panel
 */
async function initialize(): Promise<void> {
  try {
    // 1. Immediate UI Setup (Critical Path)
    cacheElements();
    setupEventListeners();
    setupMessageListener();

    // 2. Start background data fetching (Non-blocking)
    // We don't await these immediately to allow UI to render
    const backgroundTasks = Promise.all([
      loadPromptVariants().catch(err => logger.error('Failed to load variants:', err)),
      loadHistory().catch(err => logger.error('Failed to load history:', err))
    ]);

    // 3. Determine Initial State (Fastest possible path)
    
    // Check for pending summary first (local storage is fast)
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
      // No pending summary - check current tab status
      // We do this in parallel with background tasks but await it for UI state
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      let vttFound = false;

      // Try to get VTT content from current tab
      try {
        if (currentTab?.id) {
           const response = await chrome.runtime.sendMessage({
            action: 'getVTTContent',
            tabId: currentTab.id,
            tabUrl: currentTab.url,
          });

          if (response?.vtt) {
            state.currentVtt = response.vtt;
            if (currentTab?.url) {
              state.currentUrl = currentTab.url;
            }
            state.clearHistorySelection();
            logger.info('[Sidepanel] Retrieved VTT from background:', response.vtt.length, 'bytes');
            vttFound = true;
          }
        }
      } catch (err) {
        logger.info('[Sidepanel] Could not get VTT from background:', err);
      }

      if (vttFound) {
        showReady();
      } else {
        // Fallback: check generic VTT status if content fetch failed
        const hasVTT = await checkVTTStatus();
        if (hasVTT) {
          showReady();
        } else {
          showNoSubtitles();
        }
      }
    }
    
    // Wait for background tasks to complete (optional, just ensuring they finish)
    // We don't strictly need to await this for the function to return, 
    // but it's good practice to handle their completion if we were doing more cleanup.
    // However, for UI responsiveness, we let them complete in the background.
    
  } catch (error) {
    logger.error('Failed to initialize side panel:', error);
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
  logger.info('[Sidepanel] Tab changed to:', activeInfo.tabId);

  try {
    // Get the tab info to check its URL
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // Skip updating if the new tab is a provider URL
    if (tab.url && isProviderURL(tab.url)) {
      logger.info('[Sidepanel] New tab is a provider URL, skipping state update:', tab.url);
      return;
    }

    // Debounce the update to avoid multiple rapid checks
    clearTimeout((window as any).tabChangeTimeout);
    (window as any).tabChangeTimeout = setTimeout(() => {
      updateSidepanelState();
    }, 300);
  } catch (error) {
    logger.error('[Sidepanel] Error in tab activation handler:', error);
  }
});

/**
 * Listen for tab updates (when page content changes)
 * This handles the case where a link opens a new page in the same tab
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only update when page finishes loading and we have a URL
  if (changeInfo.status === 'complete' && tab.url) {
    logger.info('[Sidepanel] Tab updated and page loaded:', tabId);

    // Skip updating if the URL is a provider URL (fast check, no async needed)
    if (isProviderURL(tab.url)) {
      logger.info('[Sidepanel] Tab URL is a provider URL, skipping state update:', tab.url);
      return;
    }

    // Debounce the update
    clearTimeout((window as any).tabUpdateTimeout);
    (window as any).tabUpdateTimeout = setTimeout(() => {
      updateSidepanelState();
    }, 500);
  }
});
