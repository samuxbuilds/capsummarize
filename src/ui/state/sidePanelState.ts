/**
 * Side Panel State Management
 * Centralizes all state for the side panel to avoid prop drilling and global variables
 */

export class SidePanelState {
  private static instance: SidePanelState;

  public currentSummary: string | null = null;
  public currentVideoId: string | null = null;
  public currentVtt: string | null = null;
  public currentUrl: string | null = null;
  public currentVariant: string = 'default';
  public includeTimestampsPreference: boolean = false;
  public selectedHistoryId: string | null = null;

  private constructor() {}

  static getInstance(): SidePanelState {
    if (!SidePanelState.instance) {
      SidePanelState.instance = new SidePanelState();
    }
    return SidePanelState.instance;
  }

  reset(): void {
    this.currentSummary = null;
    this.currentVideoId = null;
    this.currentVtt = null;
    this.currentUrl = null;
    this.currentVariant = 'default';
    this.selectedHistoryId = null;
  }

  clearHistorySelection(): void {
    this.selectedHistoryId = null;
    document.querySelectorAll('.history-card.selected').forEach((card) => {
      card.classList.remove('selected');
    });
  }
}

export const state = SidePanelState.getInstance();
