import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";

/**
 * Search result from unified search API
 */
export interface SearchResult {
  entity_type: string;
  entity_id: string;
  name: string;
  subtitle: string;
  text_rank: number;
  metadata: Record<string, unknown>;
  updated_at: string;
}

interface UseGlobalSearchOptions {
  query: string;
  entityTypes?: string[];
  matchCountPerType?: number;
  enabled?: boolean;
}

/**
 * Global search hook using React Query
 *
 * Features:
 * - Automatic request deduplication (like SWR)
 * - 30-second cache for performance
 * - Only fetches when query >= 2 chars
 * - Primitive dependencies in query key (no object refs)
 * - Uses PostgreSQL full-text search for reliable results
 *
 * @example
 * const { data: results, isLoading } = useGlobalSearch({
 *   query: "Denver",
 *   entityTypes: ["contact", "property"],
 * });
 */
export function useGlobalSearch({
  query,
  entityTypes = ["document", "contact", "property", "deal"],
  matchCountPerType = 10,
  enabled = true,
}: UseGlobalSearchOptions) {
  const { session } = useAuth();

  // CRITICAL: Use primitive dependencies in query key (rerender-dependencies)
  // Avoid objects in deps → causes unnecessary refetches
  const entityTypesKey = useMemo(() => entityTypes.join(","), [entityTypes]);

  return useQuery({
    queryKey: [
      "global-search",
      query,
      entityTypesKey,
      matchCountPerType,
    ],
    queryFn: async () => {
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const requestBody = {
        query,
        entityTypes,
        matchCountPerType,
      };

      // async-parallel: Start fetch early, await late
      const responsePromise = fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/universal-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const response = await responsePromise;

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Search failed");
      }

      const data = await response.json();
      return data.results as SearchResult[];
    },
    // client-swr-dedup: React Query automatically deduplicates requests
    // Multiple components calling useGlobalSearch with same params = 1 network request
    enabled: enabled && !!query && query.length >= 2,
    staleTime: 30000, // 30 seconds cache
    refetchOnWindowFocus: false,
    // rerender-defer-reads: Don't subscribe to results if only using in callbacks
  });
}
