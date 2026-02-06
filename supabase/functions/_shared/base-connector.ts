/**
 * Base Connector Class
 * 
 * Abstract base class for all connector implementations.
 * Provides common functionality for OAuth, rate limiting, error handling.
 */

import {
  IConnector,
  ConnectorCredentials,
  ConnectorActionResult,
  ConnectorError,
  ConnectorAuthError,
  ConnectorRateLimitError,
  ConnectorValidationError,
} from './connector-types.ts';

/**
 * Abstract base class for connector implementations
 * 
 * Subclasses must implement:
 * - execute() - Execute the actual action
 * - validateAction() - Validate action parameters
 * - getSupportedActions() - Return supported action types
 * 
 * Optional overrides:
 * - refreshToken() - Custom token refresh logic
 * - getRateLimitInfo() - Custom rate limiting
 */
export abstract class BaseConnector implements IConnector {
  abstract readonly connectorKey: string;

  /**
   * Execute an action through this connector
   * Must be implemented by subclasses
   */
  abstract execute(
    actionType: string,
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult>;

  /**
   * Validate action parameters
   * Must be implemented by subclasses
   */
  abstract validateAction(
    actionType: string,
    params: Record<string, unknown>
  ): { valid: boolean; errors: string[] };

  /**
   * Get supported action types
   * Must be implemented by subclasses
   */
  abstract getSupportedActions(): string[];

  /**
   * Refresh OAuth token if expired
   * Override in subclasses for custom refresh logic
   */
  async refreshToken(
    credentials: ConnectorCredentials
  ): Promise<ConnectorCredentials> {
    // Default implementation: check if token is expired
    if (!credentials.token_expires_at) {
      return credentials; // No expiration, assume valid
    }

    const expiresAt = new Date(credentials.token_expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer

    // Token not expired yet
    if (expiresAt.getTime() > now.getTime() + bufferMs) {
      return credentials;
    }

    // Token expired - subclasses should override this
    throw new ConnectorAuthError(
      `Token expired for connector ${this.connectorKey}. Refresh not implemented.`,
      this.connectorKey
    );
  }

  /**
   * Check if credentials are valid
   */
  protected isTokenValid(credentials: ConnectorCredentials): boolean {
    if (!credentials.token_expires_at) {
      return true; // No expiration, assume valid
    }

    const expiresAt = new Date(credentials.token_expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer

    return expiresAt.getTime() > now.getTime() + bufferMs;
  }

  /**
   * Validate required parameters
   */
  protected validateRequiredParams(
    params: Record<string, unknown>,
    required: string[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of required) {
      if (!(param in params) || params[param] === null || params[param] === undefined) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate parameter types
   */
  protected validateParamTypes(
    params: Record<string, unknown>,
    schema: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [param, expectedType] of Object.entries(schema)) {
      if (!(param in params)) {
        continue; // Skip missing params (handled by required check)
      }

      const value = params[param];
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (actualType !== expectedType) {
        errors.push(
          `Parameter ${param} must be ${expectedType}, got ${actualType}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Make HTTP request with error handling
   */
  protected async makeRequest(
    url: string,
    options: RequestInit,
    credentials: ConnectorCredentials
  ): Promise<Response> {
    // Ensure token is valid
    if (!this.isTokenValid(credentials)) {
      const refreshed = await this.refreshToken(credentials);
      credentials = refreshed;
    }

    // Add authorization header
    const headers = new Headers(options.headers);
    headers.set(
      'Authorization',
      `${credentials.token_type || 'Bearer'} ${credentials.access_token}`
    );

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const resetAt = retryAfter
        ? new Date(Date.now() + parseInt(retryAfter) * 1000).toISOString()
        : new Date(Date.now() + 60 * 1000).toISOString();

      throw new ConnectorRateLimitError(
        'Rate limit exceeded',
        resetAt,
        this.connectorKey
      );
    }

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      throw new ConnectorAuthError(
        `Authentication failed: ${response.statusText}`,
        this.connectorKey
      );
    }

    return response;
  }

  /**
   * Parse JSON response with error handling
   */
  protected async parseJsonResponse<T>(
    response: Response
  ): Promise<T> {
    const text = await response.text();

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(text);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        // Use default error message
      }
      throw new ConnectorError(
        errorMessage,
        'HTTP_ERROR',
        this.connectorKey
      );
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new ConnectorError(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PARSE_ERROR',
        this.connectorKey
      );
    }
  }

  /**
   * Create standardized error result
   */
  protected createErrorResult(
    error: unknown,
    actionType: string
  ): ConnectorActionResult {
    if (error instanceof ConnectorError) {
      return {
        success: false,
        error: error.message,
        error_code: error.code,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      error_code: 'UNKNOWN_ERROR',
    };
  }

  /**
   * Create standardized success result
   */
  protected createSuccessResult(
    data: Record<string, unknown>,
    rateLimit?: { remaining: number; reset_at: string }
  ): ConnectorActionResult {
    return {
      success: true,
      data,
      rate_limit: rateLimit,
    };
  }
}
