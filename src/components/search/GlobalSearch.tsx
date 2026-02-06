import { useState, useCallback, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { SearchResultsDropdown } from "./SearchResultsDropdown";
import { useSearchSuggestions, saveRecentSearch, type SearchSuggestion } from "@/hooks/useSearchSuggestions";
import { SearchSuggestionsDropdown } from "./SearchSuggestionsDropdown";

/**
 * Global Search Component
 *
 * Features:
 * - Live search with dropdown results
 * - Faceted filtering by entity type
 * - Keyboard navigation support
 * - Optimized with React best practices
 *
 * Performance optimizations:
 * - memo() to prevent unnecessary re-renders
 * - Functional setState for stable callbacks
 * - Event handlers instead of useEffect
 * - Primitive dependencies only
 */
export const GlobalSearch = memo(function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: results = [], isLoading: isSearching } = useGlobalSearch({
    query,
    entityTypes:
      selectedFilter === "all"
        ? ["document", "contact", "property", "deal"]
        : [selectedFilter],
    enabled: query.length >= 2,
  });

  // Get search suggestions for autocomplete
  // Show suggestions when:
  // - Query is empty (show recent searches)
  // - Query length is 1 (show entity suggestions)
  const { suggestions, isLoading: isLoadingSuggestions } = useSearchSuggestions(query);
  const showSuggestions = query.length < 2;
  const showResults = query.length >= 2;

  // rerender-functional-setstate: Use functional updates for stable callbacks
  const handleClear = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  }, []); // Empty deps → stable reference

  // rerender-move-effect-to-event: Interaction logic in event handlers, not effects
  const handleResultClick = useCallback(
    (entityType: string, entityId: string) => {
      setIsOpen(false);
      // Save the search query before navigating
      if (query.trim().length >= 2) {
        saveRecentSearch(query);
      }
      setQuery("");

      // Navigate to entity detail page
      switch (entityType) {
        case "document":
          navigate(`/documents/${entityId}`);
          break;
        case "contact":
          navigate(`/contacts/${entityId}`);
          break;
        case "property":
          navigate(`/properties/${entityId}`);
          break;
        case "deal":
          // Deals still use query param for now (modal behavior)
          navigate(`/pipeline/all?id=${entityId}`);
          break;
      }
    },
    [navigate, query]
  );

  // Navigate to full search results page
  const handleViewAllResults = useCallback(() => {
    console.log('🔍 handleViewAllResults clicked:', { query });
    setIsOpen(false);
    if (query.trim().length >= 2) {
      saveRecentSearch(query);
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }, [navigate, query]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      setIsOpen(false);
      
      if (suggestion.type === "recent") {
        // For recent searches, set the query and trigger search
        setQuery(suggestion.label);
        setIsOpen(true);
        return;
      }

      // For entity suggestions, navigate directly
      if (suggestion.id) {
        switch (suggestion.type) {
          case "document":
            navigate(`/documents/${suggestion.id}`);
            break;
          case "contact":
            navigate(`/contacts/${suggestion.id}`);
            break;
          case "property":
            navigate(`/properties/${suggestion.id}`);
            break;
        }
      }
    },
    [navigate]
  );

  // Handle selecting a recent search query
  const handleSelectQuery = useCallback((selectedQuery: string) => {
    setQuery(selectedQuery);
    setIsOpen(selectedQuery.length >= 1);
    inputRef.current?.focus();
  }, []);

  // client-passive-event-listeners: Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard shortcuts (Cmd+K or Ctrl+K to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Escape to close dropdown
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search documents, contacts, properties, deals... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length >= 1);
          }}
          onFocus={() => query.length >= 1 && setIsOpen(true)}
          className="w-full pl-10 pr-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="Global search"
          aria-expanded={isOpen}
          aria-controls="search-results-dropdown"
          aria-autocomplete="list"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && showSuggestions && (
        <SearchSuggestionsDropdown
          suggestions={suggestions}
          isLoading={isLoadingSuggestions}
          query={query}
          onSelect={handleSuggestionSelect}
          onSelectQuery={handleSelectQuery}
        />
      )}

      {isOpen && showResults && (
        <SearchResultsDropdown
          results={results}
          isSearching={isSearching}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          onResultClick={handleResultClick}
          onViewAllResults={handleViewAllResults}
          query={query}
        />
      )}
    </div>
  );
});
