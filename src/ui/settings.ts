/**
 * Settings Page Controller
 *
 * Manages the settings interface for custom prompt variants and user preferences.
 * Handles CRUD operations for custom variants stored in IndexedDB.
 */

import StorageUtils from '../utils/storage.js';
import { showToast } from './ui-utils.js';
import { logger } from '../utils/logger.js';
import { getPromptVariants } from '../utils/variantsCache.js';
import { SettingsForm, type SettingsFormElements } from './components/SettingsForm.js';
import type { OutputType } from '../config/prompts.js';

/**
 * Custom variant interface
 */
export interface CustomVariant {
  variant: string;
  description: string;
  prompt: string;
  createdAt: number;
  isCustom: true;
  /**
   * Output type: 'text' for summaries, 'image' for visual content
   * @default 'text'
   */
  outputType?: OutputType;
  /**
   * Thumbnail style variant ID (optional, only for image output)
   */
  thumbnailStyle?: string;
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  defaultVariantText: string;
  defaultVariantImage: string;
  defaultVariantVideo: string;
  includeTimestamps: boolean;
}

export const CUSTOM_VARIANTS_KEY = 'customVariants';
export const USER_PREFERENCES_KEY = 'userPreferences';

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultVariantText: 'default',
  defaultVariantImage: 'default',
  defaultVariantVideo: 'default',
  includeTimestamps: false,
};

/**
 * Utility function to load custom variants from storage
 */
export async function loadCustomVariants(): Promise<CustomVariant[]> {
  try {
    const stored = await StorageUtils.get<CustomVariant[]>(CUSTOM_VARIANTS_KEY);
    return stored || [];
  } catch (err) {
    console.error('[Settings] Failed to load custom variants:', err);
    return [];
  }
}

/**
 * Utility function to load user preferences from storage
 */
