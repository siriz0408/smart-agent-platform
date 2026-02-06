import { useState, useEffect, useRef } from "react";
import { Clock, User, Home, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchSuggestion } from "@/hooks/useSearchSuggestions";
import { cn } from "@/lib/utils";

interface SearchSuggestionsDropdownProps {
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  query: string;
  onSelect: (suggestion: SearchSuggestion) => void;
  onSelectQuery?: (query: string) => void;
}

// Entity type configuration
const ENTITY_CONFIG = {
  recent: {
    label: "Recent Searches",
    icon: Clock,
    color: "text-muted-foreground",
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
  document: {
    label: "Documents",
    icon: FileText,
    color: "text-blue-500",
  },
};

/**
 * Search Suggestions Dropdown Component
 *
 * Features:
 * - Groups suggestions by type with section headers
 * - Keyboard navigation (up/down arrow, enter to select)
 * - Click to navigate to the entity or select query
 * - Follows existing SearchResultsDropdown patterns
 */
export function SearchSuggestionsDropdown({
  suggestions,
  isLoading,
  query,
  onSelect,
  onSelectQuery,
}: SearchSuggestionsDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Group suggestions by type
  const groupedSuggestions = suggestions.reduce(
    (acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = [];
      }
      acc[suggestion.type].push(suggestion);
      return acc;
    },
    {} as Record<string, SearchSuggestion[]>
  );

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        const suggestion = suggestions[selectedIndex];
        if (suggestion.type === "recent" && onSelectQuery) {
          onSelectQuery(suggestion.label);
        } else {
          onSelect(suggestion);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onSelectQuery]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedRef = itemRefs.current[selectedIndex];
    if (selectedRef && listRef.current) {
      selectedRef.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  // Flatten suggestions for indexing
  const flatSuggestions = suggestions;
  let currentIndex = 0;

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div
      id="search-suggestions-dropdown"
      className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50"
      role="listbox"
      aria-label="Search suggestions"
    >
      <ScrollArea className="max-h-[400px]">
        <div ref={listRef} className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-sm">Loading suggestions...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(groupedSuggestions).map(([type, typeSuggestions]) => {
                const config = ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG];
                if (!config || typeSuggestions.length === 0) return null;

                const Icon = config.icon;

                return (
                  <div key={type} className="space-y-1">
                    {/* Section Header */}
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      <span>{config.label}</span>
                    </div>

                    {/* Suggestions in this group */}
                    {typeSuggestions.map((suggestion) => {
                      const index = currentIndex++;
                      const isSelected = index === selectedIndex;

                      return (
                        <button
                          key={`${suggestion.type}-${suggestion.id || suggestion.label}-${index}`}
                          ref={(el) => {
                            itemRefs.current[index] = el;
                          }}
                          onClick={() => {
                            if (suggestion.type === "recent" && onSelectQuery) {
                              onSelectQuery(suggestion.label);
                            } else {
                              onSelect(suggestion);
                            }
                          }}
                          className={cn(
                            "w-full flex items-start gap-3 p-3 rounded-md transition-colors text-left group",
                            isSelected
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted"
                          )}
                          role="option"
                          aria-selected={isSelected}
                          data-entity-type={suggestion.type}
                        >
                          {/* Icon */}
                          <div className={cn("flex-shrink-0 mt-0.5", config.color)}>
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {suggestion.label}
                            </p>
                            {suggestion.type === "recent" && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Recent search
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
