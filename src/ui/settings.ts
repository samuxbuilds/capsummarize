/**
 * Settings Page Controller
 *
 * Manages the settings interface for custom prompt variants and user preferences.
 * Handles CRUD operations for custom variants stored in IndexedDB.
 */

import StorageUtils from '../utils/storage.js';
import { showToast } from './ui-utils.js';
import {
  getPromptVariants as getPromptVariantsFromAPI,
  type PromptVariant,
} from '../utils/variantsCache.js';
import {
  getStoredLicenseValidation,
  validateAndStoreLicenseKey,
  getStoredLicenseKey,
  clearLicenseKey,
} from '../utils/promptsCache.js';

/**
 * Custom variant interface
 */
export interface CustomVariant {
  variant: string;
  description: string;
  prompt: string;
  createdAt: number;
  isCustom: true;
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  defaultVariant: string;
  includeTimestamps: boolean;
}

export const CUSTOM_VARIANTS_KEY = 'customVariants';
export const USER_PREFERENCES_KEY = 'userPreferences';

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultVariant: 'default',
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
  licenseTab: HTMLElement;

  // Form
  variantForm: HTMLFormElement;
  formTitle: HTMLElement;
  toggleFormBtn: HTMLButtonElement;
  cancelFormBtn: HTMLButtonElement;
  variantId: HTMLInputElement;
  variantIdFeedback: HTMLElement;
  variantIdHelp: HTMLElement;
  variantDescription: HTMLInputElement;
  charCounter: HTMLElement;
  variantPrompt: HTMLTextAreaElement;
  promptHelp: HTMLElement;
  transcriptWarning: HTMLElement;

  // List
  customVariantsList: HTMLElement;
  emptyState: HTMLElement;

  // Preferences
  defaultVariantSelect: HTMLSelectElement;
  includeTimestampsToggle: HTMLInputElement;

  // License
  licenseStatus: HTMLElement;
  licenseForm: HTMLFormElement;
  licenseKeyInput: HTMLInputElement;
  licenseEmailInput: HTMLInputElement;
  validateLicenseBtn: HTMLButtonElement;
  clearLicenseBtn: HTMLButtonElement;
}

let elements: SettingsElements;
let customVariants: CustomVariant[] = [];
let userPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };
let editingVariant: string | null = null;

/**
 * Initialize the settings page
 */