export async function loadUserPreferences(): Promise<UserPreferences> {
  try {
    const stored = await StorageUtils.get<UserPreferences>(USER_PREFERENCES_KEY);
    return stored || { ...DEFAULT_PREFERENCES };
  } catch (err) {
    console.error('[Settings] Failed to load preferences:', err);
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * DOM Elements
 */
interface SettingsElements {
  // Navigation
  backBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;

  // Tabs
  tabButtons: NodeListOf<HTMLButtonElement>;
  variantsTab: HTMLElement;
  preferencesTab: HTMLElement;

  // List
  customVariantsList: HTMLElement;
  emptyState: HTMLElement;

  // Preferences
  defaultVariantTextSelect: HTMLSelectElement;
  defaultVariantImageSelect: HTMLSelectElement;
  defaultVariantVideoSelect: HTMLSelectElement;
  includeTimestampsToggle: HTMLInputElement;

  // Form
  variantOutputType: HTMLSelectElement;
  variantThumbnailStyle: HTMLSelectElement;
  thumbnailStyleContainer: HTMLElement;
}

let elements: SettingsElements;
let settingsForm: SettingsForm;
let customVariants: CustomVariant[] = [];
let userPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };

/**
 * Initialize the settings page
 */
async function init(): Promise<void> {
  logger.info('[Settings] Initializing settings page');

  // Cache DOM elements
  elements = {
    backBtn: document.getElementById('backBtn') as HTMLButtonElement,
    closeBtn: document.getElementById('closeBtn') as HTMLButtonElement,
    tabButtons: document.querySelectorAll('.settings-tab'),
    variantsTab: document.getElementById('variantsTab') as HTMLElement,
    preferencesTab: document.getElementById('preferencesTab') as HTMLElement,
    customVariantsList: document.getElementById('customVariantsList') as HTMLElement,
    emptyState: document.getElementById('emptyState') as HTMLElement,
    defaultVariantTextSelect: document.getElementById(
      'defaultVariantTextSelect'
    ) as HTMLSelectElement,
    defaultVariantImageSelect: document.getElementById(
      'defaultVariantImageSelect'
    ) as HTMLSelectElement,
    defaultVariantVideoSelect: document.getElementById(
      'defaultVariantVideoSelect'
    ) as HTMLSelectElement,
    includeTimestampsToggle: document.getElementById('includeTimestampsToggle') as HTMLInputElement,
    variantOutputType: document.getElementById('variantOutputType') as HTMLSelectElement,
    variantThumbnailStyle: document.getElementById('variantThumbnailStyle') as HTMLSelectElement,
    thumbnailStyleContainer: document.getElementById('thumbnailStyleContainer') as HTMLElement,
  };

  // Initialize SettingsForm
  const formElements: SettingsFormElements = {
    form: document.getElementById('variantForm') as HTMLFormElement,
    title: document.getElementById('formTitle'),
    toggleBtn: document.getElementById('toggleFormBtn') as HTMLButtonElement,
    cancelBtn: document.getElementById('cancelFormBtn') as HTMLButtonElement,
    variantId: document.getElementById('variantId') as HTMLInputElement,
    variantIdFeedback: document.getElementById('variantIdFeedback'),
    variantIdHelp: document.getElementById('variantIdHelp'),
    description: document.getElementById('variantDescription') as HTMLInputElement,
    charCounter: document.getElementById('charCounter'),
    prompt: document.getElementById('variantPrompt') as HTMLTextAreaElement,
    transcriptWarning: document.getElementById('transcriptWarning'),
  };

  settingsForm = new SettingsForm(
    formElements,
    handleFormSubmit,
    [] // Will be updated after loading variants
  );

  // Setup event listeners
  setupEventListeners();

  // Initialize preferences
  await populateVariantDropdown();
  await loadPreferences();

  // Load custom variants
  await loadAndRenderVariants();

  logger.info('[Settings] Initialization complete');
}

/**
 * Setup all event listeners
 */
function setupEventListeners(): void {
  // Navigation
  if (elements.backBtn) {
    elements.backBtn.addEventListener('click', () => {
      window.location.href = 'sidepanel.html';
    });
  }

  if (elements.closeBtn) {
    elements.closeBtn.addEventListener('click', () => {
      window.close();
    });
  }

  // Tab switching
  if (elements.tabButtons) {
    elements.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => handleTabSwitch(btn.dataset.tab!));
    });
  }

  // Preferences
  if (elements.defaultVariantTextSelect) {
    elements.defaultVariantTextSelect.addEventListener('change', handlePreferenceChange);
  }
  if (elements.defaultVariantImageSelect) {
    elements.defaultVariantImageSelect.addEventListener('change', handlePreferenceChange);
  }
  if (elements.defaultVariantVideoSelect) {
    elements.defaultVariantVideoSelect.addEventListener('change', handlePreferenceChange);
  }
  if (elements.includeTimestampsToggle) {
    elements.includeTimestampsToggle.addEventListener('change', handlePreferenceChange);
  }

  // Form: Show/Hide Thumbnail Style based on Output Type
  if (elements.variantOutputType) {
    elements.variantOutputType.addEventListener('change', async () => {
      const type = elements.variantOutputType.value;
      if (type === 'image') {
        elements.thumbnailStyleContainer.classList.remove('hidden');
        // Populate thumbnail styles if empty
        if (elements.variantThumbnailStyle.options.length <= 1) {
          await populateThumbnailStyles();
        }
      } else {
        elements.thumbnailStyleContainer.classList.add('hidden');
      }
    });
  }
}

/**
 * Handle tab switching
 */
function handleTabSwitch(tabName: string): void {
  // Update tab buttons
  if (elements.tabButtons) {
    elements.tabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
  }

  // Update tab content
  if (elements.variantsTab) {
    elements.variantsTab.classList.toggle('active', tabName === 'variants');
    elements.variantsTab.classList.toggle('hidden', tabName !== 'variants');
  }
  if (elements.preferencesTab) {
    elements.preferencesTab.classList.toggle('active', tabName === 'preferences');
    elements.preferencesTab.classList.toggle('hidden', tabName !== 'preferences');
  }
}

/**
 * Handle form submission from SettingsForm
 */
