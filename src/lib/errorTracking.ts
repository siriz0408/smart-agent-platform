/**
 * Error tracking wrapper for Sentry
 * Provides error reporting and performance monitoring
 */

import * as Sentry from '@sentry/react';

// Sentry configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
const ENVIRONMENT = import.meta.env.MODE || 'development';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

let isInitialized = false;

/**
 * Initialize Sentry error tracking
 * Should be called once in main.tsx before React render
 */
export function initErrorTracking(): void {
  if (isInitialized || !SENTRY_DSN) {
    if (!SENTRY_DSN) {
      console.log('[ErrorTracking] Sentry DSN not configured, error tracking disabled');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      release: `smart-agent@${APP_VERSION}`,
      
      // Performance monitoring
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
      
      // Session replay (disabled by default for privacy)
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,
      
      // Integrations
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Mask all text for privacy
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Filter out noisy errors
      beforeSend(event, hint) {
        const error = hint.originalException;
        
        // Ignore canceled requests
        if (error instanceof Error) {
          if (error.message.includes('AbortError')) {
            return null;
          }
          if (error.message.includes('Failed to fetch')) {
            // Only send fetch errors if they're not due to network issues
            if (!navigator.onLine) {
              return null;
            }
          }
        }
        
        return event;
      },
      
      // Filter sensitive data
      beforeSendTransaction(event) {
        // Remove any PII from transactions
        if (event.user) {
          delete event.user.ip_address;
        }
        return event;
      },
    });

    isInitialized = true;
    console.log('[ErrorTracking] Sentry initialized');
  } catch (error) {
    console.error('[ErrorTracking] Failed to initialize Sentry:', error);
  }
}

/**
 * Set user context for error reports
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  role?: string;
  tenant_id?: string;
}): void {
  if (!isInitialized) return;

  try {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      // Add custom tags
    });
    
    // Set custom tags
    if (user.role) {
      Sentry.setTag('user_role', user.role);
    }
    if (user.tenant_id) {
      Sentry.setTag('tenant_id', user.tenant_id);
    }
  } catch (error) {
    console.error('[ErrorTracking] Failed to set user context:', error);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  if (!isInitialized) return;

  try {
    Sentry.setUser(null);
  } catch (error) {
    console.error('[ErrorTracking] Failed to clear user context:', error);
  }
}

/**
 * Capture an exception manually
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (!isInitialized) {
    console.error('[ErrorTracking] (not initialized)', error);
    return;
  }

  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (err) {
    console.error('[ErrorTracking] Failed to capture exception:', err);
  }
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  if (!isInitialized) return;

  try {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } catch (error) {
    console.error('[ErrorTracking] Failed to capture message:', error);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (!isInitialized) return;

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  } catch (error) {
    console.error('[ErrorTracking] Failed to add breadcrumb:', error);
  }
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): ReturnType<typeof Sentry.startInactiveSpan> | null {
  if (!isInitialized) return null;

  try {
    return Sentry.startInactiveSpan({
      name,
      op,
    });
  } catch (error) {
    console.error('[ErrorTracking] Failed to start transaction:', error);
    return null;
  }
}

/**
 * Create an Error Boundary component wrapper
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * HOC to wrap components with error boundary
 */
export const withErrorBoundary = Sentry.withErrorBoundary;

// Export Sentry for advanced usage
export { Sentry };
