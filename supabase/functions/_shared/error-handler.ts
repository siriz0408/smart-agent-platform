/**
 * Centralized Error Sanitization for Edge Functions (SEC-016)
 *
 * Prevents internal implementation details (stack traces, table names,
 * SQL errors, file paths) from leaking to API clients.
 *
 * Usage:
 *   import { sanitizeError, createErrorResponse } from "../_shared/error-handler.ts";
 *
 *   catch (error) {
 *     logger.error("Context", { error: rawErrorMessage(error) });
 *     return createErrorResponse(error, corsHeaders);
 *   }
 */

import { logger } from "./logger.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
  };
}

interface ErrorResponseOptions {
  /** HTTP status code (default 500) */
  status?: number;
  /** CORS / extra headers merged into the response */
  headers?: Record<string, string>;
  /** Override the error code returned to the client */
  code?: string;
  /** Additional context logged server-side (never sent to client) */
  logContext?: Record<string, unknown>;
  /** Function name for log attribution */
  functionName?: string;
}

// ---------------------------------------------------------------------------
// Internal detail patterns — if any match, the message is considered unsafe
// ---------------------------------------------------------------------------

const UNSAFE_PATTERNS: RegExp[] = [
  // PostgreSQL / Supabase internals
  /\b(relation|column|constraint|violates|pg_|duplicate key|foreign key|unique constraint)\b/i,
  /\b(select|insert|update|delete|from|where|join|table)\b.*\b(error|failed|invalid)\b/i,
  /\brow-level security\b/i,
  /\brpc\b.*\bfunction\b/i,

  // Stack traces & file paths
  /at\s+\S+\s+\(.*:\d+:\d+\)/,       // V8-style stack frames
  /\.ts:\d+/,                          // TypeScript file references
  /\.js:\d+/,                          // JavaScript file references
  /\/supabase\/functions\//,           // Internal function paths
  /node_modules/,
  /deno/i,

  // Secrets / env patterns
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token.*invalid/i,

  // Generic internals
  /ECONNREFUSED/,
  /ETIMEDOUT/,
  /ENOTFOUND/,
  /socket hang up/i,
  /internal server/i,
];

// ---------------------------------------------------------------------------
// Known safe messages — these pass through to the client as-is
// ---------------------------------------------------------------------------

const SAFE_MESSAGES: Set<string> = new Set([
  "Unauthorized",
  "Not found",
  "Forbidden",
  "Method not allowed",
  "Invalid request body",
  "Missing required fields",
  "Rate limit exceeded",
  "Subscription required",
  "Workspace not found",
  "Invalid workspace",
  "Document not found",
  "Contact not found",
  "Deal not found",
  "Agent not found",
  "Invalid file type",
  "File too large",
  "No documents selected",
  "Conversation not found",
  "Invalid connector key",
  "Connector not found",
  "Action not supported",
  "Approval required",
  "Unknown error",
]);

// ---------------------------------------------------------------------------
// Error code mapping by HTTP status
// ---------------------------------------------------------------------------

const STATUS_CODE_MAP: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract the raw error message from an unknown caught value.
 * Use this for server-side logging (NOT for client responses).
 */
export function rawErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/**
 * Return a safe, client-facing error message.
 *
 * - If the raw message exactly matches a known-safe message, it passes through.
 * - If the raw message contains internal patterns, it is replaced with a generic
 *   message to prevent information leakage.
 */
export function sanitizeErrorMessage(error: unknown): string {
  const raw = rawErrorMessage(error);

  // Allow known-safe messages through
  if (SAFE_MESSAGES.has(raw)) {
    return raw;
  }

  // Check for unsafe patterns
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(raw)) {
      return "An unexpected error occurred. Please try again or contact support.";
    }
  }

  // For short, single-line messages without obvious internals, allow through
  // but cap length to prevent overly verbose messages
  if (raw.length <= 120 && !raw.includes("\n") && !raw.includes("\\n")) {
    return raw;
  }

  // Default: replace long / multiline messages
  return "An unexpected error occurred. Please try again or contact support.";
}

/**
 * Build a standardised JSON error Response with sanitised message.
 *
 * Detailed error information is logged server-side via the logger.
 */
export function createErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  options: ErrorResponseOptions = {},
): Response {
  const {
    status = 500,
    headers = {},
    code,
    logContext = {},
    functionName = "edge-function",
  } = options;

  // ---- Server-side: log full detail ----
  const rawMsg = rawErrorMessage(error);
  logger.error(`[${functionName}] ${rawMsg}`, {
    ...logContext,
    raw_error: rawMsg,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // ---- Client-side: sanitised ----
  const safeMessage = sanitizeErrorMessage(error);
  const errorCode = code ?? STATUS_CODE_MAP[status] ?? "INTERNAL_ERROR";

  const body: ErrorResponseBody = {
    error: {
      code: errorCode,
      message: safeMessage,
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...headers,
      "Content-Type": "application/json",
    },
  });
}