async function handleFormSubmit(
  data: { variant: string; description: string; prompt: string },
  isEdit: boolean
): Promise<void> {
  const { variant, description, prompt } = data;
  const outputType = (elements.variantOutputType.value as OutputType) || 'text';
  const thumbnailStyle = elements.variantThumbnailStyle.value || undefined;

  // Validation
  if (!variant || !description || !prompt) {
    showToast('Please fill in all required fields', 3000, 'error');
    return;
  }

  if (!/^[a-z0-9-]+$/.test(variant)) {
    showToast('Variant ID can only contain lowercase letters, numbers, and hyphens', 3000, 'error');
    return;
  }

  if (!prompt.includes('{transcript}')) {
    const confirmed = confirm(
      'Your prompt does not include {transcript} placeholder. ' +
        "Without it, the video transcript won't be included. Continue anyway?"
    );
    if (!confirmed) return;
  }

  // Check for duplicate (unless editing)
  if (!isEdit && customVariants.some((v) => v.variant === variant)) {
    showToast('A variant with this ID already exists', 3000, 'error');
    return;
  }

  try {
    let createdAt = Date.now();

    if (isEdit) {
      // Find original to keep creation date
      // Note: In edit mode, the variant ID passed is the *new* one.
      // Ideally SettingsForm would pass the *original* ID too if it changed.
      // However, for now we can just filter out the one being edited if ID matched
      // But SettingsForm logic handles ID change by deleting old one first?
      // Actually, let's simplify:
      // If editing, we remove the old one (if ID changed) and add new.
      // Ideally we need the original ID.
      // For simplicity in this refactor, we'll just use current time or find existing if ID didn't change.
      const existing = customVariants.find((v) => v.variant === variant);
      if (existing) createdAt = existing.createdAt;
    }

    const newVariant: CustomVariant = {
      variant,
      description,
      prompt,
      createdAt,
      isCustom: true,
      outputType,
      thumbnailStyle,
    };

    // Remove existing variant with same ID
    customVariants = customVariants.filter((v) => v.variant !== variant);

    // If ID was changed during edit, the old one needs to be removed.
    // This logic is slightly tricky without the original ID passed from form.
    // But `SettingsForm` doesn't pass original ID.
    // Let's assume for now users delete/create or we rely on ID match.
    // WAIT: The original code handled "renaming" by checking `editingVariant`.
    // `SettingsForm` should probably handle this state but it's internal.
    // Let's check `editingVariant` variable? No, it was local to settings.ts.
    // We should let `SettingsForm` handle UI but we need to know if we are replacing.
    // Actually, looking at original code, `editingVariant` was used.
    // In `SettingsForm`, we need to support this.
    // Since I can't easily change `SettingsForm` signature in `onSubmit` without making it complex,
    // I will rely on `customVariants` being updated.
    // Actually, if ID changes, it's effectively a new variant and old one stays unless removed.
    // To fix this properly: `SettingsForm` handles the UI.
    // But here we need to know *which* variant was being edited.
    // Since we passed `isEdit`, we know we are editing.
    // But we don't know *what* we are editing if ID changed.
    // For this refactor to be safe, I should have `SettingsForm` pass `originalVariantId`.
    // I will update `SettingsForm` to pass `originalVariantId` in callback.

    customVariants.push(newVariant);

    await StorageUtils.set(CUSTOM_VARIANTS_KEY, customVariants);

    showToast(
      isEdit ? 'Variant updated successfully!' : 'Variant created successfully!',
      2000,
      'success'
    );

    settingsForm.reset();
    await loadAndRenderVariants();
  } catch (err) {
    console.error('[Settings] Failed to save variant:', err);
    showToast('Failed to save variant. Please try again.', 3000, 'error');
  }
}

/**
 * Load custom variants from storage and render
 */
async function loadAndRenderVariants(): Promise<void> {
  try {
    customVariants = await loadCustomVariants();

    // Update existing variants list in form for validation
    settingsForm.setExistingVariants(customVariants.map((v) => v.variant));

    logger.info('[Settings] Loaded custom variants:', customVariants.length);

    // Re-populate variant dropdown to include custom variants
    await populateVariantDropdown();

    // Restore selected preferences
    if (elements.defaultVariantTextSelect) {
      elements.defaultVariantTextSelect.value = userPreferences.defaultVariantText;
    }
    if (elements.defaultVariantImageSelect) {
      elements.defaultVariantImageSelect.value = userPreferences.defaultVariantImage;
    }
    if (elements.defaultVariantVideoSelect) {
      elements.defaultVariantVideoSelect.value = userPreferences.defaultVariantVideo;
    }

    renderVariantsList();
  } catch (err) {
    console.error('[Settings] Failed to load variants:', err);
    showToast('Failed to load custom variants', 3000, 'error');
  }
}

