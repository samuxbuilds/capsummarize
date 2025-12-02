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
  isImageCapableProvider,
  isVideoCapableProvider,
  getProvidersForOutputType,
  type Provider,
} from '../services/providerService.js';
import { loadCustomVariants, loadUserPreferences } from './settings.js';
import {
  getPromptVariants,
  getTextPromptVariants,
  getImagePromptVariants,
  getVideoPromptVariants,
  getThumbnailPromptVariants,
  getNonThumbnailImagePromptVariants,
  isThumbnailVariant,
  addAspectRatioToPrompt,
} from '../utils/variantsCache.js';
import { incrementUsage } from '../utils/promptsCache.js';
import { state } from './state/sidePanelState.js';
import { HistoryList } from './components/HistoryList.js';
import type { OutputType, AspectRatio } from '../config/prompts.js';

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
  errorState: HTMLElement | null;
  noSubtitlesState: HTMLElement | null;
  progressBar: HTMLElement | null;
  progressText: HTMLElement | null;
  variantSelect: HTMLSelectElement | null;
  variantTrigger: HTMLButtonElement | null;
  variantTriggerText: HTMLElement | null;
  variantDropdown: HTMLElement | null;
  variantChevron: SVGElement | null;
  errorMessage: HTMLElement | null;
  settingsBtn: HTMLButtonElement | null;
  closeBtn: HTMLButtonElement | null;
  retryBtn: HTMLButtonElement | null;
  providerButtonsContainer: HTMLElement | null;
  // Output type toggle elements
  outputTypeText: HTMLButtonElement | null;
  outputTypeImage: HTMLButtonElement | null;
  outputTypeVideo: HTMLButtonElement | null;
  outputTypeHint: HTMLElement | null;
  // Aspect ratio toggle elements
  aspectRatioSection: HTMLElement | null;
  aspectRatioWide: HTMLButtonElement | null;
  aspectRatioVertical: HTMLButtonElement | null;
  aspectRatioHint: HTMLElement | null;
  // Thumbnail style sub-dropdown elements
  thumbnailStyleSection: HTMLElement | null;
  thumbnailStyleTrigger: HTMLButtonElement | null;
  thumbnailStyleTriggerText: HTMLElement | null;
  thumbnailStyleDropdown: HTMLElement | null;
  thumbnailStyleChevron: SVGElement | null;
  // Reference image elements
  referenceImageSection: HTMLElement | null;
  referenceImageInput: HTMLInputElement | null;
  uploadImageBtn: HTMLButtonElement | null;
  imageUploadState: HTMLElement | null;
  imagePreviewState: HTMLElement | null;
  referenceImagePreview: HTMLImageElement | null;
  removeImageBtn: HTMLButtonElement | null;
  copyImageBtn: HTMLButtonElement | null;
}

/**
 * Current output type (text, image, or video)
 */
let currentOutputType: OutputType = 'text';

/**
 * Current aspect ratio for image generation
 */
let currentAspectRatio: AspectRatio = 'wide';

/**
 * Current thumbnail style variant (when thumbnail is selected)
 */
let currentThumbnailStyle: string = 'thumbnail';

/**
 * Current reference image blob (if any)
 */
