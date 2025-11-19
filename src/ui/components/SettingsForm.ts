/**
 * Settings Form Component
 * Handles validation and interaction for the custom variant form
 */

export interface SettingsFormElements {
  form: HTMLFormElement | null;
  title: HTMLElement | null;
  toggleBtn: HTMLButtonElement | null;
  cancelBtn: HTMLButtonElement | null;
  variantId: HTMLInputElement | null;
  variantIdFeedback: HTMLElement | null;
  variantIdHelp: HTMLElement | null;
  description: HTMLInputElement | null;
  charCounter: HTMLElement | null;
  prompt: HTMLTextAreaElement | null;
  transcriptWarning: HTMLElement | null;
}

export class SettingsForm {
  private elements: SettingsFormElements;
  private editingVariantId: string | null = null;

  constructor(
    elements: SettingsFormElements,
    private onSubmit: (
      data: { variant: string; description: string; prompt: string },
      isEdit: boolean
    ) => Promise<void>,
    private existingVariants: string[]
  ) {
    this.elements = elements;
    this.setupListeners();
  }

  private setupListeners(): void {
    if (this.elements.toggleBtn) {
      this.elements.toggleBtn.addEventListener('click', () => this.toggle());
    }

    if (this.elements.cancelBtn) {
      this.elements.cancelBtn.addEventListener('click', () => this.reset());
    }

    if (this.elements.form) {
      this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (this.elements.variantId) {
      this.elements.variantId.addEventListener('input', (e) => this.validateVariantId(e));
    }

    if (this.elements.description) {
      this.elements.description.addEventListener('input', () => this.updateCharCounter());
    }

    if (this.elements.prompt) {
      this.elements.prompt.addEventListener('input', () => this.checkTranscriptPlaceholder());
    }
  }

  public setExistingVariants(variants: string[]): void {
    this.existingVariants = variants;
  }

  public edit(variant: { variant: string; description: string; prompt: string }): void {
    if (!this.elements.form || !this.elements.title || !this.elements.toggleBtn) return;

    this.editingVariantId = variant.variant;

    if (this.elements.variantId) this.elements.variantId.value = variant.variant;
    if (this.elements.description) this.elements.description.value = variant.description;
    if (this.elements.prompt) this.elements.prompt.value = variant.prompt;

    this.elements.title.textContent = `Edit Variant: ${variant.variant}`;
    this.elements.form.classList.remove('hidden');
    this.elements.toggleBtn.textContent = 'Cancel Edit';

    this.updateCharCounter();
    this.checkTranscriptPlaceholder();

    // Trigger validation
    if (this.elements.variantId) {
      this.validateVariantId({ target: this.elements.variantId } as unknown as Event);
      this.elements.variantId.focus();
    }

    // Scroll to form
    this.elements.form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  public duplicate(variant: { variant: string; description: string; prompt: string }): void {
    if (!this.elements.form || !this.elements.title || !this.elements.toggleBtn) return;

    this.editingVariantId = null;

    if (this.elements.variantId) this.elements.variantId.value = `${variant.variant}-copy`;
    if (this.elements.description) this.elements.description.value = variant.description;
    if (this.elements.prompt) this.elements.prompt.value = variant.prompt;

    this.elements.title.textContent = 'New Custom Variant';
    this.elements.form.classList.remove('hidden');
    this.elements.toggleBtn.textContent = 'Hide Form';

    this.updateCharCounter();
    this.checkTranscriptPlaceholder();

    if (this.elements.variantId) {
      this.elements.variantId.focus();
      this.elements.variantId.select();
    }

    this.elements.form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  public toggle(): void {
    if (!this.elements.form || !this.elements.toggleBtn || !this.elements.title) return;

    const isHidden = this.elements.form.classList.contains('hidden');

    if (isHidden) {
      this.elements.form.classList.remove('hidden');
      this.elements.toggleBtn.textContent = 'Hide Form';
      this.elements.title.textContent = 'New Custom Variant';
      if (this.elements.variantId) this.elements.variantId.focus();
    } else {
      this.reset();
    }
  }

  public reset(): void {
    if (!this.elements.form || !this.elements.toggleBtn || !this.elements.title) return;

    this.elements.form.classList.add('hidden');
    this.elements.toggleBtn.textContent = 'Add New';
    this.elements.form.reset();
    this.editingVariantId = null;
    this.elements.title.textContent = 'New Custom Variant';

    // Reset feedback
    if (this.elements.variantIdFeedback) {
      this.elements.variantIdFeedback.innerHTML = '';
      this.elements.variantIdFeedback.classList.add('hidden');
    }
    if (this.elements.variantIdHelp) {
      this.elements.variantIdHelp.classList.remove('text-destructive');
    }
    if (this.elements.variantId) {
      this.elements.variantId.classList.remove('border-destructive', 'border-success');
    }

    this.updateCharCounter();

    if (this.elements.transcriptWarning) {
      this.elements.transcriptWarning.classList.add('hidden');
    }
  }

  private validateVariantId(e: Event): void {
    if (
      !this.elements.variantId ||
      !this.elements.variantIdFeedback ||
      !this.elements.variantIdHelp
    )
      return;

    const input = e.target as HTMLInputElement;

    // Clean input
    input.value = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const value = input.value.trim();

    if (!value) {
      this.elements.variantIdFeedback.classList.add('hidden');
      this.elements.variantIdFeedback.innerHTML = '';
      this.elements.variantId.classList.remove('border-destructive', 'border-success');
      return;
    }

    // Check constraints
    const isDuplicate = this.existingVariants.includes(value) && value !== this.editingVariantId;
    const isValid = /^[a-z0-9-]+$/.test(value);

    if (!isValid) {
      this.showFeedback('invalid');
    } else if (isDuplicate) {
      this.showFeedback('duplicate');
    } else {
      this.showFeedback('valid');
    }
  }

  private showFeedback(type: 'valid' | 'invalid' | 'duplicate'): void {
    if (
      !this.elements.variantIdFeedback ||
      !this.elements.variantId ||
      !this.elements.variantIdHelp
    )
      return;

    this.elements.variantIdFeedback.classList.remove('hidden');

    if (type === 'valid') {
      this.elements.variantIdFeedback.innerHTML = `
        <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `;
      this.elements.variantId.classList.remove('border-destructive');
      this.elements.variantId.classList.add('border-success');
      this.elements.variantIdHelp.innerHTML =
        'Format: lowercase, numbers, and hyphens (e.g., my-variant-1)';
      this.elements.variantIdHelp.classList.remove('text-destructive');
    } else {
      this.elements.variantIdFeedback.innerHTML = `
        <svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `;
      this.elements.variantId.classList.add('border-destructive');
      this.elements.variantId.classList.remove('border-success');

      if (type === 'duplicate') {
        this.elements.variantIdHelp.innerHTML =
          'This variant ID already exists. Choose a different ID.';
        this.elements.variantIdHelp.classList.add('text-destructive');
      }
    }
  }

  private updateCharCounter(): void {
    if (!this.elements.description || !this.elements.charCounter) return;

    const length = this.elements.description.value.length;
    const max = 200;
    this.elements.charCounter.textContent = `${length} / ${max}`;

    if (length >= 195) {
      this.elements.charCounter.classList.add('text-destructive');
      this.elements.charCounter.classList.remove('text-warning', 'text-muted-foreground');
    } else if (length >= 180) {
      this.elements.charCounter.classList.add('text-warning');
      this.elements.charCounter.classList.remove('text-destructive', 'text-muted-foreground');
    } else {
      this.elements.charCounter.classList.add('text-muted-foreground');
      this.elements.charCounter.classList.remove('text-destructive', 'text-warning');
    }
  }

  private checkTranscriptPlaceholder(): void {
    if (!this.elements.prompt || !this.elements.transcriptWarning) return;

    const prompt = this.elements.prompt.value;
    const hasTranscript = prompt.includes('{transcript}');

    if (prompt.trim() && !hasTranscript) {
      this.elements.transcriptWarning.classList.remove('hidden');
    } else {
      this.elements.transcriptWarning.classList.add('hidden');
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (!this.elements.variantId || !this.elements.description || !this.elements.prompt) return;

    const variant = this.elements.variantId.value.trim();
    const description = this.elements.description.value.trim();
    const prompt = this.elements.prompt.value.trim();

    if (!variant || !description || !prompt) {
      // Let controller handle toast
      return;
    }

    await this.onSubmit({ variant, description, prompt }, !!this.editingVariantId);
  }
}