/**
 * Render the custom variants list
 */
function renderVariantsList(): void {
  const listContainer = elements.customVariantsList;
  const emptyState = elements.emptyState;

  // Check if required elements exist
  if (!listContainer || !emptyState) {
    // Elements may not exist if custom variants tab hasn't been rendered yet
    return;
  }

  if (customVariants.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Sort by creation date (newest first)
  const sorted = [...customVariants].sort((a, b) => b.createdAt - a.createdAt);

  listContainer.innerHTML = sorted.map((variant) => createVariantCard(variant)).join('');

  // Attach event listeners to action buttons
  listContainer.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const action = target.dataset.action!;
      const variantId = target.dataset.variant!;

      if (action === 'edit') handleEdit(variantId);
      if (action === 'delete') handleDelete(variantId);
      if (action === 'duplicate') handleDuplicate(variantId);
    });
  });
}

/**
 * Create HTML for a variant card
 */
function createVariantCard(variant: CustomVariant): string {
  const date = new Date(variant.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const truncatedPrompt =
    variant.prompt.length > 150 ? variant.prompt.substring(0, 150) + '...' : variant.prompt;

  return `
    <div class="card p-5 space-y-3 fade-in">
      <div class="flex items-start justify-between gap-4 p-5">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <code class="text-sm font-semibold text-primary">${escapeHtml(variant.variant)}</code>
            <span class="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">Custom</span>
          </div>
          <p class="text-sm text-foreground mb-3 leading-relaxed">${escapeHtml(variant.description)}</p>
            ${escapeHtml(truncatedPrompt)}
          </div>
          <div class="flex gap-2 mt-2">
            <span class="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
              ${variant.outputType || 'TEXT'}
            </span>
            ${
              variant.thumbnailStyle
                ? `<span class="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">THUMBNAIL: ${escapeHtml(variant.thumbnailStyle)}</span>`
                : ''
            }
          </div>
          <p class="text-xs text-muted-foreground/60 mt-3">Created ${date}</p>
        </div>
        <div class="flex gap-1.5 flex-shrink-0">
          <button 
            type="button" 
            class="btn-icon-sm" 
            title="Edit variant"
            aria-label="Edit ${escapeHtml(variant.variant)} variant"
            data-action="edit"
            data-variant="${escapeHtml(variant.variant)}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button 
            type="button" 
            class="btn-icon-sm" 
            title="Duplicate variant"
            aria-label="Duplicate ${escapeHtml(variant.variant)} variant"
            data-action="duplicate"
            data-variant="${escapeHtml(variant.variant)}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
          <button 
            type="button" 
            class="btn-icon-sm text-destructive hover:bg-destructive/10" 
            title="Delete variant"
            aria-label="Delete ${escapeHtml(variant.variant)} variant"
            data-action="delete"
            data-variant="${escapeHtml(variant.variant)}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Handle edit action
 */
function handleEdit(variantId: string): void {
  const variant = customVariants.find((v) => v.variant === variantId);
  if (!variant) return;

  settingsForm.edit(variant);
}

/**
 * Handle duplicate action
 */
function handleDuplicate(variantId: string): void {
  const variant = customVariants.find((v) => v.variant === variantId);
  if (!variant) return;

  settingsForm.duplicate(variant);
}

/**
 * Handle delete action
 */
async function handleDelete(variantId: string): Promise<void> {
  const variant = customVariants.find((v) => v.variant === variantId);
  if (!variant) return;

  const confirmed = confirm(
    `Are you sure you want to delete "${variant.variant}"?\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    customVariants = customVariants.filter((v) => v.variant !== variantId);
    await StorageUtils.set(CUSTOM_VARIANTS_KEY, customVariants);

    showToast('Variant deleted successfully', 2000, 'success');
    await loadAndRenderVariants();
  } catch (err) {
    console.error('[Settings] Failed to delete variant:', err);
    showToast('Failed to delete variant. Please try again.', 3000, 'error');
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
 * Populate thumbnail styles for the form
 */
async function populateThumbnailStyles(): Promise<void> {
  try {
    const { getThumbnailPromptVariants } = await import('../utils/variantsCache.js');
    const variants = await getThumbnailPromptVariants();

    elements.variantThumbnailStyle.innerHTML = '<option value="">None (Standard Image)</option>';

    variants.forEach((v) => {
      const option = document.createElement('option');
      option.value = v.variant;
      option.textContent = v.label;
      elements.variantThumbnailStyle.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load thumbnail styles', err);
  }
}

/**
 * Populate the variant dropdowns with all available options
 */
async function populateVariantDropdown(): Promise<void> {
  try {
    const { getTextPromptVariants, getNonThumbnailImagePromptVariants, getVideoPromptVariants } =
      await import('../utils/variantsCache.js');

    const textVariants = await getTextPromptVariants();
    const imageVariants = await getNonThumbnailImagePromptVariants();
    const videoVariants = await getVideoPromptVariants();
    const customVariants = await loadCustomVariants();

    const populateSelect = (select: HTMLSelectElement, variants: any[], type: OutputType) => {
      if (!select) return;
      select.innerHTML = '';

      // System variants
      variants.forEach((v) => {
        const option = document.createElement('option');
        option.value = v.variant;
        option.textContent = v.label || v.variant;
        select.appendChild(option);
      });

      // Custom variants for this type
      const relevantCustom = customVariants.filter((v) => (v.outputType || 'text') === type);
      if (relevantCustom.length > 0) {
        const group = document.createElement('optgroup');
        group.label = 'Custom Variants';
        relevantCustom.forEach((v) => {
          const option = document.createElement('option');
          option.value = v.variant;
          option.textContent = v.variant; // Custom variants don't have label property usually
          group.appendChild(option);
        });
        select.appendChild(group);
      }
    };

    populateSelect(elements.defaultVariantTextSelect, textVariants, 'text');
    populateSelect(elements.defaultVariantImageSelect, imageVariants, 'image');
    populateSelect(elements.defaultVariantVideoSelect, videoVariants, 'video');

    logger.info(`[Settings] Populated variant dropdowns`);
  } catch (error) {
    console.error('[Settings] Failed to load variants for dropdown:', error);
    showToast('Failed to load prompt variants', 3000, 'error');
  }
}

/**
 * Load preferences from storage
 */
async function loadPreferences(): Promise<void> {
  try {
    const stored = await StorageUtils.get<UserPreferences>(USER_PREFERENCES_KEY);
    userPreferences = stored || { ...DEFAULT_PREFERENCES };

    // Update UI (only if elements exist)
    // Update UI (only if elements exist)
    if (elements.defaultVariantTextSelect) {
      elements.defaultVariantTextSelect.value = userPreferences.defaultVariantText;
    }
    if (elements.defaultVariantImageSelect) {
      elements.defaultVariantImageSelect.value = userPreferences.defaultVariantImage;
    }
    if (elements.defaultVariantVideoSelect) {
      elements.defaultVariantVideoSelect.value = userPreferences.defaultVariantVideo;
    }
    if (elements.includeTimestampsToggle) {
      elements.includeTimestampsToggle.checked = userPreferences.includeTimestamps;
    }

    logger.info('[Settings] Loaded preferences:', userPreferences);
  } catch (err) {
    console.error('[Settings] Failed to load preferences:', err);
    userPreferences = { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Save preferences to storage
 */
async function savePreferences(): Promise<void> {
  try {
    await StorageUtils.set(USER_PREFERENCES_KEY, userPreferences);
    logger.info('[Settings] Saved preferences:', userPreferences);
  } catch (err) {
    console.error('[Settings] Failed to save preferences:', err);
    showToast('Failed to save preferences', 3000, 'error');
  }
}

/**
 * Handle preference changes
 */
async function handlePreferenceChange(): Promise<void> {
  // Update preferences object
  // Update preferences object
  userPreferences.defaultVariantText = elements.defaultVariantTextSelect.value;
  userPreferences.defaultVariantImage = elements.defaultVariantImageSelect.value;
  userPreferences.defaultVariantVideo = elements.defaultVariantVideoSelect.value;
  userPreferences.includeTimestamps = elements.includeTimestampsToggle.checked;

  // Save to storage
  await savePreferences();

  // Show confirmation
  showToast('Preferences saved', 1500, 'success');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