let currentReferenceImage: Blob | null = null;

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
    errorState: get('errorState'),
    noSubtitlesState: get('noSubtitlesState'),
    progressBar: get('progressBar'),
    progressText: get('progressText'),
    variantSelect: get('variantSelect') as HTMLSelectElement | null,
    variantTrigger: get('variantTrigger') as HTMLButtonElement | null,
    variantTriggerText: get('variantTriggerText'),
    variantDropdown: get('variantDropdown'),
    variantChevron: get('variantChevron') as SVGElement | null,
    errorMessage: get('errorMessage'),
    settingsBtn: get('settingsBtn') as HTMLButtonElement | null,
    closeBtn: get('closeBtn') as HTMLButtonElement | null,
    retryBtn: get('retryBtn') as HTMLButtonElement | null,
    providerButtonsContainer: get('providerButtonsContainer'),
    // Output type toggle elements
    outputTypeText: get('outputTypeText') as HTMLButtonElement | null,
    outputTypeImage: get('outputTypeImage') as HTMLButtonElement | null,
    outputTypeVideo: get('outputTypeVideo') as HTMLButtonElement | null,
    outputTypeHint: get('outputTypeHint'),
    // Aspect ratio toggle elements
    aspectRatioSection: get('aspectRatioSection'),
    aspectRatioWide: get('aspectRatioWide') as HTMLButtonElement | null,
    aspectRatioVertical: get('aspectRatioVertical') as HTMLButtonElement | null,
    aspectRatioHint: get('aspectRatioHint'),
    // Thumbnail style sub-dropdown elements
    thumbnailStyleSection: get('thumbnailStyleSection'),
    thumbnailStyleTrigger: get('thumbnailStyleTrigger') as HTMLButtonElement | null,
    thumbnailStyleTriggerText: get('thumbnailStyleTriggerText'),
    thumbnailStyleDropdown: get('thumbnailStyleDropdown'),
    thumbnailStyleChevron: get('thumbnailStyleChevron') as SVGElement | null,
    // Reference image elements
    referenceImageSection: get('referenceImageSection'),
    referenceImageInput: get('referenceImageInput') as HTMLInputElement | null,
    uploadImageBtn: get('uploadImageBtn') as HTMLButtonElement | null,
    imageUploadState: get('imageUploadState'),
    imagePreviewState: get('imagePreviewState'),
    referenceImagePreview: get('referenceImagePreview') as HTMLImageElement | null,
    removeImageBtn: get('removeImageBtn') as HTMLButtonElement | null,
    copyImageBtn: get('copyImageBtn') as HTMLButtonElement | null,
  };
}

/**
 * Show ready state with variant selector and generate button
 */
async function showReady(): Promise<void> {
  hide(elements.loadingState);
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
  hide(elements.errorState);
  show(elements.noSubtitlesState);
}

/**
 * Show loading state with animated progress
 */
