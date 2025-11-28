/**
 * VTT Subtitle Interceptor
 *
 * SECURITY & COMPLIANCE NOTES:
 * - Network request interception is essential for subtitle detection functionality
 * - Only intercepts VTT subtitle files for video content analysis
 * - No modification of non-VTT requests or sensitive data
 * - Uses skip-header mechanism to prevent infinite recursion
 * - All intercepted content is used solely for AI summarization features
 * - User-initiated: extension only processes videos user chooses to summarize
 *
 * This script is injected into the page context for Manifest V3 Chrome extensions.
 * It intercepts network requests to detect and extract VTT (WebVTT) subtitle files.
 *
 * Key Features:
 * - Intercepts fetch() and XMLHttpRequest calls for VTT subtitle files
 * - Filters out thumbnail/sprite VTT files (which contain only image coordinates)
 * - Prevents recursion using a skip header mechanism
 * - Posts extracted VTT content to content script via window.postMessage
 * - Avoids duplicate processing of the same subtitle files
 * - Uses extensible connector pattern for platform-specific formats
 *
 * Architecture:
 * - Overrides native fetch() and XMLHttpRequest methods
 * - Uses bound originalFetch to prevent infinite loops
 * - Implements intelligent URL and content-type detection
 * - Analyzes VTT content to distinguish subtitles from thumbnails
 * - Routes different VTT formats to appropriate connectors
 *
 * @module interceptor
 */

import { vttConnectorRegistry } from './utils/vtt-connectors';
import { isThumbnailVTT } from './utils/vtt';
import { sanitizeVTTContent } from './utils/security.js';
import { logger } from './utils/logger';

/**
 * Prevent double-injection of the interceptor script
 */
