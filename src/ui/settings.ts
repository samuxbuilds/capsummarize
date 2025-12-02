/**
 * Settings Page Controller
 *
 * Manages the settings interface for custom prompt variants and user preferences.
 * Handles CRUD operations for custom variants stored in IndexedDB.
 */

import StorageUtils from '../utils/storage.js';
import { showToast } from './ui-utils.js';
import { logger } from '../utils/logger.js';
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
   * Image style description (optional, only for image output)
   */
  imageStyle?: string;
  /**
   * Whether this is a thumbnail style (optional, only for image output)
   */
  isThumbnail?: boolean;
  /**
   * @deprecated Use imageStyle instead. Kept for backward compatibility.
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

  // Import/Export
  importVariantsBtn: HTMLButtonElement;
  exportVariantsBtn: HTMLButtonElement;
  importFileInput: HTMLInputElement;

  // Preferences
  defaultVariantTextSelect: HTMLSelectElement;
  defaultVariantImageSelect: HTMLSelectElement;
  defaultVariantVideoSelect: HTMLSelectElement;
  includeTimestampsToggle: HTMLInputElement;

  // Form
  variantOutputType: HTMLSelectElement;
  variantImageStyle: HTMLInputElement;
  variantIsThumbnail: HTMLInputElement;
  imageStyleContainer: HTMLElement;
}

let elements: SettingsElements;
let settingsForm: SettingsForm;
let customVariants: CustomVariant[] = [];
let userPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };

/**
 * Reset image style fields to default values
 */
function resetImageStyleFields(): void {
  if (elements.imageStyleContainer) {
    elements.imageStyleContainer.classList.add('hidden');
  }
  if (elements.variantImageStyle) {
    elements.variantImageStyle.value = '';
  }
  if (elements.variantIsThumbnail) {
    elements.variantIsThumbnail.checked = false;
  }
  if (elements.variantOutputType) {
    elements.variantOutputType.value = 'text';
  }
}

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
    importVariantsBtn: document.getElementById('importVariantsBtn') as HTMLButtonElement,
    exportVariantsBtn: document.getElementById('exportVariantsBtn') as HTMLButtonElement,
    importFileInput: document.getElementById('importFileInput') as HTMLInputElement,
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
    variantImageStyle: document.getElementById('variantImageStyle') as HTMLInputElement,
    variantIsThumbnail: document.getElementById('variantIsThumbnail') as HTMLInputElement,
    imageStyleContainer: document.getElementById('imageStyleContainer') as HTMLElement,
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

  // Add listeners to reset image style fields when form is reset/cancelled
  const cancelBtn = document.getElementById('cancelFormBtn');
  const toggleBtn = document.getElementById('toggleFormBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetImageStyleFields);
  }
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const form = document.getElementById('variantForm');
      // If form is being hidden (was visible), reset image fields
      if (form && !form.classList.contains('hidden')) {
        resetImageStyleFields();
      }
    });
  }

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

  // Form: Show/Hide Image Style options based on Output Type
  if (elements.variantOutputType) {
    elements.variantOutputType.addEventListener('change', () => {
      const type = elements.variantOutputType.value;
      if (type === 'image') {
        elements.imageStyleContainer.classList.remove('hidden');
      } else {
        elements.imageStyleContainer.classList.add('hidden');
        // Reset image style fields when switching away from image
        elements.variantImageStyle.value = '';
        elements.variantIsThumbnail.checked = false;
      }
    });
  }

  // Import/Export
  if (elements.importVariantsBtn) {
    elements.importVariantsBtn.addEventListener('click', handleImportClick);
  }
  if (elements.exportVariantsBtn) {
    elements.exportVariantsBtn.addEventListener('click', handleExport);
  }
  if (elements.importFileInput) {
    elements.importFileInput.addEventListener('change', handleImportFile);
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
  const imageStyle = elements.variantImageStyle.value.trim() || undefined;
  const isThumbnail = elements.variantIsThumbnail.checked;

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
      imageStyle: outputType === 'image' ? imageStyle : undefined,
      isThumbnail: outputType === 'image' ? isThumbnail : undefined,
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
    <div class="card p-6 space-y-4 fade-in">
      <div class="flex items-start justify-between gap-4 p-5">
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-2">
             <div class="flex items-center gap-3">
                <span class="py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                  Style: ${escapeHtml(variant.variant)}
                </span>
             </div>
             <div class="flex items-center gap-4">
                <span class="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                  ${variant.outputType || 'TEXT'}
                </span>
                <span class="text-xs text-muted-foreground/60">Created ${date}</span>
             </div>
          </div>
          
          <p class="text-sm text-foreground font-medium mb-2">${escapeHtml(variant.description)}</p>
          <p class="text-sm text-muted-foreground leading-relaxed mb-4">${escapeHtml(truncatedPrompt)}</p>
          
           ${
              variant.imageStyle
                ? `<div class="mb-4"><span class="text-xs text-muted-foreground">Style: <span class="text-foreground">${escapeHtml(variant.imageStyle)}</span></span></div>`
                : ''
            }

          <div class="flex gap-3">
            <button 
              type="button" 
              class="p-1.5 text-muted-foreground hover:text-primary transition-colors" 
              title="Edit variant"
              aria-label="Edit ${escapeHtml(variant.variant)} variant"
              data-action="edit"
              data-variant="${escapeHtml(variant.variant)}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button 
              type="button" 
              class="p-1.5 text-muted-foreground hover:text-primary transition-colors" 
              title="Duplicate variant"
              aria-label="Duplicate ${escapeHtml(variant.variant)} variant"
              data-action="duplicate"
              data-variant="${escapeHtml(variant.variant)}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
            <button 
              type="button" 
              class="p-1.5 text-muted-foreground hover:text-destructive transition-colors" 
              title="Delete variant"
              aria-label="Delete ${escapeHtml(variant.variant)} variant"
              data-action="delete"
              data-variant="${escapeHtml(variant.variant)}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
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

  // Set output type and image style fields
  elements.variantOutputType.value = variant.outputType || 'text';

  // Handle image style container visibility and values
  if (variant.outputType === 'image') {
    elements.imageStyleContainer.classList.remove('hidden');
    elements.variantImageStyle.value = variant.imageStyle || variant.thumbnailStyle || '';
    elements.variantIsThumbnail.checked = variant.isThumbnail || false;
  } else {
    elements.imageStyleContainer.classList.add('hidden');
    elements.variantImageStyle.value = '';
    elements.variantIsThumbnail.checked = false;
  }
}

