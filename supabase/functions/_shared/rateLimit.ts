/**
 * Rate Limiting Utilities for Edge Functions
 * 
 * Simple in-memory rate limiter with sliding window.
 * For production, consider using Redis or Supabase's built-in rate limiting.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store (resets on function cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Identifier prefix (e.g., 'ai-chat', 'email') */
  prefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request is within rate limits
 * @param identifier - Unique identifier (usually user ID or tenant ID)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowSeconds, prefix = 'default' } = config;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = rateLimitStore.get(key);

  // No existing entry, create new one
  if (!entry) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Check if we're in a new window
  if (now - entry.windowStart >= windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Within current window
  if (entry.count >= maxRequests) {
    const resetAt = entry.windowStart + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((resetAt - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toString());
  
  if (!result.allowed && result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
  
  return headers;
}

/**
 * Create a 429 Too Many Requests response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(rateLimitHeaders(result)),
      },
    }
  );
}

// Pre-configured rate limiters for common use cases
export const AI_CHAT_LIMITS = {
  maxRequests: 10, // 10 requests per minute
  windowSeconds: 60,
  prefix: 'ai-chat',
};

export const AGENT_EXECUTION_LIMITS = {
  maxRequests: 20, // 20 requests per hour
  windowSeconds: 3600,
  prefix: 'agent-exec',
};

export const DOCUMENT_INDEX_LIMITS = {
  maxRequests: 5, // 5 documents per 10 minutes
  windowSeconds: 600,
  prefix: 'doc-index',
};

export const EMAIL_LIMITS = {
  maxRequests: 10, // 10 emails per hour per tenant
  windowSeconds: 3600,
  prefix: 'email',
};

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  const maxWindowMs = 3600 * 1000; // 1 hour max window

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > maxWindowMs) {
      rateLimitStore.delete(key);
    }
  }
}