if (!window.__vttInterceptorLoaded) {
  window.__vttInterceptorLoaded = true;

  /**
   * Header name used to mark requests that should skip interception
   * This is used to prevent infinite recursion when the interceptor makes its own
   * fetch requests to retrieve VTT content.
   */
  const SKIP_HEADER = 'x-vtt-interceptor-skip';

  /**
   * Enable/disable debug logging to console
   * This is used to log the intercepted VTT files and the content of the VTT files.
   */
  const DEBUG = false;

  /**
   * Internal state to track processed VTT files and prevent duplicates
   */
  const state = {
    lastVttUrl: '',
    lastVttContent: '',
  };

  /**
   * Logs debug messages to console when DEBUG is enabled
   * @param args - Arguments to log
   */
  const log = (...args: any[]): void => {
    if (DEBUG) logger.log('[VTT Interceptor]', ...args);
  };

  /**
   * Determines if a URL likely points to a VTT subtitle file
   *
   * Uses the connector registry to check if any registered connector
   * can handle this URL format.
   *
   * Excludes:
   * - Thumbnail/sprite VTT files (containing preview images)
   *
   * @param urlString - The URL to check
   * @returns True if URL appears to be a VTT subtitle file
   */
  const isVTTUrl = (urlString: string | null | undefined): boolean => {
    if (!urlString || typeof urlString !== 'string') return false;
    try {
      // Exclude thumbnail VTT files (contain sprite coordinates)
      if (/thumb|sprite|preview|tile|vtt-thumb|thumbnails/i.test(urlString)) {
        log('Skipping URL - detected as thumbnail:', urlString);
        return false;
      }

      // Check if any connector can handle this URL
      return vttConnectorRegistry.canHandle(urlString);
    } catch (e) {
      return false;
    }
  };

  /**
   * Checks if a Content-Type header indicates VTT format
   *
   * @param contentType - The Content-Type header value
   * @returns True if content type indicates VTT format
   */
  const isVTTMime = (contentType?: string | null): boolean => {
    if (!contentType) return false;
    return /text\/vtt|application\/vtt|vtt/i.test(contentType);
  };

  /**
   * Sends extracted VTT content to the content script via postMessage
   *
   * Uses window.postMessage to communicate from page context to content script.
   * Implements deduplication to avoid sending the same subtitle file multiple times.
   * Sanitizes content to prevent security issues.
   *
   * @param url - The URL where the VTT file was fetched from
   * @param content - The actual VTT subtitle content
   */
  const sendVTTToContentScript = (url: string, content: string): void => {
    // Avoid sending duplicate VTT files
    if (url === state.lastVttUrl && content === state.lastVttContent) return;

    // Security: Sanitize VTT content before processing
    const sanitizedContent = sanitizeVTTContent(content);

    if (!sanitizedContent) {
      log('VTT content was empty after sanitization, skipping');
      return;
    }

    state.lastVttUrl = url;
    state.lastVttContent = sanitizedContent;

    log('Posting VTT ->', url, 'bytes:', sanitizedContent.length);
    window.postMessage(
      {
        type: 'VTT_INTERCEPTOR_FOUND',
        url,
        content: sanitizedContent,
      },
      '*'
    );
  };

  /**
   * Checks if a request has the skip header to bypass interception
   *
   * This prevents infinite recursion when the interceptor makes its own
   * fetch requests to retrieve VTT content.
   *
   * @param req - The fetch request info (URL, string, or Request object)
   * @param init - Optional fetch initialization options
   * @returns True if the skip header is present
   */
  const hasSkipHeaderInRequest = (req?: RequestInfo | URL, init?: RequestInit): boolean => {
    try {
      // If Request instance
      if (req instanceof Request) {
        return req.headers ? req.headers.has(SKIP_HEADER) : false;
      }
      // If RequestInit present
      if (init?.headers) {
        const h = new Headers(init.headers as HeadersInit);
        return h.has(SKIP_HEADER);
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  /**
   * Creates a new RequestInit object with the skip header added
   *
   * Used when making internal fetch requests to prevent re-interception.
   *
   * @param init - Original fetch initialization options
   * @returns New RequestInit with skip header included
   */
  const withSkipHeader = (init?: RequestInit): RequestInit => {
    const headers = new Headers(init?.headers || {});
    // If request method is not GET, add skip header
    if (init?.method && init.method.toLowerCase() !== 'get') {
      headers.set(SKIP_HEADER, '1');
    }
    // Return new RequestInit with skip header included
    return { ...init, headers };
  };

  /**
   * Bound reference to the original fetch function
   * Used to make actual network requests without triggering interception again
   */
  const originalFetch = window.fetch.bind(window) as typeof fetch;

  /**
   * Overridden fetch function that intercepts VTT subtitle requests
   *
   * This replaces the native window.fetch to detect VTT subtitle files.
   *
   * Flow:
   * 1. Check if request has skip header -> bypass if true
   * 2. Extract URL from various input types (string, URL, Request)
   * 3. Check if URL matches VTT patterns
   * 4. If VTT: fetch with originalFetch, extract content, send to content script
   * 5. If not VTT: passthrough to originalFetch
   *
   * @param input - URL string, URL object, or Request object
   * @param init - Optional fetch configuration
   * @returns Promise resolving to the fetch Response
   */
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Bypass interception if skip header is already present
    if (hasSkipHeaderInRequest(input, init)) {
      log('Bypassing fetch due to skip header');
      return originalFetch(input as any, init as any);
    }

    // Extract URL string safely
    let urlStr = '';
    try {
      if (typeof input === 'string') urlStr = input;
      else if (input instanceof Request) urlStr = input.url;
      else if (input instanceof URL) urlStr = input.toString();
      else urlStr = String(input);
    } catch (e) {
      // fallback
      urlStr = String(input);
    }

    // If URL matches VTT patterns, intercept and process
    if (isVTTUrl(urlStr)) {
      log('Intercepted VTT fetch:', urlStr);

      try {
        // Use originalFetch to avoid recursion
        // Add skip header to prevent re-interception of our own request
        let resp: Response;

        if (input instanceof Request) {
          // Clone the Request object with skip header to prevent downstream interception
          const reqInit: RequestInit = {
            method: input.method,
            headers: new Headers(input.headers),
            body: (input as any).body ?? undefined,
            mode: input.mode,
            credentials: input.credentials,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            referrerPolicy: input.referrerPolicy,
            integrity: input.integrity,
            keepalive: (input as any).keepalive,
            signal: (input as any).signal,
          };

          // If request method is not GET, add skip header
          if (input.method && input.method.toLowerCase() !== 'get') {
            reqInit.headers = new Headers(reqInit.headers as Headers);
            (reqInit.headers as Headers).set(SKIP_HEADER, '1');
          }

          const newReq = new Request(input.url, reqInit);
          resp = await originalFetch(newReq);
        } else {
          // Input is string or URL - attach skip header via init parameter
          resp = await originalFetch(input as any, withSkipHeader(init));
        }

        // If response is successful, extract and process the VTT content
        if (resp && resp.ok) {
          try {
            // Find the appropriate connector for this URL
            const connector = vttConnectorRegistry.findConnector(urlStr);

            if (!connector) {
              log('No connector found for URL:', urlStr);
              return resp;
            }

            log(`Using ${connector.name} connector for:`, urlStr);

            // Clone response to read content without consuming original stream
            const cloned = resp.clone();

            // Parse content based on connector format
            let rawContent: string;
            if (connector.isJSONFormat()) {
              const jsonData = await cloned.json();
              rawContent = JSON.stringify(jsonData);
            } else {
              rawContent = await cloned.text();
            }

            // Convert to standard VTT format using the connector
            const vttContent = connector.convertToVTT(rawContent, urlStr);

            // Validate it's not a thumbnail sprite sheet
            if (!isThumbnailVTT(vttContent)) {
              sendVTTToContentScript(urlStr, vttContent);
              log(`Successfully processed ${connector.name} VTT`);
            } else {
              log('Skipped - detected as thumbnail sprite sheet');
            }
          } catch (err) {
            logger.error('[VTT Interceptor] Error processing response:', err);
          }
        } else {
          log('Fetch returned non-ok response', resp?.status, resp?.statusText);
        }

        return resp;
      } catch (err) {
        logger.error('[VTT Interceptor] fetch error while intercepting:', err);
        // Fallback to original fetch without modifications (best-effort)
        return originalFetch(input as any, init as any);
      }
    }

    // Not a VTT request - pass through to original fetch unchanged
    return originalFetch(input as any, init as any);
  };

  /**
   * Patches XMLHttpRequest to intercept VTT subtitle requests
   *
   * Many websites and video players use XMLHttpRequest instead of fetch()
   * to load subtitle files. This function overrides XHR methods to detect
   * and extract VTT content from XHR responses.
   *
   * Overrides:
   * - open(): Captures request method and URL
   * - setRequestHeader(): Detects skip header
   * - send(): Adds readystatechange listener to extract VTT content from response
   */
  (function patchXHR() {
    const XHR = XMLHttpRequest.prototype;
    const originalOpen = XHR.open;
    const originalSend = XHR.send;
    const originalSetRequestHeader = XHR.setRequestHeader;

    /**
     * Overridden XHR.open() - captures request URL for later inspection
     */
    XHR.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string,
      _async?: boolean,
      _user?: string | null,
      _password?: string | null
    ) {
      // Store method and URL on the XHR instance for later access
      this.__vttMethod = method;
      this.__vttUrl = url;
      // eslint-disable-next-line prefer-rest-params
      return originalOpen.apply(this, arguments as unknown as Parameters<typeof originalOpen>);
    };

    /**
     * Overridden XHR.setRequestHeader() - detects skip header
     */
    XHR.setRequestHeader = function (this: XMLHttpRequest, header: string, value: string) {
      // Allow internal requests to set the skip header to bypass interception
      try {
        if (header && header.toLowerCase() === SKIP_HEADER) {
          this.__vttSkip = true;
        }
      } catch {
        // Ignore header parsing errors
      }
      // eslint-disable-next-line prefer-rest-params
      return originalSetRequestHeader.apply(this, arguments as unknown as Parameters<typeof originalSetRequestHeader>);
    };

    /**
     * Overridden XHR.send() - adds listener to extract VTT content from response
     * This is used to extract the VTT content from the XHR response.
     */
    XHR.send = function (this: XMLHttpRequest, body?: Document | BodyInit | null) {
      const url = this.__vttUrl as string | undefined;
      const skip = !!this.__vttSkip;

      /**
       * Handles XHR readystate changes to extract VTT content when request completes
       */
      const onReady = () => {
        try {
          // Only process completed requests that haven't been marked to skip
          if (this.readyState === 4 && !skip) {
            const responseUrl = this.responseURL || url || '';
            const contentType = this.getResponseHeader
              ? this.getResponseHeader('content-type')
              : null;

            // Check if URL or content-type indicates VTT subtitle content
            if (isVTTUrl(responseUrl) || isVTTMime(contentType)) {
              // Find the appropriate connector for this URL
              const connector = vttConnectorRegistry.findConnector(responseUrl);

              if (!connector) {
                log('No connector found for XHR URL:', responseUrl);
                return;
              }

              log(`Using ${connector.name} connector for XHR:`, responseUrl);

              // Safely extract response content
              let rawContent = '';
              try {
                if (this.responseType === 'arraybuffer') {
                  rawContent = new TextDecoder().decode(this.response as ArrayBuffer);
                } else if (typeof this.responseText === 'string') {
                  rawContent = this.responseText;
                } else if (typeof this.response === 'string') {
                  rawContent = this.response;
                }
              } catch (e) {
                log('Could not read XHR response', e);
                return;
              }

              if (!rawContent) {
                log('Empty XHR response content');
                return;
              }

              // Convert to standard VTT format using the connector
              const vttContent = connector.convertToVTT(rawContent, responseUrl);

              // Validate it's not a thumbnail sprite sheet
              if (!isThumbnailVTT(vttContent)) {
                sendVTTToContentScript(responseUrl || url || 'unknown', vttContent);
                log(`Successfully processed ${connector.name} VTT from XHR`);
              } else {
                log('Skipped XHR response - detected as thumbnail sprite sheet');
              }
            }
          }
        } catch (e) {
          logger.error('[VTT Interceptor] XHR read error', e);
        }
      };

      // Attach listener to catch response when request completes
      this.addEventListener('readystatechange', onReady);

      // Call original send method to actually make the request
      // eslint-disable-next-line prefer-rest-params
      return originalSend.apply(this, arguments as unknown as Parameters<typeof originalSend>);
    };
  })();

  logger.log('[VTT Interceptor] 🚀 Interceptor loaded');
}