function showLoading(): void {
  hide(elements.readyState);
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

/**
 * Show error state with message
 */
function showError(message: string): void {
  hide(elements.readyState);
  hide(elements.loadingState);
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
 * Toggle thumbnail style dropdown
 */
function toggleThumbnailStyleDropdown(): void {
  if (!elements.thumbnailStyleDropdown || !elements.thumbnailStyleChevron) return;

  const isHidden = elements.thumbnailStyleDropdown.classList.contains('hidden');

  if (isHidden) {
    // Open
    elements.thumbnailStyleDropdown.classList.remove('hidden');
    requestAnimationFrame(() => {
      if (elements.thumbnailStyleDropdown) {
        elements.thumbnailStyleDropdown.classList.remove('opacity-0', 'scale-95');
        elements.thumbnailStyleDropdown.classList.add('opacity-100', 'scale-100');
      }
    });
    elements.thumbnailStyleTrigger?.setAttribute('aria-expanded', 'true');
    if (elements.thumbnailStyleChevron) {
      elements.thumbnailStyleChevron.style.transform = 'rotate(180deg)';
    }
  } else {
    closeThumbnailStyleDropdown();
  }
}

/**
 * Close thumbnail style dropdown
 */
function closeThumbnailStyleDropdown(): void {
  if (!elements.thumbnailStyleDropdown || !elements.thumbnailStyleChevron) return;

  elements.thumbnailStyleDropdown.classList.remove('opacity-100', 'scale-100');
  elements.thumbnailStyleDropdown.classList.add('opacity-0', 'scale-95');

  setTimeout(() => {
    if (elements.thumbnailStyleDropdown) {
      elements.thumbnailStyleDropdown.classList.add('hidden');
    }
  }, 100);

  elements.thumbnailStyleTrigger?.setAttribute('aria-expanded', 'false');
  if (elements.thumbnailStyleChevron) {
    elements.thumbnailStyleChevron.style.transform = 'rotate(0deg)';
  }
}

/**
 * Handle aspect ratio change
 */
function handleAspectRatioChange(aspectRatio: AspectRatio): void {
  if (aspectRatio === currentAspectRatio) return;

  currentAspectRatio = aspectRatio;
  logger.info(`[Sidepanel] Aspect ratio changed to: ${aspectRatio}`);

  // Update toggle button states
  const buttons = [elements.aspectRatioWide, elements.aspectRatioVertical];
  buttons.forEach((btn) => {
    if (btn) {
      const btnRatio = btn.dataset.aspectRatio;
      if (btnRatio === aspectRatio) {
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      }
    }
  });

  // Update hint text
  if (elements.aspectRatioHint) {
    const hints: Record<AspectRatio, string> = {
      wide: 'YouTube thumbnails (16:9)',
      vertical: 'Shorts, Reels, TikTok (9:16)',
    };
    elements.aspectRatioHint.textContent = hints[aspectRatio];
  }
}

/**
 * Load thumbnail style options into sub-dropdown
 */
async function loadThumbnailStyles(): Promise<void> {
  if (!elements.thumbnailStyleDropdown) return;

  try {
    const thumbnailVariants = await getThumbnailPromptVariants();

    // Clear existing options
    elements.thumbnailStyleDropdown.innerHTML = '';

    thumbnailVariants.forEach((variant) => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.setAttribute('role', 'option');
      item.dataset.value = variant.variant;
      item.dataset.label = variant.label;
      item.dataset.prompt = variant.prompt;

      if (variant.variant === currentThumbnailStyle) {
        item.setAttribute('aria-selected', 'true');
        item.classList.add('selected');
        if (elements.thumbnailStyleTriggerText) {
          elements.thumbnailStyleTriggerText.textContent = variant.label;
        }
      }

      item.innerHTML = `
        <div class="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
          ${escapeHtml(variant.label)}
        </div>
        <div class="text-xs text-muted-foreground mt-0.5 leading-relaxed">${escapeHtml(variant.description)}</div>
      `;

      item.addEventListener('click', () => {
        handleThumbnailStyleSelection(variant.variant, variant.label, variant.prompt);
      });

      elements.thumbnailStyleDropdown?.appendChild(item);
    });

    logger.info(`[Sidepanel] Loaded ${thumbnailVariants.length} thumbnail styles`);
  } catch (error) {
    logger.error('[Sidepanel] Failed to load thumbnail styles:', error);
  }
}

/**
 * Handle thumbnail style selection
 */
function handleThumbnailStyleSelection(variantId: string, label: string, prompt: string): void {
  currentThumbnailStyle = variantId;

  // Update the main variant to the selected thumbnail style
  state.currentVariant = variantId;

  // Update thumbnail style dropdown UI
  if (elements.thumbnailStyleTriggerText) {
    elements.thumbnailStyleTriggerText.textContent = label;
  }

  // Update selected state in dropdown
  const items = elements.thumbnailStyleDropdown?.querySelectorAll('.dropdown-item');
  items?.forEach((item) => {
    if ((item as HTMLElement).dataset.value === variantId) {
      item.classList.add('selected');
      item.setAttribute('aria-selected', 'true');
    } else {
      item.classList.remove('selected');
      item.setAttribute('aria-selected', 'false');
    }
  });

  // Also sync with hidden select
  if (elements.variantSelect) {
    elements.variantSelect.value = variantId;
    // Update option's prompt data
    const selectedOption = elements.variantSelect.querySelector(`option[value="${variantId}"]`);
    if (selectedOption) {
      (selectedOption as HTMLOptionElement).dataset.prompt = prompt;
    }
  }

  closeThumbnailStyleDropdown();
  logger.info(`[Sidepanel] Thumbnail style selected: ${variantId}`);
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
 * Load available prompt variants based on current output type
 */
async function loadPromptVariants(): Promise<void> {
  if (!elements.variantDropdown) return;

  try {
    // Load user preferences to get default variant
    const userPreferences = await loadUserPreferences();
    let defaultVariant = 'default';

    if (userPreferences) {
      if (currentOutputType === 'text')
        defaultVariant = userPreferences.defaultVariantText || 'default';
      else if (currentOutputType === 'image')
        defaultVariant = userPreferences.defaultVariantImage || 'default';
      else if (currentOutputType === 'video')
        defaultVariant = userPreferences.defaultVariantVideo || 'default';
    }

    state.includeTimestampsPreference = !!userPreferences?.includeTimestamps;

    // Load custom variants from IndexedDB (filter by output type)
    const allCustomVariants = await loadCustomVariants();
    const customVariants = allCustomVariants.filter((v: any) => {
      const variantOutputType = v.outputType || 'text';
      return variantOutputType === currentOutputType;
    });

    // Clear existing options
    elements.variantDropdown.innerHTML = '';
    if (elements.variantSelect) {
      elements.variantSelect.innerHTML = '';
    }

    // Get system variants based on current output type
    logger.info(`[Sidepanel] Loading ${currentOutputType} prompt variants...`);
    let systemVariants;
    if (currentOutputType === 'video') {
      systemVariants = await getVideoPromptVariants();
    } else if (currentOutputType === 'image') {
      // For image mode, get non-thumbnail variants + add a single "Thumbnail" option
      systemVariants = await getNonThumbnailImagePromptVariants();
      // Add "Thumbnail" as a special category option
      systemVariants = [
        {
          variant: 'thumbnail',
          label: 'Thumbnail',
          description: 'YouTube-style clickbait thumbnails (22 styles available)',
          prompt: '', // Will be set from sub-dropdown
          outputType: 'image' as OutputType,
        },
        ...systemVariants,
      ];
    } else {
      systemVariants = await getTextPromptVariants();
    }

    // Check if current variant exists in filtered list
    const allVariants = [...systemVariants, ...customVariants];
    // For image mode, also check if it's a thumbnail variant
    const currentVariantExists = allVariants.some((v: any) => {
      if (currentOutputType === 'image' && isThumbnailVariant(state.currentVariant)) {
        return v.variant === 'thumbnail' || v.variant === state.currentVariant;
      }
      return v.variant === state.currentVariant;
    });

    // If current variant doesn't exist in filtered list, reset to first available or default
    let effectiveDefaultVariant = defaultVariant;
    if (!currentVariantExists && allVariants.length > 0 && allVariants[0]) {
      effectiveDefaultVariant = allVariants[0].variant;
    }

    const renderOption = (variant: any, isCustom: boolean) => {
      // Populate custom dropdown item
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.setAttribute('role', 'option');
      item.dataset.value = variant.variant;
      item.dataset.label = variant.label || variant.variant;
      item.dataset.prompt = variant.prompt;
      item.dataset.description = variant.description;
      item.dataset.outputType = variant.outputType || 'text';

      // Check if this is the selected variant (or if thumbnail is selected and current is a thumbnail style)
      const isSelected =
        variant.variant === effectiveDefaultVariant ||
        (variant.variant === 'thumbnail' && isThumbnailVariant(state.currentVariant));

      if (isSelected) {
        item.setAttribute('aria-selected', 'true');
        item.classList.add('selected');
        // Update trigger text initially
        if (elements.variantTriggerText) {
          elements.variantTriggerText.textContent = variant.label || variant.variant;
        }
        if (variant.variant === 'thumbnail') {
          // Keep the current thumbnail style, just update UI
          state.currentVariant = currentThumbnailStyle || 'thumbnail';
        } else {
          state.currentVariant = variant.variant;
        }
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
        option.dataset.outputType = variant.outputType || 'text';
        if (isSelected) option.selected = true;
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
      `[Sidepanel] Loaded ${systemVariants.length} ${currentOutputType} system variants and ${customVariants.length} custom variants`
    );
  } catch (error) {
    logger.error('[Sidepanel] Failed to load prompt variants:', error);
    showToast('Failed to load prompt variants', 3000, 'error');
  }
}

/**
 * Handle output type change (text/image/video toggle)
 */
async function handleOutputTypeChange(outputType: OutputType): Promise<void> {
  if (outputType === currentOutputType) return;

  currentOutputType = outputType;
  logger.info(`[Sidepanel] Output type changed to: ${outputType}`);

  // Update toggle button states
  const buttons = [elements.outputTypeText, elements.outputTypeImage, elements.outputTypeVideo];
  buttons.forEach((btn) => {
    if (btn) {
      const btnType = btn.dataset.outputType;
      if (btnType === outputType) {
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      }
    }
  });

  // Update hint text
  if (elements.outputTypeHint) {
    const hints: Record<OutputType, string> = {
      text: 'Generate text summaries from video transcripts',
      image: 'Generate images from video (ChatGPT, Gemini, Grok)',
      video: 'Generate 8-second video clips (Gemini only)',
    };
    elements.outputTypeHint.textContent = hints[outputType];
  }

  // Show/hide aspect ratio section (only for image mode)
  if (elements.aspectRatioSection) {
    if (outputType === 'image') {
      elements.aspectRatioSection.classList.remove('hidden');
    } else {
      elements.aspectRatioSection.classList.add('hidden');
    }
  }

  // Hide thumbnail style section initially (will be shown when Thumbnail is selected)
  if (elements.thumbnailStyleSection) {
    elements.thumbnailStyleSection.classList.add('hidden');
  }

  // Show/hide reference image section (for image/video mode)
  if (elements.referenceImageSection) {
    if (outputType === 'image' || outputType === 'video') {
      elements.referenceImageSection.classList.remove('hidden');
    } else {
      elements.referenceImageSection.classList.add('hidden');
      // Clear image when switching to text mode
      handleRemoveImage();
    }
  }

  // Reload variants for the new output type
  await loadPromptVariants();

  // If image mode and thumbnail is selected, show thumbnail styles
  if (outputType === 'image' && isThumbnailVariant(state.currentVariant)) {
    await loadThumbnailStyles();
    if (elements.thumbnailStyleSection) {
      elements.thumbnailStyleSection.classList.remove('hidden');
    }
  }

  // Update provider buttons (filter based on output type capabilities)
  updateProviderButtons();
}

/**
 * Handle variant selection from custom dropdown
 */
async function handleVariantSelection(variantId: string, label: string): Promise<void> {
  // Check if Thumbnail was selected - show sub-dropdown
  if (variantId === 'thumbnail') {
    state.currentVariant = currentThumbnailStyle;
    if (elements.variantTriggerText) elements.variantTriggerText.textContent = label;
    closeVariantDropdown();

    // Show thumbnail style section and load styles
    await loadThumbnailStyles();
    if (elements.thumbnailStyleSection) {
      elements.thumbnailStyleSection.classList.remove('hidden');
    }
    return;
  }

  // Hide thumbnail style section for non-thumbnail variants
  if (elements.thumbnailStyleSection) {
    elements.thumbnailStyleSection.classList.add('hidden');
  }

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
 * Handle image upload selection
 */
function handleImageUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 3000, 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 3000, 'error');
      return;
    }

    currentReferenceImage = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (elements.referenceImagePreview && e.target?.result) {
        elements.referenceImagePreview.src = e.target.result as string;

        // Update UI state
        if (elements.imageUploadState) elements.imageUploadState.classList.add('hidden');
        if (elements.imagePreviewState) elements.imagePreviewState.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);

    logger.info('[Sidepanel] Reference image uploaded:', file.name, file.type, file.size);
  }
}

