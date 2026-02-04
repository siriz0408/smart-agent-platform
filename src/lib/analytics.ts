/**
 * Analytics wrapper for PostHog
 * Provides type-safe event tracking for Smart Agent
 */

import posthog from 'posthog-js';

// PostHog configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

// Analytics event types
export type AnalyticsEvent =
  | 'signup_started'
  | 'signup_completed'
  | 'login_success'
  | 'login_failed'
  | 'document_uploaded'
  | 'document_indexed'
  | 'ai_query_sent'
  | 'ai_query_completed'
  | 'agent_executed'
  | 'contact_created'
  | 'property_created'
  | 'deal_created'
  | 'subscription_started'
  | 'subscription_upgraded'
  | 'subscription_cancelled'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'feature_used'
  | 'error_occurred';

// Event properties type
export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

// User properties for identification
export interface UserProperties {
  email?: string;
  name?: string;
  role?: string;
  tenant_id?: string;
  plan?: string;
  created_at?: string;
}

let isInitialized = false;

/**
 * Initialize PostHog analytics
 * Should be called once in main.tsx
 */
export function initAnalytics(): void {
  if (isInitialized || !POSTHOG_KEY) {
    if (!POSTHOG_KEY) {
      console.log('[Analytics] PostHog key not configured, analytics disabled');
    }
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Capture pageviews automatically
      capture_pageview: true,
      // Capture page leaves
      capture_pageleave: true,
      // Disable autocapture for now (explicit tracking preferred)
      autocapture: false,
      // Respect Do Not Track
      respect_dnt: true,
      // Disable session recording by default (privacy)
      disable_session_recording: true,
      // Persistence
      persistence: 'localStorage',
      // Bootstrap with feature flags if needed
      bootstrap: {},
    });

    isInitialized = true;
    console.log('[Analytics] PostHog initialized');
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
  }
}

/**
 * Identify a user for analytics
 */
export function identifyUser(userId: string, properties?: UserProperties): void {
  if (!isInitialized) return;

  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Track an analytics event
 */
export function trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
  if (!isInitialized) return;

  try {
    posthog.capture(event, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Track a page view manually
 */
export function trackPageView(pageName: string, properties?: EventProperties): void {
  if (!isInitialized) return;

  try {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      page_name: pageName,
      ...properties,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track page view:', error);
  }
}

/**
 * Reset analytics (on logout)
 */
export function resetAnalytics(): void {
  if (!isInitialized) return;

  try {
    posthog.reset();
  } catch (error) {
    console.error('[Analytics] Failed to reset:', error);
  }
}

/**
 * Set user properties without identifying
 */
export function setUserProperties(properties: UserProperties): void {
  if (!isInitialized) return;

  try {
    posthog.people.set(properties);
  } catch (error) {
    console.error('[Analytics] Failed to set user properties:', error);
  }
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!isInitialized) return false;

  try {
    return posthog.isFeatureEnabled(flagKey) || false;
  } catch (error) {
    console.error('[Analytics] Failed to check feature flag:', error);
    return false;
  }
}

// Export PostHog instance for advanced usage
export { posthog };
