/**
 * Performance monitoring hook using React Performance API and Sentry
 * Tracks component render times, route navigation, and user interactions
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { startTransaction } from '@/lib/errorTracking';
import { trackEvent } from '@/lib/analytics';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Hook to track component render performance
 */
export function usePerformanceMonitoring(componentName: string) {
  const renderStartRef = useRef<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Track component mount/render time
    renderStartRef.current = performance.now();

    return () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current;
        
        // Only track if render took significant time (>16ms = 1 frame)
        if (renderTime > 16) {
          trackEvent('component_render', {
            component: componentName,
            render_time_ms: Math.round(renderTime),
            route: location.pathname,
          });
        }
      }
    };
  }, [componentName, location.pathname]);

  /**
   * Track a custom performance metric
   */
  const trackMetric = useCallback((name: string, duration: number, metadata?: Record<string, unknown>) => {
    trackEvent('performance_metric', {
      metric_name: name,
      duration_ms: Math.round(duration),
      route: location.pathname,
      ...metadata,
    });
  }, [location.pathname]);

  /**
   * Measure async operation performance
   */
  const measureAsync = useCallback(async <T,>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> => {
    const startTime = performance.now();
    const transaction = startTransaction(`operation.${operationName}`, 'custom');

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      trackMetric(operationName, duration, {
        ...metadata,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      trackMetric(operationName, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    } finally {
      if (transaction) {
        transaction.end();
      }
    }
  }, [trackMetric]);

  return {
    trackMetric,
    measureAsync,
  };
}

/**
 * Hook to track route navigation performance
 */
export function useRoutePerformanceTracking() {
  const location = useLocation();
  const routeStartRef = useRef<number | null>(null);
  const previousPathRef = useRef<string>('');

  useEffect(() => {
    const currentPath = location.pathname;

    // Track route change
    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      // End previous route tracking
      if (routeStartRef.current) {
        const navigationTime = performance.now() - routeStartRef.current;
        
        trackEvent('route_navigation', {
          from: previousPathRef.current,
          to: currentPath,
          navigation_time_ms: Math.round(navigationTime),
        });
      }
    }

    // Start tracking new route
    routeStartRef.current = performance.now();
    previousPathRef.current = currentPath;

    // Track page load metrics using Performance API
    const trackPageLoadMetrics = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const metrics = {
            route: currentPath,
            dom_content_loaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
            load_complete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
            time_to_first_byte: Math.round(navigation.responseStart - navigation.requestStart),
            dom_interactive: Math.round(navigation.domInteractive - navigation.navigationStart),
          };

          trackEvent('page_load_metrics', metrics);
        }
      }
    };

    // Track metrics after a short delay to ensure all metrics are available
    const timeoutId = setTimeout(trackPageLoadMetrics, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.pathname]);
}

/**
 * Hook to track user interaction performance (clicks, form submissions, etc.)
 */
export function useInteractionPerformanceTracking() {
  const trackInteraction = useCallback((
    interactionType: 'click' | 'submit' | 'input' | 'scroll',
    target: string,
    duration?: number
  ) => {
    trackEvent('user_interaction', {
      interaction_type: interactionType,
      target,
      duration_ms: duration ? Math.round(duration) : undefined,
    });
  }, []);

  return { trackInteraction };
}