/**
 * Remove selected reference image
 */
function handleRemoveImage(): void {
  currentReferenceImage = null;

  if (elements.referenceImageInput) {
    elements.referenceImageInput.value = '';
  }

  if (elements.referenceImagePreview) {
    elements.referenceImagePreview.src = '';
  }

  // Update UI state
  if (elements.imagePreviewState) elements.imagePreviewState.classList.add('hidden');
  if (elements.imageUploadState) elements.imageUploadState.classList.remove('hidden');

  logger.info('[Sidepanel] Reference image removed');
}

/**
 * Convert a Blob to a base64 data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Copy image to clipboard
 */
async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    console.log('[Sidepanel] Attempting to copy image to clipboard...', blob.type, blob.size);

    // Convert to PNG using Canvas (most compatible method)
    const pngBlob = await new Promise<Blob | null>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => resolve(b), 'image/png');
      };
      img.onerror = (e) => reject(new Error('Failed to load image for conversion'));
      img.src = URL.createObjectURL(blob);
    });

    if (!pngBlob) {
      throw new Error('Failed to convert image to PNG blob');
    }

    const item = new ClipboardItem({
      'image/png': pngBlob,
    });

    await navigator.clipboard.write([item]);
    console.log('[Sidepanel] Image copied successfully');
    return true;
  } catch (error) {
    console.error('[Sidepanel] Failed to copy image to clipboard:', error);

    // Fallback: Try to copy original blob if it's PNG
    if (blob.type === 'image/png') {
      try {
        console.log('[Sidepanel] Attempting fallback copy with original PNG...');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
      } catch (e) {
        console.error('[Sidepanel] Fallback copy failed:', e);
      }
    }
    return false;
  }
}

