/**
 * Error Sanitization Utility (SEC-016)
 *
 * Provides generic error messages to prevent information leakage
 * while still logging detailed errors server-side for debugging.
 */

// Generic error messages for client responses
const GENERIC_ERRORS: Record<string, string> = {
  authentication: "Authentication failed. Please sign in again.",
  authorization: "You don't have permission to perform this action.",
  not_found: "The requested resource was not found.",
  validation: "The request data is invalid.",
  rate_limit: "Too many requests. Please try again later.",
  database: "A database error occurred. Please try again.",
  external_api: "An external service error occurred. Please try again.",
  internal: "An internal error occurred. Please try again.",
};

type ErrorCategory =
  | "authentication"
  | "authorization"
  | "not_found"
  | "validation"
  | "rate_limit"
  | "database"
  | "external_api"
  | "internal";

/**
 * Categorize an error based on its message or type
 */
function categorizeError(error: unknown): ErrorCategory {
  if (!(error instanceof Error)) return "internal";

  const message = error.message.toLowerCase();

  // Authentication errors
  if (
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("unauthorized") ||
    message.includes("not authenticated")
  ) {
    return "authentication";
  }

  // Authorization errors
  if (
    message.includes("forbidden") ||
    message.includes("permission") ||
    message.includes("access denied") ||
    message.includes("rls")
  ) {
    return "authorization";
  }

  // Not found errors
  if (message.includes("not found") || message.includes("no rows")) {
    return "not_found";
  }

  // Validation errors
  if (
    message.includes("invalid") ||
    message.includes("required") ||
    message.includes("must be") ||
    message.includes("validation")
  ) {
    return "validation";
  }

  // Rate limit errors
  if (message.includes("rate limit") || message.includes("too many")) {
    return "rate_limit";
  }

  // Database errors
  if (
    message.includes("supabase") ||
    message.includes("postgres") ||
    message.includes("database") ||
    message.includes("sql") ||
    message.includes("constraint")
  ) {
    return "database";
  }

  // External API errors
  if (
    message.includes("fetch") ||
    message.includes("api") ||
    message.includes("timeout") ||
    message.includes("network")
  ) {
    return "external_api";
  }

  return "internal";
}

/**
 * Sanitize an error for client response.
 * Returns a generic message that doesn't leak implementation details.
 *
 * @param error - The original error
 * @param logger - Optional logger function for server-side logging
 * @param context - Optional context for logging
 */
export function sanitizeError(
  error: unknown,
  logger?: (message: string, data: unknown) => void,
  context?: string
): { message: string; category: ErrorCategory } {
  const category = categorizeError(error);
  const publicMessage = GENERIC_ERRORS[category];

  // Log the full error server-side for debugging
  if (logger) {
    logger(`[${context || "error"}] ${category}`, {
      originalError: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return {
    message: publicMessage,
    category,
  };
}

/**
 * Create an HTTP error response with sanitized message.
 */
export function createErrorResponse(
  error: unknown,
  logger?: (message: string, data: unknown) => void,
  context?: string
): Response {
  const { message, category } = sanitizeError(error, logger, context);

  // Map categories to HTTP status codes
  const statusCodes: Record<ErrorCategory, number> = {
    authentication: 401,
    authorization: 403,
    not_found: 404,
    validation: 400,
    rate_limit: 429,
    database: 500,
    external_api: 502,
    internal: 500,
  };

  return new Response(JSON.stringify({ error: message }), {
    status: statusCodes[category],
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Type guard to check if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}