async function init(): Promise<void> {
  console.log('[Settings] Initializing settings page');

  // Cache DOM elements
  elements = {
    backBtn: document.getElementById('backBtn') as HTMLButtonElement,
    closeBtn: document.getElementById('closeBtn') as HTMLButtonElement,
    tabButtons: document.querySelectorAll('.settings-tab'),
    variantsTab: document.getElementById('variantsTab') as HTMLElement,
    preferencesTab: document.getElementById('preferencesTab') as HTMLElement,
    licenseTab: document.getElementById('licenseTab') as HTMLElement,
    variantForm: document.getElementById('variantForm') as HTMLFormElement,
    formTitle: document.getElementById('formTitle') as HTMLElement,
    toggleFormBtn: document.getElementById('toggleFormBtn') as HTMLButtonElement,
    cancelFormBtn: document.getElementById('cancelFormBtn') as HTMLButtonElement,
    variantId: document.getElementById('variantId') as HTMLInputElement,
    variantIdFeedback: document.getElementById('variantIdFeedback') as HTMLElement,
    variantIdHelp: document.getElementById('variantIdHelp') as HTMLElement,
    variantDescription: document.getElementById('variantDescription') as HTMLInputElement,
    charCounter: document.getElementById('charCounter') as HTMLElement,
    variantPrompt: document.getElementById('variantPrompt') as HTMLTextAreaElement,
    promptHelp: document.getElementById('promptHelp') as HTMLElement,
    transcriptWarning: document.getElementById('transcriptWarning') as HTMLElement,
    customVariantsList: document.getElementById('customVariantsList') as HTMLElement,
    emptyState: document.getElementById('emptyState') as HTMLElement,
    defaultVariantSelect: document.getElementById('defaultVariantSelect') as HTMLSelectElement,
    includeTimestampsToggle: document.getElementById('includeTimestampsToggle') as HTMLInputElement,
    licenseStatus: document.getElementById('licenseStatus') as HTMLElement,
    licenseForm: document.getElementById('licenseForm') as HTMLFormElement,
    licenseKeyInput: document.getElementById('licenseKeyInput') as HTMLInputElement,
    licenseEmailInput: document.getElementById('licenseEmailInput') as HTMLInputElement,
    validateLicenseBtn: document.getElementById('validateLicenseBtn') as HTMLButtonElement,
    clearLicenseBtn: document.getElementById('clearLicenseBtn') as HTMLButtonElement,
  };

  // Setup event listeners
  setupEventListeners();

  // Initialize preferences
  await populateVariantDropdown();
  await loadPreferences();

  // Load custom variants
  await loadAndRenderVariants();

  // Initialize license status
  await updateLicenseStatus();

  console.log('[Settings] Initialization complete');
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

  // Form controls
  if (elements.toggleFormBtn) {
    elements.toggleFormBtn.addEventListener('click', toggleForm);
  }
  if (elements.cancelFormBtn) {
    elements.cancelFormBtn.addEventListener('click', cancelForm);
  }
  if (elements.variantForm) {
    elements.variantForm.addEventListener('submit', handleFormSubmit);
  }

  // Input validation and feedback
  if (elements.variantId) {
    elements.variantId.addEventListener('input', validateVariantId);
  }
  if (elements.variantDescription) {
    elements.variantDescription.addEventListener('input', updateCharCounter);
  }
  if (elements.variantPrompt) {
    elements.variantPrompt.addEventListener('input', checkTranscriptPlaceholder);
  }

  // Preferences
  if (elements.defaultVariantSelect) {
    elements.defaultVariantSelect.addEventListener('change', handlePreferenceChange);
  }
  if (elements.includeTimestampsToggle) {
    elements.includeTimestampsToggle.addEventListener('change', handlePreferenceChange);
  }

  // License
  if (elements.licenseForm) {
    elements.licenseForm.addEventListener('submit', handleLicenseSubmit);
  }
  if (elements.clearLicenseBtn) {
    elements.clearLicenseBtn.addEventListener('click', handleClearLicense);
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
  if (elements.licenseTab) {
    elements.licenseTab.classList.toggle('active', tabName === 'license');
    elements.licenseTab.classList.toggle('hidden', tabName !== 'license');
  }
}

/**
 * Toggle form visibility
 */
function toggleForm(): void {
  if (
    !elements.variantForm ||
    !elements.toggleFormBtn ||
    !elements.formTitle ||
    !elements.variantId
  ) {
    return;
  }

  const isHidden = elements.variantForm.classList.contains('hidden');

  if (isHidden) {
    elements.variantForm.classList.remove('hidden');
    elements.toggleFormBtn.textContent = 'Hide Form';
    elements.formTitle.textContent = 'New Custom Variant';
    elements.variantId.focus();
  } else {
    cancelForm();
  }
}

/**
 * Cancel form and reset
 */
function cancelForm(): void {
  if (!elements.variantForm || !elements.toggleFormBtn || !elements.formTitle) {
    return;
  }

  elements.variantForm.classList.add('hidden');
  elements.toggleFormBtn.textContent = 'Add New';
  if (elements.variantForm) {
    elements.variantForm.reset();
  }
  editingVariant = null;

  // Reset form title
  if (elements.formTitle) {
    elements.formTitle.textContent = 'New Custom Variant';
  }

  // Reset validation feedback
  if (elements.variantIdFeedback) {
    elements.variantIdFeedback.innerHTML = '';
    elements.variantIdFeedback.classList.add('hidden');
  }
  if (elements.variantIdHelp) {
    elements.variantIdHelp.classList.remove('text-destructive');
  }
  if (elements.variantId) {
    elements.variantId.classList.remove('border-destructive', 'border-success');
  }

  // Reset character counter
  updateCharCounter();

  // Reset transcript warning
  if (elements.transcriptWarning) {
    elements.transcriptWarning.classList.add('hidden');
  }
}

/**
 * Validate variant ID input
 */
function validateVariantId(e: Event): void {
  const input = e.target as HTMLInputElement;
  const originalValue = input.value;

  // Only allow lowercase letters, numbers, and hyphens
  input.value = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');

  // Show validation feedback
  const value = input.value.trim();

  if (!value) {
    // Empty - hide feedback
    elements.variantIdFeedback.classList.add('hidden');
    elements.variantIdFeedback.innerHTML = '';
    elements.variantId.classList.remove('border-destructive', 'border-success');
    return;
  }

  // Check format
  const isValid = /^[a-z0-9-]+$/.test(value);
  const isDuplicate = customVariants.some((v) => v.variant === value && value !== editingVariant);

  if (!isValid) {
    // Invalid format
    elements.variantIdFeedback.innerHTML = `
      <svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
    elements.variantIdFeedback.classList.remove('hidden');
    elements.variantId.classList.add('border-destructive');
    elements.variantId.classList.remove('border-success');
  } else if (isDuplicate) {
    // Duplicate ID
    elements.variantIdFeedback.innerHTML = `
      <svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
    elements.variantIdFeedback.classList.remove('hidden');
    elements.variantId.classList.add('border-destructive');
    elements.variantId.classList.remove('border-success');
    elements.variantIdHelp.innerHTML = 'This variant ID already exists. Choose a different ID.';
    elements.variantIdHelp.classList.add('text-destructive');
  } else {
    // Valid
    elements.variantIdFeedback.innerHTML = `
      <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
    elements.variantIdFeedback.classList.remove('hidden');
    elements.variantId.classList.remove('border-destructive');
    elements.variantId.classList.add('border-success');
    elements.variantIdHelp.innerHTML =
      'Format: lowercase, numbers, and hyphens (e.g., my-variant-1)';
    elements.variantIdHelp.classList.remove('text-destructive');
  }
}

/**
 * Update character counter for description field
 */
function updateCharCounter(): void {
  const length = elements.variantDescription.value.length;
  const max = 200;
  elements.charCounter.textContent = `${length} / ${max}`;

  // Update color based on length
  if (length >= 195) {
    elements.charCounter.classList.add('text-destructive');
    elements.charCounter.classList.remove('text-warning', 'text-muted-foreground');
  } else if (length >= 180) {
    elements.charCounter.classList.add('text-warning');
    elements.charCounter.classList.remove('text-destructive', 'text-muted-foreground');
  } else {
    elements.charCounter.classList.add('text-muted-foreground');
    elements.charCounter.classList.remove('text-destructive', 'text-warning');
  }
}

/**
 * Check if {transcript} placeholder is present in prompt
 */
function checkTranscriptPlaceholder(): void {
  const prompt = elements.variantPrompt.value;
  const hasTranscript = prompt.includes('{transcript}');

  if (prompt.trim() && !hasTranscript) {
    elements.transcriptWarning.classList.remove('hidden');
  } else {
    elements.transcriptWarning.classList.add('hidden');
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const variant = elements.variantId.value.trim();
  const description = elements.variantDescription.value.trim();
  const prompt = elements.variantPrompt.value.trim();

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
  if (editingVariant !== variant && customVariants.some((v) => v.variant === variant)) {
    showToast('A variant with this ID already exists', 3000, 'error');
    return;
  }

  try {
    const newVariant: CustomVariant = {
      variant,
      description,
      prompt,
      createdAt: editingVariant
        ? customVariants.find((v) => v.variant === editingVariant)!.createdAt
        : Date.now(),
      isCustom: true,
    };

    if (editingVariant && editingVariant !== variant) {
      // Variant ID changed - remove old one
      customVariants = customVariants.filter((v) => v.variant !== editingVariant);
    } else if (editingVariant) {
      // Update existing
      customVariants = customVariants.filter((v) => v.variant !== variant);
    }

    customVariants.push(newVariant);

    await StorageUtils.set(CUSTOM_VARIANTS_KEY, customVariants);

    showToast(
      editingVariant ? 'Variant updated successfully!' : 'Variant created successfully!',
      2000,
      'success'
    );

    cancelForm();
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

    console.log('[Settings] Loaded custom variants:', customVariants.length);

    // Re-populate variant dropdown to include custom variants
    await populateVariantDropdown();

    // Restore selected preference
    elements.defaultVariantSelect.value = userPreferences.defaultVariant;

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

  if (customVariants.length === 0) {
    elements.emptyState.classList.remove('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');

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
          <div class="text-xs text-muted-foreground font-mono leading-relaxed bg-muted/10 p-3 rounded-lg border border-border/50">
            ${escapeHtml(truncatedPrompt)}
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

  editingVariant = variantId;
  elements.variantId.value = variant.variant;
  elements.variantDescription.value = variant.description;
  elements.variantPrompt.value = variant.prompt;

  // Update form title and button text for edit mode
  elements.formTitle.textContent = `Edit Variant: ${variantId}`;
  elements.variantForm.classList.remove('hidden');
  elements.toggleFormBtn.textContent = 'Cancel Edit';

  // Update character counter
  updateCharCounter();

  // Check transcript placeholder
  checkTranscriptPlaceholder();

  // Validate variant ID to show feedback
  validateVariantId({ target: elements.variantId } as any);

  elements.variantId.focus();

  // Scroll to form
  elements.variantForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Handle duplicate action
 */
function handleDuplicate(variantId: string): void {
  const variant = customVariants.find((v) => v.variant === variantId);
  if (!variant) return;

  editingVariant = null;
  elements.variantId.value = `${variant.variant}-copy`;
  elements.variantDescription.value = variant.description;
  elements.variantPrompt.value = variant.prompt;

  // Update form title for new variant
  elements.formTitle.textContent = 'New Custom Variant';
  elements.variantForm.classList.remove('hidden');
  elements.toggleFormBtn.textContent = 'Hide Form';

  // Update character counter
  updateCharCounter();

  // Check transcript placeholder
  checkTranscriptPlaceholder();

  elements.variantId.focus();
  elements.variantId.select();

  // Scroll to form
  elements.variantForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
 * Populate the variant dropdown with all available options
 */
async function populateVariantDropdown(): Promise<void> {
  const select = elements.defaultVariantSelect;
  if (select) {
    select.innerHTML = '';
  }

  try {
    // Get variants from API with caching
    const variants = await getPromptVariantsFromAPI();

    // Add system variants
    variants.forEach((variant) => {
      const option = document.createElement('option');
      option.value = variant.variant;
      option.textContent = variant.label;
      option.title = variant.description;
      select.appendChild(option);
    });

    console.log(`[Settings] Loaded ${variants.length} variants for dropdown`);
  } catch (error) {
    console.error('[Settings] Failed to load variants for dropdown:', error);
    showToast('Failed to load prompt variants', 3000, 'error');

    // Add fallback variants
    const fallbackVariants = [
      {
        value: 'default',
        label: 'Default',
        description: 'Balanced overview for general audiences',
      },
      {
        value: 'educational',
        label: 'Educational',
        description: 'Structured learning with objectives and scholarly analysis',
      },
      {
        value: 'technical',
        label: 'Technical',
        description: 'Detailed analysis with code and implementation',
      },
    ];

    fallbackVariants.forEach((variant) => {
      const option = document.createElement('option');
      option.value = variant.value;
      option.textContent = variant.label;
      option.title = variant.description;
      select.appendChild(option);
    });
  }

  // Load and add custom variants
  try {
    const customVariants = await loadCustomVariants();

    // Add separator if there are custom variants
    if (customVariants.length > 0) {
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '───────────────';
      select.appendChild(separator);

      // Add custom variants
      customVariants.forEach((variant) => {
        const option = document.createElement('option');
        option.value = variant.variant;
        option.textContent = variant.variant; // Use variant name as display text
        option.title = variant.description;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('[Settings] Failed to load custom variants:', error);
  }
}

/**
 * Load preferences from storage
 */
async function loadPreferences(): Promise<void> {
  try {
    const stored = await StorageUtils.get<UserPreferences>(USER_PREFERENCES_KEY);
    userPreferences = stored || { ...DEFAULT_PREFERENCES };

    // Update UI
    elements.defaultVariantSelect.value = userPreferences.defaultVariant;
    elements.includeTimestampsToggle.checked = userPreferences.includeTimestamps;

    console.log('[Settings] Loaded preferences:', userPreferences);
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
    console.log('[Settings] Saved preferences:', userPreferences);
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
  userPreferences.defaultVariant = elements.defaultVariantSelect.value;
  userPreferences.includeTimestamps = elements.includeTimestampsToggle.checked;

  // Save to storage
  await savePreferences();

  // Show confirmation
  showToast('Preferences saved', 1500, 'success');
}

/**
 * Update license status display
 */
async function updateLicenseStatus(): Promise<void> {
  try {
    const validation = await getStoredLicenseValidation();
    const storedKey = await getStoredLicenseKey();

    if (!storedKey) {
      elements.licenseStatus.innerHTML = `
        <div class="text-center p-6 border border-border rounded-lg">
          <svg class="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
          </svg>
          <p class="text-sm font-medium text-foreground mb-2">No License Activated</p>
          <p class="text-xs text-muted-foreground">Enter your license key below to unlock Pro features</p>
        </div>
      `;
      return;
    }

    if (validation.valid && validation.lifetime) {
      elements.licenseStatus.innerHTML = `
        <div class="text-center p-6 border border-green-200 bg-green-50 rounded-lg">
          <svg class="w-12 h-12 mx-auto mb-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm font-medium text-green-800 mb-2">🔓 Pro Lifetime Active</p>
          <p class="text-xs text-green-600">Unlimited summaries and all Pro features</p>
          <div class="mt-3">
            <code class="text-xs bg-green-100 px-2 py-1 rounded text-green-800">${storedKey.substring(0, 8)}...</code>
          </div>
        </div>
      `;
    } else if (validation.valid) {
      elements.licenseStatus.innerHTML = `
        <div class="text-center p-6 border border-blue-200 bg-blue-50 rounded-lg">
          <svg class="w-12 h-12 mx-auto mb-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm font-medium text-blue-800 mb-2">✅ License Active</p>
          <p class="text-xs text-blue-600">Valid until: ${validation.expiresAt ? new Date(validation.expiresAt).toLocaleDateString() : 'Unknown'}</p>
          <div class="mt-3">
            <code class="text-xs bg-blue-100 px-2 py-1 rounded text-blue-800">${storedKey.substring(0, 8)}...</code>
          </div>
        </div>
      `;
    } else {
      elements.licenseStatus.innerHTML = `
        <div class="text-center p-6 border border-red-200 bg-red-50 rounded-lg">
          <svg class="w-12 h-12 mx-auto mb-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm font-medium text-red-800 mb-2">❌ License Invalid</p>
          <p class="text-xs text-red-600">${validation.error || 'Please check your license key and try again'}</p>
          <div class="mt-3">
            <code class="text-xs bg-red-100 px-2 py-1 rounded text-red-800">${storedKey.substring(0, 8)}...</code>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('[Settings] Failed to update license status:', error);
    elements.licenseStatus.innerHTML = `
      <div class="text-center p-6 border border-orange-200 bg-orange-50 rounded-lg">
        <svg class="w-12 h-12 mx-auto mb-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-sm font-medium text-orange-800 mb-2">⚠️ Error Loading License</p>
        <p class="text-xs text-orange-600">Please refresh the page and try again</p>
      </div>
    `;
  }
}

/**
 * Handle license form submission
 */
async function handleLicenseSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const licenseKey = elements.licenseKeyInput.value.trim();
  const email = elements.licenseEmailInput.value.trim();

  if (!licenseKey) {
    showToast('Please enter a license key', 3000, 'error');
    return;
  }

  // Show loading state
  elements.validateLicenseBtn.disabled = true;
  elements.validateLicenseBtn.innerHTML = `
    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Validating...
  `;

  try {
    const validation = await validateAndStoreLicenseKey(licenseKey, email);

    if (validation.valid) {
      showToast(
        validation.lifetime
          ? '🔓 Pro Lifetime license activated successfully!'
          : '✅ License validated successfully!',
        3000,
        'success'
      );

      // Clear form
      elements.licenseKeyInput.value = '';
      elements.licenseEmailInput.value = '';

      // Update status display
      await updateLicenseStatus();
    } else {
      showToast(
        `❌ License validation failed: ${validation.error || 'Unknown error'}`,
        3000,
        'error'
      );

      // Update status display to show error
      await updateLicenseStatus();
    }
  } catch (error) {
    console.error('[Settings] License validation error:', error);
    showToast('Failed to validate license. Please try again.', 3000, 'error');
  } finally {
    // Restore button state
    elements.validateLicenseBtn.disabled = false;
    elements.validateLicenseBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      Validate License
    `;
  }
}

/**
 * Handle clear license button click
 */
async function handleClearLicense(): Promise<void> {
  if (
    !confirm(
      'Are you sure you want to clear your license? You will need to re-enter it to continue using Pro features.'
    )
  ) {
    return;
  }

  try {
    await clearLicenseKey();
    showToast('License cleared successfully', 3000, 'success');

    // Clear form
    elements.licenseKeyInput.value = '';
    elements.licenseEmailInput.value = '';

    // Update status display
    await updateLicenseStatus();
  } catch (error) {
    console.error('[Settings] Failed to clear license:', error);
    showToast('Failed to clear license. Please try again.', 3000, 'error');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