/**
 * Handle manual copy button click
 */
async function handleManualCopy(): Promise<void> {
  if (!currentReferenceImage) return;

  const copied = await copyImageToClipboard(currentReferenceImage);
  if (copied) {
    showToast('Image copied! Ready to paste.', 3000, 'success');
  } else {
    showToast('Failed to copy image.', 3000, 'error');
  }
}

/**
 * Handle drag start for image preview
 * Allows dragging the image directly to other apps/tabs
 */
function handleDragStart(event: DragEvent): void {
  if (!currentReferenceImage || !event.dataTransfer) return;

  // Set drag data
  event.dataTransfer.effectAllowed = 'copy';

  // Add the file to the drag payload
  // This allows dropping into file inputs or chat windows that accept files
  if (currentReferenceImage instanceof File) {
    event.dataTransfer.items.add(currentReferenceImage);
  } else {
    // If it's a blob, we might need to create a File object
    const file = new File([currentReferenceImage], 'reference-image.png', {
      type: currentReferenceImage.type,
    });
    event.dataTransfer.items.add(file);
  }

  logger.info('[Sidepanel] Drag started for reference image');
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

    // Get the prompt - for thumbnails, we need to get from the actual selected style
    let prompt: string | null = null;

    if (currentOutputType === 'image' && isThumbnailVariant(state.currentVariant)) {
      // Get prompt from thumbnail style dropdown
      const selectedStyle =
        elements.thumbnailStyleDropdown?.querySelector('.dropdown-item.selected');
      if (selectedStyle) {
        prompt = (selectedStyle as HTMLElement).dataset.prompt || null;
      }
    }

    // Fallback to regular variant select
    if (!prompt) {
      prompt =
        elements.variantSelect
          ?.querySelector(`option[value="${elements.variantSelect.value}"]`)
          ?.getAttribute('data-prompt') || null;
    }

    if (!prompt) {
      showToast('No prompt template available', 2000, 'error');
      return;
    }

    // Convert reference image to data URL if present (do this first to build prompt correctly)
    let imageDataUrl: string | undefined;
    let hasReferenceImage = false;
    if (currentReferenceImage && (currentOutputType === 'image' || currentOutputType === 'video')) {
      try {
        imageDataUrl = await blobToDataURL(currentReferenceImage);
        hasReferenceImage = true;
        logger.info(
          '[Sidepanel] Reference image converted to data URL:',
          imageDataUrl?.length || 0,
          'bytes'
        );

        // Copy to clipboard as backup
        try {
          await copyImageToClipboard(currentReferenceImage);
          showToast('Reference image attached! Will be used as style guide.', 3000, 'success');
        } catch (clipErr) {
          logger.warn('[Sidepanel] Clipboard copy failed:', clipErr);
        }
      } catch (err) {
        logger.error('[Sidepanel] Failed to convert image to data URL:', err);
        showToast('Failed to process reference image. Proceeding without it.', 3000, 'error');
        imageDataUrl = undefined;
      }
    }

    // Build the final prompt with image instruction at the TOP if we have a reference image
    let finalPrompt = prompt;
    if (currentOutputType === 'image') {
      finalPrompt = addAspectRatioToPrompt(prompt, currentAspectRatio);        
    }

    finalPrompt = `${finalPrompt}\n\n${transcript}`;
    logger.info('[Sidepanel] Composed prompt:', finalPrompt.substring(0, 500) + '...');

    // Track usage for analytics
    await incrementUsage();

    const hasPermission = await ensureProviderPermission(provider);
    if (!hasPermission) {
      return;
    }

    // Pass output type and image data to openAndInject
    await openAndInject(provider, finalPrompt, currentOutputType, imageDataUrl);

    const modeText =
      currentOutputType === 'video'
        ? 'video generation'
        : currentOutputType === 'image'
          ? 'image generation'
          : 'summarization';
    showToast(`Opened ${getProviderDisplayName(provider)} for ${modeText}`, 2000, 'success');
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
    const errorStateVisible = !elements.errorState?.classList.contains('hidden');

    // Don't interrupt if showing a summary or error state
    if ((noSubtitlesVisible || readyStateVisible) && !errorStateVisible) {
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
  const containers = [elements.providerButtonsContainer];

  containers.forEach((container) => {
    if (container) {
      container.innerHTML = ''; // Clear existing buttons

      const availableProviders = getAvailableProviders();

      availableProviders.forEach((provider) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'provider-icon-btn';
        button.dataset.provider = provider;
        button.setAttribute('aria-label', `Open ${getProviderDisplayName(provider)}`);

        const imageCapable = isImageCapableProvider(provider);
        const videoCapable = isVideoCapableProvider(provider);

        if (imageCapable) {
          button.classList.add('image-capable');
        }

        const displayName = getProviderDisplayName(provider);
        let isSupported = true;
        if (currentOutputType === 'video' && !videoCapable) {
          isSupported = false;
          button.setAttribute('title', `${displayName} (doesn't support video generation)`);
        } else if (currentOutputType === 'image' && !imageCapable) {
          isSupported = false;
          button.setAttribute('title', `${displayName} (doesn't support image generation)`);
        }

        if (isSupported) {
          button.setAttribute('title', displayName);
          button.classList.remove('disabled');
          button.classList.remove('hidden');
        } else {
          button.classList.add('disabled');
          button.classList.add('hidden');
        }

        // Create image element for the icon
        const img = document.createElement('img');
        img.src = getProviderIcon(provider);
        img.alt = displayName;
        img.className = 'provider-icon';

        button.appendChild(img);

        button.addEventListener('click', () => {
          if (currentOutputType === 'video' && !videoCapable) {
            showToast(
              `${displayName} doesn't support video generation. Try Gemini for video prompts.`,
              3000,
              'error'
            );
            return;
          }
          if (currentOutputType === 'image' && !imageCapable) {
            showToast(
              `${displayName} doesn't support image generation. Try ChatGPT, Gemini, or Grok.`,
              3000,
              'error'
            );
            return;
          }
          handleOpenProvider(provider);
        });

        container.appendChild(button);
      });
    }
  });

  logger.info('[Sidepanel] ✅ Generated provider buttons in all containers');
}

