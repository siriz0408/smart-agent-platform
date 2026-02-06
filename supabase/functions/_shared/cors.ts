/**
 * Shared CORS Configuration (SEC-015)
 *
 * Restricts Access-Control-Allow-Origin to specific allowed origins instead
 * of the wildcard "*".  All edge functions should import `getCorsHeaders()`
 * from this module and call it with the incoming `Request` object.
 *
 * Usage:
 *   import { getCorsHeaders } from "../_shared/cors.ts";
 *
 *   serve(async (req) => {
 *     const corsHeaders = getCorsHeaders(req);
 *     if (req.method === "OPTIONS") {
 *       return new Response(null, { headers: corsHeaders });
 *     }
 *     // ...use corsHeaders in all responses
 *   });
 */

// ---------------------------------------------------------------------------
// Allowed origins
// ---------------------------------------------------------------------------

/** Production domain(s) – the primary Vercel deployment. */
const PRODUCTION_ORIGINS: string[] = [
  "https://smart-agent-platform-sigma.vercel.app",
];

/** Local development origins (never sent in production responses). */
const DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

/**
 * Vercel preview deployment URL pattern.
 * Matches e.g. https://smart-agent-platform-sigma-<hash>-<team>.vercel.app
 * or            https://smart-agent-platform-sigma-git-branch-<team>.vercel.app
 */
const VERCEL_PREVIEW_PATTERN =
  /^https:\/\/smart-agent-platform-sigma[a-z0-9-]*\.vercel\.app$/;

// ---------------------------------------------------------------------------
// Allowed headers (superset of all edge-function needs)
// ---------------------------------------------------------------------------

const ALLOWED_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
  "x-supabase-api-key",
  "x-webhook-secret",
].join(", ");

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build the full list of allowed origins (static + env var). */
function getAllowedOrigins(): string[] {
  const origins = [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];

  // Optional: additional origins from Supabase secret (comma-separated)
  try {
    const extra = Deno.env.get("ALLOWED_ORIGINS");
    if (extra) {
      for (const o of extra.split(",")) {
        const trimmed = o.trim();
        if (trimmed) origins.push(trimmed);
      }
    }
  } catch {
    // env access may throw in some test runners – ignore
  }

  return origins;
}

/** Return `true` if the origin is in the allow-list or matches the preview pattern. */
function isOriginAllowed(origin: string): boolean {
  if (getAllowedOrigins().includes(origin)) return true;
  if (VERCEL_PREVIEW_PATTERN.test(origin)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build CORS response headers based on the incoming request's `Origin`.
 *
 * - **Origin matches** an allowed origin → reflected in `Access-Control-Allow-Origin`.
 * - **No Origin header** (server-to-server / cron) → production origin is used
 *   as a safe default (CORS is a browser-only mechanism, so this is harmless).
 * - **Origin present but not allowed** → `Access-Control-Allow-Origin` is omitted;
 *   the browser will block the response automatically.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || req.headers.get("origin");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  if (origin && isOriginAllowed(origin)) {
    // Reflect the exact origin (required for credentialed requests)
    headers["Access-Control-Allow-Origin"] = origin;
    // Vary by Origin so caches don't serve a response for one origin to another
    headers["Vary"] = "Origin";
  } else if (!origin) {
    // Server-to-server call – set production origin for compatibility
    headers["Access-Control-Allow-Origin"] = PRODUCTION_ORIGINS[0];
  }
  // else: origin present but not allowed → omit header → browser blocks

  return headers;
}
