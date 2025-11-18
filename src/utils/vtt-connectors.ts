/**
 * VTT Connectors
 *
 * Extensible connector pattern for handling different VTT subtitle formats
 * from various video platforms (YouTube, Vimeo, etc.)
 *
 * Each connector provides:
 * - URL detection logic
 * - Format conversion to standard WebVTT
 *
 * @module vtt-connectors
 */

import { logger } from './logger';

/**
 * Base interface for VTT connectors
 */
export interface VTTConnector {
  /**
   * Unique identifier for this connector
   */
  readonly name: string;

  /**
   * Check if a URL matches this connector's format
   * @param url - The URL to check
   * @returns True if this connector can handle the URL
   */
  canHandle(url: string): boolean;

  /**
   * Convert the platform-specific format to standard WebVTT
   * @param content - The raw content (text or JSON)
   * @param url - The original URL (for logging/context)
   * @returns Standard WebVTT formatted string
   */
  convertToVTT(content: string, url: string): string;

  /**
   * Determine if the response should be parsed as JSON
   * @returns True if content should be parsed as JSON before conversion
   */
  isJSONFormat(): boolean;
}

/**
 * YouTube VTT Connector
 *
 * Handles YouTube's timedtext API which returns JSON format captions
 *
 * JSON Structure:
 * {
 *   "events": [
 *     {
 *       "tStartMs": 0,
 *       "dDurationMs": 2000,
 *       "segs": [{ "utf8": "Caption text" }]
 *     }
 *   ]
 * }
 */
export class YouTubeVTTConnector implements VTTConnector {
  readonly name = 'YouTube';

  canHandle(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    return /timedtext/i.test(url);
  }

  isJSONFormat(): boolean {
    return true;
  }

  convertToVTT(content: string, url: string): string {
    try {
      const json = JSON.parse(content);
      let vttText = 'WEBVTT\n\n';

      if (!json?.events || !Array.isArray(json.events)) {
        logger.warn('[YouTubeVTTConnector] Invalid JSON structure:', url);
        return vttText;
      }

      json.events.forEach((event: any, index: number) => {
        if (!event.segs || !Array.isArray(event.segs)) return;

        const start = event.tStartMs / 1000;
        const end = (event.tStartMs + event.dDurationMs) / 1000;

        vttText += `${index + 1}\n`;
        vttText += `${this.formatTime(start)} --> ${this.formatTime(end)}\n`;

        event.segs.forEach((seg: any) => {
          if (seg.utf8) {
            vttText += `${seg.utf8.replace(/\n/g, ' ')}\n`;
          }
        });

        vttText += '\n';
      });

      return vttText;
    } catch (error) {
      logger.error('[YouTubeVTTConnector] Conversion error:', error);
      return 'WEBVTT\n\n';
    }
  }

  /**
   * Format seconds to WebVTT timestamp (HH:MM:SS.mmm)
   */
  private formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
  }
}

/**
 * Standard VTT Connector
 *
 * Handles standard WebVTT files that don't need conversion
 */
export class StandardVTTConnector implements VTTConnector {
  readonly name = 'Standard';

  canHandle(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    // Standard .vtt files
    if (/\.vtt(\?|$)/i.test(url)) return true;

    // Common subtitle endpoints
    if (/\/(subtitles|captions|cc|subtitle|caption)/i.test(url)) return true;

    // VTT MIME type in URL
    if (url.indexOf('text/vtt') !== -1 || url.indexOf('application/vtt') !== -1) {
      return true;
    }

    // LinkedIn Learning ambry captions
    if (/\/ambry/i.test(url)) return true;

    return false;
  }

  isJSONFormat(): boolean {
    return false;
  }

  convertToVTT(content: string, _url: string): string {
    // Already in VTT format, return as-is
    // However, we can clean up any platform-specific tags if needed
    content = content.replace(/<X-word-ms[^>]*>(.*?)<\/X-word-ms>/g, '$1');
    return content;
  }
}

/**
 * VTT Connector Registry
 *
 * Manages all available VTT connectors and routes URLs to the appropriate handler
 */
export class VTTConnectorRegistry {
  private connectors: VTTConnector[] = [];

  constructor() {
    // Register default connectors
    // Order matters: more specific connectors should come first
    this.register(new YouTubeVTTConnector());
    this.register(new StandardVTTConnector());
  }

  /**
   * Register a new connector
   */
  register(connector: VTTConnector): void {
    this.connectors.push(connector);
    logger.log(`[VTTConnectorRegistry] Registered connector: ${connector.name}`);
  }

  /**
   * Find the appropriate connector for a given URL
   */
  findConnector(url: string): VTTConnector | null {
    for (const connector of this.connectors) {
      if (connector.canHandle(url)) {
        return connector;
      }
    }
    return null;
  }

  /**
   * Check if any connector can handle this URL
   */
  canHandle(url: string): boolean {
    return this.findConnector(url) !== null;
  }
}

// Export singleton instance
export const vttConnectorRegistry = new VTTConnectorRegistry();