/**
 * Update provider button states based on current output type
 */
function updateProviderButtons(): void {
  const container = elements.providerButtonsContainer;
  if (!container) return;

  const buttons = container.querySelectorAll('.provider-icon-btn');
  buttons.forEach((btn) => {
    const button = btn as HTMLButtonElement;
    const provider = button.dataset.provider as Provider;
    if (!provider) return;

    const imageCapable = isImageCapableProvider(provider);
    const videoCapable = isVideoCapableProvider(provider);
    const displayName = getProviderDisplayName(provider);

    if (currentOutputType === 'video' && !videoCapable) {
      button.classList.add('hidden');
    } else if (currentOutputType === 'image' && !imageCapable) {
      button.classList.add('hidden');
    } else {
      button.setAttribute('title', displayName);
      button.classList.remove('hidden');
      button.classList.remove('disabled');
    }
  });

  logger.info(`[Sidepanel] Updated provider buttons for ${currentOutputType} mode`);
}

/**
 * Setup event listeners
 */
function setupEventListeners(): void {
  // Output type toggle listeners
  if (elements.outputTypeText) {
    elements.outputTypeText.addEventListener('click', () => handleOutputTypeChange('text'));
  }
  if (elements.outputTypeImage) {
    elements.outputTypeImage.addEventListener('click', () => handleOutputTypeChange('image'));
  }
  if (elements.outputTypeVideo) {
    elements.outputTypeVideo.addEventListener('click', () => handleOutputTypeChange('video'));
  }

  // Aspect ratio toggle listeners
  if (elements.aspectRatioWide) {
    elements.aspectRatioWide.addEventListener('click', () => handleAspectRatioChange('wide'));
  }
  if (elements.aspectRatioVertical) {
    elements.aspectRatioVertical.addEventListener('click', () =>
      handleAspectRatioChange('vertical')
    );
  }

  // Variant dropdown listeners
  if (elements.variantTrigger) {
    elements.variantTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVariantDropdown();
    });
  }

  // Thumbnail style dropdown listeners
  if (elements.thumbnailStyleTrigger) {
    elements.thumbnailStyleTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleThumbnailStyleDropdown();
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Close variant dropdown
    if (elements.variantDropdown && !elements.variantDropdown.classList.contains('hidden')) {
      if (
        !elements.variantDropdown.contains(target) &&
        !elements.variantTrigger?.contains(target)
      ) {
        closeVariantDropdown();
      }
    }

    // Close thumbnail style dropdown
    if (
      elements.thumbnailStyleDropdown &&
      !elements.thumbnailStyleDropdown.classList.contains('hidden')
    ) {
      if (
        !elements.thumbnailStyleDropdown.contains(target) &&
        !elements.thumbnailStyleTrigger?.contains(target)
      ) {
        closeThumbnailStyleDropdown();
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

  // Reference image listeners
  if (elements.uploadImageBtn && elements.referenceImageInput) {
    elements.uploadImageBtn.addEventListener('click', () => {
      elements.referenceImageInput?.click();
    });

    elements.referenceImageInput.addEventListener('change', handleImageUpload);
  }

  if (elements.removeImageBtn) {
    elements.removeImageBtn.addEventListener('click', handleRemoveImage);
  }

  if (elements.copyImageBtn) {
    elements.copyImageBtn.addEventListener('click', handleManualCopy);
  }

  if (elements.referenceImagePreview) {
    // Enable drag and drop
    elements.referenceImagePreview.draggable = true;
    elements.referenceImagePreview.addEventListener('dragstart', handleDragStart);
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
      loadPromptVariants().catch((err) => logger.error('Failed to load variants:', err)),
      loadHistory().catch((err) => logger.error('Failed to load history:', err)),
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
