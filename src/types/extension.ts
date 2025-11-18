/**
 * Represents VTT (WebVTT) data extracted from a video source
 */
export interface VTTData {
  /**
   * The URL where the VTT data was found
   */
  url: string;

  /**
   * The raw VTT content as a string
   */
  content: string;

  /**
   * Timestamp when the VTT data was extracted (Unix timestamp)
   */
  timestamp: number;
}

/**
 * Represents a stored video summary in the extension's storage
 */
export interface StoredSummary {
  /**
   * The AI-generated summary text
   */
  summary: string;

  /**
   * Timestamp when the summary was generated (Unix timestamp)
   */
  timestamp: number;

  /**
   * The URL of the video this summary belongs to
   */
  videoUrl: string;
}

/**
 * Request structure sent to the AI summary API
 */
export interface APIRequest {
  /**
   * Optional VTT content for the video
   */
  vtt?: string;

  /**
   * Optional question for follow-up Q&A
   */
  question?: string;
}

/**
 * Response structure from the AI summary API
 */
export interface APIResponse {
  /**
   * The generated summary text
   */
  summary: string;
}

/**
 * Message action types used for communication between extension components
 */
export interface MessageAction {
  /**
   * The type of action to perform
   */
  action: 'vttDetected' | 'getVTTStatus' | 'getStoredSummary';

  /**
   * URL of the detected VTT file (for vttDetected action)
   */
  vttUrl?: string;

  /**
   * Content of the VTT file (for vttDetected action)
   */
  vttContent?: string;

  /**
   * Question for follow-up Q&A (for askFollowUp action)
   */
  question?: string;

  /**
   * Current tab URL (for context)
   */
  tabUrl?: string;
}

/**
 * Response structure for messages between extension components
 */
export interface MessageResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Error message if the operation failed
   */
  error?: string;

  /**
   * Whether VTT data is available for the current video
   */
  hasVTT?: boolean;

  /**
   * URL of the available VTT file
   */
  vttUrl?: string;

  /**
   * Generated summary text
   */
  summary?: string;

  /**
   * VTT content for variant changes and Q&A
   */
  vtt?: string;

  /**
   * Video URL for caching
   */
  url?: string;

  /**
   * Whether the summary was retrieved from cache
   */
  fromCache?: boolean;

  /**
   * Whether a summary exists for the current video
   */
  hasSummary?: boolean;

  /**
   * Answer to a follow-up question
   */
  answer?: string;
}

/**
 * Configuration for connecting to different video platform VTT sources
 */
export interface VTTConnector {
  /**
   * Regular expression pattern to match VTT URLs
   */
  vttPattern: RegExp;

  /**
   * Optional pattern to match specific domains
   */
  domainPattern?: RegExp;

  /**
   * Optional function to convert API responses to VTT format
   */
  convertToVTT?: (responseText: unknown) => string;
}

/**
 * Collection of VTT connectors for different video platforms
 */
export interface Connectors {
  /**
   * Connector configuration for YouTube videos
   */
  youtube: VTTConnector;

  /**
   * Default connector for other video platforms
   */
  default: VTTConnector;
}

/**
 * Available status types for the extension popup
 */
export type StatusType = 'success' | 'error' | 'loading' | 'muted';
