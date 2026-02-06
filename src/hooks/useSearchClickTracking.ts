import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Valid result types for search click tracking
 */
export type SearchResultType = "contact" | "property" | "document" | "deal";

/**
 * Parameters for tracking a search result click
 */
export interface SearchClickParams {
  /** The search query that produced the results */
  query: string;
  /** The entity type of the clicked result */
  resultType: SearchResultType;
  /** The UUID of the clicked result */
  resultId: string;
  /** 1-indexed position of the result in the list */
  position: number;
  /** Total number of results shown */
  totalResults: number;
}

/**
 * Hook for tracking search result click-through events.
 *
 * Provides a fire-and-forget trackSearchClick function that records
 * which search results users click. This data is used to:
 * - Calculate Click-Through Rate (CTR)
 * - Measure search relevance (avg click position)
 * - Identify top queries and result types
 * - Improve search ranking over time
 *
 * The tracking is fully async and non-blocking - it never delays
 * UI interactions or navigation.
 */
export function useSearchClickTracking() {
  const { profile, session } = useAuth();

  // Use ref to always have latest profile without re-creating the callback
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const trackSearchClick = useCallback(
    (params: SearchClickParams) => {
      const currentProfile = profileRef.current;
      const currentSession = sessionRef.current;

      // Silently skip if not authenticated or missing tenant
      if (!currentProfile?.tenant_id || !currentSession?.user?.id) {
        return;
      }

      // Validate position is 1-indexed and positive
      if (params.position < 1 || params.totalResults < 1) {
        return;
      }

      // Fire-and-forget: insert the click event without awaiting
      // This ensures the UI is never blocked by analytics tracking
      supabase
        .from("search_click_events" as never)
        .insert({
          tenant_id: currentProfile.tenant_id,
          user_id: currentSession.user.id,
          query: params.query,
          result_type: params.resultType,
          result_id: params.resultId,
          result_position: params.position,
          total_results: params.totalResults,
        } as never)
        .then(({ error }) => {
          if (error) {
            // Log but don't throw - tracking failures should be silent
            console.warn("[SearchClickTracking] Failed to record click:", error.message);
          }
        });
    },
    [] // Stable reference - uses refs for auth data
  );

  return { trackSearchClick };
}
