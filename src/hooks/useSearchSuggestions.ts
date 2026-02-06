import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SearchSuggestion {
  type: "recent" | "contact" | "property" | "document";
  label: string;
  id?: string;
}

const RECENT_SEARCHES_KEY = "smart-agent-recent-searches";
const MAX_RECENT_SEARCHES = 10;

/**
 * Get recent searches from localStorage
 */
function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("Failed to load recent searches:", error);
  }
  return [];
}

/**
 * Save a search query to recent searches
 */
export function saveRecentSearch(query: string): void {
  if (!query || query.trim().length < 2) return;

  try {
    const recent = getRecentSearches();
    const trimmedQuery = query.trim();
    
    // Remove if already exists (to move to top)
    const filtered = recent.filter((q) => q.toLowerCase() !== trimmedQuery.toLowerCase());
    
    // Add to beginning
    const updated = [trimmedQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent search:", error);
  }
}

/**
 * Hook for search suggestions/autocomplete
 * 
 * Features:
 * - Debounced input (300ms)
 * - Recent searches from localStorage
 * - Entity name matching (contacts, properties, documents - first 5 of each)
 * - Returns grouped suggestions by type
 * 
 * @example
 * const { suggestions, isLoading } = useSearchSuggestions("Denver");
 */
export function useSearchSuggestions(query: string) {
  const { profile } = useAuth();
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce user input (300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Get recent searches
  const recentSearches = useMemo(() => {
    if (!query || query.length < 1) {
      return getRecentSearches().slice(0, 5);
    }
    // Filter recent searches that match the query
    return getRecentSearches()
      .filter((q) => q.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [query]);

  // Query contacts matching the input
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["search-suggestions-contacts", debouncedQuery, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id || !debouncedQuery || debouncedQuery.length < 1) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company")
        .eq("tenant_id", profile.tenant_id)
        .or(`first_name.ilike.%${debouncedQuery}%,last_name.ilike.%${debouncedQuery}%,company.ilike.%${debouncedQuery}%`)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((c) => ({
        type: "contact" as const,
        label: `${c.first_name} ${c.last_name}`,
        id: c.id,
      }));
    },
    enabled: !!profile?.tenant_id && !!debouncedQuery && debouncedQuery.length >= 1,
  });

  // Query properties matching the input
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery({
    queryKey: ["search-suggestions-properties", debouncedQuery, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id || !debouncedQuery || debouncedQuery.length < 1) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, state")
        .eq("tenant_id", profile.tenant_id)
        .or(`address.ilike.%${debouncedQuery}%,city.ilike.%${debouncedQuery}%,state.ilike.%${debouncedQuery}%`)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((p) => ({
        type: "property" as const,
        label: p.address,
        id: p.id,
      }));
    },
    enabled: !!profile?.tenant_id && !!debouncedQuery && debouncedQuery.length >= 1,
  });

  // Query documents matching the input
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["search-suggestions-documents", debouncedQuery, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id || !debouncedQuery || debouncedQuery.length < 1) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, category")
        .eq("tenant_id", profile.tenant_id)
        .ilike("name", `%${debouncedQuery}%`)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((d) => ({
        type: "document" as const,
        label: d.name,
        id: d.id,
      }));
    },
    enabled: !!profile?.tenant_id && !!debouncedQuery && debouncedQuery.length >= 1,
  });

  // Combine all suggestions
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const result: SearchSuggestion[] = [];

    // Add recent searches (only if query is empty or very short)
    if (recentSearches.length > 0 && (!query || query.length < 2)) {
      recentSearches.forEach((q) => {
        result.push({
          type: "recent",
          label: q,
        });
      });
    }

    // Add entity suggestions
    result.push(...contacts, ...properties, ...documents);

    return result;
  }, [recentSearches, contacts, properties, documents, query]);

  const isLoading = isLoadingContacts || isLoadingProperties || isLoadingDocuments;

  return {
    suggestions,
    isLoading,
  };
}
