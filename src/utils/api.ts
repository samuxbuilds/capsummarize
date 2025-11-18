/**
 * Utility helpers for interacting with the video summarization backend.
 * Provides typed request helpers, error handling, and higher-level
 * convenience methods used throughout the Chrome extension.
 */

import { logger } from './logger';
import { getApiBaseUrl as getEnvApiBaseUrl } from '../config/env.js';
import { isValidApiUrl } from './security.js';

/**
 * Prompt variants supported by the summarization service.
 */
export type PromptVariant =
  | 'blog'
  | 'casual'
  | 'default'
  | 'educational'
  | 'executive'
  | 'kids'
  | 'marketing'
  | 'news'
  | 'podcast'
  | 'technical'
  | 'x'
  | 'youtube'
  | 'cheatsheet'
  | 'recap'
  | 'interview';

/**
 * Generic API request payload for other endpoints
 */
interface APIRequest {
  [key: string]: any;
}

/**
 * Generic API request payload for other endpoints
 */
interface GenericAPIRequest {
  [key: string]: any;
}

/**
 * License validation response payload
 */
interface LicenseValidationResponse {
  valid: boolean;
  lifetime: boolean;
  expiresAt?: string;
  error?: string;
  message?: string;
}

/**
 * License validation request payload
 */
interface LicenseValidationRequest {
  licenseKey: string;
  email?: string;
}

/**
 * Custom error wrapper surfaced when API requests fail.
 */
class APIError extends Error {
  public readonly status: number;
  public readonly details: string;

  /**
   * Create a new API error.
   * @param message - Human-readable error details.
   * @param status - HTTP status code associated with the failure.
   * @param details - Additional information from the server response.
   */
  constructor(message: string, status = 0, details = '') {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }

  /**
   * Determine whether the error originated from connectivity issues.
   */
  isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * Determine whether the error was caused by a 4xx response.
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Determine whether the error was caused by a 5xx response.
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Provide a user-friendly error message derived from the status code.
   */
  getUserFriendlyMessage(): string {
    if (this.isNetworkError()) {
      return 'Unable to connect to the server. Please check your connection.';
    }

    if (this.isClientError()) {
      return 'Invalid request. Please try again.';
    }

    if (this.isServerError()) {
      return 'Server error. Please try again later.';
    }

    return this.message;
  }
}

class APIUtils {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  /**
   * Create a new API client instance.
   * @param baseUrl - Base URL of the summarization backend.
   */
  constructor(baseUrl = getEnvApiBaseUrl()) {
    // Validate API URL for security compliance
    if (!isValidApiUrl(baseUrl)) {
      throw new Error(`Invalid API URL: ${baseUrl}`);
    }

    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Underlying request helper used by HTTP verb convenience methods.
   * @param endpoint - Path to append to the base URL.
   * @param options - Fetch configuration overrides.
   * @throws {APIError} When the network call fails or the response is not OK.
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new APIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await response.text()
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Network error: ${(error as Error).message}`, 0, (error as Error).message);
    }
  }

  /**
   * Perform a GET request.
   * @param endpoint - Relative path to query.
   * @param params - Query string parameters to include.
   */
  async get(endpoint: string, params: Record<string, string> = {}): Promise<unknown> {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET',
    });
  }

  /**
   * Perform a POST request.
   * @param endpoint - Relative path to post to.
   * @param data - JSON body payload sent to the server.
   */
  async post(endpoint: string, data: APIRequest = {}): Promise<unknown> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Perform a PUT request.
   * @param endpoint - Relative path to put to.
   * @param data - JSON body payload sent to the server.
   */
  async put(endpoint: string, data: APIRequest = {}): Promise<unknown> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Perform a DELETE request.
   * @param endpoint - Relative path to delete.
   */
  async delete(endpoint: string): Promise<unknown> {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Specific methods for video summary API - REMOVED
  // These methods are now handled directly by calling code using fetch()

  /**
   * Get available prompt variants
   */
  async getPrompts(): Promise<Array<{ variant: string; description: string; prompt: string }>> {
    const response = (await this.get('/prompts')) as {
      success: boolean;
      prompts: Array<{ variant: string; description: string; prompt: string }>;
    };
    return response.prompts;
  }

  /**
   * Validate a Gumroad license key for pro features
   * @param licenseKey - The license key to validate
   * @param email - Optional email address for validation
   * @returns License validation response
   */
  async validateLicense(licenseKey: string, email?: string): Promise<LicenseValidationResponse> {
    if (!licenseKey || licenseKey.trim().length === 0) {
      throw new APIError('License key is required', 400);
    }

    const requestBody: GenericAPIRequest = {
      licenseKey: licenseKey.trim(),
      email: email?.trim(),
    };

    const response = (await this.post(
      '/license/validate',
      requestBody
    )) as LicenseValidationResponse;

    return response;
  }

  /**
   * Override the base URL for future requests.
   * @param baseUrl - New base URL value.
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }
}

// Create a default instance
const api = new APIUtils();

// Export for use in other modules
export { api, APIError, APIUtils };
export default APIUtils;
