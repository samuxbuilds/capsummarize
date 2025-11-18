/**
 * Side Panel State Manager
 *
 * Manages the state of the side panel across windows.
 * This is a shared module to avoid circular dependencies.
 */

/**
 * Track side panel state per window
 */
export const sidePanelState = new Map<number, boolean>();
