/**
 * Centralized constants for the application.
 * This file contains shared constants used across background, content, and UI scripts.
 */

/**
 * Message actions used for communication between extension components
 * (background script, content script, side panel, popup).
 */
export const MESSAGE_ACTIONS = {
  CLOSE_SIDE_PANEL: 'closeSidePanel',
  SIDE_PANEL_CLOSED: 'sidePanelClosed',
  VTT_FOUND: 'vttFound',
  GET_VTT_STATUS: 'getVTTStatus',
  GET_VTT_CONTENT: 'getVTTContent',
  OPEN_SIDE_PANEL: 'openSidePanel',
  OPEN_SIDE_PANEL_FROM_CONTENT: 'openSidePanelFromContent',
  GET_VTT_HISTORY: 'getVTTHistory',
  GET_HISTORY_ITEM: 'getHistoryItem',
  CLEAR_VTT_HISTORY: 'clearVTTHistory',
  VTT_HISTORY_UPDATED: 'vttHistoryUpdated',
} as const;

/**
 * Constants used by the network interceptor to detect and process VTT files.
 */
export const INTERCEPTOR_CONSTANTS = {
  VTT_FOUND_TYPE: 'VTT_INTERCEPTOR_FOUND',
  SKIP_HEADER: 'x-vtt-interceptor-skip',
} as const;

/**
 * UI-related constants for badges, colors, and visual elements.
 */
export const UI_CONSTANTS = {
  BADGE_COLOR_SUCCESS: '#4CAF50',
  BADGE_TEXT_SUCCESS: '✓',
} as const;

/**
 * List of AI providers that support image generation capabilities.
 */
export const IMAGE_CAPABLE_PROVIDERS = ['chatgpt', 'gemini', 'grok'] as const;

/**
 * List of AI providers that support video generation capabilities.
 */
export const VIDEO_CAPABLE_PROVIDERS = ['gemini', 'grok'] as const;
