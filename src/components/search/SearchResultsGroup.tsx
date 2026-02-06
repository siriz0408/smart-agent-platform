import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SearchResult } from "@/hooks/useGlobalSearch";

interface SearchResultsGroupProps {
  title: string;
  icon: LucideIcon;
  count: number;
  results: SearchResult[];
  /** Render function receives the result and its 0-based index within this group */
  renderCard: (result: SearchResult, index: number) => React.ReactNode;
}

export function SearchResultsGroup({
  title,
  icon: Icon,
  count,
  results,
  renderCard,
}: SearchResultsGroupProps) {
  return (
    <div className="space-y-4">
      {/* Group Header */}
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">
          {title}{" "}
          <span className="text-muted-foreground font-normal">
            ({count} {count === 1 ? "result" : "results"})
          </span>
        </h2>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result, index) => renderCard(result, index))}
      </div>
    </div>
  );
}
