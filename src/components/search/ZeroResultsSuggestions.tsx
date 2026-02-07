import { useMemo } from "react";
import {
  Search,
  Lightbulb,
  ArrowRight,
  FileText,
  User,
  Home,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { expandQuery, type QuerySuggestion } from "@/lib/searchSuggestions";
import { cn } from "@/lib/utils";

interface ZeroResultsSuggestionsProps {
  /** The original query that returned zero results */
  query: string;
  /** Called when user clicks a suggested query */
  onSuggestionClick: (suggestedQuery: string) => void;
  /** Called when user wants to filter by entity type */
  onEntityTypeClick?: (entityType: string) => void;
  /** Compact mode for use inside dropdown (vs full page) */
  compact?: boolean;
}

const ENTITY_ICONS: Record<string, typeof Search> = {
  Contacts: User,
  Properties: Home,
  Documents: FileText,
  Deals: TrendingUp,
};

const ENTITY_COLORS: Record<string, string> = {
  Contacts: "text-green-500",
  Properties: "text-purple-500",
  Documents: "text-blue-500",
  Deals: "text-orange-500",
};

/**
 * Zero Results Suggestions Component
 *
 * Displayed when search returns no results. Provides:
 * - "Did you mean...?" typo corrections
 * - "Try searching for:" synonym alternatives
 * - Partial match suggestions for multi-word queries
 * - Recent related searches
 * - Entity type filter suggestions
 *
 * All suggestions are client-side computed (instant, no API calls).
 */
export function ZeroResultsSuggestions({
  query,
  onSuggestionClick,
  onEntityTypeClick,
  compact = false,
}: ZeroResultsSuggestionsProps) {
  const expansion = useMemo(() => expandQuery(query), [query]);

  const hasSuggestions =
    expansion.typoCorrections.length > 0 ||
    expansion.synonymSuggestions.length > 0 ||
    expansion.partialSuggestions.length > 0 ||
    expansion.recentSuggestions.length > 0;

  return (
    <div className={cn("space-y-4", compact ? "px-3 py-4" : "py-6")}>
      {/* Header */}
      <div className={cn("text-center", compact ? "space-y-1" : "space-y-2")}>
        {!compact && (
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-muted rounded-full">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        )}
        <p
          className={cn(
            "font-medium",
            compact ? "text-sm" : "text-base"
          )}
        >
          No results found for &ldquo;{query}&rdquo;
        </p>
        {!hasSuggestions && (
          <p className="text-sm text-muted-foreground">
            Try a different search term or check your spelling
          </p>
        )}
      </div>

      {/* Typo Corrections — "Did you mean...?" */}
      {expansion.typoCorrections.length > 0 && (
        <SuggestionSection
          icon={Lightbulb}
          title="Did you mean"
          compact={compact}
        >
          {expansion.typoCorrections.map((s) => (
            <SuggestionChip
              key={s.text}
              suggestion={s}
              onClick={onSuggestionClick}
              accent
            />
          ))}
        </SuggestionSection>
      )}

      {/* Synonym Alternatives — "Try searching for:" */}
      {expansion.synonymSuggestions.length > 0 && (
        <SuggestionSection
          icon={ArrowRight}
          title="Try searching for"
          compact={compact}
        >
          {expansion.synonymSuggestions.map((s) => (
            <SuggestionChip
              key={s.text}
              suggestion={s}
              onClick={onSuggestionClick}
            />
          ))}
        </SuggestionSection>
      )}

      {/* Partial Match Suggestions */}
      {expansion.partialSuggestions.length > 0 && (
        <SuggestionSection
          icon={Search}
          title="Try a simpler search"
          compact={compact}
        >
          {expansion.partialSuggestions.map((s) => (
            <SuggestionChip
              key={s.text}
              suggestion={s}
              onClick={onSuggestionClick}
            />
          ))}
        </SuggestionSection>
      )}

      {/* Recent Related Searches */}
      {expansion.recentSuggestions.length > 0 && (
        <SuggestionSection
          icon={RotateCcw}
          title="Related recent searches"
          compact={compact}
        >
          {expansion.recentSuggestions.map((s) => (
            <SuggestionChip
              key={s.text}
              suggestion={s}
              onClick={onSuggestionClick}
            />
          ))}
        </SuggestionSection>
      )}

      {/* Entity Type Suggestions */}
      {onEntityTypeClick && expansion.entityTypeSuggestions.length > 0 && (
        <div className={cn("space-y-2", compact ? "pt-2 border-t border-border" : "pt-3 border-t border-border")}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Browse by category
          </p>
          <div className="flex flex-wrap gap-2">
            {expansion.entityTypeSuggestions.map((entityType) => {
              const Icon = ENTITY_ICONS[entityType] || Search;
              const color = ENTITY_COLORS[entityType] || "text-muted-foreground";

              return (
                <button
                  key={entityType}
                  onClick={() => onEntityTypeClick(entityType)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className={cn("h-3.5 w-3.5", color)} />
                  {entityType}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Internal Sub-components ────────────────────────────────────────────────

function SuggestionSection({
  icon: Icon,
  title,
  compact,
  children,
}: {
  icon: typeof Search;
  title: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        <p className={cn("font-medium text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          {title}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function SuggestionChip({
  suggestion,
  onClick,
  accent = false,
}: {
  suggestion: QuerySuggestion;
  onClick: (query: string) => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={() => onClick(suggestion.text)}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-colors",
        accent
          ? "bg-primary/10 text-primary hover:bg-primary/20 font-medium"
          : "bg-muted hover:bg-muted/80 text-foreground"
      )}
    >
      <Search className="h-3 w-3 flex-shrink-0 opacity-60" />
      {suggestion.label}
    </button>
  );
}
