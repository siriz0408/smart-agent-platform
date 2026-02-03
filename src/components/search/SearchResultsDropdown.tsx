import { FileText, User, Home, TrendingUp, Loader2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SearchResult } from "@/hooks/useGlobalSearch";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface SearchResultsDropdownProps {
  results: SearchResult[];
  isSearching: boolean;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  onResultClick: (entityType: string, entityId: string) => void;
  onViewAllResults?: () => void;
  query: string;
}

// Maximum results to show per entity type in dropdown
const MAX_RESULTS_PER_TYPE = 5;

// Entity type configuration
const ENTITY_CONFIG = {
  document: {
    label: "Documents",
    icon: FileText,
    color: "text-blue-500",
  },
  contact: {
    label: "Contacts",
    icon: User,
    color: "text-green-500",
  },
  property: {
    label: "Properties",
    icon: Home,
    color: "text-purple-500",
  },
  deal: {
    label: "Deals",
    icon: TrendingUp,
    color: "text-orange-500",
  },
};

/**
 * Search Results Dropdown Component
 *
 * Features:
 * - Faceted filters (All, Documents, Contacts, Properties, Deals)
 * - Result counts per filter
 * - Grouped results by entity type
 * - Loading and empty states
 * - Accessibility support
 */
export function SearchResultsDropdown({
  results,
  isSearching,
  selectedFilter,
  onFilterChange,
  onResultClick,
  onViewAllResults,
  query,
}: SearchResultsDropdownProps) {
  console.log('🔍 SearchResultsDropdown render:', {
    resultsCount: results.length,
    hasMoreResults: results.length > 5,
    onViewAllResults: typeof onViewAllResults,
    query
  });
  // Count results per entity type
  const resultCounts = results.reduce(
    (acc, result) => {
      acc[result.entity_type] = (acc[result.entity_type] || 0) + 1;
      acc.all += 1;
      return acc;
    },
    { all: 0, document: 0, contact: 0, property: 0, deal: 0 } as Record<
      string,
      number
    >
  );

  // Limit results shown in dropdown
  const limitedResults = useMemo(() => {
    if (selectedFilter === "all") {
      // For "all" filter, show limited results per entity type
      const grouped: Record<string, SearchResult[]> = {
        document: [],
        contact: [],
        property: [],
        deal: [],
      };

      results.forEach((result) => {
        if (grouped[result.entity_type]) {
          grouped[result.entity_type].push(result);
        }
      });

      // Limit each group and flatten
      return Object.values(grouped)
        .map((group) => group.slice(0, MAX_RESULTS_PER_TYPE))
        .flat();
    } else {
      // For specific filter, show limited results
      return results
        .filter((r) => r.entity_type === selectedFilter)
        .slice(0, MAX_RESULTS_PER_TYPE);
    }
  }, [results, selectedFilter]);

  const hasMoreResults = results.length > limitedResults.length;

  return (
    <div
      id="search-results-dropdown"
      data-search-dropdown
      className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50"
      role="listbox"
      aria-label="Search results"
    >
      {/* Faceted Filters */}
      <div className="flex items-center gap-2 p-3 border-b border-border overflow-x-auto">
        <button
          onClick={() => onFilterChange("all")}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors",
            selectedFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
          aria-pressed={selectedFilter === "all"}
        >
          All {resultCounts.all > 0 && `(${resultCounts.all})`}
        </button>

        {Object.entries(ENTITY_CONFIG).map(([type, config]) => (
          <button
            key={type}
            onClick={() => onFilterChange(type)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5",
              selectedFilter === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
            aria-pressed={selectedFilter === type}
          >
            <config.icon className="h-3.5 w-3.5" />
            {config.label}{" "}
            {resultCounts[type] > 0 && `(${resultCounts[type]})`}
          </button>
        ))}
      </div>

      {/* Results List */}
      <ScrollArea className="max-h-[400px]">
        <div className="p-2">
          {isSearching ? (
            // Loading state
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Searching...</span>
            </div>
          ) : results.length === 0 ? (
            // Empty state
            <div className="text-center py-8 text-muted-foreground">
              <p>No results found for &quot;{query}&quot;</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            // Results grouped by entity type (limited)
            <div className="space-y-1">
              {limitedResults.map((result) => {
                const config = ENTITY_CONFIG[result.entity_type as keyof typeof ENTITY_CONFIG];
                if (!config) return null;

                const Icon = config.icon;

                return (
                  <button
                    key={`${result.entity_type}-${result.entity_id}`}
                    onClick={() =>
                      onResultClick(result.entity_type, result.entity_id)
                    }
                    className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-muted transition-colors text-left group"
                    role="option"
                    aria-selected="false"
                    data-entity-type={result.entity_type}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 mt-0.5",
                        config.color
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {result.name}
                        </p>
                        {/* Relevance score badge */}
                        {result.text_rank > 0 && (
                          <span className="flex-shrink-0 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {Math.round(result.text_rank * 100)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {result.subtitle}
                      </p>

                      {/* Metadata preview */}
                      {result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          {result.entity_type === "contact" &&
                            result.metadata.email && (
                              <span className="truncate">
                                {result.metadata.email as string}
                              </span>
                            )}
                          {result.entity_type === "property" &&
                            result.metadata.price && (
                              <span>
                                ${Number(result.metadata.price).toLocaleString()}
                              </span>
                            )}
                          {result.entity_type === "deal" &&
                            result.metadata.value && (
                              <span>
                                ${Number(result.metadata.value).toLocaleString()}
                              </span>
                            )}
                          {result.entity_type === "document" &&
                            result.metadata.ai_summary && (
                              <span className="truncate">
                                {result.metadata.ai_summary as string}
                              </span>
                            )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with "See All Results" button - always show when there are results */}
      {results.length > 0 && onViewAllResults && (
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={onViewAllResults}
          >
            <span className="text-sm">
              {hasMoreResults 
                ? `See All Results (${resultCounts.all})`
                : `View Results Page (${resultCounts.all})`
              }
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