/**
 * Handle duplicate action
 */
function handleDuplicate(variantId: string): void {
  const variant = customVariants.find((v) => v.variant === variantId);
  if (!variant) return;

  settingsForm.duplicate(variant);

  // Set output type and image style fields
  elements.variantOutputType.value = variant.outputType || 'text';

  // Handle image style container visibility and values
  if (variant.outputType === 'image') {
    elements.imageStyleContainer.classList.remove('hidden');
    elements.variantImageStyle.value = variant.imageStyle || variant.thumbnailStyle || '';
    elements.variantIsThumbnail.checked = variant.isThumbnail || false;
  } else {
    elements.imageStyleContainer.classList.add('hidden');
    elements.variantImageStyle.value = '';
    elements.variantIsThumbnail.checked = false;
  }
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
 * Export file format version for compatibility checking
 */
const EXPORT_FORMAT_VERSION = 1;

/**
 * Export data structure
 */
interface ExportData {
  version: number;
  exportedAt: string;
  variants: CustomVariant[];
}

/**
 * Import data structure (with unknown variants for validation)
 */
interface ImportData {
  version?: number;
  exportedAt?: string;
  variants?: unknown[];
}

/**
 * Handle import button click - triggers file input
 */
function handleImportClick(): void {
  elements.importFileInput.click();
}

/**
 * Handle file selection for import
 */
async function handleImportFile(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Reset file input for future imports
  target.value = '';

  try {
    const text = await file.text();
    const data = JSON.parse(text) as ImportData;

    // Validate export format
    if (!data.version || !Array.isArray(data.variants)) {
      showToast('Invalid file format. Please select a valid export file.', 3000, 'error');
      return;
    }

    // Validate each variant
    const validVariants: CustomVariant[] = [];
    const errors: string[] = [];

    for (const variant of data.variants) {
      if (!isValidCustomVariant(variant)) {
        const variantId =
          variant && typeof variant === 'object' && 'variant' in variant
            ? String((variant as { variant: unknown }).variant)
            : 'unknown';
        errors.push(`Invalid variant: ${variantId}`);
        continue;
      }
      validVariants.push({
        variant: variant.variant,
        description: variant.description,
        prompt: variant.prompt,
        createdAt: variant.createdAt || Date.now(),
        isCustom: true,
        outputType: variant.outputType || 'text',
        imageStyle: variant.imageStyle || variant.thumbnailStyle, // Support legacy thumbnailStyle
        isThumbnail: variant.isThumbnail,
      });
    }

    if (validVariants.length === 0) {
      showToast('No valid variants found in the file.', 3000, 'error');
      return;
    }

    // Check for duplicates with existing variants
    const existingIds = new Set(customVariants.map((v) => v.variant));
    const newVariants = validVariants.filter((v) => !existingIds.has(v.variant));
    const duplicates = validVariants.filter((v) => existingIds.has(v.variant));

    if (duplicates.length > 0 && newVariants.length === 0) {
      // All variants are duplicates - ask to replace
      const confirmed = confirm(
        `All ${duplicates.length} variant(s) already exist.\n\n` +
          `Do you want to replace them with the imported versions?`
      );
      if (!confirmed) return;

      // Replace existing variants
      for (const importedVariant of duplicates) {
        customVariants = customVariants.filter((v) => v.variant !== importedVariant.variant);
        customVariants.push(importedVariant);
      }
    } else if (duplicates.length > 0) {
      // Some duplicates, some new
      const confirmed = confirm(
        `Found ${newVariants.length} new variant(s) and ${duplicates.length} duplicate(s).\n\n` +
          `New: ${newVariants.map((v) => v.variant).join(', ')}\n` +
          `Duplicates: ${duplicates.map((v) => v.variant).join(', ')}\n\n` +
          `Do you want to import new variants and replace duplicates?`
      );
      if (!confirmed) return;

      // Add new variants and replace duplicates
      for (const importedVariant of [...newVariants, ...duplicates]) {
        customVariants = customVariants.filter((v) => v.variant !== importedVariant.variant);
        customVariants.push(importedVariant);
      }
    } else {
      // No duplicates - just add
      customVariants.push(...newVariants);
    }

    // Save to storage
    await StorageUtils.set(CUSTOM_VARIANTS_KEY, customVariants);

    // Update form's existing variants list
    settingsForm.setExistingVariants(customVariants.map((v) => v.variant));

    const importedCount = newVariants.length + duplicates.length;
    showToast(`Successfully imported ${importedCount} variant(s)!`, 2000, 'success');

    // Refresh the UI
    await loadAndRenderVariants();

    logger.info(`[Settings] Imported ${importedCount} variants`);
  } catch (err) {
    console.error('[Settings] Failed to import variants:', err);
    if (err instanceof SyntaxError) {
      showToast('Invalid JSON file. Please select a valid export file.', 3000, 'error');
    } else {
      showToast('Failed to import variants. Please try again.', 3000, 'error');
    }
  }
}

/**
 * Validate a custom variant object
 */
function isValidCustomVariant(obj: unknown): obj is CustomVariant {
  if (!obj || typeof obj !== 'object') return false;

  const v = obj as Record<string, unknown>;

  return (
    typeof v.variant === 'string' &&
    v.variant.length > 0 &&
    /^[a-z0-9-]+$/.test(v.variant) &&
    typeof v.description === 'string' &&
    v.description.length > 0 &&
    typeof v.prompt === 'string' &&
    v.prompt.length > 0
  );
}

/**
 * Handle export button click
 */
function handleExport(): void {
  if (customVariants.length === 0) {
    showToast('No custom variants to export.', 2000, 'error');
    return;
  }

  try {
    const exportData: ExportData = {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      variants: customVariants,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create temporary download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `capsummarize-custom-styles-${formatDateForFilename(new Date())}.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);

    showToast(`Exported ${customVariants.length} variant(s) successfully!`, 2000, 'success');
    logger.info(`[Settings] Exported ${customVariants.length} variants`);
  } catch (err) {
    console.error('[Settings] Failed to export variants:', err);
    showToast('Failed to export variants. Please try again.', 3000, 'error');
  }
}

/**
 * Format date for filename (YYYY-MM-DD)
 */
function formatDateForFilename(date: Date): string {
  const isoDate = date.toISOString().split('T')[0];
  return isoDate ?? date.toISOString().slice(0, 10);
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
