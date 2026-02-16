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

  // #region agent log
  const _dbgEnabled = enabled && !!query && query.length >= 2;
  fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGlobalSearch.ts:hook-eval',message:'useGlobalSearch render',data:{query,entityTypesKey,enabled:_dbgEnabled,hasSession:!!session?.access_token},timestamp:Date.now(),hypothesisId:'H-C,H-E'})}).catch(()=>{});
  // #endregion

  const result = useQuery({
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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGlobalSearch.ts:fetch-start',message:'Calling universal-search API',data:{query,entityTypes,matchCountPerType},timestamp:Date.now(),hypothesisId:'H-A,H-B'})}).catch(()=>{});
      // #endregion

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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGlobalSearch.ts:fetch-response',message:'API response received',data:{query,status:response.status,ok:response.ok},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const error = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGlobalSearch.ts:fetch-error',message:'API returned error',data:{query,status:response.status,error},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
        // #endregion
        throw new Error(error.error || "Search failed");
      }

      const data = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGlobalSearch.ts:fetch-success',message:'API returned results',data:{query,resultCount:data.results?.length ?? 0,firstResult:data.results?.[0]?.name},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
      // #endregion
      return data.results as SearchResult[];
    },
    // client-swr-dedup: React Query automatically deduplicates requests
    // Multiple components calling useGlobalSearch with same params = 1 network request
    enabled: _dbgEnabled,
    staleTime: 30000, // 30 seconds cache
    refetchOnWindowFocus: false,
    retry: false, // Disable retries for debugging
    // rerender-defer-reads: Don't subscribe to results if only using in callbacks
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useGlobalSearch.ts:query-state',message:'React Query state',data:{query,isLoading:result.isLoading,isFetching:result.isFetching,isError:result.isError,errorMsg:result.error?.message,dataLength:result.data?.length ?? -1,status:result.status,fetchStatus:result.fetchStatus},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
  // #endregion

  return result;
}
