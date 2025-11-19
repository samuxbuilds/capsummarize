/**
 * History List Component
 * Handles rendering and interaction with the VTT history list
 */
import { extractTextFromVTT } from '../../utils/vtt.js';

export interface HistoryItem {
  id: string;
  title: string;
  pageUrl: string;
  vttContent?: string;
  timestamp: number;
  favicon?: string;
}

export class HistoryList {
  private container: HTMLElement | null;
  private listElement: HTMLElement | null;
  private chevronElement: HTMLElement | null;
  private headerElement: HTMLElement | null;

  constructor(
    containerId: string,
    listId: string,
    chevronId: string,
    headerId: string,
    private onItemClick: (id: string) => void
  ) {
    this.container = document.getElementById(containerId);
    this.listElement = document.getElementById(listId);
    this.chevronElement = document.getElementById(chevronId);
    this.headerElement = document.getElementById(headerId);

    this.setupListeners();
  }

  private setupListeners(): void {
    if (this.headerElement && this.listElement && this.chevronElement) {
      this.headerElement.addEventListener('click', () => {
        const isHidden = this.listElement?.classList.contains('hidden');
        if (isHidden) {
          this.listElement?.classList.remove('hidden');
          this.chevronElement!.style.transform = 'rotate(0deg)';
        } else {
          this.listElement?.classList.add('hidden');
          this.chevronElement!.style.transform = 'rotate(-90deg)';
        }
      });
    }
  }

  render(history: HistoryItem[]): void {
    if (!history || history.length === 0) {
      this.container?.classList.add('hidden');
      return;
    }

    this.container?.classList.remove('hidden');

    if (this.listElement) {
      const isExpanded = !this.listElement.classList.contains('hidden');

      this.listElement.innerHTML = history
        .map((item) => this.createHistoryCard(item))
        .filter(Boolean)
        .join('');

      if (!isExpanded) {
        this.listElement.classList.add('hidden');
      }

      // Re-attach listeners to new elements
      this.listElement.querySelectorAll('[data-history-id]').forEach((card) => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-history-id');
          if (id) this.onItemClick(id);
        });
      });
    }

    if (this.chevronElement && this.listElement) {
      const isExpanded = !this.listElement.classList.contains('hidden');
      this.chevronElement.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
  }

  clear(): void {
    this.container?.classList.add('hidden');
    if (this.listElement) {
      this.listElement.innerHTML = '';
    }
  }

  private createHistoryCard(item: HistoryItem): string | null {
    if (!item.vttContent) return null;

    let preview = '';
    const fullText = extractTextFromVTT(item.vttContent, true);
    if (fullText) {
      const words = fullText.trim().split(/\s+/).slice(0, 30);
      preview = words.join(' ') + (words.length >= 30 ? '...' : '');
    }

    return `
      <div class="card hover:bg-card-hover cursor-pointer transition-colors history-card" data-history-id="${item.id}">
        <div class="flex flex-col gap-2 p-3">
          <p class="text-sm text-foreground line-clamp-2 leading-relaxed">${this.escapeHtml(preview)}</p>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
