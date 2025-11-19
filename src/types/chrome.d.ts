export {};

declare global {
  namespace chrome.sidePanel {
    export function open(options: { tabId: number; windowId?: number }): Promise<void>;
    export function setOptions(options: { path: string; enabled?: boolean }): Promise<void>;
  }
}
